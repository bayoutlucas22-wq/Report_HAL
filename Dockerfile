FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3333

# Seed MongoDB then start the server
CMD node ingest_to_mongo.js && node api/server.js
