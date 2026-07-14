/**
 * Dry-run only: call deployed purgeLegacyContactPii with dryRun:true.
 * Never performs live redaction. Exit after printing counts/paths/IDs.
 *
 * Usage (from repo root, Firebase CLI logged in):
 *   node scripts/run-purge-legacy-contact-pii-dry-run.js
 *
 * Secret is loaded from functions config and is never printed.
 */
'use strict';

const { execSync } = require('child_process');
const https = require('https');

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'dcci-ministries';
const HOST = `us-central1-${PROJECT_ID}.cloudfunctions.net`;
const PATH = '/purgeLegacyContactPii';

function loadRecoverySecret() {
  const raw = execSync(`npx firebase functions:config:get --project ${PROJECT_ID}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const cfg = JSON.parse(raw);
  const secret = cfg?.recovery?.secret;
  if (!secret || typeof secret !== 'string') {
    throw new Error('recovery.secret not found in functions config');
  }
  return secret;
}

function postJson(body) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: HOST,
        path: PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let out = '';
        res.on('data', (c) => (out += c));
        res.on('end', () => resolve({ status: res.statusCode, body: out }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('Dry-run only — will NOT redact or delete. Loading secret (not printed)...');
  const secret = loadRecoverySecret();
  const response = await postJson({ secret, dryRun: true });
  console.log('HTTP status:', response.status);
  try {
    const parsed = JSON.parse(response.body);
    if (parsed && typeof parsed === 'object') {
      // Never echo a secret if the function somehow returned one.
      delete parsed.secret;
    }
    console.log(JSON.stringify(parsed, null, 2));
  } catch {
    console.log('Non-JSON body (truncated):', String(response.body).slice(0, 200));
  }
  if (response.status !== 200) {
    process.exit(1);
  }
  console.log('Dry-run complete. Re-deploy updated function before live purge if source changed.');
  console.log('Live purge is NOT run by this script — authorize separately.');
})().catch((err) => {
  console.error('Dry-run failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
