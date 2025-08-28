import { FastifyInstance } from 'fastify';
import { bookingService } from '../services/bookingService.js';
import { responses } from '../schemas/index.js';

export async function availabilityRoutes(fastify: FastifyInstance) {
  fastify.get('/availability/slots', {
    schema: {
      tags: ['Availability'],
      summary: 'Consultar horários disponíveis',
      description: 'Retorna os horários disponíveis para agendamento em uma data específica, considerando a duração do serviço e agendamentos existentes.',
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
              description: 'Data para consulta (YYYY-MM-DD)'
            },
            duration: { 
              type: 'number',
              minimum: 1,
              description: 'Duração do serviço em minutos'
            }
          },
          required: ['enterpriseEmail', 'date', 'duration']
        },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  time: { type: 'string' },
                  available: { type: 'boolean' }
                }
              }
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
      const { enterpriseEmail, date, duration } = request.query as any;
      
      if (!enterpriseEmail || !date || !duration) {
        return reply.status(400).send({
          success: false,
          message: 'enterpriseEmail, date e duration são obrigatórios'
        });
      }
      
      const result = await bookingService.getAvailableSlots(enterpriseEmail, date, duration);
      
      if (result.success) {
        return {
          success: true,
          data: result.data || [],
          message: 'Horários disponíveis encontrados'
        };
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro ao buscar horários disponíveis'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro na API de disponibilidade:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  fastify.post('/availability/check', {
    schema: {
      tags: ['Availability'],
      description: 'Verificar se um horário específico está disponível',
      body: {
        type: 'object',
        properties: {
          enterpriseEmail: { type: 'string' },
          date: { type: 'string' },
          startTime: { type: 'string' },
          duration: { type: 'number' }
        },
        required: ['enterpriseEmail', 'date', 'startTime', 'duration']
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: {
              type: 'object',
              properties: {
                isAvailable: { type: 'boolean' },
                conflictingBooking: { 
                  type: 'object',
                  nullable: true
                }
              }
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
      const { enterpriseEmail, date, startTime, duration } = request.body as any;

      const result = await bookingService.isTimeSlotAvailable(enterpriseEmail, date, startTime, duration);
      
      return {
        success: true,
        data: { 
          isAvailable: result.available,
          conflictingBooking: result.conflictingBooking || null
        },
        message: 'Horário verificado com sucesso'
      };
    } catch (error: any) {
      fastify.log.error('Erro ao verificar horário:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });
}
