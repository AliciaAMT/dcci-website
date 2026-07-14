# Contact form secrets & operations

## Secret formats (required)

| Secret | Purpose | Format |
|--------|---------|--------|
| `BREVO_API_KEY` | Brevo API only | Brevo transactional key (`xkeysib-…`) |
| `CONTACT_HASH_SECRET` | HMAC fingerprints only | ≥32 chars high-entropy random (recommend **64 hex** chars) |
| `CONTACT_RETRY_ENCRYPTION_KEY` | AES-256-GCM only | **Exactly 64 hex characters** (32 bytes) |

Do **not** reuse or derive any of these from each other.

Optional non-crypto version marker (defaults to `1` if unset):

| Name | Purpose |
|------|---------|
| `CONTACT_RETRY_KEY_VERSION` | Integer stored on retry docs as `keyVersion`. Increment when you rotate the encryption key **after** pending payloads are drained. |

### Rotation and pending retry payloads

Each `contactRetryPayloads` document stores `keyVersion` with the ciphertext.

- Decrypt requires `doc.keyVersion ===` active `CONTACT_RETRY_KEY_VERSION`.
- If you rotate `CONTACT_RETRY_ENCRYPTION_KEY` without draining the queue **and** bump the version, pending docs become undecryptable until TTL cleanup (48h) deletes them.
- **Safe rotation:** (1) pause or wait until no `status: pending` docs remain, (2) set the new encryption key, (3) set `CONTACT_RETRY_KEY_VERSION` to `N+1`, (4) redeploy functions. Document the old key offline (Package B) only if you must recover mid-flight payloads.

## PowerShell — generate and set secrets (values never printed)

Run from a directory you control. Files are deleted immediately after upload.

```powershell
# CONTACT_HASH_SECRET (64 hex chars)
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $b = New-Object byte[] 32; $rng.GetBytes($b); [System.BitConverter]::ToString($b).Replace('-','').ToLowerInvariant() | Set-Content -NoNewline -Encoding ascii .\contact-hash-secret.txt; firebase functions:secrets:set CONTACT_HASH_SECRET --data-file=.\contact-hash-secret.txt --project dcci-ministries; Remove-Item .\contact-hash-secret.txt -Force

# CONTACT_RETRY_ENCRYPTION_KEY (64 hex chars)
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $b = New-Object byte[] 32; $rng.GetBytes($b); [System.BitConverter]::ToString($b).Replace('-','').ToLowerInvariant() | Set-Content -NoNewline -Encoding ascii .\contact-retry-key.txt; firebase functions:secrets:set CONTACT_RETRY_ENCRYPTION_KEY --data-file=.\contact-retry-key.txt --project dcci-ministries; Remove-Item .\contact-retry-key.txt -Force

# Optional key version (start at 1)
Set-Content -NoNewline -Encoding ascii .\contact-retry-key-version.txt "1"; firebase functions:secrets:set CONTACT_RETRY_KEY_VERSION --data-file=.\contact-retry-key-version.txt --project dcci-ministries; Remove-Item .\contact-retry-key-version.txt -Force
```

`CONTACT_RETRY_KEY_VERSION` is optional; code defaults to `1`. If you set it as a secret, bind it on deploy by adding it to the function `secrets` list (already readable via `process.env` when present).

Bound today on `submitContactForm` and `retryFailedContactEmails`: `BREVO_API_KEY`, `CONTACT_HASH_SECRET`, `CONTACT_RETRY_ENCRYPTION_KEY`.

## App Check (compatibility)

- Invalid token → reject (401)
- Missing token → allow (until you enable strict mode)
- Strict later: `firebase functions:config:set security.enforce_app_check="true" --project dcci-ministries` then redeploy `submitContactForm`. Test **both** Home and Welcome first.

## Scheduled functions

| Function | Schedule | Notes |
|----------|----------|-------|
| `retryFailedContactEmails` | every 15 minutes | Blaze plan; max 5 pending docs/run; claim transaction (`pending`→`sending`); skip if event already `emailDelivered`; max **8** attempts/payload then `exhausted`; no exponential backoff beyond the 15m schedule |
| `cleanupContactRetryPayloads` | every 60 minutes | Deletes where `deleteAfter <= now`; no secrets |

Requires **Firebase Blaze** (pay-as-you-go) for Cloud Scheduler / Pub/Sub scheduled functions.

## Legacy `contacts` purge

New submits never write to `contacts`. Historical docs may still hold plaintext until redacted.

**Dry-run only (Cloud Function — preferred review step):**

```bash
node scripts/run-purge-legacy-contact-pii-dry-run.js
```

**Local Admin SDK dry-run (default; needs ADC):**

```bash
node scripts/purge-legacy-contact-pii.js
# or explicitly:
node scripts/purge-legacy-contact-pii.js --dry-run
```

**Live redaction** — only after you separately authorize:

```bash
# Local (requires gcloud ADC):
node scripts/purge-legacy-contact-pii.js --confirm-live

# Or Cloud Function POST with dryRun omitted/false and recovery.secret in JSON body
# (never put the secret in query strings or commit it).
```

Scope: top-level `contacts` documents only; redacts PII fields; does not delete docs or touch other collections.

## tsconfig.spec.json exclusions (technical debt)

| Excluded file | Why |
|---------------|-----|
| `src/app/services/auth.spec.ts` | Invalid stub: imports non-existent `Auth` export; blocks Karma. Unrelated to contact form. |
| `src/app/services/sanitization.spec.ts` | Invalid stub: imports non-existent `Sanitization` export; blocks Karma. Unrelated to contact form. |

Do not add further exclusions to “make green” without documenting each file.
