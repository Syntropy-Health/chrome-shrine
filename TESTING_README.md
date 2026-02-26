# Syntropy Food Extension - Testing Setup Complete ✅

## Quick Start Guide

The extension is **ready for manual testing** in Chrome. Follow these steps to load and test it.

---

## 1. Extension is Built and Ready

✅ **Build Status**: SUCCESS
- Location: `./dist/`
- Size: ~1.4 MB total
- Main bundle: 335 KB
- Icons: All generated and configured
- API Key: Pre-configured (see below)

---

## 2. Load Extension in Chrome

### Step-by-Step:

1. **Open Chrome Extensions Page**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle switch in top-right corner

3. **Load Unpacked Extension**
   - Click "Load unpacked" button
   - Navigate to and select:
     ```
     /home/mo/projects/SyntropyHealth/apps/chrome-dieton/dist
     ```
   - Extension should appear with Syntropy icon

4. **Verify Extension Loaded**
   - Look for "Syntropy Food Insights" in your extensions list
   - Icon should be visible in Chrome toolbar

---

## 3. Configure API Key

The OpenAI API key is already configured in the build, but you need to set it in the extension's storage:

### Method 1: Via Extension Popup (Easiest)

1. Click the Syntropy icon in Chrome toolbar
2. Popup will open
3. Enter this API key:
   ```
   sk-proj-YOUR_OPENAI_API_KEY_HERE
   ```
4. Select model: **gpt-4-vision-preview**
5. Ensure all features are checked:
   - ✅ Hover Cards
   - ✅ Safety Alerts
   - ✅ Ingredient Analysis
6. Click **"Save Configuration"**
7. Wait for success message

### Method 2: Via DevTools Console (Advanced)

1. On any page, open DevTools (F12)
2. Go to Console tab
3. Run this command:

```javascript
chrome.storage.sync.set({
  syntropy_api_key: 'sk-proj-YOUR_OPENAI_API_KEY_HERE',
  syntropy_config: {
    provider: 'openai',
    model: 'gpt-4-vision-preview',
    features: {
      hoverCards: true,
      safetyAlerts: true,
      ingredientAnalysis: true,
      personalInsights: true
    }
  }
}, () => console.log('✅ Configuration saved!'));
```

4. You should see: `✅ Configuration saved!`

---

## 4. Test on Live CookUnity Page

### Navigate to Test Page

```
https://www.cookunity.com/meals/sea-choi-grilled-beef-bulgogi
```

### Expected Results

The extension should automatically:
1. **Detect** the CookUnity meal page
2. **Extract** product information:
   - Name: "Grilled Beef Bulgogi" by Sea Choi
   - Ingredients: ~23 ingredients
   - Nutrition: Calories 740kcal, Protein 40g, Carbs 63g, Fat 36g
   - Allergens: milk, gluten, wheat, soy, sesame
3. **Enable** hover interactions on the meal card
4. **Provide** AI-powered analysis when hovering

---

## 5. Verify Functionality

### Open Developer Console

- Press `F12` (or `Cmd+Option+I` on Mac)
- Switch to "Console" tab

### Check for Initialization Logs

You should see:
```
[Syntropy] Content script initializing...
[Syntropy] Food page detected
[Syntropy] Initialized with 1 products
```

### Inspect Extracted Data

Run this in console:
```javascript
chrome.runtime.sendMessage({type: 'GET_PRODUCTS'}, (response) => {
  if (response?.success) {
    console.log('✅ Products found:', response.data.length);
    console.table(response.data[0]);
  } else {
    console.error('❌ Error:', response?.error);
  }
});
```

### Test Hover Card

1. Hover your mouse over the meal image or card
2. A hover card should appear within 500ms
3. You'll see a loading state initially
4. After 3-10 seconds, AI analysis should appear with:
   - Safety score
   - Health score
   - Summary
   - Key insights

---

## 6. Expected Data Extraction

Based on the CookUnity page, the extension should extract:

### Nutritional Facts
```
Protein: 40g
Carbs: 63g
Calories: 740kcal
Fat: 36g
```

### Ingredients (23 total)
```
Sesame Oil, Canola and Olive Oil Blend, Turmeric, Butter, Sake,
Black Pepper, Garlic, Sour Cream, Sugar, Onion, Basmati Rice,
Light Soy Sauce, Kosher Salt, Beef Chuck, Green Beans, Green Peas,
Carrots, Chicken Base, Pineapple Juice, Lemon Juice, Rice Wine,
Whole Milk, Italian Parsley
```

### Allergens
```
Contains: milk, cereals containing gluten, wheat, soybeans, sesame seeds
```

---

## 7. Troubleshooting

### Extension Not Loading?
- Check that Developer mode is enabled
- Verify the `dist/` folder exists
- Look for errors on `chrome://extensions/` page

