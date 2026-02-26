# 🚀 Quick Start Guide

Get up and running with Syntropy Food Extension in 5 minutes!

## Prerequisites

- Node.js 18+ installed ([Download](https://nodejs.org/))
- Chrome browser
- OpenAI API key ([Get one](https://platform.openai.com/api-keys))

## Installation Steps

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/SyntropyHealth/syntropy-dieton.git
cd syntropy-dieton

# Run automated setup
./setup.sh
```

Or manually:

```bash
# Install dependencies
npm install

# Build the extension
npm run build
```

### 2. Load in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Navigate to and select the `dist` folder in your project

### 3. Configure API Key

1. Click the extension icon (🥗) in your browser toolbar
2. Enter your OpenAI API key
3. Select your preferred model (GPT-4 Vision recommended)
4. Click **"Save Configuration"**

### 4. Test It Out!

Visit one of these sites to see it in action:

- [Amazon Fresh](https://www.amazon.com/alm/storefront/fresh/)
- [CookUnity](https://www.cookunity.com/meals/)

Hover over any food product to see instant insights!

## Development Workflow

### Start Development Mode

```bash
npm run dev
```

This starts a watch mode that automatically rebuilds when you make changes.

### After Making Changes

1. Save your files
2. Go to `chrome://extensions/`
3. Click the **refresh icon** on your extension card
4. Reload the test page

### Common Commands

```bash
npm run dev          # Development mode with watch
npm run build        # Production build
npm run type-check   # TypeScript type checking
npm run lint         # Run ESLint
```

## Testing Your Changes

### Quick Test Checklist

- [ ] Extension loads without errors in `chrome://extensions/`
- [ ] No console errors in DevTools
- [ ] Hover cards appear on supported sites
- [ ] Configuration saves properly
- [ ] Analysis results are displayed correctly

### Debug Tools

**Background Script:**
- Go to `chrome://extensions/`
- Click "Inspect views: service worker"

**Content Script:**
- Open DevTools on any page (F12)
- Console logs will appear here

**Popup:**
- Right-click extension icon
- Select "Inspect popup"

## Project Structure

```
src/
├── modules/
│   ├── scraper/        # Web scraping (add new site scrapers here)
│   ├── integrations/   # API integrations (add data sources here)
│   ├── ai/            # AI analysis (modify prompts/schemas here)
│   └── ui/            # UI components (add UI elements here)
├── content/           # Content script (runs on pages)
├── background/        # Background service worker
├── popup/             # Extension popup
└── utils/             # Shared utilities
```

## Adding Features

### Add a New Website Scraper

1. Create `src/modules/scraper/yoursite.ts`:

```typescript
import type { IScraper, FoodProduct } from '@types/index';

export class YourSiteScraper implements IScraper {
  name = 'Your Site';
  domains = ['yoursite.com'];

  isSupported(document: Document): boolean {
    return document.location.href.includes('yoursite.com');
  }

  async extractProducts(document: Document): Promise<FoodProduct[]> {
    // Your extraction logic
    return [];
  }

  async extractProductFromElement(element: Element): Promise<FoodProduct | null> {
    // Element-specific extraction
    return null;
  }
}
```

2. Register in `src/modules/scraper/index.ts`:

```typescript
import { YourSiteScraper } from './yoursite';

const SCRAPERS: IScraper[] = [
  new AmazonFreshScraper(),
  new CookUnityScraper(),
  new YourSiteScraper(), // Add here
  new GenericScraper(),
];
```

3. Test on your target site!

### Modify AI Analysis

1. Update schema in `src/modules/ai/schemas.ts`
2. Update prompts in `src/modules/ai/agent.ts`
3. Test with various products

## Troubleshooting

### Extension won't load

- Check for TypeScript errors: `npm run type-check`
- Rebuild: `npm run build`
- Check Chrome DevTools console for errors

### Hover cards not appearing

- Check if site is detected: Open DevTools and look for `[Syntropy]` logs
- Verify features are enabled in extension popup
- Check if API key is configured

### Analysis not working

- Verify API key is correct
- Check API quota/billing
- Look for errors in background service worker console

### Build errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Need Help?

- 📖 Full docs: [README.md](./README.md)
- 👥 Contributing: [CONTRIB.md](./CONTRIB.md)
- 🐛 Issues: [GitHub Issues](https://github.com/SyntropyHealth/syntropy-dieton/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/SyntropyHealth/syntropy-dieton/discussions)

## Next Steps

- ⭐ Star the repo if you find it useful
- 🍴 Fork it to add your own features
- 🤝 Submit a PR with improvements
- 📝 Share your feedback

Happy hacking! 🚀
