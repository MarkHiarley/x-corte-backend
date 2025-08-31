#!/bin/bash

# 🧪 TESTE 6: Criar agendamento sem funcionário específico
echo "=== 📝 TESTE 6: Agendamento Geral ==="
curl -X POST "http://localhost:5000/api/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "enterpriseEmail": "teste@empresa.com",
    "clientName": "João Cliente",
    "clientPhone": "11888888888", 
    "clientEmail": "joao@cliente.com",
    "productId": "PRODUCT_ID",
    "date": "2025-09-02",
    "startTime": "14:00",
    "notes": "Agendamento de teste"
  }'
echo ""
echo "⚠️  Substitua PRODUCT_ID pelo ID do produto criado"
