/**
 * UI Module Tests
 *
 * Tests for UI components and hover cards
 */

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
    jest.advanceTimersByTime(600);

    const card = document.querySelector('.syntropy-hover-card');
    expect(card).toBeTruthy();
  });

  test('should hide hover card', () => {
    const target = document.getElementById('test-container')!;
    hoverCard.show(mockProduct, target);
    jest.advanceTimersByTime(600);

    hoverCard.hide();

    setTimeout(() => {
      const card = document.querySelector('.syntropy-hover-card');
      expect(card).toBeFalsy();
    }, 300);
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
    jest.advanceTimersByTime(600);

    const summary = document.querySelector('.syntropy-summary');
    expect(summary?.textContent).toContain('Test analysis');
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

/**
 * Manual test runner for browser environment
 */
export async function runManualUITests() {
  console.log('🧪 Running Manual UI Tests...\n');

  // Test 1: Create test container
  const container = document.createElement('div');
  container.id = 'ui-test-container';
  container.style.padding = '20px';
  document.body.appendChild(container);

  // Test 2: Create concern card
  console.log('Test 1: Concern Card');
  const concern: SafetyConcern = {
    type: 'recall',
    severity: 'critical',
    title: 'Product Recall Alert',
    description: 'This product has been recalled due to contamination',
    source: 'FDA',
    url: 'https://example.com',
  };
  container.appendChild(createConcernCard(concern));
  console.log('✓ Concern card rendered');

  // Test 3: Create recall card
  console.log('\nTest 2: Recall Card');
  const recall: FoodRecall = {
    id: 'test-1',
    productName: 'Test Chicken Product',
    company: 'Test Foods Inc',
    reason: 'Possible Salmonella contamination',
    classification: 'Class I',
    recallDate: new Date(),
    productsAffected: ['Chicken Breast 1lb', 'Chicken Thighs 2lb'],
    source: 'USDA',
    url: 'https://example.com',
  };
  container.appendChild(createRecallCard(recall));
  console.log('✓ Recall card rendered');

  // Test 4: Create score meters
  console.log('\nTest 3: Score Meters');
  const scoresDiv = document.createElement('div');
  scoresDiv.style.display = 'flex';
  scoresDiv.style.gap = '12px';
  scoresDiv.style.marginTop = '12px';
  scoresDiv.appendChild(createScoreMeter(85, 'Safety Score'));
  scoresDiv.appendChild(createScoreMeter(72, 'Health Score'));
  container.appendChild(scoresDiv);
  console.log('✓ Score meters rendered');

  // Test 5: Create ingredient badges
  console.log('\nTest 4: Ingredient Badges');
  const badgesDiv = document.createElement('div');
  badgesDiv.style.display = 'flex';
  badgesDiv.style.gap = '8px';
  badgesDiv.style.marginTop = '12px';
  badgesDiv.style.flexWrap = 'wrap';
  badgesDiv.appendChild(createIngredientBadge('Organic Wheat', 'natural'));
  badgesDiv.appendChild(createIngredientBadge('MSG', 'additive'));
  badgesDiv.appendChild(createIngredientBadge('Peanuts', 'allergen'));
  badgesDiv.appendChild(createIngredientBadge('Modified Starch', 'processed'));
  container.appendChild(badgesDiv);
  console.log('✓ Ingredient badges rendered');

  console.log('\n✅ Manual UI tests complete!');
  console.log('Check the page for rendered components.');
}
