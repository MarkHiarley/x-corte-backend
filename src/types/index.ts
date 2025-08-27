// Tipos para o sistema de agendamento

export interface Product {
    id?: string;
    name: string;
    price: number; // em centavos (ex: 3000 = R$ 30,00)
    duration: number; // em minutos
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
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM (calculado automaticamente)
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

// Utilitários para horários
export interface AvailabilityCheck {
    date: string;
    enterpriseEmail: string;
    duration: number; // em minutos
}

export interface AvailableSlot {
    startTime: string;
    endTime: string;
    duration: number;
}
