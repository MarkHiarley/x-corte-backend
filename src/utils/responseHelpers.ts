// Utilitários para padronização de respostas da API

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Função para criar resposta de sucesso padronizada
export function createSuccessResponse<T>(
  message: string,
  data?: T
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success: true,
    message
  };
  
  if (data !== undefined) {
    response.data = data;
  }
  
  return response;
}

// Função para criar resposta de erro padronizada
export function createErrorResponse(
  message: string,
  error?: string
): ApiResponse {
  const response: ApiResponse = {
    success: false,
    message
  };
  
  if (error) {
    response.error = error;
  }
  
  return response;
}

// Função para criar resposta de validação com erros específicos
export function createValidationErrorResponse(
  message: string,
  validationErrors?: Array<{ field: string; message: string }>
): ApiResponse & { validationErrors?: Array<{ field: string; message: string }> } {
  return {
    success: false,
    message,
    error: 'Erro de validação dos dados',
    validationErrors
  };
}

// Mensagens padrão para diferentes tipos de operações
export const standardMessages = {
  // Operações CRUD
  created: (resource: string) => `${resource} criado com sucesso`,
  updated: (resource: string) => `${resource} atualizado com sucesso`,
  deleted: (resource: string) => `${resource} deletado com sucesso`,
  retrieved: (resource: string) => `${resource} recuperado com sucesso`,
  listed: (resource: string) => `Lista de ${resource} recuperada com sucesso`,
  
  // Erros comuns
  notFound: (resource: string) => `${resource} não encontrado`,
  alreadyExists: (resource: string) => `${resource} já existe`,
  invalidData: 'Dados inválidos fornecidos',
  unauthorized: 'Acesso não autorizado',
  forbidden: 'Acesso proibido',
  internalError: 'Erro interno do servidor',
  validationError: 'Dados não puderam ser processados',
  
  // Funcionários específicas
  employeeCreated: 'Funcionário criado com sucesso',
  employeeUpdated: 'Funcionário atualizado com sucesso',
  employeeDeleted: 'Funcionário removido com sucesso',
  employeeNotFound: 'Funcionário não encontrado',
  employeeAlreadyExists: 'Já existe um funcionário com este email nesta empresa',
  employeesListed: 'Lista de funcionários recuperada com sucesso',
  
  // Skills específicas
  skillAdded: 'Habilidade adicionada com sucesso',
  skillRemoved: 'Habilidade removida com sucesso',
  skillAlreadyExists: 'Funcionário já possui esta habilidade',
  skillNotFound: 'Habilidade não encontrada',
  
  // Disponibilidade específicas
  availabilityChecked: 'Disponibilidade verificada com sucesso',
  slotsGenerated: 'Horários disponíveis gerados com sucesso',
  employeesFound: 'Funcionários disponíveis encontrados',
  noAvailableEmployees: 'Nenhum funcionário disponível para o horário solicitado',
  
  // Agendamentos específicas
  bookingCreated: 'Agendamento criado com sucesso',
  bookingUpdated: 'Agendamento atualizado com sucesso',
  bookingCancelled: 'Agendamento cancelado com sucesso',
  bookingNotFound: 'Agendamento não encontrado',
  timeSlotUnavailable: 'Horário não disponível',
  conflictingBooking: 'Já existe um agendamento para este horário',
  
  // Autenticação específicas
  loginSuccess: 'Login realizado com sucesso',
  logoutSuccess: 'Logout realizado com sucesso',
  tokenInvalid: 'Token inválido',
  tokenExpired: 'Token expirado',
  insufficientPermissions: 'Permissões insuficientes para esta operação'
};

// Helper para logs padronizados
export function logError(operation: string, error: any, context?: any) {
  console.error(`[ERROR] ${operation}:`, {
    error: error.message || error,
    stack: error.stack,
    context
  });
}

export function logInfo(operation: string, message: string, data?: any) {
  console.log(`[INFO] ${operation}: ${message}`, data ? { data } : '');
}

// Wrapper para try-catch padronizado em services
export async function handleServiceOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: any
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation();
    logInfo(operationName, 'Operação bem-sucedida', context);
    return { success: true, data };
  } catch (error: any) {
    logError(operationName, error, context);
    return { 
      success: false, 
      error: error.message || 'Erro inesperado na operação'
    };
  }
}
