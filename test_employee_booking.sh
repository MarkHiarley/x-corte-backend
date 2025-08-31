#!/bin/bash
# Testes das Funcionalidades de Agendamento com Funcionários
# Execute cada comando abaixo para testar as funcionalidades

echo "🧪 TESTES DO SISTEMA DE AGENDAMENTO COM FUNCIONÁRIOS"
echo "=================================================="
echo ""

BASE_URL="http://localhost:5000"

echo "📋 1. LISTAR FUNCIONÁRIOS DE UMA EMPRESA"
echo "Comando:"
echo "curl -X GET \"$BASE_URL/employees?enterpriseEmail=teste@empresa.com\""
echo ""
echo "Executar:"
curl -X GET "$BASE_URL/employees?enterpriseEmail=teste@empresa.com" | jq '.'
echo ""
echo "=================================================="
echo ""

echo "🏢 2. CRIAR UM FUNCIONÁRIO DE TESTE"
echo "Comando:"
EMPLOYEE_DATA='{
  "name": "Maria Silva",
  "email": "maria@empresa.com",
  "phone": "11999999999",
  "position": "Cabeleireira Senior",
  "isActive": true,
  "workSchedule": {
    "monday": {
      "isWorking": true,
      "startTime": "09:00",
      "endTime": "17:00",
      "breakStart": "12:00",
      "breakEnd": "13:00"
    },
    "tuesday": {
      "isWorking": true,
      "startTime": "09:00",
      "endTime": "17:00",
      "breakStart": "12:00",
      "breakEnd": "13:00"
    },
    "wednesday": {
      "isWorking": true,
      "startTime": "09:00",
      "endTime": "17:00",
      "breakStart": "12:00",
      "breakEnd": "13:00"
    },
    "thursday": {
      "isWorking": true,
      "startTime": "09:00",
      "endTime": "17:00",
      "breakStart": "12:00",
      "breakEnd": "13:00"
    },
    "friday": {
      "isWorking": true,
      "startTime": "09:00",
      "endTime": "17:00",
      "breakStart": "12:00",
      "breakEnd": "13:00"
    },
    "saturday": {
      "isWorking": true,
      "startTime": "09:00",
      "endTime": "15:00"
    },
    "sunday": {
      "isWorking": false
    }
  }
}'

echo "curl -X POST \"$BASE_URL/employees?enterpriseEmail=teste@empresa.com\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '$EMPLOYEE_DATA'"
echo ""
echo "Executar:"
curl -X POST "$BASE_URL/employees?enterpriseEmail=teste@empresa.com" \
  -H "Content-Type: application/json" \
  -d "$EMPLOYEE_DATA" | jq '.'
echo ""
echo "=================================================="
echo ""

echo "🎯 3. ADICIONAR HABILIDADE (SKILL) AO FUNCIONÁRIO"
echo "NOTA: Substitua EMPLOYEE_ID pelo ID retornado no comando anterior"
echo ""
echo "Comando:"
SKILL_DATA='{
  "productId": "produto123",
  "priceMultiplier": 1.2,
  "estimatedDuration": 45
}'

echo "curl -X POST \"$BASE_URL/employees/EMPLOYEE_ID/skills?enterpriseEmail=teste@empresa.com\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '$SKILL_DATA'"
echo ""
echo "⚠️  EXECUTE MANUALMENTE substituindo EMPLOYEE_ID"
echo ""
echo "=================================================="
echo ""

echo "🔍 4. BUSCAR FUNCIONÁRIOS DISPONÍVEIS PARA UM SERVIÇO"
echo "Comando:"
echo "curl -X GET \"$BASE_URL/bookings/available-employees?enterpriseEmail=teste@empresa.com&productId=produto123&date=2025-09-02&startTime=14:00\""
echo ""
echo "Executar:"
curl -X GET "$BASE_URL/bookings/available-employees?enterpriseEmail=teste@empresa.com&productId=produto123&date=2025-09-02&startTime=14:00" | jq '.'
echo ""
echo "=================================================="
echo ""

echo "📅 5. VER HORÁRIOS DISPONÍVEIS DE UM FUNCIONÁRIO ESPECÍFICO"
echo "NOTA: Substitua EMPLOYEE_ID pelo ID do funcionário"
echo ""
echo "Comando:"
echo "curl -X GET \"$BASE_URL/employees/EMPLOYEE_ID/availability/service-slots?date=2025-09-02&productId=produto123&enterpriseEmail=teste@empresa.com\""
echo ""
echo "⚠️  EXECUTE MANUALMENTE substituindo EMPLOYEE_ID"
echo ""
echo "=================================================="
echo ""

echo "📝 6. CRIAR AGENDAMENTO COM FUNCIONÁRIO ESPECÍFICO"
echo "NOTA: Substitua EMPLOYEE_ID pelo ID do funcionário"
echo ""
BOOKING_DATA='{
  "enterpriseEmail": "teste@empresa.com",
  "clientName": "João Cliente",
  "clientPhone": "11888888888",
  "clientEmail": "joao@cliente.com",
  "productId": "produto123",
  "employeeId": "EMPLOYEE_ID",
  "date": "2025-09-02",
  "startTime": "14:00",
  "notes": "Teste de agendamento com funcionário específico"
}'

echo "curl -X POST \"$BASE_URL/bookings\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '$BOOKING_DATA'"
echo ""
echo "⚠️  EXECUTE MANUALMENTE substituindo EMPLOYEE_ID"
echo ""
echo "=================================================="
echo ""

echo "📝 7. CRIAR AGENDAMENTO SEM FUNCIONÁRIO ESPECÍFICO"
echo "Comando:"
BOOKING_GENERAL_DATA='{
  "enterpriseEmail": "teste@empresa.com",
  "clientName": "Maria Cliente",
  "clientPhone": "11777777777",
  "clientEmail": "maria@cliente.com",
  "productId": "produto123",
  "date": "2025-09-02",
  "startTime": "15:00",
  "notes": "Agendamento geral sem funcionário específico"
}'

echo "curl -X POST \"$BASE_URL/bookings\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '$BOOKING_GENERAL_DATA'"
echo ""
echo "Executar:"
curl -X POST "$BASE_URL/bookings" \
  -H "Content-Type: application/json" \
  -d "$BOOKING_GENERAL_DATA" | jq '.'
echo ""
echo "=================================================="
echo ""

echo "📋 8. LISTAR AGENDAMENTOS DA EMPRESA"
echo "Comando:"
echo "curl -X GET \"$BASE_URL/bookings?enterpriseEmail=teste@empresa.com&date=2025-09-02\""
echo ""
echo "Executar:"
curl -X GET "$BASE_URL/bookings?enterpriseEmail=teste@empresa.com&date=2025-09-02" | jq '.'
echo ""
echo "=================================================="
echo ""

echo "✅ TESTES CONCLUÍDOS!"
echo ""
echo "💡 DICAS:"
echo "- Alguns comandos precisam do EMPLOYEE_ID que é retornado ao criar o funcionário"
echo "- Use 'jq' para formatação JSON mais bonita (instale com: sudo pacman -S jq)"
echo "- Verifique se o servidor está rodando em http://localhost:5000"
echo "- Para produtos/serviços, use a API de produtos para criar 'produto123' se necessário"
