#!/bin/bash
# 🚀 CORTEX REMOTE DEPLOYMENT SCRIPT
# Usage: ./deploy/deploy_remote.sh <vps_username>@<vps_ip> [ssh_key_path]

set -e

if [ -z "$1" ]; then
    echo "❌ Error: VPS target missing."
    echo "Usage: ./deploy/deploy_remote.sh user@123.45.67.89 [key.pem]"
    exit 1
fi

TARGET=$1
SSH_KEY=$2
REMOTE_PATH="~/cortex-hub"

# Define SSH core command with optional key
SSH_CMD="ssh -o PubkeyAuthentication=no"
RSYNC_SSH="ssh -o PubkeyAuthentication=no"
if [ ! -z "$SSH_KEY" ]; then
    SSH_CMD="ssh -i $SSH_KEY"
    RSYNC_SSH="ssh -i $SSH_KEY"
    echo "🔑 Using SSH Key: $SSH_KEY"
fi

echo "📡 Target VPS: $TARGET"
echo "📂 Project Path: $REMOTE_PATH"

# Setup SSH Multiplexing (one password entry for all commands)
SOCKET="/tmp/ssh-cortex-$(date +%s)"
echo "🔐 Establishing persistent connection (you may be asked for your password once)..."
$SSH_CMD -M -S $SOCKET -f -N $TARGET

# Update commands to use the socket
SSH_CMD="$SSH_CMD -S $SOCKET"
RSYNC_SSH="$RSYNC_SSH -o ControlPath=$SOCKET"

# Trap to ensure we close the connection on exit
trap 'echo "🛑 Closing persistent connection..."; ssh -S $SOCKET -O exit $TARGET 2>/dev/null' EXIT

# 1. Prepare remote directory
echo "🏗 Preparing remote directory..."
$SSH_CMD $TARGET "mkdir -p $REMOTE_PATH"

# 2. Sync files using rsync
echo "🔄 Syncing files..."
rsync -avz --delete \
    -e "$RSYNC_SSH" \
    --exclude 'node_modules' \
    --exclude '.git' \
    ./ $TARGET:$REMOTE_PATH/

# 3. Run deployment on VPS
echo "🐳 Starting Docker containers on VPS..."
$SSH_CMD $TARGET "cd $REMOTE_PATH && \
    docker stop cortex-hub cortex-mongodb 2>/dev/null || true && \
    docker rm -f cortex-hub cortex-mongodb 2>/dev/null || true && \
    docker compose -f deploy/docker-compose.prod.yml up -d --build --remove-orphans"

echo "⏳ Waiting for containers to be healthy..."
for i in {1..20}; do
    HEALTH=$($SSH_CMD $TARGET "cd $REMOTE_PATH && docker compose -f deploy/docker-compose.prod.yml ps hub --format '{{.Health}}'")
    if [ "$HEALTH" == "healthy" ]; then
        echo "✅ Hub container is healthy."
        break
    fi
    echo "   ...waiting ($i/20)"
    sleep 5
done

# 4. Optional: Data Ingestion
echo "💉 Checking if data ingestion is needed..."
$SSH_CMD $TARGET "cd $REMOTE_PATH && \
    docker compose -f deploy/docker-compose.prod.yml exec hub node -e \"
        const { getDb } = require('./api/mongo');
        async function check() {
            try {
                const db = await getDb();
                const count = await db.collection('anp_stats').countDocuments();
                if (count === 0) {
                    process.exit(1);
                }
                process.exit(0);
            } catch (e) { process.exit(2); }
        }
        check();
    \"" || NEED_INGEST=$?

if [ "$NEED_INGEST" == "1" ]; then
    echo "📝 Database empty. Running ingestion scripts..."
    $SSH_CMD $TARGET "cd $REMOTE_PATH && \
        docker compose -f deploy/docker-compose.prod.yml exec hub npm run ingest"
else
    echo "✨ Database already has data. Skipping ingestion."
fi

echo "✅ Deployment Successful!"
echo "🌐 Access your app at: http://$(echo $TARGET | cut -d'@' -f2):3333"
