/**
 * Nutrition Module
 *
 * Central nutrition engine combining OpenNutrition data, USDA FDC,
 * and client-side calculations for the Chrome extension.
 *
 * @module nutrition
 */

export { OpenNutritionClient } from './client';
export {
  aggregateMealMacros,
  analyzeNutrientGaps,
  buildMacroResult,
  calculateDataCompleteness,
  calculateMacroPercentages,
  extractMacros,
  macrosToConsumedNutrients,
} from './calculator';
export { getRDAEntry, getRDAProfile, type RDAProfile } from './rda';
export type {
  FullNutritionProfile,
  MacroResult,
  MacroValues,
  MealMacroResult,
  NutrientGap,
  NutrientGapResult,
  OpenNutritionFoodItem,
} from './types';
