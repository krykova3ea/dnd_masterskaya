# ============================================================================
# D&D Мастерская — Multi-stage Dockerfile
# Stage 1: сборка клиента (Vite)
# Stage 2: сборка сервера (TypeScript)
# Stage 3: runtime
# ============================================================================

# Stage 1: Сборка клиентской части
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Сборка серверной части
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Копируем собранный сервер
COPY --from=server-build /app/server/package.json /app/server/package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=server-build /app/server/dist ./dist

# Копируем собранный клиент
COPY --from=client-build /app/client/dist ./client/dist

# Копируем SQL-схему для инициализации
COPY db/ ./db/

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_HOST=db
ENV DB_PORT=5432
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres
ENV DB_NAME=dnd_workshop
ENV UPLOAD_DIR=/app/uploads

# Директория для загруженных изображений
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

USER node

EXPOSE 3001

# Скрипт инициализации БД и запуска
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
