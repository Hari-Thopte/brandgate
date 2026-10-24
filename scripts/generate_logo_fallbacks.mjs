import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const publicDir = resolve('frontend/public');
const svg = await readFile(resolve(publicDir, 'logo-icon.svg'), 'utf8');
await mkdir(publicDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0"><img src="data:image/svg+xml,${encodeURIComponent(svg)}"></body></html>`);
  const icon = page.locator('img');
  await icon.evaluate((image) => { image.style.width = '32px'; image.style.height = '32px'; });
  await icon.screenshot({ path: resolve(publicDir, 'logo-icon-32.png') });
  await icon.evaluate((image) => { image.style.width = '180px'; image.style.height = '180px'; });
  await icon.screenshot({ path: resolve(publicDir, 'logo-apple-touch.png') });
} finally {
  await browser.close();
}
