# Deployment Guide

This guide explains how to deploy your DCCI website to different environments using the automated deployment scripts.

## Quick Commands

### 🧪 Test Deploy (Staging)
```bash
npm run td
```

### 🚀 Live Deploy (Production)
```bash
npm run ld
```

## Available Deployment Methods

### 1. NPM Scripts (Recommended)

#### Test Deploy (Staging)
```bash
npm run td
```
- Builds using `test` configuration
- Deploys to `dcci-ministries-staging` Firebase project
- Safe for testing changes

#### Live Deploy (Production)
```bash
npm run ld
```
- Builds using `production` configuration  
- Deploys to `dcci-ministries` Firebase project
- Updates the live website

### 2. Direct Script Execution

#### Node.js Script
```bash
# Staging
node scripts/deploy.js staging

# Production
node scripts/deploy.js production
```

#### Windows Batch Files
```bash
# Staging
scripts\deploy-staging.bat

# Production  
scripts\deploy-production.bat
```

#### PowerShell Scripts
```powershell
# Staging
.\scripts\deploy-staging.ps1

# Production
.\scripts\deploy-production.ps1
```

### 3. Manual Commands

#### Staging Deployment
```bash
# Build for staging
ng build --configuration test

# Switch to staging Firebase project
firebase use dcci-ministries-staging

# Deploy
firebase deploy --only hosting
```

#### Production Deployment
```bash
# Build for production
ng build --configuration production

# Switch to production Firebase project
firebase use dcci-ministries

# Deploy
firebase deploy --only hosting
```

## What Each Deployment Does

### Test Deploy (`npm run td`)
1. **Builds** the app using `test` configuration
2. **Switches** to staging Firebase project (`dcci-ministries-staging`)
3. **Deploys** to staging hosting
4. **Result**: Your app is live at `https://dcci-ministries-staging.web.app`

### Live Deploy (`npm run ld`)
1. **Builds** the app using `production` configuration
2. **Switches** to production Firebase project (`dcci-ministries`)
3. **Deploys** to production hosting
4. **Result**: Your app is live at `https://dcci-ministries.web.app`

## Prerequisites

### 1. Firebase CLI
Make sure you have Firebase CLI installed:
```bash
npm install -g firebase-tools
```

### 2. Firebase Login
Login to Firebase:
```bash
firebase login
```

### 3. Firebase Project Access
Ensure you have access to both Firebase projects:
- `dcci-ministries` (production)
- `dcci-ministries-staging` (staging)

## Deployment Workflow

### Recommended Workflow

1. **Develop locally** with `npm run start:dev`
2. **Test on staging** with `npm run td`
3. **Verify staging** at `https://dcci-ministries-staging.web.app`
4. **Deploy to production** with `npm run ld` when ready
5. **Verify production** at `https://dcci-ministries.web.app`

### When to Use Each Environment

#### Development (`npm run start:dev`)
- Local development and testing
- Debugging and feature development
- Uses development Firebase project

#### Staging (`npm run td`)
- Pre-production testing
- Client review and approval
- Final testing before going live
- Uses staging Firebase project

#### Production (`npm run ld`)
- Live website updates
- After staging approval
- Production releases
- Uses production Firebase project

## Troubleshooting

### Common Issues

#### "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

#### "Build failed"
- Check for TypeScript errors
- Verify all dependencies are installed
- Check environment file configuration

#### "Firebase project switch failed"
- Verify you're logged into Firebase
- Check project ID spelling
- Ensure you have access to the project

#### "Deployment failed"
- Check Firebase project configuration
- Verify hosting is set up
- Check for build errors

### Getting Help

1. **Check build output** for specific error messages
2. **Verify Firebase project** configuration
3. **Check environment files** for correct Firebase settings
4. **Review deployment logs** in Firebase console

## Environment Configuration

### Staging Environment
- **File**: `src/environments/environment.test.ts`
- **Firebase Project**: `dcci-ministries-staging`
- **Production Flag**: `false`
- **Use Case**: Testing and validation

### Production Environment
- **File**: `src/environments/environment.prod.ts`
- **Firebase Project**: `dcci-ministries`
- **Production Flag**: `true`
- **Use Case**: Live website

## Security Notes

- **Never commit** real Firebase API keys to version control
- **Use environment variables** for sensitive configuration
- **Limit access** to production Firebase project
- **Test thoroughly** on staging before production deployment

## Automation

### CI/CD Integration
These scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Deploy to Staging
  run: npm run td

- name: Deploy to Production
  run: npm run ld
  if: github.ref == 'refs/heads/main'
```

### Scheduled Deployments
Use cron jobs or scheduled tasks for automated deployments:

```bash
# Daily staging deployment at 2 AM
0 2 * * * cd /path/to/project && npm run td
```

## Support

For deployment issues:
1. Check the troubleshooting section above
2. Review Firebase console logs
3. Verify environment configuration
4. Test with manual commands first 
