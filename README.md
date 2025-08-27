# X-Corte Backend

API REST para sistema de gestão de barbearias com multi-tenancy.

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

### Deploy Manual

```bash
# Build da imagem
docker build -t x-corte-backend .

# Executar container
docker run -d \
  --name x-corte-backend \
  -p 5000:5000 \
  --env-file .env \
  --restart unless-stopped \
  x-corte-backend
```

## 📋 Principais Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Fazer login
- `POST /api/auth/logout` - Fazer logout

### Produtos/Serviços
- `GET /api/products` - Listar produtos
- `POST /api/products` - Criar produto (admin)
- `PUT /api/products/:id` - Atualizar produto (admin)
- `DELETE /api/products/:id` - Deletar produto (admin)

### Agendamentos
- `GET /api/bookings` - Listar agendamentos
- `POST /api/bookings` - Criar agendamento
- `PUT /api/bookings/:id/confirm` - Confirmar agendamento

### Disponibilidade
- `GET /api/availability/slots` - Verificar horários disponíveis
- `POST /api/availability/check` - Verificar horário específico

### Empresas
- `GET /api/enterprises` - Listar empresas
- `GET /api/enterprises/:email` - Buscar empresa por email

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Server Configuration
NODE_ENV=production
HOST=0.0.0.0
PORT=5000
```

## 🔒 Segurança

- Autenticação via Firebase Auth
- Controle de acesso por roles (admin/client)
- Rate limiting configurado
- CORS configurado
- Helmet para headers de segurança

## 📊 Monitoramento

- Health check endpoint: `/health`
- Logs estruturados
- Docker health check configurado
