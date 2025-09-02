// Utilitários para padronização de respostas da API

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ApiError {
  success: false;
  message: string;
  error: string;
}

export interface ApiSuccess<T = any> {
  success: true;
  message?: string;
  data?: T;
}

// Função para criar resposta de sucesso
export function createSuccessResponse<T>(data?: T, message?: string): ApiSuccess<T> {
  const response: ApiSuccess<T> = {
    success: true
  };
  
  if (data !== undefined) {
    response.data = data;
  }
  
  if (message) {
    response.message = message;
  }
  
  return response;
}

// Função para criar resposta de erro
export function createErrorResponse(message: string, error?: string): ApiError {
  return {
    success: false,
    message,
    error: error || message
  };
}

// Função para tratar erros de validação
export function createValidationErrorResponse(message: string, errors?: any[]): ApiError & { validationErrors?: any[] } {
  const response = createErrorResponse(message, 'Erro de validação');
  
  if (errors && errors.length > 0) {
    return {
      ...response,
      validationErrors: errors
    };
  }
  
  return response;
}

// Função para tratar erros de autenticação
export function createAuthErrorResponse(message: string = 'Token inválido ou expirado'): ApiError {
  return createErrorResponse(message, 'Erro de autenticação');
}

// Função para tratar erros de autorização  
export function createAuthorizationErrorResponse(message: string = 'Acesso negado'): ApiError {
  return createErrorResponse(message, 'Erro de autorização');
}

// Função para tratar erros de não encontrado
export function createNotFoundErrorResponse(resource: string = 'Recurso'): ApiError {
  return createErrorResponse(`${resource} não encontrado`, 'Recurso não encontrado');
}

// Função para tratar erros de conflito
export function createConflictErrorResponse(message: string): ApiError {
  return createErrorResponse(message, 'Conflito de dados');
}

// Função para tratar erros internos do servidor
export function createInternalErrorResponse(message: string = 'Erro interno do servidor'): ApiError {
  return createErrorResponse(message, 'Erro interno');
}

// Wrapper para capturar erros de forma consistente
export function wrapServiceCall<T>(
  serviceCall: () => Promise<T>,
  errorMessage: string = 'Erro ao processar solicitação'
): Promise<ApiResponse<T>> {
  return serviceCall()
    .then((result: T) => createSuccessResponse(result))
    .catch((error: any) => {
      console.error(`Service Error: ${errorMessage}`, error);
      return createInternalErrorResponse(
        error.message || errorMessage
      );
    });
}

// Função para validar parâmetros obrigatórios
export function validateRequiredFields(data: any, requiredFields: string[]): ApiError | null {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (!data[field] || data[field] === '') {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    return createValidationErrorResponse(
      `Campos obrigatórios em falta: ${missingFields.join(', ')}`,
      missingFields.map(field => ({ field, message: 'Campo obrigatório' }))
    );
  }
  
  return null;
}
