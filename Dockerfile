FROM node:20-alpine AS builder
WORKDIR /app

# Копируем манифесты зависимостей
COPY package*.json ./
RUN npm install

# Копируем исходный код
COPY . .

# Сборка фронтенда и сервера (dist/index.html + dist/server.cjs)
RUN npm run build

# Финальный легковесный образ для продакшена
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
