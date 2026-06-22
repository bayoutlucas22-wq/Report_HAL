FROM node:20-alpine

# Use tini for proper signal handling
RUN apk add --no-cache tini

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

# Ensure data directories exist
RUN mkdir -p api/data/processed

# Standardize Port
EXPOSE 3333

CMD ["node", "api/server.js"]

