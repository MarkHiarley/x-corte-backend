export interface Product {
    id?: string;
    name: string;
    price: number;
    duration: number;
    description?: string;
    category?: string;
    isActive: boolean;
    createdAt?: any;
    updatedAt?: any;
}

export interface Booking {
    id?: string;
    enterpriseEmail: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    productId: string;
    productName: string;
    productDuration: number;
    productPrice: number;
    employeeId?: string; // ID do funcionário escolhido
    employeeName?: string; // Nome do funcionário
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM (calculado automaticamente)
    actualDuration: number; // Duração real baseada no funcionário (ou duração padrão do produto)
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    notes?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface TimeSlot {
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    bookingId?: string;
}

export interface Schedule {
    id?: string;
    name: string;
    timeZone: string;
    availability: {
        days: string[];
        startTime: string;
        endTime: string;
    }[];
    isDefault: boolean;
    createdAt?: any;
    updatedAt?: any;
}

export interface Enterprise {
    email: string;
    name: string;
    phone?: string;
    address?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface AvailabilityCheck {
    date: string;
    enterpriseEmail: string;
    duration: number;
}

export interface AvailableSlot {
    startTime: string;
    endTime: string;
    duration: number;
}

export interface Employee {
    id?: string;
    enterpriseEmail: string;
    name: string;
    email: string;
    phone?: string;
    position: string; // Cargo: "Barbeiro", "Cabeleireira", "Manicure", etc
    hireDate?: string; // Data de contratação
    isActive: boolean;
    avatar?: string; // URL da foto
    
    // Especialidades/Habilidades do funcionário
    skills: EmployeeSkill[];
    
    // Horário de trabalho semanal
    workSchedule?: EmployeeWorkSchedule;
    
    createdAt?: any;
    updatedAt?: any;
}

export interface EmployeeSkill {
    productId: string;
    productName: string;
    experienceLevel: 'iniciante' | 'intermediario' | 'avancado' | 'especialista';
    estimatedDuration?: number; // Tempo que esse funcionário leva (em minutos) - opcional
    canPerform: boolean; // Se o funcionário pode realizar este serviço
}

export interface EmployeeWorkSchedule {
    monday?: DaySchedule;
    tuesday?: DaySchedule;
    wednesday?: DaySchedule;
    thursday?: DaySchedule;
    friday?: DaySchedule;
    saturday?: DaySchedule;
    sunday?: DaySchedule;
}

export interface DaySchedule {
    isWorking: boolean;
    startTime?: string; // HH:MM
    endTime?: string; // HH:MM
    breakStart?: string; // HH:MM - Início do intervalo
    breakEnd?: string; // HH:MM - Fim do intervalo
}
