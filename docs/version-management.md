# Version Management System

This document explains how the version management system works in the DCCI website project.

## Overview

The version number is now automatically displayed in the footer and can be easily updated across all environments. The system uses environment variables to store version information, making it easy to maintain and deploy different versions.

## How It Works

### 1. Version Service (`src/app/services/version.service.ts`)

The `VersionService` provides methods to retrieve version information:

- `getVersion()`: Returns the current version string
- `getFullVersionInfo()`: Returns version with environment info (e.g., "v0.0.1 (Development)")

### 2. Environment Configuration

Each environment file contains a `version` property:

```typescript
export const environment = {
  production: false,
  version: '0.0.1',  // ← This gets updated automatically
  firebase: { ... },
  disqusShortname: "..."
};
```

### 3. Footer Display

The footer automatically displays the current version:

```html
<p class="version-info">
  <ion-icon name="information-circle-outline"></ion-icon>
  Version: {{ version }}  <!-- ← Dynamically bound -->
</p>
```

## Updating Versions

### Automatic Method (Recommended)

1. **Update version in `package.json`:**
   ```json
   {
     "version": "0.0.2"
   }
   ```

2. **Run the update script:**
   ```bash
   npm run update-version
   ```

3. **The script will automatically update all environment files**

### Manual Method

If you prefer to update manually, edit the `version` property in each environment file:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`
- `src/environments/environment.test.ts`
- `src/environments/environment.prod.test.ts`
- `src/environments/environment.example.ts`

## Available Scripts

### `npm run update-version`

Updates the version number in all environment files based on `package.json`.

### `npm run vs` (Version + Staging)

Bumps the version number and deploys to staging environment.

### `npm run vd` (Version + Deploy)

Bumps the version number and deploys to production environment.

**What it does:**
1. **Bumps patch version** (e.g., 0.0.1 → 0.0.2)
2. **Updates package.json** with new version
3. **Updates all environment files** automatically
4. **Deploys to production** using `npm run ld`
5. **Shows confirmation** before proceeding
6. **Rolls back** if deployment fails

**Example usage:**
```bash
npm run vd
```

**Example output:**
```
🚀 Version Bump + Deploy to PRODUCTION
📦 Current version: 0.0.1
📦 New version: 0.0.2

⚠️  This will:
   1. Bump version from 0.0.1 to 0.0.2
   2. Update all environment files
   3. Deploy to PRODUCTION

Press Enter to continue or Ctrl+C to cancel...

🔄 Starting version bump and deployment...
✅ Updated package.json to version 0.0.2
🔄 Updating environment files...
✅ Updated src/environments/environment.ts
✅ Updated src/environments/environment.prod.ts
✅ Updated src/environments/environment.test.ts
✅ Updated src/environments/environment.prod.test.ts
✅ Updated src/environments/environment.example.ts
🚀 Deploying to production...
[deployment output...]

🎉 SUCCESS!
✅ Version bumped to 0.0.2
✅ Deployed to PRODUCTION
📱 Users will now see Version: 0.0.2 in the footer
```

### `npm run vs` (Version + Staging)

Bumps the version number and deploys to staging environment.

**What it does:**
1. **Bumps patch version** (e.g., 0.0.1 → 0.0.2)
2. **Updates package.json** with new version
3. **Updates all environment files** automatically
4. **Deploys to staging** using `npm run td`
5. **Shows confirmation** before proceeding
6. **Rolls back** if deployment fails

**Example usage:**
```bash
npm run vs
```

**What it does:**
- Reads current version from `package.json`
- Updates all environment files
- Provides feedback on success/failure
- Shows current version information

**Example output:**
```
🔄 Updating version to 0.0.2 in all environment files...
✅ Updated src/environments/environment.ts
✅ Updated src/environments/environment.prod.ts
✅ Updated src/environments/environment.test.ts
✅ Updated src/environments/environment.prod.test.ts
✅ Updated src/environments/environment.example.ts

🎉 Version update complete!
✅ Successfully updated 5/5 files
📦 Current version: 0.0.2
```

## Version Display

### Current Format

The footer displays: `Version: 0.0.1`

### Enhanced Format (Available)

You can also use `getFullVersionInfo()` for more detailed information:

```typescript
// In your component
this.fullVersion = this.versionService.getFullVersionInfo();
// Returns: "v0.0.1 (Development)" or "v0.0.1 (Production)"
```

## Benefits

1. **✅ No Hard-coding**: Version is always up-to-date
2. **✅ Easy Updates**: Single command updates all environments
3. **✅ Environment Aware**: Shows different versions per environment
4. **✅ Support Friendly**: Users can easily identify their version
5. **✅ Consistent**: All environments stay in sync
6. **✅ Automated**: Reduces human error in version management

## Troubleshooting

### Version Not Updating

1. **Check package.json**: Ensure version is correct
2. **Run update script**: `npm run update-version`
3. **Check environment files**: Verify version property exists
4. **Rebuild**: Run `ng build` to see changes

### Build Errors

1. **Check imports**: Ensure `VersionService` is imported
2. **Check environment**: Verify environment files have version property
3. **Check component**: Ensure version is properly bound in template

## Future Enhancements

Potential improvements to consider:

1. **Build-time version injection**: Inject version during build process
2. **Git integration**: Auto-version based on git tags
3. **Deployment tracking**: Track which version is deployed where
4. **Version history**: Display version change log

## Example Workflow

```bash
# 1. Update version in package.json
# 2. Update all environments
npm run update-version

# 3. Test the build
ng build --configuration development

# 4. Deploy to staging
npm run td

# 5. Test staging deployment
# 6. Deploy to production
npm run ld
```

This system ensures that your version information is always accurate and makes it easy to provide support to users by identifying exactly which version they're running. 