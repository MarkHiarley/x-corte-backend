import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';

import { productRoutes } from './routes/products.js';
import { bookingRoutes } from './routes/bookings.js';
import { availabilityRoutes } from './routes/availability.js';
import { enterpriseRoutes } from './routes/enterprises.js';
import { schedulesRoutes } from './routes/schedules.js';
import { authRoutes } from './routes/auth.js';

dotenv.config();

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }
});

async function setupPlugins() {
  await server.register(cors, {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : true,
    credentials: true
  });

  await server.register(helmet, {
    contentSecurityPolicy: false
  });

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  await server.register(swagger, {
    openapi: {
      info: {
        title: 'X-Corte API',
        description: 'API completa para sistema de gestão de barbearias com agendamentos, produtos e usuários',
        version: '1.0.0',
        contact: {
          name: 'Equipe X-Corte',
          email: 'contato@x-corte.com'
        }
      },
      servers: [
        {
          url: process.env.NODE_ENV === 'production' ? 'https://api.x-corte.com' : 'http://localhost:5000',
          description: process.env.NODE_ENV === 'production' ? 'Servidor de produção' : 'Servidor de desenvolvimento'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      tags: [
        { name: 'Authentication', description: 'Autenticação e autorização de usuários' },
        { name: 'Products', description: 'Gerenciamento de produtos e serviços' },
        { name: 'Bookings', description: 'Sistema de agendamentos' },
        { name: 'Availability', description: 'Consulta de disponibilidade' },
        { name: 'Enterprises', description: 'Gerenciamento de empresas/barbearias' },
        { name: 'Schedules', description: 'Horários de funcionamento' },
        { name: 'Health', description: 'Status e saúde da aplicação' }
      ]
    }
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      displayOperationId: false,
      showExtensions: false,
      showCommonExtensions: false,
      useUnsafeMarkdown: false
    },
    staticCSP: true,
    transformStaticCSP: (header: string) => header
  });
}

async function setupRoutes() {
  server.get('/health', {
    schema: {
      tags: ['Health'],
      description: 'Verificação de saúde da aplicação',
      summary: 'Health Check',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'OK' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', description: 'Tempo de atividade em segundos' },
            version: { type: 'string', example: '1.0.0' }
          }
        }
      }
    }
  }, async () => {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    };
  });

  await server.register(authRoutes, { prefix: '/api' });
  await server.register(productRoutes, { prefix: '/api' });
  await server.register(bookingRoutes, { prefix: '/api' });
  await server.register(availabilityRoutes, { prefix: '/api' });
  await server.register(enterpriseRoutes, { prefix: '/api' });
  await server.register(schedulesRoutes, { prefix: '/api' });
}

async function start() {
  try {
    await setupPlugins();
    await setupRoutes();

    const port = Number(process.env.PORT) || 5000;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    
    console.log(`🚀 Servidor rodando em http://${host}:${port}`);
    console.log(`📚 Documentação disponível em http://${host}:${port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('Recebido SIGINT, fechando servidor...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Recebido SIGTERM, fechando servidor...');
  await server.close();
  process.exit(0);
});

start();
