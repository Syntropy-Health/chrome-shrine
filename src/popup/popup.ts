/**
 * Popup Script
 *
 * Handles popup UI interactions, authentication, service status,
 * and configuration management.
 *
 * @module popup
 */

import { ConfigManager } from '@/config/config';
import { AuthManager, type AuthState } from '@modules/auth';
import { IntegrationManager } from '@modules/integrations';
import { OpenNutritionClient } from '@modules/nutrition';
import type { ExtensionConfig } from '@types';

class PopupManager {
  private config = ConfigManager.getInstance();
  private integrationManager = IntegrationManager.getInstance();
  private authManager = AuthManager.getInstance();
  private nutritionClient = OpenNutritionClient.getInstance();

  async init(): Promise<void> {
    try {
      await this.initAuth();
      await this.loadConfig();
      await this.loadStats();
      this.setupEventListeners();
      this.checkServiceStatus();
    } catch (error) {
      console.error('[Popup] Initialization error:', error);
    }
  }

  // =========================================================================
  // Auth
  // =========================================================================

  private async initAuth(): Promise<void> {
    const authState = await this.authManager.initialize();
    this.updateAuthUI(authState);
  }

  private updateAuthUI(state: AuthState): void {
    const signedOut = document.getElementById('signedOutState');
    const signedIn = document.getElementById('signedInState');
    const avatar = document.getElementById('userAvatar') as HTMLImageElement;
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');

    if (state.isAuthenticated && state.user) {
      if (signedOut) signedOut.classList.add('hidden');
      if (signedIn) signedIn.classList.remove('hidden');

      if (nameEl) {
        const name = [state.user.firstName, state.user.lastName].filter(Boolean).join(' ');
        nameEl.textContent = name || state.user.email;
      }
      if (emailEl) emailEl.textContent = state.user.email;

      if (state.user.imageUrl && avatar) {
        avatar.src = state.user.imageUrl;
        avatar.classList.remove('hidden');
        if (avatarPlaceholder) avatarPlaceholder.classList.add('hidden');
      } else {
        if (avatar) avatar.classList.add('hidden');
        if (avatarPlaceholder) {
          avatarPlaceholder.classList.remove('hidden');
          avatarPlaceholder.textContent = (state.user.firstName || state.user.email)[0].toUpperCase();
        }
      }
    } else {
      if (signedOut) signedOut.classList.remove('hidden');
      if (signedIn) signedIn.classList.add('hidden');
    }

    if (state.error) {
      this.showMessage(state.error, 'error');
    }
  }

  private async handleSignIn(): Promise<void> {
    const btn = document.getElementById('signInBtn') as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Signing in...';
    }

    const authState = await this.authManager.signInWithGoogle();
    this.updateAuthUI(authState);
    this.checkServiceStatus();

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg> Sign in with Google`;
    }
  }

  private async handleSignOut(): Promise<void> {
    await this.authManager.signOut();
    this.updateAuthUI(this.authManager.getState());
    this.checkServiceStatus();
    this.showMessage('Signed out successfully', 'success');
  }

  // =========================================================================
  // Service Status
  // =========================================================================

  private async checkServiceStatus(): Promise<void> {
    // OpenNutrition
    const onStatus = document.getElementById('openNutritionStatus');
    if (onStatus) {
      try {
        const available = await this.nutritionClient.isAvailable();
        onStatus.textContent = available ? 'Connected' : 'Unavailable';
        onStatus.className = `service-status ${available ? 'service-connected' : 'service-disconnected'}`;
      } catch {
        onStatus.textContent = 'Unavailable';
        onStatus.className = 'service-status service-disconnected';
      }
    }

    // Journal API
    const journalStatus = document.getElementById('journalApiStatus');
    if (journalStatus) {
      const connected = this.authManager.isAuthenticated();
      journalStatus.textContent = connected ? 'Connected' : 'Not connected';
      journalStatus.className = `service-status ${connected ? 'service-connected' : 'service-disconnected'}`;
    }

    // DIET API
    const dietStatus = document.getElementById('dietApiStatus');
    if (dietStatus) {
      const connected = this.authManager.isAuthenticated();
      dietStatus.textContent = connected ? 'Connected' : 'Not connected';
      dietStatus.className = `service-status ${connected ? 'service-connected' : 'service-disconnected'}`;
    }
  }

  // =========================================================================
  // Config
  // =========================================================================

  private async loadConfig(): Promise<void> {
    const config = await this.config.load();

    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const modelSelect = document.getElementById('model') as HTMLSelectElement;
    const hoverCards = document.getElementById('hoverCards') as HTMLInputElement;
    const safetyAlerts = document.getElementById('safetyAlerts') as HTMLInputElement;
    const ingredientAnalysis = document.getElementById('ingredientAnalysis') as HTMLInputElement;

    if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
    if (modelSelect) modelSelect.value = config.model;
    if (hoverCards) hoverCards.checked = config.features.hoverCards;
    if (safetyAlerts) safetyAlerts.checked = config.features.safetyAlerts;
    if (ingredientAnalysis) ingredientAnalysis.checked = config.features.ingredientAnalysis;
  }

  private async loadStats(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'GET_PRODUCTS' }, (response) => {
          if (response?.success) {
            this.setStatValue('productCount', response.data.length);
          }
        });
      }
      const recalls = await this.integrationManager.getRecentRecalls(100);
      this.setStatValue('recallCount', recalls.length);
    } catch (error) {
      console.error('[Popup] Error loading stats:', error);
    }
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================

  private setupEventListeners(): void {
    document.getElementById('saveBtn')?.addEventListener('click', () => this.saveConfig());
    document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshPage());
    document.getElementById('signInBtn')?.addEventListener('click', () => this.handleSignIn());
    document.getElementById('signOutBtn')?.addEventListener('click', () => this.handleSignOut());
  }

  private async saveConfig(): Promise<void> {
    try {
      const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value;
      const model = (document.getElementById('model') as HTMLSelectElement).value;
      const hoverCards = (document.getElementById('hoverCards') as HTMLInputElement).checked;
      const safetyAlerts = (document.getElementById('safetyAlerts') as HTMLInputElement).checked;
      const ingredientAnalysis = (document.getElementById('ingredientAnalysis') as HTMLInputElement).checked;

      await this.config.save({
        apiKey,
        model,
        features: {
          hoverCards,
          safetyAlerts,
          ingredientAnalysis,
          personalInsights: true,
        },
      });

      this.showMessage('Configuration saved!', 'success');
    } catch (error) {
      console.error('[Popup] Error saving config:', error);
      this.showMessage('Error saving configuration', 'error');
    }
  }

  private async refreshPage(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'REFRESH' }, (response) => {
          if (response?.success) {
            this.setStatValue('productCount', response.data.count);
            this.showMessage('Page refreshed!', 'success');
          }
        });
      }
    } catch (error) {
      this.showMessage('Error refreshing page', 'error');
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private setStatValue(id: string, count: number): void {
    const el = document.getElementById(id);
    if (el) el.textContent = count.toString();
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    const el = document.getElementById('statusMessage');
    if (el) {
      el.textContent = message;
      el.className = `toast toast-${type}`;
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 3000);
    }
  }
}

// Initialize
const popupManager = new PopupManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => popupManager.init());
} else {
  popupManager.init();
}
