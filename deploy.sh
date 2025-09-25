#!/bin/bash

# ========================================
# 🚀 SCRIPT DE DEPLOY COMPLETO
# X-Corte Backend com Timezone Brasília
# ========================================

set -e  # Para na primeira falha

# Configurações
CONTAINER_NAME="x-corte-backend"
IMAGE_NAME="x-corte-backend:latest"
PORT=5000
HEALTH_ENDPOINT="/health"
MAX_WAIT_TIME=60
TIMEZONE="America/Sao_Paulo"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para aguardar container ficar saudável
wait_for_health() {
    local counter=0
    log "🔍 Aguardando aplicação ficar saudável..."
    
    while [ $counter -lt $MAX_WAIT_TIME ]; do
        if curl -s -f "http://localhost:$PORT$HEALTH_ENDPOINT" >/dev/null 2>&1; then
            success "✅ Aplicação está saudável!"
            return 0
        fi
        
        echo -n "."
        sleep 1
        counter=$((counter + 1))
    done
    
    error "❌ Timeout aguardando aplicação ficar saudável"
    return 1
}

# Função para verificar pré-requisitos
check_prerequisites() {
    log "🔍 Verificando pré-requisitos..."
    
    if ! command_exists docker; then
        error "Docker não está instalado!"
        exit 1
    fi
    
    if ! command_exists curl; then
        warning "curl não está instalado. Algumas verificações serão puladas."
    fi
    
    if ! command_exists jq; then
        warning "jq não está instalado. Output JSON não será formatado."
    fi
    
    # Verificar se Docker está rodando
    if ! docker info >/dev/null 2>&1; then
        error "Docker não está rodando!"
        exit 1
    fi
    
    # Verificar se .env existe
    if [ ! -f .env ]; then
        warning ".env file não encontrado. Algumas variáveis podem não estar disponíveis."
    fi
    
    # Verificar se Dockerfile existe
    if [ ! -f Dockerfile ]; then
        error "Dockerfile não encontrado!"
        exit 1
    fi
    
    success "✅ Pré-requisitos OK"
}

# Função para parar container existente
stop_existing_container() {
    if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        log "🛑 Parando container existente..."
        
        # Tentar parar graciosamente
        docker stop $CONTAINER_NAME --time 30
        
        # Verificar se parou
        if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
            warning "Container não parou graciosamente, forçando..."
            docker kill $CONTAINER_NAME
        fi
        
        success "✅ Container parado com sucesso"
    else
        info "ℹ️  Nenhum container ativo encontrado"
    fi
}

# Função para remover container existente
remove_existing_container() {
    if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
        log "🗑️  Removendo container existente..."
        docker rm $CONTAINER_NAME
        success "✅ Container removido"
    else
        info "ℹ️  Nenhum container para remover"
    fi
}

# Função para construir imagem
build_image() {
    log "🔨 Construindo imagem Docker..."
    
    # Limpar cache de build se necessário
    if [ "$1" = "--no-cache" ]; then
        info "🧹 Construindo sem cache..."
        docker build -t $IMAGE_NAME . --no-cache
    else
        docker build -t $IMAGE_NAME .
    fi
    
    success "✅ Imagem construída com sucesso"
}

# Função para criar e iniciar container
start_container() {
    log "🐳 Iniciando novo container..."
    
    # Preparar comando docker run
    DOCKER_CMD="docker run -d \
        --name $CONTAINER_NAME \
        -p $PORT:$PORT \
        -e TZ=$TIMEZONE \
        -v /etc/timezone:/etc/timezone:ro \
        -v /etc/localtime:/etc/localtime:ro \
        --restart unless-stopped"
    
    # Adicionar .env se existir
    if [ -f .env ]; then
        DOCKER_CMD="$DOCKER_CMD --env-file .env"
        info "📄 Carregando variáveis do .env"
    fi
    
    # Adicionar imagem
    DOCKER_CMD="$DOCKER_CMD $IMAGE_NAME"
    
    # Executar comando
    eval $DOCKER_CMD
    
    success "✅ Container iniciado"
}

# Função para verificar status do container
check_container_status() {
    log "⏳ Verificando status do container..."
    sleep 3
    
    if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        success "✅ Container está rodando"
        
        # Mostrar informações do container
        info "📊 Informações do container:"
        docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        return 0
    else
        error "❌ Container não está rodando"
        return 1
    fi
}

