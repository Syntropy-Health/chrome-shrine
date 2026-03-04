/**
 * Authentication Module
 *
 * Handles Clerk + Supabase authentication for the Chrome extension.
 * Provides Google OAuth login via Clerk and syncs with Supabase backend.
 *
 * @module auth
 */

import { AUTH_CONFIG } from './config';
import { JournalApiClient } from '@modules/integrations/journal-api';

/**
 * User information from Clerk
 */
export interface ClerkUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
    createdAt?: number;
}

/**
 * Authentication state
 */
export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: ClerkUser | null;
    token: string | null;
    error: string | null;
}

/**
 * Storage keys for auth data
 */
const AUTH_STORAGE_KEYS = {
    USER: 'syntropy_auth_user',
    TOKEN: 'syntropy_auth_token',
    SESSION: 'syntropy_auth_session',
    JOURNAL_API_KEY: 'syntropy_journal_api_key',
} as const;

/**
 * Authentication Manager
 * Handles Clerk OAuth flow for Chrome extensions
 */
export class AuthManager {
    private static instance: AuthManager;
    private state: AuthState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
        error: null,
    };

    private constructor() { }

    /**
     * Get singleton instance
     */
    static getInstance(): AuthManager {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    /**
     * Initialize authentication state from storage
     */
    async initialize(): Promise<AuthState> {
        try {
            this.state.isLoading = true;

            const result = await chrome.storage.local.get([
                AUTH_STORAGE_KEYS.USER,
                AUTH_STORAGE_KEYS.TOKEN,
            ]);

            if (result[AUTH_STORAGE_KEYS.USER] && result[AUTH_STORAGE_KEYS.TOKEN]) {
                this.state.user = result[AUTH_STORAGE_KEYS.USER];
                this.state.token = result[AUTH_STORAGE_KEYS.TOKEN];
                this.state.isAuthenticated = true;

                // Validate token is still valid
                const isValid = await this.validateToken(this.state.token);
                if (!isValid) {
                    await this.signOut();
                }
            }

            this.state.isLoading = false;
            return this.getState();
        } catch (error) {
            console.error('[AuthManager] Initialize error:', error);
            this.state.isLoading = false;
            this.state.error = 'Failed to initialize authentication';
            return this.getState();
        }
    }

    /**
     * Sign in with Google via Clerk OAuth
     */
    async signInWithGoogle(): Promise<AuthState> {
        try {
            this.state.isLoading = true;
            this.state.error = null;

            // Build Clerk OAuth URL for Google
            const authUrl = this.buildClerkOAuthUrl('google');

            // Launch OAuth flow using Chrome identity API
            const redirectUrl = await this.launchOAuthFlow(authUrl);

            if (!redirectUrl) {
                throw new Error('OAuth flow was cancelled or failed');
            }

            // Extract token from redirect URL
            const token = this.extractTokenFromUrl(redirectUrl);

            if (!token) {
                throw new Error('No token received from authentication');
            }

            // Fetch user info from Clerk
            const user = await this.fetchUserInfo(token);

            // Store authentication data
            await this.storeAuthData(user, token);

            this.state.user = user;
            this.state.token = token;
            this.state.isAuthenticated = true;
            this.state.isLoading = false;

            console.log('[AuthManager] Sign in successful:', user.email);

            // Bridge: exchange Clerk identity for Journal API key (non-blocking)
            this.exchangeJournalApiKey(user).catch((err) => {
                console.warn('[AuthManager] Journal API key exchange failed (non-critical):', err);
            });

            return this.getState();
        } catch (error) {
            console.error('[AuthManager] Sign in error:', error);
            this.state.isLoading = false;
            this.state.error = error instanceof Error ? error.message : 'Sign in failed';
            return this.getState();
        }
    }

    /**
     * Sign out and clear stored authentication data
     */
    async signOut(): Promise<void> {
        try {
            // Clear stored data including Journal API key
            await chrome.storage.local.remove([
                AUTH_STORAGE_KEYS.USER,
                AUTH_STORAGE_KEYS.TOKEN,
                AUTH_STORAGE_KEYS.SESSION,
                AUTH_STORAGE_KEYS.JOURNAL_API_KEY,
            ]);

            // Clear the Journal client's cached key
            await JournalApiClient.getInstance().clearApiKey();

            // Reset state
            this.state = {
                isAuthenticated: false,
                isLoading: false,
                user: null,
                token: null,
                error: null,
            };

            console.log('[AuthManager] Sign out successful');
        } catch (error) {
            console.error('[AuthManager] Sign out error:', error);
        }
    }

    /**
     * Get current authentication state
     */
    getState(): AuthState {
        return { ...this.state };
    }

    /**
     * Get current user
     */
    getUser(): ClerkUser | null {
        return this.state.user ? { ...this.state.user } : null;
    }

    /**
     * Get current token for API calls
     */
    getToken(): string | null {
        return this.state.token;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this.state.isAuthenticated;
    }

    /**
     * Exchange Clerk identity for a Journal sh_* API key
     */
    private async exchangeJournalApiKey(user: ClerkUser): Promise<void> {
        const journalClient = JournalApiClient.getInstance();
        const apiKey = await journalClient.exchangeClerkTokenForApiKey(
            user.id,
            user.email,
            user.firstName,
            user.lastName,
            user.imageUrl,
        );
        if (apiKey) {
            console.log('[AuthManager] Journal API key obtained');
        }
    }

    /**
     * Build Clerk OAuth URL for specified provider
     */
    private buildClerkOAuthUrl(provider: 'google' | 'github'): string {
        const params = new URLSearchParams({
            redirect_url: chrome.identity.getRedirectURL(),
        });

        // Clerk OAuth endpoint
        // Format: https://<clerk-frontend-api>/oauth/authorize
        const clerkDomain = this.extractClerkDomain(AUTH_CONFIG.CLERK_PUBLISHABLE_KEY);
        return `https://${clerkDomain}/v1/oauth_callback?provider=${provider}&${params.toString()}`;
    }

    /**
     * Extract Clerk domain from publishable key
     */
    private extractClerkDomain(publishableKey: string): string {
        // Clerk publishable keys encode the domain
        // Format: pk_test_<base64-encoded-domain>
        try {
            const encoded = publishableKey.replace('pk_test_', '').replace('pk_live_', '');
            const decoded = atob(encoded);
            return decoded.replace('$', '');
        } catch {
            return 'clerk.accounts.dev';
        }
    }

    /**
     * Launch OAuth flow using Chrome identity API
     */
    private async launchOAuthFlow(authUrl: string): Promise<string | undefined> {
        return new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow(
                {
                    url: authUrl,
                    interactive: true,
                },
                (redirectUrl) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(redirectUrl);
                    }
                }
            );
        });
    }

    /**
     * Extract token from OAuth redirect URL
     */
    private extractTokenFromUrl(url: string): string | null {
        try {
            const urlObj = new URL(url);
            // Check hash fragment first (implicit flow)
            const hashParams = new URLSearchParams(urlObj.hash.substring(1));
            let token = hashParams.get('access_token') || hashParams.get('token');

            // Check query params (authorization code flow)
            if (!token) {
                token = urlObj.searchParams.get('access_token') || urlObj.searchParams.get('token');
            }

            // Check for session token in __clerk_db_jwt cookie format
            if (!token) {
                token = urlObj.searchParams.get('__clerk_db_jwt');
            }

            return token;
        } catch (error) {
            console.error('[AuthManager] Token extraction error:', error);
            return null;
        }
    }

    /**
     * Fetch user info from Clerk API
     */
    private async fetchUserInfo(token: string): Promise<ClerkUser> {
        try {
            const clerkDomain = this.extractClerkDomain(AUTH_CONFIG.CLERK_PUBLISHABLE_KEY);
            const response = await fetch(`https://${clerkDomain}/v1/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }

            const data = await response.json();
            return {
                id: data.id,
                email: data.email_addresses?.[0]?.email_address || '',
                firstName: data.first_name,
                lastName: data.last_name,
                imageUrl: data.image_url,
                createdAt: data.created_at,
            };
        } catch (error) {
            console.error('[AuthManager] Fetch user error:', error);
            // Return minimal user info
            return {
                id: 'unknown',
                email: 'unknown@example.com',
            };
        }
    }

    /**
     * Validate token is still valid
     */
    private async validateToken(token: string): Promise<boolean> {
        try {
            const clerkDomain = this.extractClerkDomain(AUTH_CONFIG.CLERK_PUBLISHABLE_KEY);
            const response = await fetch(`https://${clerkDomain}/v1/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Store authentication data in extension storage
     */
    private async storeAuthData(user: ClerkUser, token: string): Promise<void> {
        await chrome.storage.local.set({
            [AUTH_STORAGE_KEYS.USER]: user,
            [AUTH_STORAGE_KEYS.TOKEN]: token,
        });
    }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();
