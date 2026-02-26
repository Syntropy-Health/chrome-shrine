/**
 * Authentication Configuration
 *
 * Environment-based configuration for Clerk + Supabase authentication.
 * Values are loaded from environment variables at build time.
 */

/**
 * Authentication configuration object
 * These values are injected at build time from .env
 */
export const AUTH_CONFIG = {
    // Clerk Configuration
    // Publishable key is safe for client-side use
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',

    // Authorized domains for redirects
    CLERK_AUTHORIZED_DOMAINS: (process.env.CLERK_AUTHORIZED_DOMAINS || 'http://localhost:3000').split(','),

    // Supabase Configuration
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',

    // OAuth providers enabled
    OAUTH_PROVIDERS: ['google'] as const,

    // Token refresh interval (15 minutes)
    TOKEN_REFRESH_INTERVAL: 15 * 60 * 1000,

    // Session timeout (24 hours)
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000,
} as const;

/**
 * Check if authentication is properly configured
 */
export function isAuthConfigured(): boolean {
    return !!(AUTH_CONFIG.CLERK_PUBLISHABLE_KEY && AUTH_CONFIG.CLERK_PUBLISHABLE_KEY.startsWith('pk_'));
}

/**
 * Get Clerk frontend API domain from publishable key
 */
export function getClerkDomain(): string {
    const key = AUTH_CONFIG.CLERK_PUBLISHABLE_KEY;
    if (!key) return '';

    try {
        // Extract domain from publishable key
        // Format: pk_test_<base64-encoded-domain>$ or pk_live_<base64-encoded-domain>$
        const encoded = key.replace('pk_test_', '').replace('pk_live_', '');
        const decoded = atob(encoded);
        return decoded.replace('$', '');
    } catch {
        return '';
    }
}
