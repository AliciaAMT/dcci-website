# DCCI site — priority roadmap

**Purpose:** Work through Hatun’s site one step at a time. Privacy and survivability before new features.

**How to use this doc:** Do one numbered item (or one session block) at a time. Check boxes when done. Update **Current status** after each session so you do not lose context.

**Guiding principle:** *“The prudent see danger and hide themselves.”* — Proverbs 27:12. Fix contact privacy and legacy access before adding features.

---

## Current status (update after each session)

| Area | Status | Notes |
|------|--------|--------|
| Contact form delivery | ☑ Working ☐ Broken ☐ Unknown | Still via Gmail SMTP (`mail.*`); delivers to Hatun from site-contacts. **Not** Brevo yet. |
| Contact form → Brevo | ☐ Not started ☑ **In progress** ☐ Done | Code ready (`submitContactForm` + `BREVO_API_KEY`). Set secret + deploy, then live test. Gmail left for recovery/newsletter/problem reports. |
| Workspace removed from Hatun’s comms | ☑ No ☐ Partial ☐ Yes | Still depends on developer/ministry Gmail App Password path until Brevo. |
| Welcome page editor tested | ☐ No ☐ Yes | What you changed: |
| Contact content in Firestore/logs | ☑ **Still stored (full)** ☐ Metadata only | Live `submitContactForm` still saves name, email, subject, message, IP to `contacts`. **Must change** for persecuted visitors. |
| YouTube auto-articles (DCCI + Hatun) | ☑ **Done** | Multi-playlist hourly sync live. Historical backfills **completed** (Hatun ~197, DCCI ~2277; Shorts as drafts). |
| Legacy / emergency package | ☑ In progress ☐ Done | Outline exists ([DCCI-EMERGENCY-LEGACY-README](./DCCI-EMERGENCY-LEGACY-README.md)); brackets + encrypted Package A/B **not finished**. |
| GitHub SEO rebuild secrets | ☐ Missing ☐ Set ☐ Tested | See [auto-rebuild-setup.md](./auto-rebuild-setup.md) |
| Daily Astro rebuild on `master` | ☐ Old workflow only ☐ Merged ☐ Running | Hardened workflow merged earlier; confirm secrets + green run. |

**Last updated:** 12 July 2026  

**Next session — do only (privacy first):**

1. **Brevo** — Hatun owns account; domain auth; SMTP key; Firebase `mail.*` → Brevo; live test to Hatun only.  
2. **Strip Firestore contact copies** — recover any backlog to Hatun, delete old `contacts` bodies, ship metadata-only (or no PII) writes.  
3. **Legacy package** — finish Emergency README brackets + encrypted Package A (code/docs) + Package B (where secrets live); give Hatun Package B password on a separate channel.

---

## Where we just landed (July 2026)

### YouTube — complete for now

| Item | Detail |
|------|--------|
| Channels | `@DCCIMinistries` + `@HatunTashDCCIMinistries` |
| Hourly sync | `syncYouTubeUploads` — both uploads playlists; dedupe by `youtubeVideoId`; Shorts → **draft** |
| Config | `youtube.uploads_playlist_ids` (comma-separated); same API key |
| Hatun history | `backfillHatunYouTubeUploads` → **status: completed** |
| DCCI history | `backfillDcciYouTubeUploads` → **status: completed** |
| Docs | [functions/YOUTUBE_SETUP.md](../functions/YOUTUBE_SETUP.md) |
| State docs | `settings/youtubeHatunBackfill`, `settings/youtubeDcciBackfill` |

New uploads only need the scheduled sync. Do not reset backfill unless intentionally re-walking a playlist.

### Contact form — **not** privacy-safe yet

**Target (agreed):** Messages go **only to Hatun’s inbox**. No useful copy of visitor identity or message text in Firestore — people contacting from **persecuted / high-risk areas** must not leave a database trail.

