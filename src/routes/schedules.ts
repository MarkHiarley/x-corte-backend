import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { scheduleService } from '../services/scheduleService.js';
import { Schedule } from '../types/index.js';
import { scheduleSchema, responses } from '../schemas/index.js';

interface CreateScheduleBody {
  enterpriseEmail: string;
  name: string;
  timeZone: string;
  availability: {
    days: string[];
    startTime: string;
    endTime: string;
  }[];
  isDefault?: boolean;
}

interface GetSchedulesQuery {
  enterpriseEmail: string;
}

interface UpdateScheduleParams {
  id: string;
}

interface DeleteScheduleParams {
  id: string;
}

export async function schedulesRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: CreateScheduleBody;
  }>('/schedules', {
    schema: {
      tags: ['Schedules'],
      summary: 'Criar horário de funcionamento',
      description: 'Cria um novo horário de funcionamento para uma empresa com disponibilidade semanal configurável.',
      body: {
        type: 'object',
        properties: {
          enterpriseEmail: {
            type: 'string',
            format: 'email',
            description: 'Email da empresa'
          },
          name: {
            type: 'string',
            description: 'Nome identificador do horário'
          },
          timeZone: {
            type: 'string',
            description: 'Fuso horário'
          },
          availability: {
            type: 'array',
            description: 'Configuração de disponibilidade por período',
            items: {
              type: 'object',
              properties: {
                days: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                  },
                  description: 'Dias da semana para este horário'
                },
                startTime: {
                  type: 'string',
                  pattern: '^\\d{2}:\\d{2}$',
                  description: 'Horário de abertura (HH:MM)'
                },
                endTime: {
                  type: 'string',
                  pattern: '^\\d{2}:\\d{2}$',
                  description: 'Horário de fechamento (HH:MM)'
                }
              },
              required: ['days', 'startTime', 'endTime']
            }
          },
          isDefault: {
            type: 'boolean',
            description: 'Se este é o horário padrão da empresa'
          }
        },
        required: ['enterpriseEmail', 'name', 'timeZone', 'availability']
      },
      response: {
        201: {
          ...responses[201],
          properties: {
            ...responses[201].properties,
            data: scheduleSchema
          }
        },
        400: responses[400],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateScheduleBody }>, reply: FastifyReply) => {
    try {
      const { enterpriseEmail, name, timeZone, availability, isDefault } = request.body;
      
      if (!enterpriseEmail || !name || !timeZone || !availability) {
        return reply.status(400).send({
          success: false,
          message: 'Dados obrigatórios: enterpriseEmail, name, timeZone, availability'
        });
      }

      if (!Array.isArray(availability)) {
        return reply.status(400).send({
          success: false,
          message: 'availability deve ser um array'
        });
      }

      const result = await scheduleService.createSchedule(enterpriseEmail, {
        name,
        timeZone,
        availability,
        isDefault: isDefault || false
      });

      if (result.success) {
        return reply.status(201).send({
          success: true,
          data: result.data,
          message: 'Schedule criado com sucesso no Firebase!'
        });
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro desconhecido'
        });
      }

    } catch (error: any) {
      fastify.log.error('Erro na API de schedules:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  fastify.get<{
    Querystring: GetSchedulesQuery;
  }>('/schedules', {
    schema: {
      tags: ['Schedules'],
      summary: 'Listar horários de funcionamento',
      description: 'Retorna todos os horários de funcionamento de uma empresa',
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
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: {
              type: 'array',
              items: scheduleSchema
            }
          }
        },
        400: responses[400],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Querystring: GetSchedulesQuery }>, reply: FastifyReply) => {
    try {
      const { enterpriseEmail } = request.query;
      
      if (!enterpriseEmail) {
        return reply.status(400).send({
          success: false,
          message: 'enterpriseEmail é obrigatório'
        });
      }

      const result = await scheduleService.getAllSchedules(enterpriseEmail);
      
      if (result.success) {
        return reply.send({
          success: true,
          data: result.data || []
        });
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro desconhecido'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro na API de schedules:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  fastify.get<{
    Params: { id: string };
  }>('/schedules/:id', {
    schema: {
      tags: ['Schedules'],
      summary: 'Obter horário por ID',
      description: 'Retorna um horário de funcionamento específico pelo ID',
      params: {
        type: 'object',
        properties: {
          id: { 
            type: 'string',
            description: 'ID do horário'
          }
        },
        required: ['id']
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: scheduleSchema
          }
        },
        404: responses[404],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const result = await scheduleService.getScheduleById(id);
      
      if (result.success) {
        return reply.send({
          success: true,
          data: result.data
        });
      } else {
        return reply.status(404).send({
          success: false,
          message: result.error || 'Schedule não encontrado'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro na API de schedules:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  fastify.put<{
    Params: UpdateScheduleParams;
    Body: Partial<Schedule>;
  }>('/schedules/:id', {
    schema: {
      tags: ['Schedules'],
      summary: 'Atualizar horário',
      description: 'Atualiza um horário de funcionamento existente',
      params: {
        type: 'object',
        properties: {
          id: { 
            type: 'string',
            description: 'ID do horário'
          }
        },
        required: ['id']
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: scheduleSchema
          }
        },
        400: responses[400],
        404: responses[404],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Params: UpdateScheduleParams; Body: Partial<Schedule> }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      delete updateData.id;
      delete updateData.createdAt;

      const result = await scheduleService.updateSchedule(id, updateData);
      
      if (result.success) {
        return reply.send({
          success: true,
          data: result.data,
          message: 'Schedule atualizado com sucesso!'
        });
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro ao atualizar schedule'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro na API de schedules:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  fastify.delete<{
    Params: DeleteScheduleParams;
  }>('/schedules/:id', {
    schema: {
      tags: ['Schedules'],
      summary: 'Deletar horário',
      description: 'Remove um horário de funcionamento',
      params: {
        type: 'object',
        properties: {
          id: { 
            type: 'string',
            description: 'ID do horário'
          }
        },
        required: ['id']
      },
      response: {
        200: responses[200],
        404: responses[404],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Params: DeleteScheduleParams }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const result = await scheduleService.deleteSchedule(id);
      
      if (result.success) {
        return reply.send({
          success: true,
          message: 'Schedule deletado com sucesso!'
        });
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro ao deletar schedule'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro na API de schedules:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  fastify.get<{
    Params: { enterpriseEmail: string };
  }>('/schedules/default/:enterpriseEmail', async (request: FastifyRequest<{ Params: { enterpriseEmail: string } }>, reply: FastifyReply) => {
    try {
      const { enterpriseEmail } = request.params;

      const result = await scheduleService.getDefaultSchedule(enterpriseEmail);
      
      if (result.success) {
        return reply.send({
          success: true,
          data: result.data
        });
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro ao buscar schedule padrão'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro na API de schedules:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });
}
