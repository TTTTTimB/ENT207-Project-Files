# 后端 API 容器镜像（云托管 / 任意容器平台通用）
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV SERVER_PORT=3000
EXPOSE 3000

CMD ["node", "app.js"]
