# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com \
  && npm install --no-audit --no-fund \
  && test -x node_modules/.bin/vue-tsc \
  && test -x node_modules/.bin/vite

COPY . .

ARG VITE_BASE=/
RUN npm run build -- --base="${VITE_BASE}"

FROM nginx:1.27-alpine AS runtime

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
