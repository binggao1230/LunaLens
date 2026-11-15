#!/usr/bin/env bash
# Rebuild site/atlas from the vendored upstream source in site/atlas/source/web.
# The only source change is the parent bridge (bridge.patch); site/atlas/data is reused.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SOURCE="$ROOT/site/atlas/source/web"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
cp -a "$SOURCE/." "$WORK/"
mkdir -p "$WORK/public"
rm -rf "$WORK/public/data"
ln -s "$ROOT/site/atlas/data" "$WORK/public/data"
(cd "$WORK" && npm ci --no-audit --no-fund && npm run build)
cp "$WORK/dist/index.html" "$ROOT/site/atlas/index.html"
cp -a "$WORK/dist/assets/." "$ROOT/site/atlas/assets/"
cp -a "$WORK/dist/welcome" "$ROOT/site/atlas/"
cp -a "$WORK/dist/draco/." "$ROOT/site/atlas/draco/"
cp "$WORK/dist/favicon.svg" "$WORK/dist/icons.svg" "$ROOT/site/atlas/"
