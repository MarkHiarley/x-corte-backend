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
        description: 'API para sistema de gestão de barbearia',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Servidor de desenvolvimento'
        }
      ],
      tags: [
        { name: 'Products', description: 'Operações relacionadas a produtos/serviços' },
        { name: 'Bookings', description: 'Operações relacionadas a agendamentos' },
        { name: 'Availability', description: 'Operações relacionadas a disponibilidade' },
        { name: 'Enterprises', description: 'Operações relacionadas a empresas' },
        { name: 'Schedules', description: 'Operações relacionadas a horários de funcionamento' }
      ]
    }
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    }
  });
}

async function setupRoutes() {
  server.get('/health', {
    schema: {
      description: 'Health check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' }
          }
        }
      }
    }
  }, async () => {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
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
