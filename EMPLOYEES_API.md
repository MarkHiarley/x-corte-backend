# 📋 Sistema de Funcionários - API Documentation

## 🎯 Visão Geral

Sistema completo para gestão de funcionários em empresas de serviços, integrando especialidades (skills), horários de trabalho e sistema de agendamentos. Projetado para alta performance com cache inteligente e autenticação robusta.

## 🚀 Funcionalidades Principais

### 👥 Gestão de Funcionários
- ✅ CRUD completo de funcionários
- ✅ Gestão de habilidades/especialidades
- ✅ Controle de status ativo/inativo
- ✅ Filtros avançados por cargo e serviços

### 🕒 Sistema de Disponibilidade
- ✅ Consulta de horários disponíveis por funcionário
- ✅ Busca de funcionários disponíveis para serviços específicos
- ✅ Verificação de disponibilidade em tempo real
- ✅ Consideração de horários de trabalho e pausas

### 📅 Integração com Agendamentos
- ✅ Agendamento com funcionário específico
- ✅ Duração personalizada por funcionário/serviço
- ✅ Validação automática de disponibilidade
- ✅ Prevenção de conflitos de horário

## 🛡️ Segurança e Performance

### 🔐 Autenticação
- ✅ Todas as rotas protegidas por autenticação JWT
- ✅ Controle de acesso granular (admin/usuário)
- ✅ Validação de tokens em tempo real

### ⚡ Otimizações de Performance
- ✅ **Cache inteligente** com TTL otimizado
  - Cache de funcionários: 5 minutos
  - Cache de disponibilidade: 2 minutos
  - Cache por empresa + produto
- ✅ **Invalidação automática** do cache
- ✅ **Consultas otimizadas** no Firestore
- ✅ **Resposta mínima** - apenas dados necessários
- ✅ **Pré-processamento** de períodos ocupados

## 📡 Endpoints da API

### 🏢 Funcionários (`/employees`)

#### `GET /employees`
**Listar funcionários com filtros avançados**

```bash
# Listar todos os funcionários
GET /employees?enterpriseEmail=empresa@exemplo.com

# Filtrar por cargo
GET /employees?enterpriseEmail=empresa@exemplo.com&position=Barbeiro

# Filtrar funcionários ativos
GET /employees?enterpriseEmail=empresa@exemplo.com&isActive=true

# Buscar por habilidade específica
GET /employees?enterpriseEmail=empresa@exemplo.com&productId=prod_corte_tradicional
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "emp_123",
      "name": "João Silva",
      "email": "joao@empresa.com",
      "phone": "11999999999",
      "position": "Barbeiro",
      "isActive": true,
      "enterpriseEmail": "empresa@exemplo.com",
      "skills": [
        {
          "productId": "prod_corte",
          "productName": "Corte Tradicional",
          "experienceLevel": "avancado",
          "estimatedDuration": 30,
          "canPerform": true
        }
      ]
    }
  ]
}
```

#### `GET /employees/:id`
**Obter funcionário específico**

```bash
GET /employees/emp_123
```

#### `POST /employees`
**Criar novo funcionário**

```bash
POST /employees
Content-Type: application/json

{
  "enterpriseEmail": "empresa@exemplo.com",
  "name": "João Silva",
  "email": "joao@empresa.com",
  "phone": "11999999999",
  "position": "Barbeiro",
  "hireDate": "2024-01-15",
  "workSchedule": {
    "monday": {
      "isWorking": true,
      "startTime": "08:00",
      "endTime": "18:00",
      "breakStart": "12:00",
      "breakEnd": "13:00"
    }
  }
}
```

#### `PUT /employees/:id`
**Atualizar funcionário**

#### `DELETE /employees/:id`
**Remover funcionário**

### 🎯 Habilidades dos Funcionários

#### `POST /employees/:id/skills`
**Adicionar habilidade**

```bash
POST /employees/emp_123/skills
Content-Type: application/json

{
  "productId": "prod_corte_tradicional",
  "productName": "Corte Tradicional",
  "experienceLevel": "avancado",
  "estimatedDuration": 30,
  "canPerform": true
}
```

#### `DELETE /employees/:id/skills/:productId`
**Remover habilidade**

### 🕒 Disponibilidade (`/employees/availability`)

#### `GET /employees/availability/slots`
**Horários disponíveis do funcionário**

```bash
GET /employees/availability/slots?employeeId=emp_123&date=2024-08-31&duration=30
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "employeeId": "emp_123",
    "employeeName": "João Silva",
    "date": "2024-08-31",
    "isWorking": true,
    "availableSlots": [
      "08:00", "08:15", "08:30", "08:45",
      "09:00", "09:15", "09:30", "09:45"
    ]
  }
}
```

#### `POST /employees/availability/check`
**Verificar disponibilidade específica**

