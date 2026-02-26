/**
 * DOM Utilities Module
 *
 * Provides utilities for DOM manipulation, element detection,
 * and text extraction. Used primarily by scrapers and UI components.
 */

/**
 * Safely get text content from an element
 * @param element - DOM element
 * @param selector - Optional CSS selector
 * @returns Trimmed text content or empty string
 */
export function getTextContent(element: Element | Document, selector?: string | string[]): string {
  try {
    // Handle array of selectors (try each until one matches)
    if (Array.isArray(selector)) {
      for (const sel of selector) {
        const target = element.querySelector(sel);
        const text = target?.textContent?.trim();
        if (text) return text;
      }
      return '';
    }
    const target = selector ? element.querySelector(selector) : (element instanceof Element ? element : null);
    return target?.textContent?.trim() || '';
  } catch (error) {
    console.error('[DOM Utils] Error getting text content:', error);
    return '';
  }
}

/**
 * Safely get attribute value from an element
 * @param element - DOM element
 * @param attribute - Attribute name
 * @param selector - Optional CSS selector
 * @returns Attribute value or null
 */
export function getAttribute(
  element: Element,
  attribute: string,
  selector?: string
): string | null {
  try {
    const target = selector ? element.querySelector(selector) : element;
    return target?.getAttribute(attribute) || null;
  } catch (error) {
    console.error('[DOM Utils] Error getting attribute:', error);
    return null;
  }
}

/**
 * Get all matching elements with optional filtering
 * @param root - Root element to search from
 * @param selector - CSS selector
 * @param filter - Optional filter function
 * @returns Array of matching elements
 */
export function queryElements<T extends Element = Element>(
  root: Document | Element,
  selector: string,
  filter?: (el: T) => boolean
): T[] {
  try {
    const elements = Array.from(root.querySelectorAll<T>(selector));
    return filter ? elements.filter(filter) : elements;
  } catch (error) {
    console.error('[DOM Utils] Error querying elements:', error);
    return [];
  }
}

/**
 * Check if element is visible in viewport
 * @param element - DOM element
 * @returns true if element is visible
 */
export function isElementVisible(element: Element): boolean {
  try {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  } catch (error) {
    console.error('[DOM Utils] Error checking visibility:', error);
    return false;
  }
}

/**
 * Extract all text from element, including nested elements
 * @param element - DOM element
 * @param separator - Text separator (default: space)
 * @returns Concatenated text
 */
export function extractAllText(element: Element, separator = ' '): string {
  try {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const texts: string[] = [];
    let node: Node | null;

    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (text) {
        texts.push(text);
      }
    }

    return texts.join(separator).replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('[DOM Utils] Error extracting text:', error);
    return '';
  }
}

/**
 * Find parent element matching selector
 * @param element - Starting element
 * @param selector - CSS selector
 * @param maxDepth - Maximum depth to search (default: 10)
 * @returns Matching parent element or null
 */
export function findParent(
  element: Element,
  selector: string,
  maxDepth = 10
): Element | null {
  let current = element.parentElement;
  let depth = 0;

  while (current && depth < maxDepth) {
    if (current.matches(selector)) {
      return current;
    }
    current = current.parentElement;
    depth++;
  }

  return null;
}

/**
 * Wait for element to appear in DOM
 * @param selector - CSS selector
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @param root - Root element to observe (default: document.body)
 * @returns Promise resolving to the element
 */
export function waitForElement(
  selector: string,
  timeout = 5000,
  root: Element = document.body
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = root.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = root.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Create element with attributes and children
 * @param tag - HTML tag name
 * @param attributes - Element attributes
 * @param children - Child elements or text
 * @returns Created element
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  children: (string | Node)[] = []
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  children.forEach((child) => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });

  return element;
}

/**
 * Debounce function calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

/**
 * Throttle function calls
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Sanitize HTML to prevent XSS
 * @param html - HTML string
 * @returns Sanitized HTML
 */
export function sanitizeHTML(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Check if element matches any of the selectors
 * @param element - DOM element
 * @param selectors - Array of CSS selectors
 * @returns true if element matches any selector
 */
export function matchesAny(element: Element, selectors: string[]): boolean {
  return selectors.some((selector) => {
    try {
      return element.matches(selector);
    } catch {
      return false;
    }
  });
}
