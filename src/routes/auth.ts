import { FastifyInstance } from 'fastify';
import { authService } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
import { userSchema, responses } from '../schemas/index.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/register', {
    schema: {
      tags: ['Authentication'],
      summary: 'Registrar novo usuário',
      description: 'Cria uma nova conta de usuário. Para administradores, é necessário fornecer o email da empresa.',
      body: {
        type: 'object',
        properties: {
          email: { 
            type: 'string', 
            format: 'email',
            description: 'Email do usuário'
          },
          password: { 
            type: 'string', 
            minLength: 6,
            description: 'Senha com pelo menos 6 caracteres'
          },
          name: { 
            type: 'string', 
            minLength: 2,
            description: 'Nome completo do usuário'
          },
          role: { 
            type: 'string', 
            enum: ['admin', 'client'],
            description: 'Tipo de usuário'
          },
          enterpriseEmail: { 
            type: 'string', 
            format: 'email',
            description: 'Email da empresa (obrigatório para admins)'
          },
          phone: { 
            type: 'string',
            description: 'Telefone de contato'
          }
        },
        required: ['email', 'password', 'name', 'role']
      },
      response: {
        201: {
          ...responses[201],
          properties: {
            ...responses[201].properties,
            data: userSchema
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
      const { email, password, name, role, enterpriseEmail, phone } = request.body as any;
      
      if (role === 'admin' && !enterpriseEmail) {
        return reply.status(400).send({
          success: false,
          message: 'enterpriseEmail é obrigatório para administradores'
        });
      }

      const result = await authService.registerUser(email, password, name, role, enterpriseEmail, phone);
      
      if (result.success) {
        return reply.status(201).send({
          success: true,
          data: result.data,
          message: 'Usuário registrado com sucesso'
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: result.error
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro no registro:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  fastify.post('/auth/login', {
    schema: {
      tags: ['Authentication'],
      summary: 'Fazer login',
      description: 'Autentica o usuário e retorna token de acesso',
      body: {
        type: 'object',
        properties: {
          email: { 
            type: 'string', 
            format: 'email',
            description: 'Email do usuário' 
          },
          password: { 
            type: 'string',
            description: 'Senha do usuário'
          }
        },
        required: ['email', 'password']
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: {
              type: 'object',
              properties: {
                user: userSchema,
                token: { type: 'string', description: 'Token JWT' }
              }
            }
          }
        },
        400: responses[400],
        401: responses[401],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password } = request.body as any;
      
      const result = await authService.login(email, password);
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: 'Login realizado com sucesso'
        };
      } else {
        return reply.status(401).send({
          success: false,
          message: result.error
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro no login:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  fastify.get('/auth/profile', {
    preHandler: [authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'Obter perfil do usuário',
      description: 'Retorna os dados do usuário autenticado',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: userSchema
          }
        },
        401: responses[401],
        403: responses[403],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: any) => {
    return {
      success: true,
      data: request.user,
      message: 'Perfil obtido com sucesso'
    };
  });

  fastify.post('/auth/logout', {
    schema: {
      tags: ['Authentication'],
      summary: 'Realizar logout',
      description: 'Encerra a sessão do usuário',
      response: {
        200: responses[200],
        401: responses[401],
        500: responses[500]
      }
    }
  }, async () => {
    return {
      success: true,
      message: 'Logout realizado com sucesso'
    };
  });

  fastify.get('/auth/profile/:uid', {
    schema: {
      tags: ['Authentication'],
      summary: 'Buscar perfil por ID',
      description: 'Retorna os dados públicos de um usuário específico',
      params: {
        type: 'object',
        properties: {
          uid: { 
            type: 'string',
            description: 'ID único do usuário'
          }
        },
        required: ['uid']
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: userSchema
          }
        },
        404: responses[404],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request, reply) => {
    try {
      const { uid } = request.params as { uid: string };
      
      const result = await authService.getUserProfile(uid);
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        return reply.status(404).send({
          success: false,
          message: result.error
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao buscar perfil:', error);
      
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });
}
