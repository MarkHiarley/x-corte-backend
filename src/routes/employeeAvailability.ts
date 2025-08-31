import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { employeeAvailabilityService } from '../services/employeeAvailabilityService.js';
import { employeeService } from '../services/employeeService.js';
import { authenticate } from '../middleware/auth.js';
import { responses } from '../schemas/index.js';

interface GetTimeSlotsQuery {
  employeeId: string;
  date: string; // YYYY-MM-DD
  duration?: number; // em minutos
}

interface GetAvailableEmployeesQuery {
  enterpriseEmail: string;
  productId: string;
  date: string;
  startTime: string;
  duration?: number;
}

interface CheckAvailabilityBody {
  employeeId: string;
  date: string;
  startTime: string;
  duration: number;
}

export async function employeeAvailabilityRoutes(fastify: FastifyInstance) {
  
  // Buscar horários disponíveis de um funcionário específico
  fastify.get<{
    Querystring: GetTimeSlotsQuery;
  }>('/employees/availability/slots', {
    preHandler: [authenticate],
    schema: {
      tags: ['Employee Availability'],
      summary: 'Horários disponíveis do funcionário',
      description: 'Retorna todos os horários disponíveis de um funcionário em uma data específica',
      querystring: {
        type: 'object',
        properties: {
          employeeId: { 
            type: 'string',
            description: 'ID do funcionário'
          },
          date: { 
            type: 'string',
            format: 'date',
            description: 'Data para consulta (YYYY-MM-DD)'
          },
          duration: { 
            type: 'number',
            minimum: 5,
            description: 'Duração do serviço em minutos (opcional, padrão: 30)'
          }
        },
        required: ['employeeId', 'date']
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: {
              type: 'object',
              properties: {
                employeeId: { type: 'string' },
                employeeName: { type: 'string' },
                date: { type: 'string', format: 'date' },
                isWorking: { type: 'boolean' },
                availableSlots: {
                  type: 'array',
                  items: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                  description: 'Array de horários disponíveis (HH:MM)'
                }
              }
            }
          }
        },
        400: responses[400],
        404: responses[404],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Querystring: GetTimeSlotsQuery }>, reply: FastifyReply) => {
    try {
      const { employeeId, date, duration = 30 } = request.query;
      
      // Buscar dados do funcionário
      const employeeResult = await employeeService.getEmployeeById(employeeId);
      if (!employeeResult.success || !employeeResult.data) {
        return reply.status(404).send({
          success: false,
          message: 'Funcionário não encontrado'
        });
      }

      const employee = employeeResult.data;

      // Buscar horários disponíveis
      const slotsResult = await employeeAvailabilityService.generateTimeSlots(
        employeeId,
        date,
        duration
      );

      if (slotsResult.success) {
        return reply.send({
          success: true,
          data: {
            employeeId: employeeId,
            employeeName: employee.name,
            date: date,
            isWorking: (slotsResult.data?.length || 0) > 0,
            availableSlots: slotsResult.data || []
          }
        });
      } else {
        return reply.status(500).send({
          success: false,
          message: slotsResult.error || 'Erro ao buscar horários'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao buscar horários do funcionário:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // Verificar se funcionário está disponível em horário específico
  fastify.post<{
    Body: CheckAvailabilityBody;
  }>('/employees/availability/check', {
    preHandler: [authenticate],
    schema: {
      tags: ['Employee Availability'],
      summary: 'Verificar disponibilidade específica',
      description: 'Verifica se um funcionário está disponível em data e horário específicos',
      body: {
        type: 'object',
        properties: {
          employeeId: { 
            type: 'string',
            description: 'ID do funcionário'
          },
          date: { 
            type: 'string',
            format: 'date',
            description: 'Data (YYYY-MM-DD)'
          },
          startTime: { 
            type: 'string',
            pattern: '^\\d{2}:\\d{2}$',
            description: 'Horário de início (HH:MM)'
          },
          duration: { 
            type: 'number',
            minimum: 5,
            description: 'Duração em minutos'
          }
        },
        required: ['employeeId', 'date', 'startTime', 'duration']
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: {
              type: 'object',
              properties: {
                employeeId: { type: 'string' },
                available: { type: 'boolean' },
                reason: { type: 'string' },
                suggestedTimes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Horários alternativos próximos (opcional)'
                }
              }
            }
          }
        },
        400: responses[400],
        404: responses[404],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Body: CheckAvailabilityBody }>, reply: FastifyReply) => {
    try {
      const { employeeId, date, startTime, duration } = request.body;

      const availabilityResult = await employeeAvailabilityService.isEmployeeAvailableAtTime(
        employeeId,
        date,
        startTime,
        duration
      );

      if (availabilityResult.success) {
        let suggestedTimes: string[] = [];

        // Se não disponível, buscar horários alternativos
        if (!availabilityResult.available) {
          const slotsResult = await employeeAvailabilityService.generateTimeSlots(
            employeeId,
            date,
            duration
          );
          
          if (slotsResult.success && slotsResult.data) {
            // Pegar até 3 horários próximos ao solicitado
            const requestedMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
            suggestedTimes = slotsResult.data
              .map(time => ({
                time,
                distance: Math.abs((parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1])) - requestedMinutes)
              }))
              .sort((a, b) => a.distance - b.distance)
              .slice(0, 3)
              .map(item => item.time);
          }
        }

        return reply.send({
          success: true,
          data: {
            employeeId: employeeId,
            available: availabilityResult.available || false,
            reason: availabilityResult.reason || 'Verificação concluída',
            suggestedTimes: suggestedTimes
          }
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: availabilityResult.error || 'Erro ao verificar disponibilidade'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao verificar disponibilidade:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // Buscar funcionários disponíveis para um serviço em horário específico
  fastify.get<{
    Querystring: GetAvailableEmployeesQuery;
  }>('/employees/availability/service', {
    preHandler: [authenticate],
    schema: {
      tags: ['Employee Availability'],
      summary: 'Funcionários disponíveis para serviço',
      description: 'Retorna lista de funcionários disponíveis para realizar um serviço específico em data/hora determinada',
      querystring: {
        type: 'object',
        properties: {
          enterpriseEmail: { 
            type: 'string',
            format: 'email',
            description: 'Email da empresa'
          },
          productId: { 
            type: 'string',
            description: 'ID do produto/serviço'
          },
          date: { 
            type: 'string',
            format: 'date',
            description: 'Data (YYYY-MM-DD)'
          },
          startTime: { 
            type: 'string',
            pattern: '^\\d{2}:\\d{2}$',
            description: 'Horário desejado (HH:MM)'
          },
          duration: { 
            type: 'number',
            minimum: 5,
            description: 'Duração em minutos (opcional)'
          }
        },
        required: ['enterpriseEmail', 'productId', 'date', 'startTime']
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                date: { type: 'string', format: 'date' },
                startTime: { type: 'string' },
                availableEmployees: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      position: { type: 'string' },
                      experienceLevel: { type: 'string' },
                      estimatedPrice: { type: 'number' },
                      estimatedDuration: { type: 'number' },
                      avatar: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        400: responses[400],
        404: responses[404],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Querystring: GetAvailableEmployeesQuery }>, reply: FastifyReply) => {
    try {
      const { enterpriseEmail, productId, date, startTime, duration } = request.query;

      const availableEmployeesResult = await employeeAvailabilityService.getAvailableEmployeesForService(
        enterpriseEmail,
        productId,
        date,
        startTime,
        duration
      );

      if (availableEmployeesResult.success) {
        const availableEmployees = availableEmployeesResult.data || [];

        // Enriquecer dados com informações de preço e duração
        const enrichedEmployees = availableEmployees.map(employee => {
          const skill = employee.skills?.find((s: any) => s.productId === productId);
          
          return {
            id: employee.id,
            name: employee.name,
            position: employee.position,
            experienceLevel: skill?.experienceLevel || 'intermediario',
            estimatedPrice: skill?.priceMultiplier ? 
              Math.round((skill.priceMultiplier * 50) * 100) / 100 : // Assumindo preço base de 50
              50,
            estimatedDuration: skill?.estimatedDuration || duration || 30,
            avatar: employee.avatar
          };
        });

        return reply.send({
          success: true,
          data: {
            productId,
            date,
            startTime,
            availableEmployees: enrichedEmployees
          }
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: availableEmployeesResult.error || 'Erro ao buscar funcionários disponíveis'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao buscar funcionários disponíveis:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // Buscar horários disponíveis de um funcionário específico para um serviço
  fastify.get('/employees/:employeeId/availability/service-slots', {
    preHandler: [authenticate],
    schema: {
      tags: ['Employee Availability'],
      summary: 'Horários disponíveis do funcionário para um serviço específico',
      description: 'Retorna horários disponíveis de um funcionário para um serviço em uma data, considerando durações personalizadas',
      params: {
        type: 'object',
        properties: {
          employeeId: { 
            type: 'string',
            description: 'ID do funcionário'
          }
        },
        required: ['employeeId']
      },
      querystring: {
        type: 'object',
        properties: {
          date: { 
            type: 'string',
            format: 'date',
            description: 'Data para consulta (YYYY-MM-DD)'
          },
          productId: { 
            type: 'string',
            description: 'ID do produto/serviço'
          },
          enterpriseEmail: { 
            type: 'string',
            format: 'email',
            description: 'Email da empresa'
          }
        },
        required: ['date', 'productId', 'enterpriseEmail']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                employeeId: { type: 'string' },
                employeeName: { type: 'string' },
                productId: { type: 'string' },
                date: { type: 'string' },
                price: { type: 'number' },
                duration: { type: 'number' },
                estimatedDuration: { type: 'number' },
                availableSlots: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        },
        400: responses[400],
        404: responses[404],
        500: responses[500]
      }
    }
  }, async (request, reply) => {
    try {
      const { employeeId } = request.params as { employeeId: string };
      const { date, productId, enterpriseEmail } = request.query as { 
        date: string; 
        productId: string;
        enterpriseEmail: string;
      };

      // Buscar dados do funcionário
      const employeeResult = await employeeService.getEmployeeById(employeeId);
      if (!employeeResult.success || !employeeResult.data) {
        return reply.status(404).send({
          success: false,
          message: 'Funcionário não encontrado'
        });
      }

      const employee = employeeResult.data;

      // Verificar se funcionário tem habilidade para o serviço
      const skill = employee.skills?.find(s => s.productId === productId);
      if (!skill) {
        return reply.status(400).send({
          success: false,
          message: 'Funcionário não possui habilidade para este serviço'
        });
      }

      // Buscar dados do produto para preço base
      const { productService } = await import('../services/productService.js');
      const productResult = await productService.getProductById(enterpriseEmail, productId);
      const basePrice = productResult.success && productResult.data ? productResult.data.price : 0;
      const baseDuration = productResult.success && productResult.data ? productResult.data.duration : 30;

      // Calcular valores (sem multiplicador de preço)
      const price = basePrice; // Preço sempre igual ao do produto
      const customDuration = skill.estimatedDuration || baseDuration;

      // Buscar horários disponíveis
      const slotsResult = await employeeAvailabilityService.generateTimeSlots(
        employeeId,
        date,
        customDuration
      );

      if (slotsResult.success) {
        return reply.send({
          success: true,
          data: {
            employeeId,
            employeeName: employee.name,
            productId,
            date,
            price: price,
            duration: baseDuration,
            estimatedDuration: skill.estimatedDuration || baseDuration,
            experienceLevel: skill.experienceLevel,
            availableSlots: slotsResult.data || []
          }
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: slotsResult.error || 'Erro ao buscar horários disponíveis'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao buscar horários do funcionário para serviço:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });
}
