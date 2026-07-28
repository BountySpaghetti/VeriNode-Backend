const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.resolve(__dirname, '..', '..', 'scripts', 'coverage-enforce.js');

function entry(total, covered) {
  const s = {};
  for (let i = 0; i < total; i += 1) s[i] = i < covered ? 1 : 0;
  return { s };
}

function runGate(coverage, env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-gate-'));
  const coverageJson = path.join(dir, 'coverage-final.json');
  const outputJson = path.join(dir, 'coverage-summary.json');
  fs.writeFileSync(coverageJson, JSON.stringify(coverage));
  const result = spawnSync(process.execPath, [script], {
    env: { ...process.env, COVERAGE_JSON: coverageJson, OUTPUT_JSON: outputJson, ...env },
    encoding: 'utf8',
  });
  return { result, outputJson };
}

const passingCoverage = {
  '/repo/src/blockchain/rpc_client.ts': entry(10, 8),
  '/repo/src/config/loader.ts': entry(10, 8),
};

{
  const { result, outputJson } = runGate(passingCoverage, { COVERAGE_OVERALL_MIN: '75' });
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
  const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
  assert.strictEqual(summary.pass, true);
  assert.strictEqual(summary.overallPct, 80);
}

{
  const { result, outputJson } = runGate(passingCoverage, { COVERAGE_OVERALL_MIN: '90' });
  assert.strictEqual(result.status, 1, result.stdout + result.stderr);
  const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
  assert.strictEqual(summary.overallPass, false);
  assert(summary.failedChecks.some((check) => check.includes('Overall coverage 80% < 90% threshold')));
}
