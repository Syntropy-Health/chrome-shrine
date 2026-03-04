/**
 * Service Worker Message Handler Tests
 *
 * Tests message routing in the background service worker.
 */

import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';

// Mock all singleton dependencies BEFORE importing the service worker
const mockIntegrationManager = {
  getRecentRecalls: vi.fn().mockResolvedValue([]),
  refreshCache: vi.fn().mockResolvedValue(undefined),
  checkProduct: vi.fn().mockResolvedValue([]),
  searchRecalls: vi.fn().mockResolvedValue([]),
};

const mockDietClient = {
  healthCheck: vi.fn().mockResolvedValue({ status: 'healthy' }),
  reportSymptoms: vi.fn().mockResolvedValue({ success: true }),
  searchProducts: vi.fn().mockResolvedValue({ results: [] }),
  scoreFoodFit: vi.fn().mockResolvedValue({ score: 7, label: 'Good Fit' }),
};

const mockJournalClient = {
  getHealthProfile: vi.fn().mockResolvedValue({ allergies: [] }),
  logFood: vi.fn().mockResolvedValue(true),
  exchangeClerkTokenForApiKey: vi.fn().mockResolvedValue('sh_key'),
};

const mockNutritionClient = {
  searchFoods: vi.fn().mockResolvedValue([]),
  getFoodNutrition: vi.fn().mockResolvedValue(null),
};

const mockConfigManager = {
  load: vi.fn().mockResolvedValue({}),
  get: vi.fn().mockReturnValue({ provider: 'openai' }),
  update: vi.fn().mockResolvedValue(undefined),
};

const mockCacheManager = {
  setAnalysis: vi.fn().mockResolvedValue(undefined),
  getAnalysis: vi.fn().mockResolvedValue(null),
  cleanup: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../src/modules/integrations', () => ({
  IntegrationManager: { getInstance: () => mockIntegrationManager },
}));
vi.mock('../src/modules/integrations/diet-api', () => ({
  DietApiClient: { getInstance: () => mockDietClient },
}));
vi.mock('../src/modules/integrations/journal-api', () => ({
  JournalApiClient: { getInstance: () => mockJournalClient },
}));
vi.mock('../src/modules/integrations/open-diet-data', () => ({
  OpenDietDataClient: { getInstance: () => mockNutritionClient },
}));
vi.mock('../src/config/config', () => ({
  ConfigManager: { getInstance: () => mockConfigManager },
  API_ENDPOINTS: {
    DIET_API: 'http://localhost:8000',
    JOURNAL_API: 'http://localhost:3000',
    USDA_FDC: 'https://api.nal.usda.gov/fdc/v1',
    FDA_RECALLS: 'https://api.fda.gov/food/enforcement.json',
    USDA_RECALLS: 'https://www.fsis.usda.gov/fsis/api/recall',
  },
  USDA_FDC_API_KEY: 'DEMO_KEY',
  DEFAULT_CONFIG: {},
  UI_CONFIG: { HOVER_DELAY: 500, CARD_WIDTH: 400, ANIMATION_DURATION: 200, OVERLAY_Z_INDEX: 10000 },
}));
vi.mock('../src/utils/storage', () => ({
  CacheManager: mockCacheManager,
}));

describe('Service Worker Message Routing', () => {
  let handleMessage: (
    message: any,
    sender: any,
    sendResponse: (resp: any) => void,
  ) => void;

  beforeAll(async () => {
    // Import the service worker module — it auto-registers listeners via init()
    await import('../src/background/service-worker');
    // Wait for init() to complete
    await new Promise(r => setTimeout(r, 50));

    // Capture the onMessage listener callback
    const calls = (chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>).mock.calls;
    if (calls.length === 0) {
      throw new Error('Service worker did not register onMessage listener');
    }
    handleMessage = calls[calls.length - 1][0];
  });

  beforeEach(() => {
    // Clear only the business logic mocks, NOT chrome mocks
    mockIntegrationManager.getRecentRecalls.mockClear();
    mockDietClient.healthCheck.mockClear();
    mockDietClient.scoreFoodFit.mockClear();
    mockJournalClient.getHealthProfile.mockClear();
    mockJournalClient.logFood.mockClear();
    mockJournalClient.exchangeClerkTokenForApiKey.mockClear();
    mockNutritionClient.searchFoods.mockClear();
    mockNutritionClient.getFoodNutrition.mockClear();
    mockConfigManager.get.mockClear();
    (chrome.sidePanel.open as ReturnType<typeof vi.fn>).mockClear();
  });

  async function send(type: string, payload: any = {}) {
    const sendResponse = vi.fn();
    const sender = { tab: { id: 1, windowId: 1 } };
    await handleMessage({ type, payload }, sender, sendResponse);
    // Give async handlers time to complete
    await new Promise(r => setTimeout(r, 20));
    return sendResponse;
  }

  it('JOURNAL_GET_PROFILE calls journalClient.getHealthProfile', async () => {
    const resp = await send('JOURNAL_GET_PROFILE');
    expect(mockJournalClient.getHealthProfile).toHaveBeenCalled();
    expect(resp).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('JOURNAL_LOG_FOOD calls journalClient.logFood', async () => {
    const payload = { food_name: 'Apple', calories: 95 };
    const resp = await send('JOURNAL_LOG_FOOD', payload);
    expect(mockJournalClient.logFood).toHaveBeenCalledWith(payload);
    expect(resp).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('JOURNAL_EXCHANGE_KEY calls journalClient.exchangeClerkTokenForApiKey', async () => {
    const payload = { clerkUserId: 'clerk_1', email: 'a@b.com', name: 'John' };
    const resp = await send('JOURNAL_EXCHANGE_KEY', payload);
    expect(mockJournalClient.exchangeClerkTokenForApiKey).toHaveBeenCalledWith(
      'clerk_1', 'a@b.com', 'John',
    );
    expect(resp).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('DIET_SCORE_FOOD calls dietClient.scoreFoodFit', async () => {
    const payload = { foodName: 'rice', nutrition: null, userProfile: null };
    const resp = await send('DIET_SCORE_FOOD', payload);
    expect(mockDietClient.scoreFoodFit).toHaveBeenCalledWith('rice', null, null);
    expect(resp).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('DIET_HEALTH_CHECK calls dietClient.healthCheck', async () => {
    const resp = await send('DIET_HEALTH_CHECK');
    expect(mockDietClient.healthCheck).toHaveBeenCalled();
    expect(resp).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('OPEN_SIDE_PANEL calls chrome.sidePanel.open', async () => {
    const resp = await send('OPEN_SIDE_PANEL', { product: { name: 'Test' } });
    expect(chrome.sidePanel.open).toHaveBeenCalled();
    expect(resp).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('NUTRITION_SEARCH calls nutritionClient.searchFoods', async () => {
    const resp = await send('NUTRITION_SEARCH', { query: 'apple', pageSize: 10 });
    expect(mockNutritionClient.searchFoods).toHaveBeenCalledWith('apple', 10);
    expect(resp).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('NUTRITION_LOOKUP calls nutritionClient.getFoodNutrition', async () => {
    const resp = await send('NUTRITION_LOOKUP', { query: 'banana' });
    expect(mockNutritionClient.getFoodNutrition).toHaveBeenCalledWith('banana');
    expect(resp).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('GET_CONFIG returns config', async () => {
    const resp = await send('GET_CONFIG');
    expect(mockConfigManager.get).toHaveBeenCalled();
    expect(resp).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('unknown type returns error', async () => {
    const resp = await send('TOTALLY_UNKNOWN_TYPE');
    expect(resp).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Unknown message type',
    }));
  });
});
