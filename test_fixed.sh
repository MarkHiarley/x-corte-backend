#!/bin/bash

echo "🧪 TESTANDO SISTEMA DE FUNCIONÁRIOS (CORRIGIDO)"
echo "==============================================="
echo ""

echo "1️⃣ Testando se o servidor está funcionando..."
curl -s http://localhost:5000/health
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
    "enterpriseEmail": "teste@empresa.com",
    "name": "Corte Teste",
    "description": "Corte masculino de teste",
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
    "enterpriseEmail": "teste@empresa.com",
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
echo "💡 Copie os IDs retornados para os próximos testes"
echo "   - Product ID está em 'data.id' do produto criado"
echo "   - Employee ID está em 'data.id' do funcionário criado"
