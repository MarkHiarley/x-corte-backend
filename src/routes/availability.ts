import { FastifyInstance } from 'fastify';
import { bookingService } from '../services/bookingService.js';

export async function availabilityRoutes(fastify: FastifyInstance) {
  fastify.get('/availability/slots', {
    schema: {
      tags: ['Availability'],
      description: 'Verificar horários disponíveis para agendamento',
      querystring: {
        type: 'object',
        properties: {
          enterpriseEmail: { type: 'string' },
          date: { type: 'string' },
          duration: { type: 'number' }
        },
        required: ['enterpriseEmail', 'date', 'duration']
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
