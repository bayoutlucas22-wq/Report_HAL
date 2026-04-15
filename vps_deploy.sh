#!/bin/bash

# HAL Tejas Dashboard - VPS Deployment Script
# This script automates the installation of Docker, cloning of the repo, and launching the dashboard.

set -e

echo "🚀 Starting Deployment Process..."

# 1. Update and Install Dependencies
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common git

# 2. Install Docker (if not present)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# 3. Install Docker Compose (if not present)
if ! command -v docker-compose &> /dev/null; then
    echo "🐙 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 4. Deployment Logic
# Note: This assumes the code is already on the server or needs to be cloned.
# For now, we assume the user will run this script from within the application directory.

echo "🏗 Building and Starting Containers..."
docker-compose up -d --build

echo "⏳ Waiting for Services to stabilize (20s)..."
sleep 20

# Check if app is actually running
if [ "$(docker inspect -f '{{.State.Running}}' hal-tejas-app)" != "true" ]; then
    echo "⚠️ App container is not running (it might be crashing). Checking logs..."
    docker-compose logs --tail=20 app
fi

echo "💉 Running Data Ingestion..."
# Use 'run' instead of 'exec' as it is safer for initialization tasks
docker-compose run --rm app node treat_data.js
docker-compose run --rm app node ingest_to_mongo.js

echo "✅ Deployment Complete!"
echo "🌐 Access your dashboard at http://YOUR_VPS_IP:3333"
echo "📜 To view live logs, run: docker-compose logs -f"
