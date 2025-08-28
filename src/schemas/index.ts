// Schemas reutilizáveis para documentação Swagger

export const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string' },
    error: { type: 'string' }
  }
};

export const successResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    data: { type: 'object' }
  }
};

export const userSchema = {
  type: 'object',
  properties: {
    uid: { type: 'string', description: 'ID único do usuário' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    role: { type: 'string', enum: ['admin', 'client'] },
    phone: { type: 'string' },
    enterpriseId: { type: 'string', description: 'ID da empresa (para admins)' },
    createdAt: { type: 'string', format: 'date-time' }
  }
};

export const productSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    price: { type: 'number', minimum: 0 },
    duration: { type: 'number', minimum: 1, description: 'Duração em minutos' },
    category: { type: 'string' },
    active: { type: 'boolean' },
    enterpriseId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

export const bookingSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    clientId: { type: 'string' },
    productId: { type: 'string' },
    enterpriseId: { type: 'string' },
    dateTime: { type: 'string', format: 'date-time' },
    status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
    notes: { type: 'string' },
    totalPrice: { type: 'number', minimum: 0 },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

export const enterpriseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    phone: { type: 'string' },
    address: { type: 'string' },
    description: { type: 'string' },
    active: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

export const scheduleSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    enterpriseId: { type: 'string' },
    dayOfWeek: { type: 'number', minimum: 0, maximum: 6 },
    openTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
    closeTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
    isOpen: { type: 'boolean' }
  }
};

export const availabilitySchema = {
  type: 'object',
  properties: {
    date: { type: 'string', format: 'date' },
    times: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          available: { type: 'boolean' }
        }
      }
    }
  }
};

// Security schemas
export const bearerAuth = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT'
};

// Common query parameters
export const paginationQuery = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
  }
};
