import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewScores } from '../src/lib/reviewScore.js';

test('review heuristic is deterministic and caps open high findings', () => {
  const findings = Array.from({ length: 4 }, (_, index) => ({ id: String(index), status: 'open', severity: 'high', source_type: 'rule', category: 'style', source_id: 'rule-test' }));
  const first = reviewScores(findings, 'A campaign copy.');
  assert.deepEqual(first, reviewScores(findings, 'A campaign copy.'));
  assert.equal(first.overall, 40);
  assert.ok(first.compliance <= 49);
});

test('decided findings no longer reduce open-risk signals', () => {
  assert.equal(reviewScores([{ status: 'accepted', severity: 'high', source_type: 'ledger', category: 'fact' }]).overall, 100);
});
