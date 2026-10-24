import sampleFallback from './sample-fallback.json' with { type: 'json' };

const validSourceIds = new Set([
  'rule-superlative', 'rule-guarantee', 'rule-clinical', 'rule-slang',
  'ledger-clinical', 'ledger-users', 'ledger-offer'
]);

export function getValidatedSampleFindings(text, rows = sampleFallback) {
  return rows
    .filter(finding => validSourceIds.has(finding.source_id)
      && text.slice(finding.span_start, finding.span_end) === finding.span_text)
    .map(finding => ({ ...finding, id: globalThis.crypto.randomUUID() }));
}
