import { FastifyInstance } from 'fastify';
import { bookingService } from '../services/bookingService.js';
import { bookingSchema, responses } from '../schemas/index.js';
import { sendMessage } from '../services/sendmessage.js';

// Armazenamento em memória dos lembretes agendados (em produção, use Redis ou banco)
const scheduledReminders = new Map<string, NodeJS.Timeout>();

export async function bookingRoutes(fastify: FastifyInstance) {
  
  // Função melhorada para agendar lembrete
  async function scheduleReminder(booking: any) {
    try {
      // Criar data completa considerando fuso horário
      const bookingDateTime = new Date(`${booking.date}T${booking.startTime}:00`);
      
      // Log para debug
      console.log(`📅 Agendamento: ${booking.date} às ${booking.startTime}`);
      console.log(`🕐 Data/hora do agendamento: ${bookingDateTime.toLocaleString('pt-BR')}`);
      
      // 30 minutos antes em milissegundos
      const reminderTime = bookingDateTime.getTime() - (30 * 60 * 1000);
      const reminderDate = new Date(reminderTime);
      
      console.log(`⏰ Lembrete agendado para: ${reminderDate.toLocaleString('pt-BR')}`);
      
      // Calcular delay até o momento do lembrete
      const delay = reminderTime - Date.now();
      
      console.log(`⏱️  Delay: ${Math.round(delay / 1000)} segundos (${Math.round(delay / (1000 * 60))} minutos)`);
      
      if (delay > 0) {
        // Formatar número (garantir formato correto)
        let phoneNumber = booking.clientPhone;
        
        // Remove caracteres não numéricos
        phoneNumber = phoneNumber.replace(/\D/g, '');
        
        // Adiciona código do país se não tiver
        if (!phoneNumber.startsWith('55')) {
          phoneNumber = '55' + phoneNumber;
        }
        
        console.log(`📱 Número formatado: ${phoneNumber}`);
        
        // Agendar lembrete
        const timeoutId = setTimeout(async () => {
          try {
            const message = `⏰ *Lembrete de Agendamento*\n\nOlá ${booking.clientName}! 👋\n\nSeu agendamento está chegando:\n\n🔸 *Serviço:* ${booking.productName}\n🔸 *Horário:* ${booking.startTime}\n🔸 *Data:* ${new Date(booking.date).toLocaleDateString('pt-BR')}\n\nNos vemos em breve! 😊`;
            
            console.log(`📤 Enviando lembrete para ${booking.clientName} (${phoneNumber})`);
            
            const result = await sendMessage(phoneNumber, message);
            
            console.log(`✅ Lembrete enviado com sucesso:`, result);
            
            // Remove da lista de lembretes agendados
            scheduledReminders.delete(booking.id);
            
          } catch (err) {
            console.error('❌ Erro ao enviar lembrete:', err);
            
            // Tentar novamente em 5 minutos
            setTimeout(async () => {
              try {
                console.log(`🔄 Tentativa de reenvio para ${booking.clientName}`);
                await sendMessage(phoneNumber, `⏰ Lembrete: ${booking.productName} às ${booking.startTime} hoje!`);
                console.log(`✅ Reenvio bem-sucedido`);
              } catch (retryErr) {
                console.error('❌ Falha no reenvio:', retryErr);
              }
            }, 5 * 60 * 1000); // 5 minutos
          }
        }, delay);
        
        // Armazenar referência do timeout para poder cancelar se necessário
        scheduledReminders.set(booking.id, timeoutId);
        
        console.log(`✅ Lembrete agendado com sucesso para ${booking.clientName}`);
        
      } else {
        console.log("⚠️ Horário já passou ou muito próximo, não será agendado lembrete.");
      }
      
    } catch (error) {
      console.error('❌ Erro ao agendar lembrete:', error);
    }
  }

  // Função para cancelar lembrete
  function cancelReminder(bookingId: string) {
    const timeoutId = scheduledReminders.get(bookingId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      scheduledReminders.delete(bookingId);
      console.log(`🚫 Lembrete cancelado para agendamento ${bookingId}`);
    }
  }

  // Função para reagendar lembretes após reinicialização do servidor
  async function rescheduleExistingReminders(enterpriseEmail: string) {
    try {
      console.log('🔄 Reagendando lembretes existentes...');
      
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Buscar agendamentos de hoje e amanhã que estão confirmados
      const todayBookings = await bookingService.getBookings(enterpriseEmail, today, 'confirmed');
      const tomorrowBookings = await bookingService.getBookings(enterpriseEmail, tomorrow, 'confirmed');
      
      const allBookings = [
        ...((todayBookings.success && 'data' in todayBookings) ? (todayBookings.data || []) : []),
        ...((tomorrowBookings.success && 'data' in tomorrowBookings) ? (tomorrowBookings.data || []) : [])
      ];
      
      for (const booking of allBookings) {
        await scheduleReminder(booking);
      }
      
      console.log(`✅ ${allBookings.length} lembretes reagendados`);
      
    } catch (error) {
      console.error('❌ Erro ao reagendar lembretes:', error);
    }
  }

  // GET /bookings - Listar agendamentos
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
          message: 'enterpriseEmail é obrigatório',
          error: 'Parâmetro obrigatório'
        });
      }

      const result = await bookingService.getBookings(enterpriseEmail, date, status);

      if (result.success && 'data' in result) {
        return {
          success: true,
          data: result.data || []
        };
      } else {
        const errorMessage = ('error' in result && result.error) || 'Erro desconhecido';
        return reply.status(500).send({
          success: false,
          message: errorMessage,
          error: 'Erro interno'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro na API de agendamentos:', error);

      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor',
        error: 'Erro interno'
      });
    }
  });

  // POST /bookings - Criar agendamento
  fastify.post('/bookings', {
    schema: {
      tags: ['Bookings'],
      summary: 'Criar agendamento',
      description: `
        Cria um novo agendamento de forma pública (sem necessidade de login).
        
        **🌐 Rota Pública:** Não requer autenticação - ideal para widgets/sites
        **⚡ Funcionamento:**
        - Se employeeId for informado, valida se o funcionário pode realizar o serviço
        - Se não informado, agenda sem funcionário específico  
        - Preço e duração são sempre os definidos pela empresa no produto
        - Sistema verifica automaticamente disponibilidade de horários
        - Agenda lembrete automático 30 minutos antes
        
        **🎯 Casos de uso:**
        - Site da empresa com formulário de agendamento
        - Aplicativo mobile público
        - Integração com redes sociais
      `,
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
            description: 'ID do funcionário específico (opcional). Se informado, sistema valida se o funcionário pode realizar o serviço.'
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

      if (result.success && 'data' in result && result.data) {
        // Agendar lembrete de forma assíncrona para não bloquear a resposta
        setImmediate(() => {
          scheduleReminder(result.data);
        });

        return reply.status(201).send({
          success: true,
          data: result.data,
          message: 'Agendamento criado com sucesso! Lembrete agendado automaticamente.'
        });
      } else {
        const errorMessage = ('error' in result && result.error) || 'Erro ao criar agendamento';
        return reply.status(400).send({
          success: false,
          message: errorMessage,
          error: 'Erro de validação'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao criar agendamento:', error);

      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor',
        error: 'Erro interno'
      });
    }
  });

  // PUT /bookings/:id/confirm - Confirmar agendamento
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
          message: 'enterpriseEmail é obrigatório',
          error: 'Parâmetro obrigatório'
        });
      }

      const result = await bookingService.confirmBooking(enterpriseEmail, id);

      if (result.success) {
        const message = ('message' in result && result.message) || 'Agendamento confirmado com sucesso';
        return {
          success: true,
          message: message
        };
      } else {
        const errorMessage = ('error' in result && result.error) || 'Erro ao confirmar agendamento';
        return reply.status(500).send({
          success: false,
          message: errorMessage,
          error: 'Erro interno'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao confirmar agendamento:', error);

      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor',
        error: 'Erro interno'
      });
    }
  });

  // PUT /bookings/:id/cancel - Cancelar agendamento
  fastify.put('/bookings/:id/cancel', {
    schema: {
      tags: ['Bookings'],
      summary: 'Cancelar agendamento',
      description: `
        Cancela um agendamento existente preservando o histórico no sistema.
        
        **🗂️ Preserva histórico:** Agendamento fica com status 'cancelled' mas não é deletado
        **👀 Visibilidade:** Cliente e empresa podem ver agendamentos cancelados na listagem
        **🚫 Restrições:** Não é possível cancelar agendamentos já completados
        **✅ Validações:** Verifica se agendamento existe e não está já cancelado
        **🔔 Lembretes:** Cancela automaticamente o lembrete agendado
        
        **💡 Casos de uso:**
        - Cliente desiste do agendamento
        - Empresa precisa cancelar por indisponibilidade
        - Reagendamento (cancelar + criar novo)
      `,
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID do agendamento' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          enterpriseEmail: {
            type: 'string',
            format: 'email',
            description: 'Email da empresa'
          }
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
          message: 'enterpriseEmail é obrigatório',
          error: 'Parâmetro obrigatório'
        });
      }

      const result = await bookingService.cancelBooking(enterpriseEmail, id);

      if (result.success) {
        // Cancelar lembrete agendado
        cancelReminder(id);
        
        const message = ('message' in result && result.message) || 'Agendamento cancelado com sucesso';
        return {
          success: true,
          message: message + ' Lembrete cancelado.'
        };
      } else {
        const errorMessage = ('error' in result && result.error) || 'Erro ao cancelar agendamento';
        const statusCode = errorMessage.includes('não encontrado') ? 404 : 400;
        return reply.status(statusCode).send({
          success: false,
          message: errorMessage,
          error: statusCode === 404 ? 'Recurso não encontrado' : 'Erro de validação'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao cancelar agendamento:', error);

      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor',
        error: 'Erro interno'
      });
    }
  });

  // GET /bookings/available-employees - Listar funcionários disponíveis
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
        const errorMessage = ('error' in result && result.error) || 'Erro ao buscar funcionários disponíveis';
        return reply.status(400).send({
          success: false,
          message: errorMessage,
          error: 'Erro de validação'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao buscar funcionários disponíveis:', error);

      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor',
        error: 'Erro interno'
      });
    }
  });

  // POST /bookings/reschedule-reminders - Reagendar lembretes
  fastify.post('/bookings/reschedule-reminders', {
    schema: {
      tags: ['Bookings'],
      summary: 'Reagendar lembretes',
      description: 'Reagenda lembretes para agendamentos existentes (útil após reinicialização do servidor)',
      body: {
        type: 'object',
        properties: {
          enterpriseEmail: {
            type: 'string',
            format: 'email',
            description: 'Email da empresa'
          }
        },
        required: ['enterpriseEmail']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            activeReminders: { type: 'number' }
          }
        },
        500: responses[500]
      }
    }
  }, async (request, reply) => {
    try {
      const { enterpriseEmail } = request.body as any;
      
      await rescheduleExistingReminders(enterpriseEmail);
      
      return {
        success: true,
        message: 'Lembretes reagendados com sucesso',
        activeReminders: scheduledReminders.size
      };
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro ao reagendar lembretes',
        error: 'Erro interno'
      });
    }
  });

  // GET /bookings/active-reminders - Listar lembretes ativos
  fastify.get('/bookings/active-reminders', {
    schema: {
      tags: ['Bookings'],
      summary: 'Listar lembretes ativos',
      description: 'Lista todos os lembretes atualmente agendados no sistema',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            activeReminders: { type: 'number' },
            reminderIds: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    return {
      success: true,
      activeReminders: scheduledReminders.size,
      reminderIds: Array.from(scheduledReminders.keys())
    };
  });
}