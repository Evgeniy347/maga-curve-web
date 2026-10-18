#!/usr/bin/env bash
set -euo pipefail

MESSAGE="${1:?usage: bash deploy/deploy.sh \"что сделано и зачем\"}"

cd "$(dirname "$0")/.."

npm test
bash deploy/publish.sh "$MESSAGE"
