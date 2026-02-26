/**
 * AI Agent Module
 *
 * Main orchestrator for AI-powered food analysis.
 * Coordinates image processing, ingredient analysis, safety checks,
 * and personalized recommendations using AI SDK.
 *
 * @module ai/agent
 */

import { ConfigManager } from '@/config/config';
import { openai } from '@ai-sdk/openai';
import { IntegrationManager } from '@modules/integrations';
import type { AIAnalysis, ExtensionConfig, FoodProduct } from '@types';
import { CacheManager } from '@utils/storage';
import { generateObject } from 'ai';
import { ImageProcessor } from './image-processor';
import { aiAnalysisSchema, type AIAnalysisOutput } from './schemas';

/**
 * Food analysis agent
 * Provides comprehensive AI-powered analysis of food products
 */
export class FoodAnalysisAgent {
  private static instance: FoodAnalysisAgent;
  private imageProcessor = ImageProcessor.getInstance();
  private integrationManager = IntegrationManager.getInstance();
  private config = ConfigManager.getInstance();

  private constructor() { }

  /**
   * Get singleton instance
   */
  static getInstance(): FoodAnalysisAgent {
    if (!FoodAnalysisAgent.instance) {
      FoodAnalysisAgent.instance = new FoodAnalysisAgent();
    }
    return FoodAnalysisAgent.instance;
  }

