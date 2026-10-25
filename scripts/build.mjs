// Copies app/ to dist/ and stamps the build's git sha into the page (R6).
// Refuses a dirty tree, because the sha must name exactly the code that ships.
import { execSync } from 'node:child_process';
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const dirty = execSync('git status --porcelain -- app').toString().trim();
if (dirty) {
  console.error(`app/ has uncommitted changes, commit them first:\n${dirty}`);
  process.exit(1);
}
const sha = execSync('git rev-parse HEAD').toString().trim();

rmSync('dist', { recursive: true, force: true });
cpSync('app', 'dist', { recursive: true });
const page = readFileSync('dist/index.html', 'utf8');
if (!page.includes('__BUILD_SHA__')) throw new Error('index.html has no __BUILD_SHA__ placeholder');
writeFileSync('dist/index.html', page.replaceAll('__BUILD_SHA__', sha));
console.log(`dist/ built at ${sha}`);
