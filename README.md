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

## 🔐 Autenticação

Todas as rotas são protegidas por JWT. Header necessário:
```
Authorization: Bearer <seu-token-jwt>
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
├── services/        # Lógica de negócio
├── types/           # Tipos TypeScript
└── utils/           # Utilitários
```

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
- Documentação Swagger
- Deploy automatizado

**🔥 Pronto para produção!**
