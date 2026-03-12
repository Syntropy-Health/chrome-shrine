/**
 * Sentry Observability Module
 *
 * Provides error tracking and performance monitoring for the Chrome extension.
 * Uses BrowserClient (manual init) instead of Sentry.init() to avoid
 * global state pollution in extension context.
 *
 * @module utils/sentry
 */

import {
  BrowserClient,
  defaultStackParser,
  makeFetchTransport,
  Scope,
  breadcrumbsIntegration,
  dedupeIntegration,
} from '@sentry/browser';

let sentryClient: BrowserClient | null = null;
let sentryScope: Scope | null = null;

/**
 * Initialize Sentry for Chrome extension context
 * Uses manual BrowserClient to avoid global state pollution
 *
 * @param dsn - Sentry DSN
 * @param options - Additional configuration
 */
export function initSentry(
  dsn: string,
  options: {
    environment?: string;
    release?: string;
    sampleRate?: number;
  } = {},
): void {
  if (sentryClient) return; // Already initialized

  if (!dsn) {
    console.log('[Sentry] No DSN provided, error tracking disabled');
    return;
  }

  sentryClient = new BrowserClient({
    dsn,
    transport: makeFetchTransport,
    stackParser: defaultStackParser,
    integrations: [
      breadcrumbsIntegration(),
      dedupeIntegration(),
    ],
    environment: options.environment || 'production',
    release: options.release || '1.0.0',
    sampleRate: options.sampleRate ?? 1.0,

    // Extension-specific settings
    beforeSend(event) {
      // Filter out noisy errors from third-party scripts
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
        return null;
      }
      return event;
    },
  });

  sentryScope = new Scope();
  sentryScope.setClient(sentryClient);
  sentryClient.init();

  console.log('[Sentry] Initialized for Chrome extension');
}

/**
 * Capture an error event
 * @param error - Error to capture
 * @param context - Additional context
 */
export function captureError(
  error: Error | string,
  context?: Record<string, any>,
): void {
  if (!sentryClient || !sentryScope) {
    console.error('[Sentry] Not initialized, logging error locally:', error);
    return;
  }

  if (context) {
    sentryScope.setExtras(context);
  }

  if (typeof error === 'string') {
    sentryScope.captureMessage(error);
  } else {
    sentryScope.captureException(error);
  }
}

/**
 * Add a breadcrumb for debugging context
 * @param message - Breadcrumb message
 * @param category - Category (e.g., 'scraper', 'api', 'ui')
 * @param data - Additional data
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>,
): void {
  if (!sentryScope) return;

  sentryScope.addBreadcrumb({
    message,
    category,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context for error tracking
 * @param userId - User ID
 * @param email - User email
 */
export function setUser(userId: string, email?: string): void {
  if (!sentryScope) return;

  sentryScope.setUser({ id: userId, email });
}

/**
 * Performance monitoring wrapper
 * Measures execution time and reports to Sentry
 *
 * @param name - Operation name
 * @param fn - Function to measure
 * @returns Result of the function
 */
export async function withPerformance<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    addBreadcrumb(`${name} completed in ${duration.toFixed(0)}ms`, 'performance', {
      duration,
      operation: name,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    captureError(error instanceof Error ? error : new Error(String(error)), {
      operation: name,
      duration,
    });

    throw error;
  }
}

/**
 * Flush pending events (call before extension unload)
 */
export async function flushSentry(): Promise<void> {
  if (sentryClient) {
    await sentryClient.flush(2000);
  }
}
