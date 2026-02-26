# 🚀 Deployment Guide

This directory contains scripts and configuration for deploying the Syntropy Food Extension to production.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Chrome Web Store Deployment](#chrome-web-store-deployment)
- [Automated Deployment](#automated-deployment)
- [Manual Deployment](#manual-deployment)
- [Version Management](#version-management)
- [Monitoring](#monitoring)

## Prerequisites

### Required

- ✅ Node.js 18+
- ✅ npm or yarn
- ✅ Chrome Web Store Developer Account ($5 one-time fee)
- ✅ OpenAI API Key

### For Automated Deployment

- ✅ GitHub account (for CI/CD)
- ✅ Chrome Web Store API credentials
- ✅ Access to repository secrets

## Environment Variables

### Development

Copy `.env.example` to `.env` and configure:

```bash
cp ../.env.example ../.env
```

Required variables:
```bash
OPENAI_API_KEY=sk-...
```

### Production

Set these as repository secrets (GitHub Actions) or environment variables:

#### Required Secrets

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Chrome Web Store API
CHROME_WEBSTORE_CLIENT_ID=...
CHROME_WEBSTORE_CLIENT_SECRET=...
CHROME_WEBSTORE_REFRESH_TOKEN=...
CHROME_EXTENSION_ID=...
```

#### Optional Secrets

```bash
# Error Tracking
SENTRY_DSN=https://...

# Analytics
ANALYTICS_ID=...
```

## Chrome Web Store Deployment

### First-Time Setup

1. **Create Chrome Web Store Account**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay the $5 one-time developer fee

2. **Create Extension Listing**
   - Click "New Item"
   - Upload the `.zip` file from `dist/`
   - Fill in required information:
     - Name: Syntropy Food Insights
     - Description: AI-powered food analysis
     - Category: Productivity
     - Language: English
   - Add screenshots and promotional images
   - Set privacy policy URL

3. **Get API Credentials**

   a. Enable Chrome Web Store API:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project (or use existing)
   - Enable "Chrome Web Store API"

   b. Create OAuth 2.0 Credentials:
   - Go to "Credentials" in Google Cloud Console
   - Create "OAuth 2.0 Client ID"
   - Application type: Desktop app
   - Save Client ID and Client Secret

   c. Get Refresh Token:
   ```bash
   cd deployment
   ./get-refresh-token.sh
   ```
   Follow the prompts to authorize and get refresh token.

4. **Save Credentials**
   - Store credentials securely
   - Add to repository secrets (GitHub)
   - Never commit to version control

### Subsequent Deployments

Use automated deployment:

```bash
npm run deploy
```

Or manually upload via Chrome Web Store dashboard.

## Automated Deployment

### GitHub Actions

The repository includes a GitHub Actions workflow for automated deployment.

**File**: `.github/workflows/deploy.yml`

**Triggered by**:
- Pushing a tag matching `v*` (e.g., `v1.0.0`)
- Manual workflow dispatch

**Steps**:
1. Checkout code
2. Install dependencies
3. Run tests
4. Build production bundle
5. Create `.zip` package
6. Upload to Chrome Web Store
7. Create GitHub release

**To deploy**:

```bash
# Update version in package.json
npm version patch # or minor, major

# Push tag
git push --tags

# GitHub Actions will automatically deploy
```

### Manual Trigger

Go to GitHub Actions → Deploy workflow → Run workflow

## Manual Deployment

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Package extension
cd dist
zip -r ../syntropy-extension.zip .
cd ..
```

### Upload to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click on your extension
3. Click "Package" → "Upload new package"
4. Upload `syntropy-extension.zip`
5. Update version information
6. Submit for review

### Review Process

- **Automated review**: ~1 hour for minor updates
- **Manual review**: 1-3 days for new features
- **Rejection**: Fix issues and resubmit

## Version Management

### Semantic Versioning

Follow [SemVer](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backward compatible)
- **PATCH** (0.0.1): Bug fixes

### Update Version

```bash
# Patch (0.0.x)
npm version patch

# Minor (0.x.0)
npm version minor

# Major (x.0.0)
npm version major
```

This updates:
- `package.json` version
- `manifest.json` version
- Creates git tag

### Changelog

Update `CHANGELOG.md` before release:

```markdown
## [1.0.1] - 2024-01-15

### Added
- New CookUnity scraper features

### Fixed
- Hover card positioning bug
- API rate limiting issue

### Changed
- Improved caching strategy
```

## Monitoring

### Error Tracking

Set up Sentry for production error monitoring:

1. Create Sentry project
2. Add DSN to environment variables
3. Errors automatically reported

### Usage Analytics

Track extension usage:

```bash
# Enable analytics
ANALYTICS_ENABLED=true
ANALYTICS_ID=G-...
```

### API Usage Monitoring

Monitor OpenAI API costs:

- Check [OpenAI Usage Dashboard](https://platform.openai.com/usage)
- Set up billing alerts
- Monitor token consumption

### Health Checks

Regular checks:

- [ ] FDA API connectivity
- [ ] USDA API connectivity
- [ ] OpenAI API status
- [ ] Extension loading in Chrome
- [ ] User reviews on Chrome Web Store

## Rollback

If issues occur:

### Immediate Rollback

1. Go to Chrome Web Store dashboard
2. Unpublish current version
3. Upload previous version
4. Submit for expedited review

### Fix and Redeploy

1. Checkout previous version: `git checkout v1.0.0`
2. Build: `npm run build`
3. Package and upload
4. Fix issue in separate branch
5. Deploy fix as patch version

## Security

### Pre-Deployment Checklist

- [ ] No API keys in code
- [ ] All secrets in environment variables
- [ ] Updated dependencies (no vulnerabilities)
- [ ] Content Security Policy configured
- [ ] Permissions minimal and justified

### Security Scan

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix
```

## Testing Before Deployment

### Manual Testing

1. Load unpacked extension
2. Test on all supported sites
3. Verify all features work
4. Check console for errors
5. Test with different configurations

### Automated Testing

```bash
# Run test suite
npm test

# Run manual tests
# Open tests/manual-test-runner.html
```

### Smoke Test Script

```bash
cd deployment
./smoke-test.sh
```

## Support

### User Support

- GitHub Issues: Bug reports and feature requests
- Email: support@syntropyhealth.com
- Chrome Web Store: Reviews and ratings

### Developer Support

- Documentation: README.md, CONTRIB.md
- Discord: [Join our Discord](#)
- Email: dev@syntropyhealth.com

## Checklist Before Deploy

- [ ] Version bumped in package.json and manifest.json
- [ ] CHANGELOG.md updated
- [ ] Tests passing
- [ ] Manual testing complete
- [ ] Screenshots updated (if UI changed)
- [ ] Store listing updated (if needed)
- [ ] Secrets configured
- [ ] Rollback plan ready

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Upload Fails

- Check Chrome Web Store API credentials
- Verify extension ID
- Ensure manifest.json is valid
- Check file size < 100MB

### Review Rejected

Common reasons:
- Privacy policy missing or insufficient
- Permissions not justified
- User data handling unclear
- Functionality not clear from description

Fix issues and resubmit with detailed explanation.

---

For more information, see:
- [Chrome Web Store Developer Guide](https://developer.chrome.com/docs/webstore/)
- [Extension Distribution Guide](https://developer.chrome.com/docs/extensions/mv3/hosting/)
