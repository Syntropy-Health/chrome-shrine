# Icon Configuration Guide

This document explains how to configure and manage icons and branding assets for the Syntropy Food Extension.

## Overview

The extension uses a flexible icon configuration system that allows you to:
- Configure icon paths via environment variables
- Automatically generate icon sizes from a source image
- Validate icon presence before builds
- Maintain consistent branding across the extension

## Icon Files

### Location
All icons are stored in `public/icons/`

### Available Icons

| File | Size | Purpose |
|------|------|---------|
| `syntropy.png` | 758KB | Main brand logo (high resolution) |
| `favicon-16x16.png` | 847B | 16x16 favicon |
| `favicon-32x32.png` | 2.3KB | 32x32 favicon |
| `icon48.png` | 4.7KB | 48x48 extension icon |
| `icon128.png` | 23KB | 128x128 extension icon |
| `favicon.ico` | 16KB | ICO format favicon |
| `Banner.png` | 309KB | Banner for promotional materials |

## Configuration

### Environment Variables

Icon paths can be configured in your `.env` file. If not specified, default values are used.

```env
# Main logo (high resolution brand image)
ICON_LOGO=icons/syntropy.png

# Extension icons for Chrome (16x16, 48x48, 128x128)
ICON_16=icons/favicon-16x16.png
ICON_32=icons/favicon-32x32.png
ICON_48=icons/icon48.png
ICON_128=icons/icon128.png

# Favicon for HTML pages
ICON_FAVICON=icons/favicon.ico

# Banner image for promotional/about pages
ICON_BANNER=icons/Banner.png
```

### Configuration File

Icon configuration is managed in `config/icons.config.js`. This file:
- Loads environment variables
- Provides default paths
- Exports configuration for webpack and build scripts

## Generating Icons

### Automatic Generation

The extension includes a script to automatically generate required icon sizes from the source logo.

```bash
# Generate missing icons
npm run generate-icons
```

This will:
1. Read `syntropy.png` as the source
2. Generate `icon48.png` (48x48)
3. Generate `icon128.png` (128x128)
4. Skip files that already exist

### Manual Generation

If you prefer to use your own tools:

1. Create the following sizes from your logo:
   - 16x16 → `favicon-16x16.png`
   - 32x32 → `favicon-32x32.png`
   - 48x48 → `icon48.png`
   - 128x128 → `icon128.png`

2. Ensure:
   - PNG format with transparency
   - Square aspect ratio
   - Logo centered with padding
   - Optimized file size

## Build Process

### Development Build

```bash
npm run dev
```

During development builds:
- Icon validation warnings are shown
- Build continues even if icons are missing
- Manifest is processed with icon paths

### Production Build

```bash
npm run build
```

Production builds:
1. Automatically run `npm run generate-icons` (via prebuild script)
2. Validate all icon files exist
3. **Fail if any icons are missing**
4. Process manifest.json with icon paths
5. Copy all assets to `dist/`

## Webpack Integration

The webpack configuration automatically:

1. **Validates Icons**: Checks that all configured icons exist
2. **Processes Manifest**: Injects icon paths into `manifest.json`
3. **Copies Assets**: Copies `public/` directory to `dist/`

### Manifest Processing

Icon paths are automatically injected into the manifest:

```json
{
  "icons": {
    "16": "icons/favicon-16x16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/favicon-16x16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

## HTML Pages

### Favicon Integration

The popup HTML includes favicon links:

```html
<link rel="icon" type="image/x-icon" href="../icons/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="../icons/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="../icons/favicon-32x32.png">
```

## Customizing Icons

### Replacing the Logo

To use a different logo:

1. Replace `public/icons/syntropy.png` with your logo
2. Ensure it's:
   - High resolution (at least 512x512)
   - Square aspect ratio
   - PNG with transparency
3. Regenerate icons:
   ```bash
   npm run generate-icons
   ```

### Using Custom Icon Paths

To use different icon files:

1. Add your icons to `public/icons/`
2. Update `.env` with new paths:
   ```env
   ICON_48=icons/my-custom-icon-48.png
   ICON_128=icons/my-custom-icon-128.png
   ```
3. Rebuild:
   ```bash
   npm run build
   ```

## Troubleshooting

### Icons Not Appearing

1. **Check file paths**: Ensure icons exist in `public/icons/`
2. **Rebuild**: Run `npm run build`
3. **Clear cache**: Delete `dist/` and rebuild

### Build Fails with Icon Errors

```bash
# Generate missing icons
npm run generate-icons

# Verify they exist
ls -l public/icons/

# Try build again
npm run build
```

### Custom Icons Not Working

1. **Check .env**: Ensure paths are relative to `public/`
2. **Restart dev server**: Changes to .env require restart
3. **Clear webpack cache**: Delete `.next/cache/` if exists

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| Generate Icons | `npm run generate-icons` | Create icon sizes from logo |
| Process Manifest | `npm run process-manifest` | Update manifest with icon paths |
| Development | `npm run dev` | Watch mode with icon validation |
| Build | `npm run build` | Production build with icon generation |

## Best Practices

1. **Version Control**
   - Commit source logo (`syntropy.png`)
   - Commit generated icons for consistency
   - Don't commit `.env` (use `.env.example`)

2. **Icon Quality**
   - Use high-resolution source images
   - Maintain transparency for flexibility
   - Optimize file sizes for performance

3. **Updates**
   - Regenerate all icons when changing logo
   - Test in browser after icon changes
   - Verify manifest.json in dist/

4. **Environment Variables**
   - Use defaults for standard setup
   - Override only when necessary
   - Document custom paths in README

## Technical Details

### Icon Generation

Uses [sharp](https://sharp.pixelplumbing.com/) for:
- High-quality image resizing
- Transparency preservation
- Automatic format optimization

### Configuration Loading

1. `.env` file loaded via dotenv
2. `config/icons.config.js` provides defaults
3. Webpack uses config during build
4. Paths validated before production build

### File Structure

```
chrome-dieton/
├── public/
│   └── icons/
│       ├── syntropy.png       # Source logo
│       ├── favicon-16x16.png  # Generated
│       ├── favicon-32x32.png  # Generated
│       ├── icon48.png         # Generated
│       ├── icon128.png        # Generated
│       ├── favicon.ico        # Favicon
│       └── Banner.png         # Promotional
├── config/
│   └── icons.config.js        # Icon configuration
├── scripts/
│   ├── generate-icons.js      # Icon generator
│   └── process-manifest.js    # Manifest processor
└── .env                       # Environment variables
```

## Resources

- [Chrome Extension Icons Guide](https://developer.chrome.com/docs/extensions/mv3/manifest/icons/)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Favicon Best Practices](https://www.w3.org/2005/10/howto-favicon)
