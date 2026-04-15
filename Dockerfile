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

# Command to pre-process data and then start the server
# Note: In a real VPS, you might want to run ingest_to_mongo.js as a separate job,
# but for maximum reliability, we'll ensure treat_data.js runs to populate fallbacks.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node treat_data.js && node api/server.js"]
