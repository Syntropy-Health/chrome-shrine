/**
 * Side Panel Script
 *
 * Modern side panel UI for detailed food product analysis.
 * Features tabbed interface with macro charts, nutrient bars,
 * fit score gauges, and health profile compatibility.
 *
 * @module sidepanel
 */

import { FoodAnalysisAgent } from '@modules/ai/agent';
import { AuthManager, type ClerkUser } from '@modules/auth';
import { JournalApiClient } from '@modules/integrations/journal-api';
import {
  calculateMacroPercentages,
  extractMacros,
  type MacroValues,
} from '@modules/nutrition';
import type {
  AIAnalysis,
  FoodProduct,
  JournalHealthProfile,
  NutritionInfo,
  PersonalFitScore,
} from '@types';

// ---------------------------------------------------------------------------
// Side Panel Manager
// ---------------------------------------------------------------------------

class SidePanelManager {
  private agent = FoodAnalysisAgent.getInstance();
  private journalClient = JournalApiClient.getInstance();
  private authManager = AuthManager.getInstance();

  private currentProduct: FoodProduct | null = null;
  private currentAnalysis: AIAnalysis | null = null;
  private userProfile: JournalHealthProfile | null = null;

  async init(): Promise<void> {
    // Listen for product data from service worker
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'SIDE_PANEL_SHOW_PRODUCT') {
        this.showProduct(message.payload.product);
        sendResponse({ success: true });
      }
      return true;
    });

    this.setupTabs();
    this.setupButtons();
    await this.initAuth();
    await this.loadProfile();
  }

  // =========================================================================
  // Auth
  // =========================================================================

  private async initAuth(): Promise<void> {
    const state = await this.authManager.initialize();
    this.renderAuthState(state.user, state.isAuthenticated);
  }

  private renderAuthState(user: ClerkUser | null, isAuthenticated: boolean): void {
    const badge = document.getElementById('authBadge');
    const btn = document.getElementById('headerSignInBtn');
    const authArea = document.getElementById('headerAuth');

    if (isAuthenticated && user) {
      if (badge) { badge.classList.remove('offline'); badge.title = user.email; }
      if (btn) btn.classList.add('hidden');

      // Show avatar if available
      if (user.imageUrl && authArea) {
        const existing = authArea.querySelector('.auth-avatar') as HTMLImageElement | null;
        if (!existing) {
          const img = document.createElement('img');
          img.className = 'auth-avatar';
          img.src = user.imageUrl;
          img.alt = user.firstName || 'User';
          authArea.insertBefore(img, badge);
        }
      }
    } else {
      if (badge) { badge.classList.add('offline'); badge.title = 'Not signed in'; }
      if (btn) btn.classList.remove('hidden');
    }
  }

  private async loadProfile(): Promise<void> {
    await this.journalClient.initialize();
    if (!this.journalClient.isAvailable()) return;

    this.userProfile = await this.journalClient.getHealthProfile();
    if (this.userProfile) {
      this.renderProfileCard(this.userProfile);
    }
  }

  // =========================================================================
  // Tabs
  // =========================================================================

  private setupTabs(): void {
    const tabBtns = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));

        btn.classList.add('active');
        const target = btn.dataset.tab;
        document.getElementById(`tab-${target}`)?.classList.add('active');
      });
    });
  }

  private setupButtons(): void {
    document.getElementById('journalBtn')?.addEventListener('click', () => this.addToJournal());
    document.getElementById('headerSignInBtn')?.addEventListener('click', async () => {
      const state = await this.authManager.signInWithGoogle();
      this.renderAuthState(state.user, state.isAuthenticated);
      if (state.isAuthenticated) await this.loadProfile();
    });
  }

  // =========================================================================
  // Product Analysis Flow
  // =========================================================================

  private async showProduct(product: FoodProduct): Promise<void> {
    this.currentProduct = product;
    this.currentAnalysis = null;

    this.showLoading();

    // Set product info
    this.setText('productName', product.name);
    this.setText('productBrand', product.brand || '');

    try {
      const analysis = await this.agent.analyzeProduct(product, {
        useCache: true,
        includeRecalls: true,
        processImages: true,
      });

      this.currentAnalysis = analysis;
      this.renderAll(product, analysis);
    } catch (error) {
      console.error('[SidePanel] Analysis error:', error);
      this.showError('Failed to analyze product. Please try again.');
    }
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  private renderAll(product: FoodProduct, analysis: AIAnalysis): void {
    this.showProductDetail();

    // Nutrition source badge
    const sourceEl = document.getElementById('nutritionSource');
    if (sourceEl) {
      const sourceLabel = analysis.nutritionSource === 'USDA_FDC' ? 'USDA FoodData Central'
        : analysis.nutritionSource === 'AI_ESTIMATED' ? 'AI Estimated'
          : 'Scraped';
      sourceEl.textContent = `Data: ${sourceLabel}`;
    }

    this.renderScores(analysis);
    this.renderSummary(analysis);
    this.renderQuickMacros(product.nutrition);
    this.renderConcerns(analysis);
    this.renderMacroChart(product.nutrition);
    this.renderNutrientBars(product.nutrition);
    this.renderMicronutrients(product.nutrition);
    this.renderFitScore(analysis.fitScore);
    this.renderInsights(analysis);
  }

  private renderScores(analysis: AIAnalysis): void {
    this.setScore('safetyScore', analysis.safetyScore);
    this.setScore('healthScore', analysis.healthScore);

    if (analysis.fitScore) {
      const fitEl = document.getElementById('fitScoreValue');
      if (fitEl) {
        const display = analysis.fitScore.score.toFixed(1);
        fitEl.textContent = display;
        fitEl.className = `score-value ${this.getScoreClass(analysis.fitScore.score * 10)}`;
      }
    }
  }

  private renderSummary(analysis: AIAnalysis): void {
    this.setText('summaryText', analysis.summary);
  }

  private renderQuickMacros(nutrition: NutritionInfo | undefined): void {
    const container = document.getElementById('quickMacroContent');
    const calBadge = document.getElementById('calBadge');
    if (!container || !nutrition) return;

    const macros = extractMacros(nutrition);
    if (calBadge) calBadge.textContent = `${Math.round(macros.calories)} kcal`;

    const items = [
      { name: 'Protein', value: macros.protein_g, color: 'var(--accent-green)', max: 50 },
      { name: 'Carbs', value: macros.carbs_g, color: 'var(--accent-amber)', max: 100 },
      { name: 'Fat', value: macros.fat_g, color: 'var(--accent-red)', max: 65 },
      { name: 'Fiber', value: macros.fiber_g, color: 'var(--accent-blue)', max: 30 },
    ];

    container.innerHTML = items.map((item) => {
      const pct = Math.min((item.value / item.max) * 100, 100);
      return `
        <div class="nutrient-bar-row">
          <span class="nutrient-bar-name">${item.name}</span>
          <div class="nutrient-bar-track">
            <div class="nutrient-bar-fill" style="width:${pct}%;background:${item.color};"></div>
          </div>
          <span class="nutrient-bar-value">${item.value.toFixed(1)}g</span>
        </div>
      `;
    }).join('');
  }

  private renderConcerns(analysis: AIAnalysis): void {
    const list = document.getElementById('concernsList');
    const badge = document.getElementById('concernCount');
    const card = document.getElementById('concernsCard');

    if (!list) return;

    if (analysis.concerns.length === 0) {
      if (card) card.classList.add('hidden');
      return;
    }

    if (card) card.classList.remove('hidden');
    if (badge) badge.textContent = `${analysis.concerns.length}`;

    list.innerHTML = analysis.concerns.map((c) => `
      <div class="concern-row ${c.severity}">
        <div class="concern-title">${c.title}</div>
        <div class="concern-desc">${c.description}</div>
      </div>
    `).join('');
  }

  // ---------------------------------------------------------------------------
  // Nutrition Tab
  // ---------------------------------------------------------------------------

  private renderMacroChart(nutrition: NutritionInfo | undefined): void {
    const svg = document.getElementById('macroDonut') as unknown as SVGElement;
    const calLabel = document.getElementById('donutCalValue');
    const legend = document.getElementById('macroLegend');
    if (!svg || !nutrition) return;

    const macros = extractMacros(nutrition);
    const pcts = calculateMacroPercentages(macros);
    if (calLabel) calLabel.textContent = Math.round(macros.calories).toString();

    // Draw donut arcs
    const cx = 60, cy = 60, r = 50;
    const circumference = 2 * Math.PI * r;

    const segments = [
      { pct: pcts.protein, color: '#22c55e', name: 'Protein', grams: macros.protein_g },
      { pct: pcts.carbs, color: '#f59e0b', name: 'Carbs', grams: macros.carbs_g },
      { pct: pcts.fat, color: '#ef4444', name: 'Fat', grams: macros.fat_g },
    ];

    let offset = 0;
    let arcs = '';

    for (const seg of segments) {
      const dashLen = (seg.pct / 100) * circumference;
      const gap = circumference - dashLen;
      arcs += `<circle cx="${cx}" cy="${cy}" r="${r}"
        fill="none" stroke="${seg.color}" stroke-width="10"
        stroke-dasharray="${dashLen} ${gap}"
        stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${cx} ${cy})"
        stroke-linecap="round" />`;
      offset += dashLen;
    }

    // Background ring
    svg.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="rgba(255,255,255,0.06)" stroke-width="10" />
      ${arcs}
    `;

    // Legend
    if (legend) {
      legend.innerHTML = segments.map((seg) => `
        <div class="legend-row">
          <div class="legend-left">
            <div class="legend-dot" style="background:${seg.color};"></div>
            <span class="legend-name">${seg.name}</span>
          </div>
          <div>
            <span class="legend-value">${seg.grams.toFixed(1)}g</span>
            <span class="legend-pct">${seg.pct}%</span>
          </div>
        </div>
      `).join('');
    }
  }

  private renderNutrientBars(nutrition: NutritionInfo | undefined): void {
    const container = document.getElementById('nutrientBars');
    if (!container || !nutrition) return;

    const nutrients = [
      { name: 'Calories', value: nutrition.calories, unit: 'kcal', dv: 2000 },
      { name: 'Protein', value: parseFloat(nutrition.protein || '0'), unit: 'g', dv: 50 },
      { name: 'Total Fat', value: parseFloat(nutrition.totalFat || '0'), unit: 'g', dv: 65 },
      { name: 'Sat. Fat', value: parseFloat(nutrition.saturatedFat || '0'), unit: 'g', dv: 20 },
      { name: 'Carbs', value: parseFloat(nutrition.totalCarbohydrates || '0'), unit: 'g', dv: 300 },
      { name: 'Fiber', value: parseFloat(nutrition.dietaryFiber || '0'), unit: 'g', dv: 25 },
      { name: 'Sugar', value: parseFloat(nutrition.sugars || '0'), unit: 'g', dv: 50 },
      { name: 'Sodium', value: parseFloat(nutrition.sodium || '0'), unit: 'mg', dv: 2300 },
    ];

    container.innerHTML = nutrients.map((n) => {
      const val = n.value || 0;
      const dvPct = Math.round((val / n.dv) * 100);
      const color = dvPct > 100 ? 'var(--accent-red)'
        : dvPct > 50 ? 'var(--accent-amber)'
          : 'var(--accent-green)';

      return `
        <div class="nutrient-bar-row">
          <span class="nutrient-bar-name">${n.name}</span>
          <div class="nutrient-bar-track">
            <div class="nutrient-bar-fill" style="width:${Math.min(dvPct, 100)}%;background:${color};"></div>
          </div>
          <span class="nutrient-bar-value">${val}${n.unit} <span style="color:var(--text-muted);font-size:10px;">${dvPct}%</span></span>
        </div>
      `;
    }).join('');
  }

  private renderMicronutrients(nutrition: NutritionInfo | undefined): void {
    const container = document.getElementById('microContent');
    if (!container || !nutrition) return;

    const vitamins = nutrition.vitamins || {};
    const minerals = nutrition.minerals || {};
    const allMicros = { ...vitamins, ...minerals };

    if (Object.keys(allMicros).length === 0) {
      container.innerHTML = '<p style="font-size:12px;color:var(--text-muted);">No micronutrient data available.</p>';
      return;
    }

    container.innerHTML = Object.entries(allMicros).map(([name, value]) => `
      <div class="nutrient-bar-row">
        <span class="nutrient-bar-name">${name}</span>
        <span class="nutrient-bar-value">${value}</span>
      </div>
    `).join('');
  }

  // ---------------------------------------------------------------------------
  // Compatibility Tab
  // ---------------------------------------------------------------------------

  private renderFitScore(fitScore: PersonalFitScore | undefined | null): void {
    const svg = document.getElementById('fitGaugeSvg') as unknown as SVGElement;
    const label = document.getElementById('fitGaugeLabel');
    const rec = document.getElementById('fitGaugeRec');
    const macroFitContent = document.getElementById('macroFitContent');
    const warningsList = document.getElementById('warningsList');
    const warningsCard = document.getElementById('warningsCard');

    if (!fitScore) {
      if (label) label.textContent = '--';
      if (rec) rec.textContent = 'Sign in to see fit score';
      return;
    }

    const score = fitScore.score;
    const color = score >= 8 ? 'var(--accent-green)'
      : score >= 6 ? 'var(--accent-blue)'
        : score >= 4 ? 'var(--accent-amber)'
          : 'var(--accent-red)';

    // Semicircle gauge
    if (svg) {
      const cx = 60, cy = 65, r = 48;
      const circumference = Math.PI * r; // semicircle
      const filled = (score / 10) * circumference;

      svg.innerHTML = `
        <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}"
          fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"
          stroke-linecap="round" />
        <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}"
          fill="none" stroke="${color}" stroke-width="8"
          stroke-dasharray="${filled} ${circumference}"
          stroke-linecap="round" />
        <text x="${cx}" y="${cy - 8}" text-anchor="middle"
          font-size="28" font-weight="700" fill="${color}">
          ${score.toFixed(1)}
        </text>
        <text x="${cx}" y="${cy + 8}" text-anchor="middle"
          font-size="10" fill="var(--text-muted)">/10</text>
      `;
    }

    if (label) {
      label.textContent = fitScore.label;
      label.style.color = color;
    }
    if (rec) rec.textContent = fitScore.recommendation;

    // Macro fit status
    if (macroFitContent && fitScore.macroFit) {
      const statusIcon = (s: string) =>
        s === 'on_track' ? `<span style="color:var(--accent-green);">&#10003;</span>`
          : s === 'over' ? `<span style="color:var(--accent-red);">&#9650;</span>`
            : `<span style="color:var(--accent-amber);">&#9660;</span>`;

      const items = [
        { name: 'Protein', status: fitScore.macroFit.protein },
        { name: 'Carbs', status: fitScore.macroFit.carbs },
        { name: 'Fat', status: fitScore.macroFit.fat },
        { name: 'Calories', status: fitScore.macroFit.calories },
      ];

      macroFitContent.innerHTML = items.map((item) => `
        <div class="nutrient-bar-row">
          <span class="nutrient-bar-name">${item.name}</span>
          <span class="nutrient-bar-value">${statusIcon(item.status)} ${item.status.replace('_', ' ')}</span>
        </div>
      `).join('');
    }

    // Warnings
    if (warningsList && warningsCard) {
      if (fitScore.warnings.length > 0) {
        warningsCard.classList.remove('hidden');
        warningsList.innerHTML = fitScore.warnings.map((w) => `
          <div class="warning-item">
            <span class="warning-icon">&#9888;</span>
            <span>${w}</span>
          </div>
        `).join('');
      } else {
        warningsCard.classList.add('hidden');
      }
    }
  }

  private renderProfileCard(profile: JournalHealthProfile): void {
    const content = document.getElementById('profileContent');
    const status = document.getElementById('profileStatus');

    if (status) {
      status.textContent = 'Connected';
      status.className = 'card-badge badge-green';
    }

    if (!content) return;

    const chips: string[] = [];
    if (profile.dietary_preferences?.diet_type) {
      chips.push(profile.dietary_preferences.diet_type);
    }
    for (const goal of (profile.health_goals || []).slice(0, 4)) {
      chips.push(goal);
    }
    for (const allergy of (profile.allergies || []).slice(0, 4)) {
      chips.push(`Allergy: ${allergy}`);
    }

    if (chips.length === 0) {
      content.innerHTML = '<p style="font-size:12px;color:var(--text-muted);">Profile loaded but no preferences set.</p>';
      return;
    }

    content.innerHTML = `
      <div class="profile-grid">
        ${chips.map((c) => `<div class="profile-chip">${c}</div>`).join('')}
      </div>
    `;
  }

  private renderInsights(analysis: AIAnalysis): void {
    const list = document.getElementById('insightsList');
    if (!list) return;

    if (analysis.insights.length === 0) {
      list.innerHTML = '<p style="font-size:12px;color:var(--text-muted);">No additional insights.</p>';
      return;
    }

    list.innerHTML = analysis.insights.map((i) => `
      <div class="insight-row">
        <div class="insight-cat">${i.category}</div>
        <div class="insight-text">${i.text}</div>
      </div>
    `).join('');
  }

  // =========================================================================
  // Actions
  // =========================================================================

  private async addToJournal(): Promise<void> {
    if (!this.currentProduct) return;

    const btn = document.getElementById('journalBtn') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Adding...</span>';
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
      btn.innerHTML = '<span>&#10003;</span> Added!';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<span>+</span> Add to Journal';
      }, 2000);
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private setText(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  private setScore(id: string, score: number): void {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = score.toString();
      el.className = `score-value ${this.getScoreClass(score)}`;
    }
  }

  private getScoreClass(score: number): string {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
  }

  private showLoading(): void {
    document.getElementById('emptyState')?.classList.add('hidden');
    const loading = document.getElementById('loadingState');
    if (loading) loading.style.display = 'block';
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
  }

  private showProductDetail(): void {
    document.getElementById('emptyState')?.classList.add('hidden');
    const loading = document.getElementById('loadingState');
    if (loading) loading.style.display = 'none';

    // Show all tab panels (they're controlled by tab buttons)
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('hidden'));

    // Activate overview tab
    const activeTab = document.querySelector('.tab-btn.active');
    const tabName = activeTab?.getAttribute('data-tab') || 'overview';
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    document.getElementById(`tab-${tabName}`)?.classList.add('active');

    // Unhide cards
    document.getElementById('concernsCard')?.classList.remove('hidden');
    document.getElementById('warningsCard')?.classList.add('hidden');
  }

  private showError(message: string): void {
    const loading = document.getElementById('loadingState');
    if (loading) loading.style.display = 'none';

    const empty = document.getElementById('emptyState');
    if (empty) {
      empty.classList.remove('hidden');
      const h2 = empty.querySelector('h2');
      const p = empty.querySelector('p');
      if (h2) h2.textContent = 'Analysis Error';
      if (p) p.textContent = message;
    }
  }
}

// ---------------------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------------------

const sidePanelManager = new SidePanelManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => sidePanelManager.init());
} else {
  sidePanelManager.init();
}
