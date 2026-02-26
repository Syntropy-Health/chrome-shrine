/**
 * Popup Script
 *
 * Handles popup UI interactions and configuration management.
 */

import { ConfigManager } from '@/config/config';
import { AuthManager, type AuthState } from '@modules/auth';
import { IntegrationManager } from '@modules/integrations';
import type { ExtensionConfig } from '@types';

/**
 * Popup manager class
 */
class PopupManager {
  private config = ConfigManager.getInstance();
  private integrationManager = IntegrationManager.getInstance();
  private authManager = AuthManager.getInstance();

  /**
   * Initialize popup
   */
  async init(): Promise<void> {
    console.log('[Popup] Initializing...');

    try {
      // Initialize auth and update UI
      await this.initAuth();

      // Load configuration
      await this.loadConfig();

      // Load stats
      await this.loadStats();

      // Set up event listeners
      this.setupEventListeners();

      console.log('[Popup] Initialized');
    } catch (error) {
      console.error('[Popup] Initialization error:', error);
    }
  }

  /**
   * Initialize authentication
   */
  private async initAuth(): Promise<void> {
    const authState = await this.authManager.initialize();
    this.updateAuthUI(authState);
  }

  /**
   * Update authentication UI based on state
   */
  private updateAuthUI(state: AuthState): void {
    const authSection = document.getElementById('authSection');
    const userInfo = document.getElementById('userInfo');
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar') as HTMLImageElement;

    if (state.isAuthenticated && state.user) {
      // Show user info, hide sign in button
      if (userInfo) userInfo.classList.remove('hidden');
      if (signInBtn) signInBtn.classList.add('hidden');
      if (signOutBtn) signOutBtn.classList.remove('hidden');
      if (userEmail) userEmail.textContent = state.user.email;
      if (userAvatar && state.user.imageUrl) {
        userAvatar.src = state.user.imageUrl;
        userAvatar.classList.remove('hidden');
      }
    } else {
      // Show sign in button, hide user info
      if (userInfo) userInfo.classList.add('hidden');
      if (signInBtn) signInBtn.classList.remove('hidden');
      if (signOutBtn) signOutBtn.classList.add('hidden');
    }

    if (state.error) {
      this.showMessage(state.error, 'error');
    }
  }

  /**
   * Handle sign in with Google
   */
  private async handleSignIn(): Promise<void> {
    const signInBtn = document.getElementById('signInBtn');
    if (signInBtn) signInBtn.textContent = 'Signing in...';

    const authState = await this.authManager.signInWithGoogle();
    this.updateAuthUI(authState);

    if (signInBtn) signInBtn.textContent = 'Sign in with Google';
  }

  /**
   * Handle sign out
   */
  private async handleSignOut(): Promise<void> {
    await this.authManager.signOut();
    this.updateAuthUI(this.authManager.getState());
    this.showMessage('Signed out successfully', 'success');
  }

  /**
   * Load configuration into form
   */
  private async loadConfig(): Promise<void> {
    const config = await this.config.load();

    // Set form values
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const modelSelect = document.getElementById('model') as HTMLSelectElement;
    const hoverCardsCheckbox = document.getElementById('hoverCards') as HTMLInputElement;
    const safetyAlertsCheckbox = document.getElementById('safetyAlerts') as HTMLInputElement;
    const ingredientAnalysisCheckbox = document.getElementById('ingredientAnalysis') as HTMLInputElement;

    if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
    if (modelSelect) modelSelect.value = config.model;
    if (hoverCardsCheckbox) hoverCardsCheckbox.checked = config.features.hoverCards;
    if (safetyAlertsCheckbox) safetyAlertsCheckbox.checked = config.features.safetyAlerts;
    if (ingredientAnalysisCheckbox) ingredientAnalysisCheckbox.checked = config.features.ingredientAnalysis;
  }

  /**
   * Load stats
   */
  private async loadStats(): Promise<void> {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab.id) {
        // Request product count from content script
        chrome.tabs.sendMessage(
          tab.id,
          { type: 'GET_PRODUCTS' },
          (response) => {
            if (response?.success) {
              this.updateProductCount(response.data.length);
            }
          }
        );
      }

      // Get recall count
      const recalls = await this.integrationManager.getRecentRecalls(100);
      this.updateRecallCount(recalls.length);
    } catch (error) {
      console.error('[Popup] Error loading stats:', error);
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveConfig());
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshPage());
    }

    // Docs button
    const docsBtn = document.getElementById('docsBtn');
    if (docsBtn) {
      docsBtn.addEventListener('click', () => {
        chrome.tabs.create({
          url: 'https://github.com/SyntropyHealth/syntropy-food-extension',
        });
      });
    }

    // Auth buttons
    const signInBtn = document.getElementById('signInBtn');
    if (signInBtn) {
      signInBtn.addEventListener('click', () => this.handleSignIn());
    }

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => this.handleSignOut());
    }
  }

  /**
   * Save configuration
   */
  private async saveConfig(): Promise<void> {
    try {
      const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
      const modelSelect = document.getElementById('model') as HTMLSelectElement;
      const hoverCardsCheckbox = document.getElementById('hoverCards') as HTMLInputElement;
      const safetyAlertsCheckbox = document.getElementById('safetyAlerts') as HTMLInputElement;
      const ingredientAnalysisCheckbox = document.getElementById('ingredientAnalysis') as HTMLInputElement;

      const updates: Partial<ExtensionConfig> = {
        apiKey: apiKeyInput.value,
        model: modelSelect.value,
        features: {
          hoverCards: hoverCardsCheckbox.checked,
          safetyAlerts: safetyAlertsCheckbox.checked,
          ingredientAnalysis: ingredientAnalysisCheckbox.checked,
          personalInsights: true,
        },
      };

      await this.config.save(updates);

      this.showMessage('Configuration saved successfully!', 'success');
    } catch (error) {
      console.error('[Popup] Error saving config:', error);
      this.showMessage('Error saving configuration', 'error');
    }
  }

  /**
   * Refresh current page
   */
  private async refreshPage(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          { type: 'REFRESH' },
          (response) => {
            if (response?.success) {
              this.updateProductCount(response.data.count);
              this.showMessage('Page refreshed successfully!', 'success');
            }
          }
        );
      }
    } catch (error) {
      console.error('[Popup] Error refreshing page:', error);
      this.showMessage('Error refreshing page', 'error');
    }
  }

  /**
   * Update product count display
   * @param count - Product count
   */
  private updateProductCount(count: number): void {
    const productCountEl = document.getElementById('productCount');
    if (productCountEl) {
      productCountEl.textContent = count.toString();
    }
  }

  /**
   * Update recall count display
   * @param count - Recall count
   */
  private updateRecallCount(count: number): void {
    const recallCountEl = document.getElementById('recallCount');
    if (recallCountEl) {
      recallCountEl.textContent = count.toString();
    }
  }

  /**
   * Show status message
   * @param message - Message text
   * @param type - Message type
   */
  private showMessage(message: string, type: 'success' | 'error'): void {
    const messageEl = document.getElementById('statusMessage');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.className = `status-message ${type}`;
      messageEl.classList.remove('hidden');

      setTimeout(() => {
        messageEl.classList.add('hidden');
      }, 3000);
    }
  }
}

// Initialize popup
const popupManager = new PopupManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    popupManager.init();
  });
} else {
  popupManager.init();
}
