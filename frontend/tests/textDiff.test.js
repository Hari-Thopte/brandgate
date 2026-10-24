import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWordDiff } from '../src/lib/textDiff.js';

test('word diff marks changed words and escapes inserted HTML', () => {
  const diff = renderWordDiff('Use the old phrase.', 'Use a <new> phrase.');
  assert.match(diff, /<del>the<\/del>/);
  assert.match(diff, /<ins>a<\/ins>/);
  assert.match(diff, /&lt;new&gt;/);
  assert.doesNotMatch(diff, /<ins><new><\/ins>/);
});
