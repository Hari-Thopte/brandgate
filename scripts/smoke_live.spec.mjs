import { createRequire } from 'node:module';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5174';
const apiUrl = process.env.API_URL || 'http://127.0.0.1:8000';
const screenshotDir = join(process.cwd(), 'docs', 'screenshots');

async function takeScreenshot(page, name, width) {
  await mkdir(screenshotDir, { recursive: true });
  await page.setViewportSize({ width, height: 1000 });
  await page.screenshot({ path: join(screenshotDir, `${name}-${width}.png`), fullPage: true });
}

async function chooseSample(page) {
  await page.goto(frontendUrl);
  await page.getByRole('button', { name: /Try the demo brand/ }).first().click();
  await page.getByRole('button', { name: /Risky · planted mistakes/ }).click();
}

test('wordmark returns to landing and navigation resets scroll', async ({ page }) => {
  await page.goto(frontendUrl);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.getByRole('button', { name: /Try the demo brand/ }).first().click();
  await expect(page).toHaveURL(/\/start$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole('button', { name: /BrandGate home/ }).click();
  await expect(page).toHaveURL(`${frontendUrl}/`);
  await expect(page.getByRole('heading', { name: /Every ad gets a second pair of eyes/ })).toBeVisible();
  await page.locator('.preview-mark[data-source="ledger-users"]').click();
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.locator('#copy')).toHaveValue(/10k users/);
  await chooseSample(page);
  await page.getByRole('button', { name: /Analyze ad/ }).click();
  await expect(page.locator('.connection-indicator')).toContainText('Live', { timeout: 20_000 });
  await expect(page.locator('.pipeline-pill')).toContainText('8/8', { timeout: 20_000 });
  await expect(page.locator('.ai-banner')).toHaveCount(0);
  await page.getByRole('button', { name: /BrandGate home/ }).click();
  await expect(page).toHaveURL(`${frontendUrl}/`);
});

async function setTheme(page, theme) {
  await page.evaluate(value => {
    const url = new URL(location.href);
    url.searchParams.set('theme', value);
    history.replaceState(null, '', url);
    localStorage.setItem('brandgate-theme', value);
    document.documentElement.dataset.theme = value;
  }, theme);
}

