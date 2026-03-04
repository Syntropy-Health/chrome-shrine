# Feature: Chrome Shrine Visual Food Analysis + Clerk Login + Journal Integration

## Summary

Extend Chrome Shrine from a generic food analysis tool into a personalized, visually rich food intelligence platform. This plan covers three interlocking capabilities: (1) linking the extension to the user's Syntropy-Journal account via Clerk auth + API key bridge for database access, (2) integrating DIET service personalized scoring, and (3) overhauling the hover card and adding a side panel for highly visual macro breakdowns, fit scores, and actionable recommendations. Builds on completed Phase 1 (Auth Bridge) and Phase 2 (Open Diet Data) from PRD-09.

## User Story

As a health-conscious shopper browsing food/supplement products online
I want to log in with my Syntropy account and instantly see a visual breakdown of how each product fits my personal diet goals
So that I can make informed purchasing decisions with real nutrition data and personalized scoring

## Problem Statement

Chrome Shrine has functional auth (Clerk OAuth), DIET API connectivity, and USDA nutrition lookup, but:
1. The Clerk login doesn't sync with the Journals user record (no API key bridge for database access)
2. No personalized scoring endpoint is called (DIET scoring = Phase 3 pending)
3. The hover card is text-heavy with basic score meters — no visual macro charts, no personalized fit display
4. There is no side panel for detailed analysis — the popup (400px, closes on blur) is insufficient

## Solution Statement

Create a Journal REST API for extension clients, bridge Clerk auth to Journal API keys, integrate DIET personalized scoring, and build a visually rich hover card + side panel with SVG/CSS macro donut charts, nutrient bars, fit score gauges, and one-line actionable recommendations.

## Metadata

| Field            | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| Type             | NEW_CAPABILITY + ENHANCEMENT                                 |
| Complexity       | HIGH                                                         |
| Systems Affected | chrome-shrine (TS), Syntropy-Journals (Python), diet (Python)|
| Dependencies     | Clerk (existing), DIET API (running), USDA FDC (existing)    |
| Estimated Tasks  | 16                                                           |

---

## UX Design

### Before State

```
+----------------------------------------------------------+
|  User hovers food product on Amazon/CookUnity             |
|           |                                               |
|           v                                               |
|  [Content Script] scrapes product info                    |
|           |                                               |
|           v                                               |
|  [AI Agent] GPT-4 Vision + USDA FDC lookup (parallel)    |
|           |                                               |
|           v                                               |
|  +--[Hover Card 400px]----------------------+             |
|  | Product Name / Brand                     |             |
|  | Safety: 72/100  Health: 68/100 (text)    |             |
|  | "Contains artificial colors..."          |             |
|  | Key Insights (3 bullet points)           |             |
|  | [View Full Analysis ->]                  |             |
|  +------------------------------------------+             |
|                                                           |
|  MISSING: Personalized fit score, macro donut chart,      |
|           nutrient bars, "good for YOUR diet" signal,     |
|           side panel for details, Journal food logging     |
+----------------------------------------------------------+
```

### After State

```
+----------------------------------------------------------+
|  User hovers food product on Amazon/CookUnity             |
|           |                                               |
|           v                                               |
|  [Content Script] scrapes + sends to service worker       |
|           |                                               |
|           v (parallel)                                    |
|  [AI Agent]          [DIET scoring]    [USDA FDC]         |
|   GPT-4 Vision       fit score 8.2/10  real macros        |
|   insights/safety     recommendation   cal/pro/carb/fat   |
|           |               |                |              |
|           v               v                v              |
|  +--[Hover Card - Redesigned]-------------------+         |
|  | Product Name             [FIT: 8.2] (gauge)  |         |
|  |                                               |         |
|  | [==== MACRO DONUT ====]  Calories: 240        |         |
|  | |  P:25g  C:12g  F:14g|  Protein: 25g        |         |
|  | [=====================]  Carbs: 12g           |         |
|  |                          Fat: 14g             |         |
|  | "Great protein source — fits your daily goal" |         |
|  | Safety: 85 [====] | Health: 78 [====]         |         |
|  | Source: USDA FDC                               |         |
|  | [Open Details] [Add to Journal]                |         |
|  +-----------------------------------------------+         |
|                                                           |
|  [Click "Open Details"] opens SIDE PANEL:                 |
|  +--[Side Panel 400px]------------------------------+     |
|  | [Auth: user@email.com | Sign Out]                |     |
|  |                                                   |     |
|  | === Salmon Fillet (Wild Caught) ===               |     |
|  | Brand: Kirkland                                   |     |
|  |                                                   |     |
|  | [=== LARGE MACRO DONUT CHART ===]                 |     |
|  | Protein 40% | Fat 35% | Carbs 5% | Other 20%     |     |
|  |                                                   |     |
|  | PERSONAL FIT SCORE: 8.2/10                        |     |
|  | [=============================  ] (radial gauge)   |     |
|  | "Excellent protein source. Matches your           |     |
|  |  high-protein goal. Omega-3 supports your         |     |
|  |  inflammation reduction goal."                    |     |
|  |                                                   |     |
|  | [Tabs: Nutrition | Ingredients | Safety | AI]     |     |
|  | Nutrition tab:                                    |     |
|  |   Calories  240 kcal  [=========    ] 12% DV     |     |
|  |   Protein   25g       [=============] 50% DV     |     |
|  |   Total Fat 14g       [========     ] 18% DV     |     |
|  |   Sat Fat    3g       [====         ] 15% DV     |     |
|  |   Sodium   350mg      [======       ] 15% DV     |     |
|  |   Fiber      0g       [             ]  0% DV     |     |
|  |   Vitamin D  12mcg    [========     ] 60% DV     |     |
|  |   Omega-3   1.8g      (no DV)                    |     |
|  |                                                   |     |
|  | [+ Add to Journal]                                |     |
|  +---------------------------------------------------+     |
+----------------------------------------------------------+
```

