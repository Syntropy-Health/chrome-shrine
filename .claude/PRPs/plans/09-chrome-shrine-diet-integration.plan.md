# Implementation Plan: PRD-09 Phase 1 -- Auth Bridge

**PRD**: `09-chrome-shrine-diet-integration.prd.md`
**Phase**: 1 -- Auth Bridge
**Status**: in-progress
**Date**: 2026-02-26

---

## Summary

Wire Chrome Shrine's existing Clerk authentication to the DIET API so the extension can make authenticated, user-specific requests to DIET endpoints. This phase creates the `DietApiClient` integration module, adds the `DIET_API_URL` environment variable to the build pipeline, extends the service worker message router with a `DIET_*` message family, and proves the connection with a round-trip health-check + symptom-report call that returns user-specific data.

## User Story

> As a Chrome Shrine user who is logged in via Google/Clerk, I want the extension to silently authenticate against the DIET backend so that future phases can show me personalized food scoring without a second login.

## Problem Statement

Chrome Shrine already stores a Clerk JWT via `AuthManager` and the DIET API accepts a plain `user_id` string in request bodies. But there is zero wiring between these two systems -- no HTTP client, no message type, no env var for the DIET base URL. Phase 1 closes this gap.

---

## UX Before / After

### BEFORE (current state)

```
  User hovers food          Content Script             Service Worker
  +--------------+     +---------------------+     +------------------+
  | Amazon page  | --> | scrapeProduct()     | --> | handleMessage()  |
  | food item    |     | quickAnalysis()     |     |   GET_RECALLS    |
  +--------------+     | (GPT-4 Vision only) |     |   CACHE_ANALYSIS |
                       +---------------------+     +------------------+
                               |                           |
                               v                           v
                       +---------------+           +---------------+
                       | HoverCard     |           | FDA / USDA    |
                       | generic score |           | recall APIs   |
                       +---------------+           +---------------+
```

### AFTER (Phase 1 complete)

```
  User hovers food          Content Script             Service Worker
  +--------------+     +---------------------+     +------------------+
  | Amazon page  | --> | scrapeProduct()     | --> | handleMessage()  |
  | food item    |     | quickAnalysis()     |     |   GET_RECALLS    |
  +--------------+     | (GPT-4 Vision)      |     |   CACHE_ANALYSIS |
                       +---------------------+     |   DIET_HEALTH ** |
                               |                   |   DIET_REPORT ** |
                               v                   +--------+---------+
                       +---------------+                    |
                       | HoverCard     |            +-------v--------+
                       | (unchanged    |            | DietApiClient  |
                       |  this phase)  |            | (NEW module)   |
                       +---------------+            +-------+--------+
                                                            |
                                                    +-------v--------+
                                                    | DIET API       |
                                                    | /api/v1/*      |
                                                    | user_id = auth |
                                                    +----------------+
```

Key change: the service worker gains two new message types (`DIET_HEALTH_CHECK`, `DIET_REPORT_SYMPTOMS`) that route through a new `DietApiClient` module. The client pulls `user_id` from `AuthManager.getUser().id` and sends it in the DIET request body. No UI changes in Phase 1.

---

## Mandatory Reading

Read these files completely before writing any code.

