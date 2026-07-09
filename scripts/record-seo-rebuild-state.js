/**
 * Records a successful SEO build/deploy in Firestore (Admin SDK — GitHub Actions only).
 *
 * Requires public-site dependencies installed (firebase-admin).
 */

const path = require('path');

const admin = require(path.join(__dirname, '../public-site/node_modules/firebase-admin'));

function initDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)'
    );
  }

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
