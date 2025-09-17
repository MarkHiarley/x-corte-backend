import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface SendCodeRequest {
  phoneNumber: string;
}

interface VerifyCodeRequest {
  phoneNumber: string;
  userCode: string;
}

interface SendMessageBody {
  number: string;
  text: string;
}

interface StoredCode {
  code: string;
  expires: Date;
  attempts: number;
}

export async function whatsAppVerification(fastify: FastifyInstance) {
  
  // Armazenamento em memória dos códigos (em produção use Redis ou banco)
  const verificationCodes = new Map<string, StoredCode>();

  // Função para gerar código de 6 dígitos
  function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Função para enviar mensagem via API
  async function sendMessage(number: string, text: string): Promise<any> {
    const url = 'http://92.113.34.172:8080/message/sendText/teste';
    
    const body: SendMessageBody = {
      number: number,
      text: text
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.EVOLUTION_API_KEY || '',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  // Schema para enviar código
  const sendCodeSchema = {
    body: {
      type: 'object',
      required: ['phoneNumber'],
      properties: {
        phoneNumber: { type: 'string' }
      }
    }
  };

  // Schema para verificar código
  const verifyCodeSchema = {
    body: {
      type: 'object',
      required: ['phoneNumber', 'userCode'],
      properties: {
        phoneNumber: { type: 'string' },
        userCode: { type: 'string' }
      }
    }
  };

  // Rota POST /sendCode - Gera, guarda e envia código
  fastify.post<{ Body: SendCodeRequest }>('/sendCode', 
    { schema: sendCodeSchema }, 
    async (request: FastifyRequest<{ Body: SendCodeRequest }>, reply: FastifyReply) => {
      try {
        const { phoneNumber } = request.body;

        // Validação básica do número de telefone
        if (!phoneNumber || phoneNumber.length < 10) {
          return reply.status(400).send({
            success: false,
            error: 'Número de telefone inválido',
            message: 'O número deve ter pelo menos 10 dígitos'
          });
        }

        // Verificar se já existe um código ativo (limite de tempo)
        const existingCode = verificationCodes.get(phoneNumber);
        if (existingCode && existingCode.expires > new Date()) {
          const timeLeft = Math.ceil((existingCode.expires.getTime() - Date.now()) / 1000);
          return reply.status(429).send({
            success: false,
            error: 'Código ainda válido',
            message: `Aguarde ${timeLeft} segundos antes de solicitar novo código`
          });
        }

        // Gerar código de 6 dígitos
        const verificationCode = generateCode();

        // Guardar código com expiração de 5 minutos e contador de tentativas
        verificationCodes.set(phoneNumber, {
          code: verificationCode,
          expires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
          attempts: 0
        });

        // Montar mensagem
        const message = `Seu código de verificação é: ${verificationCode}\n\nEste código expira em 5 minutos.\nNão compartilhe este código com ninguém.`;

        // Enviar mensagem via WhatsApp
        const result = await sendMessage(phoneNumber, message);

        // Resposta de sucesso (sem mostrar o código por segurança)
        return reply.status(200).send({
          success: true,
          message: 'Código de verificação enviado com sucesso',
          data: {
            phoneNumber: phoneNumber,
            expiresIn: 300, // 5 minutos em segundos
            apiResponse: result
          }
        });

      } catch (error) {
        console.error('Erro ao enviar código:', error);
        
        return reply.status(500).send({
          success: false,
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
  );

  // Rota POST /verifyCode - Verifica o código digitado pelo usuário
  fastify.post<{ Body: VerifyCodeRequest }>('/verifyCode', 
    { schema: verifyCodeSchema }, 
    async (request: FastifyRequest<{ Body: VerifyCodeRequest }>, reply: FastifyReply) => {
      try {
        const { phoneNumber, userCode } = request.body;

        // Validações básicas
        if (!phoneNumber || !userCode) {
          return reply.status(400).send({
            success: false,
            error: 'Dados obrigatórios',
            message: 'Número de telefone e código são obrigatórios'
          });
        }

        if (userCode.length !== 6 || !/^\d{6}$/.test(userCode)) {
          return reply.status(400).send({
            success: false,
            error: 'Código inválido',
            message: 'O código deve ter exatamente 6 dígitos numéricos'
          });
        }

        // Buscar código armazenado
        const storedCode = verificationCodes.get(phoneNumber);

        if (!storedCode) {
          return reply.status(404).send({
            success: false,
            error: 'Código não encontrado',
            message: 'Nenhum código foi enviado para este número ou já foi usado'
          });
        }

        // Verificar se o código expirou
        if (storedCode.expires < new Date()) {
          verificationCodes.delete(phoneNumber);
          return reply.status(410).send({
            success: false,
            error: 'Código expirado',
            message: 'O código expirou. Solicite um novo código'
          });
        }

        // Incrementar tentativas
        storedCode.attempts += 1;

        // Verificar limite de tentativas (máximo 3)
        if (storedCode.attempts > 3) {
          verificationCodes.delete(phoneNumber);
          return reply.status(429).send({
            success: false,
            error: 'Muitas tentativas',
            message: 'Limite de tentativas excedido. Solicite um novo código'
          });
        }

        // Verificar se o código está correto
        if (storedCode.code === userCode) {
          // Código correto - remover da memória
          verificationCodes.delete(phoneNumber);
          
          return reply.status(200).send({
            success: true,
            message: 'Código verificado com sucesso',
            data: {
              phoneNumber: phoneNumber,
              verified: true
            }
          });
        } else {
          // Código incorreto
          const attemptsLeft = 3 - storedCode.attempts;
          
          return reply.status(400).send({
            success: false,
            error: 'Código incorreto',
            message: `Código incorreto. Você tem mais ${attemptsLeft} tentativa(s)`,
            attemptsLeft: attemptsLeft
          });
        }

      } catch (error) {
        console.error('Erro ao verificar código:', error);
        
        return reply.status(500).send({
          success: false,
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
  );

  // Rota GET para verificar códigos ativos (apenas para debug - remover em produção)
  fastify.get('/debug/codes', async (request, reply) => {
    const activeCodes = Array.from(verificationCodes.entries()).map(([phone, data]) => ({
      phoneNumber: phone,
      expires: data.expires,
      attempts: data.attempts,
      isExpired: data.expires < new Date()
    }));

    return reply.status(200).send({
      activeCodes: activeCodes,
      total: activeCodes.length
    });
  });

  // Rota GET para testar se o serviço está funcionando
  fastify.get('/health', async (request, reply) => {
    return reply.status(200).send({
      status: 'OK',
      message: 'Serviço de WhatsApp Verification funcionando',
      timestamp: new Date().toISOString(),
      activeVerifications: verificationCodes.size
    });
  });

  // Limpeza automática de códigos expirados (executa a cada 10 minutos)
  setInterval(() => {
    const now = new Date();
    for (const [phone, data] of verificationCodes.entries()) {
      if (data.expires < now) {
        verificationCodes.delete(phone);
        console.log(`Código expirado removido para: ${phone}`);
      }
    }
  }, 10 * 60 * 1000); // 10 minutos
}