| # | File | Lines | Why |
|---|------|-------|-----|
| 1 | `src/modules/integrations/fda-recalls.ts` | 1-213 | **Canonical integration pattern** -- class shape, `fetch()` usage, error handling, `IIntegration` interface adherence |
| 2 | `src/modules/integrations/index.ts` | 1-207 | `IntegrationManager` singleton, `Promise.allSettled` parallel fetch, how integrations are composed |
| 3 | `src/modules/auth/index.ts` | 48-68, 187-204 | `AuthManager` singleton, `getToken():string|null` (line 194), `getUser():ClerkUser|null` (line 187), `isAuthenticated():boolean` (line 201) |
| 4 | `src/modules/auth/config.ts` | 1-57 | `AUTH_CONFIG` object, `isAuthConfigured()`, `getClerkDomain()` |
| 5 | `src/background/service-worker.ts` | 16-113 | `BackgroundService.handleMessage()` switch/case pattern, `sendResponse()` contract |
| 6 | `src/types/index.ts` | 260-290 | `MessageType` enum, `ExtensionMessage<T>`, `ExtensionResponse<T>` |
| 7 | `src/config/config.ts` | 39-44, 116-125 | `API_ENDPOINTS` object (where to add DIET URL), `ConfigManager` singleton |
| 8 | `webpack.config.js` | 116-123 | `DefinePlugin` env injection pattern |
| 9 | `apps/diet/app/routers/diet_insight.py` | 58-75, 182-208, 251-318 | DIET API request/response shapes: `SymptomReportRequest`, `StoreSearchRequest`, `report_symptoms()`, `search_products()` |
| 10 | `apps/diet/app/main.py` | 167-171 | Router prefix: `/api/v1` |

---

## Patterns to Mirror

### Pattern 1: Integration Module (from `fda-recalls.ts`)

The FDA integration is the template for the DIET client. Mirror its structure exactly:

```typescript
// FROM: src/modules/integrations/fda-recalls.ts:42-77
export class FDAIntegration implements IIntegration {
  name = 'FDA';
  private baseUrl = API_ENDPOINTS.FDA_RECALLS;

  async searchRecalls(query: string): Promise<FoodRecall[]> {
    try {
      const url = `${this.baseUrl}?search=${encodeURIComponent(searchQuery)}&limit=50`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`FDA API error: ${response.status}`);
      }
      const data: FDARecallResult = await response.json();
      // ... map results
      return data.results.map((result) => this.mapToFoodRecall(result));
    } catch (error) {
      console.error('[FDA Integration] Search error:', error);
      return [];
    }
  }
}
```

The new `DietApiClient` should follow this same shape: class with `name`, private `baseUrl` from `API_ENDPOINTS`, `fetch()` calls with try/catch returning empty/null on failure, `console.error` with `[DIET Integration]` prefix.

### Pattern 2: Service Worker Message Routing (from `service-worker.ts`)

```typescript
// FROM: src/background/service-worker.ts:69-108
switch (message.type) {
  case 'GET_RECALLS':
    {
      const recalls = await this.integrationManager.getRecentRecalls(50);
      sendResponse({ success: true, data: recalls });
    }
    break;

  // ...

  default:
    sendResponse({ success: false, error: 'Unknown message type' });
}
```

New `DIET_*` cases follow identical structure: curly-brace block, await the client method, wrap in `sendResponse({ success: true, data: ... })`.

### Pattern 3: Singleton with Lazy Init (from `AuthManager`)

```typescript
// FROM: src/modules/auth/index.ts:48-68
export class AuthManager {
  private static instance: AuthManager;

  private constructor() { }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }
}
```

`DietApiClient` will use the same singleton pattern. It does NOT implement `IIntegration` because DIET is not a recall source -- it is a scoring/symptom API.

### Pattern 4: Environment Variable Injection (from `webpack.config.js`)

```javascript
// FROM: webpack.config.js:116-123
new webpack.DefinePlugin({
  'process.env.CLERK_PUBLISHABLE_KEY': JSON.stringify(process.env.CLERK_PUBLISHABLE_KEY || ''),
  // ...
  'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY || ''),
}),
```

Add one new line for `DIET_API_URL` following this exact pattern.

### Pattern 5: Auth Token Retrieval (from `AuthManager`)

```typescript
// FROM: src/modules/auth/index.ts:194-196
getToken(): string | null {
  return this.state.token;
}
```

Note: The DIET API currently accepts `user_id` as a plain string in the request body (no Bearer token middleware). The `DietApiClient` should still send the user ID from `AuthManager.getUser().id`, but we also future-proof by including an `Authorization: Bearer <token>` header for when DIET adds auth middleware.

