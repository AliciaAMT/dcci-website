#!/usr/bin/env node

/**
 * Sync gitignored local files into GitHub Actions secrets used by
 * .github/workflows/rebuild-astro.yml before build:all.
 *
 * Secrets updated (when local files exist):
 *   ENVIRONMENT_PROD_TS  <- src/environments/environment.prod.ts
 *   ENVIRONMENT_TS       <- src/environments/environment.ts
 *   SITE_CONTACTS_JSON   <- config/site-contacts.json
 *
 * Requires GitHub CLI (`gh`) authenticated with secret write access.
 * Usage:
 *   node scripts/sync-github-ci-secrets.js
 *   node scripts/sync-github-ci-secrets.js --strict   # exit 1 if gh missing/fails
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STRICT = process.argv.includes('--strict');

const DEFAULT_REPO = 'DCCI-Ministries/dcci-website';

const SECRET_FILES = [
  {
    secret: 'ENVIRONMENT_PROD_TS',
    file: path.join(ROOT, 'src', 'environments', 'environment.prod.ts'),
    required: true,
  },
  {
    secret: 'ENVIRONMENT_TS',
    file: path.join(ROOT, 'src', 'environments', 'environment.ts'),
    required: true,
  },
  {
    secret: 'SITE_CONTACTS_JSON',
    file: path.join(ROOT, 'config', 'site-contacts.json'),
    required: false,
  },
];

function fail(message) {
  console.error(`❌ ${message}`);
  if (STRICT) {
    process.exit(1);
  }
  return false;
}

function resolveGhCli() {
  const candidates = [
    'gh',
    'gh.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'GitHub CLI', 'gh.exe'),
    path.join(process.env['ProgramFiles'] || '', 'GitHub CLI', 'gh.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'GitHub CLI', 'gh.exe'),
  ];

  for (const candidate of candidates) {
    if (!candidate || candidate === path.sep) continue;
    try {
      if (candidate.includes(path.sep) && !fs.existsSync(candidate)) {
        continue;
      }
      const result = spawnSync(candidate, ['--version'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      if (result.status === 0) {
        return candidate;
      }
    } catch {
      // try next
    }
  }
  return null;
}

function resolveRepo(gh) {
  try {
    const fromRemote = execSync(`${quote(gh)} repo view --json nameWithOwner -q .nameWithOwner`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (fromRemote) {
      return fromRemote;
    }
  } catch {
    // fall through
  }
  return DEFAULT_REPO;
}

function quote(cmd) {
  return cmd.includes(' ') ? `"${cmd}"` : cmd;
}

function setSecretFromFile(gh, repo, secretName, filePath) {
  const result = spawnSync(
    gh,
    ['secret', 'set', secretName, '--repo', repo, '--body-file', filePath],
    {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  if (result.status !== 0) {
    // Older gh may not support --body-file; fall back to stdin redirect via shell
    try {
      const body = fs.readFileSync(filePath);
      const fallback = spawnSync(gh, ['secret', 'set', secretName, '--repo', repo], {
        cwd: ROOT,
        encoding: 'utf8',
        input: body,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      if (fallback.status !== 0) {
        throw new Error((fallback.stderr || result.stderr || 'gh secret set failed').toString().trim());
      }
      return;
    } catch (err) {
      throw new Error(err.message || String(err));
    }
  }
}

function main() {
  console.log('🔐 Syncing GitHub Actions CI secrets from local env/config files...');

  const gh = resolveGhCli();
  if (!gh) {
    return fail(
      [
        'GitHub CLI (`gh`) not found — cannot update ENVIRONMENT_PROD_TS automatically.',
        'Install: https://cli.github.com/ then run: gh auth login',
        'Or update secrets manually in GitHub → Settings → Secrets → Actions',
        '  ENVIRONMENT_PROD_TS = full contents of src/environments/environment.prod.ts',
        '  ENVIRONMENT_TS      = full contents of src/environments/environment.ts',
      ].join('\n   ')
    );
  }

  const repo = resolveRepo(gh);
  console.log(`📍 Repo: ${repo}`);
  console.log(`🛠️  gh: ${gh}`);

  let synced = 0;
  for (const item of SECRET_FILES) {
    if (!fs.existsSync(item.file)) {
      if (item.required) {
        if (!fail(`Missing required file for ${item.secret}: ${path.relative(ROOT, item.file)}`)) {
          return false;
        }
      } else {
        console.log(`⚠️  Skipping ${item.secret} (file not found): ${path.relative(ROOT, item.file)}`);
      }
      continue;
    }

    try {
      setSecretFromFile(gh, repo, item.secret, item.file);
      console.log(`✅ Updated GitHub secret ${item.secret} ← ${path.relative(ROOT, item.file)}`);
      synced += 1;
    } catch (err) {
      if (
        !fail(
          `Failed to set ${item.secret}: ${err.message}\n` +
            `   Ensure you have admin/secret write access: gh auth login`
        )
      ) {
        return false;
      }
    }
  }

  if (synced === 0) {
    return fail('No GitHub CI secrets were updated.');
  }

  console.log(`🎉 Synced ${synced} GitHub Actions secret(s). Nightly rebuild will use the new footer version.`);
  return true;
}

if (require.main === module) {
  const ok = main();
  if (!ok && STRICT) {
    process.exit(1);
  }
  process.exit(ok ? 0 : STRICT ? 1 : 0);
}

module.exports = { main };
