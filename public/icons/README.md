# Extension Icons

This directory should contain the extension icons in the following sizes:

- `icon16.png` - 16x16 pixels (browser toolbar)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Creating Icons

You can create icons using any image editor. The icon should represent food/nutrition (e.g., a fork and knife, food symbol, or health icon).

### Quick Icon Generation

Use an online tool like:
- https://www.favicon-generator.org/
- https://realfavicongenerator.net/

Or create them programmatically:

```bash
# Using ImageMagick (if installed)
convert -size 128x128 -background none -fill "#2563eb" \
  -gravity center label:"🥗" icon128.png

convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

### Recommended Design

- **Color scheme**: Blue (#2563eb) and green (#16a34a)
- **Style**: Modern, clean, minimal
- **Symbol**: Food-related (fork, plate, leaf, etc.)
- **Background**: Transparent or white
