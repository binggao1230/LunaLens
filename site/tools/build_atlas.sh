#!/usr/bin/env bash
# Rebuild site/atlas from the upstream open-source Lunar Landing Site Navigator.
# The only local change is the parent bridge in bridge.patch; site/atlas/data is kept.
set -euo pipefail
UPSTREAM=https://github.com/daniel27-space/lunar-navigator.git
COMMIT=3866a6f2ef2c6009489b5b94bd927ecbcddb8276
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
git clone --quiet "$UPSTREAM" "$WORK/atlas"
git -C "$WORK/atlas" checkout --quiet "$COMMIT"
git -C "$WORK/atlas" apply "$ROOT/site/atlas/bridge.patch"
(cd "$WORK/atlas/web" && npm install --no-audit --no-fund && npm run build)
cp "$WORK/atlas/web/dist/index.html" "$ROOT/site/atlas/index.html"
cp -a "$WORK/atlas/web/dist/assets/." "$ROOT/site/atlas/assets/"
cp -a "$WORK/atlas/web/dist/welcome" "$ROOT/site/atlas/"
cp "$WORK/atlas/web/dist/favicon.svg" "$WORK/atlas/web/dist/icons.svg" "$ROOT/site/atlas/"
