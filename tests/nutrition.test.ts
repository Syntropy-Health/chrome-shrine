/**
 * Tests for the OpenNutrition calculation engine
 */

import { describe, it, expect } from 'vitest';
import {
  extractMacros,
  calculateDataCompleteness,
  buildMacroResult,
  aggregateMealMacros,
  analyzeNutrientGaps,
  calculateMacroPercentages,
  macrosToConsumedNutrients,
} from '../src/modules/nutrition/calculator';
import { getRDAProfile, getRDAEntry } from '../src/modules/nutrition/rda';
import type { NutritionInfo } from '../src/types';

describe('extractMacros', () => {
  it('should extract macros from NutritionInfo', () => {
    const nutrition: NutritionInfo = {
      calories: 250,
      protein: '20g',
      totalCarbohydrates: '30g',
      totalFat: '10g',
      dietaryFiber: '5g',
      sugars: '8g',
    };

    const macros = extractMacros(nutrition);
    expect(macros.calories).toBe(250);
    expect(macros.protein_g).toBe(20);
    expect(macros.carbs_g).toBe(30);
    expect(macros.fat_g).toBe(10);
    expect(macros.fiber_g).toBe(5);
    expect(macros.sugar_g).toBe(8);
  });

  it('should handle null nutrition', () => {
    const macros = extractMacros(null);
    expect(macros.calories).toBe(0);
    expect(macros.protein_g).toBe(0);
  });

  it('should handle missing fields', () => {
    const nutrition: NutritionInfo = { calories: 100 };
    const macros = extractMacros(nutrition);
    expect(macros.calories).toBe(100);
    expect(macros.protein_g).toBe(0);
    expect(macros.fat_g).toBe(0);
  });
});

describe('calculateDataCompleteness', () => {
  it('should return 1.0 for complete data', () => {
    const macros = { calories: 250, protein_g: 20, carbs_g: 30, fat_g: 10, fiber_g: 5, sugar_g: 8 };
    expect(calculateDataCompleteness(macros)).toBe(1);
  });

  it('should return 0 for all-zero data', () => {
    const macros = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 };
    expect(calculateDataCompleteness(macros)).toBe(0);
  });

  it('should return partial score', () => {
    const macros = { calories: 250, protein_g: 20, carbs_g: 0, fat_g: 10, fiber_g: 0, sugar_g: 0 };
    expect(calculateDataCompleteness(macros)).toBe(0.5);
  });
});

describe('buildMacroResult', () => {
  it('should build a MacroResult from NutritionInfo', () => {
    const nutrition: NutritionInfo = {
      calories: 200,
      protein: '25g',
      totalCarbohydrates: '10g',
      totalFat: '8g',
    };

    const result = buildMacroResult('Chicken Breast', nutrition, 150);
    expect(result.food_name).toBe('Chicken Breast');
    expect(result.portion_g).toBe(150);
    expect(result.macros.calories).toBeCloseTo(300, 0); // 200 * 1.5
    expect(result.macros.protein_g).toBeCloseTo(37.5, 0); // 25 * 1.5
    expect(result.source).toBe('usda_fdc');
  });

  it('should use default 100g portion', () => {
    const nutrition: NutritionInfo = { calories: 100, protein: '10g' };
    const result = buildMacroResult('Test Food', nutrition);
    expect(result.portion_g).toBe(100);
    expect(result.macros.calories).toBe(100);
  });
});

describe('aggregateMealMacros', () => {
  it('should aggregate macros from multiple ingredients', () => {
    const ingredients = [
      buildMacroResult('Rice', { calories: 130, protein: '2.7g', totalCarbohydrates: '28g', totalFat: '0.3g' } as NutritionInfo, 200),
      buildMacroResult('Chicken', { calories: 165, protein: '31g', totalCarbohydrates: '0g', totalFat: '3.6g' } as NutritionInfo, 150),
    ];

    const meal = aggregateMealMacros(ingredients);
    expect(meal.ingredient_count).toBe(2);
    expect(meal.total_portion_g).toBe(350);
    expect(meal.total_macros.calories).toBeGreaterThan(0);
    expect(meal.total_macros.protein_g).toBeGreaterThan(0);
  });

  it('should handle empty ingredients', () => {
    const meal = aggregateMealMacros([]);
    expect(meal.ingredient_count).toBe(0);
    expect(meal.total_portion_g).toBe(0);
    expect(meal.total_macros.calories).toBe(0);
  });
});