### Interaction Changes

| Location          | Before                  | After                          | User Impact                    |
|-------------------|-------------------------|--------------------------------|--------------------------------|
| Hover card        | Text scores, no macros  | Macro donut + fit gauge + rec  | Instant visual nutritional picture |
| Full analysis     | Popup (closes on blur)  | Side panel (persistent)        | Can browse + analyze simultaneously |
| Auth              | Google OAuth only       | OAuth + Journal API key sync   | Extension connected to health profile |
| Food logging      | Not available           | "Add to Journal" button        | Log foods while shopping |
| Personalization   | Generic AI analysis     | DIET fit score + recommendation| "This fits YOUR diet" signal |
| Data source       | AI-estimated nutrition  | USDA FDC + "Source" badge      | Trust and accuracy |

---

## Mandatory Reading

**CRITICAL: Read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `chrome-shrine/src/modules/auth/index.ts` | all | Auth pattern to EXTEND (add API key bridge) |
| P0 | `chrome-shrine/src/modules/integrations/diet-api.ts` | all | DIET client to ADD scoring methods to |
| P0 | `chrome-shrine/src/modules/ui/hover-card.ts` | all | Hover card to REDESIGN |
| P0 | `chrome-shrine/src/modules/ui/components.ts` | all | UI components to ADD visual charts to |
| P0 | `chrome-shrine/src/types/index.ts` | all | Types to EXTEND |
| P1 | `chrome-shrine/src/modules/ai/agent.ts` | all | AI agent to INTEGRATE scoring into |
| P1 | `chrome-shrine/src/background/service-worker.ts` | all | Message handler to ADD new cases |
| P1 | `chrome-shrine/src/popup/popup.ts` | all | Popup to understand current auth UI |
| P1 | `chrome-shrine/src/content/content.css` | all | CSS styles to EXTEND for new visuals |
| P1 | `chrome-shrine/manifest.json` | all | Manifest to ADD sidePanel permission |
| P2 | `Syntropy-Journals/syntropy_journals/app/models/admin/user.py` | 33-70, 145-157, 365-388 | User + UserApiKey + get_user_by_api_key() |
| P2 | `Syntropy-Journals/syntropy_journals/app/models/syntropy/profile.py` | all | HealthProfile to expose via API |
| P2 | `Syntropy-Journals/syntropy_journals/app/models/syntropy/journal.py` | all | Journal entries for food logging |
| P2 | `Syntropy-Journals/libs/reflex-clerk-api/custom_components/reflex_clerk_api/fastapi_helpers.py` | all | validate_api_token dependency |
| P2 | `Syntropy-Journals/syntropy_journals/app/api/deps.py` | all | FastAPI lifecycle pattern |

**External Documentation:**

