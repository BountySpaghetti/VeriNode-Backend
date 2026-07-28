import assert from 'assert';
import { CacheLayer } from '../../src/cache';

async function testTtlExpiry() {
  let now = 1_000;
  const cache = new CacheLayer({ defaultTtlSeconds: 1, clock: () => now });
  await cache.set('answer', { value: 42 });
  assert.deepStrictEqual(await cache.get('answer'), { value: 42 });
  now += 1_001;
  assert.strictEqual(await cache.get('answer'), null);
}

async function testGetOrSet() {
  let loads = 0;
  const cache = new CacheLayer({ defaultTtlSeconds: 60 });
  const first = await cache.getOrSet('key', async () => ++loads);
  const second = await cache.getOrSet('key', async () => ++loads);
  assert.strictEqual(first, 1);
  assert.strictEqual(second, 1);
  assert.strictEqual(loads, 1);
}

async function testMaxEntriesEvictsOldest() {
  const cache = new CacheLayer({ maxEntries: 1, defaultTtlSeconds: 60 });
  await cache.set('a', 'first');
  await cache.set('b', 'second');
  assert.strictEqual(await cache.get('a'), null);
  assert.strictEqual(await cache.get('b'), 'second');
}

async function main() {
  await testTtlExpiry();
  await testGetOrSet();
  await testMaxEntriesEvictsOldest();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
