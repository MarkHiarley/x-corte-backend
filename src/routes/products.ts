import { FastifyInstance } from 'fastify';
import { productService } from '../services/productService.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { productSchema, responses } from '../schemas/index.js';

export async function productRoutes(fastify: FastifyInstance) {
  fastify.get('/products', {
    schema: {
      tags: ['Products'],
      summary: 'Listar produtos/serviços',
      description: 'Retorna todos os produtos/serviços ativos de uma empresa específica. Usado pelo frontend para exibir catálogo de serviços.',
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
            description: 'Filtrar por categoria (opcional)'
          },
          active: {
            type: 'boolean',
            description: 'Filtrar produtos ativos/inativos (opcional)'
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
              items: productSchema
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
      summary: 'Criar produto/serviço',
      description: 'Cria um novo produto/serviço na empresa. Apenas administradores podem criar produtos.',
      security: [{ bearerAuth: [] }],
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
              description: 'Nome do produto/serviço'
            },
            price: { 
              type: 'number',
              minimum: 0,
              description: 'Preço em reais'
            },
            duration: { 
              type: 'number',
              minimum: 1,
              description: 'Duração em minutos'
            },
            description: { 
              type: 'string',
              description: 'Descrição detalhada do serviço'
            },
            category: { 
              type: 'string',
              description: 'Categoria do serviço'
            },
            isActive: { 
              type: 'boolean',
              description: 'Se o produto está ativo'
            }
          },
          required: ['enterpriseEmail', 'name', 'price', 'duration']
        },
      response: {
        201: {
          ...responses[201],
          properties: {
            ...responses[201].properties,
            data: productSchema
          }
        },
        400: responses[400],
        401: responses[401],
        403: responses[403],
        422: responses[422],
        500: responses[500],
        502: responses[502]
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
