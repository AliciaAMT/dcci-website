const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Version Bump + Deploy Process...\n');

try {
  // Step 1: Bump version
  console.log('📦 Step 1: Bumping patch version...');
  execSync('node scripts/bump-version.js', { stdio: 'inherit' });

  // Step 2: Build with Ionic
  console.log('\n🔨 Step 2: Building with Ionic...');
  execSync('ionic build --prod', { stdio: 'inherit' });

  // Step 3: Deploy to Firebase
  console.log('\n🔥 Step 3: Deploying to Firebase...');
  execSync('firebase deploy', { stdio: 'inherit' });

  console.log('\n🎉 SUCCESS! Version bumped, built, and deployed!');
  console.log('Your updated site is now live on Firebase!');

} catch (error) {
  console.error('\n❌ ERROR: Deployment failed!');
  console.error('Error details:', error.message);
  process.exit(1);
}