```bash
POST /employees/availability/check
Content-Type: application/json

{
  "employeeId": "emp_123",
  "date": "2024-08-31",
  "startTime": "09:00",
  "duration": 30
}
```

#### `GET /employees/availability/service`
**Funcionários disponíveis para serviço**

```bash
GET /employees/availability/service?enterpriseEmail=empresa@exemplo.com&productId=prod_corte&date=2024-08-31&startTime=09:00&duration=30
```

#### `GET /employees/:employeeId/availability/service-slots`
**Horários específicos por funcionário e serviço**

## 🔧 Configuração e Deploy

### 📋 Pré-requisitos
- Node.js 18+
- Firebase/Firestore configurado
- Variáveis de ambiente configuradas

### 🚀 Instalação

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Iniciar servidor
npm run dev
```

### 🐳 Deploy com Docker

```bash
# Build da imagem
docker build -t x-corte-backend .

# Executar container
docker run -p 3000:3000 x-corte-backend
```

## 📊 Estrutura do Banco de Dados

### 👤 Collection: `employees`
```json
{
  "id": "emp_123",
  "enterpriseEmail": "empresa@exemplo.com",
  "name": "João Silva",
  "email": "joao@empresa.com",
  "phone": "11999999999",
  "position": "Barbeiro",
  "isActive": true,
  "hireDate": "2024-01-15T00:00:00Z",
  "avatar": "https://...",
  "workSchedule": {
    "monday": {
      "isWorking": true,
      "startTime": "08:00",
      "endTime": "18:00",
      "breakStart": "12:00",
      "breakEnd": "13:00"
    }
  },
  "skills": [
    {
      "productId": "prod_corte_tradicional",
      "productName": "Corte Tradicional",
      "experienceLevel": "avancado",
      "estimatedDuration": 30,
      "canPerform": true
    }
  ],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

## 🎨 Exemplos de Uso

### 🔍 Cenário 1: Buscar funcionários para um corte às 14h
```bash
GET /employees/availability/service?enterpriseEmail=salao@exemplo.com&productId=corte_tradicional&date=2024-08-31&startTime=14:00&duration=30
```

### 📅 Cenário 2: Ver agenda completa de um funcionário
```bash
GET /employees/availability/slots?employeeId=emp_123&date=2024-08-31&duration=30
```

### ✅ Cenário 3: Verificar se horário específico está livre
```bash
POST /employees/availability/check
{
  "employeeId": "emp_123",
  "date": "2024-08-31",
  "startTime": "15:30",
  "duration": 45
}
```

## 🚨 Códigos de Erro

| Código | Descrição | Solução |
|--------|-----------|---------|
| 400 | Dados inválidos | Verificar parâmetros obrigatórios |
| 401 | Não autorizado | Incluir token de autenticação válido |
| 403 | Acesso negado | Verificar permissões do usuário |
| 404 | Recurso não encontrado | Confirmar IDs corretos |
| 409 | Conflito | Funcionário/email já existe |
| 500 | Erro interno | Verificar logs do servidor |

## 🔄 Cache e Performance

### ⚡ Estratégia de Cache
```typescript
// Cache de funcionários por empresa
cache.set(`employees:${enterpriseEmail}`, data, 5min)

// Cache de habilidades específicas  
cache.set(`employees:skill:${enterpriseEmail}:${productId}`, data, 5min)

// Cache de disponibilidade
cache.set(`slots:${employeeId}:${date}:${duration}`, data, 2min)
```

### 🔄 Invalidação Automática
- ✅ Invalidação ao criar/editar/deletar funcionário
- ✅ Invalidação ao adicionar/remover habilidades
- ✅ Cache por empresa para evitar vazamentos
- ✅ TTL diferenciado por tipo de dado

## 📈 Monitoramento e Logs

### 📊 Métricas Importantes
- ✅ Taxa de cache hit/miss
- ✅ Tempo de resposta das consultas
- ✅ Número de funcionários ativos por empresa
- ✅ Consultas de disponibilidade por minuto

### 🔍 Logs Estruturados
```json
{
  "level": "info",
  "message": "Employee created",
  "employeeId": "emp_123",
  "enterpriseEmail": "empresa@exemplo.com",
  "timestamp": "2024-08-31T10:00:00Z"
}
```

## 🛠️ Desenvolvimento

### 🧪 Testes
```bash
# Executar testes
npm test

# Testes de integração
npm run test:integration

# Coverage
npm run test:coverage
```

### 📝 Convenções de Código
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier
- ✅ Commits semânticos
- ✅ Documentação inline

---

**🎯 Sistema otimizado para alta performance e escalabilidade**
**⚡ Cache inteligente - Consultas 5x mais rápidas**
**🔒 Segurança robusta - Todas as rotas protegidas**
**📖 Documentação completa - Fácil integração**
