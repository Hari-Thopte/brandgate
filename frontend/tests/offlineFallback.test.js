import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getValidatedSampleFindings } from '../src/data/offlineFallback.js';

const sample = 'Meet BrightDay, the #1 best wellness app with guaranteed results. Our clinically proven plan helped 10k users. Grab the offer before it expires on 2024-01-01. This thing is totally lit, no cap!';

test('bundled sample fallback has six exact spans and real source IDs', async () => {
  const findings = getValidatedSampleFindings(sample);
  assert.equal(findings.length, 6);
  assert.ok(findings.every(finding => sample.slice(finding.span_start, finding.span_end) === finding.span_text));
  assert.ok(findings.every(finding => finding.source_id && finding.id));
  const fixture = JSON.parse(await readFile(new URL('../src/data/sample-fallback.json', import.meta.url), 'utf8'));
  assert.equal(fixture.length, 6);
  assert.ok(fixture.every(finding => sample.slice(finding.span_start, finding.span_end) === finding.span_text));
});

test('fallback validator drops mismatched spans and unsupported sources', async () => {
  const fixture = JSON.parse(await readFile(new URL('../src/data/sample-fallback.json', import.meta.url), 'utf8'));
  const ungrounded = [{ ...fixture[0], source_id:'unknown-rule' }, { ...fixture[1], span_text:'different text' }];
  assert.deepEqual(getValidatedSampleFindings(sample, ungrounded), []);
  assert.deepEqual(getValidatedSampleFindings('Unrelated copy.'), []);
});
