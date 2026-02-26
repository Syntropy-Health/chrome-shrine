/**
 * UI Components Module
 *
 * Reusable UI components for the extension.
 * Includes various display elements, buttons, and widgets.
 *
 * @module ui/components
 */

import { createElement } from '@utils/dom-utils';
import type { SafetyConcern, FoodRecall } from '@types';

/**
 * Create a safety concern card
 * @param concern - Safety concern
 * @returns Concern card element
 */
export function createConcernCard(concern: SafetyConcern): HTMLElement {
  const card = createElement('div', {
    class: `syntropy-concern-card severity-${concern.severity}`,
  });

  const icon = getSeverityIcon(concern.severity);

  card.innerHTML = `
    <div class="concern-header">
      <span class="concern-icon">${icon}</span>
      <h4 class="concern-title">${concern.title}</h4>
      <span class="concern-badge ${concern.severity}">${concern.severity}</span>
    </div>
    <p class="concern-description">${concern.description}</p>
    <div class="concern-footer">
      <span class="concern-source">Source: ${concern.source}</span>
      ${concern.url ? `<a href="${concern.url}" target="_blank" rel="noopener">Learn more →</a>` : ''}
    </div>
  `;

  return card;
}

/**
 * Create a recall alert card
 * @param recall - Food recall
 * @returns Recall card element
 */
export function createRecallCard(recall: FoodRecall): HTMLElement {
  const card = createElement('div', {
    class: `syntropy-recall-card classification-${recall.classification.toLowerCase().replace(/\s/g, '-')}`,
  });

  card.innerHTML = `
    <div class="recall-header">
      <span class="recall-icon">⚠️</span>
      <div class="recall-title-group">
        <h4 class="recall-title">${recall.productName}</h4>
        <span class="recall-company">${recall.company}</span>
      </div>
      <span class="recall-badge ${recall.classification.toLowerCase().replace(/\s/g, '-')}">${recall.classification}</span>
    </div>
    <div class="recall-body">
      <p class="recall-reason"><strong>Reason:</strong> ${recall.reason}</p>
      <p class="recall-date"><strong>Date:</strong> ${formatDate(recall.recallDate)}</p>
      ${recall.productsAffected.length > 0 ? `
        <details class="recall-products">
          <summary>Products Affected (${recall.productsAffected.length})</summary>
          <ul>
            ${recall.productsAffected.slice(0, 5).map(p => `<li>${p}</li>`).join('')}
          </ul>
        </details>
      ` : ''}
    </div>
    <div class="recall-footer">
      <span class="recall-source">Source: ${recall.source}</span>
      <a href="${recall.url}" target="_blank" rel="noopener" class="recall-link">View Official Notice →</a>
    </div>
  `;

  return card;
}

/**
 * Create an ingredient badge
 * @param name - Ingredient name
 * @param type - Badge type
 * @returns Badge element
 */
export function createIngredientBadge(
  name: string,
  type: 'natural' | 'processed' | 'allergen' | 'additive' = 'natural'
): HTMLElement {
  const badge = createElement('span', {
    class: `syntropy-ingredient-badge type-${type}`,
  }, [name]);

  return badge;
}

/**
 * Create a score meter
 * @param score - Score value (0-100)
 * @param label - Score label
 * @returns Meter element
 */
export function createScoreMeter(score: number, label: string): HTMLElement {
  const meter = createElement('div', {
    class: 'syntropy-score-meter',
  });

  const scoreClass = getScoreClass(score);

  meter.innerHTML = `
    <div class="meter-label">${label}</div>
    <div class="meter-bar">
      <div class="meter-fill ${scoreClass}" style="width: ${score}%"></div>
    </div>
    <div class="meter-value ${scoreClass}">${score}/100</div>
  `;

  return meter;
}

/**
 * Create a loading spinner
 * @param text - Loading text
 * @returns Spinner element
 */
export function createSpinner(text = 'Loading...'): HTMLElement {
  const spinner = createElement('div', {
    class: 'syntropy-spinner-container',
  });

  spinner.innerHTML = `
    <div class="syntropy-spinner"></div>
    <p class="spinner-text">${text}</p>
  `;

  return spinner;
}

/**
 * Create an error message
 * @param message - Error message
 * @param actionText - Action button text (optional)
 * @param onAction - Action callback (optional)
 * @returns Error element
 */
