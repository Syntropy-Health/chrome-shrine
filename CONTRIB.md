# Contributing to Syntropy Food Extension

Thank you for your interest in contributing to Syntropy Food Extension! This document provides guidelines and instructions for developers who want to contribute to the project.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [Coding Standards](#coding-standards)
- [Module Guidelines](#module-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Review Process](#code-review-process)

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn**
- **Git** for version control
- **Chrome Browser** for testing
- **OpenAI API Key** for AI features
- **TypeScript** knowledge
- Familiarity with Chrome Extension APIs

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/syntropy-dieton.git
   cd syntropy-dieton
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/SyntropyHealth/syntropy-dieton.git
   ```

4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🛠️ Development Setup

### Installation

```bash
# Install dependencies
npm install

# Start development build with watch mode
npm run dev
```

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder

### Hot Reloading

After making changes:
1. The build will automatically update (if using `npm run dev`)
2. Click the refresh icon on the extension card in `chrome://extensions/`
3. Reload the test page

## 🏗️ Architecture Overview

### Module System

The extension uses a 4-module architecture:

```
Module 1: Scraper (Web Scraping & Ingestion)
  ↓
Module 2: Integrations (Real-time Data)
  ↓
Module 3: AI (LLM Processing)
  ↓
Module 4: UI (Display & Interaction)
```

### Data Flow

```
Page Load → Scraper Detection → Product Extraction
     ↓
User Hover → Quick Analysis → Display Hover Card
     ↓
User Click → Full Analysis → AI Processing → Recall Check → Display Results
```

### Key Files

| File | Purpose | When to Modify |
|------|---------|----------------|
| `src/types/index.ts` | Type definitions | Adding new data structures |
| `src/config/config.ts` | Configuration | Adding settings |
| `src/modules/scraper/` | Web scraping | Supporting new sites |
| `src/modules/integrations/` | Data sources | Adding API integrations |
| `src/modules/ai/` | AI analysis | Changing analysis logic |
| `src/modules/ui/` | UI components | Updating interface |

## 📏 Coding Standards

### TypeScript

- **Always use TypeScript** - no plain JavaScript files
- **Strict mode enabled** - fix all type errors
- **No `any` types** - use proper types or `unknown`
- **Interface over type** for object shapes (except for unions)
- **Prefer `const`** over `let`

### Code Style

```typescript
// ✅ Good
interface ProductData {
  id: string;
  name: string;
  ingredients: Ingredient[];
}

async function fetchProduct(id: string): Promise<ProductData> {
  const response = await fetch(`/api/products/${id}`);
  return response.json();
}

// ❌ Bad
function fetchProduct(id: any) {
  return fetch('/api/products/' + id).then(r => r.json());
}
```

### Naming Conventions

- **PascalCase**: Classes, interfaces, types, enums
- **camelCase**: Functions, variables, methods
- **UPPER_SNAKE_CASE**: Constants
- **kebab-case**: File names

```typescript
// Classes & Interfaces
class FoodAnalysisAgent {}
interface FoodProduct {}
type AnalysisResult = {};

// Functions & Variables
function extractIngredients() {}
const productCount = 10;

// Constants
const MAX_CACHE_ENTRIES = 100;

// Files
amazon-fresh-scraper.ts
food-analysis-agent.ts
```

### Documentation

Every module, class, and public function must have JSDoc comments:

```typescript
/**
 * Extract food products from a webpage
 *
 * Analyzes the DOM structure to identify food product elements
 * and extracts relevant data including names, ingredients, and images.
 *
 * @param document - The document to analyze
 * @param options - Extraction options
 * @returns Array of extracted food products
 *
 * @example
 * ```typescript
 * const products = await extractProducts(document, {
 *   maxProducts: 20,
 *   includeImages: true
 * });
 * ```
 */
async function extractProducts(
  document: Document,
  options: ExtractionOptions
): Promise<FoodProduct[]> {
  // Implementation
}
```

### Error Handling

- **Always catch errors** in async functions
- **Log errors** with context
- **Graceful degradation** - don't break the extension
- **User-friendly messages** for UI errors

```typescript
// ✅ Good
async function analyzeProduct(product: FoodProduct): Promise<Analysis> {
  try {
    const result = await aiAgent.analyze(product);
    return result;
  } catch (error) {
    console.error('[ProductAnalyzer] Analysis failed:', error);
    // Return fallback result
    return createFallbackAnalysis(product);
  }
}

// ❌ Bad
async function analyzeProduct(product: FoodProduct) {
  const result = await aiAgent.analyze(product); // Unhandled rejection
  return result;
}
```

## 🧩 Module Guidelines

### Module 1: Scraper

**When adding a new scraper:**

1. Implement the `IScraper` interface
2. Add comprehensive JSDoc comments
3. Handle dynamic content (SPAs)
4. Test on multiple product pages
5. Register in `ScraperManager`

```typescript
/**
 * Your Site Scraper
 *
 * Extracts food products from YourSite.com.
 * Handles both search results and product detail pages.
 *
 * @module scraper/your-site
 */
export class YourSiteScraper implements IScraper {
  name = 'Your Site';
  domains = ['yoursite.com', 'www.yoursite.com'];

  /**
   * Check if current page is supported
   * @param document - Current document
   * @returns true if this scraper supports the page
   */
  isSupported(document: Document): boolean {
    // Implementation with clear logic
  }

  // ... other methods
}
```

### Module 2: Integrations

**When adding a new integration:**

1. Implement the `IIntegration` interface
2. Use proper error handling
3. Implement caching
4. Document API endpoints
5. Add rate limiting if needed

```typescript
/**
 * Your Data Source Integration
 *
 * Integrates with YourAPI to fetch food safety data.
 *
 * @see https://api.yoursite.com/docs
 * @module integrations/your-source
 */
export class YourIntegration implements IIntegration {
  name = 'Your Source';
  private baseUrl = 'https://api.yoursite.com';

  /**
   * Search for recalls
   * @param query - Search query
   * @returns Array of matching recalls
   */
  async searchRecalls(query: string): Promise<FoodRecall[]> {
    try {
      // Implementation with error handling
    } catch (error) {
      console.error('[YourIntegration] Search error:', error);
      return []; // Graceful degradation
    }
  }
}
```

### Module 3: AI

**When modifying AI logic:**

1. Update Zod schemas in `schemas.ts`
2. Update prompts for clarity
3. Test with various products
4. Monitor token usage
5. Add confidence scores

```typescript
// Update schema
export const yourAnalysisSchema = z.object({
  field: z.string().describe('Clear description for the AI'),
  score: z.number().min(0).max(100),
});

// Update prompt
private buildPrompt(product: FoodProduct): string {
  return `Analyze this product:
Name: ${product.name}

Provide:
1. Clear, specific analysis
2. Evidence-based insights
3. Actionable recommendations`;
}
```

### Module 4: UI

**When adding UI components:**

1. Follow existing design patterns
2. Use Tailwind CSS classes
3. Ensure accessibility (ARIA labels)
4. Make responsive
5. Add smooth animations

```typescript
/**
 * Create a custom component
 * @param data - Component data
 * @returns HTML element
 */
export function createCustomComponent(data: ComponentData): HTMLElement {
  const component = createElement('div', {
    class: 'syntropy-component',
    role: 'region',
    'aria-label': 'Component description',
  });

  // Build component with clear structure
  component.innerHTML = `
    <div class="component-header">
      <h3>${data.title}</h3>
    </div>
    <div class="component-body">
      ${data.content}
    </div>
  `;

  return component;
}
```

## 🧪 Testing

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] Extension loads without errors
- [ ] Works on Amazon Fresh
- [ ] Works on CookUnity
- [ ] Generic detection works
- [ ] Hover cards appear correctly
- [ ] Recall data loads
- [ ] Configuration saves
- [ ] No console errors
- [ ] Performance is acceptable

### Testing New Scrapers

1. Test on listing pages
2. Test on detail pages
3. Test with different product types
4. Test with dynamic content
5. Verify all fields are extracted
6. Check image prioritization

### Testing AI Features

1. Test with various product types
2. Verify structured output
3. Check for hallucinations
4. Test edge cases (missing data)
5. Monitor API costs

## 📤 Submitting Changes

### Commit Messages

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(scraper): add Whole Foods support

Implements IScraper for Whole Foods website.
Handles both search results and product pages.

Closes #123

fix(ui): hover card positioning on small screens

Adjusts positioning logic to prevent cards from
going off-screen on mobile viewports.

docs(readme): update installation instructions
```

### Pull Request Process

1. **Update documentation** if needed
2. **Update CHANGELOG.md** (if exists)
3. **Ensure tests pass** (manual testing)
4. **Update type definitions** if adding new data structures
5. **Screenshot/GIF** for UI changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Screenshots (if applicable)
Add screenshots or GIFs

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex logic
- [ ] Updated documentation
- [ ] No console errors
- [ ] Tested on multiple sites
```

## 👀 Code Review Process

### What Reviewers Look For

1. **Code Quality**
   - Follows coding standards
   - Proper error handling
   - Clear naming
   - Good documentation

2. **Architecture**
   - Follows module patterns
   - Proper separation of concerns
   - Extensible design

3. **Performance**
   - No unnecessary API calls
   - Efficient DOM operations
   - Proper caching

4. **Security**
   - No XSS vulnerabilities
   - Secure data handling
   - Proper input validation

### Review Timeline

- **Initial review**: Within 3 days
- **Follow-up**: Within 2 days after changes
- **Merge**: After 1 approval + CI pass

## 💡 Development Tips

### Debugging

```typescript
// Use descriptive log prefixes
console.log('[ScraperManager] Extracting products');
console.error('[AIAgent] Analysis failed:', error);

// Use debugger in development
debugger; // Pauses execution in DevTools
```

### Chrome Extension Debugging

1. **Background script**: `chrome://extensions/` → Inspect service worker
2. **Content script**: Regular DevTools on the page
3. **Popup**: Right-click extension icon → Inspect popup

### Performance Tips

- Cache expensive operations
- Debounce/throttle frequent events
- Use IntersectionObserver for lazy loading
- Minimize DOM operations
- Batch API calls

### Common Pitfalls

1. **Forgetting await** on async functions
2. **Not handling errors** in promises
3. **Memory leaks** from event listeners
4. **Race conditions** in content scripts
5. **Not cleaning up** observers/timers

## 🤝 Community Guidelines

- Be respectful and constructive
- Help others learn
- Share knowledge
- Credit contributors
- Follow code of conduct

## 📚 Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## ❓ Questions?

- Open a [Discussion](https://github.com/SyntropyHealth/syntropy-dieton/discussions)
- Join our Discord (link)
- Email: dev@syntropyhealth.com

---

Thank you for contributing to Syntropy Food Extension! 🙏
