#!/bin/bash

# 🧪 TESTE 2: Criar funcionário
echo "=== 👷 TESTE 2: Criar Funcionário ==="
curl -X POST "http://localhost:5000/api/employees?enterpriseEmail=teste@empresa.com" \
  -H "Content-Type: application/json" \
  -d '{
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
echo ""
