# Manual Testing Guide - Syntropy Food Extension

## Test Environment Setup

### Prerequisites
- Google Chrome browser (latest version)
- OpenAI API key configured
- Built extension in `dist/` directory

### Extension Installation

1. **Build the Extension**
   ```bash
   cd /home/mo/projects/SyntropyHealth/apps/chrome-dieton
   npm run build
   ```

2. **Load Extension in Chrome**
   - Open Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `dist/` folder from the project directory
   - Extension should now appear in your extensions list

3. **Configure API Key**
   - Click on the Syntropy extension icon in Chrome toolbar
   - Popup window will appear
   - Enter your OpenAI API key in the "API Key" field:
     ```
     sk-proj-YOUR_OPENAI_API_KEY_HERE
     ```
   - Select model: `gpt-4-vision-preview`
   - Enable features:
     - ✅ Hover Cards
     - ✅ Safety Alerts
     - ✅ Ingredient Analysis
   - Click "Save Configuration"
   - Wait for confirmation message

## Test Case 1: CookUnity Meal Page Analysis

### Test URL
https://www.cookunity.com/meals/sea-choi-grilled-beef-bulgogi

### Expected Behavior

1. **Page Detection**
   - Extension should automatically detect CookUnity as a supported food page
   - Console should log: `[Syntropy] Food page detected`
   - Extension icon may show badge or indicator

2. **Product Extraction**
   - Extension should extract meal information:
     - **Name**: "Grilled Beef Bulgogi" (or similar)
     - **Chef**: "Sea Choi" (or chef name)
     - **Ingredients**: Full ingredient list
     - **Nutrition Facts**: Calories, Protein, Carbs, Fat

3. **Expected Data Extraction**

   Based on the page, the extension should extract approximately:

   ```
   Nutritional Facts:
   - Protein: 40g
   - Carbs: 63g
   - Calories: 740kcal
   - Fat: 36g

   Ingredients:
   - Sesame Oil
   - Canola and Olive Oil Blend
   - Turmeric
   - Butter
   - Sake
   - Black Pepper
   - Garlic
   - Sour Cream
   - Sugar
   - Onion
   - Basmati Rice
   - Light Soy Sauce
   - Kosher Salt
   - Beef Chuck
   - Green Beans
   - Green Peas
   - Carrots
   - Chicken Base
   - Pineapple Juice
   - Lemon Juice
   - Rice Wine
   - Whole Milk
   - Italian Parsley

   Allergens:
   - Contains milk
   - Contains cereals containing gluten
   - Contains wheat
   - Contains soybeans
   - Contains sesame seeds
   ```

4. **Hover Card Interaction**
   - Hover over the meal card or image
   - Hover card should appear within 500ms
   - Card should display:
     - Product name
     - Loading indicator initially
     - AI analysis after a few seconds:
       - Safety score (0-100)
       - Health score (0-100)
       - Brief summary
       - Key insights (3-5 bullet points)

5. **AI Analysis Content**

   The AI should provide analysis covering:
   - **Safety Assessment**: Evaluation of ingredients, processing, additives
   - **Health Assessment**: Nutritional balance, ingredient quality
   - **Allergen Warnings**: Identification of allergens (milk, gluten, soy, sesame)
   - **Insights**: Key points about the meal
   - **Recommendations**: Personalized suggestions

### Test Steps

1. **Navigate to Test Page**
   ```
   https://www.cookunity.com/meals/sea-choi-grilled-beef-bulgogi
   ```

2. **Open Developer Console**
   - Press `F12` or `Ctrl+Shift+I`
   - Switch to "Console" tab
   - Look for Syntropy logs

3. **Verify Page Detection**
   - Check console for: `[Syntropy] Content script initializing...`
   - Check console for: `[Syntropy] Food page detected`
   - Check console for product count: `[Syntropy] Initialized with X products`

4. **Inspect Extracted Data**
   - In console, type:
     ```javascript
     chrome.runtime.sendMessage({type: 'GET_PRODUCTS'}, (response) => {
       console.log('Products:', response.data);
     });
     ```
   - Verify extracted data matches expected values

5. **Test Hover Card**
   - Hover mouse over meal image or card
   - Observe hover card appearance
   - Verify loading state
   - Wait for AI analysis to load
   - Verify analysis content

6. **Test AI Analysis** - Click extension icon to open popup
   - Check "Current Page" stats:
     - Products Found: Should show 1
     - Active Recalls: Should show count
   - Click "Refresh Analysis" button
   - Observe loading and results

