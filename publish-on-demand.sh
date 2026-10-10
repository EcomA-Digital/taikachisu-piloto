#!/bin/bash
set -euo pipefail
cd /home/taikxxot/repositories/taikachisu-piloto
/usr/local/cpanel/3rdparty/bin/git pull --ff-only origin main
/bin/bash /home/taikxxot/repositories/taikachisu-piloto/deploy-hosting.sh
