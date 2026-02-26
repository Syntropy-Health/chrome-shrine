/**
 * Hover Card Component
 *
 * Creates and manages floating hover cards that display food insights
 * when users hover over food products.
 *
 * @module ui/hover-card
 */

import type { FoodProduct, AIAnalysis } from '@types';
import { UI_CONFIG } from '@/config/config';
import { createElement } from '@utils/dom-utils';

/**
 * Hover card manager
 * Handles creation, positioning, and lifecycle of hover cards
 */
export class HoverCard {
  private card: HTMLElement | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private currentProduct: FoodProduct | null = null;

  /**
   * Show hover card for a product
   * @param product - Food product
   * @param target - Target element to attach to
   * @param analysis - AI analysis (optional, shows loading if not provided)
   */
  show(
    product: FoodProduct,
    target: Element,
    analysis?: AIAnalysis
  ): void {
    // Clear existing timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Delay showing the card
    this.timeout = setTimeout(() => {
      this.currentProduct = product;
      this.createCard(product, target, analysis);
      this.positionCard(target);
    }, UI_CONFIG.HOVER_DELAY);
  }

  /**
   * Hide the hover card
   */
  hide(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.card) {
      this.card.classList.add('syntropy-fade-out');
      setTimeout(() => {
        this.card?.remove();
        this.card = null;
      }, UI_CONFIG.ANIMATION_DURATION);
    }

