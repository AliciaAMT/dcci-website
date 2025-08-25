#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log(`🚀 Major Version Bump + Deploy to PRODUCTION`);

// Read current package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Parse version components
const versionParts = currentVersion.split('.').map(Number);
let [major, minor, patch] = versionParts;

// Bump major version
major++;
minor = 0; // Reset minor to 0
patch = 0;  // Reset patch to 0

// Create new version
const newVersion = `${major}.${minor}.${patch}`;

console.log(`📦 Current version: ${currentVersion}`);
console.log(`📦 New version: ${newVersion} (Major bump)`);

// Confirm with user
console.log(`\n⚠️  This will:`);
console.log(`   1. Bump MAJOR version from ${currentVersion} to ${newVersion}`);
console.log(`   2. Update all environment files`);
console.log(`   3. Deploy to PRODUCTION (LIVE)`);
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
    console.log(`\n🔄 Starting major version bump and deployment...`);

    // 1. Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json to version ${newVersion}`);

    // 2. Update all environment files
    console.log(`🔄 Updating environment files...`);
    execSync('node scripts/update-version.js', { stdio: 'inherit' });

    // 3. Deploy to production
    console.log(`🚀 Deploying to PRODUCTION...`);
    execSync('npm run ld', { stdio: 'inherit' });

    console.log(`\n🎉 SUCCESS!`);
    console.log(`✅ Major version bumped to ${newVersion}`);
    console.log(`✅ Deployed to PRODUCTION (LIVE)`);
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
