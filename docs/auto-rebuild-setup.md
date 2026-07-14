# Automatic Astro SEO Rebuild

The Astro static SEO layer (`/welcome/`, `/articles/`, sitemap, etc.) is rebuilt from Firestore **once per day** by GitHub Actions. No GitHub personal access token (PAT) is required.

## Overview

| What | Detail |
|------|--------|
| **Workflow** | `.github/workflows/rebuild-astro.yml` |
| **Schedule** | Daily at **03:00 UTC** (03:00 GMT / 04:00 BST) |
| **Repo** | [DCCI-Ministries/dcci-website](https://github.com/DCCI-Ministries/dcci-website) |
| **Cost** | **$0** for public repo (GitHub Actions + typical Firebase Hosting usage) |

When Hatun or an admin **publishes** the welcome page or a published article:

1. **Live app** updates immediately (Firestore → Angular).
2. **SEO HTML** updates on the next scheduled run (within ~24 hours).

## How it works

```
  Daily 03:00 UTC — GitHub Actions "Rebuild Astro Site"
           │
           ├── Checkout current committed code (no auto-commit/push)
           ├── npm ci (root + public-site)
           ├── npm run build:all (Angular + Astro from Firestore)
           ├── Deploy dist/app → Firebase Hosting (live)
           └── Record adminSettings/seoRebuildState timestamp
```

Scripts:

- `scripts/record-seo-rebuild-state.js` — writes `adminSettings/seoRebuildState` after success
- `scripts/check-seo-rebuild-needed.js` — legacy helper (not used by the workflow; optional for local checks)

## One-time setup (GitHub Secrets)

On **DCCI-Ministries/dcci-website** → **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|--------|--------|
| `FIREBASE_SERVICE_ACCOUNT` | Full JSON from Firebase Console → Service accounts → Generate new private key |
| `SITE_URL` | `https://dcciministries.com` |
| `ENVIRONMENT_TS` | Full contents of local `src/environments/environment.ts` |
| `ENVIRONMENT_PROD_TS` | Full contents of local `src/environments/environment.prod.ts` |
| `SITE_CONTACTS_JSON` | Full contents of local `config/site-contacts.json` |

The workflow uses **only** `FIREBASE_SERVICE_ACCOUNT` for Admin SDK + Hosting deploy (parses `project_id`, `client_email`, `private_key` from that JSON). Do **not** maintain separate `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, or `FIREBASE_PRIVATE_KEY` secrets for this workflow.

**Local Astro builds** may still use the three split env vars as a fallback, or set `FIREBASE_SERVICE_ACCOUNT` to the same JSON string.

No `github.token` or PAT is needed for the scheduled approach.

**When local Angular env files change:** also update `ENVIRONMENT_TS` / `ENVIRONMENT_PROD_TS` in GitHub Secrets. Those files are gitignored; CI writes them from secrets before `build:all`. Never put backend private keys in the frontend env files.

**Automatic sync:** `npm run vd` / `fvd` / `mvd` / `vs` call `scripts/sync-github-ci-secrets.js` (requires `gh` CLI). Or run alone: `npm run sync:github-secrets`.

**When `config/site-contacts.json` changes:** also update `SITE_CONTACTS_JSON` in GitHub Secrets. That file is gitignored (via `*.json`); CI writes it before `build:all`. Never put backend private keys in it.

## Verify

1. **Actions** → **Rebuild Astro Site** → **Run workflow**.
2. Confirm green checkmark and Firebase Hosting deploy.
3. After Hatun publishes welcome content, wait for the next **03:00 UTC** run (or run workflow manually).
4. **View source** on `https://dcciministries.com/welcome/` — confirm new title/text in HTML.

## Manual rebuild (optional)

**GitHub:** Actions → Rebuild Astro Site → Run workflow.

**Local:**

```bash
npm run build:all
npx firebase-tools deploy --only hosting
node scripts/record-seo-rebuild-state.js   # optional — records last build time in Firestore
```

(Local record step needs Firebase Admin env vars set.)

## Optional: instant rebuild via PAT (legacy)

If you ever configure `github.token` + `github.repo` in Firebase Functions config, publish events can still trigger `repository_dispatch` immediately. This is **optional** — the daily schedule is the supported default.

## Troubleshooting

| Issue | Check |
|-------|--------|
| Scheduled run never appears | Workflow must be on default branch (`master`); cron only runs on default branch |
| Workflow fails at build | Actions logs; verify all five secrets |
| SEO page stale after publish | Wait until after 03:00 UTC, or run workflow manually |
| Deploy succeeds but site unchanged | Confirm Firestore content was published; view source on `/welcome/` |

## Firestore

- **`adminSettings/seoRebuildState`** — `lastSuccessfulBuildAt` (written by GitHub Actions Admin SDK)
- Admins can **read** this doc in Firestore rules; clients cannot write it

Deploy rules after pull: `firebase deploy --only firestore:rules`
