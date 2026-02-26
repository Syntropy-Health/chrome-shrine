#!/bin/bash

# Syntropy Food Extension Setup Script
# This script sets up the development environment

set -e

echo "🥗 Setting up Syntropy Food Extension..."
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Create icon placeholders
echo "🎨 Creating icon placeholders..."
mkdir -p public/icons
mkdir -p public/styles

# Create a simple placeholder using text (requires ImageMagick, otherwise skip)
if command -v convert &> /dev/null; then
    echo "Creating icons with ImageMagick..."
    convert -size 128x128 -background "#2563eb" -fill white \
            -gravity center -font Arial-Bold -pointsize 72 label:"SF" \
            public/icons/icon128.png 2>/dev/null || echo "⚠️  ImageMagick creation failed, using placeholder"

    convert public/icons/icon128.png -resize 48x48 public/icons/icon48.png 2>/dev/null || true
    convert public/icons/icon128.png -resize 16x16 public/icons/icon16.png 2>/dev/null || true
    echo "✅ Icons created"
else
    echo "⚠️  ImageMagick not installed. Please create icons manually."
    echo "   See public/icons/README.md for instructions."
fi
echo ""

# Create empty CSS file if needed
touch public/styles/tailwind.css

# Build the extension
echo "🔨 Building extension..."
npm run build
echo "✅ Extension built successfully"
echo ""

# Print next steps
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Get an OpenAI API key from https://platform.openai.com"
echo "2. Open Chrome and go to chrome://extensions/"
echo "3. Enable 'Developer mode' (top right)"
echo "4. Click 'Load unpacked' and select the 'dist' folder"
echo "5. Click the extension icon and configure your API key"
echo ""
echo "For development:"
echo "  npm run dev    # Start development mode with watch"
echo "  npm run build  # Build for production"
echo ""
echo "Happy coding! 🚀"
