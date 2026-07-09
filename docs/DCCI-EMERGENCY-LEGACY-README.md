# DCCI Emergency Legacy README

**Audience:** Hatun, a future technical maintainer, or anyone who must keep the ministry site running if the current developer is unavailable.

**This file contains no passwords or API keys.** Secrets live in **Package B** (encrypted backup) or the services listed below.

**Last updated:** June 2026 — fill in `[brackets]` as you complete handoff steps.

---

## 1. Who owns what

| Asset | Owner / location | Identifier |
|-------|------------------|------------|
| **Live website** | Firebase Hosting | `https://dcciministries.com` |
| **Firebase project** | Ministry (Google account TBD) | `dcci-ministries` |
| **GitHub repository** | DCCI Ministries org | [github.com/DCCI-Ministries/dcci-website](https://github.com/DCCI-Ministries/dcci-website) |
| **Domain / DNS** | `[registrar name]` | `dcciministries.com` |
| **Cloudflare** (if used) | `[account holder]` | `[dash.cloudflare.com login]` |
| **Contact form sending** | **Target:** Brevo (ministry-owned) · **Current:** Gmail SMTP via Firebase until migrated | See [meeting-agenda-hatun-email-setup.md](./meeting-agenda-hatun-email-setup.md) |
| **YouTube sync** | Firebase Functions config | `youtube.api_key` in Firebase |

**Rule:** Ministry owns ministry inboxes and public-facing email. The **technical maintainer** owns `technicalAdminEmail` (website bugs, accessibility, deploy). See [config/site-contacts.json](../config/site-contacts.json).

---

## 2. Who to contact

| Role | Person | Email | When to contact |
|------|--------|-------|-----------------|
| **Ministry lead** | Hatun | `hatun@dcciministries.com` | Content, theology, contact-form mail, ministry decisions |
| **Public ministry inbox** | DCCI | `info@dcciministries.com` | Legal pages, general ministry inquiries |
| **Technical maintainer** | Alicia (Accessible Web Media) | `admin@accessiblewebmedia.com` | Site down, deploy, Firebase, contact form *technical* failure |
| **Previous developer** (succession) | Alicia (until next handoff) | `admin@accessiblewebmedia.com` | Architecture, “why was it built this way?”, urgent site emergencies |

*Source of truth for technical emails:* [`config/site-contacts.json`](../config/site-contacts.json) (`technicalAdminEmail`, `technicalSuccessionContactEmail`). Update **this table** and both JSON copies when a new developer takes over.

**Email subject for urgent dev help:** `Urgent: Hatun Website Question`  
**Non-urgent:** `Hatun Website Question`

Full succession history: [config/succession-chain.md](../config/succession-chain.md)

---

## 3. If the site is down

1. Check whether **only you** see it or **everyone** — try a phone on mobile data (not Wi‑Fi).
2. Open [Firebase Console](https://console.firebase.google.com) → **dcci-ministries** → **Hosting** — last deploy time and errors.
3. Open [GitHub Actions](https://github.com/DCCI-Ministries/dcci-website/actions) — failed **Rebuild Astro Site** or deploy?
4. Follow **[Emergency Procedures](./emergency-procedures.md)** — read-only mode, maintenance message, nuclear lockdown (Super Admin only).
5. Email **technical succession contact** with subject `Urgent: Hatun Website Question` if you cannot resolve in 30 minutes.

**Do not** panic-delete Firebase or change DNS without documenting what you changed.

---

## 4. If the contact form breaks

Visitors see “message sent” but Hatun gets nothing:

1. **Do not** revert to Alicia’s personal Workspace (`admin@accessiblewebmedia.com`) long-term — that creates privacy and password-rotation risk.
2. Check Firebase Functions logs: `firebase functions:log --only submitContactForm`
3. Check Firestore **`contactDeliveryFailures`** (admin dashboard may show count).
4. **Target fix:** Brevo SMTP in Firebase config — [contact-form-recovery-and-independence-plan.md](./contact-form-recovery-and-independence-plan.md)
5. Hatun reports spam/abuse to technical maintainer; block harassers via [contact-blocklist.json](../config/contact-blocklist.json) (not by blocking VPNs globally).

---

## 5. Where secrets live (not in this file)

| Secret | Where it is set |
|--------|-----------------|
| Firebase Admin / deploy | GitHub Actions secrets on `DCCI-Ministries/dcci-website` · see [auto-rebuild-setup.md](./auto-rebuild-setup.md) |
| Contact form SMTP | Firebase Functions config: `mail.user`, `mail.pass` |
| YouTube API | Firebase Functions config: `youtube.api_key` |
| Brevo SMTP (after migration) | Firebase Functions config + Brevo dashboard (ministry account) |
| Service account JSON | Password manager / **Package B** only |
| GitHub / Firebase login | Ministry or maintainer password manager — document *who* has access in Package B |

**Encrypted backups:**

| Package | Contents | Password given to Hatun? |
|---------|----------|---------------------------|
| **A — Code** | Repo ZIP, docs, this file, no secrets | Optional (code is public on GitHub) |
| **B — Secrets** | Where each key lives, ownership notes | **Yes — separate channel from the ZIP file** |

Store encrypted ZIPs in Proton Drive (or similar). **Update quarterly** or after Brevo, domain, Firebase, or GitHub changes.

---

## 6. Minimum deploy (technical maintainer)

From a machine with Node 20 and Firebase CLI logged in:

```bash
git clone https://github.com/DCCI-Ministries/dcci-website.git
cd dcci-website
npm ci
cd public-site && npm ci && cd ..
npm run build:all
firebase deploy --only hosting
```

Functions-only (contact form change):

```bash
firebase deploy --only functions:submitContactForm
```

Full checklist: [technical-contact-handoff.md](./technical-contact-handoff.md) · [CONTACT_FORM_SETUP.md](../CONTACT_FORM_SETUP.md)

---

## 7. What must keep working (priority order)

Work in order — do not add features until these are safe:

1. Contact form → **Brevo**, ministry-owned, no developer Workspace in the path  
2. Welcome page editor tested after each publish  
3. Contact messages **not** stored in Firestore (metadata only)  
4. This legacy package + encrypted backups current  
5. Daily Astro SEO rebuild (GitHub secrets + workflow on `master`)  
6. New content features (Quran/Hadith, Bible verse, extra YouTube, etc.)

Living checklist: **[site-priority-roadmap.md](./site-priority-roadmap.md)**

---

## 8. Key documentation map

| Need | Document |
|------|----------|
| Step-by-step priorities | [site-priority-roadmap.md](./site-priority-roadmap.md) |
| Hatun / admin dashboard | [admin-dashboard.md](./admin-dashboard.md) |
| Contact form + Brevo meeting | [meeting-agenda-hatun-email-setup.md](./meeting-agenda-hatun-email-setup.md) |
| Developer replacement | [technical-contact-handoff.md](./technical-contact-handoff.md) |
| SEO rebuild | [auto-rebuild-setup.md](./auto-rebuild-setup.md) |
| Incidents | [emergency-procedures.md](./emergency-procedures.md) |

---

## 9. Maintenance schedule

| Task | How often |
|------|-----------|
| Refresh encrypted Package A + B | Quarterly or after major infra change |
| Confirm contact form test message reaches Hatun | Monthly |
| Confirm GitHub SEO workflow ran successfully | After each welcome publish or new YouTube article (or check weekly) |
| Update this file + succession chain | On every developer handoff |

---

*“The prudent see danger and hide themselves.” — Proverbs 27:12*
