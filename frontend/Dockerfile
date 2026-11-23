# ── Etapa 1: build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Etapa 2: servidor estático con NGINX ────────────────────────────────────
FROM nginx:1.28-alpine

# Elimina la config default de NGINX
RUN rm /etc/nginx/conf.d/default.conf

# Config específica para React SPA (maneja client-side routing)
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
