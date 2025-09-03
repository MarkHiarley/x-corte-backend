// Schemas reutilizáveis para documentação Swagger

// Schema base para respostas da API
export const baseApiResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', description: 'Indica se a operação foi bem-sucedida' },
    message: { type: 'string', description: 'Mensagem descritiva sobre o resultado' },
    data: { type: 'object', description: 'Dados retornados (apenas em caso de sucesso)' },
    error: { type: 'string', description: 'Detalhes do erro (apenas em caso de falha)' }
  },
  required: ['success']
};

// Schema para respostas de sucesso
export const successResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', enum: [true] },
    message: { type: 'string', description: 'Mensagem de sucesso (opcional)' },
    data: { type: 'object', description: 'Dados retornados' }
  },
  required: ['success']
};

// Schema para respostas de erro
export const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', enum: [false] },
    message: { type: 'string', description: 'Mensagem de erro' },
    error: { type: 'string', description: 'Detalhes técnicos do erro' }
  },
  required: ['success', 'message', 'error']
};

// Schema para erros de validação
export const validationErrorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', enum: [false] },
    message: { type: 'string', description: 'Mensagem de erro de validação' },
    error: { type: 'string', description: 'Tipo de erro' },
    validationErrors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string', description: 'Campo com erro' },
          message: { type: 'string', description: 'Mensagem específica do erro' }
        }
      },
      description: 'Lista detalhada de erros de validação'
    }
  },
  required: ['success', 'message', 'error']
};

// Status Code Responses padronizados
export const responses = {
  // 2xx Success
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [true] },
      message: { type: 'string', description: 'Mensagem de sucesso (opcional)' },
      data: { type: 'object', description: 'Dados retornados' }
    },
    required: ['success'],
    description: 'Operação realizada com sucesso',
    example: {
      success: true,
      message: 'Operação concluída com sucesso',
      data: {}
    }
  },
  
  201: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [true] },
      message: { type: 'string', description: 'Mensagem de criação' },
      data: { type: 'object', description: 'Recurso criado' }
    },
    required: ['success', 'message'],
    description: 'Recurso criado com sucesso',
    example: {
      success: true,
      message: 'Recurso criado com sucesso',
      data: { id: 'novo_id' }
    }
  },
  
  // 4xx Client Errors
  400: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false] },
      message: { type: 'string', description: 'Mensagem de erro' },
      error: { type: 'string', description: 'Detalhes do erro' },
      validationErrors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            message: { type: 'string' }
          }
        },
        description: 'Erros de validação (quando aplicável)'
      }
    },
    required: ['success', 'message', 'error'],
    description: 'Requisição inválida - dados obrigatórios em falta ou formato incorreto',
    example: {
      success: false,
      message: 'Dados inválidos fornecidos',
      error: 'Erro de validação'
    }
  },
  
  401: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false] },
      message: { type: 'string', description: 'Mensagem de erro de autenticação' },
      error: { type: 'string', description: 'Tipo de erro de autenticação' }
    },
    required: ['success', 'message', 'error'],
    description: 'Não autorizado - token de autenticação inválido, expirado ou em falta',
    example: {
      success: false,
      message: 'Token inválido ou expirado',
      error: 'Erro de autenticação'
    }
  },
  
  403: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false] },
      message: { type: 'string', description: 'Mensagem de erro de autorização' },
      error: { type: 'string', description: 'Tipo de erro de autorização' }
    },
    required: ['success', 'message', 'error'],
    description: 'Acesso proibido - usuário não tem permissão para esta operação',
    example: {
      success: false,
      message: 'Acesso negado para esta operação',
      error: 'Erro de autorização'
    }
  },
  
  404: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false] },
      message: { type: 'string', description: 'Mensagem de recurso não encontrado' },
      error: { type: 'string', description: 'Tipo de erro' }
    },
    required: ['success', 'message', 'error'],
    description: 'Recurso não encontrado',
    example: {
      success: false,
      message: 'Funcionário não encontrado',
      error: 'Recurso não encontrado'
    }
  },
  
  409: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false] },
      message: { type: 'string', description: 'Mensagem de conflito' },
      error: { type: 'string', description: 'Tipo de conflito' }
    },
    required: ['success', 'message', 'error'],
    description: 'Conflito - recurso já existe ou violação de integridade',
    example: {
      success: false,
      message: 'Funcionário com este nome já existe na empresa',
      error: 'Conflito de dados'
    }
  },
  
  422: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false] },
      message: { type: 'string', description: 'Mensagem de erro de validação' },
      error: { type: 'string', description: 'Tipo de erro' },
      validationErrors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'Campo com erro' },
            message: { type: 'string', description: 'Mensagem de erro específica' }
          }
        },
        description: 'Lista detalhada de erros de validação'
      }
    },
    required: ['success', 'message', 'error'],
    description: 'Entidade não processável - erro de validação dos dados',
    example: {
      success: false,
      message: 'Erros de validação encontrados',
      error: 'Erro de validação',
      validationErrors: [
        { field: 'email', message: 'Email é obrigatório' },
        { field: 'name', message: 'Nome deve ter pelo menos 2 caracteres' }
      ]
    }
  },
  
  429: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false] },
      message: { type: 'string', description: 'Mensagem de rate limit' },
      error: { type: 'string', description: 'Tipo de erro' },
      retryAfter: { type: 'number', description: 'Tempo em segundos para tentar novamente' }
    },
    required: ['success', 'message', 'error'],
    description: 'Muitas requisições - limite de rate limit excedido',
    example: {
      success: false,
      message: 'Muitas requisições. Tente novamente em 60 segundos',
      error: 'Rate limit excedido',
      retryAfter: 60
    }
  },
  
  // 5xx Server Errors
  500: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false] },
      message: { type: 'string', description: 'Mensagem de erro interno' },
      error: { type: 'string', description: 'Tipo de erro interno' }
    },
    required: ['success', 'message', 'error'],
    description: 'Erro interno do servidor',
    example: {
      success: false,
      message: 'Erro interno do servidor',
      error: 'Erro interno'
    }
  },
  
  502: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false] },
      message: { type: 'string', description: 'Mensagem de erro de gateway' },
      error: { type: 'string', description: 'Tipo de erro de gateway' }
    },
    required: ['success', 'message', 'error'],
    description: 'Bad Gateway - erro de comunicação com serviços externos',
    example: {
      success: false,
      message: 'Erro de comunicação com o banco de dados',
      error: 'Bad Gateway'
    }
  },
  
  503: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false] },
      message: { type: 'string', description: 'Mensagem de serviço indisponível' },
      error: { type: 'string', description: 'Tipo de erro de disponibilidade' }
    },
    required: ['success', 'message', 'error'],
    description: 'Serviço temporariamente indisponível',
    example: {
      success: false,
      message: 'Serviço temporariamente indisponível',
      error: 'Service Unavailable'
    }
  }
};

