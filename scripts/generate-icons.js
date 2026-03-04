/**
 * Icon generation script.
 * Icons are pre-generated in public/icons/. This script verifies they exist.
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const required = ['icon48.png', 'icon128.png'];

const missing = required.filter(f => !fs.existsSync(path.join(iconsDir, f)));

if (missing.length > 0) {
  console.warn('Warning: Missing icons:', missing.join(', '));
  console.warn('Build will continue with available icons.');
} else {
  console.log('All required icons present.');
}