# Função para verificar timezone
check_timezone() {
    log "🌍 Verificando configuração de timezone..."
    
    # Timezone do host
    HOST_TIME=$(date)
    info "🖥️  Host: $HOST_TIME"
    
    # Timezone do container
    if CONTAINER_TIME=$(docker exec $CONTAINER_NAME date 2>/dev/null); then
        info "🐳 Container: $CONTAINER_TIME"
    else
        warning "Não foi possível verificar horário do container"
    fi
    
    # Variável TZ do container
    if CONTAINER_TZ=$(docker exec $CONTAINER_NAME printenv TZ 2>/dev/null); then
        info "🌍 TZ env: $CONTAINER_TZ"
    else
        warning "Variável TZ não definida no container"
    fi
    
    # Verificar se timezone está correto
    if docker exec $CONTAINER_NAME date | grep -q "\-03"; then
        success "✅ Timezone configurado corretamente para Brasília"
    else
        warning "⚠️  Timezone pode não estar correto"
    fi
}

# Função para verificar saúde da aplicação
check_application_health() {
    log "🏥 Verificando saúde da aplicação..."
    
    if command_exists curl; then
        if wait_for_health; then
            # Tentar endpoints específicos
            log "🧪 Testando endpoints..."
            
            # Health check
            if curl -s "http://localhost:$PORT$HEALTH_ENDPOINT" >/dev/null 2>&1; then
                success "✅ Health endpoint OK"
            else
                warning "⚠️  Health endpoint não respondeu"
            fi
            
            # Debug time endpoint (se existir)
            if curl -s "http://localhost:$PORT/debug/time" >/dev/null 2>&1; then
                info "🕐 Debug time endpoint disponível"
                if command_exists jq; then
                    curl -s "http://localhost:$PORT/debug/time" | jq .
                else
                    curl -s "http://localhost:$PORT/debug/time"
                fi
            fi
            
        else
            error "❌ Aplicação não ficou saudável no tempo esperado"
            return 1
        fi
    else
        warning "curl não disponível, pulando verificação de saúde"
        sleep 5  # Aguardar um pouco sem verificação
    fi
}

# Função para mostrar logs se houver falha
show_logs_on_failure() {
    if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
        error "📋 Logs do container:"
        docker logs --tail 50 $CONTAINER_NAME
    fi
}

# Função para limpeza em caso de falha
cleanup_on_failure() {
    error "💥 Deploy falhou, executando limpeza..."
    
    show_logs_on_failure
    
    if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        log "🛑 Parando container com falha..."
        docker stop $CONTAINER_NAME
    fi
    
    if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
        log "🗑️  Removendo container com falha..."
        docker rm $CONTAINER_NAME
    fi
}

# Função para mostrar informações finais
show_final_info() {
    success "🎉 Deploy concluído com sucesso!"
    
    echo ""
    echo "========================================="
    echo "🌐 APLICAÇÃO DISPONÍVEL EM:"
    echo "   http://localhost:$PORT"
    echo ""
    echo "📚 DOCUMENTAÇÃO DA API:"
    echo "   http://localhost:$PORT/docs"
    echo ""
    echo "🧪 TESTAR LEMBRETES:"
    echo "   curl \"http://localhost:$PORT/bookings/test-now?phone=11987654321\""
    echo ""
    echo "📊 VERIFICAR LEMBRETES ATIVOS:"
    echo "   curl \"http://localhost:$PORT/bookings/active-reminders\""
    echo ""
    echo "🕐 VERIFICAR TIMEZONE:"
    echo "   curl \"http://localhost:$PORT/debug/time\""
    echo ""
    echo "📋 VER LOGS:"
    echo "   docker logs $CONTAINER_NAME -f"
    echo "========================================="
}

# Função principal
main() {
    echo ""
    echo "========================================="
    echo "🚀 X-CORTE BACKEND DEPLOYMENT"
    echo "🌍 Timezone: $TIMEZONE"
    echo "🐳 Container: $CONTAINER_NAME"
    echo "🎯 Port: $PORT"
    echo "========================================="
    echo ""
    
    # Trap para limpeza em caso de falha
    trap cleanup_on_failure ERR
    
    # Executar etapas do deploy
    check_prerequisites
    stop_existing_container
    remove_existing_container
    
    # Build com ou sem cache
    if [ "$1" = "--no-cache" ]; then
        build_image --no-cache
    else
        build_image
    fi
    
    start_container
    
    # Verificações pós-deploy
    if check_container_status; then
        check_timezone
        check_application_health
        show_final_info
    else
        show_logs_on_failure
        exit 1
    fi
}

# Verificar argumentos
case "$1" in
    -h|--help)
        echo "Uso: $0 [opções]"
        echo ""
        echo "Opções:"
        echo "  --no-cache    Construir imagem sem usar cache"
        echo "  -h, --help    Mostrar esta ajuda"
        echo ""
        echo "Exemplos:"
        echo "  $0              # Deploy normal"
        echo "  $0 --no-cache   # Deploy sem cache"
        exit 0
        ;;
    --no-cache)
        main --no-cache
        ;;
    "")
        main
        ;;
    *)
        error "Opção inválida: $1"
        echo "Use $0 --help para ver as opções disponíveis"
        exit 1
        ;;
esac