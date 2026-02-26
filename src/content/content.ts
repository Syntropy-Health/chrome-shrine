/**
 * Content Script
 *
 * Main content script that runs on all pages.
 * Detects food products, creates hover cards, and handles user interactions.
 */

import { ScraperManager } from '@modules/scraper';
import { FoodAnalysisAgent } from '@modules/ai';
import { HoverCard } from '@modules/ui';
import { ConfigManager } from '@/config/config';
import { debounce, throttle } from '@utils/dom-utils';
import type { FoodProduct } from '@types';
import './content.css';

/**
 * Content script main class
 */
class ContentScript {
  private scraperManager = ScraperManager.getInstance();
  private analysisAgent = FoodAnalysisAgent.getInstance();
  private config = ConfigManager.getInstance();
  private hoverCard = new HoverCard();
  private products: FoodProduct[] = [];
  private initialized = false;

  /**
   * Initialize content script
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[Syntropy] Content script initializing...');

    try {
      // Load configuration
      await this.config.load();

      // Check if current page is food-related
      if (!this.scraperManager.isFoodPage(document)) {
        console.log('[Syntropy] Page is not food-related, skipping initialization');
        return;
      }

      console.log('[Syntropy] Food page detected');

      // Extract products
      await this.extractProducts();

      // Set up event listeners
      this.setupEventListeners();

      // Set up mutation observer for dynamic content
      this.setupMutationObserver();

      this.initialized = true;

      console.log(`[Syntropy] Initialized with ${this.products.length} products`);
    } catch (error) {
      console.error('[Syntropy] Initialization error:', error);
    }
  }

  /**
   * Extract products from page
   */
  private async extractProducts(): Promise<void> {
    try {
      this.products = await this.scraperManager.extractProducts(document);

      // Attach hover listeners to product elements
      this.products.forEach((product) => {
        if (product.element) {
          this.attachHoverListeners(product.element, product);
        }
      });
    } catch (error) {
      console.error('[Syntropy] Error extracting products:', error);
    }
  }

  /**
   * Attach hover listeners to an element
   * @param element - DOM element
   * @param product - Associated product
   */
  private attachHoverListeners(element: Element, product: FoodProduct): void {
    element.addEventListener('mouseenter', () => {
      this.handleHover(product, element);
    });

    element.addEventListener('mouseleave', () => {
      this.hoverCard.hide();
    });
  }

  /**
   * Handle hover event
   * @param product - Food product
   * @param element - Target element
   */
  private handleHover(product: FoodProduct, element: Element): void {
    const config = this.config.get();

    if (!config.features.hoverCards) {
      return;
    }

    // Show card immediately (will show loading state)
    this.hoverCard.show(product, element);

    // Fetch analysis in background
    this.analysisAgent
      .quickAnalysis(product)
      .then((analysis) => {
        // If still hovering on same product, update card
        if (this.hoverCard.getCurrentProduct()?.id === product.id) {
          // Convert quick analysis to full analysis format
          this.hoverCard.updateWithAnalysis({
            safetyScore: analysis.score,
            healthScore: analysis.score,
            summary: analysis.summary,
            insights: analysis.keyPoints.map((text, i) => ({
              category: 'Insight',
              text,
              importance: i === 0 ? 'high' : 'medium' as const,
            })),
            recommendations: [],
            concerns: [],
            recalls: [],
            metadata: {
              model: config.model,
              processingTime: 0,
              confidence: 0.8,
            },
          });
        }
      })
      .catch((error) => {
        console.error('[Syntropy] Error analyzing product:', error);
      });
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async response
    });

    // Listen for scroll to hide hover card
    window.addEventListener('scroll', throttle(() => {
      this.hoverCard.hide();
    }, 100));

    // Listen for resize
    window.addEventListener('resize', debounce(() => {
      this.hoverCard.hide();
    }, 200));
  }

  /**
   * Set up mutation observer for dynamic content
   */
  private setupMutationObserver(): void {
    const observer = new MutationObserver(
      debounce(async (mutations) => {
        // Check if new product elements were added
        const hasNewContent = mutations.some((mutation) =>
          mutation.addedNodes.length > 0
        );

        if (hasNewContent) {
          await this.extractProducts();
        }
      }, 1000)
    );

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Handle messages from background script or popup
   * @param message - Message object
   * @param sender - Message sender
   * @param sendResponse - Response callback
   */
  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'GET_PRODUCTS':
          sendResponse({ success: true, data: this.products });
          break;

        case 'ANALYZE_PRODUCT':
          {
            const product = this.products.find((p) => p.id === message.payload.productId);
            if (product) {
              const analysis = await this.analysisAgent.analyzeProduct(product);
              sendResponse({ success: true, data: analysis });
            } else {
              sendResponse({ success: false, error: 'Product not found' });
            }
          }
          break;

        case 'REFRESH':
          await this.extractProducts();
          sendResponse({ success: true, data: { count: this.products.length } });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[Syntropy] Message handler error:', error);
      sendResponse({ success: false, error: String(error) });
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.hoverCard.hide();
    this.initialized = false;
    this.products = [];
  }
}

// Initialize content script
const contentScript = new ContentScript();

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    contentScript.init();
  });
} else {
  contentScript.init();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  contentScript.destroy();
});
