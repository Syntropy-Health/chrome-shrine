#!/bin/bash

# Automated Chrome Web Store Deployment
# Builds, packages, and uploads extension to Chrome Web Store

set -e

echo "🚀 Deploying Syntropy Food Extension to Chrome Web Store"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for required environment variables
check_env_vars() {
    local missing=0

    if [ -z "$CHROME_WEBSTORE_CLIENT_ID" ]; then
        echo "${RED}✗${NC} CHROME_WEBSTORE_CLIENT_ID not set"
        missing=1
    fi

    if [ -z "$CHROME_WEBSTORE_CLIENT_SECRET" ]; then
        echo "${RED}✗${NC} CHROME_WEBSTORE_CLIENT_SECRET not set"
        missing=1
    fi

    if [ -z "$CHROME_WEBSTORE_REFRESH_TOKEN" ]; then
        echo "${RED}✗${NC} CHROME_WEBSTORE_REFRESH_TOKEN not set"
        missing=1
    fi

    if [ -z "$CHROME_EXTENSION_ID" ]; then
        echo "${RED}✗${NC} CHROME_EXTENSION_ID not set"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        echo ""
        echo "Please set the required environment variables."
        echo "See deployment/README.md for instructions."
        exit 1
    fi

    echo "${GREEN}✓${NC} All required environment variables set"
    echo ""
}

# Load .env file if it exists
if [ -f "../.env" ]; then
    echo "📝 Loading environment variables from .env"
    export $(cat ../.env | grep -v '^#' | xargs)
    echo ""
fi

# Check environment variables
check_env_vars

# Build and package
echo "📦 Building and packaging extension..."
./package.sh

if [ $? -ne 0 ]; then
    echo "${RED}✗${NC} Build and package failed"
    exit 1
fi

VERSION=$(node -p "require('../package.json').version")
PACKAGE_FILE="syntropy-extension-v${VERSION}.zip"

# Get OAuth access token
echo "🔑 Obtaining access token..."
ACCESS_TOKEN=$(curl -s "https://oauth2.googleapis.com/token" \
  -d "client_id=${CHROME_WEBSTORE_CLIENT_ID}" \
  -d "client_secret=${CHROME_WEBSTORE_CLIENT_SECRET}" \
  -d "refresh_token=${CHROME_WEBSTORE_REFRESH_TOKEN}" \
  -d "grant_type=refresh_token" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin').toString()).access_token")

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "undefined" ]; then
    echo "${RED}✗${NC} Failed to obtain access token"
    echo "Check your Chrome Web Store API credentials"
    exit 1
fi

echo "${GREEN}✓${NC} Access token obtained"
echo ""

# Upload extension
echo "⬆️  Uploading extension to Chrome Web Store..."
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "x-goog-api-version: 2" \
  -X PUT \
  -T "$PACKAGE_FILE" \
  "https://www.googleapis.com/upload/chromewebstore/v1.1/items/${CHROME_EXTENSION_ID}")

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "${GREEN}✓${NC} Upload successful"
    echo ""
else
    echo "${RED}✗${NC} Upload failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

# Publish extension
echo "📤 Publishing extension..."
PUBLISH_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "x-goog-api-version: 2" \
  -H "Content-Length: 0" \
  -X POST \
  "https://www.googleapis.com/chromewebstore/v1.1/items/${CHROME_EXTENSION_ID}/publish")

HTTP_CODE=$(echo "$PUBLISH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$PUBLISH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "${GREEN}✓${NC} Publish successful"
    echo ""
else
    echo "${YELLOW}⚠${NC} Publish returned HTTP $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    echo ""
    echo "Note: Extension may require manual review before publishing"
    echo ""
fi

# Create GitHub release (optional)
if command -v gh &> /dev/null; then
    echo "📝 Creating GitHub release..."
    gh release create "v${VERSION}" \
        "$PACKAGE_FILE" \
        --title "v${VERSION}" \
        --notes "Release v${VERSION}" || echo "${YELLOW}⚠${NC} GitHub release creation skipped (gh CLI not configured or no permissions)"
    echo ""
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${GREEN}✅ Deployment complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Version: $VERSION"
echo "Package: $PACKAGE_FILE"
echo ""
echo "Chrome Web Store:"
echo "https://chrome.google.com/webstore/detail/${CHROME_EXTENSION_ID}"
echo ""
echo "Monitor deployment status:"
echo "https://chrome.google.com/webstore/devconsole"
echo ""
