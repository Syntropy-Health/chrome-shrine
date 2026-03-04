/**
 * Manifest processing utilities for build pipeline.
 * Validates icon paths and processes manifest.json.
 */

const fs = require('fs');
const path = require('path');

/**
 * Process manifest - returns manifest unchanged (icons configured in webpack)
 */
function processManifest(manifest) {
  return manifest;
}

/**
 * Validate that icon files exist in the public directory
 * @param {string} publicDir - Path to public directory
 * @returns {string[]} Array of warning messages for missing icons
 */
function validateIconPaths(publicDir) {
  const warnings = [];
  const requiredIcons = ['icons/icon48.png', 'icons/icon128.png'];

  for (const iconPath of requiredIcons) {
    const fullPath = path.join(publicDir, iconPath);
    if (!fs.existsSync(fullPath)) {
      warnings.push(`Missing icon: ${iconPath}`);
    }
  }

  return warnings;
}

module.exports = { processManifest, validateIconPaths };
