#!/bin/bash

# ===================================================
# 🚀 SCRIPT DE DEPLOY COMPLETO v2
# X-Corte Backend com Timezone Brasília (Refinado)
# ===================================================

# Para a execução na primeira falha
set -e
# Garante que os pipelines falhem se um comando falhar
set -o pipefail

# --- Configurações ---
readonly CONTAINER_NAME="x-corte-backend"
readonly IMAGE_NAME="x-corte-backend:latest"
readonly PORT=5000
readonly HEALTH_ENDPOINT="/health"
readonly MAX_WAIT_TIME=60
readonly TIMEZONE="America/Sao_Paulo" # Fuso horário padrão do Brasil

# --- Cores para output ---
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# --- Funções de Log ---
log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}
error() {
    echo -e "${RED}[ERRO]${NC} $1" >&2
}
success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}
warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# --- Funções Auxiliares ---
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função de limpeza em caso de falha
cleanup_on_failure() {
    error "💥 Deploy falhou na linha $1. Iniciando limpeza..."
    show_logs_on_failure
    
    if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
        log "🗑️  Removendo container com falha..."
        docker rm -f "$CONTAINER_NAME"
    fi
}
# Trap para chamar a limpeza em caso de erro
trap 'cleanup_on_failure $LINENO' ERR

# --- Funções de Deploy ---

check_prerequisites() {
    log "🔍 Verificando pré-requisitos..."
    if ! command_exists docker; then
        error "Docker não está instalado ou não está no PATH."
        exit 1
    fi
    if ! docker info >/dev/null 2>&1; then
        error "O serviço do Docker não parece estar rodando."
        exit 1
    fi
    if [ ! -f Dockerfile ]; then
        error "Dockerfile não encontrado no diretório atual."
        exit 1
    fi
    success "✅ Pré-requisitos OK."
}

stop_and_remove_container() {
    # Usando ps -aq para pegar contêineres parados e ativos
    if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
        log "🛑 Parando e removendo container existente..."
        # -f força a remoção se ele estiver rodando
        docker rm -f "$CONTAINER_NAME"
        success "✅ Container anterior removido."
    else
        info "ℹ️  Nenhum container anterior encontrado."
    fi
}

build_image() {
    log "🔨 Construindo imagem Docker ($IMAGE_NAME)..."
    local build_args=()
    if [ "$1" = "--no-cache" ]; then
        info "🧹 Construindo sem usar o cache."
        build_args+=("--no-cache")
    fi
    
    docker build -t "$IMAGE_NAME" "${build_args[@]}" .
    success "✅ Imagem construída com sucesso."
}

start_container() {
    log "🐳 Iniciando novo container..."
    
    # MELHORIA: Construir o comando em um array para evitar `eval` e problemas com aspas.
    # É mais seguro e robusto.
    local docker_run_cmd=(
        "docker" "run" "-d"
        "--name" "$CONTAINER_NAME"
        "-p" "$PORT:$PORT"
        # MELHORIA: Apenas a variável TZ é necessária.
        # Isso torna o contêiner independente do fuso horário do host.
        # Garanta que sua imagem base (no Dockerfile) tenha o pacote `tzdata`.
        "-e" "TZ=$TIMEZONE"
        "--restart" "unless-stopped"
    )
    
    if [ -f .env ]; then
        info "📄 Carregando variáveis de ambiente do arquivo .env."
        docker_run_cmd+=("--env-file" ".env")
    fi
    
    docker_run_cmd+=("$IMAGE_NAME")
    
    # Executa o comando
    "${docker_run_cmd[@]}"
    
    success "✅ Container iniciado."
}

check_container_status() {
    log "⏳ Verificando status do container..."
    sleep 3
    
    if ! docker ps -q -f "name=$CONTAINER_NAME"; then
        error "❌ Container não subiu corretamente."
        return 1
    fi
    
    success "✅ Container está rodando."
    info "📊 Informações do container:"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

check_timezone() {
    log "🌍 Verificando fuso horário do container..."
    
    # MELHORIA: Verificação mais robusta, pegando a sigla e o offset.
    # Exemplo de saída esperada: BRT -0300
    local container_time_details
    container_time_details=$(docker exec "$CONTAINER_NAME" date +"%Z %z")
    
    info "🐳 Hora no Container: $(docker exec "$CONTAINER_NAME" date)"
    info "🌍 Detalhes do Fuso: $container_time_details"
    
    if [[ "$container_time_details" == *"BRT -0300"* ]] || [[ "$container_time_details" == *"-03 -0300"* ]]; then
        success "✅ Timezone configurado corretamente para Brasília (BRT / -03:00)."
    else
        warning "⚠️  O fuso horário do container não parece ser o de Brasília."
    fi
}

wait_for_health() {
    log "❤️  Aguardando aplicação ficar saudável em http://localhost:$PORT$HEALTH_ENDPOINT..."
    local counter=0
    
    while [ $counter -lt $MAX_WAIT_TIME ]; do
        # Usando --fail para que curl retorne um código de erro em caso de falha (4xx, 5xx)
        if curl --silent --fail "http://localhost:$PORT$HEALTH_ENDPOINT" >/dev/null 2>&1; then
            success "✅ Aplicação respondeu ao health check!"
            return 0
        fi
        echo -n "."
        sleep 1
        ((counter++))
    done
    
    error "❌ Timeout! A aplicação não ficou saudável em $MAX_WAIT_TIME segundos."
    return 1
}

show_logs_on_failure() {
    if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
        error "📋 Exibindo os últimos 50 logs do container:"
        docker logs --tail 50 "$CONTAINER_NAME"
    fi
}

show_final_info() {
    success "🎉 Deploy concluído com sucesso!"
    
    echo ""
    echo -e "${YELLOW}=======================================================${NC}"
    echo -e "  ${GREEN}Aplicação X-Corte Backend disponível!${NC}"
    echo -e "${YELLOW}=======================================================${NC}"
    echo -e " 🌐 ${CYAN}Endpoint Principal:${NC} http://localhost:$PORT"
    echo -e " 📚 ${CYAN}Documentação (Swagger):${NC} http://localhost:$PORT/docs"
    echo -e " 🕐 ${CYAN}Verificar Timezone:${NC} curl http://localhost:$PORT/debug/time"
    echo -e " 📋 ${CYAN}Ver Logs em tempo real:${NC} docker logs -f $CONTAINER_NAME"
    echo -e "${YELLOW}=======================================================${NC}"
}

# --- Função Principal ---
main() {
    echo ""
    log "🚀 INICIANDO DEPLOY DO X-CORTE BACKEND 🚀"
    
    check_prerequisites
    stop_and_remove_container
    build_image "$1" # Passa o argumento --no-cache se existir
    start_container
    check_container_status
    check_timezone
    wait_for_health
    
    # Se tudo deu certo, desativa o trap de erro para não executar a limpeza
    trap - ERR
    
    show_final_info
}

# --- Ponto de Entrada do Script ---
# Permite -h e --help para exibir ajuda
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "Uso: $0 [--no-cache]"
    echo "  --no-cache: Executa o build da imagem Docker sem utilizar o cache."
    exit 0
fi

main "$1"