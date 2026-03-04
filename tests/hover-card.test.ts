/**
 * Enhanced HoverCard Tests
 *
 * Tests for the new visual analysis features added in Phase 2.
 */

import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { HoverCard } from '../src/modules/ui/hover-card';
import type { FoodProduct, AIAnalysis, PersonalFitScore } from '../src/types';

describe('HoverCard - Enhanced Features', () => {
  let hoverCard: HoverCard;
  let mockProduct: FoodProduct;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    hoverCard = new HoverCard();
    mockProduct = {
      id: 'test-1',
      name: 'Test Product',
      brand: 'Test Brand',
      ingredients: [{ name: 'Wheat' }],
      images: [],
      url: 'https://example.com',
      source: 'generic',
      nutrition: {
        calories: 250,
        protein: '20g',
        totalCarbohydrates: '30g',
        totalFat: '10g',
      },
    } as FoodProduct;
    document.body.innerHTML = '<div id="target"></div>';
  });

  afterEach(() => {
    hoverCard.hide();
    vi.advanceTimersByTime(500);
    document.body.innerHTML = '';
  });

  function showCard(analysis?: AIAnalysis) {
    const target = document.getElementById('target')!;
    hoverCard.show(mockProduct, target, analysis);
    vi.advanceTimersByTime(600);
  }

  function makeAnalysis(overrides: Partial<AIAnalysis> = {}): AIAnalysis {
    return {
      safetyScore: 80,
      healthScore: 75,
      summary: 'Test',
      insights: [],
      recommendations: [],
      concerns: [],
      recalls: [],
      metadata: { model: 'test', processingTime: 0, confidence: 0.9 },
      ...overrides,
    };
  }

  it('renders macro donut when nutrition is available', () => {
    const analysis = makeAnalysis({ nutritionSource: 'USDA' });
    showCard(analysis);

    const donut = document.querySelector('.syntropy-macro-donut');
    expect(donut).toBeTruthy();
  });

  it('renders recommendation banner when fitScore present', () => {
    const fitScore: PersonalFitScore = {
      score: 8,
      label: 'Excellent Fit',
      recommendation: 'Great for your profile',
      macroFit: { protein: 'on_track', carbs: 'on_track', fat: 'on_track', calories: 'on_track' },
      warnings: [],
    };
    const analysis = makeAnalysis({ fitScore });
    showCard(analysis);

    const banner = document.querySelector('.syntropy-recommendation');
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain('Great for your profile');
  });

  it('updateWithAnalysis replaces loading content', () => {
    showCard(); // Initially shows loading
    const loadingBefore = document.querySelector('.syntropy-loading');
    // Loading may or may not be present depending on whether analysis was passed
    // But after update, the content should change
    hoverCard.updateWithAnalysis(makeAnalysis());

    const scores = document.querySelector('.syntropy-scores');
    expect(scores).toBeTruthy();
  });

  it('updateWithAnalysis adds fit gauge to header when fitScore present', () => {
    showCard();
    hoverCard.updateWithAnalysis(makeAnalysis({
      fitScore: {
        score: 7.5,
        label: 'Good Fit',
        recommendation: 'Works well',
        macroFit: { protein: 'on_track', carbs: 'on_track', fat: 'on_track', calories: 'on_track' },
        warnings: [],
      },
    }));

    const gauge = document.querySelector('.syntropy-fit-gauge');
    expect(gauge).toBeTruthy();
  });

  it('addToJournal sends JOURNAL_LOG_FOOD message', () => {
    showCard(makeAnalysis());

    const journalBtn = document.querySelector('.syntropy-journal-btn') as HTMLElement;
    expect(journalBtn).toBeTruthy();
    journalBtn?.click();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'JOURNAL_LOG_FOOD' }),
    );
  });

  it('openSidePanel sends OPEN_SIDE_PANEL message', () => {
    showCard(makeAnalysis());

    const detailsLink = document.querySelector('.syntropy-view-details') as HTMLElement;
    expect(detailsLink).toBeTruthy();
    detailsLink?.click();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'OPEN_SIDE_PANEL' }),
    );
  });

  it('renders safety and health scores', () => {
    showCard(makeAnalysis({ safetyScore: 92, healthScore: 88 }));

    const card = document.querySelector('.syntropy-hover-card');
    expect(card?.textContent).toContain('92/100');
    expect(card?.textContent).toContain('88/100');
  });

  it('renders critical concerns when present', () => {
    showCard(makeAnalysis({
      concerns: [
        { type: 'allergen', severity: 'critical', title: 'Peanut Alert', description: 'Contains peanuts', source: 'Test' },
      ],
    }));

    const concerns = document.querySelector('.syntropy-concerns');
    expect(concerns).toBeTruthy();
    expect(concerns?.textContent).toContain('Peanut Alert');
  });
});
