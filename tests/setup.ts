/**
 * Vitest global setup - Chrome API mocks for extension testing
 */
import { vi } from 'vitest';

// In-memory chrome.storage store
const storageStore: Record<string, any> = {};

const chromeStorageArea = {
  get: vi.fn((keys: string | string[] | null) => {
    if (keys === null) return Promise.resolve({ ...storageStore });
    const keyArr = typeof keys === 'string' ? [keys] : keys;
    const result: Record<string, any> = {};
    for (const k of keyArr) {
      if (k in storageStore) result[k] = storageStore[k];
    }
    return Promise.resolve(result);
  }),
  set: vi.fn((items: Record<string, any>) => {
    Object.assign(storageStore, items);
    return Promise.resolve();
  }),
  remove: vi.fn((keys: string | string[]) => {
    const keyArr = typeof keys === 'string' ? [keys] : keys;
    for (const k of keyArr) delete storageStore[k];
    return Promise.resolve();
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(storageStore)) delete storageStore[k];
    return Promise.resolve();
  }),
};

const messageListeners: Array<(...args: any[]) => any> = [];

const chromeMock = {
  storage: {
    local: { ...chromeStorageArea },
    sync: { ...chromeStorageArea },
  },
  runtime: {
    sendMessage: vi.fn(() => Promise.resolve()),
    onMessage: {
      addListener: vi.fn((cb: (...args: any[]) => any) => {
        messageListeners.push(cb);
      }),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false),
    },
    onInstalled: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
    id: 'mock-extension-id',
  },
  identity: {
    launchWebAuthFlow: vi.fn(() => Promise.resolve('https://redirect.example.com?code=test')),
    getRedirectURL: vi.fn(() => 'https://mock-redirect.chromiumapp.org/'),
  },
  sidePanel: {
    open: vi.fn(() => Promise.resolve()),
    setOptions: vi.fn(() => Promise.resolve()),
  },
  alarms: {
    create: vi.fn(),
    get: vi.fn(() => Promise.resolve(null)),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([{ id: 1, url: 'https://example.com' }])),
    sendMessage: vi.fn(() => Promise.resolve()),
  },
  action: {
    setBadgeText: vi.fn(() => Promise.resolve()),
    setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
  },
};

vi.stubGlobal('chrome', chromeMock);

// Environment variables
process.env.DIET_API_URL = 'http://localhost:8000';
process.env.JOURNAL_API_URL = 'http://localhost:3000';

// Export helpers for tests
export { storageStore, messageListeners, chromeMock };
