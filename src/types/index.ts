/**
 * Core type definitions for Syntropy Food Extension
 *
 * This module defines all shared types, interfaces, and enums used throughout the extension.
 * It provides type safety and clear contracts between modules.
 */

/**
 * Configuration for the extension
 */
export interface ExtensionConfig {
  /** API key for LLM provider (stored securely) */
  apiKey?: string;
  /** LLM provider (openai, anthropic, etc.) */
  provider: 'openai' | 'anthropic' | 'custom';
  /** Model name to use */
  model: string;
  /** Base URL for custom providers */
  baseUrl?: string;
  /** Enable/disable features */
  features: {
    hoverCards: boolean;
    safetyAlerts: boolean;
    ingredientAnalysis: boolean;
    personalInsights: boolean;
  };
  /** User preferences */
  preferences: {
    dietaryRestrictions: string[];
    allergens: string[];
    healthGoals: string[];
  };
}

/**
 * Represents a food product detected on a page
 */
export interface FoodProduct {
  /** Unique identifier for the product */
  id: string;
  /** Product name */
  name: string;
  /** Product brand */
  brand?: string;
  /** Product description */
  description?: string;
  /** List of ingredients */
  ingredients: Ingredient[];
  /** Nutritional information */
  nutrition?: NutritionInfo;
  /** Product images (sorted by priority) */
  images: ProductImage[];
  /** Source URL */
  url: string;
  /** Source website */
  source: 'amazon-fresh' | 'cookunity' | 'generic';
  /** DOM element reference (for hover cards) */
  element?: Element;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Represents a single ingredient
 */
export interface Ingredient {
  /** Ingredient name */
  name: string;
  /** Amount/quantity if specified */
  amount?: string;
  /** Potential allergens */
  allergens?: string[];
  /** Safety concerns */
  concerns?: SafetyConcern[];
  /** Health benefits */
  benefits?: string[];
  /** Additional notes */
  notes?: string;
}

/**
 * Nutritional information for a product
 */
export interface NutritionInfo {
  servingSize?: string;
  calories?: number;
  totalFat?: string;
  saturatedFat?: string;
  transFat?: string;
  cholesterol?: string;
  sodium?: string;
  totalCarbohydrates?: string;
  dietaryFiber?: string;
  sugars?: string;
  protein?: string;
  vitamins?: Record<string, string>;
  minerals?: Record<string, string>;
}

/**
 * Product image with metadata
 */
export interface ProductImage {
  /** Image URL */
  url: string;
  /** Image dimensions */
  width?: number;
  height?: number;
  /** Image size in bytes */
  size?: number;
  /** Image type (thumbnail, main, zoom, etc.) */
  type: 'thumbnail' | 'main' | 'zoom' | 'detail';
  /** Priority for processing (higher = more important) */
  priority: number;
}

/**
 * Safety concern related to an ingredient or product
 */
export interface SafetyConcern {
  /** Type of concern */
  type: 'recall' | 'allergen' | 'contamination' | 'warning' | 'advisory';
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Concern title */
  title: string;
  /** Detailed description */
  description: string;
  /** Source of information */
  source: string;
  /** Date of concern */
  date?: Date;
  /** Related URL for more info */
  url?: string;
}

/**
 * Food safety recall information
 */
export interface FoodRecall {
  /** Recall ID */
  id: string;
  /** Product name */
  productName: string;
  /** Company name */
  company: string;
  /** Recall reason */
  reason: string;
  /** Recall classification */
  classification: 'Class I' | 'Class II' | 'Class III';
  /** Recall date */
  recallDate: Date;
  /** Products affected */
  productsAffected: string[];
  /** Source (FDA, USDA, etc.) */
  source: 'FDA' | 'USDA' | 'Other';
  /** More information URL */
  url: string;
}

/**
 * AI analysis result for a food product
 */
export interface AIAnalysis {
  /** Overall safety score (0-100) */
  safetyScore: number;
  /** Health score (0-100) */
  healthScore: number;
  /** Summary of analysis */
  summary: string;
  /** Detailed insights */
  insights: {
    category: string;
    text: string;
    importance: 'low' | 'medium' | 'high';
  }[];
  /** Personalized recommendations */
  recommendations: string[];
  /** Potential concerns */
  concerns: SafetyConcern[];
  /** Matching recalls */
  recalls: FoodRecall[];
  /** Processing metadata */
  metadata: {
    model: string;
    processingTime: number;
    confidence: number;
  };
}

/**
 * Result from image-to-text processing
 */
export interface ImageAnalysis {
  /** Extracted text */
  text: string;
  /** Detected ingredients */
  ingredients: string[];
  /** Nutritional facts detected */
  nutrition?: Partial<NutritionInfo>;
  /** Image URL */
  imageUrl: string;
  /** Confidence score */
  confidence: number;
}

/**
 * Scraper interface that all site-specific scrapers must implement
 */
export interface IScraper {
  /** Scraper name */
  name: string;
  /** Supported domains */
  domains: string[];

  /**
   * Detect if the current page is a food-related page
   * @param document - Current document
   * @returns true if page is food-related
   */
  isSupported(document: Document): boolean;

  /**
   * Extract food products from the page
   * @param document - Current document
   * @returns Array of food products found
   */
  extractProducts(document: Document): Promise<FoodProduct[]>;

  /**
   * Get product details from a specific element
   * @param element - DOM element
   * @returns Food product or null
   */
  extractProductFromElement(element: Element): Promise<FoodProduct | null>;
}

/**
 * Integration interface for external data sources
 */
export interface IIntegration {
  /** Integration name */
  name: string;

  /**
   * Search for recalls related to a product
   * @param query - Product name or keyword
   * @returns Array of matching recalls
   */
  searchRecalls(query: string): Promise<FoodRecall[]>;

  /**
   * Get recent recalls
   * @param limit - Maximum number of recalls to return
   * @returns Array of recent recalls
   */
  getRecentRecalls(limit?: number): Promise<FoodRecall[]>;
}

/**
 * Message types for extension communication
 */
export enum MessageType {
  ANALYZE_PRODUCT = 'ANALYZE_PRODUCT',
  GET_RECALLS = 'GET_RECALLS',
  UPDATE_CONFIG = 'UPDATE_CONFIG',
  GET_CONFIG = 'GET_CONFIG',
  EXTRACT_IMAGES = 'EXTRACT_IMAGES',
  CACHE_ANALYSIS = 'CACHE_ANALYSIS',
  GET_CACHED_ANALYSIS = 'GET_CACHED_ANALYSIS',
}

/**
 * Message structure for extension communication
 */
export interface ExtensionMessage<T = any> {
  type: MessageType;
  payload: T;
  requestId?: string;
}

/**
 * Response structure for extension communication
 */
export interface ExtensionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

/**
 * Storage schema for cached data
 */
export interface StorageSchema {
  config: ExtensionConfig;
  analysisCache: Record<string, {
    analysis: AIAnalysis;
    timestamp: number;
    expiresAt: number;
  }>;
  recallsCache: {
    recalls: FoodRecall[];
    timestamp: number;
  };
  userInsights: {
    productId: string;
    notes: string;
    rating: number;
    timestamp: number;
  }[];
}
