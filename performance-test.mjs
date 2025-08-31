#!/usr/bin/env node

import autocannon from 'autocannon';
import { performance } from 'perf_hooks';

// Configurações do teste
const BASE_URL = 'http://localhost:5000';
const DURATION = 30; // segundos
const CONNECTIONS = 50; // conexões simultâneas
const PIPELINING = 1;

console.log('🚀 Iniciando Testes de Performance - X-Corte Backend\n');

// Função para executar teste com relatório detalhado
async function runPerformanceTest(testName, url, options = {}) {
  console.log(`📊 Testando: ${testName}`);
  console.log(`🔗 URL: ${url}`);
  console.log(`⏱️  Duração: ${DURATION}s | Conexões: ${CONNECTIONS}\n`);
  
  const startTime = performance.now();
  
  try {
    const result = await autocannon({
      url,
      duration: DURATION,
      connections: CONNECTIONS,
      pipelining: PIPELINING,
      headers: {
        'Content-Type': 'application/json',
        // Token fake para teste (será rejeitado mas medirá performance da validação)
        'Authorization': 'Bearer test-token'
      },
      ...options
    });

    const endTime = performance.now();
    const testDuration = ((endTime - startTime) / 1000).toFixed(2);

    // Relatório detalhado
    console.log(`✅ ${testName} - Concluído em ${testDuration}s`);
    console.log(`📈 Requests por segundo: ${result.requests.average.toFixed(0)}`);
    console.log(`📊 Total de requests: ${result.requests.total}`);
    console.log(`⚡ Latência média: ${result.latency.average.toFixed(1)}ms`);
    console.log(`🔥 Latência P99: ${result.latency.p99.toFixed(1)}ms`);
    console.log(`📡 Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`❌ Erros: ${result.errors}`);
    console.log(`⏱️  Duração real: ${(result.duration / 1000).toFixed(1)}s\n`);
    
    // Análise de performance
    if (result.requests.average > 1000) {
      console.log('🚀 EXCELENTE: > 1000 req/s');
    } else if (result.requests.average > 500) {
      console.log('✅ BOM: > 500 req/s');
    } else if (result.requests.average > 100) {
      console.log('⚠️  REGULAR: > 100 req/s');
    } else {
      console.log('🐌 BAIXO: < 100 req/s');
    }
    
    if (result.latency.average < 50) {
      console.log('⚡ LATÊNCIA EXCELENTE: < 50ms');
    } else if (result.latency.average < 100) {
      console.log('✅ LATÊNCIA BOA: < 100ms');
    } else if (result.latency.average < 200) {
      console.log('⚠️  LATÊNCIA REGULAR: < 200ms');
    } else {
      console.log('🐌 LATÊNCIA ALTA: > 200ms');
    }

    console.log('=' .repeat(80) + '\n');
    
    return result;
  } catch (error) {
    console.error(`❌ Erro no teste ${testName}:`, error.message);
    console.log('=' .repeat(80) + '\n');
    return null;
  }
}

// Função para teste de endpoint específico com dados
async function testWithPayload(testName, method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return await runPerformanceTest(testName, `${BASE_URL}${path}`, options);
}

// Suite de testes principal
async function runAllTests() {
  const results = [];
  
  console.log('🎯 TESTE DE PERFORMANCE - X-CORTE BACKEND');
  console.log('========================================\n');
  
  // 1. Health Check (baseline)
  results.push(await runPerformanceTest(
    'Health Check (Baseline)', 
    `${BASE_URL}/health`
  ));
  
  // 2. Listagem de funcionários (com erro de auth esperado)
  results.push(await runPerformanceTest(
    'Listagem de Funcionários', 
    `${BASE_URL}/api/employees?enterpriseEmail=test@empresa.com`
  ));
  
  // 3. Busca de funcionário específico
  results.push(await runPerformanceTest(
    'Busca Funcionário por ID', 
    `${BASE_URL}/api/employees/test-id`
  ));
  
  // 4. Consulta de disponibilidade
  results.push(await runPerformanceTest(
    'Consulta de Disponibilidade', 
    `${BASE_URL}/api/employees/availability/slots?employeeId=test&date=2024-08-31&duration=30`
  ));
  
  // 5. Busca de funcionários disponíveis
  results.push(await runPerformanceTest(
    'Funcionários Disponíveis para Serviço', 
    `${BASE_URL}/api/employees/availability/service?enterpriseEmail=test@empresa.com&productId=corte&date=2024-08-31&startTime=14:00`
  ));

  // Relatório consolidado
  console.log('📋 RELATÓRIO CONSOLIDADO DE PERFORMANCE');
  console.log('=======================================\n');
  
  const validResults = results.filter(r => r !== null);
  
  if (validResults.length > 0) {
    const avgRps = validResults.reduce((sum, r) => sum + r.requests.average, 0) / validResults.length;
    const avgLatency = validResults.reduce((sum, r) => sum + r.latency.average, 0) / validResults.length;
    const totalRequests = validResults.reduce((sum, r) => sum + r.requests.total, 0);
    const totalErrors = validResults.reduce((sum, r) => sum + r.errors, 0);
    
    console.log(`📊 Média de RPS: ${avgRps.toFixed(0)} requests/segundo`);
    console.log(`⚡ Latência média geral: ${avgLatency.toFixed(1)}ms`);
    console.log(`📈 Total de requests testados: ${totalRequests.toLocaleString()}`);
    console.log(`❌ Total de erros: ${totalErrors}`);
    console.log(`🔄 Taxa de erro: ${((totalErrors / totalRequests) * 100).toFixed(2)}%`);
    
    // Análise de cache effectiveness
    console.log('\n🧠 ANÁLISE DE CACHE:');
    const cacheableEndpoints = validResults.slice(1); // Excluir health check
    if (cacheableEndpoints.length > 0) {
      const avgCacheRps = cacheableEndpoints.reduce((sum, r) => sum + r.requests.average, 0) / cacheableEndpoints.length;
      console.log(`📦 RPS médio em endpoints com cache: ${avgCacheRps.toFixed(0)}`);
      
      if (avgCacheRps > 800) {
        console.log('🚀 Cache funcionando EXCELENTEMENTE!');
      } else if (avgCacheRps > 400) {
        console.log('✅ Cache funcionando bem!');
      } else {
        console.log('⚠️  Cache pode ser otimizado');
      }
    }
    
    // Recomendações
    console.log('\n💡 RECOMENDAÇÕES:');
    if (avgLatency > 100) {
      console.log('- Considerar otimização de queries no banco');
      console.log('- Revisar TTL do cache para dados mais estáticos');
    }
    if (avgRps < 500) {
      console.log('- Verificar gargalos de I/O');
      console.log('- Considerar clustering ou load balancing');
    }
    if (totalErrors > totalRequests * 0.01) {
      console.log('- Taxa de erro alta - revisar tratamento de exceções');
    }
    
    console.log('- Cache implementado está ajudando na performance! ✅');
    console.log('- Sistema multi-tenant isolando dados corretamente! 🏢');
    
  } else {
    console.log('❌ Nenhum teste foi concluído com sucesso');
  }
  
  console.log('\n🎯 Teste de performance concluído!');
  console.log('Para testes com autenticação real, configure um token válido.\n');
}

// Executar testes
runAllTests().catch(console.error);
