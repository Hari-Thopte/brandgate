import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeLocalText } from '../src/lib/localAnalysis.js';
import sample from '../src/data/demo/samples.json' with {type:'json'};

test('local deterministic checks return real source IDs and exact spans', () => {
  const text='A #1 best wellness app with guaranteed results. The offer ends 2024-01-01.';
  const findings=analyzeLocalText(text,sample[0].text);
  assert.equal(findings.length,3);
  for(const finding of findings){
    assert.equal(text.slice(finding.span_start,finding.span_end),finding.span_text);
    assert.ok(finding.source_id);
    assert.ok(['rule','ledger'].includes(finding.source_type));
  }
});

test('sample copy loads six validated stored findings', () => {
  const findings=analyzeLocalText(sample[0].text,sample[0].text);
  assert.equal(findings.length,6);
  assert.ok(findings.every(finding=>sample[0].text.slice(finding.span_start,finding.span_end)===finding.span_text));
});

test('expired-offer saved analysis preserves its exact ledger span', () => {
  const copy=sample.find(row=>row.id==='expired').text;
  const findings=analyzeLocalText(copy,sample[0].text);
  assert.equal(findings.length,1);
  assert.equal(findings[0].source_id,'ledger-offer');
  assert.equal(copy.slice(findings[0].span_start,findings[0].span_end),findings[0].span_text);
});
