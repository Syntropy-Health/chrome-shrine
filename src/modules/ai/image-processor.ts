/**
 * Image Processor Module
 *
 * Handles image-to-text extraction using vision-capable LLMs.
 * Prioritizes images and processes them in batches for efficiency.
 *
 * @module ai/image-processor
 */

import { ConfigManager } from '@/config/config';
import { openai } from '@ai-sdk/openai';
import type { ImageAnalysis, ProductImage } from '@types';
import { downloadImage } from '@utils/image-utils';
import { generateObject } from 'ai';
import { imageAnalysisSchema } from './schemas';

/**
 * Image processor class
 * Handles vision-based ingredient and nutrition extraction
 */
export class ImageProcessor {
  private static instance: ImageProcessor;
  private config = ConfigManager.getInstance();

  private constructor() { }

  /**
   * Get singleton instance
   */
  static getInstance(): ImageProcessor {
    if (!ImageProcessor.instance) {
      ImageProcessor.instance = new ImageProcessor();
    }
    return ImageProcessor.instance;
  }

  /**
   * Process images to extract ingredients and nutrition info
   * @param images - Array of product images (already prioritized)
   * @param productName - Product name for context
   * @returns Image analysis result
   */
  async processImages(
    images: ProductImage[],
    productName: string
  ): Promise<ImageAnalysis | null> {
    try {
      if (images.length === 0) {
        return null;
      }

      // Get the highest priority image
      const primaryImage = images[0];

      // Download image as base64
      const imageData = await downloadImage(primaryImage.url);
      if (!imageData) {
        console.warn('[ImageProcessor] Failed to download image');
        return null;
      }

      const config = this.config.get();

      if (!config.apiKey) {
        console.error('[ImageProcessor] No API key configured');
        return null;
      }

      // Use AI SDK to process the image
      const result = await generateObject({
        model: openai(config.model || 'gpt-4-vision-preview') as any,
        schema: imageAnalysisSchema,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: this.buildPrompt(productName),
              },
              {
                type: 'image',
                image: imageData,
              },
            ],
          },
        ],
      });

      return {
        text: result.object.ingredientsDetected.join(', '),
        ingredients: result.object.ingredientsDetected,
        nutrition: result.object.nutritionFacts,
        imageUrl: primaryImage.url,
        confidence: result.object.confidence,
      };
    } catch (error) {
      console.error('[ImageProcessor] Error processing images:', error);
      return null;
    }
  }

  /**
   * Process multiple images and combine results
   * @param images - Array of product images
   * @param productName - Product name
   * @returns Combined image analysis
   */
  async processMultipleImages(
    images: ProductImage[],
    productName: string
  ): Promise<ImageAnalysis | null> {
    try {
      // Process up to 3 images
      const imagesToProcess = images.slice(0, 3);
      const results = await Promise.all(
        imagesToProcess.map((img) =>
          this.processImages([img], productName)
        )
      );

      // Combine results
      const validResults = results.filter((r) => r !== null);

      if (validResults.length === 0) {
        return null;
      }

      // Merge ingredients and nutrition data
      const allIngredients = new Set<string>();
      let bestNutrition: ImageAnalysis['nutrition'] = undefined;
      let highestConfidence = 0;
      let bestImageUrl = imagesToProcess[0].url;

      validResults.forEach((result) => {
        result.ingredients.forEach((ing) => allIngredients.add(ing));

        if (result.confidence > highestConfidence) {
          highestConfidence = result.confidence;
          bestNutrition = result.nutrition;
          bestImageUrl = result.imageUrl;
        }
      });

      return {
        text: Array.from(allIngredients).join(', '),
        ingredients: Array.from(allIngredients),
        nutrition: bestNutrition,
        imageUrl: bestImageUrl,
        confidence: highestConfidence,
      };
    } catch (error) {
      console.error('[ImageProcessor] Error processing multiple images:', error);
      return null;
    }
  }

  /**
   * Build prompt for image analysis
   * @param productName - Product name
   * @returns Prompt text
   */
  private buildPrompt(productName: string): string {
    return `Analyze this image of "${productName}" and extract:

1. All visible ingredients from the ingredient list (if present)
2. Nutrition facts from the nutrition label (if present)
3. Any allergen warnings or health warnings
4. Your confidence in the extraction (0-1 scale)

Focus on:
- Reading ingredient lists completely and accurately
- Extracting all nutrition facts data
- Identifying common allergens (nuts, dairy, soy, etc.)
- Being conservative with confidence scores

Return your analysis in the structured format.`;
  }

  /**
   * Extract text from nutrition label specifically
   * @param image - Product image
   * @returns Extracted nutrition text
   */
  async extractNutritionLabel(image: ProductImage): Promise<string | null> {
    try {
      const imageData = await downloadImage(image.url);
      if (!imageData) {
        return null;
      }

      const config = this.config.get();

      if (!config.apiKey) {
        console.error('[ImageProcessor] No API key configured');
        return null;
      }

      // Simple text extraction
      const result = await generateObject({
        model: openai(config.model || 'gpt-4-vision-preview') as any,
        schema: imageAnalysisSchema,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from the nutrition facts label in this image. Be precise and complete.',
              },
              {
                type: 'image',
                image: imageData,
              },
            ],
          },
        ],
      });

      return result.object.ingredientsDetected.join('\n');
    } catch (error) {
      console.error('[ImageProcessor] Error extracting nutrition label:', error);
      return null;
    }
  }
}
