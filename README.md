# 💈 X-Corte Backend

Sistema completo de gestão para barbearias com multi-tenancy e agendamentos inteligentes.

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

### 🏢 Multi-Tenancy Seguro
- Isolamento completo de dados por empresa
- Funcionários como recursos internos da empresa
- Agendamentos separados por empresa
- Validação de acesso multi-tenant em todas as rotas

### 👥 Gestão Simplificada de Funcionários
- **Novo fluxo**: Funcionários são recursos internos, sem login próprio
- CRUD completo gerenciado apenas pelo admin da empresa
- Sistema de habilidades/especialidades por produto
- Horários de trabalho personalizados
- Controle de status ativo/inativo
- Cache otimizado (5 minutos TTL)

### 📅 Sistema de Agendamentos Completo
- Criação de agendamentos com ou sem funcionário específico
- Verificação automática de disponibilidade
- Confirmação de agendamentos
- **Cancelamento de agendamentos** (preserva histórico)
- Duração personalizada por serviço/funcionário
- Prevenção inteligente de conflitos de horário
- Listagem com filtros por data e status

### 🛍️ Gestão de Produtos/Serviços
- CRUD completo de produtos
- Rota pública para visualização de produtos ativos
- Preços e durações personalizáveis
- Categorização de serviços

### ⚡ Performance Otimizada
- Cache inteligente com TTL otimizado (funcionários: 5min, disponibilidade: 2min)
- Consultas eficientes no Firestore com filtros otimizados
- Invalidação automática do cache em modificações
- Respostas mínimas e rápidas
- Conversão automática de Timestamps do Firebase

### 🛡️ Tratamento de Erros Avançado
- Respostas padronizadas `{success, message, error}` em toda a API
- Validação robusta de entrada com Fastify schemas
- Logs estruturados para debugging eficiente
- Mensagens de erro localizadas em português
- Error handler global para captura de exceções
- Códigos de status HTTP apropriados

### 🔐 Autenticação Simplificada
- **Apenas Admin e Cliente**: Funcionários não fazem login
- JWT robusto com Firebase Authentication
- Middleware de autenticação multi-tenant
- Autorização baseada em roles (admin/client)

## 🔐 Sistema de Autenticação

### Fluxo de Autenticação
1. **Registro de Empresa**: Cria empresa + admin em uma operação
2. **Login de Admin**: Obtém token JWT para gerenciar a empresa
3. **Login de Cliente**: Para fazer agendamentos (opcional)
4. **Funcionários**: São recursos internos, sem autenticação própria

### Headers Necessários
```bash
# Para rotas autenticadas
Authorization: Bearer <seu-token-jwt>

# Para rotas públicas (não necessário)
# Exemplo: GET /api/products/{enterpriseEmail}
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

### � Autenticação
```bash
# Registrar empresa + admin
POST /api/auth/register-enterprise
{
  "email": "admin@empresa.com",
  "password": "senha123",
  "name": "Nome do Admin",
  "enterpriseName": "Minha Barbearia",
  "phone": "(11) 99999-9999",
  "address": "Rua Exemplo, 123"
}

# Login (admin ou cliente)
POST /api/auth/login
{
  "email": "admin@empresa.com",
  "password": "senha123"
}
```

### �👥 Funcionários (Apenas Admin)
```bash
# Listar funcionários da empresa
GET /api/employees?enterpriseEmail=empresa@exemplo.com
Authorization: Bearer <token-admin>

# Criar funcionário (sem email/senha)
POST /api/employees
Authorization: Bearer <token-admin>
{
  "name": "João Barbeiro",
  "phone": "(11) 88888-8888",
  "position": "Barbeiro Senior",
  "isActive": true
}

# Adicionar habilidade ao funcionário
POST /api/employees/:id/skills
Authorization: Bearer <token-admin>
{
  "productId": "corte-masculino",
  "canPerform": true,
  "experienceLevel": "senior"
}

# Atualizar funcionário
PUT /api/employees/:id
Authorization: Bearer <token-admin>

# Remover funcionário (soft delete)
DELETE /api/employees/:id
Authorization: Bearer <token-admin>
```

### 📅 Agendamentos
```bash
# Criar agendamento (público - não requer autenticação)
POST /api/bookings
{
  "enterpriseEmail": "empresa@exemplo.com",
  "clientName": "Cliente Teste",
  "clientPhone": "(11) 99999-8888",
  "clientEmail": "cliente@email.com",
  "productId": "corte-masculino",
  "employeeId": "func123", // Opcional
  "date": "2025-09-04",
  "startTime": "14:00",
  "notes": "Observações opcionais"
}

# Listar agendamentos da empresa
GET /api/bookings?enterpriseEmail=empresa@exemplo.com&date=2025-09-04&status=pending

# Confirmar agendamento
PUT /api/bookings/:id/confirm?enterpriseEmail=empresa@exemplo.com

# Cancelar agendamento (preserva histórico)
PUT /api/bookings/:id/cancel?enterpriseEmail=empresa@exemplo.com

# Buscar funcionários disponíveis para um serviço
GET /api/bookings/available-employees?enterpriseEmail=empresa@exemplo.com&productId=corte&date=2025-09-04&startTime=14:00
```

### 🛍️ Produtos/Serviços
```bash
# Listar produtos (público - qualquer empresa)
GET /api/products/:enterpriseEmail

# Criar produto (apenas admin)
POST /api/products
Authorization: Bearer <token-admin>
{
  "name": "Corte Masculino",
  "description": "Corte tradicional masculino",
  "price": 25.00,
  "duration": 30,
  "category": "cortes",
  "active": true
}

