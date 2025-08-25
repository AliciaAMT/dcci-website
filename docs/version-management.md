# Version Management

This document explains how to manage versions and deploy the DCCI website using the automated scripts.

## Available Scripts

### Version Bump + Deploy Scripts

| Script | Command | Purpose | Version Bump | Deploy Target |
|--------|---------|---------|--------------|---------------|
| **vs** | `npm run vs` | Staging deployment with patch bump | `1.2.3` → `1.2.4` | Staging |
| **vd** | `npm run vd` | Production deployment with patch bump | `1.2.3` → `1.2.4` | Production (Live) |
| **fvd** | `npm run fvd` | Production deployment with feature bump | `1.2.3` → `1.3.0` | Production (Live) |
| **mvd** | `npm run mvd` | Production deployment with major bump | `1.2.3` → `2.0.0` | Production (Live) |

### What Each Script Does

1. **Reads current version** from `package.json`
2. **Bumps version** according to the script type:
   - **Patch** (`vs`, `vd`): `1.2.3` → `1.2.4` (bug fixes, small changes)
   - **Feature** (`fvd`): `1.2.3` → `1.3.0` (new features, minor changes)
   - **Major** (`mvd`): `1.2.3` → `2.0.0` (breaking changes, major updates)
3. **Updates all environment files** with the new version
4. **Builds the project** for the target environment
5. **Deploys to Firebase** (staging or production)
6. **Rolls back** version if deployment fails

### When to Use Each Script

- **`npm run vs`**: Testing new features on staging before going live
- **`npm run vd`**: Deploying bug fixes and small updates to production
- **`npm run fvd`**: Deploying new features to production
- **`npm run mvd`**: Deploying major updates or breaking changes to production

### Safety Features

- **User confirmation** required before proceeding
- **Automatic rollback** if deployment fails
- **Clear feedback** on what will happen
- **Error handling** with detailed error messages

### Example Usage

```bash
# Deploy a bug fix to production
npm run vd

# Deploy a new feature to production
npm run fvd

# Deploy a major update to production
npm run mvd

# Test on staging first
npm run vs
```

### Version Display

The version number is automatically displayed in the website footer, making it easy for users and support staff to identify which version they're using.

### Manual Version Updates

If you need to update versions without deploying, you can use:

```bash
npm run update-version
```

This will read the version from `package.json` and update all environment files without building or deploying. 
