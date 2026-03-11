/**
 * RDA/DRI (Recommended Dietary Allowances / Dietary Reference Intakes)
 *
 * Ported from mcp-opennutrition for client-side nutrient gap analysis.
 *
 * Sources:
 * - National Institutes of Health (NIH) Office of Dietary Supplements
 * - USDA Dietary Guidelines for Americans 2020-2025
 * - Institute of Medicine (IOM) DRI tables
 *
 * Values are daily targets for adults (19-50 years).
 *
 * @module nutrition/rda
 */

export interface RDAEntry {
  nutrient: string;
  amount: number;
  unit: string;
  nutrition_key: string;
}

export type RDAProfile = 'adult_male' | 'adult_female';

const ADULT_MALE_RDA: RDAEntry[] = [
  { nutrient: 'calories', amount: 2500, unit: 'kcal', nutrition_key: 'calories' },
  { nutrient: 'protein', amount: 56, unit: 'g', nutrition_key: 'protein' },
  { nutrient: 'carbohydrates', amount: 325, unit: 'g', nutrition_key: 'carbohydrates' },
  { nutrient: 'total_fat', amount: 78, unit: 'g', nutrition_key: 'total_fat' },
  { nutrient: 'dietary_fiber', amount: 38, unit: 'g', nutrition_key: 'dietary_fiber' },
  { nutrient: 'total_sugars', amount: 36, unit: 'g', nutrition_key: 'total_sugars' },
  { nutrient: 'saturated_fats', amount: 20, unit: 'g', nutrition_key: 'saturated_fats' },
  { nutrient: 'calcium', amount: 1000, unit: 'mg', nutrition_key: 'calcium' },
  { nutrient: 'iron', amount: 8, unit: 'mg', nutrition_key: 'iron' },
  { nutrient: 'magnesium', amount: 420, unit: 'mg', nutrition_key: 'magnesium' },
  { nutrient: 'phosphorus', amount: 700, unit: 'mg', nutrition_key: 'phosphorus' },
  { nutrient: 'potassium', amount: 3400, unit: 'mg', nutrition_key: 'potassium' },
  { nutrient: 'sodium', amount: 2300, unit: 'mg', nutrition_key: 'sodium' },
  { nutrient: 'zinc', amount: 11, unit: 'mg', nutrition_key: 'zinc' },
  { nutrient: 'vitamin_a', amount: 900, unit: 'mcg', nutrition_key: 'vitamin_a' },
  { nutrient: 'vitamin_c', amount: 90, unit: 'mg', nutrition_key: 'vitamin_c' },
  { nutrient: 'vitamin_d', amount: 15, unit: 'mcg', nutrition_key: 'vitamin_d' },
  { nutrient: 'vitamin_e', amount: 15, unit: 'mg', nutrition_key: 'vitamin_e' },
  { nutrient: 'vitamin_k', amount: 120, unit: 'mcg', nutrition_key: 'vitamin_k' },
  { nutrient: 'vitamin_b6', amount: 1.3, unit: 'mg', nutrition_key: 'vitamin_b6' },
  { nutrient: 'vitamin_b12', amount: 2.4, unit: 'mcg', nutrition_key: 'vitamin_b12' },
  { nutrient: 'folate_dfe', amount: 400, unit: 'mcg', nutrition_key: 'folate_dfe' },
];

const ADULT_FEMALE_RDA: RDAEntry[] = [
  { nutrient: 'calories', amount: 2000, unit: 'kcal', nutrition_key: 'calories' },
  { nutrient: 'protein', amount: 46, unit: 'g', nutrition_key: 'protein' },
  { nutrient: 'carbohydrates', amount: 260, unit: 'g', nutrition_key: 'carbohydrates' },
  { nutrient: 'total_fat', amount: 62, unit: 'g', nutrition_key: 'total_fat' },
  { nutrient: 'dietary_fiber', amount: 25, unit: 'g', nutrition_key: 'dietary_fiber' },
  { nutrient: 'total_sugars', amount: 25, unit: 'g', nutrition_key: 'total_sugars' },
  { nutrient: 'saturated_fats', amount: 16, unit: 'g', nutrition_key: 'saturated_fats' },
  { nutrient: 'calcium', amount: 1000, unit: 'mg', nutrition_key: 'calcium' },
  { nutrient: 'iron', amount: 18, unit: 'mg', nutrition_key: 'iron' },
  { nutrient: 'magnesium', amount: 320, unit: 'mg', nutrition_key: 'magnesium' },
  { nutrient: 'phosphorus', amount: 700, unit: 'mg', nutrition_key: 'phosphorus' },
  { nutrient: 'potassium', amount: 2600, unit: 'mg', nutrition_key: 'potassium' },
  { nutrient: 'sodium', amount: 2300, unit: 'mg', nutrition_key: 'sodium' },
  { nutrient: 'zinc', amount: 8, unit: 'mg', nutrition_key: 'zinc' },
  { nutrient: 'vitamin_a', amount: 700, unit: 'mcg', nutrition_key: 'vitamin_a' },
  { nutrient: 'vitamin_c', amount: 75, unit: 'mg', nutrition_key: 'vitamin_c' },
  { nutrient: 'vitamin_d', amount: 15, unit: 'mcg', nutrition_key: 'vitamin_d' },
  { nutrient: 'vitamin_e', amount: 15, unit: 'mg', nutrition_key: 'vitamin_e' },
  { nutrient: 'vitamin_k', amount: 90, unit: 'mcg', nutrition_key: 'vitamin_k' },
  { nutrient: 'vitamin_b6', amount: 1.3, unit: 'mg', nutrition_key: 'vitamin_b6' },
  { nutrient: 'vitamin_b12', amount: 2.4, unit: 'mcg', nutrition_key: 'vitamin_b12' },
  { nutrient: 'folate_dfe', amount: 400, unit: 'mcg', nutrition_key: 'folate_dfe' },
];

const RDA_PROFILES: Record<RDAProfile, RDAEntry[]> = {
  adult_male: ADULT_MALE_RDA,
  adult_female: ADULT_FEMALE_RDA,
};

export function getRDAProfile(profile: RDAProfile): RDAEntry[] {
  return RDA_PROFILES[profile];
}

export function getRDAEntry(profile: RDAProfile, nutrient: string): RDAEntry | undefined {
  return RDA_PROFILES[profile].find(
    (entry) => entry.nutrient === nutrient || entry.nutrition_key === nutrient
  );
}
