FROM docker.m.daocloud.io/library/node:20-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com \
  && (npm ci --include=dev --no-audit --no-fund || (rm -rf node_modules && npm install --no-audit --no-fund)) \
  && test -x node_modules/.bin/vite

COPY . .
RUN npm run build

FROM docker.m.daocloud.io/library/nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
