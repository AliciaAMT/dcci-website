#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read package.json to get current version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

console.log(`🔄 Updating version to ${currentVersion} in all environment files...`);

// List of environment files to update
const envFiles = [
  'src/environments/environment.ts',
  'src/environments/environment.prod.ts',
  'src/environments/environment.test.ts',
  'src/environments/environment.prod.test.ts',
  'src/environments/environment.example.ts'
];

// Function to update version in a file
function updateVersionInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if version property already exists
    if (content.includes('version:')) {
      // Update existing version
      content = content.replace(
        /version:\s*['"][^'"]*['"]/g,
        `version: '${currentVersion}'`
      );
    } else {
      // Add version property after production
      content = content.replace(
        /(production:\s*(?:true|false),)/g,
        `$1\n  version: '${currentVersion}',`
      );
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Update all environment files
let successCount = 0;
envFiles.forEach(filePath => {
  if (updateVersionInFile(filePath)) {
    successCount++;
  }
});

console.log(`\n🎉 Version update complete!`);
console.log(`✅ Successfully updated ${successCount}/${envFiles.length} files`);
console.log(`📦 Current version: ${currentVersion}`);

// Instructions for manual update if needed
console.log(`\n💡 To update version manually:`);
console.log(`   1. Update version in package.json`);
console.log(`   2. Run: node scripts/update-version.js`);
console.log(`   3. Or manually update the 'version' property in each environment file`); 