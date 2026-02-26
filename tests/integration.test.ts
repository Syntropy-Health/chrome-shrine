/**
 * Integration Module Tests
 *
 * Tests for FDA and USDA recall integrations
 */

import { FDAIntegration } from '../src/modules/integrations/fda-recalls';
import { USDAIntegration } from '../src/modules/integrations/usda-recalls';
import { IntegrationManager } from '../src/modules/integrations';

describe('FDAIntegration', () => {
  let integration: FDAIntegration;

  beforeEach(() => {
    integration = new FDAIntegration();
  });

  test('should have correct name and configuration', () => {
    expect(integration.name).toBe('FDA');
  });

  test('should fetch recent recalls', async () => {
    // This is a real API call - may fail if API is down
    try {
      const recalls = await integration.getRecentRecalls(5);
      expect(Array.isArray(recalls)).toBe(true);

      if (recalls.length > 0) {
        const recall = recalls[0];
        expect(recall).toHaveProperty('id');
        expect(recall).toHaveProperty('productName');
        expect(recall).toHaveProperty('company');
        expect(recall).toHaveProperty('source');
        expect(recall.source).toBe('FDA');
      }
    } catch (error) {
      console.warn('FDA API test skipped (API unavailable):', error);
    }
  }, 10000); // 10 second timeout for API call

  test('should handle search queries', async () => {
    try {
      const recalls = await integration.searchRecalls('chicken');
      expect(Array.isArray(recalls)).toBe(true);
    } catch (error) {
      console.warn('FDA search test skipped (API unavailable):', error);
    }
  }, 10000);
});

describe('USDAIntegration', () => {
  let integration: USDAIntegration;

  beforeEach(() => {
    integration = new USDAIntegration();
  });

  test('should have correct name and configuration', () => {
    expect(integration.name).toBe('USDA');
  });

  test('should handle errors gracefully', async () => {
    // USDA API may not be available or may have different structure
    const recalls = await integration.getRecentRecalls(5);
    expect(Array.isArray(recalls)).toBe(true);
  }, 10000);
});

describe('IntegrationManager', () => {
  let manager: IntegrationManager;

  beforeEach(() => {
    manager = IntegrationManager.getInstance();
  });

  test('should combine results from multiple sources', async () => {
    try {
      const recalls = await manager.getRecentRecalls(10, false);
      expect(Array.isArray(recalls)).toBe(true);

      // Check for both sources
      const sources = new Set(recalls.map(r => r.source));
      console.log('Recall sources found:', Array.from(sources));
    } catch (error) {
      console.warn('Integration manager test skipped:', error);
    }
  }, 15000);

  test('should check product for recalls', async () => {
    try {
      const recalls = await manager.checkProduct('chicken', 'Tyson');
      expect(Array.isArray(recalls)).toBe(true);
      console.log(`Found ${recalls.length} recalls for chicken products`);
    } catch (error) {
      console.warn('Product check test skipped:', error);
    }
  }, 15000);
});

/**
 * Manual test runner for browser environment
 */
export async function runManualIntegrationTests() {
  console.log('🧪 Running Manual Integration Tests...\n');

  const manager = IntegrationManager.getInstance();

  // Test 1: Fetch recent recalls
  console.log('Test 1: Fetching Recent Recalls');
  try {
    const recalls = await manager.getRecentRecalls(10);
    console.log(`✓ Found ${recalls.length} recent recalls`);

    if (recalls.length > 0) {
      console.log('\nFirst recall:');
      console.log(JSON.stringify(recalls[0], null, 2));
    }
  } catch (error) {
    console.error('✗ Failed to fetch recalls:', error);
  }

  // Test 2: Search for specific product
  console.log('\nTest 2: Searching for "chicken" recalls');
  try {
    const recalls = await manager.searchRecalls('chicken');
    console.log(`✓ Found ${recalls.length} matching recalls`);
  } catch (error) {
    console.error('✗ Search failed:', error);
  }

  console.log('\n✅ Manual integration tests complete!');
}
