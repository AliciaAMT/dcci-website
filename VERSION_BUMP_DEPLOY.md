# Version Bump + Deploy Script Guide

## 🚀 Quick Deploy Command

```bash
npm run vd
```

This single command will:
1. ✅ Bump the patch version (0.0.1 → 0.0.2)
2. ✅ Sync version to all environment files
3. ✅ Build the app with `ionic build --prod`
4. ✅ Deploy to Firebase

## 📦 What Each Script Does

### `npm run vd` - Complete Version + Deploy
- **Purpose**: One-command version bump, build, and deploy
- **Use Case**: When you want to release a new patch version
- **What Happens**: Version → Build → Deploy

### `npm run bump-version` - Version Bump Only
- **Purpose**: Just bump the patch version number
- **Use Case**: When you want to update version without deploying
- **What Happens**: Version bump + sync only

### `npm run update-version` - Sync Version Only
- **Purpose**: Sync existing version to environment files
- **Use Case**: When version is already updated in package.json
- **What Happens**: Sync only, no version change

## 🔢 Version Numbering

Your app uses **Semantic Versioning**:
- **Major.Minor.Patch** (e.g., 0.0.1)
- **Patch**: Bug fixes, small improvements (0.0.1 → 0.0.2)
- **Minor**: New features (0.0.1 → 0.1.0)
- **Major**: Breaking changes (0.0.1 → 1.0.0)

The `npm run vd` script only bumps the **patch** version.

## 🛠️ How It Works

### 1. Version Bump (`scripts/bump-version.js`)
```javascript
// Current: 0.0.1
// Bumps to: 0.0.2
versionParts[2] = versionParts[2] + 1;
```

### 2. Auto-Sync
- Updates `package.json`
- Updates `src/environments/environment.ts`
- Updates `src/environments/environment.prod.ts`

### 3. Build & Deploy
- Runs `ionic build --prod`
- Runs `firebase deploy`

## 📱 What Users See

After running `npm run vd`:
- **Footer Version**: Automatically shows "v0.0.2"
- **Build Output**: New version in production build
- **Live Site**: Updated version deployed to Firebase

## 🚦 Usage Examples

### Daily Development
```bash
# Make changes to your code
# Test locally with npm start
# When ready to deploy:
npm run vd
```

### Version Management
```bash
# Just bump version (no deploy)
npm run bump-version

# Just sync existing version
npm run update-version

# Complete version + deploy
npm run vd
```

## 🔍 Verification

After running `npm run vd`, verify:

1. **Version Updated**:
   ```bash
   grep "version" package.json
   grep "version" src/environments/*.ts
   ```

2. **Build Success**:
   - Check `www` folder exists
   - No build errors in console

3. **Deploy Success**:
   - Firebase deployment completes
   - Site accessible at your Firebase URL

## 🆘 Troubleshooting

### Version Bump Fails
```bash
# Check if scripts exist
ls scripts/

# Run manually
node scripts/bump-version.js
```

### Build Fails
```bash
# Check for errors
npm run lint
npm run build:prod
```

### Deploy Fails
```bash
# Check Firebase login
firebase login

# Check project
firebase use dcci-ministries
```

## 📋 Complete Workflow

```bash
# 1. Make your code changes
git add .
git commit -m "Add new feature"

# 2. Deploy with version bump
npm run vd

# 3. Verify deployment
# Check your Firebase URL

# 4. Commit version bump
git add .
git commit -m "Bump version to 0.0.2"
git push
```

## 🎯 Best Practices

1. **Always test locally** before running `npm run vd`
2. **Commit code changes** before version bump
3. **Use meaningful commit messages** for version bumps
4. **Verify deployment** after running the script
5. **Keep version history** in your git commits

## 🔄 Script Dependencies

The `npm run vd` script requires:
- ✅ `scripts/bump-version.js` - Version bumping
- ✅ `scripts/version-deploy.js` - Main orchestration
- ✅ `ionic` CLI - For building
- ✅ `firebase` CLI - For deployment
- ✅ Firebase project configured

---

**Ready to use?** Just run `npm run vd` and watch the magic happen! 🎉 