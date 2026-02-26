#!/bin/bash

# Build Verification Script
# Runs comprehensive checks on the extension build

set -e

echo "🔍 Verifying Syntropy Food Extension Build"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check 1: Dependencies installed
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    pass "node_modules exists"
else
    fail "node_modules not found - run 'npm install'"
fi
echo ""

# Check 2: Build output exists
echo "🔨 Checking build output..."
if [ -d "dist" ]; then
    pass "dist directory exists"

    # Check required files
    if [ -f "dist/manifest.json" ]; then
        pass "manifest.json exists"
    else
        fail "manifest.json missing"
    fi

    if [ -f "dist/background/service-worker.js" ]; then
        pass "background/service-worker.js exists"
    else
        fail "background/service-worker.js missing"
    fi

    if [ -f "dist/content/content.js" ]; then
        pass "content/content.js exists"
    else
        fail "content/content.js missing"
    fi

    if [ -f "dist/popup/popup.html" ]; then
        pass "popup/popup.html exists"
    else
        fail "popup/popup.html missing"
    fi
else
    fail "dist directory not found - run 'npm run build'"
fi
echo ""

# Check 3: Manifest validation
echo "📋 Validating manifest..."
if [ -f "dist/manifest.json" ]; then
    # Check manifest version
    MANIFEST_VERSION=$(node -p "require('./dist/manifest.json').manifest_version" 2>/dev/null || echo "")
    if [ "$MANIFEST_VERSION" = "3" ]; then
        pass "Manifest V3"
    else
        fail "Manifest version is not 3 (found: $MANIFEST_VERSION)"
    fi

    # Check version matches package.json
    PKG_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "")
    MANIFEST_PKG_VERSION=$(node -p "require('./dist/manifest.json').version" 2>/dev/null || echo "")

    if [ "$PKG_VERSION" = "$MANIFEST_PKG_VERSION" ]; then
        pass "Version matches ($PKG_VERSION)"
    else
        fail "Version mismatch (package: $PKG_VERSION, manifest: $MANIFEST_PKG_VERSION)"
    fi

    # Check required permissions
    HAS_STORAGE=$(node -p "require('./dist/manifest.json').permissions.includes('storage')" 2>/dev/null || echo "false")
    if [ "$HAS_STORAGE" = "true" ]; then
        pass "Storage permission included"
    else
        warn "Storage permission not found"
    fi
fi
echo ""

# Check 4: TypeScript compilation
echo "📝 Checking TypeScript..."
if npm run type-check > /dev/null 2>&1; then
    pass "TypeScript types valid"
else
    fail "TypeScript errors found - run 'npm run type-check'"
fi
echo ""

# Check 5: Bundle size
echo "📊 Checking bundle size..."
if [ -d "dist" ]; then
    SIZE=$(du -sb dist 2>/dev/null | cut -f1)
    SIZE_MB=$((SIZE / 1024 / 1024))

    echo "   Bundle size: ${SIZE_MB}MB"

    if [ $SIZE -lt 104857600 ]; then  # 100MB
        pass "Bundle within Chrome Web Store limit (100MB)"
    else
        fail "Bundle exceeds 100MB limit"
    fi
fi
echo ""

# Check 6: No secrets in code
echo "🔐 Checking for secrets..."
SECRET_FOUND=0

if grep -r "sk-[A-Za-z0-9]\{40,\}" src/ 2>/dev/null; then
    fail "Potential OpenAI API key found in src/"
    SECRET_FOUND=1
fi

if grep -r "ghp_[A-Za-z0-9]\{36,\}" src/ 2>/dev/null; then
    fail "Potential GitHub token found in src/"
    SECRET_FOUND=1
fi

if [ $SECRET_FOUND -eq 0 ]; then
    pass "No secrets found in source code"
fi
echo ""

# Check 7: Required icons
echo "🎨 Checking icons..."
for size in 16 48 128; do
    if [ -f "public/icons/icon${size}.png" ] || [ -f "dist/icons/icon${size}.png" ]; then
        pass "icon${size}.png exists"
    else
        warn "icon${size}.png not found (will need to create)"
    fi
done
echo ""

# Check 8: Module structure
echo "📁 Checking module structure..."
MODULES=("scraper" "integrations" "ai" "ui")
for module in "${MODULES[@]}"; do
    if [ -d "src/modules/$module" ]; then
        pass "Module '$module' exists"
    else
        fail "Module '$module' missing"
    fi
done
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! ($PASSED passed)${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Extension is ready to load in Chrome!"
    echo ""
    echo "Next steps:"
    echo "1. Go to chrome://extensions/"
    echo "2. Enable Developer mode"
    echo "3. Click 'Load unpacked'"
    echo "4. Select the 'dist' folder"
    echo ""
    exit 0
else
    echo -e "${RED}❌ ${FAILED} checks failed${NC} (${PASSED} passed)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Please fix the issues above before deploying."
    echo ""
    exit 1
fi
