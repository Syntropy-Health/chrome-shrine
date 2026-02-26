# 🥗 Syntropy Food Insights Extension

AI-powered Chrome extension that provides comprehensive food product analysis, ingredient insights, safety alerts, and personalized recommendations while you browse food websites.

## ✨ Features

- **🔍 Intelligent Food Detection**: Automatically detects food products on Amazon Fresh, CookUnity, and other food websites
- **🤖 AI-Powered Analysis**: Uses GPT-4 Vision to analyze ingredients, nutrition labels, and product images
- **💬 Hover Cards**: Interactive hover cards with instant food insights
- **⚠️ Safety Alerts**: Real-time FDA and USDA recall notifications
- **📊 Health Scoring**: Comprehensive safety and health scores for every product
- **🎯 Personalized Recommendations**: Customized advice based on your dietary preferences and restrictions
- **📸 Image Processing**: Automatically extracts ingredient lists and nutrition facts from product images

## 🚀 Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SyntropyHealth/syntropy-dieton.git
   cd syntropy-dieton
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key**
   - Get an OpenAI API key from [platform.openai.com](https://platform.openai.com)
   - You'll add this in the extension popup after loading

4. **Build the extension**
   ```bash
   npm run build
   ```

5. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from your project directory

### Configuration

1. Click the extension icon in your browser toolbar
2. Enter your OpenAI API key
3. Select your preferred model (GPT-4 Vision recommended)
4. Configure features and preferences
5. Click "Save Configuration"

## 🎯 Usage

### Basic Usage

1. **Visit a supported food website**:
   - [Amazon Fresh](https://www.amazon.com/alm/storefront/fresh/)
   - [CookUnity](https://www.cookunity.com/meals/)
   - Any food-related website (generic detection)

2. **Hover over food products** to see instant insights in a hover card

3. **View detailed analysis** by clicking "View Full Analysis"

### Supported Websites

| Website | Status | Features |
|---------|--------|----------|
| Amazon Fresh | ✅ Full Support | Product detection, ingredient extraction, image analysis |
| CookUnity | ✅ Full Support | Meal detection, chef info, nutrition facts |
| Generic Sites | ⚠️ Best Effort | Heuristic-based detection, basic analysis |

### Example Workflows

#### Workflow 1: Quick Product Check
1. Navigate to Amazon Fresh
2. Hover over any product
3. See instant safety and health scores
4. Check for recalls and allergens

#### Workflow 2: Detailed Analysis
1. Hover over a product
2. Click "View Full Analysis"
3. Review comprehensive insights
4. Get personalized recommendations
5. Save notes for future reference

#### Workflow 3: Safety Monitoring
1. Extension automatically checks for recalls
2. Alerts appear on hover cards
3. Critical recalls shown prominently
4. Links to official FDA/USDA notices

## 🏗️ Architecture

The extension is built with a modular architecture consisting of 4 key modules:

### Module 1: Web Scraping/Ingestion
Located in `src/modules/scraper/`

- **Purpose**: Extract food product data from websites
- **Components**:
  - `ScraperManager`: Orchestrates scraper selection
  - `AmazonFreshScraper`: Amazon-specific extraction
  - `CookUnityScraper`: CookUnity-specific extraction
  - `GenericScraper`: Fallback for other sites

**Key Features**:
- Site-specific DOM parsing
- Image prioritization by size and position
- Ingredient list extraction
- Nutrition facts parsing

### Module 2: Real-time Data Integrations
Located in `src/modules/integrations/`

- **Purpose**: Fetch food safety data from official sources
- **Components**:
  - `IntegrationManager`: Coordinates multiple data sources
  - `FDAIntegration`: FDA recall database
  - `USDAIntegration`: USDA FSIS recall database

**Key Features**:
- Parallel API requests
- Smart caching (6-hour TTL)
- Automatic deduplication
- Error resilience

### Module 3: LLM/Agent Processing
Located in `src/modules/ai/`

- **Purpose**: AI-powered analysis using Vercel AI SDK
- **Components**:
  - `FoodAnalysisAgent`: Main orchestrator
  - `ImageProcessor`: Vision-based extraction
  - `schemas.ts`: Zod schemas for structured outputs

**Key Features**:
- Structured output generation
- Image-to-text extraction
- Multi-modal analysis
- Personalized recommendations

**AI SDK Integration**:
```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { aiAnalysisSchema } from './schemas';

const result = await generateObject({
  model: openai('gpt-4-vision-preview'),
  schema: aiAnalysisSchema,
  messages: [/* ... */],
});
```

### Module 4: UI & Display
Located in `src/modules/ui/`

- **Purpose**: User interface components
- **Components**:
  - `HoverCard`: Floating product insights
  - `components.ts`: Reusable UI elements

**Key Features**:
- Smooth animations
- Responsive positioning
- Accessibility support
- Tailwind CSS styling

## 📁 Project Structure

```
syntropy-dieton/
├── src/
│   ├── background/
│   │   └── service-worker.ts       # Background tasks
│   ├── content/
│   │   ├── content.ts              # Content script
│   │   └── content.css             # Content styles
│   ├── popup/
│   │   ├── popup.html              # Extension popup
│   │   ├── popup.ts                # Popup logic
│   │   └── popup.css               # Popup styles
│   ├── modules/
│   │   ├── scraper/                # Module 1: Web scraping
│   │   │   ├── index.ts
│   │   │   ├── amazon-fresh.ts
│   │   │   ├── cookunity.ts
│   │   │   └── generic.ts
│   │   ├── integrations/           # Module 2: Data integrations
│   │   │   ├── index.ts
│   │   │   ├── fda-recalls.ts
│   │   │   └── usda-recalls.ts
│   │   ├── ai/                     # Module 3: AI processing
│   │   │   ├── index.ts
│   │   │   ├── agent.ts
│   │   │   ├── image-processor.ts
│   │   │   └── schemas.ts
│   │   └── ui/                     # Module 4: UI components
│   │       ├── index.ts
│   │       ├── hover-card.ts
│   │       └── components.ts
│   ├── utils/                      # Utilities
│   │   ├── dom-utils.ts
│   │   ├── image-utils.ts
│   │   └── storage.ts
│   ├── config/
│   │   └── config.ts               # Configuration
│   └── types/
│       └── index.ts                # TypeScript types
├── public/
│   ├── icons/                      # Extension icons
│   └── styles/                     # Global styles
├── manifest.json                   # Extension manifest
├── package.json
├── tsconfig.json
├── webpack.config.js
├── tailwind.config.js
├── README.md
└── CONTRIB.md
```

## 🔧 Development

### Prerequisites

- Node.js 18+ and npm
- Chrome browser
- OpenAI API key

### Development Mode

```bash
# Start development build with watch mode
npm run dev
```

Changes will automatically rebuild. Reload the extension in Chrome to see updates.

### Building for Production

```bash
# Create optimized production build
npm run build
```

### Type Checking

```bash
# Run TypeScript type checking
npm run type-check
```

### Linting

```bash
# Run ESLint
npm run lint
```

## 🎨 Customization & Extension

### Adding a New Website Scraper

1. Create a new scraper in `src/modules/scraper/`:

```typescript
import type { IScraper, FoodProduct } from '@types/index';

export class YourSiteScraper implements IScraper {
  name = 'Your Site';
  domains = ['yoursite.com'];

  isSupported(document: Document): boolean {
    // Detection logic
  }

  async extractProducts(document: Document): Promise<FoodProduct[]> {
    // Extraction logic
  }

  async extractProductFromElement(element: Element): Promise<FoodProduct | null> {
    // Element-specific extraction
  }
}
```

2. Register in `src/modules/scraper/index.ts`:

```typescript
const SCRAPERS: IScraper[] = [
  new AmazonFreshScraper(),
  new CookUnityScraper(),
  new YourSiteScraper(), // Add here
  new GenericScraper(),
];
```

### Adding a New Data Integration

1. Implement the `IIntegration` interface:

```typescript
import type { IIntegration, FoodRecall } from '@types/index';

export class YourIntegration implements IIntegration {
  name = 'Your Source';

  async searchRecalls(query: string): Promise<FoodRecall[]> {
    // Search implementation
  }

  async getRecentRecalls(limit?: number): Promise<FoodRecall[]> {
    // Recent recalls implementation
  }
}
```

2. Register in `src/modules/integrations/index.ts`

### Customizing AI Analysis

Modify `src/modules/ai/schemas.ts` to add new analysis fields:

```typescript
export const aiAnalysisSchema = z.object({
  // ... existing fields
  customField: z.string().describe('Your custom analysis field'),
});
```

Update prompts in `src/modules/ai/agent.ts` to generate your custom fields.

## 🔐 Security & Privacy

- **API keys** are stored securely in Chrome's sync storage
- **No data** is sent to third parties except OpenAI for analysis
- **Local caching** reduces API calls and improves privacy
- **User preferences** are stored locally

## 📊 Performance

- **Lazy loading**: Analysis only runs on hover
- **Smart caching**: 1-hour analysis cache, 6-hour recall cache
- **Optimized images**: Prioritizes images by size and position
- **Throttled processing**: Prevents excessive API calls

## 🤝 Contributing

See [CONTRIB.md](./CONTRIB.md) for detailed contribution guidelines.

Quick overview:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [Vercel AI SDK](https://sdk.vercel.ai/)
- Uses [OpenAI GPT-4 Vision](https://platform.openai.com)
- Data from [FDA openFDA API](https://open.fda.gov/)
- Data from [USDA FSIS](https://www.fsis.usda.gov/)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/SyntropyHealth/syntropy-dieton/issues)
- **Discussions**: [GitHub Discussions](https://github.com/SyntropyHealth/syntropy-dieton/discussions)
- **Email**: support@syntropyhealth.com

## 🗺️ Roadmap

- [ ] Support for more grocery websites
- [ ] Offline mode with local models
- [ ] Mobile app companion
- [ ] Barcode scanning
- [ ] Recipe recommendations
- [ ] Shopping list integration
- [ ] Price comparison
- [ ] Nutrition tracking

---

Made with ❤️ by [Syntropy Health](https://syntropyhealth.com)
