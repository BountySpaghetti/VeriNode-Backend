#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const { existsSync, readFileSync, statSync } = require('fs');
const path = require('path');

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set([
  '.cjs', '.env', '.js', '.json', '.md', '.mjs', '.rs', '.sh', '.sql', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);
const SECRET_PATTERN = /(^|[^A-Z0-9_])(password|passwd|private[_-]?key|api[_-]?key|secret[_-]?key|access[_-]?token)([^A-Z0-9_]|$)/i;
const DEBUG_PATTERN = /\b(console\.log|debugger|println!|dbg!|todo!)\b/;
const MERGE_CONFLICT_PATTERN = /^(<<<<<<<|=======|>>>>>>>) /m;

function stagedFiles() {
  const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    encoding: 'utf8',
  });
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function shouldReadAsText(file) {
  return TEXT_EXTENSIONS.has(path.extname(file).toLowerCase());
}

function isHookFixtureOrDocumentation(file) {
  return file === 'scripts/pre-commit-checks.cjs' || file.startsWith('tests/scripts/') || file.startsWith('docs/');
}

function scanFiles(files, options = {}) {
  const maxBytes = options.maxBytes || MAX_FILE_BYTES;
  const failures = [];

  for (const file of files) {
    if (!existsSync(file)) continue;

    const stats = statSync(file);
    if (stats.size > maxBytes) {
      failures.push(`${file}: exceeds ${maxBytes} bytes`);
      continue;
    }

    if (!shouldReadAsText(file)) continue;

    const content = readFileSync(file, 'utf8');
    if (MERGE_CONFLICT_PATTERN.test(content)) failures.push(`${file}: merge conflict marker found`);
    if (!isHookFixtureOrDocumentation(file) && SECRET_PATTERN.test(content)) failures.push(`${file}: potential secret keyword found`);
    if (!isHookFixtureOrDocumentation(file) && DEBUG_PATTERN.test(content)) failures.push(`${file}: debug or TODO statement found`);
    if (/[^\S\r\n]$/m.test(content)) failures.push(`${file}: trailing whitespace found`);
  }

  return failures;
}

function runCommand(command, args, label) {
  process.stdout.write(`pre-commit: ${label}... `);
  execFileSync(command, args, { stdio: 'inherit' });
  process.stdout.write(`pre-commit: ${label} passed\n`);
}

function main() {
  const files = stagedFiles();
  if (files.length === 0) {
    console.log('pre-commit: no staged files to check');
    return;
  }

  const failures = scanFiles(files);
  if (failures.length > 0) {
    console.error('pre-commit: staged file checks failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
  }

  if (process.env.VERINODE_PRECOMMIT_FULL === '1') {
    runCommand('npm', ['run', 'build'], 'TypeScript build');
    runCommand('npm', ['test'], 'test suite');
  } else {
    console.log('pre-commit: staged file checks passed');
    console.log('pre-commit: set VERINODE_PRECOMMIT_FULL=1 to run build and tests before committing');
  }
}

if (require.main === module) main();

module.exports = {
  DEBUG_PATTERN,
  MERGE_CONFLICT_PATTERN,
  SECRET_PATTERN,
  isHookFixtureOrDocumentation,
  scanFiles,
  shouldReadAsText,
};
