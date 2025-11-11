FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