export const userSchema = {
  type: 'object',
  properties: {
    uid: { type: 'string', description: 'ID único do usuário no Firebase' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    role: { 
      type: 'string', 
      enum: ['admin', 'client'],
      description: 'Role do usuário: admin (gerencia empresa) ou client (faz agendamentos)'
    },
    phone: { type: 'string' },
    enterpriseEmail: { 
      type: 'string', 
      format: 'email', 
      description: 'Email da empresa (obrigatório para admins)'
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

export const loginResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: 'Login realizado com sucesso' },
    data: {
      type: 'object',
      properties: {
        user: userSchema,
        token: { 
          type: 'string', 
          description: 'Token JWT para autenticação',
          example: 'eyJhbGciOiJSUzI1NiIs...'
        }
      }
    }
  }
};

export const productSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'prod123' },
    name: { type: 'string', example: 'Corte Masculino' },
    description: { type: 'string', example: 'Corte tradicional masculino com acabamento' },
    price: { type: 'number', minimum: 0, example: 25.50 },
    duration: { type: 'number', minimum: 1, description: 'Duração em minutos', example: 30 },
    category: { type: 'string', example: 'Corte' },
    active: { type: 'boolean', example: true },
    enterpriseId: { type: 'string', example: 'enterprise123' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

export const bookingSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    enterpriseEmail: { type: 'string', format: 'email' },
    clientName: { type: 'string' },
    clientPhone: { type: 'string' },
    clientEmail: { type: 'string', format: 'email' },
    productId: { type: 'string' },
    productName: { type: 'string' },
    productDuration: { type: 'number', minimum: 1 },
    productPrice: { type: 'number', minimum: 0 },
    employeeId: { type: 'string', description: 'ID do funcionário escolhido' },
    employeeName: { type: 'string', description: 'Nome do funcionário' },
    date: { type: 'string', format: 'date', description: 'Data do agendamento (YYYY-MM-DD)' },
    startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$', description: 'Horário de início (HH:MM)' },
    endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$', description: 'Horário de fim (HH:MM)' },
    finalPrice: { type: 'number', minimum: 0, description: 'Preço final com multiplicador do funcionário' },
    actualDuration: { type: 'number', minimum: 1, description: 'Duração real baseada no funcionário' },
    status: { 
      type: 'string', 
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      description: 'Status do agendamento: pending (aguardando), confirmed (confirmado), cancelled (cancelado - preserva histórico), completed (realizado)'
    },
    notes: { type: 'string', description: 'Observações do agendamento' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  },
  required: ['enterpriseEmail', 'clientName', 'clientPhone', 'productId', 'date', 'startTime']
};

