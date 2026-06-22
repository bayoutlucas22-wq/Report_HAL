#!/bin/bash
# CORTEX VPS SETUP SCRIPT
set -e

echo "🚀 Starting CORTEX VPS Deployment..."

# 1. Update system
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Docker & Docker Compose
if ! [ -x "$(command -v docker)" ]; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# 3. Create app directory
mkdir -p ~/cortex-hub
cd ~/cortex-hub

# 4. In a real scenario, you'd git clone here. 
# For now, we assume the user uploads the files to this directory.

echo "✅ Environment ready."
echo "👉 To start the platform, run: docker compose up -d"
echo "🌐 Access your app at: http://YOUR_VPS_IP:3333"
