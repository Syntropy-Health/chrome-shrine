# 🚀 Deployment Readiness Checklist

Use this checklist before deploying to production.

## Pre-Deployment Checklist

### 1. Code Quality ✅

- [ ] All TypeScript types are valid (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code follows style guidelines (CONTRIB.md)
- [ ] All TODO comments addressed or tracked
- [ ] No console.log statements in production code
- [ ] Error handling implemented everywhere

### 2. Testing ✅

- [ ] Build verification passes (`./tests/verify-build.sh`)
- [ ] Manual tests completed ([TESTING.md](./TESTING.md))
- [ ] Tested on Amazon Fresh
- [ ] Tested on CookUnity
- [ ] Tested on generic food sites
- [ ] Hover cards work correctly
- [ ] AI analysis completes successfully
- [ ] Recall integration works
- [ ] No console errors on any test site

### 3. Security & Privacy ✅

- [ ] No API keys in source code
- [ ] Secrets in `.env` only (not committed)
- [ ] Content Security Policy configured
- [ ] Minimal permissions in manifest
- [ ] Privacy policy created and linked
- [ ] User data handling documented
- [ ] `npm audit` shows no critical issues

### 4. Configuration ✅

- [ ] Version bumped in `package.json`
- [ ] Version bumped in `manifest.json`
- [ ] CHANGELOG.md updated
- [ ] `.env.example` is up to date
- [ ] All environment variables documented
- [ ] Production secrets configured (if using CI/CD)

### 5. Build & Package 📦

- [ ] Clean build succeeds (`npm run build`)
- [ ] No build warnings or errors
- [ ] Bundle size < 100MB
- [ ] All required files in `dist/`
- [ ] manifest.json valid
- [ ] Icons present (16x16, 48x48, 128x128)

### 6. Documentation 📚

- [ ] README.md is current
- [ ] QUICKSTART.md tested
- [ ] CONTRIB.md guidelines followed
- [ ] TESTING.md procedures work
- [ ] API documentation complete
- [ ] Code comments comprehensive

### 7. Chrome Web Store Listing 🏪

- [ ] Extension name finalized
- [ ] Description written (132 chars max)
- [ ] Detailed description (16,000 chars max)
- [ ] Category selected
- [ ] Screenshots prepared (1280x800 or 640x400)
- [ ] Promotional images created
  - Small tile: 440x280
  - Marquee: 1400x560 (optional)
- [ ] Privacy policy URL set
- [ ] Support URL configured

### 8. First-Time Setup (New Extension) 🆕

- [ ] Chrome Web Store Developer account created ($5 fee)
- [ ] Extension listing created
- [ ] OAuth 2.0 credentials obtained
- [ ] Refresh token generated
- [ ] Extension ID saved

### 9. Deployment Secrets 🔐

Required secrets configured:

- [ ] `OPENAI_API_KEY`
- [ ] `CHROME_WEBSTORE_CLIENT_ID`
- [ ] `CHROME_WEBSTORE_CLIENT_SECRET`
- [ ] `CHROME_WEBSTORE_REFRESH_TOKEN`
- [ ] `CHROME_EXTENSION_ID`

Optional secrets:

- [ ] `SENTRY_DSN` (error tracking)
- [ ] `ANALYTICS_ID` (usage analytics)

### 10. CI/CD Setup ⚙️

- [ ] GitHub Actions workflows in place
- [ ] All secrets added to repository
- [ ] Test workflow runs successfully
- [ ] Deploy workflow configured
- [ ] Branch protection rules set

## Deployment Methods

### Method 1: Automated (Recommended)

```bash
# 1. Update version
npm version patch  # or minor, major

# 2. Push tag
git push --tags

# 3. GitHub Actions automatically deploys
```

### Method 2: Script

```bash
# Run deployment script
cd deployment
./deploy.sh
```

### Method 3: Manual

```bash
# 1. Build and package
cd deployment
./package.sh

# 2. Upload to Chrome Web Store Dashboard
# Go to: https://chrome.google.com/webstore/devconsole
```

## Post-Deployment Checklist

### Immediate Verification (< 1 hour)

- [ ] Extension appears in Chrome Web Store
- [ ] Install from store works
- [ ] Basic functionality works after install
- [ ] No critical errors in reviews
- [ ] Monitoring shows no errors

### Short-Term Monitoring (24 hours)

- [ ] Check user reviews
- [ ] Monitor error reports (Sentry)
- [ ] Check API usage (OpenAI dashboard)
- [ ] Verify recall data updates
- [ ] Performance metrics acceptable

### Long-Term Health (1 week)

- [ ] User retention metrics
- [ ] Feature usage analytics
- [ ] Cost analysis (API usage)
- [ ] User feedback review
- [ ] Plan next iteration

## Rollback Plan

If critical issues occur:

1. **Immediate**: Unpublish from Chrome Web Store
2. **Restore**: Upload previous working version
3. **Fix**: Create hotfix branch
4. **Test**: Thorough testing of fix
5. **Redeploy**: Follow deployment checklist

## Emergency Contacts

- **Technical Issues**: dev@syntropyhealth.com
- **Chrome Web Store**: Use developer dashboard
- **User Support**: support@syntropyhealth.com

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0.0 | TBD | Planned | Initial release |

## Monitoring URLs

After deployment, monitor:

- Chrome Web Store: `https://chrome.google.com/webstore/detail/[EXTENSION_ID]`
- Developer Dashboard: `https://chrome.google.com/webstore/devconsole`
- OpenAI Usage: `https://platform.openai.com/usage`
- Error Tracking: `[SENTRY_URL]` (if configured)
- Analytics: `[ANALYTICS_URL]` (if configured)

## Support Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Community questions
- **Email**: support@syntropyhealth.com
- **Documentation**: README.md, TESTING.md, CONTRIB.md

---

## Pre-Flight Check

Run this before deployment:

```bash
# Clean install
rm -rf node_modules dist
npm install

# Build
npm run build

# Verify
./tests/verify-build.sh

# Package
cd deployment
./package.sh
```

Expected output:
```
✅ All checks passed!
Extension is ready to load in Chrome!
```

## Final Sign-Off

- [ ] All checklist items complete
- [ ] Team review completed
- [ ] User acceptance testing done
- [ ] Risk assessment reviewed
- [ ] Rollback plan prepared
- [ ] Deployment approved

**Approved by**: ___________________

**Date**: ___________________

**Version**: ___________________

---

**Ready to Deploy?** ✅

If all boxes are checked, proceed with deployment!

Good luck! 🚀
