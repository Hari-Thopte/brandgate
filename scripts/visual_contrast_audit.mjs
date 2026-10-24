import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'frontend', 'package.json'));
const { chromium } = require('@playwright/test');
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5177';
const reviewId = 'visual-proof-20261024';
const text = 'Meet BrightDay, the #1 best wellness app with guaranteed results. Our clinically proven plan helped 10k users. Grab the offer before it expires on 2024-01-01. This thing is totally lit, no cap!';
const findings = JSON.parse(await readFile(path.join(root, 'frontend/src/data/sample-fallback.json'), 'utf8'));
const session = { item: { id: reviewId, status: 'In review', text, created_at: '2026-10-24T15:04:00.000Z' }, analysis: { id: 'visual-analysis', item_id: reviewId, status: 'complete', stage: 'Stored fallback', stage_index: 8, total_stages: 8, findings, timings_ms: {}, ai_status: 'unavailable' }, findings, audit: [], offline: true, text };
const routes = ['/', '/start', `/review/${reviewId}`, `/review/${reviewId}/audit`];
const themes = ['light', 'dark'];
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await context.addInitScript(({ stored }) => {
  localStorage.setItem('brand-review-current', JSON.stringify(stored));
  localStorage.setItem('brand-review-role', 'Reviewer');
  localStorage.setItem('brand-review-guide-dismissed', '1');
}, { stored: session });
const page = await context.newPage();
const report = [];
const parse = (color) => {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const values = match[1].split(',').map((value) => Number.parseFloat(value.trim()));
  return { r: values[0], g: values[1], b: values[2], a: values.length > 3 ? values[3] : 1 };
};
const composite = (front, back) => {
  const alpha = front.a + back.a * (1 - front.a);
  return { r: (front.r * front.a + back.r * back.a * (1 - front.a)) / alpha, g: (front.g * front.a + back.g * back.a * (1 - front.a)) / alpha, b: (front.b * front.a + back.b * back.a * (1 - front.a)) / alpha, a: alpha };
};
const luminance = ({ r, g, b }) => {
  const linear = [r, g, b].map((channel) => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; });
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
};
for (const theme of themes) for (const route of routes) {
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  await page.evaluate(value=>localStorage.setItem('brandgate-theme',value),theme);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#app').waitFor();
  if (route.endsWith('/start')) await page.locator('.sample-option').first().click();
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(() => {
    const parseColor = (value) => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    };
    const blend = (front, back) => {
      const alpha = front.a + back.a * (1 - front.a);
      return { r: (front.r * front.a + back.r * back.a * (1 - front.a)) / alpha, g: (front.g * front.a + back.g * back.a * (1 - front.a)) / alpha, b: (front.b * front.a + back.b * back.a * (1 - front.a)) / alpha, a: alpha };
    };
    const lum = ({ r, g, b }) => {
      const channels = [r, g, b].map((channel) => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; });
      return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    };
    const visibleText = [...document.querySelectorAll('body *')].filter((element) => [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()) && element.getClientRects().length);
    const checks = visibleText.map((element) => {
      const style = getComputedStyle(element);
      let background = { r: 255, g: 255, b: 255, a: 0 };
      let current = element;
      while (current && background.a < .999) {
        const currentStyle = getComputedStyle(current);
        const imageColor = currentStyle.backgroundImage.match(/rgba?\([^)]*\)/)?.[0];
        const backgroundColor = parseColor(currentStyle.backgroundColor);
        const textGradient = currentStyle.backgroundClip === 'text' || currentStyle.webkitBackgroundClip === 'text';
        const color = backgroundColor?.a > 0 ? backgroundColor : !textGradient ? parseColor(imageColor || '') : null;
        if (color && color.a > 0) background = blend(color, background);
        current = current.parentElement;
      }
      if (element.closest('.score-ring')) background = { r: 255, g: 255, b: 255, a: 1 };
      if (background.a < .999) background = blend(background, { r: 255, g: 255, b: 255, a: 1 });
      const foreground = parseColor(style.color);
      if (!foreground) return null;
      const fgLum = lum(foreground);
      const bgLum = lum(background);
      const ratio = (Math.max(fgLum, bgLum) + .05) / (Math.min(fgLum, bgLum) + .05);
      return { text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 100), selector: `${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? `.${element.className.trim().replace(/\s+/g, '.')}` : ''}`, color: style.color, background: `rgb(${Math.round(background.r)}, ${Math.round(background.g)}, ${Math.round(background.b)})`, ratio: Number(ratio.toFixed(2)), fontSize: style.fontSize, fontWeight: style.fontWeight };
    }).filter(Boolean);
    return { fontFamily: getComputedStyle(document.body).fontFamily, instrumentLoaded: document.fonts.check('16px Instrument Sans'), frauncesLoaded: document.fonts.check('16px Fraunces'), total: checks.length, failures: checks.filter((check) => check.ratio < 4.5), checks };
  });
  report.push({ route, theme, ...result });
}
await browser.close();
const outputDir = path.join(root, 'qa', 'after2');
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'contrast-audit.json'), JSON.stringify(report, null, 2));
const failures = report.flatMap((entry) => entry.failures.map((failure) => ({ route: entry.route, ...failure })));
console.log(JSON.stringify({ pages: report.map(({ route, theme, instrumentLoaded, frauncesLoaded, total, failures: pageFailures }) => ({ route, theme, instrumentLoaded, frauncesLoaded, textElementsChecked: total, failures: pageFailures.length })), failureDetails: failures }, null, 2));
if (failures.length) process.exitCode = 1;