**Today (code):** `submitContactForm` still writes full `name`, `email`, `subject`, `message`, `ipAddress`, etc. to `contacts`. That was useful for early monitoring; it is time to remove it.

**Docs already written for the migration:**

- [contact-form-recovery-and-independence-plan.md](./contact-form-recovery-and-independence-plan.md)  
- [meeting-agenda-hatun-email-setup.md](./meeting-agenda-hatun-email-setup.md) (Brevo + `info@`)  
- [contact-form-privacy-and-reporting.md](./contact-form-privacy-and-reporting.md)  

---

## Priority order (do in this sequence)

### 1. Contact form → Brevo — **URGENT**

**Why first:** Privacy and independence. Removes Alicia’s Google Workspace from Hatun’s communications and from password-rotation risk. Ministry-owned SMTP key does not die when someone changes a Gmail login password.

| | |
|---|---|
| **Goal** | Form sends via **Brevo** (Hatun/ministry-owned). Hatun receives mail. No dependency on `admin@accessiblewebmedia.com`. |
| **Guides** | [Contact form — recovery & independence plan](./contact-form-recovery-and-independence-plan.md) · [Meeting agenda — Hatun `info@` + Brevo](./meeting-agenda-hatun-email-setup.md) (Part 4) · [CONTACT_FORM_SETUP.md](../CONTACT_FORM_SETUP.md) |
| **Done when** | ☐ Brevo account owned by ministry ☐ Domain/SMTP configured ☐ Firebase `mail.host` / `mail.user` / `mail.pass` point to Brevo ☐ Test submission reaches **Hatun only** ☐ Alicia’s inbox no longer in the send path |

---

### 2. Remove contact PII from the database — **URGENT (with Brevo)**

**Why:** Database copies of emails/messages are a risk if Firestore is breached, misconfigured, or compelled. Email to Hatun is enough for ministry reply.

| | |
|---|---|
| **Goal** | (A) Recover any backlog still in `contacts` → email to Hatun. (B) **Delete** those documents. (C) Change `submitContactForm` so new submissions do **not** store names, emails, subjects, or message bodies (metadata only for counts, e.g. `submittedAt` + newsletter flag — or drop storage entirely if counts can live elsewhere). (D) Stop logging message content in Cloud Functions. |
| **Guides** | [Contact form — recovery plan](./contact-form-recovery-and-independence-plan.md) · [Contact privacy](./contact-form-privacy-and-reporting.md) |
| **Done when** | ☐ Backlog forwarded to Hatun ☐ Old full-message docs deleted ☐ Live function confirmed **no visitor email/message in Firestore** ☐ No message bodies in function logs ☐ Admin dashboard still works on counts without reading mail |

**Note:** Newsletter opt-in may still need an email in `subscribers` if that feature stays — treat as a **separate, explicit** consent list, not a copy of every contact message.

---

### 3. Legacy package / emergency access plan — **NEXT**

**Why before features:** Hatun needs continuity if the current maintainer is unavailable.

| | |
|---|---|
| **Goal** | Someone else can find ownership, contacts, deploy steps, and **where secrets live** — without hunting through one laptop. |
| **Guides** | [DCCI Emergency Legacy README](./DCCI-EMERGENCY-LEGACY-README.md) · [Technical contact handoff](./technical-contact-handoff.md) · [config/succession-chain.md](../config/succession-chain.md) · Package A/B below |
| **Done when** | ☐ Emergency README `[brackets]` filled (no secrets in the file) ☐ Encrypted **Package A** (code/docs) + **Package B** (secret locations / ownership) created and stored ☐ Hatun has Package B password on a **separate** channel ☐ Succession chain current ☐ After Brevo: Package B notes updated |

---

### 4. Test the editable welcome page