---

## Files to Change

| # | File | Action | What Changes |
|---|------|--------|--------------|
| 1 | `src/modules/integrations/diet-api.ts` | **CREATE** | New `DietApiClient` class with `healthCheck()`, `reportSymptoms()`, `searchProducts()` |
| 2 | `src/types/index.ts` | EDIT | Add `MessageType.DIET_HEALTH_CHECK`, `DIET_REPORT_SYMPTOMS`, `DIET_SEARCH_PRODUCTS` to enum; add `DietSymptomRequest`, `DietSymptomResponse`, `DietSearchRequest`, `DietSearchResponse` interfaces |
| 3 | `src/config/config.ts` | EDIT | Add `DIET_API_URL` to `API_ENDPOINTS` object |
| 4 | `webpack.config.js` | EDIT | Add `process.env.DIET_API_URL` to `DefinePlugin` |
| 5 | `src/background/service-worker.ts` | EDIT | Import `DietApiClient`, add `DIET_*` cases to `handleMessage()` switch |
| 6 | `src/modules/integrations/index.ts` | EDIT | Re-export `DietApiClient` for convenience |
| 7 | `.env.example` | EDIT or CREATE | Document `DIET_API_URL=http://localhost:8000` |

---

## Step-by-Step Implementation Tasks

### Task 1: Add DIET Types to `src/types/index.ts`

**MIRROR**: Follow the existing `MessageType` enum pattern (line 263-271) and `ExtensionMessage`/`ExtensionResponse` generics (lines 276-290).

**What to add:**

1. Three new members to the `MessageType` enum:

```typescript
// Add after GET_CACHED_ANALYSIS = 'GET_CACHED_ANALYSIS',
DIET_HEALTH_CHECK = 'DIET_HEALTH_CHECK',
DIET_REPORT_SYMPTOMS = 'DIET_REPORT_SYMPTOMS',
DIET_SEARCH_PRODUCTS = 'DIET_SEARCH_PRODUCTS',
```

2. DIET-specific request/response interfaces after `StorageSchema` (after line 312):

```typescript
/**
 * DIET API -- Symptom context for reporting
 */
export interface DietSymptomContext {
  recent_foods: string[];
  sleep_hours?: number;
  stress_level?: number;  // 1-10
  exercise_minutes?: number;
}

/**
 * DIET API -- Symptom input
 */
export interface DietSymptomInput {
  name: string;
  severity: number;  // 1-10
  duration_hours?: number;
  notes?: string;
}

/**
 * DIET API -- Symptom report request body
 * Mirrors: diet/app/routers/diet_insight.py SymptomReportRequest
 */
export interface DietSymptomReportRequest {
  user_id: string;
  symptoms: DietSymptomInput[];
  context?: DietSymptomContext;
}

/**
 * DIET API -- Symptom report response
 * Mirrors: diet/app/routers/diet_insight.py SymptomReportResponse
 */
export interface DietSymptomReportResponse {
  process_id: string;
  user_id: string;
  success: boolean;
  processing_time_ms: number;
  analysis?: {
    insights: Record<string, any>[];
    deficiencies: Record<string, any>[];
    patterns_detected: number;
    severity_score: number;
    confidence_score: number;
  };
  recommendations?: {
    dietary_recommendations: Record<string, any>[];
    supplement_recommendations: Record<string, any>[];
    lifestyle_recommendations: Record<string, any>[];
    priority_actions: string[];
    overall_guidance: string;
  };
  notification?: {
    alert_level: string;
    title: string;
    message: string;
    call_to_action: string;
  };
  error?: string;
}

/**
 * DIET API -- Product search request body
 * Mirrors: diet/app/routers/diet_insight.py StoreSearchRequest
 */
export interface DietSearchRequest {
  query: string;
  symptoms?: string[];
  deficiencies?: string[];
  dietary_requirements?: string[];
  limit?: number;
  max_price?: number;
  store_types?: string[];
}

/**
 * DIET API -- Product search response
 * Mirrors: diet/app/routers/diet_insight.py StoreSearchResponse
 */
export interface DietSearchResponse {
  query: string;
  stores_searched: string[];
  total_results: number;
  results: Record<string, any>[];
  processing_time_ms: number;
}

/**
 * DIET API -- Health check response
 */
export interface DietHealthCheckResponse {
  status: string;
  version?: string;
  [key: string]: any;
}
```

