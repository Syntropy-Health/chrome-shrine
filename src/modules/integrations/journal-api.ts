/**
 * Journal API Integration
 *
 * HTTP client for the Syntropy-Journals extension API.
 * Handles health profile retrieval, food logging, and API key exchange.
 * Authenticates via sh_* API keys obtained through Clerk token exchange.
 *
 * @module integrations/journal-api
 */

import { API_ENDPOINTS } from '@/config/config';
import type { JournalHealthProfile, JournalFoodLogRequest } from '@types';

/** Storage key for the Journal API key */
const JOURNAL_API_KEY_STORAGE = 'syntropy_journal_api_key';

/** Request timeout in milliseconds (15 seconds) */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Journal API client
 * Provides typed methods for all Syntropy-Journals extension endpoints.
 */
export class JournalApiClient {
  private static instance: JournalApiClient;
  private baseUrl: string;
  private apiKey: string | null = null;

  private constructor() {
    this.baseUrl = API_ENDPOINTS.JOURNAL_API;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): JournalApiClient {
    if (!JournalApiClient.instance) {
      JournalApiClient.instance = new JournalApiClient();
    }
    return JournalApiClient.instance;
  }

  /**
   * Initialize by loading the stored API key
   */
  async initialize(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([JOURNAL_API_KEY_STORAGE]);
      this.apiKey = result[JOURNAL_API_KEY_STORAGE] || null;
    } catch (error) {
      console.error('[JournalAPI] Failed to load API key:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get the user's health profile for personalized food scoring
   * @returns Health profile or null on failure
   */
  async getHealthProfile(): Promise<JournalHealthProfile | null> {
    if (!this.apiKey) return null;

    try {
      return await this.request<JournalHealthProfile>('/api/ext/profile', {
        method: 'GET',
      });
    } catch (error) {
      console.error('[JournalAPI] Profile fetch failed:', error);
      return null;
    }
  }

  /**
   * Log a food item from the extension
   * @param entry - Food log request data
   * @returns true on success
   */
  async logFood(entry: JournalFoodLogRequest): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      await this.request('/api/ext/food-log', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
      return true;
    } catch (error) {
      console.error('[JournalAPI] Food log failed:', error);
      return false;
    }
  }

  /**
   * Exchange a Clerk identity for a Journal sh_* API key.
   * Called once after Clerk OAuth login to obtain a persistent API key.
   *
   * @param clerkId - Clerk user ID
   * @param email - User email
   * @param firstName - User first name
   * @param lastName - User last name
   * @param avatarUrl - User avatar URL
   * @returns The sh_* API key string, or null on failure
   */
  async exchangeClerkTokenForApiKey(
    clerkId: string,
    email: string,
    firstName?: string,
    lastName?: string,
    avatarUrl?: string,
  ): Promise<string | null> {
    try {
      const body = {
        clerk_id: clerkId,
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        avatar_url: avatarUrl || null,
      };

      const result = await this.request<{ success: boolean; api_key: string }>(
        '/api/ext/api-key-exchange',
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );

      if (result.api_key) {
        this.apiKey = result.api_key;
        await chrome.storage.local.set({ [JOURNAL_API_KEY_STORAGE]: result.api_key });
        console.log('[JournalAPI] API key exchanged successfully');
        return result.api_key;
      }
      return null;
    } catch (error) {
      console.error('[JournalAPI] API key exchange failed:', error);
      return null;
    }
  }

  /**
   * Check if Journal API is available (has stored API key)
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get the stored API key
   */
  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Clear stored API key (called on sign out)
   */
  async clearApiKey(): Promise<void> {
    this.apiKey = null;
    await chrome.storage.local.remove([JOURNAL_API_KEY_STORAGE]);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Make an authenticated request to the Journal API
   * Uses sh_* API key as Bearer token
   */
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> || {}),
    };

    if (init.body) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Journal API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }
}
