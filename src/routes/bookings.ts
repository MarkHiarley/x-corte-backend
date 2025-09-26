// ===================================
// 📁 src/routes/bookingRoutes.ts (CORRIGIDO)
// ===================================
import { FastifyInstance } from 'fastify';
import { bookingService } from '../services/bookingService.js';
import { bookingSchema, responses } from '../schemas/index.js';
import { 
  scheduleSimpleReminder, 
  cancelSimpleReminder, 
  getActiveReminders 
} from '../services/reminder.js';

export async function bookingRoutes(fastify: FastifyInstance) {
  
  // Função para calcular delay do lembrete
  function calculateReminderDelay(date: string, startTime: string): number {
    const isProduction = process.env.NODE_ENV === 'production';
    const minutesBefore = isProduction ? 30 : 0.5; // 0.5 min = 30 segundos para teste
    
    const bookingDateTime = new Date(`${date}T${startTime}:00-03:00`);
    const reminderTime = bookingDateTime.getTime() - (minutesBefore * 60 * 1000);
    const delay = reminderTime - Date.now();
    
    console.log(`📅 Agendamento: ${bookingDateTime.toLocaleString('pt-BR')}`);
    console.log(`⏰ Lembrete: ${new Date(reminderTime).toLocaleString('pt-BR')}`);
    console.log(`⏱️ Delay: ${Math.round(delay / 1000)}s`);
    
    return Math.max(0, Math.round(delay / 1000));
  }

  // GET /bookings
  fastify.get('/bookings', {
    schema: {
      tags: ['Bookings'],
      summary: 'Listar agendamentos',
      querystring: {
        type: 'object',
        properties: {
          enterpriseEmail: { type: 'string', format: 'email' },
          date: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] }
        },
        required: ['enterpriseEmail']
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

      // Correção TypeScript: verificação mais específica
      if (result.success) {
        const bookings = 'data' in result ? result.data : [];
        return { success: true, data: bookings || [] };
      } else {
        const errorMessage = 'error' in result ? result.error : 'Erro desconhecido';
        return reply.status(500).send({
          success: false,
          message: errorMessage || 'Erro interno'
        });
      }
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  // POST /bookings - VERSÃO CORRIGIDA
  fastify.post('/bookings', {
    schema: {
      tags: ['Bookings'],
      summary: 'Criar agendamento com lembrete automático',
      body: {
        type: 'object',
        properties: {
          enterpriseEmail: { type: 'string', format: 'email' },
          clientName: { type: 'string' },
          clientPhone: { type: 'string' },
          clientEmail: { type: 'string', format: 'email' },
          productId: { type: 'string' },
          employeeId: { type: 'string' },
          date: { type: 'string', format: 'date' },
          startTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
          notes: { type: 'string' }
        },
        required: ['enterpriseEmail', 'clientName', 'clientPhone', 'productId', 'date', 'startTime']
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      console.log('🔄 Criando agendamento...');
      
      // 1. Criar agendamento
      const result = await bookingService.createBookingWithEmployee(body.enterpriseEmail, {
        clientName: body.clientName,
        clientPhone: body.clientPhone,
        clientEmail: body.clientEmail,
        productId: body.productId,
        employeeId: body.employeeId,
        date: body.date,
        startTime: body.startTime,
        notes: body.notes
      });

      console.log('📊 Resultado do agendamento:', { success: result.success });

      // Correção TypeScript: verificação mais robusta
      if (result.success && 'data' in result) {
        const bookingData = result.data;
        
        if (bookingData && typeof bookingData === 'object' && 'id' in bookingData) {
          console.log('✅ Agendamento criado:', bookingData.id);
          
          // 2. Agendar lembrete
          try {
            const delaySeconds = calculateReminderDelay(body.date, body.startTime);
            
            if (delaySeconds > 0) {
              console.log('📅 Agendando lembrete...');
              
              const reminderScheduled = await scheduleSimpleReminder(bookingData.id as string, {
                bookingId: bookingData.id as string,
                clientName: body.clientName,
                clientPhone: body.clientPhone,
                productName: (bookingData as any).productName || 'Serviço',
                date: body.date,
                startTime: body.startTime
              }, delaySeconds);
              
              console.log('📅 Lembrete agendado:', reminderScheduled);
            } else {
              console.log('⚠️ Delay inválido, sem lembrete');
            }
          } catch (reminderError) {
            console.error('❌ Erro no lembrete:', reminderError);
            // Continua mesmo com erro no lembrete
          }

          return reply.status(201).send({
            success: true,
            data: bookingData,
            message: 'Agendamento criado com sucesso! Lembrete agendado.'
          });
        } else {
          console.error('❌ Dados do agendamento inválidos');
          return reply.status(400).send({
            success: false,
            message: 'Dados do agendamento retornados são inválidos'
          });
        }
      } else {
        // Falha na criação do agendamento
        const errorMessage = 'error' in result ? result.error : 'Erro ao criar agendamento';
        console.error('❌ Falha na criação:', errorMessage);
        
        return reply.status(400).send({
          success: false,
          message: errorMessage || 'Erro ao criar agendamento'
        });
      }
    } catch (error: any) {
      console.error('❌ Erro geral:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  // PUT /bookings/:id/confirm
  fastify.put('/bookings/:id/confirm', {
    schema: {
      tags: ['Bookings'],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      querystring: { type: 'object', properties: { enterpriseEmail: { type: 'string' } }, required: ['enterpriseEmail'] }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { enterpriseEmail } = request.query as { enterpriseEmail: string };

      const result = await bookingService.confirmBooking(enterpriseEmail, id);

      if (result.success) {
        const message = 'message' in result ? result.message : 'Agendamento confirmado';
        return { success: true, message: message || 'Confirmado com sucesso' };
      } else {
        const errorMessage = 'error' in result ? result.error : 'Erro ao confirmar';
        return reply.status(500).send({
          success: false,
          message: errorMessage || 'Erro interno'
        });
      }
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  // PUT /bookings/:id/cancel - VERSÃO CORRIGIDA
  fastify.put('/bookings/:id/cancel', {
    schema: {
      tags: ['Bookings'],
      summary: 'Cancelar agendamento e lembrete',
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      querystring: { type: 'object', properties: { enterpriseEmail: { type: 'string' } }, required: ['enterpriseEmail'] }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { enterpriseEmail } = request.query as { enterpriseEmail: string };

      console.log(`🗑️ Cancelando agendamento: ${id}`);

      // 1. Cancelar agendamento
      const result = await bookingService.cancelBooking(enterpriseEmail, id);

      if (result.success) {
        // 2. Cancelar lembrete
        try {
          const reminderCanceled = await cancelSimpleReminder(id);
          console.log(`📝 Lembrete cancelado: ${reminderCanceled}`);
          
          const message = 'message' in result ? result.message : 'Agendamento cancelado';
          const reminderMsg = reminderCanceled ? ' Lembrete cancelado.' : ' (Lembrete não encontrado)';
          
          return {
            success: true,
            message: (message || 'Cancelado com sucesso') + reminderMsg
          };
        } catch (reminderError) {
          console.error('❌ Erro ao cancelar lembrete:', reminderError);
          
          const message = 'message' in result ? result.message : 'Agendamento cancelado';
          return {
            success: true,
            message: (message || 'Cancelado com sucesso') + ' (Erro ao cancelar lembrete)'
          };
        }
      } else {
        const errorMessage = 'error' in result ? result.error : 'Erro ao cancelar';
        const statusCode = (errorMessage || '').includes('não encontrado') ? 404 : 400;
        
        return reply.status(statusCode).send({
          success: false,
          message: errorMessage || 'Erro ao cancelar agendamento'
        });
      }
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  // GET /bookings/available-employees
  fastify.get('/bookings/available-employees', {
    schema: {
      tags: ['Bookings'],
      querystring: {
        type: 'object',
        properties: {
          enterpriseEmail: { type: 'string', format: 'email' },
          productId: { type: 'string' },
          date: { type: 'string', format: 'date' },
          startTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' }
        },
        required: ['enterpriseEmail', 'productId', 'date', 'startTime']
      }
    }
  }, async (request, reply) => {
    try {
      const { enterpriseEmail, productId, date, startTime } = request.query as any;

      const { employeeAvailabilityService } = await import('../services/employeeAvailabilityService.js');
      const result = await employeeAvailabilityService.getAvailableEmployeesForService(
        enterpriseEmail, productId, date, startTime
      );

      if (result.success) {
        return { success: true, data: result.data || [] };
      } else {
        const errorMessage = 'error' in result ? result.error : 'Erro ao buscar funcionários';
        return reply.status(400).send({
          success: false,
          message: errorMessage || 'Erro de validação'
        });
      }
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  // GET /bookings/reminders/active
  fastify.get('/bookings/reminders/active', {
    schema: {
      tags: ['Bookings'],
      summary: 'Ver lembretes ativos no Redis'
    }
  }, async (request, reply) => {
    try {
      const reminders = await getActiveReminders();
      return {
        success: true,
        total: reminders.length,
        reminders: reminders
      };
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message
      });
    }
  });

  // GET /bookings/test-simple
  fastify.get('/bookings/test-simple', {
    schema: {
      tags: ['Bookings'],
      summary: 'Teste lembrete simples (10 segundos)',
      querystring: {
        type: 'object',
        properties: { phone: { type: 'string' } },
        required: ['phone']
      }
    }
  }, async (request, reply) => {
    try {
      const { phone } = request.query as any;
      
      console.log(`🧪 Iniciando teste para: ${phone}`);
      
      const testId = `test-${Date.now()}`;
      const result = await scheduleSimpleReminder(testId, {
        bookingId: testId,
        clientName: 'Teste Simples',
        clientPhone: phone,
        productName: 'Teste Redis',
        date: new Date().toISOString().split('T')[0],
        startTime: new Date().toTimeString().substring(0, 5)
      }, 10); // 10 segundos
      
      return {
        success: true,
        message: result ? 'Teste agendado! Mensagem em 10 segundos.' : 'Erro ao agendar teste',
        testId,
        phone
      };
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message
      });
    }
  });
}