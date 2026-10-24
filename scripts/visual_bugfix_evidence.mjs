import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'frontend', 'package.json'));
const { chromium } = require('@playwright/test');
const phase = process.argv[2] || 'before';
const output = path.join(root, 'docs', 'screenshots', 'visual-bugfix', phase);
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5177';
const reviewId = 'visual-proof-20261024';
const text = 'Meet BrightDay, the #1 best wellness app with guaranteed results. Our clinically proven plan helped 10k users. Grab the offer before it expires on 2024-01-01. This thing is totally lit, no cap!';
const findings = JSON.parse(await readFile(path.join(root, 'frontend/src/data/sample-fallback.json'), 'utf8'));
const audit = [
  { at: '2026-10-24T15:04:00.000Z', action: 'Item created', detail: 'Offline deterministic review' },
  { at: '2026-10-24T15:04:10.000Z', action: 'Analysis completed', detail: 'Local deterministic fallback' },
  { at: '2026-10-24T15:04:21.000Z', action: 'Finding accepted', detail: findings[0].id },
  { at: '2026-10-24T15:04:32.000Z', action: 'Finding accepted', detail: findings[1].id },
  { at: '2026-10-24T15:04:43.000Z', action: 'Finding dismissed', detail: 'Reviewed against campaign evidence.' },
  { at: '2026-10-24T15:04:51.000Z', action: 'Comment added', detail: 'Checked with the campaign team.' },
  { at: '2026-10-24T15:05:00.000Z', action: 'Status changed', detail: 'Approved' },
].map((event) => ({ ...event, hash: 'demo-screenshot', prev_hash: 'demo-screenshot' }));
const session = {
  item: { id: reviewId, status: 'In review', text, created_at: '2026-10-24T15:04:00.000Z' },
  analysis: { id: 'visual-analysis', item_id: reviewId, status: 'complete', stage: 'Complete (stored fallback)', stage_index: 8, total_stages: 8, findings, timings_ms: { Ingest: 2, Sanitize: 1, 'Deterministic checks': 4, 'Rule retrieval': 1, 'Ledger match': 3, 'Grounded LLM review (unavailable; deterministic only)': 1, 'Grounding validator': 2, 'Merge & score': 1 }, total_ms: 15, ai_status: 'unavailable', cache_hit: false },
  findings,
  audit,
  offline: true,
  text,
};
const errors = [];
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
await context.addInitScript(({ sessionData, reviewRole }) => {
  localStorage.setItem('brand-review-current', JSON.stringify(sessionData));
  localStorage.setItem('brand-review-role', reviewRole);
  localStorage.setItem('brand-review-guide-dismissed', '1');
}, { sessionData: session, reviewRole: 'Reviewer' });
const page = await context.newPage();
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('requestfailed', (request) => errors.push(`requestfailed: ${request.url()} · ${request.failure()?.errorText || 'unknown'}`));
await mkdir(output, { recursive: true });
async function go(route) { await page.goto(`${base}${route}`, { waitUntil: 'networkidle' }); await page.locator('#app').waitFor(); }
async function shot(selector, filename, fullPage = false) {
  const locator = page.locator(selector).first();
  if (!await locator.count()) throw new Error(`Missing screenshot target ${selector} at ${page.url()}`);
  await locator.screenshot({ path: path.join(output, filename), animations: 'disabled', ...(fullPage ? { fullPage: true } : {}) });
}
async function pageShot(filename) { await page.screenshot({ path: path.join(output, filename), fullPage: true, animations: 'disabled' }); }

await go('/');
await pageShot('landing-full.png');
await shot('.hero-copy', '01-secondary-copy.png');
await shot('.nav', '03-navigation.png');
await page.screenshot({ path: path.join(output, '04-hero-glow.png'), clip: { x: 0, y: 0, width: 1440, height: 1030 }, animations: 'disabled' });
await shot('.stats-band', '05-landing-bands.png');
await shot('.landing-trust', '06-navy-band.png');
await shot('.stats-strip', '07-stats-strip.png');
await shot('.preview-window', '08-hero-mock.png');
await shot('.landing-story', '09-how-it-works.png');
await shot('.landing-proof', '09-evidence-card.png');
await shot('.human-proof', '09-human-review-card.png');
await shot('.hero-copy h1', '13-typography.png');

await go('/start');
await shot('.role-switch', '02-role-switcher.png');
await page.getByRole('button', { name: /Risky.*planted mistakes/ }).click();
await shot('.sample-card', '12-start-samples.png');
await pageShot('start-full.png');

await go(`/review/${reviewId}`);
await page.locator('.summary-bar').waitFor();
await shot('.summary-bar', '10-workspace-summary.png');
await shot('.ai-banner', '10-local-fallback-banner.png');
await shot('.risk-summary', '10-review-summary.png');
await shot('.pipeline-pill', '10-analysis-pill.png');
await shot('.content-pane', '10-paper-and-insights.png');
await shot('.finding', '10-finding-card.png');
await page.screenshot({ path: path.join(output, 'workspace-top.png'), clip: { x: 0, y: 0, width: 1440, height: 1100 }, animations: 'disabled' });
await page.locator('.panes').scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(output, 'workspace-scrolled.png'), clip: { x: 0, y: 0, width: 1440, height: 1100 }, animations: 'disabled' });
await pageShot('workspace-full.png');
await page.screenshot({ path: path.join(output, '14-contrast-workspace.png'), fullPage: true, animations: 'disabled' });
await go(`/review/${reviewId}/audit`);
await shot('.audit-list', '11-audit-timeline.png');
await pageShot('audit-full.png');
await page.screenshot({ path: path.join(output, '14-contrast-audit.png'), fullPage: true, animations: 'disabled' });
await go('/');
await page.screenshot({ path: path.join(output, '14-contrast-landing.png'), fullPage: true, animations: 'disabled' });
await go('/start');
await page.screenshot({ path: path.join(output, '14-contrast-start.png'), fullPage: true, animations: 'disabled' });
await writeFile(path.join(output, 'browser-errors.json'), JSON.stringify(errors, null, 2));
await writeFile(path.join(output, 'capture-meta.json'), JSON.stringify({ phase, viewport: { width: 1440, height: 1100 }, base, screenshotCount: (await readdir(output)).filter((name) => name.endsWith('.png')).length }, null, 2));
await browser.close();
console.log(JSON.stringify({ phase, output, errors }, null, 2));
