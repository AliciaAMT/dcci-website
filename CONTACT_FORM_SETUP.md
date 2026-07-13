# Contact Form Setup Guide

This guide covers the DCCI Ministries contact form: email delivery, privacy, security, and deployment.

## Overview

| Item | Detail |
|------|--------|
| **Component** | `src/app/components/contact-form.component.*` (shared by Home + Welcome) |
| **Service** | `src/app/services/contact.service.ts` |
| **Cloud Function** | `submitContactForm` (+ `retryFailedContactEmails`, `cleanupContactRetryPayloads`) |
| **Recipient** | `hatun@dcciministries.com` (`config/site-contacts.json` → `contactFormRecipientEmail`) |
| **Sender (Brevo)** | `contact@dcciministries.com` / `DCCI Ministries` via Secret `BREVO_API_KEY` |
| **Problem reports / recovery / newsletter** | Still Gmail SMTP (`mail.user` / `mail.pass`) — not migrated yet |
| **Tech support (visitor-facing on delivery failure)** | `admin@accessiblewebmedia.com` |

## Design philosophy

**Firestore is an operational audit log, not a mailbox.**

It answers: Did the submission reach the backend? Was delivery attempted? Delivered? Why failed? Recovered?

It does **not** permanently archive visitor communications.

## Email flow

1. Visitor submits on **Home** (`sourcePage: home`) or **Welcome** (`sourcePage: welcome`) — same component/backend
2. Cloud Function validates, honeypot, optional App Check, cooldown/repeat (via hashes)
3. Writes **metadata only** to `contactDeliveryEvents` (hashes + delivery fields + `sourcePage`)
4. Sends via **Brevo** to Hatun with Reply-To = visitor (no CC/BCC to Alicia)
5. **Success:** mark delivered; no retry payload
6. **Failure:** log failure metadata; store **encrypted** temporary payload in `contactRetryPayloads`; return HTTP **200** with `delivered: false`
7. Scheduled retry every 15 minutes; on success mark recovered and delete payload after ~1 hour
8. Expired pending payloads deleted after **48 hours** (`cleanupContactRetryPayloads`)

### API response (success path always HTTP 200 if request accepted)

```json
{ "success": true, "delivered": true, "contactId": "...", "errorType": null }
```

```json
{ "success": true, "delivered": false, "contactId": "...", "errorType": "delivery_failed" }
```

Frontend shows success **only if** `delivered === true`. On delivery failure the form fields stay filled.

Validation / spam / cooldown still return **4xx**.

## Firestore collections

| Collection | Purpose | Client access |
|------------|---------|---------------|
| `contactDeliveryEvents` | Permanent audit metadata | Admin read only |
| `contactDeliveryFailures` | Failure summaries (no body) | Admin read only |
| `contactRetryPayloads` | Encrypted temporary recovery | **None** (Admin SDK only) |
| `contactOperationalAlerts` | Single alert if ≥5 failures / 30 min | Admin read only |
| `contacts` | **Legacy** only — not written by new submits | Admin read; cleanup later |
| `subscribers` | Newsletter opt-in (explicit consent) | Public create |

Retry encryption key material: **required** Firebase secret `CONTACT_RETRY_ENCRYPTION_KEY` (64 hex chars). Hash pepper: **required** `CONTACT_HASH_SECRET`. Never derive from `BREVO_API_KEY`. See [docs/contact-form-secrets-and-ops.md](./docs/contact-form-secrets-and-ops.md).

### Cleanup mechanism

`cleanupContactRetryPayloads` runs hourly and deletes documents where `deleteAfter <= now`:

- After successful retry: status `recovered`, `deleteAfter` ≈ now + **1 hour**
- Pending never recovered: `deleteAfter` ≈ created + **48 hours**

## App Check

`submitContactForm` calls `verifyAppCheckToken`:

- Invalid token → **401**
- Missing token → allowed unless `firebase functions:config:set security.enforce_app_check="true"`

## Health monitoring

If ≥5 rows land in `contactDeliveryFailures` within 30 minutes and no matching open alert exists in that window, one `contactOperationalAlerts` document is created. No email flood.

## Setup / deploy

```bash
cd functions && npm run build
FUNCTIONS_DISCOVERY_TIMEOUT=60 npx firebase deploy --only \
  functions:submitContactForm,functions:retryFailedContactEmails,functions:cleanupContactRetryPayloads,functions:getContactStats \
  --project dcci-ministries
firebase deploy --only firestore:rules,firestore:indexes --project dcci-ministries
# After Angular hosting build (UI changes):
# firebase deploy --only hosting --project dcci-ministries
```

Keep Gmail `mail.*` for recovery / newsletter / problem reports until those are migrated.

## Email format Hatun receives

- **To:** Hatun  
- **From:** `DCCI Ministries <contact@dcciministries.com>`  
- **Reply-To:** Visitor  
- **Body:** Name, email, subject, source page, message  
- **Footer:** mailto links to `technicalAdminEmail` for Hatun to report issues (not automatic copies)

## Security features

Honeypot, fill-time checks, blocklist, cooldown, repeat-message fingerprints, Brevo delivery, server-only retry payloads.
