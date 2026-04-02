FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first (layer cache)
COPY package*.json ./

# Install production deps only
RUN npm install --omit=dev

# Copy all source files
COPY . .

EXPOSE 3333

CMD ["node", "api/server.js"]
