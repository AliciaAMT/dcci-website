#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Configuration
const config = {
  staging: {
    name: 'staging',
    projectId: 'dcci-ministries-staging',
    buildConfig: 'test',
    description: 'Staging/Test Environment'
  },
  production: {
    name: 'production',
    projectId: 'dcci-ministries',
    buildConfig: 'production',
    description: 'Live Production Environment'
  }
};

/** Hosting + Functions + Firestore rules/indexes + Storage rules */
const FULL_STACK_TARGETS =
  'hosting,functions,firestore:rules,firestore:indexes,storage';

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };

  console.log(`${colors[type]}${message}${colors.reset}`);
}

function runCommand(command, description, options = {}) {
  try {
    log(`🔄 ${description}...`, 'info');
    const execOptions = {
      stdio: 'inherit',
      encoding: 'utf8',
      cwd: ROOT,
      env: {
        ...process.env,
        // Large functions packages need extra discovery time on Windows
        FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT || '60',
      },
      ...options
    };
    const result = execSync(command, execOptions);
    log(`✅ ${description} completed successfully`, 'success');
    return result;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

/**
 * Prefer local firebase-tools; fall back to global `firebase`.
 * Avoids hard failure when only the project-local CLI is installed.
 */
function resolveFirebaseCli() {
  const candidates = [
    path.join(ROOT, 'node_modules', '.bin', 'firebase.cmd'),
    path.join(ROOT, 'node_modules', '.bin', 'firebase'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return `"${candidate}"`;
    }
  }
  try {
    execSync('firebase --version', { stdio: 'ignore' });
    return 'firebase';
  } catch {
    return null;
  }
}

function copyAstroFiles(src, dest) {
  if (!fs.existsSync(src) || !fs.existsSync(dest)) {
    return;
  }

  // Public /welcome is Angular. Never deploy Astro's welcome/index.html.
  const skipDirs = new Set(['welcome']);

  function removeDirIfExists(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }

  function copyDir(srcDir, destDir) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) {
          continue;
        }
        copyDir(srcPath, destPath);
      } else {
        // Skip Angular's index.html - we don't want to overwrite it
        if (entry.name === 'index.html' && destDir === dest) {
          continue;
        }
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory() && skipDirs.has(entry.name)) {
      log(`⚠️  Skipping Astro /${entry.name}/ (Angular owns this route)`, 'warning');
      removeDirIfExists(destPath);
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      // Skip index.html - preserve Angular's version
      if (entry.name === 'index.html') {
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }

  removeDirIfExists(path.join(dest, 'welcome'));
}

function getCurrentFirebaseProject(firebaseCli) {
  try {
    const result = execSync(`${firebaseCli} use`, {
      encoding: 'utf8',
      cwd: ROOT,
    });
    const match = result.match(/Currently active: (.+)/);
    return match ? match[1].trim() : null;
  } catch (error) {
    return null;
  }
}

function deploy(environment, { fullStack = false } = {}) {
  const env = config[environment];
  if (!env) {
    log(`❌ Unknown environment: ${environment}`, 'error');
    log('Available environments: staging, production', 'info');
    process.exit(1);
  }

  const firebaseCli = resolveFirebaseCli();
  if (!firebaseCli) {
    log('❌ Firebase CLI not found.', 'error');
    log('Install locally: npm install (firebase-tools should be in the project)', 'info');
    log('Or globally: npm install -g firebase-tools', 'info');
    process.exit(1);
  }

  const deployScope = fullStack
    ? `full stack (${FULL_STACK_TARGETS})`
    : 'hosting only';

  log(`🚀 Starting deployment to ${env.description}`, 'info');
  log(`📍 Target: ${env.projectId}`, 'info');
  log(`🔧 Build Configuration: ${env.buildConfig}`, 'info');
  log(`📦 Deploy scope: ${deployScope}`, 'info');
  log(`🛠️  Firebase CLI: ${firebaseCli}`, 'info');

  const currentProject = getCurrentFirebaseProject(firebaseCli);
  log(`📍 Current Firebase project: ${currentProject || 'None'}`, 'info');

  // Build the application (Angular + Astro)
  log(`🏗️  Building for ${env.buildConfig} configuration...`, 'info');
  log(`📦 Building Angular app...`, 'info');
  runCommand(`ng build --configuration ${env.buildConfig}`, `Build Angular for ${env.buildConfig}`);

  // Build Astro public site
  log(`📦 Building Astro public site...`, 'info');
  const publicSitePath = path.join(ROOT, 'public-site');
  runCommand(`npm run build`, `Build Astro site`, { cwd: publicSitePath });

  // Copy Astro output to dist/app (using build-all.js logic)
  log(`📦 Merging Astro output with Angular build...`, 'info');
  const distAppPath = path.join(ROOT, 'dist', 'app');
  const distPublicSitePath = path.join(ROOT, 'dist', 'public-site');

  if (!fs.existsSync(distPublicSitePath)) {
    log(`⚠️  Astro output not found, skipping merge`, 'warning');
  } else if (!fs.existsSync(distAppPath)) {
    log(`⚠️  Angular output not found, skipping merge`, 'warning');
  } else {
    // Copy Astro files to dist/app (preserving Angular's index.html)
    copyAstroFiles(distPublicSitePath, distAppPath);
    log(`✅ Astro files merged successfully`, 'success');
  }

  // Switch to target Firebase project
  log(`🔄 Switching to Firebase project: ${env.projectId}`, 'info');
  runCommand(`${firebaseCli} use ${env.projectId}`, `Switch to ${env.projectId}`);

  // Deploy to Firebase
  const onlyTargets = fullStack ? FULL_STACK_TARGETS : 'hosting';
  log(`🚀 Deploying to Firebase (${onlyTargets})...`, 'info');
  runCommand(
    `${firebaseCli} deploy --only ${onlyTargets} --project ${env.projectId}`,
    fullStack ? 'Firebase full-stack deployment' : 'Firebase hosting deployment'
  );

  log(`🎉 Deployment to ${env.description} completed successfully!`, 'success');
  log(`🌐 Your app is now live at: https://${env.projectId}.web.app`, 'success');
  if (fullStack) {
    log(`✅ Deployed: hosting, functions, firestore rules + indexes, storage rules`, 'success');
  }
}

// Parse command line arguments
const args = process.argv.slice(2).filter((a) => a !== '--');
const fullStack =
  args.includes('--full-stack') ||
  args.includes('--full') ||
  args.includes('full-stack');
const command = args.find((a) => !a.startsWith('--') && a !== 'full-stack');

if (!command) {
  log('❌ No command specified', 'error');
  log('Usage:', 'info');
  log('  npm run td    - Deploy hosting to staging', 'info');
  log('  npm run ld    - Deploy hosting to production', 'info');
  log('  node scripts/deploy.js production --full-stack', 'info');
  log('  node scripts/deploy.js staging --full-stack', 'info');
  process.exit(1);
}

// Map short commands to full environment names
const commandMap = {
  'td': 'staging',
  'ld': 'production',
  'staging': 'staging',
  'production': 'production'
};

const environment = commandMap[command];
if (!environment) {
  log(`❌ Unknown command: ${command}`, 'error');
  log('Available commands: td (test deploy), ld (live deploy), staging, production', 'info');
  log('Optional: --full-stack (hosting + functions + firestore + storage)', 'info');
  process.exit(1);
}

// Start deployment
deploy(environment, { fullStack });
