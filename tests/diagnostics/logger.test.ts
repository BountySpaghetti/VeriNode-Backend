import assert from 'node:assert/strict';
import { createLogger, setLoggerServiceName } from '../../src/diagnostics/logger';

function captureStdout(fn: () => void): string[] {
  const originalWrite = process.stdout.write;
  const lines: string[] = [];
  (process.stdout.write as unknown as (chunk: unknown) => boolean) = (chunk: unknown): boolean => {
    lines.push(String(chunk));
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = originalWrite;
  }
  return lines;
}

setLoggerServiceName('verinode-test');

const structuredLines = captureStdout(() => {
  const log = createLogger('unit-test', { 'deployment.environment': 'test' });
  log.info('validator accepted request', {
    'http.request.method': 'POST',
    'url.path': '/v1/validators',
    'http.response.status_code': 202,
  });
});

assert.equal(structuredLines.length, 1);
const infoEntry = JSON.parse(structuredLines[0]);
assert.equal(infoEntry.severity_number, 9);
assert.equal(infoEntry.severity_text, 'INFO');
assert.equal(infoEntry.body, 'validator accepted request');
assert.equal(infoEntry.resource['service.name'], 'verinode-test');
assert.equal(infoEntry.attributes.module, 'unit-test');
assert.equal(infoEntry.attributes['http.request.method'], 'POST');
assert.equal(infoEntry.attributes['url.path'], '/v1/validators');
assert.equal(infoEntry.attributes['http.response.status_code'], 202);

const errorLines = captureStdout(() => {
  const log = createLogger('unit-test');
  log.error('operation failed', new TypeError('bad input'));
});

const errorEntry = JSON.parse(errorLines[0]);
assert.equal(errorEntry.severity_number, 17);
assert.equal(errorEntry.severity_text, 'ERROR');
assert.equal(errorEntry.attributes['error.type'], 'TypeError');
assert.equal(errorEntry.attributes['error.message'], 'bad input');
assert.ok(String(errorEntry.attributes['error.stack']).includes('TypeError'));

console.log('logger semantic convention tests passed');
