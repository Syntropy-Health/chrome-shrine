/**
 * OpenNutrition Types
 *
 * Ported from mcp-opennutrition for client-side nutrition calculations.
 * These types mirror the MCP server's data model for compatibility.
 *
 * @module nutrition/types
 */

export interface MacroResult {
  food_id: string;
  food_name: string;
  portion_g: number;
  macros: MacroValues;
  data_completeness: number;
  source: 'opennutrition' | 'usda_fdc' | 'ai_estimated';
}

export interface MacroValues {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
}

export interface MealMacroResult {
  total_macros: MacroValues;
  per_ingredient: MacroResult[];
  total_portion_g: number;
  ingredient_count: number;
}

export interface NutrientGap {
  nutrient: string;
  consumed: number;
  target: number;
  unit: string;
  deficit_pct: number;
  status: 'deficient' | 'adequate' | 'excess';
}

export interface NutrientGapResult {
  target_profile: string;
  gaps: NutrientGap[];
  overall_score: number;
}

export interface FullNutritionProfile {
  food_id: string;
  food_name: string;
  per_100g: Record<string, number>;
  macros: MacroValues;
  micros: Record<string, { value: number; unit: string }>;
  data_completeness: number;
  source: string;
}

export interface OpenNutritionFoodItem {
  id: string;
  name: string;
  type?: 'everyday' | 'grocery' | 'prepared' | 'restaurant';
  labels?: string[];
  nutrition_100g?: Record<string, number>;
  alternate_names?: string[];
  ean_13?: string;
  ingredients?: string;
  serving?: Record<string, any>;
}
