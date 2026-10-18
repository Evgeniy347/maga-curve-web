#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-domovoy@192.168.0.147}"
REMOTE_DIR="${DEPLOY_DIR:-/opt/maga-curve-web}"
PORT=8083

cd "$(dirname "$0")/.."

npm test

tar -czf - site deploy | ssh "$HOST" "mkdir -p '$REMOTE_DIR' && cd '$REMOTE_DIR' && rm -rf site deploy && tar -xzf -"

ssh "$HOST" "cd '$REMOTE_DIR/deploy' && docker compose -p maga-curve-web up -d --build && sleep 2 && curl -fsS -o /dev/null -w 'local %{http_code}\n' http://127.0.0.1:$PORT/modk-add.html"
