#!/bin/sh
# Build petrichor.xpi (a plain zip; Firefox reads it either way).
set -e
cd "$(dirname "$0")"
rm -f petrichor.xpi viyoga-newtab.xpi
zip -r -q petrichor.xpi . \
  -x 'petrichor.xpi' \
  -x 'viyoga-newtab.xpi' \
  -x 'package.sh' \
  -x 'README.md' \
  -x 'LICENSE' \
  -x '.gitignore' \
  -x 'assets/*' \
  -x 'server/*' \
  -x 'docs/*' \
  -x '*.bak*' \
  -x '.git/*'
echo "built $(pwd)/petrichor.xpi"
