/**
 * Side Panel Script
 *
 * Handles the side panel UI for detailed food product analysis.
 * Receives product data from the service worker and renders a full view.
 *
 * @module sidepanel
 */

import { FoodAnalysisAgent } from '@modules/ai/agent';
import { JournalApiClient } from '@modules/integrations/journal-api';
import type { AIAnalysis, FoodProduct } from '@types';

/**
 * Side panel manager
 * Handles rendering and interactions in the side panel
 */
class SidePanelManager {
  private agent = FoodAnalysisAgent.getInstance();
  private journalClient = JournalApiClient.getInstance();
  private currentProduct: FoodProduct | null = null;
  private currentAnalysis: AIAnalysis | null = null;

  /**
   * Initialize side panel
   */
  async init(): Promise<void> {
    console.log('[SidePanel] Initializing...');

    // Listen for messages from service worker
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'SIDE_PANEL_SHOW_PRODUCT') {
        this.showProduct(message.payload.product);
        sendResponse({ success: true });
      }
      return true;
    });

    // Set up journal button
    const journalBtn = document.getElementById('journalBtn');
    if (journalBtn) {
      journalBtn.addEventListener('click', () => this.addToJournal());
    }

    console.log('[SidePanel] Initialized');
  }

  /**
   * Show product detail with full analysis
   */
  private async showProduct(product: FoodProduct): Promise<void> {
    this.currentProduct = product;
    this.currentAnalysis = null;

    // Show loading state
    this.showLoading();

    // Set product info
    const nameEl = document.getElementById('productName');
    const brandEl = document.getElementById('productBrand');
    if (nameEl) nameEl.textContent = product.name;
    if (brandEl) brandEl.textContent = product.brand || '';

    try {
      // Run full analysis
      const analysis = await this.agent.analyzeProduct(product, {
        useCache: true,
        includeRecalls: true,
        processImages: true,
      });

      this.currentAnalysis = analysis;
      this.renderAnalysis(analysis);
    } catch (error) {
      console.error('[SidePanel] Analysis error:', error);
      this.showError('Failed to analyze product. Please try again.');
    }
  }

  /**
   * Render full analysis in the panel
   */
  private renderAnalysis(analysis: AIAnalysis): void {
    // Show product detail, hide other states
    this.showProductDetail();

    // Safety score
    const safetyEl = document.getElementById('safetyScore');
    if (safetyEl) {
      safetyEl.textContent = analysis.safetyScore.toString();
      safetyEl.className = `score-value ${this.getScoreClass(analysis.safetyScore)}`;
    }

    // Health score
    const healthEl = document.getElementById('healthScore');
    if (healthEl) {
      healthEl.textContent = analysis.healthScore.toString();
      healthEl.className = `score-value ${this.getScoreClass(analysis.healthScore)}`;
    }

    // Summary
    const summaryEl = document.getElementById('summaryText');
    if (summaryEl) summaryEl.textContent = analysis.summary;

    // Nutrition section
    const nutritionContent = document.getElementById('nutritionContent');
    const nutritionSection = document.getElementById('nutritionSection');
    if (nutritionContent && this.currentProduct?.nutrition) {
      const nutrition = this.currentProduct.nutrition;
      nutritionContent.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${nutrition.calories != null ? `<div><strong>${nutrition.calories}</strong> <span style="color:#6b7280;font-size:12px;">cal</span></div>` : ''}
          ${nutrition.protein ? `<div><strong style="color:#4CAF50;">${nutrition.protein}</strong> <span style="color:#6b7280;font-size:12px;">protein</span></div>` : ''}
          ${nutrition.totalCarbohydrates ? `<div><strong style="color:#FF9800;">${nutrition.totalCarbohydrates}</strong> <span style="color:#6b7280;font-size:12px;">carbs</span></div>` : ''}
          ${nutrition.totalFat ? `<div><strong style="color:#F44336;">${nutrition.totalFat}</strong> <span style="color:#6b7280;font-size:12px;">fat</span></div>` : ''}
          ${nutrition.dietaryFiber ? `<div><strong>${nutrition.dietaryFiber}</strong> <span style="color:#6b7280;font-size:12px;">fiber</span></div>` : ''}
          ${nutrition.sodium ? `<div><strong>${nutrition.sodium}</strong> <span style="color:#6b7280;font-size:12px;">sodium</span></div>` : ''}
        </div>
      `;
    } else if (nutritionSection) {
      nutritionSection.classList.add('hidden');
    }

    // Concerns
    const concernsList = document.getElementById('concernsList');
    const concernsSection = document.getElementById('concernsSection');
    if (concernsList && analysis.concerns.length > 0) {
      concernsList.innerHTML = analysis.concerns
        .map(
          (c) => `
          <div class="concern-item ${c.severity}">
            <strong>${c.title}</strong>
            <p>${c.description}</p>
          </div>
        `
        )
        .join('');
    } else if (concernsSection) {
      concernsSection.classList.add('hidden');
    }

    // Insights
    const insightsList = document.getElementById('insightsList');
    const insightsSection = document.getElementById('insightsSection');
    if (insightsList && analysis.insights.length > 0) {
      insightsList.innerHTML = analysis.insights
        .map(
          (i) => `
          <div class="insight-item">
            <div class="insight-category">${i.category}</div>
            <div>${i.text}</div>
          </div>
        `
        )
        .join('');
    } else if (insightsSection) {
      insightsSection.classList.add('hidden');
    }
  }

  /**
   * Add current product to journal
   */
  private async addToJournal(): Promise<void> {
    if (!this.currentProduct) return;

    const btn = document.getElementById('journalBtn') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Adding...';
    }

    const nutrition = this.currentProduct.nutrition;
    chrome.runtime.sendMessage({
      type: 'JOURNAL_LOG_FOOD',
      payload: {
        food_name: this.currentProduct.name,
        calories: nutrition?.calories,
        protein: nutrition?.protein ? parseFloat(nutrition.protein) : undefined,
        carbs: nutrition?.totalCarbohydrates
          ? parseFloat(nutrition.totalCarbohydrates)
          : undefined,
        fat: nutrition?.totalFat ? parseFloat(nutrition.totalFat) : undefined,
        source_url: this.currentProduct.url,
      },
    });

    if (btn) {
      btn.textContent = 'Added!';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = '+ Add to Journal';
      }, 2000);
    }
  }

  /**
   * Get CSS class for score
   */
  private getScoreClass(score: number): string {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
  }

  // --- UI State Helpers ---

  private showLoading(): void {
    document.getElementById('emptyState')?.classList.add('hidden');
    const loadingEl = document.getElementById('loadingState');
    if (loadingEl) loadingEl.style.display = 'block';
    const detailEl = document.getElementById('productDetail');
    if (detailEl) detailEl.style.display = 'none';
  }

  private showProductDetail(): void {
    document.getElementById('emptyState')?.classList.add('hidden');
    const loadingEl = document.getElementById('loadingState');
    if (loadingEl) loadingEl.style.display = 'none';
    const detailEl = document.getElementById('productDetail');
    if (detailEl) detailEl.style.display = 'block';

    // Unhide sections that may have been hidden
    document.getElementById('nutritionSection')?.classList.remove('hidden');
    document.getElementById('concernsSection')?.classList.remove('hidden');
    document.getElementById('insightsSection')?.classList.remove('hidden');
  }

  private showError(message: string): void {
    const loadingEl = document.getElementById('loadingState');
    if (loadingEl) loadingEl.style.display = 'none';

    const emptyEl = document.getElementById('emptyState');
    if (emptyEl) {
      emptyEl.classList.remove('hidden');
      const h2 = emptyEl.querySelector('h2');
      const p = emptyEl.querySelector('p');
      if (h2) h2.textContent = 'Analysis Error';
      if (p) p.textContent = message;
    }
  }
}

// Initialize side panel
const sidePanelManager = new SidePanelManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    sidePanelManager.init();
  });
} else {
  sidePanelManager.init();
}
