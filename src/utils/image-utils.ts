/**
 * Image Utilities Module
 *
 * Handles image detection, extraction, prioritization, and processing.
 * Includes utilities for converting images to base64 and sorting by importance.
 */

import { IMAGE_CONFIG } from '@/config/config';
import type { ProductImage } from '@types';

/**
 * Extract images from a container element
 * @param container - Container element
 * @param options - Extraction options
 * @returns Array of product images sorted by priority
 */
export async function extractImages(
  container: Element | Document,
  options: {
    maxImages?: number;
    minSize?: number;
    includeBackgrounds?: boolean;
  } = {}
): Promise<ProductImage[]> {
  const {
    maxImages = IMAGE_CONFIG.MAX_IMAGES,
    minSize = IMAGE_CONFIG.MIN_IMAGE_SIZE,
    includeBackgrounds = true,
  } = options;

  const images: ProductImage[] = [];

  // Extract <img> elements
  const imgElements = container.querySelectorAll('img');
  for (const img of Array.from(imgElements)) {
    const productImage = await extractImageFromElement(img);
    if (productImage && isImageSuitable(productImage, minSize)) {
      images.push(productImage);
    }
  }

  // Extract background images if requested
  if (includeBackgrounds) {
    const elementsWithBg = container.querySelectorAll('*');
    for (const el of Array.from(elementsWithBg)) {
      const bgImage = extractBackgroundImage(el);
      if (bgImage && isImageSuitable(bgImage, minSize)) {
        images.push(bgImage);
      }
    }
  }

  // Sort by priority and limit
  return prioritizeImages(images).slice(0, maxImages);
}

/**
 * Extract image information from an img element
 * @param img - Image element
 * @returns Product image or null
 */
async function extractImageFromElement(
  img: HTMLImageElement
): Promise<ProductImage | null> {
  try {
    const src = img.src || img.dataset.src || img.dataset.lazySrc;
    if (!src || src.startsWith('data:image/svg')) {
      return null;
    }

    const naturalWidth = img.naturalWidth || img.width || 0;
    const naturalHeight = img.naturalHeight || img.height || 0;

    // Determine image type based on class/attributes
    let type: ProductImage['type'] = 'main';
    if (img.classList.contains('thumbnail') || img.width < 100) {
      type = 'thumbnail';
    } else if (img.classList.contains('zoom') || naturalWidth > 1000) {
      type = 'zoom';
    }

    return {
      url: src,
      width: naturalWidth,
      height: naturalHeight,
      type,
      priority: calculateImagePriority(img, naturalWidth, naturalHeight),
    };
  } catch (error) {
    console.error('[Image Utils] Error extracting image:', error);
    return null;
  }
}

/**
 * Extract background image from element
 * @param element - DOM element
 * @returns Product image or null
 */
function extractBackgroundImage(element: Element): ProductImage | null {
  try {
    const style = window.getComputedStyle(element);
    const bgImage = style.backgroundImage;

    if (!bgImage || bgImage === 'none') {
      return null;
    }

    const urlMatch = bgImage.match(/url\(['"]?(.+?)['"]?\)/);
    if (!urlMatch) {
      return null;
    }

    const url = urlMatch[1];
    if (url.startsWith('data:image/svg')) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    return {
      url,
      width: rect.width,
      height: rect.height,
      type: 'detail',
      priority: calculateImagePriority(element, rect.width, rect.height),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Calculate priority score for an image
 * @param element - Image element or container
 * @param width - Image width
 * @param height - Image height
 * @returns Priority score (higher = more important)
 */
function calculateImagePriority(
  element: Element,
  width: number,
  height: number
): number {
  let priority = 0;

  // Size-based priority (larger images are generally more important)
  const area = width * height;
  priority += Math.min(area / 100000, 50);

  // Position-based priority (images higher on page are more important)
  const rect = element.getBoundingClientRect();
  const scrollY = window.scrollY || window.pageYOffset;
  const distanceFromTop = rect.top + scrollY;
  priority += Math.max(0, 30 - distanceFromTop / 100);

  // Class/attribute-based priority
  const classList = element.classList.toString().toLowerCase();
  const id = element.id.toLowerCase();

  if (
    classList.includes('main') ||
    classList.includes('primary') ||
    id.includes('main')
  ) {
    priority += 20;
  }

  if (classList.includes('hero') || classList.includes('featured')) {
    priority += 15;
  }

  if (classList.includes('thumbnail') || classList.includes('preview')) {
    priority -= 10;
  }

  // Alt text suggests importance
  if (element instanceof HTMLImageElement && element.alt) {
    priority += 5;
  }

  return Math.max(0, priority);
}

/**
 * Check if image is suitable for processing
 * @param image - Product image
 * @param minSize - Minimum size (width * height)
 * @returns true if image is suitable
 */
function isImageSuitable(image: ProductImage, minSize: number): boolean {
  if (!image.width || !image.height) {
    return true; // Unknown size, include it
  }

  return image.width * image.height >= minSize;
}

/**
 * Prioritize images for processing
 * @param images - Array of product images
 * @returns Sorted array (highest priority first)
 */
function prioritizeImages(images: ProductImage[]): ProductImage[] {
  return [...images].sort((a, b) => b.priority - a.priority);
}

/**
 * Convert image URL to base64
 * @param url - Image URL
 * @param maxSize - Maximum file size in bytes
 * @returns Base64 encoded image or null
 */
export async function imageToBase64(
  url: string,
  maxSize = IMAGE_CONFIG.MAX_FILE_SIZE
): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    if (blob.size > maxSize) {
      console.warn(`[Image Utils] Image too large: ${blob.size} bytes`);
      return null;
    }

    if (!IMAGE_CONFIG.SUPPORTED_FORMATS.includes(blob.type as any)) {
      console.warn(`[Image Utils] Unsupported format: ${blob.type}`);
      return null;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[Image Utils] Error converting image to base64:', error);
    return null;
  }
}

/**
 * Get image dimensions
 * @param url - Image URL
 * @returns Promise resolving to dimensions
 */
export async function getImageDimensions(
  url: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Download image and convert to data URL
 * @param url - Image URL
 * @returns Data URL or null
 */
export async function downloadImage(url: string): Promise<string | null> {
  try {
    // If already a data URL, return as-is
    if (url.startsWith('data:')) {
      return url;
    }

    // Convert to absolute URL if needed
    const absoluteUrl = new URL(url, window.location.href).href;
    return await imageToBase64(absoluteUrl);
  } catch (error) {
    console.error('[Image Utils] Error downloading image:', error);
    return null;
  }
}

/**
 * Batch process images
 * @param images - Array of product images
 * @param processor - Processing function
 * @param concurrency - Number of concurrent processes
 * @returns Array of processed results
 */
export async function batchProcessImages<T>(
  images: ProductImage[],
  processor: (image: ProductImage) => Promise<T>,
  concurrency = 3
): Promise<T[]> {
  const results: T[] = [];
  const queue = [...images];

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}
