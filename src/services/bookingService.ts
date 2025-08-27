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
    }
};
