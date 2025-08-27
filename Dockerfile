# Dockerfile para X-Corte Backend

FROM node:20-alpine

# Instalar wget para health check
RUN apk add --no-cache wget

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY src/ ./src/

# Build da aplicação
RUN npm run build

# Limpar node_modules e instalar apenas dependências de produção
RUN rm -rf node_modules && \
    npm install --only=production && \
    npm cache clean --force

# Expor porta da aplicação
EXPOSE 5000

# Health check simples
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000

# Comando para iniciar a aplicação
CMD ["node", "dist/server.js"]
