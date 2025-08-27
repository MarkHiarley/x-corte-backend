import { FastifyInstance } from 'fastify';
import { authService } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/register', {
    schema: {
      tags: ['Authentication'],
      description: 'Registrar novo usuário',
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string', minLength: 2 },
          role: { type: 'string', enum: ['admin', 'client'] },
          enterpriseEmail: { type: 'string', format: 'email' },
          phone: { type: 'string' }
        },
        required: ['email', 'password', 'name', 'role']
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
      description: 'Fazer login',
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        },
        required: ['email', 'password']
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
      tags: ['Auth'],
      description: 'Obter perfil do usuário autenticado',
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string' }
        },
        required: ['authorization']
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
      tags: ['Auth'],
      description: 'Realizar logout'
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
      description: 'Buscar perfil do usuário',
      params: {
        type: 'object',
        properties: {
          uid: { type: 'string' }
        },
        required: ['uid']
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