export const enterpriseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'enterprise123' },
    name: { type: 'string', example: 'Barbearia do João' },
    email: { type: 'string', format: 'email', example: 'contato@barbearia.com' },
    phone: { type: 'string', example: '(11) 3333-3333' },
    address: { type: 'string', example: 'Rua das Flores, 123 - Centro' },
    description: { type: 'string', example: 'A melhor barbearia da região' },
    active: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

export const scheduleSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'schedule123' },
    name: { type: 'string', example: 'Horário Semana Completa' },
    timeZone: { type: 'string', example: 'America/Sao_Paulo' },
    enterpriseId: { type: 'string', example: 'enterprise123' },
    availability: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          days: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            },
            example: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          },
          startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '08:00' },
          endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '18:00' }
        }
      }
    },
    isDefault: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

export const availabilitySchema = {
  type: 'object',
  properties: {
    date: { type: 'string', format: 'date', example: '2025-08-28' },
    times: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          time: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '14:30' },
          available: { type: 'boolean', example: true }
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
    page: { type: 'integer', minimum: 1, default: 1, example: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10, example: 10 }
  }
};

export const enterpriseEmailQuery = {
  type: 'object',
  properties: {
    enterpriseEmail: {
      type: 'string',
      format: 'email',
      description: 'Email da empresa',
      example: 'contato@barbearia.com'
    }
  },
  required: ['enterpriseEmail']
};

export const employeeSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    enterpriseEmail: { 
      type: 'string', 
      format: 'email',
      description: 'Email da empresa à qual o funcionário pertence'
    },
    name: { 
      type: 'string', 
      minLength: 2, 
      maxLength: 100,
      description: 'Nome completo do funcionário'
    },
    phone: { 
      type: 'string',
      description: 'Telefone de contato (opcional)'
    },
    position: { 
      type: 'string',
      description: 'Cargo: Barbeiro, Cabeleireira, Manicure, etc'
    },
    isActive: { 
      type: 'boolean',
      description: 'Se o funcionário está ativo (funcionários não fazem login próprio)'
    },
    avatar: { 
      type: 'string',
      description: 'URL da foto do funcionário (opcional)'
    },
    skills: {
      type: 'array',
      description: 'Serviços/produtos que o funcionário sabe realizar',
      items: {
        type: 'object',
        properties: {
          productId: { 
            type: 'string',
            description: 'ID do serviço/produto'
          },
          productName: { 
            type: 'string',
            description: 'Nome do serviço'
          },
          experienceLevel: { 
            type: 'string', 
            enum: ['iniciante', 'intermediario', 'avancado', 'especialista'],
            description: 'Nível de experiência no serviço'
          },
          canPerform: { 
            type: 'boolean',
            description: 'Se o funcionário pode realizar este serviço'
          }
        },
        required: ['productId', 'productName', 'experienceLevel', 'canPerform']
      }
    },
    workSchedule: {
      type: 'object',
      description: 'Horário de trabalho semanal do funcionário',
      properties: {
        monday: {
          type: 'object',
          properties: {
            isWorking: { type: 'boolean' },
            startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakStart: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakEnd: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }
          }
        },
        tuesday: {
          type: 'object',
          properties: {
            isWorking: { type: 'boolean' },
            startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakStart: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakEnd: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }
          }
        },
        wednesday: {
          type: 'object',
          properties: {
            isWorking: { type: 'boolean' },
            startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakStart: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakEnd: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }
          }
        },
        thursday: {
          type: 'object',
          properties: {
            isWorking: { type: 'boolean' },
            startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakStart: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakEnd: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }
          }
        },
        friday: {
          type: 'object',
          properties: {
            isWorking: { type: 'boolean' },
            startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakStart: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakEnd: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }
          }
        },
        saturday: {
          type: 'object',
          properties: {
            isWorking: { type: 'boolean' },
            startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakStart: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakEnd: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }
          }
        },
        sunday: {
          type: 'object',
          properties: {
            isWorking: { type: 'boolean' },
            startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakStart: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            breakEnd: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }
          }
        }
      }
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  },
  required: ['enterpriseEmail', 'name', 'position', 'isActive']
};

