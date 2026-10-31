FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
RUN mkdir -p /app/data
EXPOSE 3001
CMD ["node", "dist/index.js"]
