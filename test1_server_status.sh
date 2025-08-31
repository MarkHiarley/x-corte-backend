#!/bin/bash

# 🧪 TESTE 1: Verificar se servidor está funcionando
echo "=== 🚀 TESTE 1: Status do Servidor ==="
curl -X GET "http://localhost:5000/docs" -I
echo ""
