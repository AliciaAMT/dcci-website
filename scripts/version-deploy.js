#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get target environment from command line args
const targetEnv = process.argv[2] || 'production';
const validEnvs = ['staging', 'production'];

if (!validEnvs.includes(targetEnv)) {
  console.error('❌ Invalid environment. Use "staging" or "production"');
  console.error('Usage: node scripts/version-deploy.js [staging|production]');
  process.exit(1);
}

console.log(`🚀 Version Bump + Full-Stack Deploy to ${targetEnv.toUpperCase()}`);

// Read current package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Parse version components
const versionParts = currentVersion.split('.').map(Number);
let [major, minor, patch] = versionParts;

// Bump patch version
patch++;

// Create new version
const newVersion = `${major}.${minor}.${patch}`;

console.log(`📦 Current version: ${currentVersion}`);
console.log(`📦 New version: ${newVersion}`);

// Confirm with user
console.log(`\n⚠️  This will:`);
console.log(`   1. Bump version from ${currentVersion} to ${newVersion}`);
console.log(`   2. Update all environment files`);
console.log(`   3. Sync GitHub Actions secrets (ENVIRONMENT_PROD_TS, ENVIRONMENT_TS, …)`);
console.log(`   4. Deploy FULL STACK to ${targetEnv.toUpperCase()}:`);
console.log(`      - Hosting (Angular + Astro)`);
console.log(`      - Cloud Functions`);
console.log(`      - Firestore rules + indexes`);
console.log(`      - Storage rules`);
console.log(`\nPress Enter to continue or Ctrl+C to cancel...`);

// Wait for user input
process.stdin.setRawMode(false);
process.stdin.resume();
process.stdin.on('data', () => {
  process.stdin.pause();
  proceedWithUpdate();
});

function proceedWithUpdate() {
  try {
    console.log(`\n🔄 Starting version bump and full-stack deployment...`);

    // 1. Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json to version ${newVersion}`);

    // 2. Update all environment files
    console.log(`🔄 Updating environment files...`);
    execSync('node scripts/update-version.js', { stdio: 'inherit' });

    // 3. Sync gitignored env files into GitHub Actions secrets (nightly rebuild)
    console.log(`🔐 Syncing GitHub Actions CI secrets...`);
    execSync('node scripts/sync-github-ci-secrets.js --strict', { stdio: 'inherit' });

    // 4. Full-stack deploy (hosting + functions + firestore + storage)
    console.log(`🚀 Full-stack deploying to ${targetEnv}...`);
    execSync(`node scripts/deploy.js ${targetEnv} --full-stack`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT || '60',
      },
    });

    console.log(`\n🎉 SUCCESS!`);
    console.log(`✅ Version bumped to ${newVersion}`);
    console.log(`✅ GitHub CI env secrets synced`);
    console.log(`✅ Full stack deployed to ${targetEnv.toUpperCase()}`);
    console.log(`📱 Users will now see Version: ${newVersion} in the footer`);

  } catch (error) {
    console.error(`\n❌ ERROR during deployment:`);
    console.error(error.message);

    // Revert package.json if deployment failed
    try {
      packageJson.version = currentVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`🔄 Reverted package.json to ${currentVersion}`);
    } catch (revertError) {
      console.error(`❌ Failed to revert package.json:`, revertError.message);
    }

    process.exit(1);
  }
}
