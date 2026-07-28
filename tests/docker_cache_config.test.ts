import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const output = execFileSync(process.execPath, ['scripts/validate-docker-cache-config.cjs'], {
  encoding: 'utf8',
});

assert.match(output, /Docker cache CI configuration is valid\./);
console.log('docker_cache_config tests passed');
