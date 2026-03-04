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
  JournalHealthProfile,
  NutritionInfo,
  PersonalFitScore,
  MacroFitStatus,
} from '@types';

/** Base path for all DIET API v1 routes */
const DIET_API_PREFIX = '/api/v1';

/** Request timeout in milliseconds (30 seconds) */
const REQUEST_TIMEOUT_MS = 30_000;

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
        ...(context !== undefined && { context }),
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
   * Score how well a food fits the user's dietary profile.
   *
   * Attempts the DIET ``/score-food`` endpoint first. Falls back to a
   * client-side heuristic that compares macros against the health profile.
   */
  async scoreFoodFit(
    foodName: string,
    nutrition: NutritionInfo | null,
    userProfile: JournalHealthProfile | null,
  ): Promise<PersonalFitScore | null> {
    // Need at least a profile to score against
    if (!userProfile) return null;

    try {
      const userId = this.getUserId();
      if (!userId) return null;

      const body = {
        user_id: userId,
        food_name: foodName,
        nutrition,
        user_profile: userProfile,
      };

      return await this.request<PersonalFitScore>(
        `${DIET_API_PREFIX}/score-food`,
        { method: 'POST', body: JSON.stringify(body) },
      );
    } catch {
      // DIET /score-food not available — use client-side heuristic
      return this.computeClientSideFitScore(foodName, nutrition, userProfile);
    }
  }

  /**
   * Client-side heuristic for food-fit scoring when DIET endpoint is unavailable.
   * Compares food macros against health profile goals/preferences/allergies.
   */
  private computeClientSideFitScore(
    foodName: string,
    nutrition: NutritionInfo | null,
    profile: JournalHealthProfile,
  ): PersonalFitScore {
    let score = 7; // Start optimistic
    const warnings: string[] = [];
    const macroFit = {
      protein: 'on_track' as MacroFitStatus,
      carbs: 'on_track' as MacroFitStatus,
      fat: 'on_track' as MacroFitStatus,
      calories: 'on_track' as MacroFitStatus,
    };

    const nameLower = foodName.toLowerCase();

    // Check allergies
    for (const allergy of profile.allergies) {
      if (nameLower.includes(allergy.toLowerCase())) {
        score -= 4;
        warnings.push(`Contains allergen: ${allergy}`);
      }
    }

    // Check dietary preferences
    const prefs = profile.dietary_preferences;
    if (prefs.diet_type === 'vegan' && /meat|beef|chicken|pork|fish|dairy|egg/i.test(nameLower)) {
      score -= 3;
      warnings.push('May not be vegan-friendly');
    }
    if (prefs.diet_type === 'vegetarian' && /meat|beef|chicken|pork|fish/i.test(nameLower)) {
      score -= 3;
      warnings.push('May not be vegetarian-friendly');
    }

    // Macro evaluation if nutrition data available
    if (nutrition) {
      const proteinG = parseFloat(nutrition.protein || '0');
      const carbsG = parseFloat(nutrition.totalCarbohydrates || '0');
      const fatG = parseFloat(nutrition.totalFat || '0');
      const cal = nutrition.calories || 0;

      // High protein is generally positive for health goals
      if (proteinG > 20) { score += 1; macroFit.protein = 'on_track'; }
      else if (proteinG < 5) { macroFit.protein = 'under'; }

      // Very high sugar/carbs may reduce score
      if (carbsG > 50) { score -= 1; macroFit.carbs = 'over'; }
      if (fatG > 30) { score -= 1; macroFit.fat = 'over'; }
      if (cal > 500) { macroFit.calories = 'over'; }
    }

    // Goal matching
    for (const goal of profile.health_goals) {
      const goalLower = goal.toLowerCase();
      if (goalLower.includes('protein') && nutrition && parseFloat(nutrition.protein || '0') > 15) {
        score += 1;
      }
      if (goalLower.includes('low carb') && nutrition && parseFloat(nutrition.totalCarbohydrates || '0') < 10) {
        score += 1;
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(10, score));

    const label = score >= 8 ? 'Excellent Fit'
      : score >= 6 ? 'Good Fit'
        : score >= 4 ? 'Fair'
          : 'Poor Fit';

    const recommendation = warnings.length > 0
      ? warnings[0]
      : score >= 7
        ? 'Good match for your dietary profile'
        : 'Review this product against your health goals';

    return { score, label, recommendation, macroFit, warnings };
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
      ...(init.headers as Record<string, string> || {}),
    };

    // Only set Content-Type for requests that carry a body
    if (init.body) {
      headers['Content-Type'] = 'application/json';
    }

    // Attach Bearer token if available (future-proofing for DIET auth middleware)
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Guard against hung connections -- service workers are killed after 5 min
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
          `DIET API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }
}