    this.currentProduct = null;
  }

  /**
   * Update card with analysis results
   * @param analysis - AI analysis
   */
  updateWithAnalysis(analysis: AIAnalysis): void {
    if (!this.card || !this.currentProduct) {
      return;
    }

    const contentEl = this.card.querySelector('.syntropy-card-content');
    if (contentEl) {
      contentEl.innerHTML = this.buildAnalysisContent(analysis);
    }
  }

  /**
   * Create the hover card element
   * @param product - Food product
   * @param target - Target element
   * @param analysis - Optional AI analysis
   */
  private createCard(
    product: FoodProduct,
    target: Element,
    analysis?: AIAnalysis
  ): void {
    // Remove existing card
    if (this.card) {
      this.card.remove();
    }

    // Create card container
    this.card = createElement('div', {
      class: 'syntropy-hover-card',
    });

    // Add header
    const header = this.buildHeader(product, analysis);
    this.card.appendChild(header);

    // Add content
    const content = createElement('div', {
      class: 'syntropy-card-content',
    });

    if (analysis) {
      content.innerHTML = this.buildAnalysisContent(analysis);
    } else {
      content.innerHTML = this.buildLoadingContent();
    }

    this.card.appendChild(content);

    // Add footer
    const footer = this.buildFooter();
    this.card.appendChild(footer);

    // Add to page
    document.body.appendChild(this.card);

    // Trigger animation
    requestAnimationFrame(() => {
      this.card?.classList.add('syntropy-visible');
    });
  }

  /**
   * Build card header
   * @param product - Food product
   * @param analysis - Optional AI analysis
   * @returns Header element
   */
  private buildHeader(product: FoodProduct, analysis?: AIAnalysis): HTMLElement {
    const header = createElement('div', {
      class: 'syntropy-card-header',
    });

    const title = createElement('h3', {
      class: 'syntropy-card-title',
    }, [product.name]);

    header.appendChild(title);

    if (product.brand) {
      const brand = createElement('p', {
        class: 'syntropy-card-brand',
      }, [product.brand]);
      header.appendChild(brand);
    }

    // Add score badge if analysis available
    if (analysis) {
      const score = (analysis.safetyScore + analysis.healthScore) / 2;
      const badge = this.createScoreBadge(score);
      header.appendChild(badge);
    }

    return header;
  }

  /**
   * Build analysis content
   * @param analysis - AI analysis
   * @returns HTML content
   */
  private buildAnalysisContent(analysis: AIAnalysis): string {
    const criticalConcerns = analysis.concerns.filter(
      (c) => c.severity === 'critical' || c.severity === 'high'
    );

    let html = `
      <div class="syntropy-summary">
        <p>${analysis.summary}</p>
      </div>

      <div class="syntropy-scores">
        <div class="syntropy-score">
          <span class="label">Safety</span>
          <span class="value ${this.getScoreClass(analysis.safetyScore)}">${analysis.safetyScore}/100</span>
        </div>
        <div class="syntropy-score">
          <span class="label">Health</span>
          <span class="value ${this.getScoreClass(analysis.healthScore)}">${analysis.healthScore}/100</span>
        </div>
      </div>
    `;

    // Show critical concerns prominently
    if (criticalConcerns.length > 0) {
      html += `
        <div class="syntropy-concerns">
          <h4>⚠️ Important Alerts</h4>
          ${criticalConcerns.map((concern) => `
            <div class="syntropy-concern ${concern.severity}">
              <strong>${concern.title}</strong>
              <p>${concern.description}</p>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Show key insights
    if (analysis.insights.length > 0) {
      const topInsights = analysis.insights.slice(0, 3);
      html += `
        <div class="syntropy-insights">
          <h4>Key Insights</h4>
          <ul>
            ${topInsights.map((insight) => `
              <li class="importance-${insight.importance}">
                <strong>${insight.category}:</strong> ${insight.text}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    return html;
  }

  /**
   * Build loading content
   * @returns HTML content
   */
  private buildLoadingContent(): string {
    return `
      <div class="syntropy-loading">
        <div class="syntropy-spinner"></div>
        <p>Analyzing product...</p>
      </div>
    `;
  }

  /**
   * Build card footer
   * @returns Footer element
   */
  private buildFooter(): HTMLElement {
    const footer = createElement('div', {
      class: 'syntropy-card-footer',
    });

    const link = createElement('a', {
      href: '#',
      class: 'syntropy-view-details',
    }, ['View Full Analysis →']);

    link.addEventListener('click', (e) => {
      e.preventDefault();
      this.openFullAnalysis();
    });

    footer.appendChild(link);

    return footer;
  }

  /**
   * Create score badge
   * @param score - Score value (0-100)
   * @returns Badge element
   */
  private createScoreBadge(score: number): HTMLElement {
    const badge = createElement('div', {
      class: `syntropy-score-badge ${this.getScoreClass(score)}`,
    }, [score.toFixed(0)]);

    return badge;
  }

  /**
   * Get CSS class for score
   * @param score - Score value
   * @returns CSS class name
   */
  private getScoreClass(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  /**
   * Position the card relative to target element
   * @param target - Target element
   */
  private positionCard(target: Element): void {
    if (!this.card) return;

    const rect = target.getBoundingClientRect();
    const cardRect = this.card.getBoundingClientRect();

    let top = rect.bottom + 10;
    let left = rect.left;

    // Adjust if card goes off-screen
    if (left + cardRect.width > window.innerWidth) {
      left = window.innerWidth - cardRect.width - 10;
    }

    if (top + cardRect.height > window.innerHeight) {
      top = rect.top - cardRect.height - 10;
    }

    this.card.style.top = `${top + window.scrollY}px`;
    this.card.style.left = `${left}px`;
  }

  /**
   * Open full analysis in popup
   */
  private openFullAnalysis(): void {
    if (this.currentProduct) {
      // Send message to open popup with product details
      chrome.runtime.sendMessage({
        type: 'OPEN_POPUP',
        payload: { product: this.currentProduct },
      });
    }
  }

  /**
   * Check if card is currently visible
   * @returns true if card is visible
   */
  isVisible(): boolean {
    return this.card !== null;
  }

  /**
   * Get current product
   * @returns Current product or null
   */
  getCurrentProduct(): FoodProduct | null {
    return this.currentProduct;
  }
}
