// One-command version bump across every place the app version lives.
//   npm run bump -- 0.15.0          edit the files, leave them for review
//   npm run bump -- 0.15.0 --tag    also commit + tag v0.15.0 + push (triggers CI)
//
// Updates package.json, package-lock.json (two spots), js/game.js (const VERSION),
// and android/app/build.gradle (versionName). It deliberately does NOT touch:
//   - android versionCode  (Codemagic owns it via PROJECT_BUILD_NUMBER)
//   - sw.js CACHE          (the Pages deploy workflow rewrites it to the commit SHA)
//   - capacitor.config.json (has no version field)
// See CLAUDE.md "Versioning" for the canonical list.
//
// All patterns are validated up front; if any expected match is missing or
// ambiguous the script exits non-zero WITHOUT writing, so a bump is all-or-nothing.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function fail(msg) {
  console.error(`bump-version: ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const newVersion = args[0];
const doTag = args.includes('--tag');

if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  fail('usage: npm run bump -- <major.minor.patch> [--tag]');
}

// Read + plan every edit before writing anything.
const pkgPath = join(root, 'package.json');
const lockPath = join(root, 'package-lock.json');
const gamePath = join(root, 'js', 'game.js');
const gradlePath = join(root, 'android', 'app', 'build.gradle');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const gameSrc = readFileSync(gamePath, 'utf8');
const gradleSrc = readFileSync(gradlePath, 'utf8');

if (pkg.version === newVersion) {
  fail(`already at ${newVersion}; nothing to do`);
}

// js/game.js — exactly one `const VERSION = '...';`
const versionRe = /const VERSION = '[^']*';/g;
const gameMatches = gameSrc.match(versionRe) || [];
if (gameMatches.length !== 1) {
  fail(`expected 1 "const VERSION" in js/game.js, found ${gameMatches.length}`);
}

// android/app/build.gradle — exactly one `versionName "..."`
const versionNameRe = /versionName "[^"]*"/g;
const gradleMatches = gradleSrc.match(versionNameRe) || [];
if (gradleMatches.length !== 1) {
  fail(`expected 1 versionName in build.gradle, found ${gradleMatches.length}`);
}
if (!lock.packages || !lock.packages['']) {
  fail('package-lock.json has no packages[""] entry');
}

// All checks passed — apply edits.
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

lock.version = newVersion;
lock.packages[''].version = newVersion;
writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');

writeFileSync(gamePath, gameSrc.replace(versionRe, `const VERSION = '${newVersion}';`));
writeFileSync(gradlePath, gradleSrc.replace(versionNameRe, `versionName "${newVersion}"`));

console.log(`Bumped to ${newVersion}:`);
console.log('  package.json, package-lock.json (×2), js/game.js, android/app/build.gradle');

if (doTag) {
  const tag = `v${newVersion}`;
  const git = (...a) => execFileSync('git', a, { cwd: root, stdio: 'inherit' });
  git('add', 'package.json', 'package-lock.json', 'js/game.js', 'android/app/build.gradle');
  git('commit', '-m', `chore: bump version to ${newVersion}`);
  git('tag', tag);
  git('push');
  git('push', 'origin', tag);
  console.log(`Committed, tagged ${tag}, and pushed — Codemagic will build both platforms.`);
} else {
  console.log('Review the diff, then commit. Pass --tag to also cut and push the release tag.');
}
