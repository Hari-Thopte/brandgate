import test from 'node:test';
import assert from 'node:assert/strict';
import { orderFindingsByCopyPosition } from '../src/lib/findingOrder.js';

test('copy-position ordering keeps finding numbers aligned with source spans', () => {
  const input = [
    { id: 'late', span_start: 45 },
    { id: 'middle', span_start: 20 },
    { id: 'first', span_start: 2 },
    { id: 'last', span_start: 77 },
  ];
  const ordered = orderFindingsByCopyPosition(input);
  assert.deepEqual(ordered.map(({ id }, index) => [index + 1, id]), [[1, 'first'], [2, 'middle'], [3, 'late'], [4, 'last']]);
  assert.deepEqual(input.map(({ id }) => id), ['late', 'middle', 'first', 'last']);
});
