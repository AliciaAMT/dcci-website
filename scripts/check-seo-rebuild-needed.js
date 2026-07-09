/**
 * Used by GitHub Actions (scheduled run) to skip full build/deploy when
 * welcome page and published articles have not changed since the last SEO build.
 *
 * Requires public-site dependencies installed (firebase-admin).
 * Env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * Output: sets GITHUB_OUTPUT rebuild=true|false
 */

const fs = require('fs');
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

function toDate(value) {
  if (!value) {
    return null;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return null;
}

function setRebuildOutput(rebuild) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    if (process.env.GITHUB_ACTIONS === 'true') {
      throw new Error('GITHUB_OUTPUT is not set; cannot publish rebuild decision');
    }
    console.log(`(local) rebuild=${rebuild ? 'true' : 'false'}`);
    return;
  }
  fs.appendFileSync(outputFile, `rebuild=${rebuild ? 'true' : 'false'}\n`);
}

async function main() {
  const db = initDb();

  const stateSnap = await db.doc('adminSettings/seoRebuildState').get();
  const lastBuild = stateSnap.exists ? toDate(stateSnap.data().lastSuccessfulBuildAt) : null;

  const welcomeSnap = await db.doc('siteSettings/welcome').get();
  const welcomeData = welcomeSnap.exists ? welcomeSnap.data() : {};
  const welcomeUpdated = toDate(welcomeData.updatedAt) || toDate(welcomeData.publishedAt);

  const articlesSnap = await db
    .collection('content')
    .where('status', '==', 'published')
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get();

  const latestArticleUpdated = articlesSnap.empty
    ? null
    : toDate(articlesSnap.docs[0].data().updatedAt) || toDate(articlesSnap.docs[0].data().publishedAt);

  let rebuild = false;

  if (!lastBuild) {
    console.log('No previous SEO build recorded — rebuild needed.');
    rebuild = true;
  } else {
    console.log(`Last SEO build: ${lastBuild.toISOString()}`);

    if (welcomeUpdated && welcomeUpdated > lastBuild) {
      console.log(`Welcome page updated at ${welcomeUpdated.toISOString()} — rebuild needed.`);
      rebuild = true;
    }

    if (latestArticleUpdated && latestArticleUpdated > lastBuild) {
      console.log(`Latest published article updated at ${latestArticleUpdated.toISOString()} — rebuild needed.`);
      rebuild = true;
    }

    if (!rebuild) {
      console.log('No welcome or published-article changes since last SEO build — skipping deploy.');
    }
  }

  setRebuildOutput(rebuild);
}

main().catch((error) => {
  console.error('SEO rebuild check failed:', error);
  process.exit(1);
});
