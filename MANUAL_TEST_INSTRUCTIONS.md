# 🚀 Quick Start: Manual Testing Instructions

## ✅ Everything is Built and Ready

The Syntropy Food Extension is **100% ready** for browser testing. Follow these simple steps.

---

## Step 1: Load Extension (2 minutes)

1. **Open Chrome** and go to:
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle switch in top-right corner

3. **Load Extension**
   - Click "Load unpacked"
   - Navigate to and select:
     ```
     /home/mo/projects/SyntropyHealth/apps/chrome-dieton/dist
     ```
   - You should see "Syntropy Food Insights" appear

---

## Step 2: Configure API Key (1 minute)

1. **Click the Syntropy icon** in Chrome toolbar (should appear in extensions area)

2. **In the popup that opens**:
   - Paste this API key:
     ```
     sk-proj-YOUR_OPENAI_API_KEY_HERE
     ```
   - Select Model: `gpt-4-vision-preview`
   - Make sure these are checked:
     - ✅ Hover Cards
     - ✅ Safety Alerts
     - ✅ Ingredient Analysis
   - Click **"Save Configuration"**
   - Wait for success message

---

## Step 3: Test on Live Page (5 minutes)

1. **Open this URL**:
   ```
   https://www.cookunity.com/meals/sea-choi-grilled-beef-bulgogi
   ```

2. **Open DevTools** (Press F12)
   - Switch to **Console** tab

3. **Look for these logs**:
   ```
   [Syntropy] Content script initializing...
   [Syntropy] Food page detected
   [Syntropy] Initialized with 1 products
   ```

4. **Run this in console** to see extracted data:
   ```javascript
   chrome.runtime.sendMessage({type: 'GET_PRODUCTS'}, (response) => {
     if (response?.success) {
       const p = response.data[0];
       console.log('📦 PRODUCT DATA:');
       console.log('Name:', p.name);
       console.log('Ingredients:', p.ingredients.length, 'items');
       console.log('Nutrition:', p.nutrition);
       console.table(p.ingredients);
     }
   });
   ```

5. **Hover over the meal card/image**
   - Hover card should appear
   - AI analysis will load in 3-10 seconds

---

## Step 4: Verify Results

### Expected Data to Extract:

**Nutritional Facts:**
- Protein: ~40g
- Carbs: ~63g
- Calories: ~740kcal
- Fat: ~36g

**Ingredients (23 total):**
```
Sesame Oil, Canola and Olive Oil Blend, Turmeric, Butter, Sake,
Black Pepper, Garlic, Sour Cream, Sugar, Onion, Basmati Rice,
Light Soy Sauce, Kosher Salt, Beef Chuck, Green Beans, Green Peas,
Carrots, Chicken Base, Pineapple Juice, Lemon Juice, Rice Wine,
Whole Milk, Italian Parsley
```

**Allergens:**
```
milk, cereals containing gluten, wheat, soybeans, sesame seeds
```

---

## Step 5: Document Results

Take screenshots of:
1. Extension loaded in Chrome
2. Configuration popup
3. Console logs showing extracted data
4. Hover card with AI analysis

Fill in this quick report:

```
✅ Extension loaded successfully: YES / NO
✅ Product name extracted: _______________
✅ Ingredients found: ___/23
✅ Nutrition data accurate: YES / NO / PARTIAL
✅ AI analysis completed: YES / NO
✅ Safety Score: ___/100
✅ Health Score: ___/100
✅ Allergens detected: _______________
✅ Any errors: _______________
```

---

## ⚠️ Troubleshooting

**Extension won't load?**
- Make sure you selected the `dist/` folder, not the root folder
- Check `chrome://extensions/` for error messages

**No products detected?**
- Refresh the page
- Make sure you're on the exact meal URL (not search results)
- Check console for errors

**API key error?**
- Re-enter the key carefully (no extra spaces)
- Check OpenAI account has credits at platform.openai.com

**Hover card not appearing?**
- Make sure "Hover Cards" is checked in settings
- Try hovering over the meal image
- Check console for JavaScript errors

---

## 📚 Full Documentation

For detailed testing procedures, see:
- `docs/qa/MANUAL_TEST_GUIDE.md` - Complete test guide
- `docs/qa/TEST_REPORT_COOKUNITY_LIVE.md` - Test report template
- `docs/qa/IMPLEMENTATION_COMPLETE.md` - Implementation status

---

## 🎯 Success = These 5 Things Work:

1. ✅ Extension loads in Chrome without errors
2. ✅ CookUnity page is detected
3. ✅ Product data is extracted (see console)
4. ✅ AI analysis completes (see hover card)
5. ✅ Results match expected data (±10%)

---

**That's it! The extension is ready to test. Should take about 10 minutes total.**

For any issues, check the troubleshooting section above or the detailed docs.
