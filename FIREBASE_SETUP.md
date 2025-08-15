# Firebase Setup & Deployment Guide

## 🚀 Quick Start

Your DCCI Ministries website is now configured for Firebase deployment! Here's what you need to do:

## 1. Firebase Login (First Time Only)

Open a terminal in your project directory and run:

```bash
firebase login
```

This will open a browser window for you to authenticate with your Google account.

## 2. Verify Project Configuration

Check that your project is correctly configured:

```bash
firebase use dcci-ministries
```

## 3. Deploy Your Website

### Option A: Use the Scripts (Recommended)
```bash
# Windows Command Prompt
deploy.bat

# Windows PowerShell
.\deploy.ps1

# Or manually
npm run deploy
```

### Option B: Manual Deployment
```bash
# Build the production version
npm run build:prod

# Deploy to Firebase
firebase deploy --only hosting
```

## 🎯 What You Get

- **Live Website**: Available at `https://dcci-ministries.web.app`
- **Custom Domain**: Can be configured in Firebase Console
- **Automatic HTTPS**: SSL certificate included
- **Global CDN**: Fast loading worldwide
- **Automatic Deployments**: Every time you run the deploy command

## 🔧 Configuration Files Created

- `firebase.json` - Firebase hosting configuration
- `.firebaserc` - Project selection
- `src/app/firebase.config.ts` - Firebase initialization
- `deploy.bat` & `deploy.ps1` - Deployment scripts

## 📱 Your Under Construction Page

Your beautiful "under construction" page includes:
- DCCI Ministries branding
- Professional design
- Social media links
- Wayback Machine archive access
- Contact information
- Expected completion timeline

## 🚦 Deployment Status

- ✅ Angular build configuration
- ✅ Firebase hosting setup
- ✅ Production build working
- ✅ Deployment scripts ready
- 🔄 Ready for Firebase login and deployment

## 🆘 Troubleshooting

### Build Issues
```bash
npm install
npm run lint
npm run build:prod
```

### Firebase Issues
```bash
# Check if logged in
firebase login:ci

# Check project status
firebase projects:list

# Switch projects
firebase use dcci-ministries
```

### Common Errors
- **"Not logged in"**: Run `firebase login`
- **"Project not found"**: Run `firebase use dcci-ministries`
- **"Build failed"**: Check for TypeScript errors with `npm run lint`

## 🌐 Next Steps After Deployment

1. **Custom Domain**: Set up `dcciministries.com` in Firebase Console
2. **Analytics**: Enable Firebase Analytics in the console
3. **Database**: Set up Firestore when you're ready
4. **Authentication**: Add user login when needed
5. **Content**: Replace "under construction" with your full website

## 📞 Support

If you encounter issues:
1. Check the Firebase Console: https://console.firebase.google.com
2. Verify your project: `dcci-ministries`
3. Check build output in the `www` folder
4. Review the `DEPLOYMENT.md` file for detailed steps

---

**Ready to deploy?** Just run `firebase login` and then `npm run deploy`! 🎉 
