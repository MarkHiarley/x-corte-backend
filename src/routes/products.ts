import { FastifyInstance } from 'fastify';
import { productService } from '../services/productService.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { productSchema, errorResponse } from '../schemas/index.js';

export async function productRoutes(fastify: FastifyInstance) {
  fastify.get('/products', {
    schema: {
      tags: ['Products'],
      summary: 'Listar produtos',
      description: 'Retorna todos os produtos ativos de uma empresa específica',
      querystring: {
        type: 'object',
        properties: {
          enterpriseEmail: { 
            type: 'string',
            format: 'email',
            description: 'Email da empresa para buscar produtos'
          },
          category: {
            type: 'string',
            description: 'Filtrar por categoria'
          },
          active: {
            type: 'boolean',
            description: 'Filtrar produtos ativos/inativos'
          }
        },
        required: ['enterpriseEmail']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: productSchema
            }
          }
        },
        400: errorResponse,
        500: errorResponse
      }
    }
  }, async (request, reply) => {
    try {
      const { enterpriseEmail } = request.query as { enterpriseEmail: string };
      
      if (!enterpriseEmail) {
        return reply.status(400).send({
          success: false,
          message: 'enterpriseEmail é obrigatório'
        });
      }
      
      const result = await productService.getProducts(enterpriseEmail);
      
      if (result.success) {
        return {
          success: true,
          data: result.data || []
        };
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro desconhecido'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro na API de produtos:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  fastify.post('/products', {
    preHandler: [authenticate, requireAdmin],
    schema: {
      tags: ['Products'],
      description: 'Criar um novo produto',
      body: {
        type: 'object',
        properties: {
          enterpriseEmail: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          duration: { type: 'number' },
          description: { type: 'string' },
          category: { type: 'string' },
          isActive: { type: 'boolean' }
        },
        required: ['enterpriseEmail', 'name', 'price', 'duration']
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as any;

      if (!body.enterpriseEmail || !body.name || !body.price || !body.duration) {
        return reply.status(400).send({
          success: false,
          message: 'Dados obrigatórios: enterpriseEmail, name, price, duration'
        });
      }

      if (typeof body.price !== 'number' || body.price <= 0) {
        return reply.status(400).send({
          success: false,
          message: 'Preço deve ser um número maior que zero (em centavos)'
        });
      }

      if (typeof body.duration !== 'number' || body.duration <= 0) {
        return reply.status(400).send({
          success: false,
          message: 'Duração deve ser um número maior que zero (em minutos)'
        });
      }

      const result = await productService.createProduct(
        body.enterpriseEmail,
        {
          name: body.name,
          price: body.price,
          duration: body.duration,
          description: body.description || '',
          category: body.category || '',
          isActive: body.isActive !== undefined ? body.isActive : true
        }
      );

      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: 'Produto criado com sucesso!'
        };
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro desconhecido'
        });
      }

    } catch (error: any) {
      fastify.log.error('Erro na API de produtos:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  fastify.put('/products/:id', {
    preHandler: [authenticate, requireAdmin],
    schema: {
      tags: ['Products'],
      description: 'Atualizar um produto',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          enterpriseEmail: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          duration: { type: 'number' },
          description: { type: 'string' },
          category: { type: 'string' },
          isActive: { type: 'boolean' }
        },
        required: ['enterpriseEmail']
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      if (!body.enterpriseEmail) {
        return reply.status(400).send({
          success: false,
          message: 'enterpriseEmail é obrigatório'
        });
      }

      const result = await productService.updateProduct(body.enterpriseEmail, id, body);

      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: 'Produto atualizado com sucesso!'
        };
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro desconhecido'
        });
      }

    } catch (error: any) {
      fastify.log.error('Erro ao atualizar produto:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  fastify.delete('/products/:id', {
    preHandler: [authenticate, requireAdmin],
    schema: {
      tags: ['Products'],
      description: 'Deletar um produto',
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

      const result = await productService.deleteProduct(enterpriseEmail, id);

      if (result.success) {
        return {
          success: true,
          message: 'Produto deletado com sucesso!'
        };
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro desconhecido'
        });
      }

    } catch (error: any) {
      fastify.log.error('Erro ao deletar produto:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  fastify.get('/products/active', {
    schema: {
      tags: ['Products'],
      description: 'Listar produtos ativos de uma empresa',
      querystring: {
        type: 'object',
        properties: {
          enterpriseEmail: { type: 'string' }
        },
        required: ['enterpriseEmail']
      }
    }
  }, async (request, reply) => {
    try {
      const { enterpriseEmail } = request.query as { enterpriseEmail: string };
      
      if (!enterpriseEmail) {
        return reply.status(400).send({
          success: false,
          message: 'enterpriseEmail é obrigatório'
        });
      }
      
      const result = await productService.getActiveProducts(enterpriseEmail);
      
      if (result.success) {
        return {
          success: true,
          data: result.data || []
        };
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro desconhecido'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro na API de produtos ativos:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });
}
