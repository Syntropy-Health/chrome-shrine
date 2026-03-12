/**
 * Global test setup — Chrome API mocks
 */
import { vi } from 'vitest';

// Chrome storage mock with in-memory store
const storageStore: Record<string, any> = {};

const createStorageMock = () => ({
  get: vi.fn((keys: string | string[]) => {
    const result: Record<string, any> = {};
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      if (storageStore[k] !== undefined) result[k] = storageStore[k];
    }
    return Promise.resolve(result);
  }),
  set: vi.fn((items: Record<string, any>) => {
    Object.assign(storageStore, items);
    return Promise.resolve();
  }),
  remove: vi.fn((keys: string | string[]) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) delete storageStore[k];
    return Promise.resolve();
  }),
  clear: vi.fn(() => {
    Object.keys(storageStore).forEach((k) => delete storageStore[k]);
    return Promise.resolve();
  }),
  getBytesInUse: vi.fn(() => Promise.resolve(0)),
});

const storageMock = createStorageMock();

const chromeMock = {
  storage: {
    local: storageMock,
    sync: createStorageMock(),
  },
  runtime: {
    sendMessage: vi.fn(() => Promise.resolve()),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    onInstalled: { addListener: vi.fn() },
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
    lastError: null as any,
  },
  identity: {
    launchWebAuthFlow: vi.fn(),
    getRedirectURL: vi.fn(() => 'https://test-redirect.chromiumapp.org/'),
  },
  sidePanel: {
    open: vi.fn(() => Promise.resolve()),
  },
  alarms: {
    create: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  },
  tabs: {
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    query: vi.fn(() => Promise.resolve([{ id: 1, windowId: 1 }])),
    sendMessage: vi.fn(),
  },
};

Object.assign(globalThis, { chrome: chromeMock });

// Reset storage between tests
beforeEach(() => {
  Object.keys(storageStore).forEach((k) => delete storageStore[k]);
  vi.clearAllMocks();
});
