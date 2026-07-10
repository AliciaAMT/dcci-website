/**
 * Build script that:
 * 1. Builds Angular to dist/app
 * 2. Builds Astro to dist/public-site
 * 3. Copies Astro output into dist/app (without overwriting Angular's index.html)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const distAppPath = path.join(__dirname, '..', 'dist', 'app');
const distPublicSitePath = path.join(__dirname, '..', 'dist', 'public-site');

console.log('🚀 Starting build process...\n');

// Step 1: Build Angular
console.log('📦 Step 1: Building Angular app...');
try {
  execSync('npm run build:prod', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Angular build complete\n');
} catch (error) {
  console.error('❌ Angular build failed:', error.message);
  process.exit(1);
}

// Step 2: Build Astro
console.log('📦 Step 2: Building Astro public site...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..', 'public-site') });
  console.log('✅ Astro build complete\n');
} catch (error) {
  console.error('❌ Astro build failed:', error.message);
  process.exit(1);
}

// Step 3: Copy Astro output to dist/app
console.log('📦 Step 3: Copying Astro output to dist/app...');

if (!fs.existsSync(distPublicSitePath)) {
  console.error(`❌ Astro output directory not found: ${distPublicSitePath}`);
  process.exit(1);
}

if (!fs.existsSync(distAppPath)) {
  console.error(`❌ Angular output directory not found: ${distAppPath}`);
  process.exit(1);
}

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      // Skip Angular's index.html - we don't want to overwrite it
      if (entry.name === 'index.html' && dest === distAppPath) {
        console.log(`⚠️  Skipping ${entry.name} (preserving Angular's index.html)`);
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Public /welcome is the Angular interactive page. Do not deploy Astro's
// welcome/index.html or Firebase would serve that static file instead of the SPA.
const skipAstroDirs = new Set(['welcome']);

function removeDirIfExists(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

// Copy all files from dist/public-site to dist/app
try {
  const entries = fs.readdirSync(distPublicSitePath, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(distPublicSitePath, entry.name);
    const destPath = path.join(distAppPath, entry.name);

    if (entry.isDirectory() && skipAstroDirs.has(entry.name)) {
      console.log(`⚠️  Skipping Astro /${entry.name}/ (Angular owns this route)`);
      removeDirIfExists(destPath);
      continue;
    }
    
    if (entry.isDirectory()) {
      // If directory exists, merge contents
      if (fs.existsSync(destPath)) {
        copyDir(srcPath, destPath);
      } else {
        copyDir(srcPath, destPath);
      }
    } else {
      // Skip index.html - preserve Angular's version
      if (entry.name === 'index.html') {
        console.log(`⚠️  Skipping ${entry.name} (preserving Angular's index.html)`);
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }

  // Ensure a leftover Astro welcome folder never shadows Angular /welcome
  removeDirIfExists(path.join(distAppPath, 'welcome'));
  
  console.log('✅ Astro files copied to dist/app\n');
  console.log('📋 Files copied:');
  console.log('   - /welcome/ skipped (Angular interactive page)');
  console.log('   - /articles/ (Astro static page)');
  console.log('   - /articles/[slug]/ (Astro static pages)');
  console.log('   - /sitemap.xml (Astro generated)');
  console.log('   - /robots.txt (Astro generated)');
  console.log('   - All Astro assets\n');
  
  console.log('✅ Build complete! Ready for deployment.');
} catch (error) {
  console.error('❌ Error copying Astro files:', error.message);
  process.exit(1);
}

