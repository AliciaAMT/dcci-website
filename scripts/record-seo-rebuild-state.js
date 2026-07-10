/**
 * Records a successful SEO build/deploy in Firestore (Admin SDK — GitHub Actions only).
 *
 * Requires public-site dependencies installed (firebase-admin).
 * Prefers FIREBASE_SERVICE_ACCOUNT; falls back to split env vars for local use.
 */

const path = require('path');
const { resolveFirebaseAdminCredentials } = require('./resolve-firebase-admin-credentials');

const admin = require(path.join(__dirname, '../public-site/node_modules/firebase-admin'));

function initDb() {
  const { projectId, clientEmail, privateKey } = resolveFirebaseAdminCredentials();

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId
    });
  }

  return admin.firestore();
}

async function main() {
  const db = initDb();
  const trigger = process.env.GITHUB_EVENT_NAME || 'manual';

  await db.doc('adminSettings/seoRebuildState').set(
    {
      lastSuccessfulBuildAt: admin.firestore.FieldValue.serverTimestamp(),
      lastWorkflowRunId: process.env.GITHUB_RUN_ID || null,
      lastTrigger: trigger,
      updatedBy: 'github-actions-rebuild-astro'
    },
    { merge: true }
  );

  console.log(`Recorded successful SEO rebuild (trigger: ${trigger}).`);
}

main().catch((error) => {
  console.error('Failed to record SEO rebuild state:', error);
  process.exit(1);
});
