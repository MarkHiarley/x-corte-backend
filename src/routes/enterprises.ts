import { FastifyInstance } from 'fastify';
import { enterpriseService } from '../services/enterpriseService.js';

export async function enterpriseRoutes(fastify: FastifyInstance) {
  // GET /enterprises - Listar todas as empresas
  fastify.get('/enterprises', {
    schema: {
      tags: ['Enterprises'],
      description: 'Listar todas as empresas'
    }
  }, async (_, reply) => {
    try {
      const result = await enterpriseService.getAllEnterprises();
      
      if (!result.success) {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro ao buscar empresas'
        });
      }
      
      return {
        success: true,
        data: result.data,
        message: 'Empresas encontradas com sucesso'
      };
    } catch (error: any) {
      fastify.log.error('Erro na API de empresas:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  // GET /enterprises/:email - Buscar dados da empresa
  fastify.get('/enterprises/:email', {
    schema: {
      tags: ['Enterprises'],
      description: 'Buscar dados de uma empresa pelo email',
      params: {
        type: 'object',
        properties: {
          email: { type: 'string' }
        },
        required: ['email']
      }
    }
  }, async (request, reply) => {
    try {
      const { email } = request.params as { email: string };
      
      if (!email) {
        return reply.status(400).send({
          success: false,
          message: 'Email é obrigatório'
        });
      }
      
      const result = await enterpriseService.getEnterpriseByEmail(email);
      
      if (!result.success) {
        return reply.status(404).send({
          success: false,
          message: result.error || 'Empresa não encontrada'
        });
      }
      
      return {
        success: true,
        data: result.data,
        message: 'Empresa encontrada com sucesso'
      };
    } catch (error: any) {
      fastify.log.error('Erro na API de empresas:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  // POST /enterprises - Criar empresa
  fastify.post('/enterprises', {
    schema: {
      tags: ['Enterprises'],
      description: 'Criar uma nova empresa',
      body: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          name: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' }
        },
        required: ['email', 'name']
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      // TODO: Implementar lógica de criação de empresa
      return {
        success: true,
        data: { ...body },
        message: 'Empresa criada com sucesso!'
      };
    } catch (error: any) {
      fastify.log.error('Erro ao criar empresa:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  // PUT /enterprises/:email - Atualizar empresa
  fastify.put('/enterprises/:email', {
    schema: {
      tags: ['Enterprises'],
      description: 'Atualizar dados de uma empresa',
      params: {
        type: 'object',
        properties: {
          email: { type: 'string' }
        },
        required: ['email']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email } = request.params as { email: string };
      const body = request.body as any;

      // TODO: Implementar lógica de atualização de empresa
      return {
        success: true,
        data: { email, ...body },
        message: 'Empresa atualizada com sucesso!'
      };
    } catch (error: any) {
      fastify.log.error('Erro ao atualizar empresa:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });
}
