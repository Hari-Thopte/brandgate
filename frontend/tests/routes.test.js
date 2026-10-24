import test from 'node:test';
import assert from 'node:assert/strict';
import { routeFor } from '../src/lib/routes.js';

test('routes resolve product screens and review audit deep links', () => {
  assert.deepEqual(routeFor('/'), {page:'home'});
  assert.deepEqual(routeFor('/start'), {page:'submit'});
  assert.deepEqual(routeFor('/hub/ledger'), {page:'brand',tab:'Facts Ledger'});
  assert.deepEqual(routeFor('/review/item-42'), {page:'workspace',id:'item-42'});
  assert.deepEqual(routeFor('/review/item-42/audit'), {page:'audit',id:'item-42'});
  assert.deepEqual(routeFor('/hub/health'), {page:'brand',tab:'Health'});
});

test('unknown and malformed review paths resolve to the not found screen', () => {
  assert.deepEqual(routeFor('/not-a-screen'), {page:'notfound'});
  assert.deepEqual(routeFor('/review/%E0%A4%A'), {page:'notfound'});
});
