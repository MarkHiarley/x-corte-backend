# 💈 X-Corte Backend

Sistema completo de gestão para barbearias com multi-tenancy, funcionários e agendamentos.

## 🚀 Deploy Rápido

### Pré-requisitos
- Docker instalado
- Arquivo `.env` configurado com credenciais do Firebase

### Deploy com Docker

1. **Configure o ambiente:**
   ```bash
   cp .env.example .env
   # Edite o .env com suas credenciais do Firebase
   ```

2. **Execute o deploy:**
   ```bash
   ./deploy.sh
   ```

3. **Acesse a API:**
   - API: http://localhost:5000
   - Documentação: http://localhost:5000/docs
   - Health Check: http://localhost:5000/health

## 📋 Principais Funcionalidades

### 🏢 Multi-Tenancy
- Cada empresa tem seus dados isolados
- Funcionários específicos por empresa
- Agendamentos separados por empresa

### 👥 Gestão de Funcionários
- CRUD completo de funcionários
- Sistema de habilidades/especialidades
- Horários de trabalho personalizados
- Controle de status ativo/inativo

### 📅 Sistema de Agendamentos
- Agendamento com funcionário específico
- Verificação automática de disponibilidade
- Duração personalizada por serviço/funcionário
- Prevenção de conflitos de horário

### ⚡ Performance Otimizada
- Cache inteligente com TTL otimizado
- Consultas eficientes no Firestore
- Invalidação automática do cache
- Respostas mínimas e rápidas

### 🛡️ Tratamento de Erros Avançado
- Respostas padronizadas em formato único
- Validação robusta de entrada
- Logs estruturados para debugging
- Mensagens de erro localizadas em português
- Verificação de arrays vazios
- Tratamento específico para cada tipo de erro

## 🔐 Autenticação

Todas as rotas são protegidas por JWT. Header necessário:
```
Authorization: Bearer <seu-token-jwt>
```

## 📡 API Response Format

Todas as respostas seguem o formato padronizado:

```json
{
  "success": true|false,
  "message": "Descrição da operação",
  "data": "objeto com dados (apenas em sucesso)",
  "error": "detalhes do erro (apenas em falha)"
}
```

### Exemplos de Resposta

**Sucesso:**
```json
{
  "success": true,
  "message": "Funcionário criado com sucesso",
  "data": {
    "id": "func123",
    "name": "João Silva",
    "email": "joao@exemplo.com"
  }
}
```

**Erro:**
```json
{
  "success": false,
  "message": "Funcionário não encontrado",
  "error": "Funcionário com ID func123 não existe na empresa"
}
```

## 📡 Principais Endpoints

### 👥 Funcionários
```bash
# Listar funcionários da empresa
GET /api/employees?enterpriseEmail=empresa@exemplo.com

# Criar funcionário
POST /api/employees

# Adicionar habilidade ao funcionário
POST /api/employees/:id/skills

# Ver horários disponíveis
GET /api/employees/availability/slots?employeeId=123&date=2024-08-31
```

### 📅 Agendamentos
```bash
# Criar agendamento
POST /api/bookings

# Buscar funcionários disponíveis
GET /api/employees/availability/service?enterpriseEmail=empresa@exemplo.com&productId=corte&date=2024-08-31&startTime=14:00
```

### 🏢 Empresas
```bash
# Listar empresas
GET /api/enterprises

# Criar empresa
POST /api/enterprises
```

## 🛠️ Desenvolvimento

### Instalação Local
```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Iniciar em modo desenvolvimento
npm run dev
```

### Estrutura do Projeto
```
src/
├── config/          # Configurações (Firebase, etc)
├── middleware/      # Middlewares (auth, validação)
├── routes/          # Rotas da API
├── services/        # Lógica de negócio com tratamento de erro
├── types/           # Tipos TypeScript
├── utils/           # Utilitários e helpers de resposta
└── schemas/         # Schemas para documentação Swagger
```

## 🛡️ Sistema de Logs

### Logs Estruturados
```typescript
// Informações
logInfo('operacao', 'Descrição', { context });

// Erros
logError('operacao', error, { context });
```

### Benefícios:
- Debugging eficiente
- Rastreamento de operações
- Context específico para cada erro
- Logs padronizados em português

## 🗃️ Banco de Dados

### Firestore Collections:
- `enterprises` - Dados das empresas
- `employees` - Funcionários (segmentados por empresa)
- `bookings` - Agendamentos
- `schedules` - Horários de funcionamento
- `products` - Serviços oferecidos
- `users` - Usuários do sistema

## 🔧 Configuração

### Variáveis de Ambiente (.env)
```env
# Firebase
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_PRIVATE_KEY=sua-chave-privada
FIREBASE_CLIENT_EMAIL=seu-email-cliente

# Servidor
PORT=5000
NODE_ENV=production

# JWT
JWT_SECRET=seu-secret-jwt
```

## 📊 Cache e Performance

- **Cache de funcionários**: 5 minutos
- **Cache de disponibilidade**: 2 minutos  
- **Invalidação automática** em modificações
- **Consultas otimizadas** com filtros eficientes
- **Pré-processamento** de períodos ocupados

## 🎯 Status do Projeto

✅ **Sistema completo implementado:**
- Gestão de funcionários
- Sistema de disponibilidade  
- Agendamentos inteligentes
- Cache otimizado
- Autenticação robusta
- Tratamento de erros padronizado
- Logs estruturados
- Documentação Swagger
- Deploy automatizado

**🔥 Pronto para produção!**
