#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-domovoy@192.168.0.147}"
SLUG="maga-curve-web"
TARGET="/opt/gateway/users/admin/sites/$SLUG"
MESSAGE="${1:?usage: bash deploy/publish.sh \"что сделано и зачем\"}"

cd "$(dirname "$0")/.."

PROD_FILES=$(cd site && find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name 'page.json' \) | sort)
echo "$PROD_FILES" | sed 's/^/publish /'

(cd site && tar -czf - $PROD_FILES) | ssh "$HOST" "mkdir -p '$TARGET' && find '$TARGET' -mindepth 1 -maxdepth 1 ! -name files -exec rm -rf {} + && tar -xzf - -C '$TARGET'"

ssh "$HOST" "cd /opt/gateway && git add 'users/admin/sites/$SLUG' && if git diff --cached --quiet; then echo 'no changes'; else git commit -q -F - <<MSG
users/admin/sites/$SLUG: $MESSAGE

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
git log --oneline -1; fi"

ssh "$HOST" "sleep 2
curl -s -o /dev/null -w 'page %{http_code}\n' http://127.0.0.1:8082/u/admin/$SLUG/
curl -s http://127.0.0.1:8082/ | grep -c '/u/admin/$SLUG/' | sed 's/^/on home page: /'
docker logs gateway --since 5m 2>&1 | grep 'admin/$SLUG' | grep -v 'uvicorn.access' || echo 'gateway log: no errors for admin/$SLUG'"
