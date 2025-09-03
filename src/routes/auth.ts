import { FastifyInstance } from 'fastify';
import { authService } from '../services/authService.js';
import { enterpriseService } from '../services/enterpriseService.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { userSchema, responses, enterpriseSchema, enterpriseRegistrationSchema } from '../schemas/index.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/register', {
    schema: {
      tags: ['Authentication'],
      summary: 'Registrar novo usuário',
      description: `
        Cria uma nova conta de usuário com diferentes tipos de acesso.
        
        **Tipos de usuário:**
        - **client**: Cliente comum que agenda serviços
        - **admin**: Administrador de empresa (requer enterpriseEmail)
        
        **⚠️ Importante:** 
        - Use /auth/register-enterprise para criar empresas novas
        - Funcionários não fazem login - são recursos internos gerenciados pelo admin
      `,
      body: {
        type: 'object',
        properties: {
          email: { 
            type: 'string', 
            format: 'email',
            description: 'Email pessoal do usuário'
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
            description: 'Telefone de contato (opcional)'
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

  fastify.post('/auth/register-enterprise', {
    schema: {
      tags: ['Authentication'],
      summary: 'Registrar Nova Empresa',
      description: `
        Cria uma nova empresa e o usuário administrador em uma única operação.
        
        **🏢 Fluxo completo:**
        1. Cria a empresa no sistema
        2. Cria o usuário admin automaticamente
        3. Associa o admin à empresa
        4. Retorna login automático com token
        
        **📧 Email único:** O email da empresa serve como login do administrador.
        
        **⭐ Recomendado:** Use esta rota para novos negócios.
      `,
      body: enterpriseRegistrationSchema,
      response: {
        201: {
          ...responses[201],
          properties: {
            ...responses[201].properties,
            data: {
              type: 'object',
              properties: {
                user: userSchema,
                enterprise: enterpriseSchema,
                token: { type: 'string', description: 'Token JWT para login automático' }
              }
            }
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
      const { 
        email,
        password, 
        name,
        enterpriseName,
        phone, 
        address 
      } = request.body as any;

      const userExists = await authService.login(email, 'fake_password_test');
      if (userExists.success) {
        return reply.status(409).send({
          success: false,
          message: 'Esta empresa já está cadastrada no sistema',
          error: 'Email já em uso'
        });
      }

      const enterpriseResult = await enterpriseService.createEnterprise({
        email: email,
        name: enterpriseName,
        phone: phone,
        address: address
      });

      if (!enterpriseResult.success) {
        return reply.status(400).send({
          success: false,
          message: 'Falha ao criar empresa',
          error: enterpriseResult.error || 'Erro desconhecido'
        });
      }

      const adminResult = await authService.registerUser(
        email,
        password, 
        name,
        'admin',
        email,
        phone
      );

      if (!adminResult.success) {
        return reply.status(400).send({
          success: false,
          message: 'Falha ao criar usuário administrador',
          error: adminResult.error || 'Erro desconhecido'
        });
      }

      const loginResult = await authService.login(email, password);
      
      return reply.status(201).send({
        success: true,
        message: 'Empresa criada com sucesso! Login automático realizado.',
        data: {
          user: adminResult.data,
          enterprise: enterpriseResult.data,
          token: loginResult.success ? loginResult.data?.token : null
        }
      });

    } catch (error: any) {
      fastify.log.error('Erro no registro de empresa:', error);
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  });
}
