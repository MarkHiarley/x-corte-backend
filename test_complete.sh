#!/bin/bash

echo "🧪 TESTANDO SISTEMA DE FUNCIONÁRIOS"
echo "===================================="
echo ""

echo "1️⃣ Testando se o servidor está funcionando..."
curl -s http://localhost:5000/api/health | jq '.' || echo "❌ Servidor não responde"
echo ""

echo "2️⃣ Criando uma empresa de teste..."
curl -X POST "http://localhost:5000/api/enterprises" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@empresa.com",
    "name": "Barbearia Teste",
    "phone": "11999999999",
    "address": "Rua Teste, 123"
  }' | jq '.' || echo "❌ Erro ao criar empresa"
echo ""

echo "3️⃣ Criando um produto de teste..."
PRODUTO_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/products?enterpriseEmail=teste@empresa.com" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Corte de Cabelo",
    "description": "Corte masculino tradicional",
    "price": 50.00,
    "duration": 30,
    "category": "Cortes"
  }')

echo "$PRODUTO_RESPONSE" | jq '.'
PRODUCT_ID=$(echo "$PRODUTO_RESPONSE" | jq -r '.data.id // empty')
echo "📦 Product ID: $PRODUCT_ID"
echo ""

echo "4️⃣ Criando um funcionário de teste..."
FUNCIONARIO_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/employees?enterpriseEmail=teste@empresa.com" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Barbeiro",
    "email": "joao@empresa.com",
    "phone": "11888888888",
    "position": "Barbeiro Senior",
    "isActive": true,
    "workSchedule": {
      "monday": { "isWorking": true, "startTime": "09:00", "endTime": "18:00" },
      "tuesday": { "isWorking": true, "startTime": "09:00", "endTime": "18:00" },
      "wednesday": { "isWorking": true, "startTime": "09:00", "endTime": "18:00" },
      "thursday": { "isWorking": true, "startTime": "09:00", "endTime": "18:00" },
      "friday": { "isWorking": true, "startTime": "09:00", "endTime": "18:00" },
      "saturday": { "isWorking": true, "startTime": "09:00", "endTime": "17:00" },
      "sunday": { "isWorking": false }
    }
  }')

echo "$FUNCIONARIO_RESPONSE" | jq '.'
EMPLOYEE_ID=$(echo "$FUNCIONARIO_RESPONSE" | jq -r '.data.id // empty')
echo "👷 Employee ID: $EMPLOYEE_ID"
echo ""

if [ -n "$PRODUCT_ID" ] && [ -n "$EMPLOYEE_ID" ]; then
    echo "5️⃣ Adicionando habilidade ao funcionário..."
    curl -s -X POST "http://localhost:5000/api/employees/$EMPLOYEE_ID/skills" \
      -H "Content-Type: application/json" \
      -d "{
        \"productId\": \"$PRODUCT_ID\",
        \"priceMultiplier\": 1.2,
        \"estimatedDuration\": 35
      }" | jq '.'
    echo ""
    
    echo "6️⃣ Buscando funcionários disponíveis..."
    curl -s -X GET "http://localhost:5000/api/bookings/available-employees?enterpriseEmail=teste@empresa.com&productId=$PRODUCT_ID&date=2025-09-02&startTime=14:00" | jq '.'
    echo ""
    
    echo "7️⃣ Criando agendamento com funcionário específico..."
    curl -s -X POST "http://localhost:5000/api/bookings" \
      -H "Content-Type: application/json" \
      -d "{
        \"enterpriseEmail\": \"teste@empresa.com\",
        \"clientName\": \"Maria Cliente\",
        \"clientPhone\": \"11777777777\",
        \"clientEmail\": \"maria@cliente.com\",
        \"productId\": \"$PRODUCT_ID\",
        \"employeeId\": \"$EMPLOYEE_ID\",
        \"date\": \"2025-09-02\",
        \"startTime\": \"14:00\",
        \"notes\": \"Agendamento com funcionário específico\"
      }" | jq '.'
    echo ""
    
    echo "8️⃣ Verificando horários disponíveis do funcionário..."
    curl -s -X GET "http://localhost:5000/api/employees/$EMPLOYEE_ID/availability/service-slots?date=2025-09-02&productId=$PRODUCT_ID&enterpriseEmail=teste@empresa.com" | jq '.'
    
else
    echo "❌ Não foi possível obter IDs necessários para os testes avançados"
fi

echo ""
echo "✅ TESTES CONCLUÍDOS!"
echo "===================================="
