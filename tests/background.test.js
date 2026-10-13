import test from 'node:test';
import assert from 'node:assert/strict';

const storage = {};
let listener;
globalThis.chrome = {
  storage: { local: {
    get: async key => ({ [key]: structuredClone(storage[key]) }),
    set: async value => Object.assign(storage, structuredClone(value))
  } },
  runtime: { id: 'test-extension', onMessage: { addListener: fn => { listener = fn; } } }
};
await import('../extension/background.js');
const request = type => new Promise(resolve => listener({ type }, { id: 'test-extension' }, resolve));

test('shares simultaneous hotspot requests and preserves conditional cache', async () => {
  let count = 0;
  globalThis.fetch = async () => {
    count++;
    await new Promise(resolve => setTimeout(resolve, 5));
    return Response.json({ items: [1, 2, 3, 4].map(rank => ({ rank, title: `item ${rank}` })) }, { headers: { ETag: 'v1', 'Cache-Control': 's-maxage=60' } });
  };
  const [first, second] = await Promise.all([request('news'), request('news')]);
  assert.equal(count, 1); assert.equal(first.data.items.length, 3); assert.deepEqual(first, second);
  await request('news'); assert.equal(count, 1);
  storage.newsCache.retryAt = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers['If-None-Match'], 'v1');
    return new Response(null, { status: 304 });
  };
  const result = await request('news');
  assert.deepEqual(result.data.items, first.data.items); assert.equal(result.data.error, '');
});

test('keeps old headlines and honors server backoff on 503', async () => {
  storage.newsCache.retryAt = 0;
  const before = Date.now();
  globalThis.fetch = async () => new Response(null, { status: 503, headers: { 'Retry-After': '900' } });
  const result = await request('news');
  assert.equal(result.data.items.length, 3);
  assert.ok(result.data.retryAt >= before + 900000);
  assert.match(result.data.error, /503/);
});

test('reports upstream bot protection and request id without losing cached titles', async () => {
  storage.newsCache.retryAt = 0;
  globalThis.fetch = async () => Response.json({ error: 'blocked', requestId: 'request-123' }, { status: 567 });
  const result = await request('news');
  assert.equal(result.data.items.length, 3); assert.match(result.data.error, /request-123/);
});

test('expired DayMark login produces an explicit error instead of tasks', async () => {
  storage.settings = { daymarkUrl: 'https://plan.example.com' };
  globalThis.fetch = async () => new Response(null, { status: 401 });
  const result = await request('daymark');
  assert.match(result.error, /登录/); assert.equal(result.data, undefined);
});
