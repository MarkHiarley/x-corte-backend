#!/bin/bash

echo "🧪 TESTANDO SISTEMA DE FUNCIONÁRIOS (SEM JQ)"
echo "=============================================="
echo ""

echo "1️⃣ Testando se o servidor está funcionando..."
curl -s http://localhost:5000/api/health
echo ""
echo ""

echo "2️⃣ Criando uma empresa de teste..."
curl -X POST "http://localhost:5000/api/enterprises" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@empresa.com",
    "name": "Barbearia Teste",
    "phone": "11999999999",
    "address": "Rua Teste, 123"
  }'
echo ""
echo ""

echo "3️⃣ Criando um produto de teste..."
curl -X POST "http://localhost:5000/api/products?enterpriseEmail=teste@empresa.com" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Corte de Cabelo",
    "description": "Corte masculino tradicional",
    "price": 50.00,
    "duration": 30,
    "category": "Cortes"
  }'
echo ""
echo ""

echo "4️⃣ Criando um funcionário de teste..."
curl -X POST "http://localhost:5000/api/employees?enterpriseEmail=teste@empresa.com" \
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
  }'
echo ""
echo ""

echo "5️⃣ Listando funcionários da empresa..."
curl -X GET "http://localhost:5000/api/employees?enterpriseEmail=teste@empresa.com"
echo ""
echo ""

echo "6️⃣ Listando produtos da empresa..."
curl -X GET "http://localhost:5000/api/products?enterpriseEmail=teste@empresa.com"
echo ""
echo ""

echo "✅ TESTES BÁSICOS CONCLUÍDOS!"
echo "=============================================="
echo ""
echo "💡 Para testar agendamentos, você precisará:"
echo "   1. Copiar o ID do produto retornado acima"
echo "   2. Copiar o ID do funcionário retornado acima"
echo "   3. Usar esses IDs nos próximos testes"
