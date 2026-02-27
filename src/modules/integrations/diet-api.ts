/**
 * DIET API Integration
 *
 * HTTP client for the DIET (Diet Insight Engine Transformer) service.
 * Handles symptom reporting, product search, and health checks.
 * Authenticates via Clerk user ID from AuthManager.
 *
 * @module integrations/diet-api
 */

import { API_ENDPOINTS } from '@/config/config';
import { AuthManager } from '@modules/auth';
import type {
  DietHealthCheckResponse,
  DietSearchRequest,
  DietSearchResponse,
  DietSymptomReportRequest,
  DietSymptomReportResponse,
} from '@types';

/** Base path for all DIET API v1 routes */
const DIET_API_PREFIX = '/api/v1';

/**
 * DIET API client
 * Provides typed methods for all DIET endpoints used by Chrome Shrine.
 */
export class DietApiClient {
  private static instance: DietApiClient;
  private baseUrl: string;
  private auth = AuthManager.getInstance();

  private constructor() {
    this.baseUrl = API_ENDPOINTS.DIET_API;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DietApiClient {
    if (!DietApiClient.instance) {
      DietApiClient.instance = new DietApiClient();
    }
    return DietApiClient.instance;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Health check -- verify DIET service is reachable
   * @returns Health check response or null on failure
   */
  async healthCheck(): Promise<DietHealthCheckResponse | null> {
    try {
      const response = await this.request<DietHealthCheckResponse>('/health', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('[DIET Integration] Health check failed:', error);
      return null;
    }
  }

  /**
   * Report symptoms for dietary analysis
   * @param symptoms - Symptom inputs
   * @param context - Optional symptom context
   * @returns Symptom analysis response or null on failure
   */
  async reportSymptoms(
    symptoms: DietSymptomReportRequest['symptoms'],
    context?: DietSymptomReportRequest['context']
  ): Promise<DietSymptomReportResponse | null> {
    const userId = this.getUserId();
    if (!userId) {
      console.warn('[DIET Integration] Cannot report symptoms: user not authenticated');
      return null;
    }

    try {
      const body: DietSymptomReportRequest = {
        user_id: userId,
        symptoms,
        context,
      };

      return await this.request<DietSymptomReportResponse>(
        `${DIET_API_PREFIX}/symptoms`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );
    } catch (error) {
      console.error('[DIET Integration] Symptom report failed:', error);
      return null;
    }
  }

  /**
   * Search for health products across DIET stores
   * @param request - Search parameters
   * @returns Search results or null on failure
   */
  async searchProducts(
    request: DietSearchRequest
  ): Promise<DietSearchResponse | null> {
    try {
      return await this.request<DietSearchResponse>(
        `${DIET_API_PREFIX}/products/search`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );
    } catch (error) {
      console.error('[DIET Integration] Product search failed:', error);
      return null;
    }
  }

  /**
   * Check if the DIET service is configured and the user is authenticated
   * @returns true if ready to make DIET API calls
   */
  isAvailable(): boolean {
    return !!(this.baseUrl && this.auth.isAuthenticated());
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Get authenticated user ID from AuthManager
   * @returns User ID string or null
   */
  private getUserId(): string | null {
    const user = this.auth.getUser();
    return user?.id ?? null;
  }

  /**
   * Get auth token for Bearer header (future-proofing)
   * @returns Token string or null
   */
  private getAuthToken(): string | null {
    return this.auth.getToken();
  }

  /**
   * Make an authenticated request to the DIET API
   * @param path - API path (appended to baseUrl)
   * @param init - Fetch init options
   * @returns Parsed JSON response
   * @throws Error on non-OK response
   */
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> || {}),
    };

    // Attach Bearer token if available (future-proofing for DIET auth middleware)
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `DIET API error: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    return response.json() as Promise<T>;
  }
}
