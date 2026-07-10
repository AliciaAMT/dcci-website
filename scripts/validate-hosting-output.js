/**
 * Pre-deploy gate for production Hosting releases.
 * Ensures Angular owns /, /home, and /welcome (no Astro static takeover).
 * Exit 0 = safe to deploy; exit 1 = abort (keeps current live Hosting release).
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const distApp = path.join(root, 'dist', 'app');
const firebasePath = path.join(root, 'firebase.json');

const errors = [];

function fail(message) {
  errors.push(message);
}

if (!fs.existsSync(path.join(distApp, 'index.html'))) {
  fail('Missing dist/app/index.html (Angular SPA shell required).');
}

if (fs.existsSync(path.join(distApp, 'home', 'index.html'))) {
  fail('Found dist/app/home/index.html — Astro must not take over /home.');
}

if (fs.existsSync(path.join(distApp, 'welcome', 'index.html'))) {
  fail('Found dist/app/welcome/index.html — Astro must not take over /welcome.');
}

if (!fs.existsSync(firebasePath)) {
  fail('Missing firebase.json.');
} else {
  const hosting = JSON.parse(fs.readFileSync(firebasePath, 'utf8')).hosting || {};
  const rewrites = hosting.rewrites || [];

  function rewriteDest(source) {
    const rule = rewrites.find((r) => r.source === source);
    return rule ? rule.destination : null;
  }

  for (const source of ['/', '/home', '/welcome']) {
    const dest = rewriteDest(source);
    if (dest !== '/index.html') {
      fail(
        `firebase.json rewrite for "${source}" must be "/index.html" (got ${JSON.stringify(dest)}).`
      );
    }
  }
}

if (errors.length) {
  console.error('Hosting validation failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('Hosting validation passed:');
console.log('  - dist/app/index.html present');
console.log('  - dist/app/home/index.html absent');
console.log('  - dist/app/welcome/index.html absent');
console.log('  - /, /home, /welcome rewrite to /index.html');
process.exit(0);
