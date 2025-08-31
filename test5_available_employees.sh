#!/bin/bash

# 🧪 TESTE 5: Buscar funcionários disponíveis para um serviço
echo "=== 🔍 TESTE 5: Funcionários Disponíveis ==="
curl -X GET "http://localhost:5000/api/bookings/available-employees?enterpriseEmail=teste@empresa.com&productId=PRODUCT_ID&date=2025-09-02&startTime=14:00"
echo ""
echo "⚠️  Substitua PRODUCT_ID pelo ID retornado no teste anterior"