### No Console Logs?
- Refresh the page
- Verify extension is enabled
- Check that URL matches supported domain

### Hover Card Not Appearing?
- Make sure features are enabled in settings
- Try hovering over different parts of the meal card
- Check console for JavaScript errors

### AI Analysis Not Working?
- Verify API key is saved correctly
- Check network tab for OpenAI API calls
- Look for 401 (unauthorized) or 429 (rate limit) errors
- Ensure you have OpenAI API credits

---

## 8. Comprehensive Testing

For complete testing instructions, see:
- **Manual Test Guide**: `docs/qa/MANUAL_TEST_GUIDE.md`
- **Live Test Report**: `docs/qa/TEST_REPORT_COOKUNITY_LIVE.md`

### Quick Test Checklist

- [ ] Extension loads in Chrome
- [ ] API key configured
- [ ] Navigate to CookUnity meal page
- [ ] Console shows initialization logs
- [ ] Product data extracted correctly
- [ ] Hover card appears and functions
- [ ] AI analysis completes successfully
- [ ] Results match expected data (±10%)
- [ ] No critical errors in console
- [ ] Performance is acceptable

---

## 9. Project Structure

```
chrome-dieton/
├── dist/                      # ← LOAD THIS IN CHROME
│   ├── manifest.json          # Extension manifest
│   ├── background/            # Service worker
│   ├── content/               # Page interaction
│   ├── popup/                 # Configuration UI
│   └── icons/                 # Extension icons
├── src/                       # Source code
├── docs/
│   ├── qa/                    # Testing documentation
│   │   ├── MANUAL_TEST_GUIDE.md
│   │   └── TEST_REPORT_COOKUNITY_LIVE.md
│   ├── ICONS.md               # Icon configuration guide
│   └── ICON_SETUP_SUMMARY.md
├── .env                       # Configuration (API key)
├── package.json
└── webpack.config.js
```

---

## 10. What's Been Completed

### ✅ Development Setup
- [x] Installed all dependencies (@ai-sdk/openai, sharp, dotenv)
- [x] Configured OpenAI API key in .env
- [x] Set up icon system with auto-generation
- [x] Fixed TypeScript compilation issues
- [x] Configured webpack for production builds

### ✅ Extension Features
- [x] CookUnity meal page scraper
- [x] Ingredient and nutrition extraction
- [x] AI-powered analysis agent (OpenAI GPT-4)
- [x] Image processing capabilities
- [x] Hover card UI interactions
- [x] Configuration popup
- [x] FDA/USDA recall integration
- [x] Caching system
- [x] Error handling

### ✅ Documentation
- [x] Manual testing guide
- [x] Live test report template
- [x] Icon configuration docs
- [x] Setup instructions
- [x] Troubleshooting guide

---

## 11. Next Steps

### Immediate (Now)
1. Load extension in Chrome
2. Configure API key via popup
3. Navigate to CookUnity test page
4. Verify product extraction
5. Test AI analysis functionality

### Short Term (After Testing)
1. Document actual test results
2. Capture screenshots
3. Note any discrepancies
4. Report bugs or issues
5. Optimize performance if needed

### Long Term (Production)
1. Security audit
2. API key encryption
3. User onboarding flow
4. Performance optimization
5. Chrome Web Store submission

---

## 12. Support & Resources

### Documentation
- Main README: `README.md`
- Icon Guide: `docs/ICONS.md`
- Test Guide: `docs/qa/MANUAL_TEST_GUIDE.md`
- Test Report: `docs/qa/TEST_REPORT_COOKUNITY_LIVE.md`

### Chrome Extension Docs
- Manifest V3: https://developer.chrome.com/docs/extensions/mv3/
- Content Scripts: https://developer.chrome.com/docs/extensions/mv3/content_scripts/
- Storage API: https://developer.chrome.com/docs/extensions/reference/storage/

### OpenAI Resources
- API Docs: https://platform.openai.com/docs
- Models: https://platform.openai.com/docs/models
- Rate Limits: https://platform.openai.com/account/rate-limits

---

## 13. Quick Reference Commands

```bash
# Rebuild extension
npm run build

# Generate icons
npm run generate-icons

# Type check (without building)
npm run type-check

# Development mode (watch)
npm run dev

# Check extension structure
ls -lh dist/

# View manifest
cat dist/manifest.json
```

---

## ✅ **SYSTEM IS READY FOR TESTING**

**Status**: All components built and configured
**Action Required**: Manual browser testing
**Estimated Time**: 15-30 minutes
**Priority**: Ready to proceed

---

**Happy Testing! 🚀**

For questions or issues, refer to the troubleshooting section above or check the detailed documentation in `docs/qa/`.