| Source | Section | Why Needed |
|--------|---------|------------|
| [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) | Full reference | Side panel setup + messaging |
| [Clerk Chrome Extension SDK](https://clerk.com/docs/references/chrome-extension/overview) | Sync Host | Auth session sharing between web and extension |
| [USDA FDC API](https://fdc.nal.usda.gov/api-guide/) | Search endpoint | Food search contract |

---

## Patterns to Mirror

**SINGLETON_PATTERN:**
```typescript
// SOURCE: chrome-shrine/src/modules/integrations/diet-api.ts:43-48
static getInstance(): DietApiClient {
  if (!DietApiClient.instance) {
    DietApiClient.instance = new DietApiClient();
  }
  return DietApiClient.instance;
}
```

**MESSAGE_HANDLER_PATTERN:**
```typescript
// SOURCE: chrome-shrine/src/background/service-worker.ts:69-108
case 'DIET_HEALTH_CHECK':
  {
    const health = await this.dietClient.healthCheck();
    sendResponse({ success: !!health, data: health });
  }
  break;
```

**INTEGRATION_CLIENT_PATTERN:**
```typescript
// SOURCE: chrome-shrine/src/modules/integrations/diet-api.ts:31-65
export class DietApiClient {
  private baseUrl: string;
  private auth = AuthManager.getInstance();
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, { ...init, headers });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json() as Promise<T>;
  }
}
```

**FASTAPI_ROUTE_PATTERN (Journals):**
```python
# SOURCE: Syntropy-Journals/syntropy_journals/app/api/routes/health.py:10
@router.get("/health")
async def health_check():
    services = await ServiceRegistry.health_check_all()
    return {"status": "healthy" if all(v == "ok" for v in services.values()) else "degraded", "services": services}
```

**API_KEY_AUTH_PATTERN (Journals):**
```python
# SOURCE: Syntropy-Journals/libs/reflex-clerk-api/custom_components/reflex_clerk_api/fastapi_helpers.py:42-70
def validate_api_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> TokenVerification:
    try:
        return verify_token(credentials.credentials)
    except TokenError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e
```

**HOVER_CARD_PATTERN:**
```typescript
// SOURCE: chrome-shrine/src/modules/ui/hover-card.ts:88-131
private createCard(product, target, analysis): void {
  this.card = createElement('div', { class: 'syntropy-hover-card' });
  const header = this.buildHeader(product, analysis);
  this.card.appendChild(header);
  const content = createElement('div', { class: 'syntropy-card-content' });
  content.innerHTML = analysis ? this.buildAnalysisContent(analysis) : this.buildLoadingContent();
  this.card.appendChild(content);
  document.body.appendChild(this.card);
}
```

---

## Files to Change

### Chrome Shrine (TypeScript)

| File | Action | Justification |
|------|--------|---------------|
| `manifest.json` | UPDATE | Add `sidePanel` permission + `side_panel.default_path` |
| `src/types/index.ts` | UPDATE | Add PersonalFitScore, JournalProfile, new MessageTypes |
| `src/config/config.ts` | UPDATE | Add JOURNAL_API_URL endpoint |
| `webpack.config.js` | UPDATE | Add JOURNAL_API_URL to DefinePlugin |
| `src/modules/integrations/journal-api.ts` | CREATE | JournalApiClient: profile fetch, food log, API key exchange |
| `src/modules/integrations/diet-api.ts` | UPDATE | Add `scoreFoodFit()` method for personalized scoring |
| `src/modules/integrations/index.ts` | UPDATE | Export JournalApiClient |
| `src/modules/auth/index.ts` | UPDATE | Add API key bridge: after Clerk login, exchange for Journal API key |
| `src/modules/ai/agent.ts` | UPDATE | Integrate DIET fit scoring into analysis pipeline |
| `src/modules/ui/hover-card.ts` | UPDATE | Redesign with macro donut, fit gauge, recommendation |
| `src/modules/ui/components.ts` | UPDATE | Add createMacroDonut, createFitGauge, createNutrientBar |
| `src/modules/ui/side-panel.ts` | CREATE | Side panel manager with tabbed analysis view |
| `src/sidepanel/sidepanel.ts` | CREATE | Side panel entry point |
| `src/sidepanel/sidepanel.html` | CREATE | Side panel HTML |
| `src/content/content.css` | UPDATE | Add donut chart, gauge, nutrient bar CSS |
| `src/background/service-worker.ts` | UPDATE | Add JOURNAL_*, DIET_SCORE_FOOD message handlers |

### Syntropy-Journals (Python)

| File | Action | Justification |
|------|--------|---------------|
| `syntropy_journals/app/api/routes/extension_api.py` | CREATE | REST endpoints for Chrome extension |
| `syntropy_journals/app/api/deps.py` | UPDATE | Register extension API router |
| `syntropy_journals/app/app.py` | UPDATE | Mount extension API router |

---

## NOT Building (Scope Limits)

- In-extension profile editing — managed in Journal web app
- Purchase tracking / cart analysis — future feature
- Supplement interaction checking — future feature
- Weekly shopping summary — future feature (retention)
- Full Clerk Chrome Extension SDK migration — current chrome.identity approach works
- Barcode scanning / UPC lookup — future feature
- IndexedDB caching for nutrition (Phase 5 of PRD-09) — separate follow-up

---

## Step-by-Step Tasks

### Task 1: CREATE Journals Extension API Endpoints

- **ACTION**: Create `syntropy_journals/app/api/routes/extension_api.py`
- **IMPLEMENT**: Three endpoints authenticated via `validate_api_token` (Bearer `sh_*` tokens):
  ```python
  from fastapi import APIRouter, Depends, HTTPException
  from reflex_clerk_api import validate_api_token, TokenVerification
  from pydantic import BaseModel

  router = APIRouter(prefix="/api/ext", tags=["extension"])

  @router.get("/profile")
  async def get_health_profile(auth: TokenVerification = Depends(validate_api_token)):
      """Return user's HealthProfile for personalized food scoring."""
      # Lookup user by auth.user_id (clerk_id), return HealthProfile fields

  @router.post("/food-log")
  async def log_food(body: FoodLogRequest, auth: TokenVerification = Depends(validate_api_token)):
      """Log a food item from the extension as a FoodLogEntry."""

  @router.post("/api-key-exchange")
  async def exchange_clerk_token_for_api_key(body: ClerkTokenExchange, auth_header: str):
      """Given a valid Clerk JWT, return the user's sh_ API key."""
      # Verify Clerk JWT via clerk_backend_api, find/create user, return API key
  ```
- **MIRROR**: `Syntropy-Journals/syntropy_journals/app/api/routes/health.py` for router pattern
- **MIRROR**: `Syntropy-Journals/libs/reflex-clerk-api/custom_components/reflex_clerk_api/fastapi_helpers.py` for auth dependency
- **IMPORTS**: `validate_api_token` from `reflex_clerk_api`, models from `app/models/`
- **GOTCHA**: `auth.user_id` from `TokenVerification` is the Clerk user ID string. Must lookup `User` by `clerk_id`, not by integer `id`.
- **GOTCHA**: The `get_user_by_api_key()` in `user.py:365` validates the `sh_` key — this is what `verify_token()` calls internally.
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/Syntropy-Journals && APP_ENV=test uv run python -c "from syntropy_journals.app.api.routes.extension_api import router; print('OK')"` then `make lint`

### Task 2: REGISTER Extension API Router in Journals App

- **ACTION**: Update `syntropy_journals/app/app.py` to include the extension API router
- **IMPLEMENT**: Import and mount the router on the FastAPI app
- **MIRROR**: How `stripe_webhook.py` and `health.py` routers are mounted
- **GOTCHA**: The Reflex app uses `api_transformer` — check `app.py` for how FastAPI routes are registered
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/Syntropy-Journals && make lint`

### Task 3: ADD Types for Journal Integration + DIET Scoring

- **ACTION**: Update `chrome-shrine/src/types/index.ts`
- **IMPLEMENT**:
  ```typescript
  // Journal API types
  export interface JournalHealthProfile {
    dietary_preferences: Record<string, any>;
    supplement_stack: string[];
    health_goals: string[];
    conditions: string[];
    allergies: string[];
  }

  export interface JournalFoodLogRequest {
    food_name: string;
    meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'supplement';
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    source_url?: string;
    notes?: string;
  }

  // DIET Personalized Scoring types
  export interface PersonalFitScore {
    score: number;          // 0-10
    label: string;          // "Excellent Fit" | "Good Fit" | "Fair" | "Poor Fit"
    recommendation: string; // "Great protein source — fits your daily goal"
    macroFit: {
      protein: 'over' | 'on_track' | 'under';
      carbs: 'over' | 'on_track' | 'under';
      fat: 'over' | 'on_track' | 'under';
      calories: 'over' | 'on_track' | 'under';
    };
    warnings: string[];     // allergen matches, condition conflicts
  }

  // Add to MessageType enum:
  JOURNAL_GET_PROFILE = 'JOURNAL_GET_PROFILE',
  JOURNAL_LOG_FOOD = 'JOURNAL_LOG_FOOD',
  JOURNAL_EXCHANGE_KEY = 'JOURNAL_EXCHANGE_KEY',
  DIET_SCORE_FOOD = 'DIET_SCORE_FOOD',

  // Extend AIAnalysis interface:
  // Add optional fitScore?: PersonalFitScore
  // Add optional nutritionSource?: 'USDA_FDC' | 'AI_ESTIMATED' | 'SCRAPED'
  ```
- **MIRROR**: Existing DIET types pattern at types/index.ts lines 320-420
- **GOTCHA**: `MessageType` enum uses string values matching key names
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit`

### Task 4: ADD Config for Journal API URL

- **ACTION**: Update `chrome-shrine/src/config/config.ts` and `webpack.config.js`
- **IMPLEMENT**:
  - Add `JOURNAL_API: process.env.JOURNAL_API_URL || 'http://localhost:3000'` to `API_ENDPOINTS`
  - Add `'process.env.JOURNAL_API_URL': JSON.stringify(process.env.JOURNAL_API_URL || 'http://localhost:3000')` to DefinePlugin
  - Add `JOURNAL_API_URL=http://localhost:3000` to `.env.example`
- **MIRROR**: Existing `DIET_API` pattern in config.ts:44 and webpack.config.js:122
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit`

### Task 5: CREATE JournalApiClient Module

- **ACTION**: Create `chrome-shrine/src/modules/integrations/journal-api.ts`
- **IMPLEMENT**: Singleton client with methods:
  - `getHealthProfile(): Promise<JournalHealthProfile | null>` — GET `/api/ext/profile`
  - `logFood(entry: JournalFoodLogRequest): Promise<boolean>` — POST `/api/ext/food-log`
  - `exchangeClerkTokenForApiKey(clerkToken: string): Promise<string | null>` — POST `/api/ext/api-key-exchange`
  - `isAvailable(): boolean` — checks if API key is stored
  - Private `request<T>()` method using `sh_*` API key as Bearer token
  - API key stored in `chrome.storage.local` under key `syntropy_journal_api_key`
- **MIRROR**: `DietApiClient` pattern exactly (singleton, private request, error handling)
- **IMPORTS**: `API_ENDPOINTS` from config, `AuthManager` from auth
- **GOTCHA**: Unlike DIET (which uses Clerk token), Journal API uses `sh_*` API key. Store separately from Clerk token.
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit`

### Task 6: UPDATE AuthManager — API Key Bridge

- **ACTION**: Update `chrome-shrine/src/modules/auth/index.ts`
- **IMPLEMENT**:
  - After successful `signInWithGoogle()`, call `JournalApiClient.exchangeClerkTokenForApiKey(token)` to get `sh_*` key
  - Store API key in `chrome.storage.local` under `syntropy_journal_api_key`
  - Add `getApiKey(): string | null` method
  - On `signOut()`, also clear the Journal API key
  - Add `AUTH_STORAGE_KEYS.JOURNAL_API_KEY = 'syntropy_journal_api_key'`
- **MIRROR**: Existing `storeAuthData()` / `signOut()` patterns in auth/index.ts
- **GOTCHA**: The exchange call may fail if Journal backend is unreachable — fail silently, extension still works with DIET + USDA without Journal integration
- **GOTCHA**: API key exchange endpoint needs to verify the Clerk JWT server-side using `clerk_backend_api`
- **GOTCHA**: Clerk OAuth does NOT work directly in extension popup/side panel DOM — the existing `chrome.identity.launchWebAuthFlow` approach in AuthManager is correct and must be preserved. Do NOT attempt to embed Clerk `<SignIn>` components inside extension pages.
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit`

### Task 7: UPDATE DietApiClient — Add Food Scoring Method

- **ACTION**: Update `chrome-shrine/src/modules/integrations/diet-api.ts`
- **IMPLEMENT**: Add `scoreFoodFit()` method:
  ```typescript
  async scoreFoodFit(
    foodName: string,
    nutrition: NutritionInfo | null,
    userProfile: JournalHealthProfile | null,
  ): Promise<PersonalFitScore | null> {
    const userId = this.getUserId();
    if (!userId) return null;

    // POST to DIET /api/v1/score-food (new endpoint) or reuse symptoms
    // with food context to generate a personalized score
    const body = {
      user_id: userId,
      food_name: foodName,
      nutrition: nutrition,
      user_profile: userProfile,
    };
    return await this.request<PersonalFitScore>(
      `${DIET_API_PREFIX}/score-food`,
      { method: 'POST', body: JSON.stringify(body) }
    );
  }
  ```
- **MIRROR**: Existing `reportSymptoms()` and `searchProducts()` patterns
- **GOTCHA**: DIET service needs a new `/api/v1/score-food` endpoint. If not available yet, implement a client-side scoring heuristic as fallback (compare food macros against health_goals + dietary_preferences from profile).
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit`

### Task 8: UPDATE AI Agent — Integrate Fit Scoring

- **ACTION**: Update `chrome-shrine/src/modules/ai/agent.ts`
- **IMPLEMENT**:
  - In `analyzeProduct()`, after USDA nutrition fetch, also fetch:
    1. User health profile from JournalApiClient
    2. Personal fit score from DietApiClient.scoreFoodFit()
  - Use `Promise.allSettled()` for all parallel calls (AI, USDA, recalls, profile, scoring)
  - Add `fitScore` to the returned `AIAnalysis` object
  - Add `nutritionSource` field: `'USDA_FDC'` if USDA data found, `'AI_ESTIMATED'` otherwise
  - Fallback: if DIET scoring unavailable, calculate a basic client-side fit score from macro comparison
- **MIRROR**: Existing `Promise.all([recalls, usdaNutrition])` pattern at agent.ts:110-115
- **GOTCHA**: Don't block on profile/scoring — if they fail, analysis still returns with generic scores
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit`

### Task 9: CREATE SVG/CSS Visual Components

- **ACTION**: Update `chrome-shrine/src/modules/ui/components.ts`
- **IMPLEMENT**: Add new visual component functions:
  ```typescript
  // Macro donut chart (SVG) — shows protein/carbs/fat/other as colored arcs
  export function createMacroDonut(nutrition: NutritionInfo, size: number): HTMLElement

  // Fit score radial gauge (SVG) — 0-10 score with color gradient
  export function createFitGauge(score: number, label: string): HTMLElement

  // Nutrient bar with DV% — horizontal bar chart for individual nutrients
  export function createNutrientBar(name: string, value: string, dvPercent?: number): HTMLElement

  // Macro summary row — compact macro display for hover card
  export function createMacroSummary(nutrition: NutritionInfo): HTMLElement

  // Recommendation banner — one-line personalized recommendation
  export function createRecommendationBanner(text: string, type: 'positive' | 'warning' | 'neutral'): HTMLElement

  // Data source badge — "Source: USDA FDC" or "Source: AI Estimated"
  export function createSourceBadge(source: string): HTMLElement
  ```
- **Donut technique**: Use CSS `conic-gradient` on a `<div>` with `border-radius: 50%` for the macro donut (simpler than SVG, works in content scripts). Example: `background: conic-gradient(#4CAF50 0% 40%, #FF9800 40% 65%, #F44336 65% 90%, #9E9E9E 90% 100%);` with an inner circle overlay for the donut hole. Fallback: SVG `<circle>` with `stroke-dasharray` if `conic-gradient` is unsupported (pre-Chrome 69, but Chrome 114+ required for side panel anyway).
- **Gauge technique**: Use SVG `<path>` arc with `stroke-dasharray` for the radial fit gauge (0-10 score).
- **MIRROR**: Existing `createScoreMeter()` and `createConcernCard()` patterns
- **GOTCHA**: Content scripts inject into the host page's DOM — all CSS must be scoped with `.syntropy-*` prefixes to avoid conflicts
- **GOTCHA**: SVG must be inline (not external files) since content scripts can't load extension resources by default
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit`

### Task 10: UPDATE Hover Card — Visual Redesign

- **ACTION**: Update `chrome-shrine/src/modules/ui/hover-card.ts`
- **IMPLEMENT**: Redesign `buildAnalysisContent()` and `buildHeader()`:
  - Header: product name + brand + fit gauge (if available)
  - Content top: compact macro donut (120px) + macro summary (cal/pro/carb/fat)
  - Content middle: one-line recommendation banner
  - Content bottom: safety + health score meters (existing, refined)
  - Footer: source badge + "Open Details" (opens side panel) + "Add to Journal" button
- **Update `show()` method**: Accept optional `PersonalFitScore` parameter
- **Update `updateWithAnalysis()`**: Accept fit score and render gauge
- **Add "Add to Journal" click handler**: Sends `JOURNAL_LOG_FOOD` message to service worker
- **Add "Open Details" click handler**: Sends `OPEN_SIDE_PANEL` message to service worker
- **MIRROR**: Existing `buildAnalysisContent()` at hover-card.ts:172-227
- **GOTCHA**: Keep hover card width at 400px max — the donut + summary must fit side-by-side
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit`

### Task 11: UPDATE content.css — Visual Styles

- **ACTION**: Update `chrome-shrine/src/content/content.css`
- **IMPLEMENT**: Add CSS for:
  - `.syntropy-macro-donut` — SVG donut positioning and colors
  - `.syntropy-fit-gauge` — radial gauge styling
  - `.syntropy-nutrient-bar` — horizontal bar chart
  - `.syntropy-macro-summary` — compact macro display grid
  - `.syntropy-recommendation` — recommendation banner (positive/warning/neutral)
  - `.syntropy-source-badge` — data source indicator
  - Color scheme: protein=#4CAF50 (green), carbs=#FF9800 (orange), fat=#F44336 (red), other=#9E9E9E (grey)
  - Fit gauge colors: 8-10=#4CAF50, 6-8=#8BC34A, 4-6=#FF9800, 0-4=#F44336
- **MIRROR**: Existing `.syntropy-hover-card`, `.syntropy-score-badge` patterns in content.css
- **GOTCHA**: All classes prefixed with `syntropy-` to avoid host page conflicts
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npm run build`

### Task 12: UPDATE manifest.json — Add Side Panel

- **ACTION**: Update `chrome-shrine/manifest.json`
- **IMPLEMENT**:
  ```json
  {
    "permissions": ["storage", "activeTab", "scripting", "identity", "sidePanel"],
    "side_panel": {
      "default_path": "sidepanel/sidepanel.html"
    }
  }
  ```
- **GOTCHA**: Side panel requires Chrome 114+. The `sidePanel` permission is needed.
- **VALIDATE**: JSON is valid, `npm run build` succeeds

### Task 13: CREATE Side Panel Entry Point

- **ACTION**: Create `chrome-shrine/src/sidepanel/sidepanel.html` and `chrome-shrine/src/sidepanel/sidepanel.ts`
- **IMPLEMENT**:
  - HTML: auth header (user email/avatar, sign out), product display area, tabbed content (Nutrition/Ingredients/Safety/AI), "Add to Journal" button
  - TS: `SidePanelManager` class that:
    - Listens for messages from service worker with product + analysis data
    - Renders large macro donut chart, full nutrient bars with DV%, fit gauge
    - Handles tab switching between Nutrition/Ingredients/Safety/AI views
    - Handles "Add to Journal" click → sends `JOURNAL_LOG_FOOD` message
    - Shows auth state and sign in/out buttons
  - Communication: service worker sends product data to side panel via `chrome.runtime.sendMessage` or port
- **MIRROR**: `popup.ts` structure (PopupManager class, init/setup pattern)
- **ADD to webpack**: New entry point `'sidepanel/sidepanel': './src/sidepanel/sidepanel.ts'`
- **ADD to webpack**: Copy `sidepanel.html` to dist (HtmlWebpackPlugin or CopyWebpackPlugin)
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit && npm run build`

### Task 14: UPDATE Service Worker — New Message Handlers

- **ACTION**: Update `chrome-shrine/src/background/service-worker.ts`
- **IMPLEMENT**: Add message handlers:
  ```typescript
  case 'JOURNAL_GET_PROFILE':
    {
      const profile = await this.journalClient.getHealthProfile();
      sendResponse({ success: !!profile, data: profile });
    }
    break;

  case 'JOURNAL_LOG_FOOD':
    {
      const logged = await this.journalClient.logFood(message.payload);
      sendResponse({ success: logged, data: { logged } });
    }
    break;

  case 'JOURNAL_EXCHANGE_KEY':
    {
      const token = this.authManager.getToken();
      if (token) {
        const apiKey = await this.journalClient.exchangeClerkTokenForApiKey(token);
        sendResponse({ success: !!apiKey, data: { apiKey } });
      } else {
        sendResponse({ success: false, error: 'Not authenticated' });
      }
    }
    break;

  case 'DIET_SCORE_FOOD':
    {
      const { foodName, nutrition, userProfile } = message.payload;
      const fitScore = await this.dietClient.scoreFoodFit(foodName, nutrition, userProfile);
      sendResponse({ success: !!fitScore, data: fitScore });
    }
    break;

  case 'OPEN_SIDE_PANEL':
    {
      // Open side panel and pass product data
      await chrome.sidePanel.open({ windowId: sender.tab?.windowId });
      // Store current product for side panel to read
      await chrome.storage.local.set({ current_analysis_product: message.payload });
      sendResponse({ success: true });
    }
    break;
  ```
- **MIRROR**: Existing DIET_* message handler pattern
- **IMPORTS**: Add `JournalApiClient` import
- **GOTCHA**: `chrome.sidePanel.open()` requires Chrome 116+ and must be called in response to a user gesture (message from content script click qualifies)
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit`

### Task 15: UPDATE webpack.config.js — Side Panel Entry

- **ACTION**: Update `chrome-shrine/webpack.config.js`
- **IMPLEMENT**:
  - Add entry: `'sidepanel/sidepanel': './src/sidepanel/sidepanel.ts'`
  - Add HtmlWebpackPlugin or CopyWebpackPlugin for `sidepanel.html`
- **MIRROR**: Existing `'popup/popup'` entry point pattern
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npm run build`

### Task 16: UPDATE Integration Exports + Re-export

- **ACTION**: Update `chrome-shrine/src/modules/integrations/index.ts`
- **IMPLEMENT**: Add `export { JournalApiClient } from './journal-api';`
- **MIRROR**: Existing `DietApiClient` export pattern
- **VALIDATE**: `cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit`

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|-----------|------------|-----------|
| `tests/journal-api.test.ts` | Profile fetch, food log, API key exchange, error handling | JournalApiClient |
| `tests/diet-scoring.test.ts` | scoreFoodFit with/without profile, fallback scoring | DIET scoring |
| `tests/visual-components.test.ts` | Donut chart SVG output, gauge rendering, nutrient bars | UI components |

### Edge Cases Checklist

- [ ] User not authenticated — hover card shows generic analysis (no fit score, no "Add to Journal")
- [ ] Journal backend unreachable — extension works with DIET + USDA only
- [ ] DIET backend unreachable — extension works with USDA + AI only
- [ ] USDA returns no results — AI estimation fallback
- [ ] All backends down — cached analysis or GPT-4 Vision standalone
- [ ] Food with zero macros (water, spices) — donut chart handles zero gracefully
- [ ] Very long food names — truncation in hover card
- [ ] Side panel opened with no product selected — shows empty state
- [ ] API key expired — prompt re-login
- [ ] Multiple rapid hovers — debounce prevents multiple API calls

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
# Chrome Shrine
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit && npm run lint

# Syntropy-Journals
cd /home/mo/projects/SyntropyHealth/apps/Syntropy-Journals && make lint && make typecheck
```

### Level 2: UNIT_TESTS

```bash
# Chrome Shrine
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx jest tests/

# Syntropy-Journals
cd /home/mo/projects/SyntropyHealth/apps/Syntropy-Journals && make test-unit
```

### Level 3: FULL_SUITE

```bash
# Chrome Shrine
cd /home/mo/projects/SyntropyHealth/apps/chrome-shrine && npx tsc --noEmit && npm run build

# Syntropy-Journals
cd /home/mo/projects/SyntropyHealth/apps/Syntropy-Journals && make test
```

### Level 5: BROWSER_VALIDATION

1. Build extension: `cd chrome-shrine && npm run build`
2. Load unpacked in Chrome from `dist/`
3. Navigate to Amazon Fresh product page
4. Verify hover card shows: macro donut + fit score + recommendation
5. Click "Open Details" → side panel opens with full analysis
6. Click "Add to Journal" → food logged (check Journals DB)
7. Sign in/out from popup → verify Journal API key is obtained/cleared

### Level 6: MANUAL_VALIDATION

1. Sign in via popup → verify Clerk OAuth flow + Journal API key exchange
2. Hover over food product → verify parallel loading (skeleton → data)
3. Check macro donut: protein/carbs/fat segments visually proportional
4. Check fit gauge: score color matches range (green/yellow/orange/red)
5. Check recommendation text: personalized based on health goals
6. Check "Source: USDA FDC" badge when real data is used
7. Open side panel → verify tabbed view (Nutrition/Ingredients/Safety/AI)
8. Sign out → verify hover card shows generic analysis without fit score

---

## Acceptance Criteria

- [ ] User can sign in via Clerk and extension obtains Journal API key
- [ ] Hover card displays macro donut chart with protein/carbs/fat segments
- [ ] Hover card displays personal fit score gauge (0-10) when authenticated
- [ ] Hover card shows one-line personalized recommendation
- [ ] Hover card shows "Source: USDA FDC" when real data is used
- [ ] Side panel opens from hover card with full tabbed analysis
- [ ] Side panel displays full nutrient bars with DV% for 15+ nutrients
- [ ] "Add to Journal" button logs food to Syntropy-Journals database
- [ ] Extension gracefully degrades when Journal/DIET backends are unreachable
- [ ] All TypeScript compiles with no errors
- [ ] Extension builds successfully
- [ ] No visual regressions on hover card for unauthenticated users

---

## Completion Checklist

- [ ] All 16 tasks completed in dependency order
- [ ] Each task validated immediately after completion
- [ ] Level 1: Static analysis (lint + type-check) passes for both repos
- [ ] Level 2: Unit tests pass
- [ ] Level 3: Full build succeeds
- [ ] Level 5: Browser validation passes
- [ ] All acceptance criteria met

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| DIET service lacks `/score-food` endpoint | HIGH | MED | Implement client-side scoring heuristic as fallback (compare macros vs health goals) |
| Clerk JWT exchange on Journals side is complex | MED | MED | Start with simple approach: extension sends Clerk user_id, Journals looks up by clerk_id and returns existing sh_ key |
| Side panel Chrome version requirement (114+) | LOW | LOW | Side panel is enhancement; hover card remains primary UI for older Chrome |
| SVG donut chart renders differently across sites | MED | LOW | Use inline SVG with explicit viewBox and no external dependencies |
| Content.css conflicts with host page styles | LOW | MED | All classes use `.syntropy-` prefix; use `!important` sparingly for critical layout |
| Journal API latency adds to hover card loading | MED | MED | Profile is fetched once and cached in chrome.storage; fit scoring uses cached profile |
| Auth token refresh during long browsing sessions | MED | MED | AuthManager.validateToken() already handles this; add periodic check alarm |
| USDA FDC DEMO_KEY rate limit (30/hr) | HIGH | MED | Register free API key (1000/hr); add env var `USDA_API_KEY` to webpack DefinePlugin; verify OpenDietDataClient doesn't hardcode DEMO_KEY |

---

## Task Dependency Graph

```
[Task 1: Journals API] ──┐
                          ├──> [Task 5: JournalApiClient] ──> [Task 6: Auth Bridge]
[Task 2: Register Router] ┘                                        │
                                                                    v
[Task 3: Types] ──────────────────────────────> [Task 7: DIET Scoring] ──> [Task 8: AI Agent Integration]
[Task 4: Config] ─────────────────────────────┘                                    │
                                                                                   v
[Task 9: SVG Components] ──> [Task 10: Hover Card Redesign] ──> [Task 11: CSS Styles]
                                       │
                                       v
[Task 12: Manifest] ──> [Task 13: Side Panel] ──> [Task 14: Service Worker] ──> [Task 15: Webpack]
                                                                                       │
                                                                                       v
                                                                              [Task 16: Exports]
```

**Parallelism opportunities:**
- Tasks 1-2 (Journals backend) can run in parallel with Tasks 3-4 (Chrome types/config)
- Task 9 (SVG components) can start while Tasks 5-8 are in progress
- Task 12 (manifest) is independent and can be done early

---

## Notes

- **PRD-09 Phase Mapping**: This plan covers Phase 3 (DIET Scoring), Phase 4 (Hover-card Redesign), and adds Journal integration + side panel that weren't in the original PRD.
- **DIET `/score-food` Endpoint**: The DIET service currently has `/symptoms` and `/products/search` but no food-fit scoring endpoint. Options: (a) create it in DIET, (b) use a client-side heuristic that compares food macros against HealthProfile goals/preferences. Recommend starting with (b) and adding (a) later.
- **API Key Exchange Strategy**: The simplest approach is: extension sends Clerk user_id to a Journal endpoint → Journal looks up user by clerk_id → returns the existing `sh_*` API key. No new JWT verification needed if the exchange endpoint trusts the Clerk token (which it can verify via `clerk_backend_api`).
- **Side Panel vs Popup**: Side panels persist across navigation and provide more real estate. The popup remains for config/auth management. Side panel is for detailed food analysis.
- **USDA FDC Rate Limits**: DEMO_KEY allows only **30 requests/hour** (not 1000). A registered API key (free, from https://api.data.gov/signup/) allows **1000 requests/hour**. For production, register a key and inject via `USDA_API_KEY` env var / webpack DefinePlugin. The existing `OpenDietDataClient` should already handle this but verify the key is not `DEMO_KEY`.
- **Clerk Auth in Extensions**: The `chrome.identity.launchWebAuthFlow` approach (already in Chrome Shrine) is the recommended pattern. Clerk's "Sync Host" pattern (embedding a hidden `<iframe>` to a web app for session sharing) is an alternative but adds complexity and has a known limitation where users must close/reopen the side panel after web app login. Stick with the current approach.
- **CSS conic-gradient for Donut Charts**: Preferred over SVG `stroke-dasharray` for simplicity. Supported in Chrome 69+ (we require 114+ for side panel anyway). Creates smooth pie/donut with a single CSS property and an inner circle overlay. No JS needed for rendering — just set percentages from macro data.