// Schemas específicos para endpoints atualizados

// Schema para registro de empresa (unificado)
export const enterpriseRegistrationSchema = {
  type: 'object',
  properties: {
    email: { 
      type: 'string', 
      format: 'email',
      description: 'Email da empresa (será usado para login do admin)'
    },
    password: { 
      type: 'string', 
      minLength: 6,
      description: 'Senha do administrador'
    },
    name: { 
      type: 'string',
      minLength: 2,
      description: 'Nome do administrador'
    },
    enterpriseName: { 
      type: 'string',
      minLength: 2,
      description: 'Nome da empresa'
    },
    phone: { 
      type: 'string',
      description: 'Telefone da empresa (opcional)'
    },
    address: { 
      type: 'string',
      description: 'Endereço da empresa (opcional)'
    }
  },
  required: ['email', 'password', 'name', 'enterpriseName']
};

// Schema para funcionário disponível (resposta da API)
export const availableEmployeeSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'ID do funcionário' },
    name: { type: 'string', description: 'Nome do funcionário' },
    position: { type: 'string', description: 'Cargo do funcionário' },
    available: { type: 'boolean', enum: [true], description: 'Sempre true (já filtrado)' },
    experienceLevel: { 
      type: 'string',
      enum: ['iniciante', 'intermediario', 'avancado', 'especialista'],
      description: 'Nível de experiência para o serviço específico'
    },
    estimatedDuration: { type: 'number', description: 'Duração estimada baseada no produto' },
    customDuration: { type: 'number', description: 'Duração personalizada do funcionário' },
    price: { type: 'number', description: 'Preço do serviço (sempre igual ao produto)' },
    duration: { type: 'number', description: 'Duração padrão do produto' }
  }
};

// Schema para criação de agendamento (atualizado)
export const createBookingSchema = {
  type: 'object',
  properties: {
    enterpriseEmail: {
      type: 'string',
      format: 'email',
      description: 'Email da empresa'
    },
    clientName: {
      type: 'string',
      minLength: 2,
      description: 'Nome do cliente'
    },
    clientPhone: {
      type: 'string',
      description: 'Telefone do cliente'
    },
    clientEmail: {
      type: 'string',
      format: 'email',
      description: 'Email do cliente (opcional)'
    },
    productId: {
      type: 'string',
      description: 'ID do produto/serviço'
    },
    employeeId: {
      type: 'string',
      description: 'ID do funcionário específico (opcional). Se não informado, agenda sem funcionário específico'
    },
    date: {
      type: 'string',
      format: 'date',
      description: 'Data do agendamento (YYYY-MM-DD)'
    },
    startTime: {
      type: 'string',
      pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
      description: 'Horário de início (HH:MM)'
    },
    notes: {
      type: 'string',
      description: 'Observações do agendamento (opcional)'
    }
  },
  required: ['enterpriseEmail', 'clientName', 'clientPhone', 'productId', 'date', 'startTime']
};

// Schema para funcionário simplificado (sem email)
export const createEmployeeSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 2,
      maxLength: 100,
      description: 'Nome completo do funcionário'
    },
    phone: {
      type: 'string',
      description: 'Telefone de contato (opcional)'
    },
    position: {
      type: 'string',
      description: 'Cargo: Barbeiro, Cabeleireira, Manicure, etc'
    },
    isActive: {
      type: 'boolean',
      default: true,
      description: 'Se o funcionário está ativo'
    },
    avatar: {
      type: 'string',
      description: 'URL da foto do funcionário (opcional)'
    }
  },
  required: ['name', 'position']
};
