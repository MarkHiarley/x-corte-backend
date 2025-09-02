import { FastifyInstance } from 'fastify';
import { productService } from '../services/productService.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { productSchema, responses } from '../schemas/index.js';

export async function productRoutes(fastify: FastifyInstance) {
  // Rota pública para visualizar produtos da empresa (sem autenticação)
  fastify.get('/products/:enterpriseEmail', {
    schema: {
      tags: ['Products'],
      summary: 'Listar produtos/serviços (público)',
      description: 'Retorna todos os produtos/serviços ativos de uma empresa específica. Rota pública, não requer autenticação.',
      params: {
        type: 'object',
        properties: {
          enterpriseEmail: {
            type: 'string',
            format: 'email',
            description: 'Email da empresa para listar produtos'
          }
        },
        required: ['enterpriseEmail']
      },
      querystring: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filtrar por categoria (opcional)'
          },
          active: {
            type: 'boolean',
            description: 'Filtrar produtos ativos/inativos (opcional)'
          }
        }
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
        403: responses[403],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request, reply) => {
    try {
      const { enterpriseEmail } = request.params as { enterpriseEmail: string };
      
      // Validar formato do email da empresa
      if (!enterpriseEmail || !enterpriseEmail.includes('@')) {
        return reply.status(400).send({
          success: false,
          message: 'Email da empresa inválido',
          error: 'Parâmetro enterpriseEmail deve ser um email válido'
        });
      }

      // Buscar produtos ativos da empresa (rota pública)
      const result = await productService.getActiveProducts(enterpriseEmail);
      
      if (result.success) {
        return reply.send(result);
      } else {
        return reply.status(400).send(result);
      }
    } catch (error: any) {
      console.error('Erro ao buscar produtos:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  });

  fastify.post('/products', {
    preHandler: [authenticate, requireAdmin],
    schema: {
      tags: ['Products'],
      summary: 'Criar produto/serviço',
      description: 'Cria um novo produto/serviço na empresa. Apenas administradores podem criar produtos.',
      security: [{ bearerAuth: [] }],        body: {
          type: 'object',
          properties: {
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
          required: ['name', 'price', 'duration']
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
      const user = (request as any).user;

      // Validação de segurança: usuário deve estar associado a uma empresa
      if (!user?.enterpriseEmail) {
        return reply.status(403).send({
          success: false,
          message: 'Usuário não está associado a nenhuma empresa',
          error: 'Acesso negado'
        });
      }

      // Validações dos dados obrigatórios
      if (!body.name || !body.price || !body.duration) {
        return reply.status(400).send({
          success: false,
          message: 'Dados obrigatórios: name, price, duration'
        });
      }

      if (typeof body.price !== 'number' || body.price <= 0) {
        return reply.status(400).send({
          success: false,
          message: 'Preço deve ser um número maior que zero'
        });
      }

      if (typeof body.duration !== 'number' || body.duration <= 0) {
        return reply.status(400).send({
          success: false,
          message: 'Duração deve ser um número maior que zero (em minutos)'
        });
      }

      // Usar o enterpriseEmail do token JWT - mais seguro!
      const result = await productService.createProduct(
        user.enterpriseEmail, // Sempre usa o email da empresa do usuário autenticado
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
        return reply.status(201).send(result);
      } else {
        return reply.status(400).send(result);
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

  // Rota administrativa para gerenciar produtos (incluindo inativos)
  fastify.get('/admin/products', {
    preHandler: [authenticate, requireAdmin],
    schema: {
      tags: ['Products'],
      summary: 'Listar produtos/serviços (admin)',
      description: 'Retorna todos os produtos/serviços da empresa (incluindo inativos). Apenas administradores podem acessar.',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filtrar por categoria (opcional)'
          },
          active: {
            type: 'boolean',
            description: 'Filtrar produtos ativos/inativos (opcional)'
          }
        }
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
        403: responses[403],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      
      // Validação de segurança: usuário deve estar associado a uma empresa
      if (!user?.enterpriseEmail) {
        return reply.status(403).send({
          success: false,
          message: 'Usuário não está associado a nenhuma empresa',
          error: 'Acesso negado'
        });
      }

      // Usar o enterpriseEmail do token JWT - mais seguro!
      const result = await productService.getProducts(user.enterpriseEmail);
      
      if (result.success) {
        return reply.send(result);
      } else {
        return reply.status(400).send(result);
      }
    } catch (error: any) {
      console.error('Erro ao buscar produtos (admin):', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  });
}
