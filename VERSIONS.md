# Runtime & framework versions

Use this file first when setting up a new machine. Do not scrape `package.json` unless you are changing versions.

## Node.js (primary)

| Use | Version |
|-----|---------|
| **Recommended for local work** | **Node.js 20 LTS** |
| Cloud Functions runtime (`functions/package.json` `engines`) | `20` |
| GitHub Actions (Astro rebuild) | `20` |
| Minimum historically mentioned in setup docs | 18+ (prefer 20) |

```bash
node --version   # expect v20.x
```

Tip: pin with nvm / fnm using the `.nvmrc` in the repo root (`20`).

## Ionic admin / Angular app (repo root)

Resolved from `package-lock.json` (ranges in `package.json` may be wider):

| Package | Declared range | Locked version |
|---------|----------------|----------------|
| Angular (`@angular/core`) | `^20.0.0` | **20.1.7** |
| Ionic (`@ionic/angular`) | `^8.7.2` | **8.7.2** |
| Quill | `^2.0.3` | **2.0.3** |
| ngx-quill | `^28.0.1` | **28.0.1** |
| TypeScript | `~5.8.0` | (see lockfile) |
| Angular CLI | `^20.3.13` | (see lockfile) |

## Public site (Astro)

| Package | Declared range | Locked version |
|---------|----------------|----------------|
| Astro | `^5.16.9` | **5.16.9** |

Build/CI also expect **Node 20**.

## Cloud Functions

| Item | Value |
|------|--------|
| Node engine | **20** |
| Location | `functions/package.json` → `engines.node` |

Firebase currently warns that Node 20 for Cloud Functions is deprecated later in 2026; stay on 20 until the project deliberately upgrades Functions + local tooling together.

## How to refresh this file

After intentional upgrades:

1. Update and install dependencies.
2. Re-read locked versions from `package-lock.json` / `functions/package.json`.
3. Update the tables above and `.nvmrc` if Node major changes.