# Atualizar produto
PUT /api/products/:id
Authorization: Bearer <token-admin>

# Remover produto
DELETE /api/products/:id
Authorization: Bearer <token-admin>
```

## 🛠️ Desenvolvimento

### Instalação Local
```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Firebase

# Iniciar em modo desenvolvimento
npm run dev
```

### Estrutura do Projeto
```
src/
├── config/          # Configurações (Firebase)
├── middleware/      # Middlewares (auth multi-tenant)
├── routes/          # Rotas da API organizadas por domínio
│   ├── auth.ts      # Autenticação (registro empresa, login)
│   ├── employees.ts # Funcionários (CRUD, skills)
│   ├── products.ts  # Produtos/serviços
│   └── bookings.ts  # Agendamentos (criar, confirmar, cancelar)
├── services/        # Lógica de negócio com cache otimizado
├── types/           # Tipos TypeScript atualizados
├── utils/           # Utilitários e helpers de resposta
└── schemas/         # Schemas Swagger para documentação
```

## 🎯 Fluxo Simplificado do Sistema

### 1. **Admin da Empresa**
```bash
# 1. Registra empresa + admin
POST /api/auth/register-enterprise

# 2. Faz login
POST /api/auth/login

# 3. Cria produtos/serviços
POST /api/products

# 4. Adiciona funcionários (sem email/senha)
POST /api/employees

# 5. Define habilidades dos funcionários
POST /api/employees/:id/skills

# 6. Gerencia agendamentos
GET /api/bookings?enterpriseEmail=...
PUT /api/bookings/:id/confirm
PUT /api/bookings/:id/cancel
```

### 2. **Cliente Final** 
```bash
# 1. Vê produtos disponíveis (público)
GET /api/products/:enterpriseEmail

# 2. Verifica funcionários disponíveis (público)
GET /api/bookings/available-employees?...

# 3. Cria agendamento (público)
POST /api/bookings

# 4. Opcionalmente faz login para histórico
POST /api/auth/login
```

### 3. **Funcionário**
- **Não tem login próprio**
- É gerenciado como recurso interno da empresa
- Admin define horários, habilidades e disponibilidade
- Aparece na listagem de funcionários disponíveis para clientes

## �️ Banco de Dados (Firestore)

### Collections Structure:
```
enterprises/{enterpriseEmail}/
├── profile              # Dados da empresa
├── products/           # Produtos/serviços da empresa  
├── employees/          # Funcionários (sem email/senha)
├── bookings/          # Agendamentos da empresa
└── schedules/         # Horários de funcionamento

users/                 # Usuários autenticados (admins + clientes)
```

### Principais Models:

**Employee** (Simplificado):
```typescript
{
  id: string;
  enterpriseEmail: string;
  name: string;
  phone?: string;
  position: string;        // "Barbeiro", "Cabeleireira", etc
  isActive: boolean;
  skills: EmployeeSkill[]; // Habilidades por produto
  workSchedule?: EmployeeWorkSchedule;
}
```

**Booking** (Completo):
```typescript
{
  enterpriseEmail: string;
  clientName: string;
  clientPhone: string;
  productId: string;
  employeeId?: string;     // Opcional
  date: string;           // YYYY-MM-DD
  startTime: string;      // HH:MM
  endTime: string;        // Calculado automaticamente
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
}
```

## 🔧 Configuração

### Variáveis de Ambiente (.env)
```env
# Firebase
FIREBASE_PROJECT_ID=seu-projeto-firebase
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@projeto.iam.gserviceaccount.com

# Servidor
PORT=5000
NODE_ENV=production

# JWT (Firebase gerencia automaticamente)
# Não necessário configurar JWT_SECRET
```

## 📊 Cache e Performance

### Estratégia de Cache:
- **Funcionários**: 5 minutos TTL
- **Disponibilidade**: 2 minutos TTL  
- **Invalidação automática** em modificações (CREATE/UPDATE/DELETE)
- **Consultas otimizadas** com filtros do Firestore
- **Conversão de Timestamps** do Firebase para ISO strings

### Performance Optimizations:
- Pré-processamento de períodos ocupados
- Cache de consultas de disponibilidade
- Filtros eficientes no banco de dados
- Responses minimalistas com dados essenciais

## 🎯 Status Atual do Projeto

### ✅ **Implementado e Testado:**
- ✅ Sistema multi-tenant seguro
- ✅ Registro de empresa + admin unificado  
- ✅ Gestão completa de funcionários (CRUD, skills)
- ✅ Sistema de produtos/serviços
- ✅ Agendamentos inteligentes com verificação de disponibilidade
- ✅ **Cancelamento de agendamentos** (preserva histórico)
- ✅ Cache otimizado com TTL inteligente
- ✅ Autenticação robusta (apenas admin/cliente)
- ✅ Tratamento de erros padronizado `{success, message, error}`
- ✅ Logs estruturados para debugging
- ✅ Documentação Swagger completa
- ✅ Deploy automatizado com Docker
- ✅ Validação de schemas Fastify
- ✅ Error handler global
- ✅ Conversão automática de Timestamps Firebase

### 🔥 **Pronto para Produção!**

**Fluxo Final:**
1. **Admin registra empresa** → Cria produtos → Adiciona funcionários → Define habilidades
2. **Cliente vê produtos** → Escolhe funcionário disponível → Cria agendamento  
3. **Admin gerencia** → Confirma agendamentos → Cancela se necessário → Histórico preservado

Sistema **100% funcional** com foco na simplicidade para o admin e flexibilidade para o cliente! 🎉
