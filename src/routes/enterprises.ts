import { FastifyInstance } from 'fastify';
import { enterpriseService } from '../services/enterpriseService.js';
import { enterpriseSchema, responses } from '../schemas/index.js';

export async function enterpriseRoutes(fastify: FastifyInstance) {
  fastify.get('/enterprises', {
    schema: {
      tags: ['Enterprises'],
      summary: 'Listar empresas',
      description: 'Retorna lista de todas as empresas cadastradas',
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: {
              type: 'array',
              items: enterpriseSchema
            }
          }
        },
        500: responses[500],
        502: responses[502]
      }
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

  fastify.get('/enterprises/:email', {
    schema: {
      tags: ['Enterprises'],
      summary: 'Obter empresa por email',
      description: 'Retorna dados de uma empresa específica pelo email',
      params: {
        type: 'object',
        properties: {
          email: { 
            type: 'string',
            format: 'email',
            description: 'Email da empresa'
          }
        },
        required: ['email']
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: enterpriseSchema
          }
        },
        400: responses[400],
        404: responses[404],
        500: responses[500],
        502: responses[502]
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

  fastify.post('/enterprises', {
    schema: {
      tags: ['Enterprises'],
      summary: 'Criar empresa',
      description: 'Cria uma nova empresa no sistema',
      body: {
        type: 'object',
        properties: {
          email: { 
            type: 'string',
            format: 'email',
            description: 'Email da empresa'
          },
          name: { 
            type: 'string',
            description: 'Nome da empresa'
          },
          phone: { 
            type: 'string',
            description: 'Telefone da empresa'
          },
          address: { 
            type: 'string',
            description: 'Endereço da empresa'
          }
        },
        required: ['email', 'name']
      },
      response: {
        201: {
          ...responses[201],
          properties: {
            ...responses[201].properties,
            data: enterpriseSchema
          }
        },
        400: responses[400],
        409: responses[409],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

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

  fastify.put('/enterprises/:email', {
    schema: {
      tags: ['Enterprises'],
      summary: 'Atualizar empresa',
      description: 'Atualiza dados de uma empresa existente',
      params: {
        type: 'object',
        properties: {
          email: { 
            type: 'string',
            format: 'email',
            description: 'Email da empresa'
          }
        },
        required: ['email']
      },
      body: {
        type: 'object',
        properties: {
          name: { 
            type: 'string',
            description: 'Nome da empresa'
          },
          phone: { 
            type: 'string',
            description: 'Telefone da empresa'
          },
          address: { 
            type: 'string',
            description: 'Endereço da empresa'
          }
        }
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: enterpriseSchema
          }
        },
        400: responses[400],
        404: responses[404],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request, reply) => {
    try {
      const { email } = request.params as { email: string };
      const body = request.body as any;

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
