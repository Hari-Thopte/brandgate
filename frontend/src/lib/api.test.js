import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClientError, requestApi } from './api.js';

const ok = () => new Response(JSON.stringify({ status: 'ready' }), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'server-id' } });

test('API client records server request IDs and live response time', async () => {
  const states = [];
  const data = await requestApi('/ready', { configuredUrl: 'http://127.0.0.1:8000', fetchImpl: async () => ok(), onConnection: state => states.push(state) });
  assert.equal(data.status, 'ready');
  assert.equal(states.at(-1).status, 'live');
  assert.equal(states.at(-1).requestId, 'server-id');
});

test('GET retries a transient network failure, while POST is attempted once', async () => {
  let getCalls = 0;
  await requestApi('/ready', { configuredUrl: 'http://localhost:8000', fetchImpl: async () => { getCalls += 1; if (getCalls === 1) throw new TypeError('offline'); return ok(); }, sleep: async () => {} });
  assert.equal(getCalls, 2);
  let postCalls = 0;
  await assert.rejects(requestApi('/items', { configuredUrl: 'http://localhost:8000', method: 'POST', body: '{}', fetchImpl: async () => { postCalls += 1; throw new TypeError('offline'); }, sleep: async () => {} }), ApiClientError);
  assert.equal(postCalls, 1);
});

test('Pydantic client errors are surfaced without retry or offline ambiguity', async () => {
  let calls = 0;
  await assert.rejects(requestApi('/items', { configuredUrl: 'http://localhost:8000', method: 'POST', body: '{}', fetchImpl: async () => { calls += 1; return new Response(JSON.stringify({ detail: 'Text is required.' }), { status: 422, headers: { 'Content-Type': 'application/json' } }); } }), error => error instanceof ApiClientError && error.kind === 'http_client' && error.status === 422 && error.message === 'Text is required.');
  assert.equal(calls, 1);
});