  /**
   * Analyze a food product
   * Main entry point for comprehensive product analysis
   *
   * @param product - Food product to analyze
   * @param options - Analysis options
   * @returns Complete AI analysis
   */
  async analyzeProduct(
    product: FoodProduct,
    options: {
      useCache?: boolean;
      includeRecalls?: boolean;
      processImages?: boolean;
    } = {}
  ): Promise<AIAnalysis> {
    const {
      useCache = true,
      includeRecalls = true,
      processImages = true,
    } = options;

    const startTime = Date.now();

    try {
      // Check cache first
      if (useCache) {
        const cached = await CacheManager.getAnalysis(product.id);
        if (cached) {
          console.log('[FoodAnalysisAgent] Using cached analysis');
          return cached;
        }
      }

      // Get configuration
      const config = this.config.get();

      if (!config.apiKey) {
        throw new Error('API key not configured');
      }

      // Process images to extract additional ingredients and nutrition
      let imageAnalysis = null;
      if (processImages && product.images.length > 0) {
        imageAnalysis = await this.imageProcessor.processImages(
          product.images,
          product.name
        );

        // Merge image-extracted ingredients
        if (imageAnalysis?.ingredients) {
          product.ingredients.push(
            ...imageAnalysis.ingredients.map((name) => ({ name }))
          );
        }

        // Merge nutrition info
        if (imageAnalysis?.nutrition) {
          product.nutrition = {
            ...product.nutrition,
            ...imageAnalysis.nutrition,
          };
        }
      }

      // Check for recalls
      let recalls = [];
      if (includeRecalls) {
        recalls = await this.integrationManager.checkProduct(
          product.name,
          product.brand
        );
      }

      // Generate AI analysis
      const aiAnalysis = await this.generateAnalysis(product, config);

      // Build complete analysis
      const analysis: AIAnalysis = {
        safetyScore: aiAnalysis.safetyScore,
        healthScore: aiAnalysis.healthScore,
        summary: aiAnalysis.summary,
        insights: aiAnalysis.insights.map((insight) => ({
          category: insight.category,
          text: insight.text,
          importance: insight.importance,
        })),
        recommendations: aiAnalysis.recommendations.map((rec) => rec.text),
        concerns: [
          ...aiAnalysis.concerns.map((concern) => ({
            type: concern.type,
            severity: concern.severity,
            title: concern.title,
            description: concern.description,
            source: concern.source,
          })),
          // Add recalls as concerns
          ...recalls.map((recall) => ({
            type: 'recall' as const,
            severity: recall.classification === 'Class I' ? 'critical' as const :
              recall.classification === 'Class II' ? 'high' as const :
                'medium' as const,
            title: `RECALL: ${recall.productName}`,
            description: recall.reason,
            source: recall.source,
            date: recall.recallDate,
            url: recall.url,
          })),
        ],
        recalls,
        metadata: {
          model: config.model,
          processingTime: Date.now() - startTime,
          confidence: imageAnalysis?.confidence || 0.9,
        },
      };

      // Cache the analysis
      await CacheManager.setAnalysis(product.id, analysis);

      return analysis;
    } catch (error) {
      console.error('[FoodAnalysisAgent] Analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate AI analysis using LLM
   * @param product - Food product
   * @param config - Extension configuration
   * @returns AI analysis output
   */
  private async generateAnalysis(
    product: FoodProduct,
    config: ExtensionConfig
  ): Promise<AIAnalysisOutput> {
    try {
      const result = await generateObject({
        model: openai(config.model) as any,
        schema: aiAnalysisSchema,
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(config),
          },
          {
            role: 'user',
            content: this.buildUserPrompt(product),
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
      });

      return result.object;
    } catch (error) {
      console.error('[FoodAnalysisAgent] LLM error:', error);
      throw error;
    }
  }

  /**
   * Build system prompt for AI analysis
   * @param config - Extension configuration
   * @returns System prompt
   */
  private buildSystemPrompt(config: ExtensionConfig): string {
    const { preferences } = config;

    let prompt = `You are an expert nutritionist and food safety analyst. Your role is to provide comprehensive, accurate analysis of food products.

Your analysis should consider:
1. Ingredient quality and health impacts
2. Nutritional value and balance
3. Potential allergens and safety concerns
4. Processing level and additives
5. Overall health impact

Provide objective, science-based assessments while being helpful and clear.`;

    // Add user preferences
    if (preferences.dietaryRestrictions.length > 0) {
      prompt += `\n\nUser's dietary restrictions: ${preferences.dietaryRestrictions.join(', ')}`;
    }

    if (preferences.allergens.length > 0) {
      prompt += `\n\nUser's allergens to avoid: ${preferences.allergens.join(', ')}`;
    }

    if (preferences.healthGoals.length > 0) {
      prompt += `\n\nUser's health goals: ${preferences.healthGoals.join(', ')}`;
    }

    return prompt;
  }

  /**
   * Build user prompt with product details
   * @param product - Food product
   * @returns User prompt
   */
  private buildUserPrompt(product: FoodProduct): string {
    let prompt = `Analyze this food product:

Product: ${product.name}`;

    if (product.brand) {
      prompt += `\nBrand: ${product.brand}`;
    }

    if (product.description) {
      prompt += `\nDescription: ${product.description}`;
    }

    if (product.ingredients.length > 0) {
      prompt += `\n\nIngredients:\n${product.ingredients.map((ing) => `- ${ing.name}`).join('\n')}`;
    }

    if (product.nutrition) {
      prompt += `\n\nNutrition Facts:`;
      if (product.nutrition.servingSize) {
        prompt += `\nServing Size: ${product.nutrition.servingSize}`;
      }
      if (product.nutrition.calories) {
        prompt += `\nCalories: ${product.nutrition.calories}`;
      }
      if (product.nutrition.protein) {
        prompt += `\nProtein: ${product.nutrition.protein}`;
      }
      if (product.nutrition.totalCarbohydrates) {
        prompt += `\nCarbohydrates: ${product.nutrition.totalCarbohydrates}`;
      }
      if (product.nutrition.totalFat) {
        prompt += `\nFat: ${product.nutrition.totalFat}`;
      }
      if (product.nutrition.sodium) {
        prompt += `\nSodium: ${product.nutrition.sodium}`;
      }
    }

    prompt += `\n\nProvide a comprehensive analysis including:
1. Safety score (0-100) - considering additives, processing, contaminants
2. Health score (0-100) - considering nutritional value, ingredients quality
3. Brief summary (2-3 sentences)
4. Key insights categorized appropriately
5. Detailed ingredient analysis
6. Nutritional assessment (if nutrition data available)
7. Personalized recommendations based on user preferences
8. Any safety or health concerns

Be thorough but concise. Focus on actionable insights.`;

    return prompt;
  }

  /**
   * Quick analysis for hover cards (simplified version)
   * @param product - Food product
   * @returns Simplified analysis
   */
  async quickAnalysis(product: FoodProduct): Promise<{
    score: number;
    summary: string;
    keyPoints: string[];
  }> {
    try {
      // Check cache
      const cached = await CacheManager.getAnalysis(product.id);
      if (cached) {
        return {
          score: (cached.safetyScore + cached.healthScore) / 2,
          summary: cached.summary,
          keyPoints: cached.insights.slice(0, 3).map((i) => i.text),
        };
      }

      // Generate quick analysis without full processing
      const config = this.config.get();

      if (!config.apiKey) {
        return {
          score: 50,
          summary: 'Configure API key to enable AI analysis',
          keyPoints: [],
        };
      }

      const result = await generateObject({
        model: openai(config.model) as any,
        schema: aiAnalysisSchema,
        messages: [
          {
            role: 'system',
            content: 'Provide a quick, concise food product analysis.',
          },
          {
            role: 'user',
            content: `Quick analysis of: ${product.name}\nIngredients: ${product.ingredients.map(i => i.name).join(', ') || 'Unknown'}`,
          },
        ],
        temperature: 0.3,
      });

      return {
        score: (result.object.safetyScore + result.object.healthScore) / 2,
        summary: result.object.summary,
        keyPoints: result.object.insights.slice(0, 3).map((i) => i.text),
      };
    } catch (error) {
      console.error('[FoodAnalysisAgent] Quick analysis error:', error);
      return {
        score: 50,
        summary: 'Error performing analysis',
        keyPoints: [],
      };
    }
  }
}
