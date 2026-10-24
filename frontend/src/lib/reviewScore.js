/** Deterministic review heuristics. These are signals, not accuracy estimates. */
export function reviewScores(findings, text = '') {
  const open = findings.filter((finding) => finding.status === 'open');
  const compliance = Math.max(0, 100 - open.reduce((sum, finding) => sum + (finding.severity === 'high' ? 15 : finding.severity === 'medium' ? 7 : 3), 0));
  const evidence = Math.max(0, 100 - open.reduce((sum, finding) => sum + (finding.source_type === 'ledger' ? 20 : 7), 0));
  const tone = Math.max(0, 100 - open.filter((finding) => /tone|slang|banned/i.test(`${finding.category} ${finding.source_id}`)).length * 25);
  const clarity = Math.max(0, 100 - (text.match(/[!]{2,}/g) || []).length * 15 - (text.length > 180 ? 10 : 0));
  const overall = open.some((finding) => finding.severity === 'high') ? Math.min(compliance, 49) : compliance;
  return { overall, compliance, evidence, tone, clarity };
}
