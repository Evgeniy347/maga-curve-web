#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-domovoy@192.168.0.147}"
SLUG="maga-curve-web"
FOLDER="users/admin/sites/$SLUG"
TARGET="/opt/gateway/$FOLDER"
MARKER="Published-From: maga-curve-web"

ADOPT=0
if [ "${1:-}" = "--adopt" ]; then
  ADOPT=1
  shift
fi
MESSAGE="${1:?usage: bash deploy/publish.sh [--adopt] \"что сделано и зачем\"}"

cd "$(dirname "$0")/.."

node scripts/guard.mjs

SOURCE="$(git rev-parse --short HEAD)$(git diff --quiet -- site || echo '+dirty')"

LAST="$(ssh "$HOST" "cd /opt/gateway && git log -1 --format=%H -- '$FOLDER'")"
if [ -n "$LAST" ] && ! ssh "$HOST" "cd /opt/gateway && git log -1 --format=%B $LAST | grep -q '^$MARKER'"; then
  if [ "$ADOPT" -eq 0 ]; then
    echo "guard: папку $FOLDER на gateway последним правил не publish.sh — публикация перезапишет чужие правки." >&2
    echo "Коммиты в папке после нашей последней публикации:" >&2
    ssh "$HOST" "cd /opt/gateway && OURS=\$(git log -1 --format=%H --grep='^$MARKER' -- '$FOLDER'); git log --format='  %h %ad %s' --date=format:'%Y-%m-%d %H:%M' \${OURS:+\$OURS..}HEAD -- '$FOLDER' | head -20" >&2
    echo "Перенесите их в исходники (scripts/build-pages.mjs, site/), закоммитьте и запустите: bash deploy/publish.sh --adopt \"...\"" >&2
    exit 1
  fi
  echo "publish: --adopt — чужие правки в $FOLDER приняты в исходники, публикую поверх" >&2
fi

PROD_FILES=$(cd site && find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name 'page.json' \) | sort)
echo "$PROD_FILES" | sed 's/^/publish /'

(cd site && tar -czf - $PROD_FILES) | ssh "$HOST" "mkdir -p '$TARGET' && find '$TARGET' -mindepth 1 -maxdepth 1 ! -name files -exec rm -rf {} + && tar -xzf - -C '$TARGET'"

ssh "$HOST" "cd /opt/gateway && git add '$FOLDER' && if git diff --cached --quiet; then echo 'no changes'; else git commit -q -F - <<MSG
$FOLDER: $MESSAGE

$MARKER $SOURCE
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
git log --oneline -1; fi"

ssh "$HOST" "sleep 2
curl -s -o /dev/null -w 'page %{http_code}\n' http://127.0.0.1:8082/u/admin/$SLUG/
curl -s http://127.0.0.1:8082/ | grep -c '/u/admin/$SLUG/' | sed 's/^/on home page: /'
docker logs gateway --since 5m 2>&1 | grep 'admin/$SLUG' | grep -v 'uvicorn.access' || echo 'gateway log: no errors for admin/$SLUG'"
