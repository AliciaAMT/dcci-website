# DCCI Ministries - Project Notes & Metadata

## 🚨 Critical Information for Future Developers

### 📅 Project Status
- **Project**: DCCI Ministries Website
- **Status**: Under Construction (Phase 1)
- **Expected Completion**: 2026
- **Last Updated**: December 2025

### 🔧 Technology Stack
- **Node.js**: 20.x (see .nvmrc)
- **Angular**: 20.0.0
- **Ionic**: 8.7.2
- **Firebase**: 12.1.0
- **Ionicons**: 7.4.0

### 🚨 What Broke with Node 22
**Issue**: Ionicons stopped loading with error "Failed to construct 'URL': Invalid base URL"

**Root Cause**: Node 22 changed how `import.meta.url` and URL resolution works, breaking StencilJS (which powers Ionic icons).

**Symptoms**:
- Console errors: "Could not load icon with name 'home-outline'"
- TypeError: "Failed to construct 'URL': Invalid base URL"
- Icons appear as empty squares or don't render

### ✅ What We Fixed
1. **Added `setAssetPath(document.baseURI)`** in main.ts
2. **Copied Ionicons SVGs** to build output via angular.json
3. **Created automated setup script** (scripts/setup-ionicons.js)
4. **Added postinstall script** to package.json

### 🛠️ How the Asset Copy Script Works
The `scripts/setup-ionicons.js` script:
- Copies all SVG files from `node_modules/ionicons/dist/svg`
- Places them in `src/assets/svg`
- Runs automatically after `npm install` (postinstall script)
- Ensures icons are available at runtime

### 🔍 Why This Approach Works
- **Explicit asset path**: `setAssetPath(document.baseURI)` tells Stencil where to find icons
- **Local SVG copies**: Icons are copied to your project, not loaded from node_modules
- **Future-proof**: Works regardless of Node.js version changes
- **Automated**: No manual steps needed after initial setup

### 📁 Key Files Modified
- `src/main.ts` - Added setAssetPath
- `angular.json` - Added SVG asset copying
- `package.json` - Added postinstall script
- `scripts/setup-ionicons.js` - Automated setup script
- `.nvmrc` - Locked Node version to 20.x

### 🚀 Next Development Phase
After Phase 1 (Under Construction page):
1. Build basic website structure
2. Test Quill editor integration
3. Import Wayback Machine data
4. Implement YouTube video automation
5. Launch and optimize

### 💡 For Future Developers
- **Always use Node 20.x** (see .nvmrc)
- **Don't remove the setAssetPath code** - it's essential
- **Icons work automatically** - no need for addIcons() or manual registration
- **Check this file first** if icons stop working

### 🔗 Related Documentation
- `/docs/` - Comprehensive project documentation
- `/docs/breaking-changes-gotchas.md` - All breaking changes
- `/docs/future-proofing-node22.md` - Long-term maintenance guide

---

*This file should be updated whenever major changes are made to the project setup or when new gotchas are discovered.* 
