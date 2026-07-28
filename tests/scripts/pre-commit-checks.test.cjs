'use strict';

const assert = require('assert');
const { mkdtempSync, rmSync, writeFileSync } = require('fs');
const os = require('os');
const path = require('path');
const { scanFiles, shouldReadAsText } = require('../../scripts/pre-commit-checks.cjs');

const dir = mkdtempSync(path.join(os.tmpdir(), 'verinode-precommit-'));
try {
  process.chdir(dir);

  writeFileSync('clean.ts', 'export const ok = true;\n');
  assert.deepStrictEqual(scanFiles(['clean.ts']), []);

  writeFileSync('debug.ts', 'console.log("debug");\n');
  assert(scanFiles(['debug.ts']).some((failure) => failure.includes('debug')));

  writeFileSync('secret.env', 'PRIVATE_KEY=value\n');
  assert.strictEqual(shouldReadAsText('secret.env'), true);

  writeFileSync('secret.ts', 'const private_key = "value";\n');
  assert(scanFiles(['secret.ts']).some((failure) => failure.includes('secret')));

  writeFileSync('conflict.md', '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> branch\n');
  assert(scanFiles(['conflict.md']).some((failure) => failure.includes('merge conflict')));

  writeFileSync('space.ts', 'const value = 1; \n');
  assert(scanFiles(['space.ts']).some((failure) => failure.includes('trailing whitespace')));

  writeFileSync('large.ts', '123456');
  assert(scanFiles(['large.ts'], { maxBytes: 5 }).some((failure) => failure.includes('exceeds')));

  console.log('pre-commit checks tests passed');
} finally {
  process.chdir(path.dirname(dir));
  rmSync(dir, { recursive: true, force: true });
}
