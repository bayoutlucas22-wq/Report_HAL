FROM node:20-alpine

# tini: proper PID 1 — forwards SIGTERM/SIGINT so `docker stop` works cleanly
RUN apk add --no-cache tini

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Must match server.js: PORT || 5001
EXPOSE 3333

# Seed is a one-time operation — run via: railway run node ingest_to_mongo.js
# Never seed on every container start (drops + re-inserts all collections each restart)
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "api/server.js"]
