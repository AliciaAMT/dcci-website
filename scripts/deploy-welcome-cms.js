#!/usr/bin/env node

/**
 * Deploy Firebase backend required for the Welcome Page CMS:
 * - Firestore rules (siteSettings/welcome, adminSettings drafts/versions)
 * - Storage rules (welcome-page image uploads)
 * - onWelcomePageUpdate Cloud Function (Astro SEO rebuild on publish)
 *
 * Usage:
 *   node scripts/deploy-welcome-cms.js
 *   node scripts/deploy-welcome-cms.js --skip-function
 *   node scripts/deploy-welcome-cms.js --project dcci-ministries-staging
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skipFunction = process.argv.includes('--skip-function');
const projectFlag = (() => {
  const i = process.argv.indexOf('--project');
  return i >= 0 && process.argv[i + 1] ? ` --project ${process.argv[i + 1]}` : '';
})();

function run(command, description, cwd = root) {
  console.log(`\n🔄 ${description}...`);
  execSync(command, { stdio: 'inherit', cwd });
  console.log(`✅ ${description}`);
}

function syncJson(from, to) {
  if (!fs.existsSync(from)) {
    throw new Error(`Missing config file: ${from}`);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

try {
  console.log('🚀 Welcome CMS — production backend deploy\n');

  syncJson(
    path.join(root, 'config/site-contacts.json'),
    path.join(root, 'functions/src/config/site-contacts.json')
  );
  console.log('✅ Synced config/site-contacts.json → functions/src/config/site-contacts.json');

  run('npm run build', 'Build Cloud Functions', path.join(root, 'functions'));

  run(
    `firebase deploy --only firestore:rules,storage${projectFlag}`,
    'Deploy Firestore + Storage rules'
  );

  if (!skipFunction) {
    run(
      `firebase deploy --only functions:onWelcomePageUpdate${projectFlag}`,
      'Deploy onWelcomePageUpdate function'
    );
  } else {
    console.log('\n⏭️  Skipped functions:onWelcomePageUpdate (--skip-function)');
  }

  console.log('\n✅ Welcome CMS backend is deployed.');
  console.log('\nNext steps:');
  console.log('  1. Deploy hosting so the admin UI is live:  npm run ld');
  console.log('  2. Log in as full Admin → Admin Dashboard → Welcome Page');
  console.log('  3. Save draft → Preview → Publish when ready');
  console.log('  4. Confirm GitHub secrets for Astro rebuild (if using workflow):');
  console.log('     FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, SITE_URL');
} catch (error) {
  console.error('\n❌ Welcome CMS deploy failed:', error.message);
  process.exit(1);
}
