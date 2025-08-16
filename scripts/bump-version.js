const fs = require('fs');
const path = require('path');

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Parse current version
const currentVersion = packageJson.version;
const versionParts = currentVersion.split('.').map(Number);

// Bump patch version
versionParts[2] = versionParts[2] + 1;
const newVersion = versionParts.join('.');

console.log(`Bumping version from ${currentVersion} to ${newVersion}...`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Package.json updated to version ${newVersion}`);

// Now update environment files
const envDevPath = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
let envDevContent = fs.readFileSync(envDevPath, 'utf8');
envDevContent = envDevContent.replace(/version:\s*['"][^'"]*['"]/, `version: '${newVersion}'`);
fs.writeFileSync(envDevPath, envDevContent);

const envProdPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
let envProdContent = fs.readFileSync(envProdPath, 'utf8');
envProdContent = envProdContent.replace(/version:\s*['"][^'"]*['"]/, `version: '${newVersion}'`);
fs.writeFileSync(envProdPath, envDevContent);

console.log(`✅ Environment files updated to version ${newVersion}`);

console.log(`\n🎉 Version bumped successfully to ${newVersion}!`);
console.log('Ready for build and deployment...');
