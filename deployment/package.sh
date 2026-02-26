#!/bin/bash

# Package Extension for Chrome Web Store
# Creates a production-ready .zip file

set -e

echo "📦 Packaging Syntropy Food Extension for Chrome Web Store"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get version from package.json
VERSION=$(node -p "require('../package.json').version")
echo "📋 Version: $VERSION"
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf ../dist
rm -f syntropy-extension-*.zip
echo "${GREEN}✓${NC} Clean complete"
echo ""

# Build extension
echo "🔨 Building extension..."
cd ..
npm run build
cd deployment

if [ ! -d "../dist" ]; then
    echo "${RED}✗${NC} Build failed - dist directory not found"
    exit 1
fi

echo "${GREEN}✓${NC} Build complete"
echo ""

# Validate manifest
echo "🔍 Validating manifest..."
if [ ! -f "../dist/manifest.json" ]; then
    echo "${RED}✗${NC} manifest.json not found in dist"
    exit 1
fi

# Check manifest version matches package.json
MANIFEST_VERSION=$(node -p "require('../dist/manifest.json').version")
if [ "$MANIFEST_VERSION" != "$VERSION" ]; then
    echo "${YELLOW}⚠${NC} Warning: Version mismatch"
    echo "  package.json: $VERSION"
    echo "  manifest.json: $MANIFEST_VERSION"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "${GREEN}✓${NC} Manifest valid"
echo ""

# Create package
PACKAGE_NAME="syntropy-extension-v${VERSION}.zip"
echo "📦 Creating package: $PACKAGE_NAME"

cd ../dist
zip -r "../deployment/$PACKAGE_NAME" . -x "*.DS_Store" "*.map"
cd ../deployment

if [ -f "$PACKAGE_NAME" ]; then
    FILE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
    echo "${GREEN}✓${NC} Package created successfully"
    echo "  File: $PACKAGE_NAME"
    echo "  Size: $FILE_SIZE"
    echo ""
else
    echo "${RED}✗${NC} Package creation failed"
    exit 1
fi

# Validate package size (Chrome Web Store limit: 100MB)
FILE_SIZE_BYTES=$(stat -f%z "$PACKAGE_NAME" 2>/dev/null || stat -c%s "$PACKAGE_NAME" 2>/dev/null)
MAX_SIZE=$((100 * 1024 * 1024)) # 100MB

if [ "$FILE_SIZE_BYTES" -gt "$MAX_SIZE" ]; then
    echo "${RED}✗${NC} Package exceeds Chrome Web Store limit (100MB)"
    echo "  Current size: $(($FILE_SIZE_BYTES / 1024 / 1024))MB"
    exit 1
fi

# Optional: Create checksums
echo "🔐 Generating checksums..."
if command -v shasum &> /dev/null; then
    shasum -a 256 "$PACKAGE_NAME" > "$PACKAGE_NAME.sha256"
    echo "${GREEN}✓${NC} SHA256 checksum created"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${GREEN}✅ Package ready for upload!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Go to Chrome Web Store Developer Dashboard"
echo "   https://chrome.google.com/webstore/devconsole"
echo ""
echo "2. Upload: deployment/$PACKAGE_NAME"
echo ""
echo "3. Submit for review"
echo ""
echo "Or use automated deployment:"
echo "   ./deploy.sh"
echo ""
