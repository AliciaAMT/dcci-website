# Version Management Guide

## 🎯 Overview

Your DCCI Ministries website now has centralized version management. The version number is stored in one place (`package.json`) and automatically propagated throughout the application.

## 📍 Version Sources

### Primary Source
- **`package.json`** - This is the single source of truth for version numbers
- **Current Version**: `0.0.1`

### Automatic Updates
- **`src/environments/environment.ts`** - Development environment
- **`src/environments/environment.prod.ts`** - Production environment

## 🔄 How It Works

1. **Version Update**: Change version in `package.json`
2. **Auto-Sync**: Run `npm run update-version` to sync all files
3. **Programmatic Access**: Use `VersionService` in components
4. **Display**: Version appears in footer automatically

## 🛠️ Usage Examples

### In Components
```typescript
import { VersionService } from '../services/version.service';

export class MyComponent {
  constructor(private versionService: VersionService) {}
  
  getVersion(): string {
    return this.versionService.getVersion(); // Returns "0.0.1"
  }
  
  getDisplayVersion(): string {
    return this.versionService.getDisplayVersion(); // Returns "v0.0.1"
  }
}
```

### In Templates
```html
<p>Current version: {{ versionService.getDisplayVersion() }}</p>
```

## 📝 Updating Versions

### Step 1: Update package.json
```json
{
  "version": "0.1.0"
}
```

### Step 2: Sync Environment Files
```bash
npm run update-version
```

### Step 3: Verify Changes
- Check `src/environments/environment.ts`
- Check `src/environments/environment.prod.ts`
- Version should now be `0.1.0` everywhere

## 🚀 Deployment Integration

The deployment scripts automatically update versions before building:

```bash
# This will:
# 1. Update version in environment files
# 2. Build production app
# 3. Deploy to Firebase
npm run deploy
```

## 📱 Current Display

Your "under construction" page now shows:
- **Copyright Year**: Automatically updates to current year
- **Expected Completion**: Automatically updates to current year + 1
- **Version Number**: Shows current app version (e.g., "v0.0.1")

## 🔍 Version Service Methods

```typescript
class VersionService {
  getVersion(): string           // "0.0.1"
  getDisplayVersion(): string    // "v0.0.1"
  getVersionInfo(): object       // { version: "0.0.1", production: true }
  isProduction(): boolean        // true/false
}
```

## 🎨 Styling

The version info in the footer has:
- Smaller font size (0.8rem)
- Reduced opacity (0.8)
- Centered alignment
- Icon integration

## 🚨 Important Notes

- **Never hardcode versions** in components or templates
- **Always use VersionService** to access version information
- **Update package.json first**, then run sync script
- **Version sync happens automatically** during deployment

## 🔧 Troubleshooting

### Version Not Updating
```bash
# Force version sync
npm run update-version

# Check if files were updated
grep -r "version:" src/environments/
```

### Build Errors
```bash
# Clean and rebuild
npm run lint
npm run build:prod
```

---

**Current Status**: ✅ Version management fully implemented and working! 
