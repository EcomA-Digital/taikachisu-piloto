#!/bin/bash
set -euo pipefail
if [[ "${SSH_ORIGINAL_COMMAND:-}" != publish-pilot ]]; then
  printf 'Only publish-pilot is allowed.\n' >&2
  exit 126
fi
cd /home/taikxxot/repositories/taikachisu-piloto
/usr/local/cpanel/3rdparty/bin/git pull --ff-only origin main
/bin/bash /home/taikxxot/repositories/taikachisu-piloto/deploy-hosting.sh
