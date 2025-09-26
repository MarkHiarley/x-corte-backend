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
import { employeeRoutes } from './routes/employees.js';
import { employeeAvailabilityRoutes } from './routes/employeeAvailability.js';
import { whatsAppVerification } from './routes/whatsapp.js';

dotenv.config();

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }
});

server.setErrorHandler((error, request, reply) => {
  server.log.error({ 
    error: error.message, 
    stack: error.stack,
    url: request.url,
    method: request.method 
  }, 'Error handler acionado');

  // Determinar status code baseado no tipo de erro
  let statusCode = 500;
  let message = 'Erro interno do servidor';
  let errorType = 'Erro interno';

  if (error.statusCode) {
    statusCode = error.statusCode;
  }

  // Tratar diferentes tipos de erro
  if (error.code === 'FST_ERR_VALIDATION') {
    statusCode = 400;
    message = 'Dados de entrada inválidos';
    errorType = 'Erro de validação';
    
    // Extrair detalhes da validação
    if (error.validation && error.validation.length > 0) {
      const validationDetails = error.validation.map(v => `${v.instancePath || v.params?.missingProperty || 'campo'}: ${v.message}`).join(', ');
      message = `Erro de validação: ${validationDetails}`;
    }
  } else if (error.code === 'FST_ERR_NOT_FOUND') {
    statusCode = 404;
    message = 'Rota não encontrada';
    errorType = 'Rota não encontrada';
  } else if (error.message) {
    message = error.message;
  }

  // Resposta padronizada
  const response = {
    success: false,
    message,
    error: errorType
  };

  reply.status(statusCode).send(response);
});

async function setupPlugins() {
  // await server.register(cors, {
  //   origin: process.env.NODE_ENV === 'production' 
  //     ? [/\.?codxis\.com\.br$/] 
  //     : true,
  //   credentials: true
  // });
  await server.register(cors, {
    origin: true,
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
      defaultModelExpandDepth: 1
    },
    staticCSP: false
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
  await server.register(employeeRoutes, { prefix: '/api' });
  await server.register(employeeAvailabilityRoutes, { prefix: '/api' });
  await server.register(whatsAppVerification, { prefix: '/api' });
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
