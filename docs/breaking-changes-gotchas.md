# Breaking Changes & Gotchas Guide

## Overview
This document covers the breaking changes and "gotcha" issues you should watch for when using this tech stack:

- **Angular + Ionic**
- **Standalone components**
- **Node 22+**
- **Firebase + Vite + Web Components + Cursor**

## 🔥 Node 22+ Breaking Changes

### ⚠️ 1. import.meta.url and URL() resolution stricter
**Issue:** `new URL('some-path.svg', import.meta.url)` fails unless the base is valid.

**Who it breaks:** StencilJS (used by Ionicons), Web Components, some SSR cases.

**✅ Fix:** Always use `setAssetPath(document.baseURI)` when relying on assets in Ionic/Stencils.

## ⚠️ Angular 17+ Standalone / Vite Changes

### ⚠️ 2. IonicModule doesn't auto-provide icon paths in standalone
**Issue:** `<ion-icon>` doesn't work without manually setting `setAssetPath()` and copying SVGs.

**✅ Fix:** See the fix implemented in this project:
```typescript
// In main.ts
import { setAssetPath } from '@stencil/core';
setAssetPath(document.baseURI);

// In angular.json - copy SVG assets
{
  "glob": "**/*.svg",
  "input": "./node_modules/ionicons/dist/svg",
  "output": "/svg"
}
```

### ⚠️ 3. Angular 17 dropped ɵrenderComponent from dev builds
**Who it affects:** Anyone using dynamic or experimental bootstrapping (e.g. custom elements, microfrontends).

**✅ Fix:** Use `bootstrapApplication()` or `renderComponent` officially.

## ⚠️ Ionic 7+ Changes

### ⚠️ 4. Ionic no longer assumes default mode or animation settings
**Issue:** Standalone apps don't get `setupIonicAngular()` features automatically.

**✅ Fix:** Add to main.ts:
```typescript
import { setupIonicAngular } from '@ionic/angular';
setupIonicAngular();
```

## ⚠️ Firebase + Angular + Vite Issues

### ⚠️ 5. Firebase SDK v10+ ESM-only
**Issue:** Old require-based imports (like in older AngularFire or Node) break.

**✅ Fix:** Use:
```typescript
import { initializeApp } from 'firebase/app';
```

### ⚠️ 6. Firestore import path changed
**Before:**
```typescript
import firebase from 'firebase/app';
import 'firebase/firestore';
```

**Now:**
```typescript
import { getFirestore } from 'firebase/firestore';
```

### ⚠️ 7. Vite asset handling broke some Firebase features
E.g., Firebase Auth UI, emulators, etc.

**✅ Fix:** Use vite-plugin-copy or ensure public/ folder includes all Firebase configs needed (e.g. firebase.json, service worker manifest).

## ⚠️ Cursor & GPT-4o Behavior Shifts

### ⚠️ 8. Cursor switched to 4o around July/Aug 2025
**Issue:** Infinite loops, less reliable code changes, guessing at missing context

**✅ Fix:** Be ultra-specific in prompts. Include:
- Framework
- What broke
- What not to do (e.g. "don't use addIcons")

### ⚠️ 9. Cursor prompt structure changed
It's trying to "helpfully reason" through ambiguous cases instead of solving directly.

This leads to it stalling out when you already know what you want.

## 🧪 Other Watch Points

### ⚠️ 10. @angular/fire v7+ tree-shakes features
Don't import the whole module. You must import features individually or they won't be available.

**✅ Fix:**
```typescript
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
```

### ⚠️ 11. Angular SSR + Vite + document access
**Issue:** Code using `document`, `window`, or `localStorage` outside of effects or lifecycle hooks throws during SSR or build.

**✅ Fix:** Always gate with `isPlatformBrowser(this.platformId)` or lazy-load inside `onInit()`.

## ✅ RECOMMENDED: Version Pinning

For maximum stability, lock in versions:

```json
"dependencies": {
  "@angular/core": "17.2.x",
  "@ionic/angular": "7.6.x",
  "ionicons": "7.2.x",
  "firebase": "10.7.x",
  "@angular/fire": "7.7.x"
}
```

Also:

```bash
nvm install 20
nvm use 20
echo "20" > .nvmrc
```

## 🎯 Current Project Status

This project has implemented the following fixes:
- ✅ `setAssetPath(document.baseURI)` in main.ts
- ✅ Ionicons SVG assets copied to build output
- ✅ Node version locked to 20.x
- ✅ Using `bootstrapApplication()` instead of deprecated methods
- ✅ Individual Firebase feature imports

## 🚨 Common Issues to Watch For

1. **Icon loading failures** - Check if `setAssetPath()` is called before `bootstrapApplication()`
2. **Build failures** - Ensure Node version is 20.x, not 22+
3. **Firebase import errors** - Use ESM imports, not require()
4. **Vite asset issues** - Verify SVG files are copied to build output
5. **Cursor infinite loops** - Be specific about what you want and what not to do

## 📚 Related Documentation

- [Development Setup](./development-setup.md)
- [Technical Architecture](./technical-architecture.md)
- [Troubleshooting](./troubleshooting.md)
- [Emergency Procedures](./emergency-procedures.md) 
