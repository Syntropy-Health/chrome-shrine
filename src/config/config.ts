/**
 * Configuration Management Module
 *
 * Handles extension configuration including API keys, user preferences,
 * and feature flags. Provides type-safe access to configuration with defaults.
 */

import type { ExtensionConfig } from '@types';

/**
 * Default configuration for the extension
 */
export const DEFAULT_CONFIG: ExtensionConfig = {
  provider: 'openai',
  model: 'gpt-4-vision-preview',
  features: {
    hoverCards: true,
    safetyAlerts: true,
    ingredientAnalysis: true,
    personalInsights: true,
  },
  preferences: {
    dietaryRestrictions: [],
    allergens: [],
    healthGoals: [],
  },
};

/**
 * Configuration keys for storage
 */
export const CONFIG_KEYS = {
  MAIN: 'syntropy_config',
  API_KEY: 'syntropy_api_key',
  PREFERENCES: 'syntropy_preferences',
} as const;

/**
 * API endpoints for external integrations
 */
export const API_ENDPOINTS = {
  FDA_RECALLS: 'https://api.fda.gov/food/enforcement.json',
  USDA_RECALLS: 'https://www.fsis.usda.gov/fsis/api/recall',
  DIET_API: process.env.DIET_API_URL || 'http://localhost:8000',
  USDA_FDC: 'https://api.nal.usda.gov/fdc/v1',
  JOURNAL_API: process.env.JOURNAL_API_URL || 'http://localhost:3000',
} as const;

/**
 * USDA FoodData Central API key
 * DEMO_KEY is free and provides 1000 requests/hour.
 * For production, register for a free key at https://fdc.nal.usda.gov/api-key-signup.html
 */
export const USDA_FDC_API_KEY = 'DEMO_KEY';

/**
 * Supported LLM providers configuration
 */
export const PROVIDER_CONFIG = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4-vision-preview', 'gpt-4-turbo', 'gpt-4o'],
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  },
  custom: {
    name: 'Custom',
    baseUrl: '',
    models: [],
  },
} as const;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** Analysis cache TTL in milliseconds (1 hour) */
  ANALYSIS_TTL: 60 * 60 * 1000,
  /** Recalls cache TTL in milliseconds (6 hours) */
  RECALLS_TTL: 6 * 60 * 60 * 1000,
  /** Maximum cache entries */
  MAX_CACHE_ENTRIES: 100,
} as const;

/**
 * Image processing configuration
 */
export const IMAGE_CONFIG = {
  /** Maximum number of images to process per product */
  MAX_IMAGES: 3,
  /** Minimum image size to consider (width * height) */
  MIN_IMAGE_SIZE: 10000,
  /** Maximum image size to process (in bytes) */
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  /** Supported image formats */
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

/**
 * UI configuration
 */
export const UI_CONFIG = {
  /** Hover card delay (ms) */
  HOVER_DELAY: 500,
  /** Hover card width */
  CARD_WIDTH: 400,
  /** Animation duration (ms) */
  ANIMATION_DURATION: 200,
  /** Z-index for overlays */
  OVERLAY_Z_INDEX: 10000,
} as const;

/**
 * Configuration manager class
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: ExtensionConfig;

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from storage
   * @returns Promise resolving to current configuration
   */
  async load(): Promise<ExtensionConfig> {
    try {
      const result = await chrome.storage.sync.get([
        CONFIG_KEYS.MAIN,
        CONFIG_KEYS.API_KEY,
        CONFIG_KEYS.PREFERENCES,
      ]);

      this.config = {
        ...DEFAULT_CONFIG,
        ...result[CONFIG_KEYS.MAIN],
        apiKey: result[CONFIG_KEYS.API_KEY],
        preferences: {
          ...DEFAULT_CONFIG.preferences,
          ...result[CONFIG_KEYS.PREFERENCES],
        },
      };

      return this.config;
    } catch (error) {
      console.error('[ConfigManager] Failed to load config:', error);
      return this.config;
    }
  }

  /**
   * Save configuration to storage
   * @param config - Configuration to save
   */
  async save(config: Partial<ExtensionConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };

      const storageData: Record<string, any> = {
        [CONFIG_KEYS.MAIN]: {
          provider: this.config.provider,
          model: this.config.model,
          baseUrl: this.config.baseUrl,
          features: this.config.features,
        },
      };

      if (config.apiKey !== undefined) {
        storageData[CONFIG_KEYS.API_KEY] = config.apiKey;
      }

      if (config.preferences) {
        storageData[CONFIG_KEYS.PREFERENCES] = config.preferences;
      }

      await chrome.storage.sync.set(storageData);
    } catch (error) {
      console.error('[ConfigManager] Failed to save config:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  get(): ExtensionConfig {
    return { ...this.config };
  }

  /**
   * Update specific configuration fields
   * @param updates - Partial configuration updates
   */
  async update(updates: Partial<ExtensionConfig>): Promise<void> {
    await this.save(updates);
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG };
    await chrome.storage.sync.clear();
  }

  /**
   * Check if API key is configured
   * @returns true if API key exists
   */
  hasApiKey(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  /**
   * Get API configuration for current provider
   * @returns API configuration object
   */
  getProviderConfig() {
    return PROVIDER_CONFIG[this.config.provider];
  }
}
