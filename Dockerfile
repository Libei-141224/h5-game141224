FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN set -eux; \
  npm ci --no-audit --no-fund || true; \
  if [ ! -x node_modules/.bin/vue-tsc ]; then \
    rm -rf node_modules; \
    npm install --no-audit --no-fund; \
  fi; \
  test -x node_modules/.bin/vue-tsc

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
RUN npm install -g serve@14 --no-audit --no-fund
COPY --from=build /app/dist ./dist

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["serve", "-s", "dist", "-l", "80"]
