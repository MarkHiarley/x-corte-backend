import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { scheduleService } from '../services/scheduleService.js';
import { Schedule } from '../types/index.js';

// Interfaces para tipagem das requisições
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
  // POST /schedules - Criar um novo schedule
  fastify.post<{
    Body: CreateScheduleBody;
  }>('/schedules', async (request: FastifyRequest<{ Body: CreateScheduleBody }>, reply: FastifyReply) => {
    try {
      const { enterpriseEmail, name, timeZone, availability, isDefault } = request.body;
      
      // Validação básica
      if (!enterpriseEmail || !name || !timeZone || !availability) {
        return reply.status(400).send({
          success: false,
          message: 'Dados obrigatórios: enterpriseEmail, name, timeZone, availability'
        });
      }

      // Validar se availability é um array
      if (!Array.isArray(availability)) {
        return reply.status(400).send({
          success: false,
          message: 'availability deve ser um array'
        });
      }

      // Criar schedule no Firestore para a empresa
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

  // GET /schedules - Buscar todos os schedules de uma empresa
  fastify.get<{
    Querystring: GetSchedulesQuery;
  }>('/schedules', async (request: FastifyRequest<{ Querystring: GetSchedulesQuery }>, reply: FastifyReply) => {
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

  // GET /schedules/:id - Buscar um schedule específico
  fastify.get<{
    Params: { id: string };
  }>('/schedules/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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

  // PUT /schedules/:id - Atualizar um schedule
  fastify.put<{
    Params: UpdateScheduleParams;
    Body: Partial<Schedule>;
  }>('/schedules/:id', async (request: FastifyRequest<{ Params: UpdateScheduleParams; Body: Partial<Schedule> }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      // Remover campos que não devem ser atualizados diretamente
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

  // DELETE /schedules/:id - Deletar um schedule
  fastify.delete<{
    Params: DeleteScheduleParams;
  }>('/schedules/:id', async (request: FastifyRequest<{ Params: DeleteScheduleParams }>, reply: FastifyReply) => {
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

  // GET /schedules/default/:enterpriseEmail - Buscar schedule padrão de uma empresa
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
