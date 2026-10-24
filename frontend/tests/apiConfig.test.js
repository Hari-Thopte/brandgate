import test from 'node:test';
import assert from 'node:assert/strict';
import { getApiBaseUrl } from '../src/lib/apiConfig.js';

test('local development uses the local API when unset', () => {
  assert.equal(getApiBaseUrl('', false), 'http://127.0.0.1:8000');
});

test('production never silently targets localhost when API URL is unset', () => {
  assert.equal(getApiBaseUrl('', true), '');
});

test('configured API base trims whitespace and trailing slashes', () => {
  assert.equal(getApiBaseUrl(' https://api.example.test/// ', true), 'https://api.example.test');
});

test('production rejects insecure and local API hosts', () => {
  assert.equal(getApiBaseUrl('http://api.example.test', true), '');
  assert.equal(getApiBaseUrl('http://127.0.0.1:8000', true), '');
  assert.equal(getApiBaseUrl('not a URL', true), '');
});

test('development allows an explicitly configured local API', () => {
  assert.equal(getApiBaseUrl('http://localhost:8000/', false), 'http://localhost:8000');
});