describe('analyzeNutrientGaps', () => {
  it('should detect deficiencies', () => {
    const consumed = [
      { nutrient: 'iron', amount: 2 }, // Way below 8mg RDA for males
      { nutrient: 'calcium', amount: 900 }, // Close to 1000mg RDA
    ];

    const result = analyzeNutrientGaps(consumed, 'adult_male');
    expect(result.gaps).toHaveLength(2);

    const ironGap = result.gaps.find((g) => g.nutrient === 'iron');
    expect(ironGap?.status).toBe('deficient');

    const calciumGap = result.gaps.find((g) => g.nutrient === 'calcium');
    expect(calciumGap?.status).toBe('adequate');
  });

  it('should detect excess', () => {
    const consumed = [
      { nutrient: 'sodium', amount: 5000 }, // Way above 2300mg RDA
    ];

    const result = analyzeNutrientGaps(consumed, 'adult_female');
    const sodiumGap = result.gaps.find((g) => g.nutrient === 'sodium');
    expect(sodiumGap?.status).toBe('excess');
  });

  it('should calculate overall score', () => {
    const consumed = [
      { nutrient: 'calories', amount: 2500 },
      { nutrient: 'protein', amount: 56 },
    ];

    const result = analyzeNutrientGaps(consumed, 'adult_male');
    expect(result.overall_score).toBeCloseTo(100, 0);
  });
});

describe('calculateMacroPercentages', () => {
  it('should calculate correct percentages', () => {
    const macros = { calories: 500, protein_g: 25, carbs_g: 50, fat_g: 25, fiber_g: 5, sugar_g: 10 };
    const pcts = calculateMacroPercentages(macros);
    expect(pcts.protein).toBe(25);
    expect(pcts.carbs).toBe(50);
    expect(pcts.fat).toBe(25);
  });

  it('should handle all zeros', () => {
    const macros = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 };
    const pcts = calculateMacroPercentages(macros);
    expect(pcts.protein).toBe(0);
    expect(pcts.carbs).toBe(0);
    expect(pcts.fat).toBe(0);
  });
});

describe('macrosToConsumedNutrients', () => {
  it('should convert MacroValues to consumed array', () => {
    const macros = { calories: 2000, protein_g: 50, carbs_g: 250, fat_g: 65, fiber_g: 25, sugar_g: 30 };
    const consumed = macrosToConsumedNutrients(macros);
    expect(consumed).toHaveLength(6);
    expect(consumed[0]).toEqual({ nutrient: 'calories', amount: 2000 });
    expect(consumed[1]).toEqual({ nutrient: 'protein', amount: 50 });
  });
});

describe('RDA', () => {
  it('should return adult male RDA profile', () => {
    const profile = getRDAProfile('adult_male');
    expect(profile.length).toBeGreaterThan(10);
    const calories = profile.find((e) => e.nutrient === 'calories');
    expect(calories?.amount).toBe(2500);
  });

  it('should return adult female RDA profile', () => {
    const profile = getRDAProfile('adult_female');
    const calories = profile.find((e) => e.nutrient === 'calories');
    expect(calories?.amount).toBe(2000);
  });

  it('should find RDA entry by nutrient name', () => {
    const entry = getRDAEntry('adult_male', 'iron');
    expect(entry?.amount).toBe(8);
    expect(entry?.unit).toBe('mg');
  });

  it('should find RDA entry by nutrition key', () => {
    const entry = getRDAEntry('adult_female', 'dietary_fiber');
    expect(entry?.amount).toBe(25);
  });

  it('should return undefined for unknown nutrient', () => {
    const entry = getRDAEntry('adult_male', 'unknown_nutrient');
    expect(entry).toBeUndefined();
  });
});