export function createError(
  message: string,
  actionText?: string,
  onAction?: () => void
): HTMLElement {
  const error = createElement('div', {
    class: 'syntropy-error',
  });

  error.innerHTML = `
    <div class="error-icon">⚠️</div>
    <p class="error-message">${message}</p>
  `;

  if (actionText && onAction) {
    const button = createElement('button', {
      class: 'error-action-btn',
    }, [actionText]);

    button.addEventListener('click', onAction);
    error.appendChild(button);
  }

  return error;
}

/**
 * Create an info card
 * @param title - Card title
 * @param content - Card content (HTML)
 * @param icon - Optional icon
 * @returns Card element
 */
export function createInfoCard(
  title: string,
  content: string,
  icon?: string
): HTMLElement {
  const card = createElement('div', {
    class: 'syntropy-info-card',
  });

  card.innerHTML = `
    ${icon ? `<div class="card-icon">${icon}</div>` : ''}
    <h4 class="card-title">${title}</h4>
    <div class="card-content">${content}</div>
  `;

  return card;
}

/**
 * Create a tabbed panel
 * @param tabs - Array of tab configurations
 * @returns Tabbed panel element
 */
export function createTabbedPanel(
  tabs: Array<{
    id: string;
    label: string;
    content: HTMLElement | string;
  }>
): HTMLElement {
  const panel = createElement('div', {
    class: 'syntropy-tabbed-panel',
  });

  // Create tab headers
  const headers = createElement('div', {
    class: 'tab-headers',
  });

  tabs.forEach((tab, index) => {
    const header = createElement('button', {
      class: `tab-header ${index === 0 ? 'active' : ''}`,
      'data-tab': tab.id,
    }, [tab.label]);

    header.addEventListener('click', () => {
      // Deactivate all tabs
      panel.querySelectorAll('.tab-header').forEach((h) => h.classList.remove('active'));
      panel.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

      // Activate clicked tab
      header.classList.add('active');
      panel.querySelector(`[data-tab-content="${tab.id}"]`)?.classList.add('active');
    });

    headers.appendChild(header);
  });

  panel.appendChild(headers);

  // Create tab contents
  const contents = createElement('div', {
    class: 'tab-contents',
  });

  tabs.forEach((tab, index) => {
    const content = createElement('div', {
      class: `tab-content ${index === 0 ? 'active' : ''}`,
      'data-tab-content': tab.id,
    });

    if (typeof tab.content === 'string') {
      content.innerHTML = tab.content;
    } else {
      content.appendChild(tab.content);
    }

    contents.appendChild(content);
  });

  panel.appendChild(contents);

  return panel;
}

/**
 * Create a collapsible section
 * @param title - Section title
 * @param content - Section content
 * @param defaultOpen - Whether section is open by default
 * @returns Collapsible element
 */
export function createCollapsible(
  title: string,
  content: HTMLElement | string,
  defaultOpen = false
): HTMLElement {
  const collapsible = createElement('div', {
    class: `syntropy-collapsible ${defaultOpen ? 'open' : ''}`,
  });

  const header = createElement('button', {
    class: 'collapsible-header',
  });

  header.innerHTML = `
    <span class="header-text">${title}</span>
    <span class="header-icon">${defaultOpen ? '▼' : '▶'}</span>
  `;

  header.addEventListener('click', () => {
    const isOpen = collapsible.classList.toggle('open');
    const icon = header.querySelector('.header-icon');
    if (icon) {
      icon.textContent = isOpen ? '▼' : '▶';
    }
  });

  const contentEl = createElement('div', {
    class: 'collapsible-content',
  });

  if (typeof content === 'string') {
    contentEl.innerHTML = content;
  } else {
    contentEl.appendChild(content);
  }

  collapsible.appendChild(header);
  collapsible.appendChild(contentEl);

  return collapsible;
}

// Helper functions

/**
 * Get severity icon
 * @param severity - Severity level
 * @returns Icon string
 */
function getSeverityIcon(severity: string): string {
  const icons = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };
  return icons[severity as keyof typeof icons] || '⚪';
}

/**
 * Get score class
 * @param score - Score value
 * @returns CSS class
 */
function getScoreClass(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Format date
 * @param date - Date object
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
