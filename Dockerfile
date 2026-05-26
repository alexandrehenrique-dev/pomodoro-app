# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copia manifests primeiro para aproveitar cache de camadas do Docker
COPY package*.json ./

# npm ci garante install determinístico a partir do package-lock.json
RUN npm ci

# Copia o restante do código e executa o build de produção
COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Configuração customizada (SPA fallback + cache de assets)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Artefatos de build gerados pelo Vite
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
