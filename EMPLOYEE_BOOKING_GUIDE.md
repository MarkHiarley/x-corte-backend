# Guia de Agendamento com Funcionários

Este guia explica como usar o sistema de agendamento com funcionários específicos implementado no backend.

## Funcionalidades Implementadas

### 1. Criação de Agendamento com Funcionário Específico

**Endpoint:** `POST /bookings`

Agora você pode especificar um funcionário específico ao criar um agendamento:

```json
{
  "enterpriseEmail": "empresa@exemplo.com",
  "clientName": "João Silva",
  "clientPhone": "11999999999",
  "clientEmail": "joao@exemplo.com",
  "productId": "servico123",
  "employeeId": "funcionario456", // NOVO: ID do funcionário (opcional)
  "date": "2025-09-01",
  "startTime": "14:00",
  "notes": "Cliente preferencial"
}
```

**Benefícios:**
- Se `employeeId` for especificado, o sistema valida se o funcionário pode realizar o serviço
- Calcula preço personalizado baseado no `priceMultiplier` do funcionário
- Usa duração personalizada (`estimatedDuration`) se configurada
- Verifica disponibilidade específica do funcionário
- Se `employeeId` não for informado, funciona como agendamento geral

### 2. Buscar Funcionários Disponíveis para um Serviço

**Endpoint:** `GET /bookings/available-employees`

Consulta quais funcionários estão disponíveis para um serviço específico:

```bash
GET /bookings/available-employees?enterpriseEmail=empresa@exemplo.com&productId=servico123&date=2025-09-01&startTime=14:00
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "funcionario456",
      "name": "Maria Santos",
      "email": "maria@empresa.com",
      "available": true,
      "customPrice": 75.00,        // Preço personalizado do funcionário
      "customDuration": 45,        // Duração personalizada em minutos
      "priceMultiplier": 1.5,      // Multiplicador de preço
      "estimatedDuration": 45,     // Duração estimada
      "basePrice": 50.00,          // Preço base do serviço
      "baseDuration": 30           // Duração base do serviço
    }
  ]
}
```

### 3. Consultar Horários Disponíveis de um Funcionário para um Serviço

**Endpoint:** `GET /employees/{employeeId}/availability/service-slots`

Busca horários específicos de um funcionário para um serviço:

```bash
GET /employees/funcionario456/availability/service-slots?date=2025-09-01&productId=servico123&enterpriseEmail=empresa@exemplo.com
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "employeeId": "funcionario456",
    "employeeName": "Maria Santos",
    "productId": "servico123",
    "date": "2025-09-01",
    "customPrice": 75.00,
    "customDuration": 45,
    "basePrice": 50.00,
    "baseDuration": 30,
    "priceMultiplier": 1.5,
    "availableSlots": [
      "09:00",
      "09:15",
      "09:30",
      "10:00",
      "14:00",
      "14:15",
      "15:30"
    ]
  }
}
```

## Fluxo Recomendado para Frontend

### Cenário 1: Agendamento com Escolha de Funcionário

1. **Cliente escolhe serviço e data/hora**
2. **Buscar funcionários disponíveis:**
   ```bash
   GET /bookings/available-employees?enterpriseEmail=...&productId=...&date=...&startTime=...
   ```
3. **Mostrar opções ao cliente:** Lista de funcionários com preços personalizados
4. **Cliente escolhe funcionário**
5. **Criar agendamento:**
   ```json
   POST /bookings
   {
     "enterpriseEmail": "...",
     "clientName": "...",
     "clientPhone": "...",
     "productId": "...",
     "employeeId": "funcionario_escolhido",
     "date": "...",
     "startTime": "..."
   }
   ```

### Cenário 2: Cliente Escolhe Funcionário Primeiro

1. **Cliente escolhe serviço e funcionário específico**
2. **Buscar horários disponíveis do funcionário:**
   ```bash
   GET /employees/{employeeId}/availability/service-slots?date=...&productId=...&enterpriseEmail=...
   ```
3. **Mostrar agenda disponível com preço personalizado**
4. **Cliente escolhe horário**
5. **Criar agendamento**

### Cenário 3: Agendamento sem Funcionário Específico

1. **Cliente escolhe serviço, data e hora**
2. **Criar agendamento sem `employeeId`:**
   ```json
   POST /bookings
   {
     "enterpriseEmail": "...",
     "productId": "...",
     "date": "...",
     "startTime": "..."
     // employeeId não informado
   }
   ```

## Campos Importantes no Agendamento

Quando um agendamento é criado com funcionário específico, os seguintes campos são automaticamente calculados:

- `employeeId`: ID do funcionário escolhido
- `employeeName`: Nome do funcionário
- `finalPrice`: Preço final (basePrice × priceMultiplier)
- `actualDuration`: Duração real do serviço para esse funcionário
- `productPrice`: Preço base do produto (não modificado)
- `productDuration`: Duração base do produto (não modificado)

## Validações Automáticas

O sistema valida automaticamente:

1. **Funcionário existe e está ativo**
2. **Funcionário tem habilidade para o serviço** (possui skill com o productId)
3. **Funcionário está disponível no horário** (considera horário de trabalho e agendamentos existentes)
4. **Horário não conflita com outros agendamentos**

## Exemplo Completo de Uso

```javascript
// 1. Buscar funcionários disponíveis
const response = await fetch('/bookings/available-employees?' + new URLSearchParams({
  enterpriseEmail: 'salao@exemplo.com',
  productId: 'corte-cabelo',
  date: '2025-09-01',
  startTime: '14:00'
}));

const { data: employees } = await response.json();

// 2. Exibir opções para o cliente
employees.forEach(emp => {
  console.log(`${emp.name} - R$ ${emp.customPrice} (${emp.customDuration} min)`);
});

// 3. Cliente escolhe funcionário
const selectedEmployee = employees[0];

// 4. Criar agendamento
const bookingResponse = await fetch('/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    enterpriseEmail: 'salao@exemplo.com',
    clientName: 'João Silva',
    clientPhone: '11999999999',
    productId: 'corte-cabelo',
    employeeId: selectedEmployee.id,
    date: '2025-09-01',
    startTime: '14:00'
  })
});

const booking = await bookingResponse.json();
console.log('Agendamento criado:', booking.data);
```

## Endpoints Relacionados

- `GET /employees` - Listar todos os funcionários da empresa
- `GET /employees/by-skill/{productId}` - Funcionários que sabem fazer um serviço
- `GET /employees/{id}/availability/slots` - Horários livres de um funcionário
- `POST /employees` - Cadastrar funcionário
- `PUT /employees/{id}/skills` - Gerenciar habilidades do funcionário

Este sistema permite máxima flexibilidade: o cliente pode escolher primeiro o funcionário ou primeiro o horário, e o sistema sempre validará disponibilidade e calculará preços personalizados.
