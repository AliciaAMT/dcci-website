# Version Management

This document explains how to manage versions and deploy the DCCI website using the automated scripts.

## Available Scripts

### Version Bump + Deploy Scripts

| Script | Command | Purpose | Version Bump | Deploy Target |
|--------|---------|---------|--------------|---------------|
| **vs** | `npm run vs` | Staging **full-stack** deploy with patch bump | `1.2.3` → `1.2.4` | Staging |
| **vd** | `npm run vd` | Production **full-stack** deploy with patch bump | `1.2.3` → `1.2.4` | Production (Live) |
| **fvd** | `npm run fvd` | Production **full-stack** deploy with feature bump | `1.2.3` → `1.3.0` | Production (Live) |
| **mvd** | `npm run mvd` | Production **full-stack** deploy with major bump | `1.2.3` → `2.0.0` | Production (Live) |

### What “full stack” means (`vs` / `vd` / `fvd` / `mvd`)

After the version bump, these scripts call `node scripts/deploy.js … --full-stack`, which deploys:

| Target | Included |
|--------|----------|
| **Hosting** | Angular admin/app + merged Astro SEO pages |
| **Cloud Functions** | All functions in `functions/` |
| **Firestore** | Rules + indexes |
| **Storage** | Storage rules |

**Also included (before Firebase deploy):** sync of GitHub Actions secrets used by the nightly rebuild:

| Secret | Source file |
|--------|-------------|
| `ENVIRONMENT_PROD_TS` | `src/environments/environment.prod.ts` |
| `ENVIRONMENT_TS` | `src/environments/environment.ts` |
| `SITE_CONTACTS_JSON` | `config/site-contacts.json` (if present) |

Requires **GitHub CLI** (`gh`) installed and logged in (`gh auth login`) with permission to set repo secrets. Without this, the next Astro/hosting CI run can rebuild with an old footer version.

Manual sync only: `node scripts/sync-github-ci-secrets.js --strict`

**Not** included: Firebase Secret Manager rotation (`BREVO_API_KEY`, etc.).

### Hosting-only (no version bump)

| Script | Command | Deploys |
|--------|---------|---------|
| **td** | `npm run td` | Staging **hosting only** |
| **ld** | `npm run ld` | Production **hosting only** |

Use `ld` / `td` when you only changed the frontend and do not need Functions/rules.

### What Each Version Script Does

1. **Reads current version** from `package.json`
2. **Bumps version** according to the script type:
   - **Patch** (`vs`, `vd`): `1.2.3` → `1.2.4` (bug fixes, small changes)
   - **Feature** (`fvd`): `1.2.3` → `1.3.0` (new features, minor changes)
   - **Major** (`mvd`): `1.2.3` → `2.0.0` (breaking changes, major updates)
3. **Updates all environment files** with the new version
4. **Builds** Angular + Astro and merges for Hosting
5. **Deploys full stack** to Firebase (see table above)
6. **Rolls back** `package.json` version if deployment fails

### When to Use Each Script

- **`npm run vs`**: Full-stack test on staging before going live
- **`npm run vd`**: Full-stack production release for bug fixes / small updates
- **`npm run fvd`**: Full-stack production release for new features
- **`npm run mvd`**: Full-stack production release for major / breaking changes
- **`npm run ld`**: Frontend-only production Hosting (no version bump, no Functions/rules)

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
