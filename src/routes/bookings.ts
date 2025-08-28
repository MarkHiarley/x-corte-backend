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
      description: 'Criar um novo agendamento',
      body: {
        type: 'object',
        properties: {
          enterpriseEmail: { type: 'string' },
          clientName: { type: 'string' },
          clientPhone: { type: 'string' },
          clientEmail: { type: 'string' },
          productId: { type: 'string' },
          date: { type: 'string' },
          startTime: { type: 'string' },
          notes: { type: 'string' }
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

      const result = await bookingService.createBooking(body.enterpriseEmail, {
        clientName: body.clientName,
        clientPhone: body.clientPhone,
        clientEmail: body.clientEmail,
        productId: body.productId,
        productName: '',
        productDuration: 0,
        productPrice: 0,
        date: body.date,
        startTime: body.startTime,
        status: 'pending',
        notes: body.notes
      } as any);

      if (result.success && 'data' in result) {
        return {
          success: true,
          data: result.data,
          message: 'Agendamento criado com sucesso!'
        };
      } else {
        return reply.status(400).send({
          success: false,
          message: ('error' in result ? result.error : undefined) || 'Erro ao criar agendamento'
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
}
