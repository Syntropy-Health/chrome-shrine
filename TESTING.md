# 🧪 Testing Guide

Comprehensive guide for testing the Syntropy Food Extension.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Manual Testing](#manual-testing)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [Troubleshooting](#troubleshooting)

## Overview

The extension uses a combination of automated and manual testing strategies:

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test interactions between modules
- **Manual Tests**: Test in real browser environment
- **E2E Tests**: Test complete user workflows

## Test Types

### Unit Tests

Test individual components in isolation.

**Location**: `tests/*.test.ts`

**Coverage**:
- Scraper logic
- UI components
- Utility functions
- Configuration management

### Integration Tests

Test module interactions and external APIs.

**Coverage**:
- FDA API integration
- USDA API integration
- Cache management
- Message passing between scripts

### Manual Tests

Interactive tests in the browser.

**Tool**: `tests/manual-test-runner.html`

**Coverage**:
- Real-world scraping
- Hover card interactions
- AI analysis
- Full user workflows

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Build extension
npm run build
```

### Automated Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- scraper.test.ts

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

### Manual Tests

1. **Load the Test Runner**

   ```bash
   # Open in browser
   open tests/manual-test-runner.html
   ```

   Or navigate to: `file:///path/to/tests/manual-test-runner.html`

2. **Run Individual Tests**

   Click buttons to run:
   - Configuration Test
   - Scraper Test (on food websites)
   - Integration Test (API connectivity)
   - AI Analysis Test
   - UI Component Test

3. **Run All Tests**

   Click "Run All Tests" for complete suite

### Browser Console Tests

For testing on live websites:

```javascript
// In browser console on food website

// Test 1: Check scraper detection
chrome.runtime.sendMessage({ type: 'GET_PRODUCTS' }, console.log);

// Test 2: Fetch recalls
chrome.runtime.sendMessage({ type: 'GET_RECALLS' }, console.log);

// Test 3: Get configuration
chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, console.log);
```

## Manual Testing

### Complete Test Workflow

#### 1. Configuration Test

**Objective**: Verify extension is properly configured

**Steps**:
1. Click extension icon
2. Verify popup opens
3. Check API key field
4. Test save configuration
5. Reload extension
6. Verify settings persist

**Expected Results**:
- ✅ Popup opens without errors
- ✅ Configuration saves successfully
- ✅ Settings persist after reload

#### 2. Amazon Fresh Test

**Objective**: Test product detection and analysis on Amazon

**Steps**:
1. Navigate to [Amazon Fresh](https://www.amazon.com/alm/storefront/fresh/)
2. Wait for page load
3. Hover over any product
4. Observe hover card
5. Click "View Full Analysis"
6. Check console for logs

**Expected Results**:
- ✅ Products detected (check console: `[Syntropy] Found X products`)
- ✅ Hover card appears on hover
- ✅ Quick analysis shows scores
- ✅ No console errors

**Test Data**:
- Search for: "organic bananas"
- Should find: 10-20 products
- Hover on: First 3 products

#### 3. CookUnity Test

**Objective**: Test meal detection on CookUnity

**Steps**:
1. Navigate to [CookUnity Meals](https://www.cookunity.com/meals/)
2. Wait for meals to load
3. Hover over a meal card
4. Check meal details extraction

**Expected Results**:
- ✅ Meals detected
- ✅ Chef name extracted
- ✅ Ingredients shown (if available)
- ✅ Nutrition facts parsed

#### 4. Recall Integration Test

**Objective**: Verify FDA/USDA integrations work

**Steps**:
1. Open extension popup
2. Check "Active Recalls" count
3. Open background service worker console
4. Look for recall fetch logs

**Expected Results**:
- ✅ Recall count > 0
- ✅ No API errors
- ✅ Recalls cached properly

#### 5. AI Analysis Test

**Objective**: Test AI-powered analysis

**Prerequisites**: API key configured

**Steps**:
1. Visit food product page
2. Hover over product (wait for analysis)
3. Check analysis results
4. Verify recommendations
5. Look for concerns/recalls

**Expected Results**:
- ✅ Analysis completes within 5 seconds
- ✅ Safety and health scores displayed
- ✅ Insights are relevant
- ✅ Recommendations are personalized

#### 6. UI Components Test

**Objective**: Test all UI components render correctly

**Steps**:
1. Open `tests/manual-test-runner.html`
2. Click "Run UI Test"
3. Verify components render
4. Check styling and animations

**Expected Results**:
- ✅ Score badges render with correct colors
- ✅ Concern cards display properly
- ✅ All text is readable
- ✅ No layout issues

### Edge Cases

Test these scenarios:

#### Product Without Ingredients
- Navigate to product with no ingredient list
- Hover and check handling
- Should show "Ingredients not available"

#### Slow Network
- Throttle network in DevTools
- Test product extraction
- Verify timeouts work

#### Invalid API Key
- Set invalid API key in config
- Attempt analysis
- Should show error message

#### Very Long Product Names
- Find product with 100+ character name
- Check hover card layout
- Verify text truncates properly

### Performance Testing

#### Memory Leaks

```javascript
// In console, repeat many times
for(let i = 0; i < 100; i++) {
  // Trigger hover cards repeatedly
  // Monitor memory in DevTools Performance
}
```

#### API Rate Limiting

```javascript
// Trigger multiple analyses quickly
// Should use cache for subsequent requests
```

## Writing Tests

### Unit Test Template

```typescript
/**
 * Test suite for YourModule
 */
describe('YourModule', () => {
  let instance: YourModule;

  beforeEach(() => {
    instance = new YourModule();
  });

  afterEach(() => {
    // Cleanup
  });

  test('should do something', () => {
    const result = instance.doSomething();
    expect(result).toBe(expected);
  });

  test('should handle errors', () => {
    expect(() => {
      instance.doSomethingBad();
    }).toThrow();
  });
});
```

### Integration Test Template

```typescript
describe('YourIntegration', () => {
  test('should integrate with API', async () => {
    const integration = new YourIntegration();
    const result = await integration.fetchData();

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('id');
    }
  }, 10000); // 10 second timeout for API
});
```

### Manual Test Template

```javascript
export async function runManualYourTest() {
  console.log('🧪 Running Your Test...\n');

  // Test step 1
  console.log('Test 1: Description');
  try {
    // Your test logic
    console.log('✓ Test 1 passed');
  } catch (error) {
    console.error('✗ Test 1 failed:', error);
  }

  // More test steps...

  console.log('\n✅ Manual test complete!');
}
```

## Test Coverage

### Current Coverage

Run coverage report:

```bash
npm test -- --coverage
```

**Target Coverage**:
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

### Areas Needing Tests

- [ ] Error boundaries
- [ ] Edge cases in scrapers
- [ ] Cache expiration logic
- [ ] Image prioritization algorithm
- [ ] Complex UI interactions

## Troubleshooting

### Tests Fail to Run

**Issue**: Module resolution errors

**Solution**:
```bash
rm -rf node_modules
npm install
npm run build
```

### API Tests Timeout

**Issue**: FDA/USDA APIs slow or unavailable

**Solution**:
- Increase timeout in test
- Skip API tests if needed
- Use mock data

### Manual Tests Don't Work

**Issue**: Extension not loaded

**Solution**:
1. Build extension: `npm run build`
2. Load in Chrome: `chrome://extensions/`
3. Reload test page

### Hover Cards Don't Appear

**Issue**: Site not detected as food-related

**Solution**:
- Check console for detection logs
- Verify scraper supports the site
- Test on supported sites first

### Analysis Fails

**Issue**: API key not configured

**Solution**:
1. Open extension popup
2. Add OpenAI API key
3. Save configuration
4. Retry analysis

## Best Practices

### Before Committing

- ✅ Run full test suite
- ✅ Test on at least 2 supported sites
- ✅ Check console for errors
- ✅ Verify no memory leaks
- ✅ Update test coverage

### Before Releasing

- ✅ Run manual test suite
- ✅ Test all features
- ✅ Verify on clean install
- ✅ Test with fresh API key
- ✅ Check error handling
- ✅ Verify all links work
- ✅ Test uninstall/reinstall

### Continuous Testing

- Test after every feature
- Test on multiple browsers (Chrome, Edge, Brave)
- Test with different screen sizes
- Test with slow network
- Test with ad blockers enabled

## Test Data

### Sample Products for Testing

**Amazon Fresh**:
- Search: "organic bananas"
- Search: "greek yogurt"
- Search: "chicken breast"

**CookUnity**:
- Browse: All meals
- Filter: Chef's choice
- Filter: High protein

### Mock Data

Located in `tests/mocks/`:
- `products.json` - Sample products
- `recalls.json` - Sample recalls
- `analysis.json` - Sample analyses

## Reporting Issues

When reporting test failures:

1. **Describe the test**
   - Which test failed
   - Expected vs actual result

2. **Provide context**
   - Browser version
   - Extension version
   - Test environment

3. **Include logs**
   - Console errors
   - Network tab screenshots
   - Extension logs

4. **Steps to reproduce**
   - Detailed steps
   - Test data used
   - Configuration settings

## Resources

- [Chrome Extension Testing](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)

---

For questions about testing, open an issue on GitHub or contact dev@syntropyhealth.com
