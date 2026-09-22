#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  npm install
fi
npm run qa
printf '\nOpen qa-summary.md for the PASS / FAIL / VISUAL REVIEW summary.\n'
