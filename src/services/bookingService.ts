import { 
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    query,
    where,
    Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { Booking, AvailableSlot } from '../types/index.js';
import { scheduleService } from './scheduleService.js';
import { productService } from './productService.js';

export const bookingService = {
    timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    },

    minutesToTime(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    },

    addMinutesToTime(time: string, minutesToAdd: number): string {
        const totalMinutes = this.timeToMinutes(time) + minutesToAdd;
        return this.minutesToTime(totalMinutes);
    },

    async checkEnterpriseExists(email: string) {
        try {
            const enterpriseRef = doc(db, 'enterprises', email);
            const enterpriseSnap = await getDoc(enterpriseRef);
            
            if (enterpriseSnap.exists()) {
                return { success: true };
            } else {
                return {
                    success: false,
                    error: `Empresa com email '${email}' não encontrada`
                };
            }
        } catch (error) {
            console.error('Erro ao verificar empresa:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    },

    async getBookingsByDate(enterpriseEmail: string, date: string) {
        try {
            const bookingsCollectionPath = `enterprises/${enterpriseEmail}/bookings`;
            const bookingsQuery = query(
                collection(db, bookingsCollectionPath),
                where('date', '==', date)
            );

            const snapshot = await getDocs(bookingsQuery);
            const bookings = snapshot.docs
                .map(d => ({ id: d.id, ...(d.data() as any) }))
                .filter((b: any) => ['confirmed', 'pending'].includes(b.status))
                .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

            return {
                success: true,
                data: bookings as Booking[]
            };

        } catch (error) {
            console.error('Erro ao buscar agendamentos:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    },

    async isTimeSlotAvailable(
        enterpriseEmail: string,
        date: string,
        startTime: string,
        duration: number
    ): Promise<{ available: boolean; conflictingBooking?: Booking }> {
        try {
            const endTime = this.addMinutesToTime(startTime, duration);
            const bookingsResult = await this.getBookingsByDate(enterpriseEmail, date);
            
            if (!bookingsResult.success) {
                return { available: false };
            }

            const bookings = bookingsResult.data || [];
            const newStartMinutes = this.timeToMinutes(startTime);
            const newEndMinutes = this.timeToMinutes(endTime);

            for (const booking of bookings) {
                const bookingStartMinutes = this.timeToMinutes(booking.startTime);
                const bookingEndMinutes = this.timeToMinutes(booking.endTime);

                if (
                    (newStartMinutes >= bookingStartMinutes && newStartMinutes < bookingEndMinutes) ||
                    (newEndMinutes > bookingStartMinutes && newEndMinutes <= bookingEndMinutes) ||
                    (newStartMinutes <= bookingStartMinutes && newEndMinutes >= bookingEndMinutes)
                ) {
                    return { 
                        available: false, 
                        conflictingBooking: booking 
                    };
                }
            }

            return { available: true };

        } catch (error) {
            console.error('Erro ao verificar disponibilidade:', error);
            return { available: false };
        }
    },

    async getAvailableSlots(
        enterpriseEmail: string,
        date: string,
        duration: number
    ): Promise<{ success: boolean; data?: AvailableSlot[]; error?: string }> {
        try {
            const defaultScheduleResult = await scheduleService.getDefaultSchedule(enterpriseEmail);
            
            if (!defaultScheduleResult.success || !('data' in defaultScheduleResult)) {
                return {
                    success: false,
                    error: 'Nenhum horário padrão configurado para esta empresa'
                };
            }

            const defaultSchedule = defaultScheduleResult.data;
            const dayIndex = new Date(date + 'T00:00:00').getDay();
            const dayNameEN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex];

            const dayAvailability = defaultSchedule?.availability?.find((avail: any) => 
                avail?.days?.some((d: any) => 
                    String(d).toLowerCase() === dayNameEN.toLowerCase() ||
                    String(d) === String(dayIndex)
                )
            );

            if (!dayAvailability?.startTime || !dayAvailability?.endTime) {
                return { success: true, data: [] };
            }

            const bookingsResult = await this.getBookingsByDate(enterpriseEmail, date);
            const bookings = bookingsResult.success ? (bookingsResult.data || []) : [];

            const busySlots = bookings.map(booking => ({
                start: this.timeToMinutes(booking.startTime),
                end: this.timeToMinutes(booking.endTime)
            }));

            const startMinutes = this.timeToMinutes(dayAvailability.startTime);
            const endMinutes = this.timeToMinutes(dayAvailability.endTime);
            const slotInterval = 15;
            const slots: AvailableSlot[] = [];

            for (let minutes = startMinutes; minutes <= endMinutes - duration; minutes += slotInterval) {
                const slotStart = minutes;
                const slotEnd = minutes + duration;

                const hasConflict = busySlots.some(busy => 
                    (slotStart >= busy.start && slotStart < busy.end) ||
                    (slotEnd > busy.start && slotEnd <= busy.end) ||
                    (slotStart <= busy.start && slotEnd >= busy.end)
                );

                if (!hasConflict) {
                    slots.push({
                        startTime: this.minutesToTime(slotStart),
                        endTime: this.minutesToTime(slotEnd),
                        duration
                    });
                }
            }

            return {
                success: true,
                data: slots
            };

        } catch (error) {
            console.error('Erro ao gerar slots disponíveis:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    },

    async createBooking(
        enterpriseEmail: string,
        bookingData: Omit<Booking, 'id' | 'enterpriseEmail' | 'endTime' | 'createdAt' | 'updatedAt'>
    ) {
        try {
            const enterpriseCheck = await this.checkEnterpriseExists(enterpriseEmail);
            if (!enterpriseCheck.success) {
                return enterpriseCheck;
            }

            const productResult = await productService.getProductById(enterpriseEmail, bookingData.productId);
            if (!productResult.success) {
                return {
                    success: false,
                    error: 'Produto não encontrado'
                };
            }

            if (!('data' in productResult)) {
                return {
                    success: false,
                    error: 'Dados do produto não encontrados'
                };
            }

            const product = productResult.data as any;
            const endTime = this.addMinutesToTime(bookingData.startTime, product.duration);

            const availability = await this.isTimeSlotAvailable(
                enterpriseEmail,
                bookingData.date,
                bookingData.startTime,
                product.duration
            );

            if (!availability.available) {
                return {
                    success: false,
                    error: `Horário não disponível. ${availability.conflictingBooking ? 
                        `Conflito com agendamento às ${availability.conflictingBooking.startTime}` : ''}`
                };
            }

            const bookingsCollectionPath = `enterprises/${enterpriseEmail}/bookings`;
            const docRef = await addDoc(collection(db, bookingsCollectionPath), {
                ...bookingData,
                enterpriseEmail,
                productName: product.name,
                productDuration: product.duration,
                productPrice: product.price,
                endTime,
                status: 'pending',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            return {
                success: true,
                id: docRef.id,
                data: {
                    id: docRef.id,
                    ...bookingData,
                    enterpriseEmail,
                    productName: product.name,
                    productDuration: product.duration,
                    productPrice: product.price,
                    endTime,
                    status: 'pending'
                }
            };

        } catch (error) {
            console.error('Erro ao criar agendamento:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    },

    async confirmBooking(enterpriseEmail: string, bookingId: string) {
        try {
            const bookingRef = doc(db, `enterprises/${enterpriseEmail}/bookings`, bookingId);
            
            await updateDoc(bookingRef, {
                status: 'confirmed',
                updatedAt: Timestamp.now()
            });

            return {
                success: true,
                message: 'Agendamento confirmado com sucesso'
            };

        } catch (error) {
            console.error('Erro ao confirmar agendamento:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    },

    async getBookings(
        enterpriseEmail: string,
        date?: string,
        status?: string
    ) {
        try {
            const enterpriseCheck = await this.checkEnterpriseExists(enterpriseEmail);
            if (!enterpriseCheck.success) {
                return enterpriseCheck;
            }

            const bookingsCollectionPath = `enterprises/${enterpriseEmail}/bookings`;
            let bookingsQuery = query(collection(db, bookingsCollectionPath));

            if (date) {
                bookingsQuery = query(bookingsQuery, where('date', '==', date));
            } else if (status) {
                bookingsQuery = query(bookingsQuery, where('status', '==', status));
            }

            const snapshot = await getDocs(bookingsQuery);
            let bookings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (date && status) {
                bookings = bookings.filter((booking: any) => booking.status === status);
            }

            bookings.sort((a: any, b: any) => {
                const dateCompare = a.date.localeCompare(b.date);
                if (dateCompare !== 0) return dateCompare;
                return a.startTime.localeCompare(b.startTime);
            });

            return {
                success: true,
                data: bookings
            };

        } catch (error) {
            console.error('Erro ao buscar agendamentos:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    },

    async getBookingsByEmployeeAndDate(employeeId: string, date: string): Promise<{ success: boolean; data?: Booking[]; error?: string }> {
        try {
            const bookingsRef = collection(db, 'bookings');
            let bookingsQuery = query(
                bookingsRef,
                where('employeeId', '==', employeeId),
                where('date', '==', date)
            );

            const snapshot = await getDocs(bookingsQuery);
            const bookings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Booking[];

            // Filtrar apenas agendamentos não cancelados
            const activeBookings = bookings.filter(booking => 
                booking.status !== 'cancelled'
            );

            return {
                success: true,
                data: activeBookings
            };

        } catch (error) {
            console.error('Erro ao buscar agendamentos do funcionário:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    },

    async createBookingWithEmployee(
        enterpriseEmail: string,
        bookingData: {
            clientName: string;
            clientPhone: string;
            clientEmail?: string;
            productId: string;
            employeeId?: string; // Funcionário específico (opcional)
            date: string;
            startTime: string;
            notes?: string;
        }
    ): Promise<{ success: boolean; data?: Booking; error?: string }> {
        try {
            // Verificar se empresa existe
            const enterpriseCheck = await this.checkEnterpriseExists(enterpriseEmail);
            if (!enterpriseCheck.success) {
                return enterpriseCheck;
            }

            // Buscar dados do produto
            const productResult = await productService.getProductById(enterpriseEmail, bookingData.productId);
            if (!productResult.success || !productResult.data) {
                return {
                    success: false,
                    error: 'Produto não encontrado'
                };
            }

            const product = productResult.data;
            let actualDuration = product.duration;
            let employeeName = '';

            // Se funcionário específico foi escolhido
            if (bookingData.employeeId) {
                // Importar employeeService dinamicamente para evitar dependência circular
                const { employeeService } = await import('./employeeService.js');
                
                // Verificar se funcionário existe e está ativo
                const employeeResult = await employeeService.getEmployeeById(bookingData.employeeId);
                if (!employeeResult.success || !employeeResult.data) {
                    return {
                        success: false,
                        error: 'Funcionário não encontrado'
                    };
                }

                const employee = employeeResult.data;
                if (!employee.isActive) {
                    return {
                        success: false,
                        error: 'Funcionário não está ativo'
                    };
                }

                employeeName = employee.name;

                // Verificar se funcionário tem habilidade para este serviço
                const skill = employee.skills?.find(s => s.productId === bookingData.productId);
                if (!skill || !skill.canPerform) {
                    return {
                        success: false,
                        error: 'Funcionário não possui habilidade para este serviço'
                    };
                }

                // Usar preço do produto (sem multiplicador) e duração personalizada do funcionário
                actualDuration = skill.estimatedDuration || product.duration;

                // Verificar disponibilidade do funcionário
                const { employeeAvailabilityService } = await import('./employeeAvailabilityService.js');
                const availabilityCheck = await employeeAvailabilityService.isEmployeeAvailableAtTime(
                    bookingData.employeeId,
                    bookingData.date,
                    bookingData.startTime,
                    actualDuration
                );

                if (!availabilityCheck.success || !availabilityCheck.available) {
                    return {
                        success: false,
                        error: availabilityCheck.reason || 'Funcionário não disponível neste horário'
                    };
                }
            } else {
                // Se não especificou funcionário, verificar disponibilidade geral
                const availabilityCheck = await this.isTimeSlotAvailable(
                    enterpriseEmail,
                    bookingData.date,
                    bookingData.startTime,
                    actualDuration
                );

                if (!availabilityCheck.available) {
                    return {
                        success: false,
                        error: 'Horário não disponível'
                    };
                }
            }

            // Calcular horário de término
            const endTime = this.addMinutesToTime(bookingData.startTime, actualDuration);

            // Criar objeto de agendamento base
            const bookingBase = {
                enterpriseEmail,
                clientName: bookingData.clientName,
                clientPhone: bookingData.clientPhone,
                productId: bookingData.productId,
                productName: product.name,
                productDuration: product.duration,
                productPrice: product.price,
                date: bookingData.date,
                startTime: bookingData.startTime,
                endTime: endTime,
                actualDuration: actualDuration,
                status: 'pending' as const,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Adicionar campos opcionais apenas se existirem
            const booking: any = { ...bookingBase };
            
            if (bookingData.clientEmail) {
                booking.clientEmail = bookingData.clientEmail;
            }
            
            if (bookingData.employeeId) {
                booking.employeeId = bookingData.employeeId;
            }
            
            if (employeeName) {
                booking.employeeName = employeeName;
            }
            
            if (bookingData.notes) {
                booking.notes = bookingData.notes;
            }

            // Salvar no Firestore na subcoleção da empresa
            const bookingsCollectionPath = `enterprises/${enterpriseEmail}/bookings`;
            const bookingRef = await addDoc(collection(db, bookingsCollectionPath), booking);

            return {
                success: true,
                data: { id: bookingRef.id, ...booking } as Booking
            };

        } catch (error) {
            console.error('Erro ao criar agendamento:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro interno'
            };
        }
    }
};
