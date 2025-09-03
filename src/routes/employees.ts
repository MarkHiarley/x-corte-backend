import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { employeeService } from '../services/employeeService.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { Employee, EmployeeSkill } from '../types/index.js';
import { employeeSchema, responses, createEmployeeSchema } from '../schemas/index.js';

interface CreateEmployeeBody {
  enterpriseEmail: string;
  name: string;
  phone?: string;
  position: string;
  hireDate?: string;
  avatar?: string;
  skills?: EmployeeSkill[];
}

interface UpdateEmployeeBody extends Partial<CreateEmployeeBody> {}

interface AddSkillBody {
  productId: string;
  productName: string;
  experienceLevel: 'iniciante' | 'intermediario' | 'avancado' | 'especialista';
  canPerform?: boolean;
}

interface GetEmployeesQuery {
  enterpriseEmail: string;
  position?: string;
  isActive?: boolean;
  productId?: string;
}

export async function employeeRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: GetEmployeesQuery;
  }>('/employees', {
    preHandler: [authenticate],
    schema: {
      tags: ['Employees'],
      summary: 'Listar funcionários',
      description: `
        Retorna todos os funcionários de uma empresa com opções de filtro avançado.
        
        **Casos de uso:**
        - Listar todos os funcionários: apenas enterpriseEmail
        - Filtrar por cargo específico: enterpriseEmail + position
        - Buscar funcionários ativos: enterpriseEmail + isActive=true
        - Funcionários que fazem um serviço: enterpriseEmail + productId
        
        **Performance:** Esta rota usa cache interno para otimizar consultas repetidas.
      `,
      querystring: {
        type: 'object',
        properties: {
          enterpriseEmail: { 
            type: 'string',
            format: 'email',
            description: 'Email da empresa (obrigatório)'
          },
          position: {
            type: 'string',
            description: 'Filtrar por cargo específico (opcional)'
          },
          isActive: {
            type: 'boolean',
            description: 'Filtrar funcionários ativos/inativos (opcional)'
          },
          productId: {
            type: 'string',
            description: 'Buscar funcionários que sabem fazer este serviço (opcional)'
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
              items: employeeSchema,
              description: 'Lista de funcionários encontrados'
            }
          }
        },
        400: responses[400],
        401: {
          ...responses[401],
          description: 'Token de autenticação inválido ou ausente'
        },
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Querystring: GetEmployeesQuery }>, reply: FastifyReply) => {
    try {
      const { enterpriseEmail, position, isActive, productId } = request.query;
      
      if (!enterpriseEmail) {
        return reply.status(400).send({
          success: false,
          message: 'enterpriseEmail é obrigatório'
        });
      }

      let result;
      
      if (productId) {
        result = await employeeService.getEmployeesBySkill(enterpriseEmail, productId);
      } else {
        result = await employeeService.getAllEmployees(enterpriseEmail);
      }
      
      if (result.success) {
        let employees = result.data || [];
        
        if (position) {
          employees = employees.filter(emp => emp.position.toLowerCase().includes(position.toLowerCase()));
        }
        
        if (isActive !== undefined) {
          employees = employees.filter(emp => emp.isActive === isActive);
        }
        
        return reply.send({
          success: true,
          data: employees
        });
      } else {
        return reply.status(500).send({
          success: false,
          message: result.error || 'Erro ao buscar funcionários'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro na API de funcionários:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  fastify.get<{
    Params: { id: string };
  }>('/employees/:id', {
    preHandler: [authenticate],
    schema: {
      tags: ['Employees'],
      summary: 'Obter funcionário por ID',
      description: 'Retorna dados completos de um funcionário específico',
      params: {
        type: 'object',
        properties: {
          id: { 
            type: 'string',
            description: 'ID do funcionário'
          }
        },
        required: ['id']
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: employeeSchema
          }
        },
        404: responses[404],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      const result = await employeeService.getEmployeeById(id);
      
      if (result.success) {
        return reply.send({
          success: true,
          data: result.data
        });
      } else {
        return reply.status(404).send({
          success: false,
          message: result.error || 'Funcionário não encontrado'
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao buscar funcionário:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  fastify.post<{
    Body: CreateEmployeeBody;
  }>('/employees', {
    preHandler: [authenticate, requireAdmin],
    schema: {
      tags: ['Employees'],
      summary: 'Criar funcionário',
      description: `
        Cria um novo funcionário na empresa como um recurso interno.
        
        **👨‍💼 Apenas admins:** Requer token de administrador válido
        **🔒 Segurança:** Admin só pode criar funcionários na própria empresa
        **⚡ Novo fluxo:** Funcionário não faz login - é recurso interno gerenciado pelo admin
        **🎯 Próximo passo:** Use /employees/{id}/skills para atribuir serviços
        
        **📝 Campos obrigatórios:** name, position
        **📧 Sem email:** Funcionários não têm mais email/senha
      `,
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
            minLength: 2,
            maxLength: 100,
            description: 'Nome completo do funcionário'
          },
          email: { 
            type: 'string',
            format: 'email',
            description: 'Email pessoal do funcionário'
          },
          phone: { 
            type: 'string',
            description: 'Telefone de contato'
          },
          position: { 
            type: 'string',
            description: 'Cargo: Barbeiro, Cabeleireira, Manicure, etc'
          },
          hireDate: { 
            type: 'string',
            format: 'date',
            description: 'Data de contratação (YYYY-MM-DD)'
          },
          avatar: { 
            type: 'string',
            description: 'URL da foto do funcionário'
          },
          skills: {
            type: 'array',
            description: 'Habilidades iniciais do funcionário',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                productName: { type: 'string' },
                experienceLevel: { 
                  type: 'string',
                  enum: ['iniciante', 'intermediario', 'avancado', 'especialista']
                },
                priceMultiplier: { type: 'number', minimum: 0.5, maximum: 3 },
              },
              required: ['productId', 'productName', 'experienceLevel']
            }
          }
        },
        required: ['enterpriseEmail', 'name', 'email', 'position']
      },
      response: {
        201: {
          ...responses[201],
          properties: {
            ...responses[201].properties,
            data: employeeSchema
          }
        },
        400: responses[400],
        401: responses[401],
        403: responses[403],
        409: responses[409],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateEmployeeBody }>, reply: FastifyReply) => {
    try {
      const body = request.body;
      
      const employee: Employee = {
        ...body,
        isActive: true,
        skills: body.skills || []
      };

      const result = await employeeService.createEmployee(employee);
      
      if (result.success) {
        return reply.status(201).send({
          success: true,
          data: result.data,
          message: 'Funcionário criado com sucesso'
        });
      } else {
        const statusCode = result.error?.includes('já existe') ? 409 : 400;
        return reply.status(statusCode).send({
          success: false,
          message: result.error
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao criar funcionário:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  fastify.put<{
    Params: { id: string };
    Body: UpdateEmployeeBody;
  }>('/employees/:id', {
    preHandler: [authenticate, requireAdmin],
    schema: {
      tags: ['Employees'],
      summary: 'Atualizar funcionário',
      description: 'Atualiza dados de um funcionário existente. Apenas administradores.',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { 
            type: 'string',
            description: 'ID do funcionário'
          }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          position: { type: 'string' },
          hireDate: { type: 'string', format: 'date' },
          avatar: { type: 'string' },
          isActive: { type: 'boolean' }
        }
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: employeeSchema
          }
        },
        400: responses[400],
        401: responses[401],
        403: responses[403],
        404: responses[404],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateEmployeeBody }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const result = await employeeService.updateEmployee(id, updateData);
      
      if (result.success) {
        return reply.send({
          success: true,
          data: result.data,
          message: 'Funcionário atualizado com sucesso'
        });
      } else {
        const statusCode = result.error?.includes('não encontrado') ? 404 : 400;
        return reply.status(statusCode).send({
          success: false,
          message: result.error
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao atualizar funcionário:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  fastify.delete<{
    Params: { id: string };
  }>('/employees/:id', {
    preHandler: [authenticate, requireAdmin],
    schema: {
      tags: ['Employees'],
      summary: 'Deletar funcionário',
      description: 'Remove um funcionário do sistema. Apenas administradores.',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { 
            type: 'string',
            description: 'ID do funcionário'
          }
        },
        required: ['id']
      },
      response: {
        200: responses[200],
        401: responses[401],
        403: responses[403],
        404: responses[404],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const result = await employeeService.deleteEmployee(id);
      
      if (result.success) {
        return reply.send({
          success: true,
          message: result.message
        });
      } else {
        return reply.status(404).send({
          success: false,
          message: result.error
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao deletar funcionário:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  fastify.post<{
    Params: { id: string };
    Body: AddSkillBody;
  }>('/employees/:id/skills', {
    preHandler: [authenticate, requireAdmin],
    schema: {
      tags: ['Employees'],
      summary: 'Adicionar habilidade',
      description: 'Adiciona uma nova habilidade/especialidade ao funcionário. O funcionário poderá realizar este serviço com o preço e duração definidos pela empresa.',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { 
            type: 'string',
            description: 'ID do funcionário'
          }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          productId: { 
            type: 'string',
            description: 'ID do produto/serviço'
          },
          productName: { 
            type: 'string',
            description: 'Nome do produto/serviço'
          },
          experienceLevel: { 
            type: 'string',
            enum: ['iniciante', 'intermediario', 'avancado', 'especialista'],
            description: 'Nível de experiência do funcionário neste serviço'
          },
          canPerform: { 
            type: 'boolean',
            description: 'Se o funcionário pode realizar este serviço',
            default: true
          }
        },
        required: ['productId', 'productName', 'experienceLevel']
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: employeeSchema
          }
        },
        400: responses[400],
        401: responses[401],
        403: responses[403],
        404: responses[404],
        409: responses[409],
        422: responses[422],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: AddSkillBody }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const skill = request.body;

      const skillWithPerform = {
        ...skill,
        canPerform: skill.canPerform !== false
      };

      const result = await employeeService.addSkillToEmployee(id, skillWithPerform);
      
      if (result.success) {
        return reply.send({
          success: true,
          data: result.data,
          message: 'Habilidade adicionada com sucesso'
        });
      } else {
        const statusCode = result.error?.includes('não encontrado') ? 404 : 
                          result.error?.includes('já possui') ? 409 : 400;
        return reply.status(statusCode).send({
          success: false,
          message: result.error
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao adicionar habilidade:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  fastify.delete<{
    Params: { id: string; productId: string };
  }>('/employees/:id/skills/:productId', {
    preHandler: [authenticate, requireAdmin],
    schema: {
      tags: ['Employees'],
      summary: 'Remover habilidade',
      description: 'Remove uma habilidade/especialidade do funcionário',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { 
            type: 'string',
            description: 'ID do funcionário'
          },
          productId: { 
            type: 'string',
            description: 'ID do produto/serviço'
          }
        },
        required: ['id', 'productId']
      },
      response: {
        200: {
          ...responses[200],
          properties: {
            ...responses[200].properties,
            data: employeeSchema
          }
        },
        401: responses[401],
        403: responses[403],
        404: responses[404],
        500: responses[500],
        502: responses[502]
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string; productId: string } }>, reply: FastifyReply) => {
    try {
      const { id, productId } = request.params;

      const result = await employeeService.removeSkillFromEmployee(id, productId);
      
      if (result.success) {
        return reply.send({
          success: true,
          data: result.data,
          message: 'Habilidade removida com sucesso'
        });
      } else {
        return reply.status(404).send({
          success: false,
          message: result.error
        });
      }
    } catch (error: any) {
      fastify.log.error('Erro ao remover habilidade:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });
}
