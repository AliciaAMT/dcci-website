# Automatic Astro SEO Rebuild

The Astro static SEO layer (`/welcome/`, `/articles/`, etc.) is rebuilt from Firestore **once per day** by GitHub Actions. No GitHub personal access token (PAT) is required.

## Overview

| What | Detail |
|------|--------|
| **Workflow** | `.github/workflows/rebuild-astro.yml` |
| **Schedule** | Daily at **04:00 UTC** |
| **Repo** | [DCCI-Ministries/dcci-website](https://github.com/DCCI-Ministries/dcci-website) |
| **Cost** | **$0** for public repo (GitHub Actions + typical Firebase Hosting usage) |

When Hatun or an admin **publishes** the welcome page or a published article:

1. **Live app** updates immediately (Firestore → Angular).
2. **SEO HTML** updates on the next scheduled run **if** content changed since the last successful build (usually within 24 hours).

## How it works

```
  Publish welcome page or article
           │
           ▼
  Firestore updated (live site immediate)
           │
           ▼
  Daily 04:00 UTC — GitHub Actions "Rebuild Astro Site"
           │
           ├── Read adminSettings/seoRebuildState (last build time)
           ├── Compare siteSettings/welcome + latest published article
           │
           ├── No changes → skip (fast, no deploy)
           └── Changes → npm run build:all → deploy hosting → record new timestamp
```

Scripts:

- `scripts/check-seo-rebuild-needed.js` — scheduled runs only rebuild when needed
- `scripts/record-seo-rebuild-state.js` — writes `adminSettings/seoRebuildState` after success

## One-time setup (GitHub Secrets)

On **DCCI-Ministries/dcci-website** → **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|--------|--------|
| `FIREBASE_PROJECT_ID` | `dcci-ministries` |
| `SITE_URL` | `https://dcciministries.com` |
| `FIREBASE_SERVICE_ACCOUNT` | Full JSON from Firebase Console → Service accounts → Generate new private key |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from that JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` from that JSON (keep `\n` line breaks) |

No `github.token` or PAT is needed for the scheduled approach.

## Verify

1. **Actions** → **Rebuild Astro Site** → **Run workflow** (manual run always rebuilds by default).
2. Confirm green checkmark and Firebase Hosting deploy.
3. After Hatun publishes welcome content, wait for the next **04:00 UTC** run (or run workflow manually).
4. **View source** on `https://dcciministries.com/welcome/` — confirm new title/text in HTML.

## Manual rebuild

**GitHub:** Actions → Rebuild Astro Site → Run workflow.

**Local:**

```bash
npm run build:all
npx firebase-tools deploy --only hosting
node scripts/record-seo-rebuild-state.js   # optional — keeps scheduled skip logic accurate
```

(Local record step needs Firebase Admin env vars set.)

## Optional: instant rebuild via PAT (legacy)

If you ever configure `github.token` + `github.repo` in Firebase Functions config, publish events can still trigger `repository_dispatch` immediately. This is **optional** — the daily schedule is the supported default.

## Troubleshooting

| Issue | Check |
|-------|--------|
| Scheduled run never appears | Workflow must be on default branch (`master`); cron only runs on default branch |
| Workflow fails at build | Actions logs; verify all five secrets |
| SEO page stale after publish | Wait until after 04:00 UTC, or run workflow manually |
| Every scheduled run rebuilds | First run has no `seoRebuildState` — expected; later runs skip if unchanged |

## Firestore

- **`adminSettings/seoRebuildState`** — `lastSuccessfulBuildAt` (written by GitHub Actions Admin SDK)
- Admins can **read** this doc in Firestore rules; clients cannot write it

Deploy rules after pull: `firebase deploy --only firestore:rules`
