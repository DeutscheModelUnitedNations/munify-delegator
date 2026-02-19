#!/bin/bash
# Test sourcemap upload to Bugsink locally
# This helps validate credentials and upload process before CI
#
# Prerequisites:
#   - sentry-cli v2 installed: bun add -g @sentry/cli@2
#   - .env.bugsink file with BUGSINK_URL and BUGSINK_TOKEN
#
# Usage:
#   ./scripts/bugsink/test-sourcemap-upload.sh [build-dir]
#
# If build-dir is not provided, it will run bun run build first

set -e

# Load credentials from .env.bugsink
if [ -f .env.bugsink ]; then
  export $(grep -v '^#' .env.bugsink | xargs)
else
  echo "Error: .env.bugsink file not found"
  echo "Create it with:"
  echo "  BUGSINK_URL=https://bugsink.example.com"
  echo "  BUGSINK_TOKEN=your-token-here"
  exit 1
fi

# Map to Sentry CLI expected env vars
export SENTRY_AUTH_TOKEN="$BUGSINK_TOKEN"
export SENTRY_URL="$BUGSINK_URL"
export SENTRY_PROJECT="delegator"
# Bugsink requires this specific org name (it ignores the actual value)
export SENTRY_ORG="bugsinkhasnoorgs"

echo "=== Bugsink Sourcemap Upload Test ==="
echo "URL: $SENTRY_URL"
echo "Project: $SENTRY_PROJECT"
echo "Token: ${SENTRY_AUTH_TOKEN:0:8}..."
echo ""

# Use bun-installed sentry-cli
SENTRY_CLI="$HOME/.bun/bin/sentry-cli"
if [ ! -f "$SENTRY_CLI" ]; then
  echo "Error: sentry-cli not found at $SENTRY_CLI"
  echo "Install it with: bun add -g @sentry/cli@2"
  echo ""
  echo "IMPORTANT: Use version 2.x - version 3.x has Bugsink compatibility issues"
  exit 1
fi

VERSION=$($SENTRY_CLI --version)
echo "sentry-cli version: $VERSION"
if [[ "$VERSION" == sentry-cli\ 3* ]]; then
  echo "WARNING: sentry-cli v3.x has known issues with Bugsink!"
  echo "Reinstall with: bun add -g @sentry/cli@2"
  exit 1
fi
echo ""

BUILD_DIR="${1:-build}"

# Build if no directory provided and build doesn't exist
if [ -z "$1" ] && [ ! -d "$BUILD_DIR" ]; then
  echo "=== Building project ==="
  bun run build
fi

if [ ! -d "$BUILD_DIR" ]; then
  echo "Error: Build directory not found at $BUILD_DIR"
  exit 1
fi

echo ""
echo "=== Sourcemap files found ==="
find "$BUILD_DIR" -name "*.map" | head -20
MAPCOUNT=$(find "$BUILD_DIR" -name "*.map" | wc -l)
echo "Total: $MAPCOUNT sourcemap files"
echo ""

# Inject debug IDs
echo "=== Injecting debug IDs ==="
$SENTRY_CLI sourcemaps inject "$BUILD_DIR"

echo ""
echo "=== Uploading sourcemaps ==="
$SENTRY_CLI --url "$SENTRY_URL" sourcemaps \
  --org "$SENTRY_ORG" \
  --project "$SENTRY_PROJECT" \
  upload "$BUILD_DIR"

echo ""
echo "=== Upload complete ==="
echo "Check Bugsink at $SENTRY_URL to verify sourcemaps are visible"
