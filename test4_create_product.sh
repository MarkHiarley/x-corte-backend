#!/echo "=== 📦 TESTE 4: Criar Produto ==="
curl -X POST "http://localhost:5000/api/products?enterpriseEmail=teste@empresa.com" \n/bash

# 🧪 TESTE 4: Criar produto para testar
echo "=== 🛍️ TESTE 4: Criar Produto ==="
curl -X POST "http://localhost:5000/products?enterpriseEmail=teste@empresa.com" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Corte de Cabelo",
    "description": "Corte de cabelo masculino ou feminino",
    "price": 50,
    "duration": 30,
    "category": "Cabelo",
    "isActive": true
  }'
echo ""