**IMPORTS**: No new imports needed -- this file has no imports.

**GOTCHA**: The `MessageType` enum uses string values (e.g., `'GET_RECALLS'`). New members must also use string values matching the key name.

**VALIDATE**:
```bash
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit --pretty 2>&1 | head -30
```

---

### Task 2: Add `DIET_API_URL` to Config and Webpack

**MIRROR**: Follow `API_ENDPOINTS.FDA_RECALLS` pattern at `config/config.ts:42` and `DefinePlugin` pattern at `webpack.config.js:117`.

**File: `src/config/config.ts`** -- Add to `API_ENDPOINTS` object (after line 43):

```typescript
export const API_ENDPOINTS = {
  FDA_RECALLS: 'https://api.fda.gov/food/enforcement.json',
  USDA_RECALLS: 'https://www.fsis.usda.gov/fsis/api/recall',
  DIET_API: process.env.DIET_API_URL || 'http://localhost:8000',
} as const;
```

**File: `webpack.config.js`** -- Add to `DefinePlugin` (after line 122):

```javascript
'process.env.DIET_API_URL': JSON.stringify(process.env.DIET_API_URL || 'http://localhost:8000'),
```

**IMPORTS**: None needed.

**GOTCHA**: The `as const` assertion on `API_ENDPOINTS` means TypeScript will infer literal types. The `process.env.DIET_API_URL` will still be a `string` at runtime because `DefinePlugin` replaces it at build time. This is fine -- it matches existing behavior for `CLERK_PUBLISHABLE_KEY`.

**GOTCHA**: The DIET API router mounts at prefix `/api/v1` (see `main.py:167-170`). The `DIET_API` endpoint should be the base URL (e.g., `http://localhost:8000`), and individual methods in the client will append `/api/v1/symptoms`, `/api/v1/products/search`, etc.

**VALIDATE**:
```bash
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit --pretty 2>&1 | head -30
```

---

### Task 3: Create `DietApiClient` Module

**CREATE**: `src/modules/integrations/diet-api.ts`

**MIRROR**: Follow `FDAIntegration` class structure (see Pattern 1 above). Use singleton pattern from `AuthManager` (see Pattern 3). The client does NOT implement `IIntegration` -- it is not a recall source.

```typescript
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
```

**IMPORTS**: `API_ENDPOINTS` from `@/config/config`, `AuthManager` from `@modules/auth`, types from `@types`.

**GOTCHA**: The `fetch()` call in a Chrome extension service worker is NOT subject to CORS. This is a key architectural advantage -- we do NOT need a proxy. The service worker acts as a privileged network client.

**GOTCHA**: The DIET API currently does NOT have auth middleware -- `user_id` is a plain string in the request body. We still send `Authorization: Bearer <token>` as a header for forward compatibility. If DIET later adds Clerk JWT verification, this will just work.

**GOTCHA**: The `/health` endpoint is at the root level (not under `/api/v1`), as seen in `main.py:173`. All DIET insight routes are under `/api/v1/`.

**VALIDATE**:
```bash
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit --pretty 2>&1 | head -30
```

---

### Task 4: Re-export `DietApiClient` from Integrations Index

**File**: `src/modules/integrations/index.ts`

**MIRROR**: Follow existing re-export pattern at line 207:

```typescript
// FROM: src/modules/integrations/index.ts:207
export { FDAIntegration, USDAIntegration };
```

