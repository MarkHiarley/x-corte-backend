import { FastifyInstance } from 'fastify';
import { bookingService } from '../services/bookingService.js';
import { bookingSchema, responses } from '../schemas/index.js';

export async function bookingRoutes(fastify: FastifyInstance) {
  fastify.get('/bookings', {
    schema: {
      tags: ['Bookings'],
      summary: 'Listar agendamentos',
      description: 'Retorna todos os agendamentos de uma empresa, com filtros opcionais por data e status.',
      querystring: {
          type: 'object',
          properties: {
            enterpriseEmail: { 
              type: 'string',
              format: 'email',
              description: 'Email da empresa'
            },
            date: { 
              type: 'string',
              format: 'date',
              description: 'Filtrar por data específica (YYYY-MM-DD)'
            },
            status: { 
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled', 'completed'],
              description: 'Filtrar por status do agendamento'
            }
          },
          required: ['enterpriseEmail']
        },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: {
              type: 'array',
              items: bookingSchema
            }
          }
        },
        400: responses[400],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request, reply) => {
    try {
      const { enterpriseEmail, date, status } = request.query as any;
      
      if (!enterpriseEmail) {
        return reply.status(400).send({
          success: false,
          message: 'enterpriseEmail é obrigatório'
        });
      }
      
      const result = await bookingService.getBookings(enterpriseEmail, date, status);
      
      if (result.success && 'data' in result) {
        return {
          success: true,
          data: result.data || []
        };
      } else {
        return reply.status(500).send({
          success: false,
          message: ('error' in result ? result.error : undefined) || 'Erro desconhecido'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro na API de agendamentos:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  fastify.post('/bookings', {
    schema: {
      tags: ['Bookings'],
      description: 'Criar um novo agendamento com opção de escolher funcionário específico',
      body: {
        type: 'object',
        properties: {
          enterpriseEmail: { 
            type: 'string',
            format: 'email',
            description: 'Email da empresa'
          },
          clientName: { 
            type: 'string',
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
            description: 'ID do funcionário específico (opcional). Se não informado, será agendado sem funcionário específico.'
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
      },
      response: {
        201: {
          ...responses[201],
          properties: {
            ...responses[201].properties,
            data: bookingSchema
          }
        },
        400: responses[400],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      // Usar o método específico para agendamento com funcionário
      const result = await bookingService.createBookingWithEmployee(body.enterpriseEmail, {
        clientName: body.clientName,
        clientPhone: body.clientPhone,
        clientEmail: body.clientEmail,
        productId: body.productId,
        employeeId: body.employeeId, // Pode ser undefined se não especificado
        date: body.date,
        startTime: body.startTime,
        notes: body.notes
      });

      if (result.success && result.data) {
        return reply.status(201).send({
          success: true,
          data: result.data,
          message: 'Agendamento criado com sucesso!'
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: result.error || 'Erro ao criar agendamento'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao criar agendamento:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  fastify.put('/bookings/:id/confirm', {
    schema: {
      tags: ['Bookings'],
      description: 'Confirmar um agendamento',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          enterpriseEmail: { type: 'string' }
        },
        required: ['enterpriseEmail']
      },
      response: {
        200: responses[200],
        400: responses[400],
        404: responses[404],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { enterpriseEmail } = request.query as { enterpriseEmail: string };

      if (!enterpriseEmail) {
        return reply.status(400).send({
          success: false,
          message: 'enterpriseEmail é obrigatório'
        });
      }

      const result = await bookingService.confirmBooking(enterpriseEmail, id);

      if (result.success) {
        return {
          success: true,
          message: result.message
        };
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro ao confirmar agendamento'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao confirmar agendamento:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  // Novo endpoint para buscar funcionários disponíveis para um serviço
  fastify.get('/bookings/available-employees', {
    schema: {
      tags: ['Bookings'],
      summary: 'Listar funcionários disponíveis para um serviço',
      description: 'Retorna funcionários que podem realizar o serviço solicitado e estão disponíveis na data/hora especificada.',
      querystring: {
        type: 'object',
        properties: {
          enterpriseEmail: { 
            type: 'string',
            format: 'email',
            description: 'Email da empresa'
          },
          productId: { 
            type: 'string',
            description: 'ID do produto/serviço'
          },
          date: { 
            type: 'string',
            format: 'date',
            description: 'Data desejada (YYYY-MM-DD)'
          },
          startTime: { 
            type: 'string',
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
            description: 'Horário de início desejado (HH:MM)'
          }
        },
        required: ['enterpriseEmail', 'productId', 'date', 'startTime']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  available: { type: 'boolean' },
                  experienceLevel: { type: 'string' },
                  estimatedDuration: { type: 'number' },
                  customDuration: { type: 'number' },
                  price: { type: 'number' },
                  duration: { type: 'number' }
                }
              }
            }
          }
        },
        400: responses[400],
        422: responses[422],
        500: responses[500]
      }
    }
  }, async (request, reply) => {
    try {
      const { enterpriseEmail, productId, date, startTime } = request.query as any;
      
      // Importar o serviço de disponibilidade de funcionários
      const { employeeAvailabilityService } = await import('../services/employeeAvailabilityService.js');
      
      const result = await employeeAvailabilityService.getAvailableEmployeesForService(
        enterpriseEmail,
        productId,
        date,
        startTime
      );
      
      if (result.success) {
        return {
          success: true,
          data: result.data || []
        };
      } else {
        return reply.status(400).send({
          success: false,
          message: result.error || 'Erro ao buscar funcionários disponíveis'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao buscar funcionários disponíveis:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });
}
