/**
 * Integration Test Configuration
 *
 * Configurable API URLs and tokens for integration testing.
 * Reads from environment variables or .env.test file.
 * Tests skip automatically when APIs are unreachable.
 */

export interface IntegrationConfig {
  openNutritionApiUrl: string;
  dietApiUrl: string;
  journalApiUrl: string;
  apiToken: string;
  enabled: boolean;
}

/**
 * Load integration test configuration from environment
 */
export function getIntegrationConfig(): IntegrationConfig {
  const enabled = process.env.INTEGRATION_TESTS === 'true' ||
    process.argv.includes('--integration');

  return {
    openNutritionApiUrl: process.env.OPENNUTRITION_API_URL || 'http://localhost:3001',
    dietApiUrl: process.env.DIET_API_URL || 'http://localhost:8000',
    journalApiUrl: process.env.JOURNAL_API_URL || 'http://localhost:3000',
    apiToken: process.env.API_TOKEN || '',
    enabled,
  };
}

/**
 * Check if a service is reachable
 * @param url - Base URL to check
 * @param path - Health check path
 * @returns true if service responds
 */
export async function isServiceReachable(url: string, path = '/health'): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${url}${path}`, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Skip test if integration tests are not enabled
 */
export function skipIfNotIntegration(config: IntegrationConfig): void {
  if (!config.enabled) {
    console.log('[Integration] Skipping - set INTEGRATION_TESTS=true or use --integration flag');
  }
}
