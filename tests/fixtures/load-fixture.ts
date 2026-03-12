/**
 * Fixture Loader
 *
 * Loads HTML fixtures and creates mock documents for scraper testing.
 * Extends the DOMParser + Proxy pattern from scraper.test.ts to work
 * with full HTML fixture files.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const FIXTURES_DIR = resolve(__dirname, 'html');

/**
 * Create a mock document from an HTML fixture file with a controllable location.
 * Uses a Proxy to intercept the `location` property since jsdom
 * makes it non-configurable on parsed documents.
 *
 * @param fixtureName - Name of the fixture file (without .html extension)
 * @param href - URL to simulate for document.location
 * @returns Mock Document
 */
export function loadFixture(fixtureName: string, href: string): Document {
  const filePath = resolve(FIXTURES_DIR, `${fixtureName}.html`);
  const html = readFileSync(filePath, 'utf-8');
  return createMockDocument(html, href);
}

/**
 * Create a mock document from raw HTML with a controllable location.
 * Reusable version of the pattern from scraper.test.ts.
 *
 * @param html - Raw HTML string
 * @param href - URL to simulate
 * @returns Mock Document with Proxy-based location
 */
export function createMockDocument(html: string, href = 'https://example.com'): Document {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const url = new URL(href);
  const fakeLocation = {
    href,
    pathname: url.pathname,
    hostname: url.hostname,
    origin: url.origin,
    search: url.search,
    hash: url.hash,
  };

  return new Proxy(doc, {
    get(target, prop, receiver) {
      if (prop === 'location') return fakeLocation;
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') return val.bind(target);
      return val;
    },
  }) as Document;
}

/**
 * List available fixture names
 */
export const FIXTURE_NAMES = [
  'amazon-supplement',
  'wholefoods-product',
  'cookunity-meals',
  'doordash-store',
  'shopify-supplement',
] as const;

export type FixtureName = typeof FIXTURE_NAMES[number];