| | |
|---|---|
| **Goal** | Confirm draft → preview → publish → live `/welcome`. |
| **Guides** | [Admin dashboard — Welcome page](./admin-dashboard.md#welcome-page-editor) |
| **Done when** | ☐ Draft / preview / publish verified ☐ Note what changed |

---

### 5. Daily Astro rebuild / SEO refresh

| | |
|---|---|
| **Goal** | Public `/articles/` and SEO pages stay in sync with Firestore (including backfilled YouTube articles). |
| **Guides** | [Automatic Astro SEO rebuild](./auto-rebuild-setup.md) |
| **Done when** | ☐ Required GitHub secrets set ☐ Workflow green on `master` ☐ View-source shows current content |

**Note:** App article list updates from Firestore immediately; static Astro pages need the rebuild.

---

### 6. Requested content features — **after foundation is safe**

Do not start until items **1–3** are in good shape (4–5 can overlap).

| Feature | Priority | Notes |
|---------|----------|--------|
| Quran / Hadith of the day | Medium | |
| Bible verse of the day | Medium | |
| ~~Add Hatun YouTube channel~~ | **Done** | Dual playlist sync + backfill completed July 2026 |
| Twitter/X feed | Lower | API access can be paid/brittle |

---

## Encrypted local backup (Package A + B)

Do this as part of **priority 3**, and **refresh after Brevo**.

### Why two packages

| Package | Contents | Store |
|---------|----------|--------|
| **A — Code backup** | Repo/project files, **no secrets**. Exclude `node_modules`. Deploy docs, succession chain, this roadmap, Emergency README. | Encrypted ZIP (optional — GitHub is source of truth) |
| **B — Emergency secrets** | Where each key lives (Firebase, Brevo SMTP, GitHub, Cloudflare, YouTube API), ownership instructions. Prefer pointers to a password manager over raw keys in a file. | Separate encrypted ZIP |

### Steps

1. ZIP the project; exclude `node_modules`, `dist`, `.angular`, large caches.  
2. Package A: code + docs only.  
3. Package B: secrets checklist + where each value is set.  
4. Encrypt each ZIP with a **strong password**.  
5. Store in Proton Drive or similar.  
6. Give Hatun the Package B password **separately** (different channel from the file).  
7. **Update after Brevo**, and quarterly / after major infra changes.

---

## Session plans

### This week — privacy + independence (minimum)

- [ ] Update this **Current status** table if anything changes mid-session.  
- [ ] **Brevo** with Hatun (priority **1**) — use [meeting agenda](./meeting-agenda-hatun-email-setup.md).  
- [ ] **Recover + delete** Firestore contact bodies; ship code that stops storing PII (priority **2**).  
- [ ] Live form test: message arrives **only** in Hatun’s mail; Firestore doc has no email/message.  

### Same week or next — survivability

- [ ] Finish Emergency README brackets.  
- [ ] Build encrypted Package A + B; give Hatun Package B password separately.  
- [ ] Confirm Astro rebuild secrets / one green Actions run.  

### Later

- [ ] Welcome page retest if needed.  
- [ ] Content features (priority **6**).

---

## Quick links

| Topic | Doc |
|-------|-----|
| Brevo + `info@` meeting | [meeting-agenda-hatun-email-setup.md](./meeting-agenda-hatun-email-setup.md) |
| Contact recovery + independence | [contact-form-recovery-and-independence-plan.md](./contact-form-recovery-and-independence-plan.md) |
| Contact privacy (why no DB copies) | [contact-form-privacy-and-reporting.md](./contact-form-privacy-and-reporting.md) |
| YouTube sync / backfill | [functions/YOUTUBE_SETUP.md](../functions/YOUTUBE_SETUP.md) |
| Developer handoff | [technical-contact-handoff.md](./technical-contact-handoff.md) |
| SEO rebuild | [auto-rebuild-setup.md](./auto-rebuild-setup.md) |
| Emergency legacy | [DCCI-EMERGENCY-LEGACY-README.md](./DCCI-EMERGENCY-LEGACY-README.md) |
| Site contacts config | [config/README.md](../config/README.md) |

---

**Rule for every future session:** Privacy and survivability before new features.
