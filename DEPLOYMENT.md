# Firebase Deployment Guide

This guide will help you deploy your DCCI Ministries website to Firebase Hosting.

## Prerequisites

1. **Firebase CLI**: You already have `firebase-tools` installed
2. **Firebase Project**: Your project is already configured for `dcci-ministries`
3. **Environment Files**: Firebase configuration is already set up

## Quick Deployment

### Option 1: Deploy Everything
```bash
npm run deploy
```

### Option 2: Deploy Only Hosting
```bash
npm run deploy:hosting
```

## Manual Deployment Steps

### 1. Build the Production App
```bash
npm run build:prod
```

### 2. Deploy to Firebase
```bash
firebase deploy
```

### 3. Deploy Only Hosting (if you have other Firebase services)
```bash
firebase deploy --only hosting
```

## What Gets Deployed

- **Build Output**: The `www` folder (Angular production build)
- **Configuration**: Firebase hosting rules from `firebase.json`
- **Routing**: All routes redirect to `index.html` for Angular routing

## Firebase Configuration

Your Firebase project is configured with:
- **Project ID**: `dcci-ministries`
- **Hosting**: Serves from the `www` directory
- **Routing**: All routes serve `index.html` for Angular routing
- **Caching**: Optimized caching for static assets

## Troubleshooting

### Build Issues
- Ensure all dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run lint`

### Deployment Issues
- Verify Firebase login: `firebase login`
- Check project selection: `firebase use dcci-ministries`
- Verify build output exists in `www` folder

### Access Issues
- Your site will be available at: `https://dcci-ministries.web.app`
- Custom domain can be configured in Firebase Console

## Next Steps

Once deployed, you can:
1. Set up a custom domain in Firebase Console
2. Configure Firebase Analytics
3. Set up Firestore database
4. Add authentication features

## Useful Commands

```bash
# Check Firebase project status
firebase projects:list

# Switch Firebase project
firebase use dcci-ministries

# View deployment history
firebase hosting:channel:list

# Test locally before deployment
firebase serve
``` 