**Add** at the bottom of the file:

```typescript
export { DietApiClient } from './diet-api';
```

**IMPORTS**: None new in the index file itself.

**GOTCHA**: Do NOT add `DietApiClient` to the `IntegrationManager.integrations` array. DIET is not an `IIntegration` (recall source). It is a separate client with its own interface.

**VALIDATE**:
```bash
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit --pretty 2>&1 | head -30
```

---

### Task 5: Wire DIET Messages into Service Worker

**File**: `src/background/service-worker.ts`

**MIRROR**: Follow existing switch/case pattern (see Pattern 2 above).

**Changes:**

1. Add import at top (after line 9):

```typescript
import { DietApiClient } from '@modules/integrations/diet-api';
```

2. Add `dietClient` property to `BackgroundService` (after line 18):

```typescript
private dietClient = DietApiClient.getInstance();
```

3. Add three new cases to `handleMessage()` switch (before the `default:` case, around line 106):

```typescript
case 'DIET_HEALTH_CHECK':
  {
    const health = await this.dietClient.healthCheck();
    sendResponse({ success: !!health, data: health });
  }
  break;

case 'DIET_REPORT_SYMPTOMS':
  {
    const { symptoms, context } = message.payload;
    const result = await this.dietClient.reportSymptoms(symptoms, context);
    sendResponse({ success: !!result?.success, data: result });
  }
  break;

case 'DIET_SEARCH_PRODUCTS':
  {
    const searchResult = await this.dietClient.searchProducts(message.payload);
    sendResponse({ success: !!searchResult, data: searchResult });
  }
  break;
```

**IMPORTS**: `DietApiClient` from `@modules/integrations/diet-api`.

**GOTCHA**: The `return true;` at line 33 keeps the message channel open for async responses. This already handles the async nature of DIET API calls -- no changes needed to the listener setup.

**GOTCHA**: The `message.type` values are plain strings in the switch/case, not `MessageType.DIET_HEALTH_CHECK`. This matches the existing pattern where cases use string literals like `'GET_RECALLS'` rather than enum references (see lines 70, 79, 85, 91, 99).

**VALIDATE**:
```bash
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit --pretty 2>&1 | head -30
```

---

### Task 6: Create or Update `.env.example`

**File**: `.env.example` (create if not exists, or append)

Add:

```bash
# DIET API (Diet Insight Engine Transformer)
# Local: http://localhost:8000
# Production: https://diet.syntropy.health (or your Railway URL)
DIET_API_URL=http://localhost:8000
```

**GOTCHA**: Do NOT commit actual `.env` files. Only `.env.example` with placeholder values.

**VALIDATE**:
```bash
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && cat .env.example | grep DIET
```

---

## Testing Strategy

### Unit Testing (Manual Verification)

Since Chrome Shrine does not currently have a test runner configured (no `jest` or `vitest` in `package.json`), validation is done via TypeScript compilation and manual runtime testing.

#### 1. Type Check (compile-time validation)

```bash
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit --pretty
```

This validates:
- All new types are syntactically correct
- `DietApiClient` imports resolve
- Service worker message cases type-check
- No circular dependencies

#### 2. Build Check (webpack compilation)

```bash
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npm run build
```

This validates:
- `DefinePlugin` correctly replaces `process.env.DIET_API_URL`
- All module aliases (`@modules`, `@types`, `@/config`) resolve
- No runtime import errors in bundled output

#### 3. Lint Check

```bash
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npm run lint
```

### Integration Testing (Manual Runtime)

#### Test 1: Health Check Round-Trip

