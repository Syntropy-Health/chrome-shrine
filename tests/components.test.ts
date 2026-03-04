/**
 * Visual Nutrition Components Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createMacroDonut,
  createFitGauge,
  createNutrientBar,
  createMacroSummary,
  createRecommendationBanner,
  createSourceBadge,
} from '../src/modules/ui/components';
import type { NutritionInfo } from '../src/types';

describe('createMacroDonut', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="root"></div>'; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('renders donut with conic-gradient, legend, and calorie center', () => {
    const nutrition: NutritionInfo = {
      calories: 250,
      protein: '20g',
      totalCarbohydrates: '30g',
      totalFat: '10g',
    } as NutritionInfo;

    const el = createMacroDonut(nutrition, 100);
    document.getElementById('root')!.appendChild(el);

    expect(el.className).toContain('syntropy-macro-donut');
    // Should have donut ring element (style applied inline)
    const ring = el.querySelector('.donut-ring') as HTMLElement;
    expect(ring).toBeTruthy();
    // Center shows calories
    const hole = el.querySelector('.donut-hole');
    expect(hole?.textContent).toContain('250');
    expect(hole?.textContent).toContain('kcal');
    // Legend shows all three macros
    const legend = el.querySelector('.donut-legend');
    expect(legend?.textContent).toContain('P');
    expect(legend?.textContent).toContain('C');
    expect(legend?.textContent).toContain('F');
  });

  it('handles zero macros', () => {
    const nutrition: NutritionInfo = {
      calories: 0,
      protein: '0g',
      totalCarbohydrates: '0g',
      totalFat: '0g',
    } as NutritionInfo;

    const el = createMacroDonut(nutrition, 80);
    expect(el.querySelector('.donut-empty')).toBeTruthy();
    expect(el.textContent).toContain('No data');
  });
});

describe('createFitGauge', () => {
  it('renders SVG with score text and label', () => {
    const el = createFitGauge(8.5, 'Excellent Fit');
    expect(el.className).toContain('syntropy-fit-gauge');
    expect(el.querySelector('svg')).toBeTruthy();
    expect(el.textContent).toContain('8.5');
    expect(el.textContent).toContain('Excellent Fit');
  });

  it('uses green color for high scores (>=8)', () => {
    const el = createFitGauge(9, 'Great');
    const circle = el.querySelectorAll('circle')[1];
    expect(circle?.getAttribute('stroke')).toBe('#4CAF50');
  });

  it('uses yellow-green for good scores (>=6)', () => {
    const el = createFitGauge(7, 'Good');
    const circle = el.querySelectorAll('circle')[1];
    expect(circle?.getAttribute('stroke')).toBe('#8BC34A');
  });

  it('uses orange for fair scores (>=4)', () => {
    const el = createFitGauge(5, 'Fair');
    const circle = el.querySelectorAll('circle')[1];
    expect(circle?.getAttribute('stroke')).toBe('#FF9800');
  });

  it('uses red for poor scores (<4)', () => {
    const el = createFitGauge(2, 'Poor');
    const circle = el.querySelectorAll('circle')[1];
    expect(circle?.getAttribute('stroke')).toBe('#F44336');
  });
});

describe('createNutrientBar', () => {
  it('renders name and value', () => {
    const el = createNutrientBar('Protein', '25g');
    expect(el.textContent).toContain('Protein');
    expect(el.textContent).toContain('25g');
  });

  it('renders DV% bar when provided', () => {
    const el = createNutrientBar('Iron', '8mg', 45);
    expect(el.textContent).toContain('45% DV');
    const fill = el.querySelector('.nutrient-fill') as HTMLElement;
    expect(fill).toBeTruthy();
    expect(fill.style.width).toBe('45%');
  });

  it('caps DV% bar at 100%', () => {
    const el = createNutrientBar('Sodium', '2000mg', 150);
    const fill = el.querySelector('.nutrient-fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('omits DV bar when no percent given', () => {
    const el = createNutrientBar('Fiber', '5g');
    expect(el.querySelector('.nutrient-fill')).toBeFalsy();
  });
});

describe('createMacroSummary', () => {
  it('renders 4-item grid (kcal, protein, carbs, fat)', () => {
    const nutrition: NutritionInfo = {
      calories: 300,
      protein: '25g',
      totalCarbohydrates: '35g',
      totalFat: '12g',
    } as NutritionInfo;

    const el = createMacroSummary(nutrition);
    expect(el.className).toContain('syntropy-macro-summary');
    const items = el.querySelectorAll('.macro-item');
    expect(items.length).toBe(4);
    expect(el.textContent).toContain('300');
    expect(el.textContent).toContain('25g');
    expect(el.textContent).toContain('35g');
    expect(el.textContent).toContain('12g');
  });
});

describe('createRecommendationBanner', () => {
  it('positive variant shows check icon', () => {
    const el = createRecommendationBanner('Great choice!', 'positive');
    expect(el.className).toContain('positive');
    expect(el.querySelector('.rec-icon')?.textContent).toContain('✓');
    expect(el.querySelector('.rec-text')?.textContent).toBe('Great choice!');
  });

  it('warning variant shows exclamation icon', () => {
    const el = createRecommendationBanner('Contains allergen', 'warning');
    expect(el.className).toContain('warning');
    expect(el.querySelector('.rec-icon')?.textContent).toContain('!');
  });

  it('neutral variant shows info icon', () => {
    const el = createRecommendationBanner('Review this product', 'neutral');
    expect(el.className).toContain('neutral');
    expect(el.querySelector('.rec-icon')?.textContent).toContain('i');
  });
});

describe('createSourceBadge', () => {
  it('renders source text', () => {
    const el = createSourceBadge('USDA FoodData Central');
    expect(el.className).toContain('syntropy-source-badge');
    expect(el.textContent).toBe('Source: USDA FoodData Central');
  });
});
