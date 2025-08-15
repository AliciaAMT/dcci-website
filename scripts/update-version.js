const fs = require('fs');
const path = require('path');

// Read package.json to get current version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

console.log(`Updating version to ${currentVersion} in environment files...`);

// Update environment.ts
const envDevPath = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
let envDevContent = fs.readFileSync(envDevPath, 'utf8');
envDevContent = envDevContent.replace(/version:\s*['"][^'"]*['"]/, `version: '${currentVersion}'`);
fs.writeFileSync(envDevPath, envDevContent);

// Update environment.prod.ts
const envProdPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
let envProdContent = fs.readFileSync(envProdPath, 'utf8');
envProdContent = envProdContent.replace(/version:\s*['"][^'"]*['"]/, `version: '${currentVersion}'`);
fs.writeFileSync(envProdPath, envProdContent);

console.log('✅ Version updated in all environment files!');
console.log(`Current version: ${currentVersion}`);