async function finishReview(page) {
  await expect(page.locator('.finding-index-row')).toHaveCount(6, { timeout: 30_000 });
  const openRows=page.locator('.finding-index-row:not(.decided)');
  let before=await openRows.count();
  let row=page.locator('.finding-index-row:not(.decided)').first();
  await row.click();
  await page.locator('.finding-detail-pane .pinned-actions').getByRole('button', { name: /Accept/ }).click();
  await expect(openRows).toHaveCount(--before, { timeout: 10_000 });
  before=await openRows.count();
  row=page.locator('.finding-index-row:not(.decided)').first();
  await row.click();
  await page.locator('.finding-detail-pane .pinned-actions').getByRole('button', { name: /Dismiss/ }).click();
  await page.locator('#decision-value').fill('Reviewed against the current campaign evidence.');
  await page.getByRole('button', { name: 'Dismiss finding' }).click();
  await expect(openRows).toHaveCount(--before, { timeout: 10_000 });
  row=page.locator('.finding-index-row:not(.decided)').first();
  await row.click();
  const replacement='Use an evidence-led description.';
  await page.locator('#finding-suggestion').fill(replacement);
  before=await openRows.count();
  await page.locator('.finding-detail-pane .pinned-actions').getByRole('button', { name: /Save edit/ }).click();
  await expect(openRows).toHaveCount(--before, { timeout: 10_000 });
  await page.getByRole('button',{name:'Revised',exact:true}).click();
  await expect(page.locator('.manuscript-text')).toContainText(replacement);
  await page.getByRole('button',{name:'Diff',exact:true}).click();
  await expect(page.locator('.manuscript-text del').first()).toBeVisible();
  await expect(page.locator('.manuscript-text ins').filter({hasText:'evidence-led'})).toBeVisible();
  await page.getByRole('button',{name:'Original',exact:true}).click();
  while (await openRows.count()) {
    before=await openRows.count();
    row=page.locator('.finding-index-row:not(.decided)').first();
    await row.click();
    await page.locator('.finding-detail-pane .pinned-actions').getByRole('button', { name: /Accept/ }).click();
    await expect(openRows).toHaveCount(--before, { timeout: 10_000 });
  }
  await page.locator('.review-actions').getByRole('button', { name: 'Approve', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm approval' }).click();
  await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible();
}

test('live judge flow, key screens, and desktop screenshots', async ({ page }) => {
  await chooseSample(page);
  for (const width of [1280, 1440]) {
    await page.goto(`${frontendUrl}/?theme=light`);
    await setTheme(page, 'light');
    await takeScreenshot(page, 'landing-theme-light', width);
    await page.goto(`${frontendUrl}/?theme=dark`);
    await setTheme(page, 'dark');
    await takeScreenshot(page, 'landing-theme-dark', width);
  }
  await chooseSample(page);
  await page.getByRole('button', { name: /Analyze ad/ }).click();
  await expect(page.locator('.pipeline-pill')).toContainText('8/8');
  await page.getByRole('button',{name:'Creator',exact:true}).click();
  await expect(page.locator('.finding-detail-pane .pinned-actions')).toHaveCount(0);
  await expect(page.locator('.readonly-note').first()).toBeVisible();
  await page.getByRole('button',{name:'Reviewer',exact:true}).click();
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    for (const width of [1280, 1440]) await takeScreenshot(page, `workspace-theme-${theme}`, width);
  }
  await setTheme(page, 'light');
  await finishReview(page);
  await expect(page.locator('.approval-stamp')).toBeVisible();
  await page.getByRole('button', { name: 'Request changes' }).click();
  await expect(page.locator('.review-breadcrumb')).toContainText('v3', { timeout: 30_000 });
  await expect(page.locator('.status-pill')).toContainText('In review', { timeout: 30_000 });
  await expect(page.locator('.finding-index-row:not(.decided)')).toHaveCount(6, { timeout: 30_000 });
  await page.locator('.finding-detail-pane').getByRole('tab', { name: 'Audit' }).click();
  await expect(page.locator('.audit-tab')).toContainText('Status changed');
  const mdDownload=page.waitForEvent('download');
  await page.locator('.audit-tab').getByRole('button', { name: 'Markdown' }).click();
  await expect(mdDownload).resolves.toBeTruthy();
  const jsonDownload=page.waitForEvent('download');
  await page.locator('.audit-tab').getByRole('button', { name: 'JSON' }).click();
  await expect(jsonDownload).resolves.toBeTruthy();
  await page.evaluate(()=>{window.__printCalled=false;window.print=()=>{window.__printCalled=true;};});
  await page.locator('.audit-tab').getByRole('button', { name: 'Print' }).click();
  await expect.poll(()=>page.evaluate(()=>window.__printCalled)).toBe(true);
  await page.getByRole('button', { name: 'Hub', exact: true }).click();
  for (const tab of ['Guidelines', 'Terms', 'Facts Ledger']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
  }
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    for (const width of [1280, 1440]) await takeScreenshot(page, `brand-hub-theme-${theme}`, width);
  }
  await page.getByRole('button', { name: 'Privacy', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AI & Privacy' })).toBeVisible();
  await takeScreenshot(page, 'ai-privacy', 1280);
});

test('Manager Hub editing, role restrictions, and usable Queue', async ({ page }) => {
  await page.goto(frontendUrl);
  await page.getByRole('button', { name: /Try the demo brand/ }).click();
  await page.getByRole('button', { name: 'Manager', exact: true }).click();
  await page.getByRole('button', { name: 'Hub', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add guideline' })).toBeVisible();
  const addedGuideline=`Second-pass browser check ${Date.now()}`;
  page.once('dialog', dialog => dialog.accept(addedGuideline));
  await page.getByRole('button', { name: 'Add guideline' }).click();
  await expect(page.getByText(addedGuideline)).toBeVisible();
  await page.getByRole('button', { name: 'Reviewer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add guideline' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Queue', exact: true }).click();
  await expect(page.locator('.queue-table tbody tr')).toHaveCount(3);
  await page.getByRole('button', { name: 'Approved', exact: true }).click();
  await expect(page.locator('.queue-table tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search reviews' }).fill('Q3 social');
  await expect(page.locator('.queue-table tbody tr')).toHaveCount(1);
});

test('review route content aligns to the correct read rail and fits viewport', async ({ page }) => {
  for(const width of [1220,390]) {
    await page.setViewportSize({width,height:900});
    for(const route of ['/', '/start', '/queue', '/hub/guidelines', '/hub/terms', '/hub/ledger', '/hub/health', '/privacy']) {
      await page.goto(`${frontendUrl}${route}`);
      const {overflow,offset}=await page.evaluate(()=>{const main=document.querySelector('main');const target=main.classList.contains('landing')?document.querySelector('.hero-inner'):main;return {overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,offset:Math.abs(document.querySelector('.wordmark').getBoundingClientRect().left-target.getBoundingClientRect().left)}});
      expect(overflow, `${width}px ${route} horizontal overflow`).toBeLessThanOrEqual(1);
      expect(offset, `${width}px ${route} read rail alignment`).toBeLessThanOrEqual(1);
    }
    const itemId='rail-alignment-fixture';
    const fixture={item:{id:itemId,status:'In review',text:'Rail alignment fixture.',version:1},analysis:{id:'rail-analysis',status:'complete',stage:'Stored fallback',stage_index:8,total_stages:8,findings:[],timings_ms:{}},findings:[],audit:[],offline:true,text:'Rail alignment fixture.'};
    await page.goto(frontendUrl);
    await page.evaluate(session=>localStorage.setItem('brand-review-current',JSON.stringify(session)),fixture);
    for(const route of [`/review/${itemId}`,`/review/${itemId}/audit`]) {
      await page.goto(`${frontendUrl}${route}`);
      const {overflow,offset}=await page.evaluate(()=>{const main=document.querySelector('main');return {overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,offset:Math.abs(document.querySelector('.wordmark').getBoundingClientRect().left-main.getBoundingClientRect().left)}});
      expect(overflow,`${width}px ${route} horizontal overflow`).toBeLessThanOrEqual(1);
      expect(offset,`${width}px ${route} app/read rail alignment`).toBeLessThanOrEqual(1);
    }
  }
});

test('judge guide opens as a fixed panel and keeps submit actions clear', async ({ page }) => {
  await page.setViewportSize({width:1220,height:900});
  await page.goto(`${frontendUrl}/start`);
  await expect(page.getByRole('complementary',{name:'Judge guide'})).toHaveCount(0);
  await page.getByRole('button',{name:/Judge guide · follow the steps/}).click();
  const guide=page.getByRole('complementary',{name:'Judge guide'});
  await expect(guide).toBeVisible();
  await expect(guide).toHaveCSS('position','fixed');
  const guideBox=await guide.boundingBox();
  const analyzeBox=await page.getByRole('button',{name:/Analyze ad/}).boundingBox();
  expect(guideBox&&analyzeBox&&guideBox.x+guideBox.width<=analyzeBox.x||guideBox&&analyzeBox&&analyzeBox.x+analyzeBox.width<=guideBox.x||guideBox&&analyzeBox&&guideBox.y+guideBox.height<=analyzeBox.y||guideBox&&analyzeBox&&analyzeBox.y+analyzeBox.height<=guideBox.y).toBeTruthy();
  await page.getByRole('button',{name:'Collapse judge guide'}).click();
  await expect(guide).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Judge guide · follow the steps/})).toBeVisible();
});

test('audit timeline handles empty, three, and fifty events', async ({ page }) => {
  const itemId='audit-density-fixture';
  const makeSession=(audit)=>({item:{id:itemId,status:'In review',text:'Illustrative audit fixture.',version:1},analysis:{id:'audit-analysis',status:'complete',stage:'Stored fallback',stage_index:8,total_stages:8,findings:[],timings_ms:{}},findings:[],audit,offline:true,text:'Illustrative audit fixture.'});
  await page.goto(frontendUrl);
  await page.evaluate(session=>localStorage.setItem('brand-review-current',JSON.stringify(session)),makeSession([]));
  await page.goto(`${frontendUrl}/review/${itemId}/audit`);
  await expect(page.locator('.audit-list .empty')).toBeVisible();
  for (const count of [3,50]) {
    const events=Array.from({length:count},(_,index)=>({at:new Date(Date.UTC(2026,9,25,1,index)).toISOString(),action:index%3===0?'Status changed':index%3===1?'Finding accepted':'Comment added',detail:`Fixture event ${index+1}`}));
    await page.evaluate(session=>localStorage.setItem('brand-review-current',JSON.stringify(session)),makeSession(events));
    await page.goto(`${frontendUrl}/review/${itemId}/audit?fixture=${count}`);
    await expect(page.locator('.audit-list .audit-line')).toHaveCount(count);
    await expect(page.locator('.audit-list .audit-line').last().locator('small')).toHaveCSS('white-space','nowrap');
  }
});

test('saved sample result reaches Approved when API calls are blocked', async ({ page }) => {
  await page.route(url => url.href.startsWith(apiUrl), route => route.abort());
  await chooseSample(page);
  await page.getByRole('button', { name: /Analyze ad/ }).click();
  await expect(page.locator('.ai-banner')).toContainText('Local fallback', { timeout: 45_000 });
  await expect(page.getByText('Offline demo mode')).toBeVisible();
  await finishReview(page);
  await page.locator('.finding-detail-pane').getByRole('tab', { name: 'Audit' }).click();
  await expect(page.locator('.audit-tab')).toContainText('Status changed');
  await mkdir(screenshotDir, { recursive: true });
  await takeScreenshot(page, 'offline-approved', 1280);
  await page.unrouteAll();
  await page.getByRole('button',{name:'Retry live'}).click();
  await expect(page).toHaveURL(/\/review\//,{timeout:30_000});
  await expect(page.locator('.ai-banner')).toHaveCount(0,{timeout:30_000});
  await expect(page.locator('.finding-index-row:not(.decided)')).toHaveCount(6,{timeout:30_000});
});

test('quick navigation palette opens and filters commands', async ({ page }) => {
  await page.goto(frontendUrl);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: /Go to/ })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search commands' }).fill('privacy');
  await expect(page.getByRole('button', { name: /Open AI & Privacy/ })).toBeVisible();
  await page.getByRole('button', { name: /Open AI & Privacy/ }).click();
  await expect(page.getByRole('heading', { name: 'AI & Privacy' })).toBeVisible();
});

test('start samples, text upload, keyboard analysis, and mobile review panes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${frontendUrl}/start`);
  await expect(page.locator('.sample-option')).toHaveCount(5);
  await page.locator('#copy-file').setInputFiles({ name: 'campaign.txt', mimeType: 'text/plain', buffer: Buffer.from('BrightDay is the #1 best wellness app with guaranteed results.') });
  await expect(page.locator('#copy')).toHaveValue(/#1 best/);
  await page.locator('#copy').focus();
  await page.keyboard.press('Control+Enter');
  await expect(page).toHaveURL(/\/review\//, { timeout: 30_000 });
  await expect(page.locator('.mobile-review-tabs')).toBeVisible();
  await page.getByRole('tab', { name: 'Ad copy' }).click();
  await expect(page.locator('.manuscript-pane')).toBeVisible();
  await page.getByRole('tab', { name: 'Detail' }).click();
  await expect(page.locator('.finding-detail-pane')).toBeVisible();
  await expect(page.locator('.mobile-decision-bar')).toBeVisible();
});
