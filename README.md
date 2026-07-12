# DCCI Ministries Website

**Live site:** [https://dcciministries.com](https://dcciministries.com)  
**Code on GitHub:** [github.com/DCCI-Ministries/dcci-website](https://github.com/DCCI-Ministries/dcci-website)  
**Production branch:** `master` (always use the latest `master` unless a developer tells you otherwise)

---

# 🚨 Emergency — start here

If the site is broken, the developer is unavailable, or you are taking over this project, **read this section first**. You do not need to be technical to follow the owner steps.

## If you are not a developer

**Stop here and hand this to a developer.** Do not change DNS, delete Firebase projects, or “fix” things you do not understand.

What you *can* do safely:

1. Write down what is wrong (site blank? contact form? admin login?).
2. Try the site on your phone using **mobile data** (not Wi‑Fi) — note if it works for you only or for everyone.
3. Email the **current technical maintainer** (see table below) with subject:  
   **`Urgent: Hatun Website Question`**
4. Give the developer this repository link and ask them to use branch **`master`**.

**Do not share passwords in the same email as this file if you can avoid it.** Use a password manager or a separate message.

---

## If you are the ministry owner (Hatun) — hand the site to a new developer

You do **not** need to install Node or run commands. Your job is to **open the right accounts** and **add the new developer as a member/collaborator**, then point them at the handoff docs.

### Step 1 — Open the handoff documents (for you)

| What you need | Open this file |
|---------------|----------------|
| **Simple emergency / who owns what** | [docs/DCCI-EMERGENCY-LEGACY-README.md](docs/DCCI-EMERGENCY-LEGACY-README.md) |
| **Full developer takeover checklist** | [docs/technical-contact-handoff.md](docs/technical-contact-handoff.md) |
| **Longer project handoff notes** | [docs/project-handoff.md](docs/project-handoff.md) |
| **Who was maintainer before** | [config/succession-chain.md](config/succession-chain.md) |
| **What to do next (priorities)** | [docs/site-priority-roadmap.md](docs/site-priority-roadmap.md) |
| **Encrypted backup notes (Package A / B)** | Same Emergency README → “Encrypted backups” |

### Step 2 — Accounts inventory (log in and add the new developer)

Log into each account you control and add the new developer as a **member**, **collaborator**, or **admin** (ask them which role they need). Fill in the “Who has access” column when you change it.

| # | Account / service | Why it matters | Where to log in | Add new developer as… |
|---|-------------------|----------------|-----------------|------------------------|
| 1 | **GitHub** — `DCCI-Ministries` / `dcci-website` | Source code (`master`) | [github.com/DCCI-Ministries/dcci-website](https://github.com/DCCI-Ministries/dcci-website) | Collaborator or org member |
| 2 | **Firebase** — project `dcci-ministries` | Live website, database, Cloud Functions | [console.firebase.google.com](https://console.firebase.google.com) | Project member (Editor or Owner as appropriate) |
| 3 | **Google account** that owns Firebase (if separate) | Billing / project ownership | Google Account settings | Add them only if they need ownership; prefer Firebase member first |
| 4 | **Cloudflare** (DNS for `dcciministries.com`) | Domain / SSL / DNS | [dash.cloudflare.com](https://dash.cloudflare.com) | Account member |
| 5 | **Domain registrar** (where the domain was bought) | Domain ownership | *(your registrar login)* | Access or shared login per your policy |
| 6 | **Brevo** (contact form email sending — once set up) | Sends contact form mail to you | [brevo.com](https://www.brevo.com) | User / teammate (SMTP key stays in Firebase) |
| 7 | **YouTube / Google Cloud API key** (if ministry-owned) | Auto-articles from YouTube | Google Cloud Console / YouTube | Share key location via Package B — do not paste keys into GitHub |
| 8 | **GitHub Actions secrets** | Nightly SEO rebuild | GitHub → repo → Settings → Secrets | New collaborator with admin can update secrets later |
| 9 | **Password manager / Package B** | Where real secrets live | Proton Drive or your vault | Give Package B password on a **separate channel** |

**Emails (who receives what — not GitHub passwords):**

| Role | Typical address | Config / notes |
|------|-----------------|----------------|
| Ministry lead / content | `hatun@dcciministries.com` | Contact form goes here |
| Public ministry info | `info@dcciministries.com` | Legal / public pages |
| Website technical maintainer | See `config/site-contacts.json` → `technicalAdminEmail` | Change this when a new **dev** takes over ([technical-contact-handoff.md](docs/technical-contact-handoff.md)) |

### Step 3 — Tell the new developer exactly this

Send them:

1. Link to this repo: `https://github.com/DCCI-Ministries/dcci-website`  
2. Branch: **`master`**  
3. Confirmation that you added them to **GitHub + Firebase** (and Cloudflare if you can)  
4. Link to: [docs/technical-contact-handoff.md](docs/technical-contact-handoff.md)  
5. Ask them to install with **`npm ci`** (not random `npm install` guesses) after cloning `master`

You can copy-paste:

```text
Please take over the DCCI Ministries website.
Repo: https://github.com/DCCI-Ministries/dcci-website
Branch: master
I have added you to GitHub and Firebase (and Cloudflare if applicable).
Start with docs/technical-contact-handoff.md and docs/DCCI-EMERGENCY-LEGACY-README.md.
Clone master, then use npm ci (and npm ci inside public-site/ and functions/ as needed).
```

### Step 4 — After the new developer is in

They will update the technical email in site config and deploy. You should confirm:

- [ ] A test contact-form message still reaches **you** (Hatun), not the old developer  
- [ ] You can still log into the admin area  
- [ ] Old developer access is removed when you are ready  

---

## If you are the new developer — get the project running

1. Confirm the owner added you to **GitHub** + **Firebase** (and Cloudflare / Brevo as needed).  
2. Clone **latest `master`**:

```bash
git clone https://github.com/DCCI-Ministries/dcci-website.git
cd dcci-website
git checkout master
git pull
```

3. Install dependencies (locked versions):

```bash
npm ci
cd public-site && npm ci && cd ..
cd functions && npm ci && cd ..
```

4. Create local config files from examples (do **not** commit secrets):

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
cp src/environments/environment.prod.example.ts src/environments/environment.prod.ts
# Also restore config/site-contacts.json from the owner / Package B / GitHub secret SITE_CONTACTS_JSON
```

5. Follow **[docs/technical-contact-handoff.md](docs/technical-contact-handoff.md)** (change `technicalAdminEmail`, succession chain, deploy).  
6. Full emergency map: **[docs/DCCI-EMERGENCY-LEGACY-README.md](docs/DCCI-EMERGENCY-LEGACY-README.md)**  
7. Priorities (privacy / Brevo / legacy package): **[docs/site-priority-roadmap.md](docs/site-priority-roadmap.md)**  
8. Local run (after env files exist): `npm run start`  
9. Production build: `npm run build:all` then deploy via Firebase (see docs)

**Node version:** use **Node 20** (see `.nvmrc`).

---

## If the live site is down (quick checks)

1. Phone on mobile data — is it down for everyone?  
2. [Firebase Console](https://console.firebase.google.com) → project **dcci-ministries** → Hosting  
3. [GitHub Actions](https://github.com/DCCI-Ministries/dcci-website/actions) — failed rebuild/deploy?  
4. Details: [docs/emergency-procedures.md](docs/emergency-procedures.md)  
5. Still stuck → email technical maintainer: subject **`Urgent: Hatun Website Question`**

**Do not** delete the Firebase project or change nameservers in panic.

---

# Project overview (for developers)

Open-source codebase for the DCCI Ministries website.

- **Interactive app:** Ionic / Angular (admin CMS, `/welcome`, `/admin`, app routes)  
- **SEO layer:** Astro in `public-site/`  
- **Backend:** Firebase (Hosting, Firestore, Auth, Functions, Storage)  
- **Automation:** YouTube uploads → articles ([functions/YOUTUBE_SETUP.md](functions/YOUTUBE_SETUP.md))  
- **Accessibility-first**; archival “Archives” section  

More docs: [docs/README.md](docs/README.md)

## License

- Code: MIT (see [LICENSE](LICENSE))  
- Content: see [CONTENT-LICENSE.md](CONTENT-LICENSE.md)

## Contributing

PRs welcome. Keep code accessible (WCAG). **Never commit secrets** (API keys, `.env`, real `environment.ts`, real `site-contacts.json`).

## SEO layer (Astro) vs interactive layer (Ionic)

### SEO — `public-site/`

- Crawlable HTML for search engines  
- Build: `cd public-site && npm run build`  
- Dev: `cd public-site && npm run dev`

### Interactive — root `src/app/`

- SPA with auth, CMS, admin  
- Dev: `npm run start`  
- Admin: `/admin/**` (noindex)

### Production build

```bash
npm run build:all
```

Builds Angular/Ionic + Astro and merges into `dist/app/` for Firebase Hosting.

### Security: `firebase-admin`

Server-only. Never import in client/browser code.  
Check: `npm run check:firebase-admin`
