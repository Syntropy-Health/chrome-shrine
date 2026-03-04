/**
 * UI Module Tests
 *
 * Tests for UI components and hover cards
 */

import { vi, describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { HoverCard } from '../src/modules/ui/hover-card';
import {
  createConcernCard,
  createRecallCard,
  createScoreMeter,
  createIngredientBadge,
} from '../src/modules/ui/components';
import type { FoodProduct, AIAnalysis, SafetyConcern, FoodRecall } from '../src/types';

describe('HoverCard', () => {
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
      ingredients: [{ name: 'Ingredient 1' }],
      images: [],
      url: 'https://example.com',
      source: 'generic',
    };

    // Set up DOM
    document.body.innerHTML = '<div id="test-container"></div>';
  });

  afterEach(() => {
    hoverCard.hide();
    document.body.innerHTML = '';
  });

  test('should show hover card', () => {
    const target = document.getElementById('test-container')!;
    hoverCard.show(mockProduct, target);

    // Wait for delay
    vi.advanceTimersByTime(600);

    const card = document.querySelector('.syntropy-hover-card');
    expect(card).toBeTruthy();
  });

  test('should hide hover card', () => {
    const target = document.getElementById('test-container')!;
    hoverCard.show(mockProduct, target);
    vi.advanceTimersByTime(600);

    hoverCard.hide();
    vi.advanceTimersByTime(300);

    const card = document.querySelector('.syntropy-hover-card');
    expect(card).toBeFalsy();
  });

  test('should update with analysis', () => {
    const target = document.getElementById('test-container')!;
    const mockAnalysis: AIAnalysis = {
      safetyScore: 85,
      healthScore: 90,
      summary: 'Test analysis',
      insights: [
        { category: 'Test', text: 'Test insight', importance: 'high' },
      ],
      recommendations: ['Test recommendation'],
      concerns: [],
      recalls: [],
      metadata: {
        model: 'test',
        processingTime: 0,
        confidence: 0.9,
      },
    };

    hoverCard.show(mockProduct, target, mockAnalysis);
    vi.advanceTimersByTime(600);

    // Analysis renders scores in the card content
    const card = document.querySelector('.syntropy-hover-card');
    expect(card).toBeTruthy();
    expect(card?.textContent).toContain('85/100');
    expect(card?.textContent).toContain('90/100');
  });
});

describe('UI Components', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="test-container"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('createConcernCard should render concern', () => {
    const concern: SafetyConcern = {
      type: 'allergen',
      severity: 'high',
      title: 'Contains Peanuts',
      description: 'This product contains peanuts',
      source: 'Test',
    };

    const card = createConcernCard(concern);
    document.getElementById('test-container')!.appendChild(card);

    expect(card.className).toContain('syntropy-concern-card');
    expect(card.textContent).toContain('Contains Peanuts');
    expect(card.textContent).toContain('This product contains peanuts');
  });

  test('createRecallCard should render recall', () => {
    const recall: FoodRecall = {
      id: 'test-1',
      productName: 'Test Product',
      company: 'Test Company',
      reason: 'Contamination',
      classification: 'Class I',
      recallDate: new Date('2024-01-01'),
      productsAffected: ['Product A', 'Product B'],
      source: 'FDA',
      url: 'https://example.com',
    };

    const card = createRecallCard(recall);
    document.getElementById('test-container')!.appendChild(card);

    expect(card.className).toContain('syntropy-recall-card');
    expect(card.textContent).toContain('Test Product');
    expect(card.textContent).toContain('Contamination');
  });

  test('createScoreMeter should render meter', () => {
    const meter = createScoreMeter(75, 'Health Score');
    document.getElementById('test-container')!.appendChild(meter);

    expect(meter.className).toContain('syntropy-score-meter');
    expect(meter.textContent).toContain('Health Score');
    expect(meter.textContent).toContain('75/100');
  });

  test('createIngredientBadge should render badge', () => {
    const badge = createIngredientBadge('Organic Sugar', 'natural');
    document.getElementById('test-container')!.appendChild(badge);

    expect(badge.className).toContain('syntropy-ingredient-badge');
    expect(badge.className).toContain('type-natural');
    expect(badge.textContent).toBe('Organic Sugar');
  });
});
