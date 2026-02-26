/**
 * AI Module - Zod Schemas
 *
 * Defines Zod schemas for structured AI outputs.
 * Used with AI SDK's structured output generation.
 *
 * @module ai/schemas
 */

import { z } from 'zod';

/**
 * Safety concern schema
 */
export const safetyConcernSchema = z.object({
  type: z.enum(['recall', 'allergen', 'contamination', 'warning', 'advisory']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().describe('Brief title of the concern'),
  description: z.string().describe('Detailed description of the concern'),
  source: z.string().describe('Source of the information'),
});

/**
 * Insight schema
 */
export const insightSchema = z.object({
  category: z.string().describe('Category of insight (e.g., "Health Benefits", "Concerns")'),
  text: z.string().describe('The insight text'),
  importance: z.enum(['low', 'medium', 'high']),
});

/**
 * Ingredient analysis schema
 */
export const ingredientAnalysisSchema = z.object({
  name: z.string().describe('Ingredient name'),
  healthBenefits: z.array(z.string()).describe('Health benefits of this ingredient'),
  concerns: z.array(z.string()).describe('Potential health concerns or allergens'),
  isCommon: z.boolean().describe('Whether this is a common/natural ingredient'),
  isProcessed: z.boolean().describe('Whether this is a processed/artificial ingredient'),
});

/**
 * Nutritional assessment schema
 */
export const nutritionalAssessmentSchema = z.object({
  overallScore: z.number().min(0).max(100).describe('Overall nutrition score (0-100)'),
  strengths: z.array(z.string()).describe('Nutritional strengths'),
  weaknesses: z.array(z.string()).describe('Nutritional weaknesses'),
  macrobalance: z.string().describe('Assessment of macronutrient balance'),
});

/**
 * Personalized recommendation schema
 */
export const recommendationSchema = z.object({
  text: z.string().describe('Recommendation text'),
  reason: z.string().describe('Reason for this recommendation'),
  priority: z.enum(['low', 'medium', 'high']),
});

/**
 * Complete AI analysis schema
 */
export const aiAnalysisSchema = z.object({
  safetyScore: z.number().min(0).max(100).describe('Overall safety score (0-100)'),
  healthScore: z.number().min(0).max(100).describe('Overall health score (0-100)'),
  summary: z.string().describe('Brief summary of the analysis (2-3 sentences)'),
  insights: z.array(insightSchema).describe('Key insights about this product'),
  ingredientAnalysis: z.array(ingredientAnalysisSchema).describe('Detailed ingredient breakdown'),
  nutritionalAssessment: nutritionalAssessmentSchema.optional().describe('Nutritional assessment if data available'),
  recommendations: z.array(recommendationSchema).describe('Personalized recommendations'),
  concerns: z.array(safetyConcernSchema).describe('Safety and health concerns'),
});

/**
 * Image analysis schema
 */
export const imageAnalysisSchema = z.object({
  ingredientsDetected: z.array(z.string()).describe('Ingredients found in the image'),
  nutritionFacts: z.object({
    servingSize: z.string().optional(),
    calories: z.number().optional(),
    totalFat: z.string().optional(),
    saturatedFat: z.string().optional(),
    cholesterol: z.string().optional(),
    sodium: z.string().optional(),
    totalCarbohydrates: z.string().optional(),
    dietaryFiber: z.string().optional(),
    sugars: z.string().optional(),
    protein: z.string().optional(),
  }).optional().describe('Nutrition facts if visible in image'),
  warnings: z.array(z.string()).describe('Allergen warnings or other warnings detected'),
  confidence: z.number().min(0).max(1).describe('Confidence in the extraction (0-1)'),
});

/**
 * Batch ingredient analysis schema
 */
export const batchIngredientSchema = z.object({
  ingredients: z.array(ingredientAnalysisSchema),
  overallRating: z.number().min(0).max(100),
  primaryConcerns: z.array(z.string()),
});

/**
 * Type exports for TypeScript
 */
export type SafetyConcern = z.infer<typeof safetyConcernSchema>;
export type Insight = z.infer<typeof insightSchema>;
export type IngredientAnalysis = z.infer<typeof ingredientAnalysisSchema>;
export type NutritionalAssessment = z.infer<typeof nutritionalAssessmentSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type AIAnalysisOutput = z.infer<typeof aiAnalysisSchema>;
export type ImageAnalysisOutput = z.infer<typeof imageAnalysisSchema>;
export type BatchIngredientOutput = z.infer<typeof batchIngredientSchema>;
