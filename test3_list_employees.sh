#!/echo "=== 📋 TESTE 3: Listar Funcionários ==="
curl -X GET "http://localhost:5000/api/employees?enterpriseEmail=teste@empresa.com" \n/bash

# 🧪 TESTE 3: Listar funcionários
echo "=== 📋 TESTE 3: Listar Funcionários ==="
curl -X GET "http://localhost:5000/employees?enterpriseEmail=teste@empresa.com"
echo ""
