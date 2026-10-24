import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'frontend', 'package.json'));
const { chromium } = require('@playwright/test');
const phase = process.argv[2] || 'before';
const themes = (process.argv[3] || 'light').split(',').filter(Boolean);
const output = path.join(root, 'qa', phase);
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5177';
const widths = [1220, 1440, 1024, 768, 390];
const reviewId = 'qa-review-capture';
const adText = 'Meet BrightDay, the #1 best wellness app with guaranteed results. Our clinically proven plan helped 10k users. Grab the offer before it expires on 2024-01-01. This thing is totally lit, no cap!';
const findings = JSON.parse(await readFile(path.join(root, 'frontend/src/data/sample-fallback.json'), 'utf8'));
const brandData = {
  guidelines: JSON.parse(await readFile(path.join(root, 'frontend/src/data/demo/guidelines.json'), 'utf8')),
  terms: JSON.parse(await readFile(path.join(root, 'frontend/src/data/demo/terms.json'), 'utf8')),
  ledger: JSON.parse(await readFile(path.join(root, 'frontend/src/data/demo/ledger.json'), 'utf8')),
};
const audit = [
  { at: '2026-10-25T09:10:00.000Z', action: 'Finding accepted', detail: findings[0]?.id || 'rule-superlative' },
  { at: '2026-10-25T09:12:00.000Z', action: 'Comment added', detail: 'Reviewed with the campaign owner.' },
  { at: '2026-10-25T09:14:00.000Z', action: 'Status changed', detail: 'In review' },
];
const session = { item: { id: reviewId, status: 'In review', text: adText, created_at: '2026-10-24T15:04:00.000Z' }, analysis: { id: 'qa-analysis', item_id: reviewId, status: 'complete', stage: 'Stored fallback', stage_index: 8, total_stages: 8, findings, timings_ms: {}, ai_status: 'unavailable' }, findings, audit, offline: true, text: adText };
const routes = [
  ['landing', '/'], ['start', '/start'], ['workspace', `/review/${reviewId}`], ['audit', `/review/${reviewId}/audit`],
  ['hub-guidelines', '/hub/guidelines'], ['hub-terms', '/hub/terms'], ['hub-ledger', '/hub/ledger'], ['hub-health', '/hub/health'],
  ['privacy', '/privacy'], ['queue', '/queue'], ['not-found', '/this-route-does-not-exist']
];
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const errors = [];
for (const theme of themes) for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(({ stored, themeName }) => {
    localStorage.setItem('brand-review-current', JSON.stringify(stored));
    localStorage.setItem('brand-review-role', 'Reviewer');
    localStorage.setItem('brandgate-theme', themeName);
  }, { stored: session, themeName: theme });
  const page = await context.newPage();
  await context.route('**/health/ready', route => route.fulfill({ json: { status: 'ready', db: 'in-memory demo', llm_key_present: false } }));
  await context.route('**/brand/guidelines', route => route.fulfill({ json: { items: brandData.guidelines } }));
  await context.route('**/brand/terms', route => route.fulfill({ json: { items: brandData.terms } }));
  await context.route('**/brand/ledger', route => route.fulfill({ json: { items: brandData.ledger } }));
  page.on('pageerror', (error) => errors.push({ width, type: 'pageerror', message: error.message }));
  page.on('console', (message) => { if (message.type() === 'error') errors.push({ width, type: 'console', message: message.text() }); });
  for (const [name, route] of routes) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await page.locator('#app').waitFor();
    if (name === 'start') await page.getByRole('button', { name: /Risky.*planted mistakes/ }).click();
    if (name.startsWith('hub-')) await page.locator('.hub-list').waitFor();
    const target = path.join(output, `${name}-${width}-${theme}.png`);
    await page.screenshot({ path: target, fullPage: true, animations: 'disabled' });
  }
  await context.close();
}
await browser.close();
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'browser-errors.json'), JSON.stringify(errors, null, 2));
await writeFile(path.join(output, 'capture-meta.json'), JSON.stringify({ phase, base, widths, themes, routes: routes.map(([name, route]) => ({ name, route })), screenshotCount: routes.length * widths.length * themes.length }, null, 2));
console.log(JSON.stringify({ phase, output, themes, screenshots: routes.length * widths.length * themes.length, errors }, null, 2));