1. Start DIET locally: `cd /home/mo/projects/SyntropyHealth/apps/diet && uvicorn app.main:app --reload --port 8000`
2. Build extension: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npm run build`
3. Load unpacked extension from `dist/` in Chrome
4. Open extension service worker DevTools (chrome://extensions -> Inspect service worker)
5. Execute in console:

```javascript
chrome.runtime.sendMessage({ type: 'DIET_HEALTH_CHECK' }, (response) => {
  console.log('DIET Health Check:', response);
  // Expected: { success: true, data: { status: "ok", ... } }
});
```

#### Test 2: Authenticated Symptom Report

1. Sign in via extension popup (Google OAuth)
2. In service worker console:

```javascript
chrome.runtime.sendMessage({
  type: 'DIET_REPORT_SYMPTOMS',
  payload: {
    symptoms: [{ name: 'headache', severity: 5 }],
    context: { recent_foods: ['coffee', 'bread'] }
  }
}, (response) => {
  console.log('DIET Symptom Report:', response);
  // Expected: { success: true, data: { process_id: "...", user_id: "<clerk-user-id>", success: true, ... } }
});
```

#### Test 3: Unauthenticated Fallback

1. Sign out from extension
2. In service worker console:

```javascript
chrome.runtime.sendMessage({
  type: 'DIET_REPORT_SYMPTOMS',
  payload: {
    symptoms: [{ name: 'fatigue', severity: 3 }]
  }
}, (response) => {
  console.log('DIET Unauthenticated:', response);
  // Expected: { success: false, data: null } -- graceful failure, no crash
});
```

#### Test 4: DIET Unreachable Fallback

1. Stop the DIET server
2. In service worker console:

```javascript
chrome.runtime.sendMessage({ type: 'DIET_HEALTH_CHECK' }, (response) => {
  console.log('DIET Offline:', response);
  // Expected: { success: false, data: null } -- graceful failure, no crash
});
```

### Success Criteria

| Check | Expected |
|-------|----------|
| `npx tsc --noEmit` exits 0 | No type errors |
| `npm run build` exits 0 | Bundle compiles with DIET_API_URL injected |
| `DIET_HEALTH_CHECK` returns `{ success: true }` when DIET is running | Auth bridge connectivity proven |
| `DIET_REPORT_SYMPTOMS` includes correct `user_id` from Clerk | Identity propagation proven |
| `DIET_REPORT_SYMPTOMS` returns `null` when not authenticated | Graceful degradation proven |
| Network calls go through service worker (no CORS) | Architecture validated |

---

## Validation Commands Summary

```bash
# 1. Type-check the entire project
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit --pretty

# 2. Build the extension
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npm run build

# 3. Lint check
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npm run lint

# 4. Verify DIET_API_URL is in the webpack output
grep -r "DIET_API_URL\|localhost:8000" /home/mo/projects/SyntropyHealth/apps/chrome-shrine/dist/background/service-worker.js

# 5. Verify new message types are in the built bundle
grep -r "DIET_HEALTH_CHECK\|DIET_REPORT_SYMPTOMS\|DIET_SEARCH_PRODUCTS" /home/mo/projects/SyntropyHealth/apps/chrome-shrine/dist/background/service-worker.js
```

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| DIET API is not running during dev | HIGH | `healthCheck()` returns null gracefully; no crash. `.env.example` documents the expected URL. |
| Clerk token expires mid-session | MEDIUM | `AuthManager.validateToken()` already handles this (line 320-331). `DietApiClient` reads fresh token on each request. |
| DIET adds auth middleware later | LOW | We already send `Authorization: Bearer <token>` header; DIET just needs to verify it. |
| `fetch()` in service worker has different error shapes | LOW | We catch all errors and return null/empty; error messages are logged but never surface to UI in Phase 1. |

---

## Out of Scope for Phase 1

- No UI changes (hover card unchanged)
- No Open Diet Data integration (Phase 2)
- No personalized scoring display (Phase 3)
- No caching of DIET responses (Phase 5)
- No DIET auth middleware changes (DIET team responsibility)

---

*Plan generated: 2026-02-26*
*Target phase: Phase 1 -- Auth Bridge*
*Estimated effort: 2-3 hours for implementation + testing*
