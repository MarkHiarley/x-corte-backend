import { employeeService } from './employeeService.js';
import { bookingService } from './bookingService.js';
import { Employee, DaySchedule } from '../types/index.js';

// Cache para otimizar consultas repetitivas
const availabilityCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos (menor que employee service)

class EmployeeAvailabilityService {
  
  // Método para verificar cache
  private getFromCache(key: string): any {
    const cached = availabilityCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
    availabilityCache.delete(key);
    return null;
  }

  // Método para salvar no cache
  private setCache(key: string, data: any): void {
    availabilityCache.set(key, { data, timestamp: Date.now() });
  }
  
  // Verificar se funcionário está trabalhando em um dia específico
  isEmployeeWorkingOnDay(employee: Employee, dayOfWeek: string): DaySchedule | null {
    const schedule = employee.workSchedule;
    if (!schedule) return null;

    const daySchedule = schedule[dayOfWeek as keyof typeof schedule];
    return daySchedule?.isWorking ? daySchedule : null;
  }

  // Gerar slots de tempo disponíveis para um funcionário em uma data específica
  async generateTimeSlots(
    employeeId: string, 
    date: string, // YYYY-MM-DD
    serviceDuration: number = 30 // em minutos
  ): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
      // Verificar cache primeiro
      const cacheKey = `slots:${employeeId}:${date}:${serviceDuration}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // Buscar dados do funcionário
      const employeeResult = await employeeService.getEmployeeById(employeeId);
      if (!employeeResult.success || !employeeResult.data) {
        return {
          success: false,
          error: 'Funcionário não encontrado'
        };
      }

      const employee = employeeResult.data;
      
      // Verificar se funcionário está ativo
      if (!employee.isActive) {
        return {
          success: false,
          error: 'Funcionário não está ativo'
        };
      }

      // Determinar dia da semana de forma otimizada
      const targetDate = new Date(date + 'T00:00:00'); // Evitar problemas de timezone
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[targetDate.getDay()];

      // Verificar se funcionário trabalha neste dia
      const daySchedule = this.isEmployeeWorkingOnDay(employee, dayOfWeek);
      if (!daySchedule || !daySchedule.startTime || !daySchedule.endTime) {
        const emptySlots: string[] = [];
        this.setCache(cacheKey, emptySlots);
        return {
          success: true,
          data: emptySlots // Funcionário não trabalha neste dia
        };
      }

      // Buscar agendamentos existentes do funcionário neste dia
      const bookingsResult = await bookingService.getBookingsByEmployeeAndDate(employeeId, date);
      const existingBookings = bookingsResult.success ? bookingsResult.data || [] : [];

      // Gerar slots de tempo
      const timeSlots = this.generateAvailableSlots(
        daySchedule,
        serviceDuration,
        existingBookings
      );

      // Salvar no cache
      this.setCache(cacheKey, timeSlots);

      return {
        success: true,
        data: timeSlots
      };

    } catch (error: any) {
      console.error('Erro ao gerar slots de tempo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Gerar slots disponíveis considerando horário de trabalho e agendamentos
  private generateAvailableSlots(
    daySchedule: DaySchedule,
    serviceDuration: number,
    existingBookings: any[]
  ): string[] {
    if (!daySchedule.startTime || !daySchedule.endTime) return [];

    const slots: string[] = [];
    const intervalMinutes = 15; // Intervalos de 15 em 15 minutos

    // Converter horários para minutos de forma otimizada
    const startMinutes = this.timeToMinutes(daySchedule.startTime);
    const endMinutes = this.timeToMinutes(daySchedule.endTime);
    
    // Horário de almoço (se existir)
    const breakStartMinutes = daySchedule.breakStart ? this.timeToMinutes(daySchedule.breakStart) : null;
    const breakEndMinutes = daySchedule.breakEnd ? this.timeToMinutes(daySchedule.breakEnd) : null;

    // Pré-processar agendamentos existentes para otimizar verificações
    const busyPeriods = this.getOccupiedTimeSlots(existingBookings);

    // Gerar slots de tempo de forma otimizada
    for (let currentMinutes = startMinutes; currentMinutes + serviceDuration <= endMinutes; currentMinutes += intervalMinutes) {
      const slotEndMinutes = currentMinutes + serviceDuration;

      // Verificar se slot não conflita com horário de almoço (otimizado)
      if (breakStartMinutes && breakEndMinutes && 
          !(slotEndMinutes <= breakStartMinutes || currentMinutes >= breakEndMinutes)) {
        continue; // Pula este slot (conflita com almoço)
      }

      // Verificar se slot não conflita com agendamentos existentes (otimizado)
      if (!this.isSlotOccupied(currentMinutes, slotEndMinutes, busyPeriods)) {
        slots.push(this.minutesToTime(currentMinutes));
      }
    }

    return slots;
  }

  // Verificar se um horário específico está disponível para o funcionário
  async isEmployeeAvailableAtTime(
    employeeId: string,
    date: string,
    startTime: string,
    duration: number
  ): Promise<{ success: boolean; available?: boolean; reason?: string; error?: string }> {
    try {
      const slotsResult = await this.generateTimeSlots(employeeId, date, duration);
      
      if (!slotsResult.success) {
        return {
          success: false,
          error: slotsResult.error || 'Erro ao verificar disponibilidade'
        };
      }

      const availableSlots = slotsResult.data || [];
      const isAvailable = availableSlots.includes(startTime);

      return {
        success: true,
        available: isAvailable,
        reason: isAvailable ? 'Horário disponível' : 'Horário ocupado ou fora do expediente'
      };

    } catch (error: any) {
      console.error('Erro ao verificar disponibilidade:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Buscar funcionários disponíveis para um serviço em data/hora específica
  async getAvailableEmployeesForService(
    enterpriseEmail: string,
    productId: string,
    date: string,
    startTime: string,
    duration?: number
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      // Buscar funcionários que sabem fazer o serviço
      const employeesResult = await employeeService.getEmployeesBySkill(enterpriseEmail, productId);
      
      if (!employeesResult.success) {
        return employeesResult;
      }

      const skillfulEmployees = employeesResult.data || [];
      const availableEmployees: any[] = [];

      // Buscar dados do produto para calcular preços personalizados
      const { productService } = await import('./productService.js');
      const productResult = await productService.getProductById(enterpriseEmail, productId);
      const basePrice = productResult.success && productResult.data ? productResult.data.price : 0;
      const baseDuration = productResult.success && productResult.data ? productResult.data.duration : 30;

      // Verificar disponibilidade de cada funcionário
      for (const employee of skillfulEmployees) {
        if (!employee.id) continue;

        // Buscar skill específica do funcionário para este serviço
        const skill = employee.skills?.find(s => s.productId === productId);
        if (!skill || !skill.canPerform) continue;

        // Usar duração personalizada do funcionário ou padrão
        const serviceDuration = duration || baseDuration;

        const availabilityResult = await this.isEmployeeAvailableAtTime(
          employee.id,
          date,
          startTime,
          serviceDuration
        );

        if (availabilityResult.success && availabilityResult.available) {
          availableEmployees.push({
            id: employee.id,
            name: employee.name,
            email: employee.email,
            available: true,
            experienceLevel: skill.experienceLevel,
            estimatedDuration: baseDuration,
            customDuration: serviceDuration,
            price: basePrice, // Preço sempre o mesmo do produto
            duration: baseDuration
          });
        }
      }

      return {
        success: true,
        data: availableEmployees
      };

    } catch (error: any) {
      console.error('Erro ao buscar funcionários disponíveis:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Funções utilitárias
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private getOccupiedTimeSlots(bookings: any[]): Array<{start: number, end: number}> {
    return bookings.map(booking => ({
      start: this.timeToMinutes(booking.startTime),
      end: this.timeToMinutes(booking.endTime || booking.startTime) + (booking.actualDuration || booking.productDuration || 30)
    }));
  }

  private isSlotOccupied(
    slotStart: number, 
    slotEnd: number, 
    busySlots: Array<{start: number, end: number}>
  ): boolean {
    return busySlots.some(busy => 
      !(slotEnd <= busy.start || slotStart >= busy.end)
    );
  }
}

export const employeeAvailabilityService = new EmployeeAvailabilityService();
