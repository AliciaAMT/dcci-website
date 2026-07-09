# DCCI site — priority roadmap

**Purpose:** Work through Hatun’s site one step at a time. Privacy and survivability before new features.

**How to use this doc:** Do one numbered item (or one session block) at a time. Check boxes when done. Update **Current status** after each session so you do not lose context.

**Guiding principle:** *“The prudent see danger and hide themselves.”* — Proverbs 27:12. Fix contact privacy and legacy access before adding features.

---

## Current status (update after each session)

| Area | Status | Notes |
|------|--------|--------|
| Contact form delivery | ☐ Working ☐ Broken ☐ Unknown | |
| Contact form → Brevo | ☐ Not started ☐ In progress ☐ Done | |
| Workspace removed from Hatun’s comms | ☐ No ☐ Partial ☐ Yes | |
| Welcome page editor tested | ☐ No ☐ Yes | What you changed: |
| Contact content in Firestore/logs | ☐ Still stored ☐ Metadata only | |
| Legacy / emergency package | ☐ Not started ☐ In progress ☐ Done | Last updated: |
| GitHub SEO rebuild secrets | ☐ Missing ☐ Set ☐ Tested | See [auto-rebuild-setup.md](./auto-rebuild-setup.md) |
| Daily Astro rebuild on `master` | ☐ Old workflow only ☐ Merged ☐ Running | |

**Last updated:** *(date)*  
**Next session — do only:**

1. 
2. 

---

## Priority order (do in this sequence)

### 1. Contact form → Brevo — **URGENT**

**Why first:** Privacy and independence. Removes Alicia’s Google Workspace from Hatun’s communications and from password-rotation risk.

| | |
|---|---|
| **Goal** | Form sends via **Brevo** (ministry-owned). Hatun receives mail. No dependency on `admin@accessiblewebmedia.com`. |
| **Guides** | [Contact form — recovery & independence plan](./contact-form-recovery-and-independence-plan.md) · [Meeting agenda — Hatun `info@` + Brevo](./meeting-agenda-hatun-email-setup.md) (Part 4) · [CONTACT_FORM_SETUP.md](../CONTACT_FORM_SETUP.md) |
| **Done when** | ☐ Brevo account owned by ministry ☐ Domain/SMTP configured ☐ `mail.user` / `mail.pass` in Firebase point to Brevo ☐ Test submission reaches Hatun ☐ Alicia’s inbox no longer in the send path |

---

### 2. Test the editable welcome page

**Why now:** You already changed content. Test before you forget what you changed.

