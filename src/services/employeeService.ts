import { db } from '../config/firebase.js';
import { Employee, EmployeeSkill } from '../types/index.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc, orderBy } from 'firebase/firestore';
import { createSuccessResponse, createErrorResponse, standardMessages, logError, logInfo } from '../utils/responseHelpers.js';

// Cache simples para melhorar performance
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

class EmployeeService {
  private collectionName = 'employees';

  // Método para verificar cache
  private getFromCache(key: string): any {
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
    cache.delete(key);
    return null;
  }

  // Método para salvar no cache
  private setCache(key: string, data: any): void {
    cache.set(key, { data, timestamp: Date.now() });
  }

  // Método para invalidar cache relacionado a funcionários
  private invalidateEmployeeCache(enterpriseEmail: string, employeeId?: string): void {
    // Invalidar cache geral da empresa
    cache.delete(`employees:${enterpriseEmail}`);
    
    // Invalidar todos os caches de skills da empresa
    for (const key of cache.keys()) {
      if (key.startsWith(`employees:skill:${enterpriseEmail}:`)) {
        cache.delete(key);
      }
    }
    
    // Se um funcionário específico foi modificado, invalidar seu cache individual
    if (employeeId) {
      cache.delete(`employee:${employeeId}`);
    }
  }

  async createEmployee(employee: Employee): Promise<{ success: boolean; data?: Employee; error?: string; message?: string }> {
    try {
      logInfo('createEmployee', `Tentando criar funcionário: ${employee.email}`, { enterpriseEmail: employee.enterpriseEmail });

      // Verificar se já existe funcionário com mesmo email na empresa
      const existingEmployee = await this.getEmployeeByEmail(employee.enterpriseEmail, employee.email);
      if (existingEmployee.success && existingEmployee.data) {
        logInfo('createEmployee', 'Funcionário já existe', { email: employee.email });
        return {
          success: false,
          message: standardMessages.employeeAlreadyExists,
          error: `Funcionário com email ${employee.email} já existe na empresa`
        };
      }

      const employeeData = {
        ...employee,
        skills: employee.skills || [],
        workSchedule: employee.workSchedule || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, this.collectionName), employeeData);
      const newEmployee = { ...employeeData, id: docRef.id };
      
      // Invalidar cache após criação
      this.invalidateEmployeeCache(employee.enterpriseEmail);
      
      logInfo('createEmployee', 'Funcionário criado com sucesso', { id: docRef.id });
      
      return {
        success: true,
        message: standardMessages.employeeCreated,
        data: newEmployee
      };
    } catch (error: any) {
      logError('createEmployee', error, { email: employee.email, enterpriseEmail: employee.enterpriseEmail });
      return {
        success: false,
        message: standardMessages.internalError,
        error: error.message
      };
    }
  }

  async getAllEmployees(enterpriseEmail: string): Promise<{ success: boolean; data?: Employee[]; error?: string; message?: string }> {
    try {
      logInfo('getAllEmployees', `Buscando funcionários para empresa: ${enterpriseEmail}`);

      if (!enterpriseEmail || enterpriseEmail.trim() === '') {
        return {
          success: false,
          message: 'Email da empresa é obrigatório',
          error: 'Email da empresa não fornecido'
        };
      }

      // Verificar cache primeiro
      const cacheKey = `employees:${enterpriseEmail}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logInfo('getAllEmployees', 'Dados recuperados do cache', { enterpriseEmail });
        return { 
          success: true, 
          message: standardMessages.employeesListed,
          data: cached 
        };
      }

      const q = query(
        collection(db, this.collectionName),
        where('enterpriseEmail', '==', enterpriseEmail),
        orderBy('name') // Ordenar por nome para melhor UX
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        logInfo('getAllEmployees', 'Nenhum funcionário encontrado', { enterpriseEmail });
        return {
          success: true,
          message: 'Nenhum funcionário cadastrado ainda',
          data: []
        };
      }

      const employees: Employee[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) {
          // Retornar apenas campos essenciais para listagem (otimização)
          employees.push({ 
            id: doc.id, 
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            position: data.position || '',
            isActive: data.isActive !== false,
            enterpriseEmail: data.enterpriseEmail,
            avatar: data.avatar || '',
            // Incluir skills para filtros, mas sem dados desnecessários
            skills: data.skills?.map((skill: any) => ({
              productId: skill.productId,
              productName: skill.productName,
              canPerform: skill.canPerform,
              experienceLevel: skill.experienceLevel
            })) || [],
            hireDate: data.hireDate?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Employee);
        }
      });

      if (employees.length === 0) {
        return {
          success: true,
          message: 'Nenhum funcionário válido encontrado',
          data: []
        };
      }

      // Salvar no cache
      this.setCache(cacheKey, employees);

      logInfo('getAllEmployees', `${employees.length} funcionários recuperados`, { enterpriseEmail });

      return {
        success: true,
        message: standardMessages.employeesListed,
        data: employees
      };
    } catch (error: any) {
      logError('getAllEmployees', error, { enterpriseEmail });
      return {
        success: false,
        message: standardMessages.internalError,
        error: error.message
      };
    }
  }

  async getEmployeeById(id: string): Promise<{ success: boolean; data?: Employee; error?: string; message?: string }> {
    try {
      logInfo('getEmployeeById', `Buscando funcionário por ID: ${id}`);

      if (!id || id.trim() === '') {
        return {
          success: false,
          message: 'ID do funcionário é obrigatório',
          error: 'ID do funcionário não fornecido'
        };
      }

      // Verificar cache primeiro
      const cacheKey = `employee:${id}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logInfo('getEmployeeById', 'Funcionário recuperado do cache', { id });
        return { 
          success: true,
          message: standardMessages.retrieved('Funcionário'),
          data: cached 
        };
      }

      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data) {
          return {
            success: false,
            message: 'Dados do funcionário corrompidos',
            error: 'Funcionário existe mas dados não puderam ser recuperados'
          };
        }

        const employee = { 
          id: docSnap.id, 
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          position: data.position || '',
          isActive: data.isActive !== false,
          enterpriseEmail: data.enterpriseEmail || '',
          avatar: data.avatar || '',
          skills: data.skills || [],
          workSchedule: data.workSchedule || {},
          hireDate: data.hireDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Employee;

        // Salvar no cache
        this.setCache(cacheKey, employee);

        logInfo('getEmployeeById', 'Funcionário recuperado com sucesso', { id });

        return {
          success: true,
          message: standardMessages.retrieved('Funcionário'),
          data: employee
        };
      } else {
        return {
          success: false,
          error: 'Funcionário não encontrado'
        };
      }
    } catch (error: any) {
      console.error('Erro ao buscar funcionário:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getEmployeeByEmail(enterpriseEmail: string, email: string): Promise<{ success: boolean; data?: Employee; error?: string }> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('enterpriseEmail', '==', enterpriseEmail),
        where('email', '==', email)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          success: true,
          data: { id: doc.id, ...doc.data() } as Employee
        };
      } else {
        return {
          success: false,
          error: 'Funcionário não encontrado'
        };
      }
    } catch (error: any) {
      console.error('Erro ao buscar funcionário por email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateEmployee(id: string, updateData: Partial<Employee>): Promise<{ success: boolean; data?: Employee; error?: string }> {
    try {
      // Buscar funcionário atual para obter enterpriseEmail
      const currentEmployee = await this.getEmployeeById(id);
      if (!currentEmployee.success || !currentEmployee.data) {
        return {
          success: false,
          error: 'Funcionário não encontrado'
        };
      }

      const docRef = doc(db, this.collectionName, id);
      
      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };

      await updateDoc(docRef, updatedData);
      
      // Invalidar cache após atualização
      this.invalidateEmployeeCache(currentEmployee.data.enterpriseEmail, id);
      
      // Buscar dados atualizados
      const result = await this.getEmployeeById(id);
      
      return result;
    } catch (error: any) {
      console.error('Erro ao atualizar funcionário:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteEmployee(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Buscar funcionário antes de deletar para invalidar cache
      const employee = await this.getEmployeeById(id);
      
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      
      // Invalidar cache após deleção se conseguimos obter os dados
      if (employee.success && employee.data) {
        this.invalidateEmployeeCache(employee.data.enterpriseEmail, id);
      }
      
      return {
        success: true,
        message: 'Funcionário deletado com sucesso'
      };
    } catch (error: any) {
      console.error('Erro ao deletar funcionário:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Gerenciar habilidades do funcionário
  async addSkillToEmployee(employeeId: string, skill: EmployeeSkill): Promise<{ success: boolean; data?: Employee; error?: string }> {
    try {
      const employeeResult = await this.getEmployeeById(employeeId);
      
      if (!employeeResult.success || !employeeResult.data) {
        return {
          success: false,
          error: 'Funcionário não encontrado'
        };
      }

      const employee = employeeResult.data;
      const existingSkillIndex = employee.skills?.findIndex(s => s.productId === skill.productId);

      if (existingSkillIndex !== -1 && existingSkillIndex !== undefined) {
        return {
          success: false,
          error: 'Funcionário já possui esta habilidade'
        };
      }

      const updatedSkills = [...(employee.skills || []), skill];
      
      const result = await this.updateEmployee(employeeId, { skills: updatedSkills });

      // Invalidar cache após adicionar habilidade
      if (result.success) {
        this.invalidateEmployeeCache(employee.enterpriseEmail, employeeId);
      }
      
      return result;
    } catch (error: any) {
      console.error('Erro ao adicionar habilidade:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async removeSkillFromEmployee(employeeId: string, productId: string): Promise<{ success: boolean; data?: Employee; error?: string }> {
    try {
      const employeeResult = await this.getEmployeeById(employeeId);
      
      if (!employeeResult.success || !employeeResult.data) {
        return {
          success: false,
          error: 'Funcionário não encontrado'
        };
      }

      const employee = employeeResult.data;
      const updatedSkills = employee.skills?.filter(s => s.productId !== productId) || [];
      
      const result = await this.updateEmployee(employeeId, { skills: updatedSkills });

      // Invalidar cache após remover habilidade
      if (result.success) {
        this.invalidateEmployeeCache(employee.enterpriseEmail, employeeId);
      }
      
      return result;
    } catch (error: any) {
      console.error('Erro ao remover habilidade:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Buscar funcionários que sabem fazer um serviço específico
  async getEmployeesBySkill(enterpriseEmail: string, productId: string): Promise<{ success: boolean; data?: Employee[]; error?: string }> {
    try {
      // Cache específico para combinação empresa + produto
      const cacheKey = `employees:skill:${enterpriseEmail}:${productId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const allEmployeesResult = await this.getAllEmployees(enterpriseEmail);
      
      if (!allEmployeesResult.success) {
        return allEmployeesResult;
      }

      const employeesWithSkill = allEmployeesResult.data?.filter(employee => 
        employee.isActive && 
        employee.skills?.some(skill => skill.productId === productId && skill.canPerform !== false)
      ) || [];

      // Retornar apenas dados essenciais para otimizar resposta
      const optimizedEmployees = employeesWithSkill.map(employee => ({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        position: employee.position,
        avatar: employee.avatar,
        enterpriseEmail: employee.enterpriseEmail,
        isActive: employee.isActive,
        // Incluir apenas a skill relevante
        skills: employee.skills?.filter(skill => skill.productId === productId) || []
      })) as Employee[];

      // Salvar no cache
      this.setCache(cacheKey, optimizedEmployees);

      return {
        success: true,
        data: optimizedEmployees
      };
    } catch (error: any) {
      console.error('Erro ao buscar funcionários por habilidade:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Calcular preço com base no funcionário
  async calculateServicePrice(employeeId: string, productId: string, basePrice: number): Promise<{ success: boolean; price?: number; duration?: number | undefined; error?: string }> {
    try {
      const employeeResult = await this.getEmployeeById(employeeId);
      
      if (!employeeResult.success || !employeeResult.data) {
        return {
          success: false,
          error: 'Funcionário não encontrado'
        };
      }

      const employee = employeeResult.data;
      const skill = employee.skills?.find(s => s.productId === productId);

      if (!skill) {
        return {
          success: false,
          error: 'Funcionário não possui esta habilidade'
        };
      }

      // Preço sempre o mesmo do produto (sem multiplicador)
      const finalPrice = basePrice;
      
      return {
        success: true,
        price: finalPrice,
        duration: undefined
      };
    } catch (error: any) {
      console.error('Erro ao calcular preço do serviço:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const employeeService = new EmployeeService();