### Success Criteria

✅ Extension loads without errors
✅ CookUnity page is detected as food page
✅ Product information is extracted correctly:
  - Name matches
  - Ingredients list is comprehensive (20+ items)
  - Nutrition facts are accurate (±10% tolerance)
  - Allergens are identified
✅ Hover card appears and functions properly
✅ AI analysis completes without errors
✅ Analysis provides relevant insights
✅ Performance is acceptable (analysis < 5 seconds)

### Common Issues & Troubleshooting

#### Issue: Extension not loading
- **Solution**: Check Chrome extensions page, ensure extension is enabled
- **Solution**: Check console for errors, rebuild extension if needed

#### Issue: API key not working
- **Solution**: Verify API key is correct and has credits
- **Solution**: Re-save configuration in popup
- **Solution**: Check network tab for 401 errors

#### Issue: No products detected
- **Solution**: Refresh the page
- **Solution**: Check if page structure has changed
- **Solution**: Verify CookUnity scraper selectors

#### Issue: Hover card not appearing
- **Solution**: Check feature is enabled in settings
- **Solution**: Try hovering over different elements
- **Solution**: Check console for JavaScript errors

#### Issue: AI analysis fails
- **Solution**: Verify API key and model configuration
- **Solution**: Check network requests for errors
- **Solution**: Reduce product complexity (test with simpler page)

## Test Case 2: Error Handling

### Test Steps

1. **Invalid API Key**
   - Set API key to invalid value: `sk-invalid-key`
   - Navigate to CookUnity page
   - Verify graceful error handling
   - Verify error message appears

2. **Network Timeout**
   - Open DevTools > Network tab
   - Enable network throttling (Slow 3G)
   - Trigger analysis
   - Verify timeout handling

3. **Unsupported Page**
   - Navigate to non-food website (e.g., google.com)
   - Verify extension doesn't activate
   - Verify no errors in console

## Test Case 3: Performance Testing

### Metrics to Track

1. **Page Load Impact**
   - Measure page load time with/without extension
   - Should add < 200ms overhead

2. **Analysis Speed**
   - Time from hover to analysis display
   - Target: < 3 seconds for quick analysis
   - Target: < 10 seconds for full analysis

3. **Memory Usage**
   - Monitor Chrome task manager
   - Extension should use < 50MB RAM

4. **CPU Usage**
   - Monitor during analysis
   - Should not peg CPU

## Test Results Template

```markdown
## Test Execution: [Date/Time]

### Environment
- Chrome Version:
- Extension Version: 1.0.0
- OpenAI Model: gpt-4-vision-preview
- Test URL: https://www.cookunity.com/meals/sea-choi-grilled-beef-bulgogi

### Results

#### Product Extraction
- [ ] Product name extracted correctly
- [ ] Ingredients extracted (count: X)
- [ ] Nutrition facts extracted
- [ ] Allergens identified

#### Data Accuracy
- Protein: Extracted X vs Expected 40g
- Carbs: Extracted X vs Expected 63g
- Calories: Extracted X vs Expected 740kcal
- Fat: Extracted X vs Expected 36g

#### Functionality
- [ ] Hover card works
- [ ] AI analysis completes
- [ ] Insights are relevant
- [ ] Performance acceptable

#### Issues Found
1. [Issue description]
2. [Issue description]

#### Screenshots
[Attach screenshots]

### Conclusion
[Pass/Fail with notes]
```

## Debugging Tips

1. **Enable Debug Logging**
   - Set `DEBUG=true` in .env
   - Rebuild extension
   - More detailed logs in console

2. **Inspect Network Requests**
   - Open DevTools > Network
   - Filter by "openai"
   - Check request/response payloads

3. **Check Extension Background Page**
   - Go to `chrome://extensions/`
   - Click "Service worker" under extension
   - View background script console

4. **Inspect Storage**
   ```javascript
   chrome.storage.sync.get(null, (items) => {
     console.log('Storage:', items);
   });
   ```

5. **Monitor Events**
   ```javascript
   // Add to console
   window.addEventListener('message', (e) => {
     console.log('Message:', e.data);
   });
   ```

## Reporting Issues

When reporting issues, include:
1. Chrome version
2. Extension version
3. Test URL
4. Steps to reproduce
5. Console logs
6. Screenshots
7. Network request logs
8. Expected vs actual behavior

## Next Steps After Testing

1. Document all test results
2. Create bug tickets for issues
3. Verify fixes
4. Perform regression testing
5. Update test cases based on findings
