/**
 * Background Service Worker
 *
 * Handles background tasks, API calls, and message routing.
 * Manages cache refresh and recall updates.
 */

import { IntegrationManager } from '@modules/integrations';
import { DietApiClient } from '@modules/integrations/diet-api';
import { ConfigManager } from '@/config/config';
import { CacheManager } from '@utils/storage';
import type { ExtensionMessage, ExtensionResponse } from '@types';

/**
 * Background service worker class
 */
class BackgroundService {
  private integrationManager = IntegrationManager.getInstance();
  private dietClient = DietApiClient.getInstance();
  private config = ConfigManager.getInstance();

  /**
   * Initialize background service
   */
  async init(): Promise<void> {
    console.log('[Syntropy Background] Initializing...');

    try {
      // Load configuration
      await this.config.load();

      // Set up message listeners
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
        return true; // Keep channel open for async response
      });

      // Set up install/update listener
      chrome.runtime.onInstalled.addListener((details) => {
        this.handleInstall(details);
      });

      // Set up alarm for periodic recall updates
      chrome.alarms.create('updateRecalls', { periodInMinutes: 360 }); // Every 6 hours

      chrome.alarms.onAlarm.addListener((alarm) => {
        this.handleAlarm(alarm);
      });

      // Perform initial recall fetch
      this.updateRecalls();

      console.log('[Syntropy Background] Initialized successfully');
    } catch (error) {
      console.error('[Syntropy Background] Initialization error:', error);
    }
  }

  /**
   * Handle incoming messages
   * @param message - Message object
   * @param sender - Message sender
   * @param sendResponse - Response callback
   */
  private async handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'GET_RECALLS':
          {
            const recalls = await this.integrationManager.getRecentRecalls(50);
            sendResponse({ success: true, data: recalls });
          }
          break;

        case 'GET_CONFIG':
          {
            const config = this.config.get();
            sendResponse({ success: true, data: config });
          }
          break;

        case 'UPDATE_CONFIG':
          {
            await this.config.update(message.payload);
            sendResponse({ success: true });
          }
          break;

        case 'CACHE_ANALYSIS':
          {
            const { productId, analysis } = message.payload;
            await CacheManager.setAnalysis(productId, analysis);
            sendResponse({ success: true });
          }
          break;

        case 'GET_CACHED_ANALYSIS':
          {
            const analysis = await CacheManager.getAnalysis(message.payload.productId);
            sendResponse({ success: true, data: analysis });
          }
          break;

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

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[Syntropy Background] Message handler error:', error);
      sendResponse({ success: false, error: String(error) });
    }
  }

  /**
   * Handle extension install/update
   * @param details - Install details
   */
  private async handleInstall(details: chrome.runtime.InstalledDetails): Promise<void> {
    if (details.reason === 'install') {
      console.log('[Syntropy Background] Extension installed');

      // Open welcome page
      chrome.tabs.create({
        url: chrome.runtime.getURL('popup/popup.html'),
      });
    } else if (details.reason === 'update') {
      console.log('[Syntropy Background] Extension updated');

      // Clear old caches
      await CacheManager.cleanup();
    }
  }

  /**
   * Handle alarms
   * @param alarm - Alarm object
   */
  private async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    console.log(`[Syntropy Background] Alarm triggered: ${alarm.name}`);

    switch (alarm.name) {
      case 'updateRecalls':
        await this.updateRecalls();
        break;
    }
  }

  /**
   * Update recalls cache
   */
  private async updateRecalls(): Promise<void> {
    try {
      console.log('[Syntropy Background] Updating recalls...');
      await this.integrationManager.refreshCache();
      console.log('[Syntropy Background] Recalls updated successfully');
    } catch (error) {
      console.error('[Syntropy Background] Error updating recalls:', error);
    }
  }
}

// Initialize background service
const backgroundService = new BackgroundService();
backgroundService.init();
