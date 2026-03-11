/**
 * Nutrition Calculator
 *
 * Client-side calculation engine ported from mcp-opennutrition's SQLiteDBAdapter.
 * Provides macro calculation, meal aggregation, and nutrient gap analysis
 * without requiring a SQLite database.
 *
 * @module nutrition/calculator
 */

import type { NutritionInfo } from '@types';
import { getRDAEntry, getRDAProfile, type RDAProfile } from './rda';
import type { MacroResult, MacroValues, MealMacroResult, NutrientGap, NutrientGapResult } from './types';

const CORE_MACRO_KEYS = [
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar',
] as const;

/**
 * Scale a nutrient value from per-100g to the given portion size
 */
function scaleNutrient(valuePer100g: number | undefined, portionGrams: number): number {
  if (valuePer100g === undefined || valuePer100g === null) return 0;
  return Math.round(valuePer100g * portionGrams / 100 * 100) / 100;
}

/**
 * Parse a numeric value from a nutrition string like "25g" or "300mg"
 */
function parseNutrientValue(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  return parseFloat(value) || 0;
}

/**
 * Build MacroValues from NutritionInfo
 */
export function extractMacros(nutrition: NutritionInfo | null): MacroValues {
  if (!nutrition) {
    return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 };
  }
  return {
    calories: parseNutrientValue(nutrition.calories),
    protein_g: parseNutrientValue(nutrition.protein),
    carbs_g: parseNutrientValue(nutrition.totalCarbohydrates),
    fat_g: parseNutrientValue(nutrition.totalFat),
    fiber_g: parseNutrientValue(nutrition.dietaryFiber),
    sugar_g: parseNutrientValue(nutrition.sugars),
  };
}

/**
 * Calculate data completeness score (0-1) based on how many macro fields
 * have non-zero values
 */
export function calculateDataCompleteness(macros: MacroValues): number {
  const values = [
    macros.calories, macros.protein_g, macros.carbs_g,
    macros.fat_g, macros.fiber_g, macros.sugar_g,
  ];
  const present = values.filter((v) => v > 0).length;
  return Math.round((present / CORE_MACRO_KEYS.length) * 100) / 100;
}

/**
 * Build a MacroResult from NutritionInfo and metadata
 */
export function buildMacroResult(
  foodName: string,
  nutrition: NutritionInfo | null,
  portionGrams: number = 100,
  source: MacroResult['source'] = 'usda_fdc',
): MacroResult {
  const macros = extractMacros(nutrition);

  // Scale from serving size to portion size if needed
  const scaleFactor = portionGrams / 100;
  const scaledMacros: MacroValues = {
    calories: Math.round(macros.calories * scaleFactor * 100) / 100,
    protein_g: Math.round(macros.protein_g * scaleFactor * 100) / 100,
    carbs_g: Math.round(macros.carbs_g * scaleFactor * 100) / 100,
    fat_g: Math.round(macros.fat_g * scaleFactor * 100) / 100,
    fiber_g: Math.round(macros.fiber_g * scaleFactor * 100) / 100,
    sugar_g: Math.round(macros.sugar_g * scaleFactor * 100) / 100,
  };

  return {
    food_id: `search_${foodName.toLowerCase().replace(/\s+/g, '_').slice(0, 32)}`,
    food_name: foodName,
    portion_g: portionGrams,
    macros: scaledMacros,
    data_completeness: calculateDataCompleteness(macros),
    source,
  };
}

/**
 * Calculate total macros for a meal composed of multiple MacroResults
 */
export function aggregateMealMacros(ingredients: MacroResult[]): MealMacroResult {
  const totalMacros: MacroValues = {
    calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0,
  };
  let totalPortion = 0;

  for (const item of ingredients) {
    totalMacros.calories += item.macros.calories;
    totalMacros.protein_g += item.macros.protein_g;
    totalMacros.carbs_g += item.macros.carbs_g;
    totalMacros.fat_g += item.macros.fat_g;
    totalMacros.fiber_g += item.macros.fiber_g;
    totalMacros.sugar_g += item.macros.sugar_g;
    totalPortion += item.portion_g;
  }

  // Round totals
  for (const key of Object.keys(totalMacros) as (keyof MacroValues)[]) {
    totalMacros[key] = Math.round(totalMacros[key] * 100) / 100;
  }

  return {
    total_macros: totalMacros,
    per_ingredient: ingredients,
    total_portion_g: totalPortion,
    ingredient_count: ingredients.length,
  };
}

/**
 * Perform nutrient gap analysis comparing consumed amounts against RDA targets
 */
export function analyzeNutrientGaps(
  consumed: Array<{ nutrient: string; amount: number }>,
  targetProfile: RDAProfile,
): NutrientGapResult {
  const gaps: NutrientGap[] = [];
  let totalScore = 0;
  let scoredCount = 0;

  for (const item of consumed) {
    const rdaEntry = getRDAEntry(targetProfile, item.nutrient);
    if (!rdaEntry) {
      gaps.push({
        nutrient: item.nutrient,
        consumed: item.amount,
        target: 0,
        unit: 'unknown',
        deficit_pct: 0,
        status: 'adequate',
      });
      continue;
    }

    const target = rdaEntry.amount;
    const ratio = target > 0 ? item.amount / target : 1;
    const deficitPct = target > 0
      ? Math.round((1 - Math.min(ratio, 1)) * 100 * 100) / 100
      : 0;

    let status: NutrientGap['status'];
    if (ratio < 0.7) {
      status = 'deficient';
    } else if (ratio > 1.5) {
      status = 'excess';
    } else {
      status = 'adequate';
    }

    gaps.push({
      nutrient: item.nutrient,
      consumed: item.amount,
      target,
      unit: rdaEntry.unit,
      deficit_pct: deficitPct,
      status,
    });

    totalScore += Math.min(ratio, 1);
    scoredCount++;
  }

  const overallScore = scoredCount > 0
    ? Math.round((totalScore / scoredCount) * 100 * 100) / 100
    : 0;

  return {
    target_profile: targetProfile,
    gaps,
    overall_score: overallScore,
  };
}

/**
 * Convert MacroValues to an array of consumed nutrients for gap analysis
 */
export function macrosToConsumedNutrients(macros: MacroValues): Array<{ nutrient: string; amount: number }> {
  return [
    { nutrient: 'calories', amount: macros.calories },
    { nutrient: 'protein', amount: macros.protein_g },
    { nutrient: 'carbohydrates', amount: macros.carbs_g },
    { nutrient: 'total_fat', amount: macros.fat_g },
    { nutrient: 'dietary_fiber', amount: macros.fiber_g },
    { nutrient: 'total_sugars', amount: macros.sugar_g },
  ];
}

/**
 * Calculate macro percentages for chart rendering
 */
export function calculateMacroPercentages(macros: MacroValues): {
  protein: number;
  carbs: number;
  fat: number;
} {
  const total = macros.protein_g + macros.carbs_g + macros.fat_g;
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((macros.protein_g / total) * 100),
    carbs: Math.round((macros.carbs_g / total) * 100),
    fat: Math.round((macros.fat_g / total) * 100),
  };
}
