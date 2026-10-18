#!/usr/bin/env bash
set -euo pipefail

: "${1:?usage: bash deploy/deploy.sh [--adopt] \"что сделано и зачем\"}"

cd "$(dirname "$0")/.."

npm test
bash deploy/publish.sh "$@"