| | |
|---|---|
| **Goal** | Confirm draft → preview → publish → live site matches intent. |
| **Guides** | [Admin dashboard — Welcome page](./admin-dashboard.md#welcome-page-editor) · [Content management — Welcome page](./content-management.md#editing-the-welcome-page) |
| **Done when** | ☐ Draft saves ☐ Preview matches ☐ Publish updates live `/welcome` app ☐ Version history / rollback understood ☐ Note written: *what I changed* |

**What I changed (fill in):**

```
(date, fields, wording — keep short)
```

---

### 3. Stop storing contact message content in Firestore / logs

**Why:** Visitor messages in the database are a privacy risk if Firestore is ever accessed wrongly. Aligns with [contact form privacy](./contact-form-privacy-and-reporting.md).

| | |
|---|---|
| **Goal** | After recovery of any backlog, store **metadata only** (`submittedAt`, `newsletterOptIn`). No names, emails, or bodies in Firestore or function logs. |
| **Guides** | [Contact form — recovery plan](./contact-form-recovery-and-independence-plan.md) (recovery first, then delete recovered docs) · [CONTACT_FORM_SETUP.md](../CONTACT_FORM_SETUP.md) |
| **Done when** | ☐ Backlog recovered and forwarded to Hatun ☐ Old full-message docs deleted from `contacts` ☐ Live function confirmed metadata-only ☐ No message bodies in Cloud Function logs |

---

### 4. Legacy package / emergency access plan

**Why before features:** Hatun needs continuity if something happens to the current maintainer.

| | |
|---|---|
| **Goal** | Someone else can find ownership, contacts, deploy steps, and secrets — without hunting through one person’s laptop. |
| **Guides** | [Technical contact handoff](./technical-contact-handoff.md) · [config/succession-chain.md](../config/succession-chain.md) · [Emergency procedures](./emergency-procedures.md) · [Project handoff](./project-handoff.md) |
| **Done when** | ☐ [DCCI Emergency Legacy README](./DCCI-EMERGENCY-LEGACY-README.md) filled in (no secrets in file) ☐ Encrypted Package A + B created and stored ☐ Hatun has password separately ☐ Succession chain updated |

**Standalone file:** [DCCI-EMERGENCY-LEGACY-README.md](./DCCI-EMERGENCY-LEGACY-README.md) — include in Package A. Fill in `[brackets]` (domain registrar, Cloudflare account, etc.) as you complete handoff.

---

### 5. Daily Astro rebuild / SEO refresh

**Important, not urgent** compared to contact routing and legacy access.

| | |
|---|---|
| **Goal** | Public `/welcome/`, `/articles/`, and article pages stay in sync with Firestore (YouTube articles, welcome publish) without manual deploys. |
| **Guides** | [Automatic Astro SEO rebuild](./auto-rebuild-setup.md) · [Setup Firebase Admin for Astro](./setup-firebase-admin-for-astro.md) |
| **Done when** | ☐ Five GitHub secrets on `DCCI-Ministries/dcci-website` ☐ Workflow with daily cron merged to `master` ☐ Manual workflow run green ☐ View-source on `/welcome/` shows current content |

**Secrets checklist:** `FIREBASE_PROJECT_ID` · `SITE_URL` · `FIREBASE_SERVICE_ACCOUNT` · `FIREBASE_CLIENT_EMAIL` · `FIREBASE_PRIVATE_KEY`

**Note:** Live app at `/app/articles` updates from Firestore immediately. SEO static pages need this workflow.

---

### 6. Requested content features — **after foundation is safe**

Do not start until items **1–4** are in good shape (item **5** can run in parallel once secrets are set).

| Feature | Priority | Notes |
|---------|----------|--------|
| Quran / Hadith of the day | Medium | |
| Bible verse of the day | Medium | |
| Add other YouTube channel | Medium | Extend [YouTube setup](../functions/YOUTUBE_SETUP.md) |
| Import older content into articles | Medium | |
| Twitter/X feed | **Lower** | API access can be paid, brittle, or blocked |

---

## Encrypted local backup (Package A + B)

Do this as part of **priority 4**, not as a late afterthought.

### Why two packages

| Package | Contents | Store |
|---------|----------|--------|
| **A — Code backup** | Repo/project files, **no secrets**. Exclude `node_modules`. Deploy docs, succession chain, this roadmap. | Encrypted ZIP |
| **B — Emergency secrets** | API key locations, Firebase/Brevo/GitHub/Cloudflare notes, ownership instructions. **Not** mixed casually with code. | Separate encrypted ZIP |

### Steps

1. ZIP the project; exclude `node_modules`, `dist`, `.angular`, large caches.
2. Package A: code + docs only.
3. Package B: secrets checklist + where each value is set (not necessarily the raw keys in plain text — pointer to password manager is fine).
4. Encrypt each ZIP with a **strong password**.
5. Store in Proton Drive or similar encrypted cloud.
6. Give Hatun the password **separately** (different channel, not in the same folder/email as the files).
7. **Update quarterly** or after any major infra change (Brevo, domain, Firebase, GitHub org).

---

## Session plans

### Tonight — realistic minimum

Stop after this. Do not start Brevo or SEO unless you already have energy and secrets ready.

- [ ] Update **Current status** table at the top of this doc.
- [ ] Test welcome page (priority **2**); write what you changed.
- [ ] Fill in `[brackets]` in **[DCCI Emergency Legacy README](./DCCI-EMERGENCY-LEGACY-README.md)** (outline is enough tonight).
- [ ] **Stop there.**

### Next work session

- [ ] Fix contact form → **Brevo** (priority **1**).
- [ ] Remove Alicia’s Workspace from the send/receive path.
- [ ] Stop logging / storing contact content (priority **3**).
- [ ] Test live form end-to-end.

### Then

- [ ] Set up daily Astro rebuild (priority **5**).
- [ ] Build encrypted Package A + B (priority **4**).
- [ ] Start content features (priority **6**).

---

## Quick links

| Topic | Doc |
|-------|-----|
| Brevo + `info@` meeting | [meeting-agenda-hatun-email-setup.md](./meeting-agenda-hatun-email-setup.md) |
| Contact recovery | [contact-form-recovery-and-independence-plan.md](./contact-form-recovery-and-independence-plan.md) |
| Contact privacy | [contact-form-privacy-and-reporting.md](./contact-form-privacy-and-reporting.md) |
| Developer handoff | [technical-contact-handoff.md](./technical-contact-handoff.md) |
| SEO rebuild | [auto-rebuild-setup.md](./auto-rebuild-setup.md) |
| Emergency legacy | [DCCI-EMERGENCY-LEGACY-README.md](./DCCI-EMERGENCY-LEGACY-README.md) |
| Site contacts config | [config/README.md](../config/README.md) |

---

**Rule for every future session:** Privacy and survivability before new features.
