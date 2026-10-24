import './style.css';
import { BRAND_NAME } from './config/brand.js';
import { getApiBaseUrl } from './lib/apiConfig.js';
import { ApiClientError, requestApi } from './lib/api.js';
import { routeFor } from './lib/routes.js';
import { analyzeLocalText } from './lib/localAnalysis.js';
import { appendAuditEvent, verifyAuditChain } from './lib/auditChain.js';
import demoGuidelines from './data/demo/guidelines.json' with { type: 'json' };
import demoTerms from './data/demo/terms.json' with { type: 'json' };
import demoLedger from './data/demo/ledger.json' with { type: 'json' };
import demoSamples from './data/demo/samples.json' with { type: 'json' };
import { reviewScores } from './lib/reviewScore.js';
import { orderFindingsByCopyPosition } from './lib/findingOrder.js';
import { renderWordDiff } from './lib/textDiff.js';
import { logoSvg } from './lib/logo.js';

const API = getApiBaseUrl(import.meta.env.VITE_API_URL, import.meta.env.PROD);
const SAMPLE = 'Meet BrightDay, the #1 best wellness app with guaranteed results. Our clinically proven plan helped 10k users. Grab the offer before it expires on 2024-01-01. This thing is totally lit, no cap!';
const roles = ['Creator', 'Reviewer', 'Manager'];
const steps = ['Draft', 'Analyzed', 'In review', 'Approved'];
const savedTheme=localStorage.getItem('brandgate-theme');
const systemTheme=window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light';
const guideHidden = new URLSearchParams(location.search).get('guide') === '0';
const storedGuideCollapse=localStorage.getItem('brand-review-guide-collapsed');
const state = { role: roles.includes(localStorage.getItem('brand-review-role'))?localStorage.getItem('brand-review-role'):'Reviewer', theme:savedTheme==='dark'||savedTheme==='light'?savedTheme:systemTheme, page: 'home', routeId:null, routeError:'', mobileMenuOpen:false, brandTab: 'Guidelines', brandSearch:'', brandData: {guidelines:demoGuidelines,terms:demoTerms,ledger:demoLedger}, brandSource:'bundled', brandError: '', text: '', draft:localStorage.getItem('brand-review-draft')||'', item: null, analysis: null, findings: [], audit: [], auditFilter:'All', detailTab:'finding', queueFilter:'All', queueSearch:'', queueSort:'name', stage: '', loading: false, error: '', diagnostics:null, comment: '', modal: null, offline: false, showStages:false, showDecided:false, findingFilter:'Open', contentView:'Original', mobilePanel:'findings', guideDismissed:guideHidden||localStorage.getItem('brand-review-guide-dismissed')==='1', guideCollapsed:storedGuideCollapse!=='false', guide:{sampleLoaded:false,openedFinding:false,auditSeen:false}, keyboardHelp:false, selectedFinding:0, findingDraft:'', toast:'' };
const app = document.querySelector('#app');
const connection = { status: 'checking', elapsedMs: null, requestId: null };
const offlineStore = { items: new Map(), analyses: new Map(), audit: new Map() };
const REVIEW_STORAGE_KEY = 'brand-review-current';
history.scrollRestoration='manual';

function setRouteFromLocation() {
  const route=routeFor(location.pathname);
  if(route.redirect){history.replaceState({},'',route.redirect);return setRouteFromLocation();}
  state.page=route.page; state.routeId=route.id||null; state.routeError='';
  if(route.tab)state.brandTab=route.tab;
}

function navigate(path, {replace=false,hydrate=true}={}) {
  if (!replace) history.replaceState({ ...(history.state || {}), scrollY: window.scrollY, internal: true }, '');
  if(replace)history.replaceState({internal:true,scrollY:0},'',path);else history.pushState({internal:true,scrollY:0},'',path);
  setRouteFromLocation(); state.mobileMenuOpen=false; render();
  const hash = new URL(path, location.origin).hash;
  requestAnimationFrame(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
  });
  if(hydrate&&(state.page==='workspace'||state.page==='audit')) void hydrateReviewRoute();
  if(state.page==='brand') void loadBrandData();
}

window.addEventListener('popstate', () => {
  setRouteFromLocation(); render();
  requestAnimationFrame(()=>{
    const target = location.hash ? document.querySelector(location.hash) : null;
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    else window.scrollTo({ top: history.state?.scrollY || 0, behavior: 'instant' });
  });
  if (state.page === 'workspace' || state.page === 'audit') void hydrateReviewRoute();
  if (state.page === 'brand') void loadBrandData();
});
window.addEventListener('scroll',()=>history.replaceState({...history.state,scrollY:window.scrollY},''),{passive:true});

function saveReviewSession() {
  if (!state.item) return;
  const session = {item:state.item,analysis:state.analysis,findings:state.findings,audit:state.audit,offline:state.offline,text:state.text};
  localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(session));
}

function readReviewSession() {
  try { return JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || 'null'); }
  catch { return null; }
}

async function hydrateReviewRoute() {
  const saved = readReviewSession();
  if (saved?.item?.id === state.routeId && saved.offline) {
    Object.assign(state,{item:saved.item,analysis:saved.analysis,findings:copyOrder(saved.findings||[]),audit:saved.audit||[],offline:true,text:saved.text||saved.item.text,routeError:''});
    offlineStore.items.set(state.item.id,state.item);
    if(state.analysis)offlineStore.analyses.set(state.analysis.id,state.analysis);
    offlineStore.audit.set(state.item.id,state.audit);
    render(); scrollToFindingQuery(); return;
  }
  try {
    state.loading=true; state.routeError=''; render();
    const item=await api(`/items/${encodeURIComponent(state.routeId)}`);
    const [analysis,auditResult]=await Promise.all([api(`/items/${encodeURIComponent(state.routeId)}/analysis`),api(`/items/${encodeURIComponent(state.routeId)}/audit`)]);
    Object.assign(state,{item,analysis,findings:copyOrder(analysis.findings||[]),audit:auditResult.events||[],offline:false,text:item.text,loading:false,routeError:''});
    saveReviewSession(); render(); scrollToFindingQuery();
  } catch {
    state.loading=false;
    if(saved?.item?.id===state.routeId){
      Object.assign(state,{item:saved.item,analysis:saved.analysis,findings:copyOrder(saved.findings||[]),audit:saved.audit||[],offline:!!saved.offline,text:saved.text||saved.item.text,routeError:''});
    } else state.routeError='This review is not available. It may have expired after the demo API restarted.';
    render();
  }
}

function scrollToFindingQuery() {
  const findingId=new URLSearchParams(location.search).get('finding');
  if(findingId)requestAnimationFrame(()=>document.querySelector(`#f-${CSS.escape(findingId)}`)?.scrollIntoView({behavior:'smooth',block:'center'}));
}

function routeForPage(page) {
  if(page==='home')return '/';
  if(page==='submit')return '/start';
  if(page==='brand')return `/hub/${state.brandTab==='Facts Ledger'?'ledger':state.brandTab.toLowerCase()}`;
  if(page==='privacy')return '/privacy';
  if(page==='audit')return state.item?`/review/${encodeURIComponent(state.item.id)}/audit`:'/';
  return '/';
}

setRouteFromLocation();

function esc(value = '') { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function diagnosticInfo(error) {
  let apiOrigin='not configured';
  try { if (API) apiOrigin=new URL(API).origin; } catch { apiOrigin='invalid API URL'; }
  return {apiOrigin, url:error?.url||API||'not configured', status:error?.status??'not received by browser', requestId:error?.requestId||'not issued', errorType:error?.kind||(error instanceof TypeError?'network_or_cors':'request'), elapsedMs:error?.elapsedMs??null, timestamp:new Date().toISOString()};
}
async function api(path, options = {}) {
  if (!API) throw Object.assign(new Error('The deployed app has no API URL configured. Set VITE_API_URL to the HTTPS API host in the frontend deployment settings.'), {kind:'configuration'});
  if (state.offline) return offlineApi(path, options);
  return requestApi(path, {
    configuredUrl: API,
    isProduction: import.meta.env.PROD,
    method: options.method || 'GET',
    body: options.body,
    headers: { 'X-Demo-Role': state.role, ...(options.headers || {}) },
    onConnection: updateConnection,
  });
}
function updateConnection(next) {
  Object.assign(connection, next);
  const indicator = document.querySelector('.connection-indicator');
  if (indicator) {
    indicator.dataset.status = connection.status;
    indicator.textContent = connectionLabel();
  }
}
function connectionLabel() {
  if (connection.status === 'live') return `Live${connection.elapsedMs === null ? '' : ` · ${connection.elapsedMs} ms`}`;
  if (connection.status === 'waking') return 'Waking server…';
  if (connection.status === 'offline') return 'Offline demo mode';
  return 'Checking connection…';
}
function showToast(message) {
  state.toast = message;
  render();
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { state.toast = ''; render(); }, 2600);
}
async function offlineApi(path, options = {}) {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : {};
  if (path === '/items' && method === 'POST') {
    const item = { id: crypto.randomUUID(), org_id: 'demo-org', text: body.text, status: 'Draft', version:body.text.trim() === SAMPLE ? 2 : 1, created_at:new Date().toISOString() };
    offlineStore.items.set(item.id, item); offlineStore.audit.set(item.id, []); await pushOfflineAudit(item.id,'Item created','Offline deterministic review');
    return Promise.resolve(item);
  }
  const analysisStart = path.match(/^\/items\/([^/]+)\/analyze$/);
  if (analysisStart && method === 'POST') {
    const id = crypto.randomUUID();
    offlineStore.analyses.set(id, {id, item_id:analysisStart[1], status:'complete', stage:'Complete (local deterministic fallback)', stage_index:8, total_stages:8, findings:state.findings, timings_ms:{}, ai_status:'unavailable', offline:true});
    return Promise.resolve({analysis_id:id});
  }
  const analysisMatch = path.match(/^\/analyses\/([^/]+)$/);
  if (analysisMatch && method === 'GET') return Promise.resolve(offlineStore.analyses.get(analysisMatch[1]));
  const itemAnalysis = path.match(/^\/items\/([^/]+)\/analysis$/);
  if(itemAnalysis&&method==='GET'){
    const row=[...offlineStore.analyses.values()].find(entry=>entry.item_id===itemAnalysis[1]);
    return row?Promise.resolve(row):Promise.reject(new Error('Analysis not found'));
  }
  const itemRead=path.match(/^\/items\/([^/]+)$/);
  if(itemRead&&method==='GET')return Promise.resolve(offlineStore.items.get(itemRead[1]));
  const findingMatch = path.match(/^\/findings\/([^/]+)\/(accept|edit|dismiss)$/);
  if (findingMatch && method === 'POST') {
    const finding = state.findings.find(entry => entry.id === findingMatch[1]);
    if (!finding) throw new Error('Finding not found. Reload the saved sample result.');
    const action = findingMatch[2];
    if (action === 'accept') finding.status = 'accepted';
    if (action === 'edit') { finding.status = 'edited'; finding.suggestion = body.suggestion; }
    if (action === 'dismiss') { finding.status = 'dismissed'; finding.reason = body.reason; }
    await pushOfflineAudit(state.item.id, `Finding ${action === 'accept' ? 'accepted' : action === 'edit' ? 'edited' : 'dismissed'}`, action === 'dismiss' ? body.reason : finding.id);
    return Promise.resolve(finding);
  }
  const itemRoute = path.match(/^\/items\/([^/]+)\/(audit|comments|status)$/);
  if (itemRoute) {
    const [, itemId, action] = itemRoute;
    if (action === 'audit' && method === 'GET') return Promise.resolve({events:offlineStore.audit.get(itemId) || []});
    if (action === 'comments' && method === 'POST') { await pushOfflineAudit(itemId,'Comment added',body.comment); return Promise.resolve({comment:body.comment, at:new Date().toISOString()}); }
    if (action === 'status' && method === 'POST') {
      if (body.status === 'Approved' && state.findings.some(finding => finding.status === 'open')) throw new Error('Resolve every finding before approval');
      const item=offlineStore.items.get(itemId); item.status = body.status; if(body.status==='Draft')item.version=(item.version||1)+1; await pushOfflineAudit(itemId,'Status changed',`${body.status} · v${item.version||1}`); return Promise.resolve({status:body.status,version:item.version||1});
    }
  }
  const verifyRoute=path.match(/^\/items\/([^/]+)\/audit\/verify$/);
  if(verifyRoute&&method==='GET')return verifyAuditChain(offlineStore.audit.get(verifyRoute[1])||[]);
  const guidelineRoute=path.match(/^\/brand\/guidelines(?:\/([^/]+))?$/);
  if(guidelineRoute&&method==='POST'){
    if(state.role!=='Manager')throw new Error('Only the Manager demo role can edit brand data.');
    const row={id:`rule-local-${crypto.randomUUID().slice(0,8)}`,text:body.text};demoGuidelines.push(row);return row;
  }
  if(guidelineRoute&&guidelineRoute[1]&&['PUT','DELETE'].includes(method)){
    if(state.role!=='Manager')throw new Error('Only the Manager demo role can edit brand data.');
    const index=demoGuidelines.findIndex(row=>row.id===decodeURIComponent(guidelineRoute[1]));
    if(index<0)throw new Error('Guideline not found.');
    if(method==='DELETE'){const [deleted]=demoGuidelines.splice(index,1);return {deleted:deleted.id};}
    demoGuidelines[index]={...demoGuidelines[index],text:body.text};return demoGuidelines[index];
  }
  const brandRoutes = {'/brand/guidelines':{items:demoGuidelines},'/brand/terms':{items:demoTerms},'/brand/ledger':{items:demoLedger}};
  if (brandRoutes[path]) return Promise.resolve(brandRoutes[path]);
  throw new Error('This action is not available in the saved demo result.');
}
async function pushOfflineAudit(itemId, action, detail) {
  const events=await appendAuditEvent(offlineStore.audit.get(itemId)||[],action,detail);
  offlineStore.audit.set(itemId,events);
  if(state.item?.id===itemId){state.audit=events;saveReviewSession();}
}
function nav() {
  const mark=logoSvg();
  const themeButton=`<button class="theme-toggle" data-action="toggle-theme" title="Switch to ${state.theme==='dark'?'light':'dark'} theme" aria-label="Switch to ${state.theme==='dark'?'light':'dark'} theme"><span aria-hidden="true">${state.theme==='dark'?'☀':'☾'}</span></button>`;
  if(state.page==='home')return `<header class="nav nav-read marketing-nav"><button class="wordmark" data-route="/" aria-label="${BRAND_NAME} home">${mark}<span>${BRAND_NAME}</span></button><button class="menu-toggle" data-action="toggle-menu" aria-expanded="${state.mobileMenuOpen}" aria-controls="marketing-navigation" aria-label="${state.mobileMenuOpen?'Close':'Open'} navigation">${state.mobileMenuOpen?'×':'☰'}</button><nav id="marketing-navigation" class="${state.mobileMenuOpen?'menu-open':''}" aria-label="Marketing navigation"><a class="nav-link" href="#how-it-works">How it works</a><button data-route="/hub/guidelines" class="nav-link">Brand Hub</button><button data-route="/privacy" class="nav-link">AI & Privacy</button></nav><div class="nav-tools">${themeButton}<button class="primary" data-action="try">Try the demo brand</button></div></header>`;
  const wide=state.page==='workspace';
  return `<header class="nav ${wide?'nav-app':'nav-read'}"><button class="wordmark" data-route="/" aria-label="${BRAND_NAME} home">${mark}<span>${BRAND_NAME}</span></button><nav aria-label="Main navigation"><button data-route="/start" class="nav-link ${state.page==='submit'?'active':''}">Start</button><button data-route="/queue" class="nav-link ${state.page==='queue'?'active':''}">Queue</button><button data-route="/hub/guidelines" class="nav-link ${state.page==='brand'?'active':''}">Hub</button><button data-route="/privacy" class="nav-link ${state.page==='privacy'?'active':''}">Privacy</button></nav><div class="nav-tools"><button class="command-hint" data-action="open-palette" aria-label="Open quick navigation">⌘K</button>${themeButton}<span class="role-label">Demo role</span><div class="role-switch" role="group" aria-label="Demo role">${roles.map(role => `<button data-role="${role}" aria-pressed="${state.role===role}" class="${state.role===role?'selected':''}">${role}</button>`).join('')}</div></div></header>`;
}
function roleBanner() {
  return '';
}
function landing() {
  const sample=demoSamples.find(item=>item.id==='risky')||demoSamples[0];
  const landingFindings=analyzeLocalText(sample.text,sample.text).sort((a,b)=>a.span_start-b.span_start);
  let cursor=0; let marked='';
  for(const finding of landingFindings){marked+=esc(sample.text.slice(cursor,finding.span_start))+`<button class="preview-mark ${finding.severity}" data-action="preview-source" data-source="${esc(finding.source_id)}">${esc(sample.text.slice(finding.span_start,finding.span_end))}</button>`;cursor=finding.span_end;}
  marked+=esc(sample.text.slice(cursor));
  return `<main class="landing copydesk-landing">
    <section class="hero-section copydesk-hero"><div class="landing-inner hero-inner">
      <div class="hero-copy"><div class="eyebrow">A clearer path from claim to decision</div><h1><span>Every ad gets a</span><span>second pair of eyes</span><span>before it ships.</span></h1><p>Check campaign copy against brand rules and approved facts. A reviewer decides what to change.</p><div class="hero-actions"><button class="primary large" data-action="landing-sample">Try it on a sample ad</button><a class="secondary-link" href="#how-it-works">See how a review works</a></div><p class="honest-line">No account. Rule and ledger checks run first; AI review is optional.</p></div>
      <section class="preview-window interactive-preview" aria-label="Illustrative sample with six deterministic findings"><div class="preview-top"><span>BrightDay · Summer launch</span><span class="tiny-pill">ILLUSTRATIVE SAMPLE</span></div><div class="preview-body"><aside class="preview-campaigns"><div class="preview-label">CAMPAIGNS</div><div class="preview-item selected">Summer launch<small>In review · v2</small></div><div class="preview-item">Q3 social draft</div><div class="preview-item">Product update</div></aside><div class="preview-ad"><div class="preview-label">AD COPY · ${landingFindings.length} FINDINGS</div><p class="preview-copy">${marked}</p><div class="preview-note">Select a marked phrase to start the same review.</div></div><aside class="preview-insights"><div class="preview-label">REVIEW FINDINGS</div>${landingFindings.slice(0,2).map((finding,i)=>`<button class="preview-finding" data-action="preview-source" data-source="${esc(finding.source_id)}"><span class="finding-number ${finding.severity}">${i+1}</span><span><b>${esc(finding.category)} · ${esc(finding.span_text)}</b><small>${esc(finding.source_id)} · ${finding.severity} severity</small></span></button>`).join('')}<div class="preview-more">+ ${Math.max(0,landingFindings.length-2)} more findings</div><div class="preview-score"><span>${reviewScores(landingFindings,sample.text).overall}</span><small>Heuristic score</small></div></aside></div></section>
    </div></section>
    <section class="landing-band how-band" id="how-it-works"><div class="landing-inner landing-story"><div class="section-copy"><h2>One review, grounded end to end.</h2><p>Bring the copy. See the evidence. Record a human decision before approval.</p></div><ol class="story-steps"><li><span class="story-mini">Ad copy <i>▏</i><small>Paste here…</small></span><b>Paste</b><small>Write or load campaign copy.</small></li><li><span class="story-mini">Ad copy <mark>10k users</mark><small>Ledger signal</small></span><b>Check</b><small>Run deterministic brand and ledger checks.</small></li><li><span class="story-mini"><button>Accept</button><button>Edit</button><button>Dismiss</button></span><b>Decide</b><small>Accept, edit, or dismiss with a reason.</small></li><li><span class="story-mini stamp-mini">✓ APPROVED</span><b>Approve</b><small>Complete the reviewer sign-off.</small></li></ol></div></section>
    <section class="landing-band evidence-band"><div class="landing-inner landing-proof"><div class="section-copy"><h2>Every finding points to its evidence.</h2><p>The reported claim and approved source stay visible together.</p></div><article class="evidence-ledger"><div class="evidence-pair"><span>Ad claim · finding 4</span><b>“10k users”</b><small>Margin mark · Medium</small></div><span class="evidence-connector" aria-hidden="true">→</span><div class="evidence-pair"><span>Facts Ledger · Supported</span><b>8,500 registered users</b><small>Source: demo user-count record · owner: demo brand team</small></div><div class="evidence-pair"><span>Ad claim · finding 1</span><b>“#1 best”</b><small>Margin mark · High</small></div><span class="evidence-connector" aria-hidden="true">→</span><div class="evidence-pair"><span>Brand rule</span><b>rule-superlative</b><small>Avoid unsupported superlatives.</small></div></article></div></section>
    <section class="landing-band human-band"><div class="landing-inner landing-proof human-proof"><div class="section-copy"><h2>People keep the final say.</h2><p>Nothing changes automatically. Each finding gets an explicit reviewer decision.</p></div><article class="human-proof-card"><div class="human-actions"><button class="primary mini">Accept</button><button class="secondary mini">Edit</button><button class="quiet mini">Dismiss</button></div><div class="human-timeline"><b>Reviewer accepted</b><b>Reviewer edited</b><b>Approved</b></div><div class="stamp-mini">APPROVED</div><small>Illustrative review sequence · approval follows human decisions.</small></article></div></section>
    <section class="landing-band privacy-band"><div class="landing-inner privacy-preview"><div><h2>Deterministic checks first. Optional model review.</h2><p>What runs every time and what runs only when configured.</p></div><div class="privacy-compare"><article><span>ALWAYS RUNS</span><b>Rules, banned terms, dates, exact spans</b></article><article><span>OPTIONAL</span><b>Sanitized copy and matching source context</b></article></div><button class="secondary" data-route="/privacy">See what is sent and stored</button></div></section>
    <section class="landing-cta-band"><div class="landing-inner landing-cta"><div><h2>Put the sample through review.</h2><p>Inspect the sources, decide on each finding, then approve the item.</p></div><button class="primary large" data-action="landing-sample">Try it on a sample ad</button></div></section>
    <footer class="landing-footer"><div class="landing-inner"><div class="footer-row"><span class="footer-brand">${logoSvg()}<span>${BRAND_NAME}</span></span><span>Brand checks with a human decision trail.</span><nav aria-label="Footer links"><button data-route="/privacy">Privacy</button><a href="/README.md" target="_blank" rel="noreferrer">README</a><button data-route="/hub/guidelines">Brand Hub</button></nav></div><div class="footer-row footer-note">${BRAND_NAME} · Team Cipher · Illustrative demo</div></div></footer>
  </main>`;
}
function submitPage() {
  const words=state.text.trim()?state.text.trim().split(/\s+/).length:0;
  const ruleCount=state.brandData.guidelines.length;
  return `<main class="submit-wrap submit-wide"><button class="back-link" data-action="back-landing">← Back</button><div class="submit-head"><div class="eyebrow">BRIGHTDAY · DEMO BRAND</div><h1>Start a review</h1><p>Check claims against approved facts, plus brand terms, tone and readability.</p></div><div class="submit-grid"><section class="compose-card"><div class="card-label"><span>AD COPY</span><span>${state.text.length.toLocaleString()}/12,000 characters</span></div>${!state.text&&state.draft?`<button class="draft-restore secondary mini" data-action="restore-draft">Restore saved draft</button>`:''}<label class="sr-only" for="copy">Marketing ad copy</label><textarea id="copy" maxlength="12000" placeholder="Paste your marketing copy here…">${esc(state.text)}</textarea><div class="editor-tools"><span>${words} words · ${state.text.length.toLocaleString()} characters</span><input type="file" id="copy-file" accept=".txt,.md,text/plain,text/markdown" hidden></div><p class="rules-checked">Rules checked: banned terms · claims · dates · tone</p><div class="compose-footer"><span class="input-hint">${words} words · ${state.text.length.toLocaleString()} characters · BrightDay · ${ruleCount} guidelines</span><span class="compose-actions"><button class="secondary mini" data-action="upload-copy">Open .txt or .md</button><button class="primary" data-action="analyze" ${state.loading || !state.text.trim() ? 'disabled' : ''}>${state.loading ? 'Analyzing…' : 'Analyze ad →'} <kbd>⌘↵</kbd></button></span></div>${state.error ? `<p class="error" role="alert" aria-live="polite">${esc(state.error)} <button class="secondary mini" data-action="copy-diagnostics">Copy diagnostics</button>${!state.loading&&(state.error.includes('API')||state.error.includes('service')||state.error.includes('reach')) ? ` <button class="secondary mini" data-action="retry-analyze">Retry</button>${state.text.trim()===SAMPLE ? ' <button class="secondary mini" data-action="use-saved-result">Use saved demo result</button>' : ''}` : ''}</p>` : ''}</section><aside class="submit-side"><details class="checklist-card"><summary>What we check <span>${ruleCount} brand rules</span></summary><ul><li>Banned and preferred terms</li><li>Claims against the Facts Ledger</li><li>Dates and expired offers</li><li>Tone and readability signals</li></ul></details><section class="sample-card"><h2>Try a sample ad</h2>${demoSamples.map((sample,i)=>`<button data-action="sample-choice" data-sample="${i}" class="sample-option ${state.text===sample.text?'selected':''}" aria-pressed="${state.text===sample.text}"><span class="sample-icon" aria-hidden="true">${i===0?'!':i===1?'✓':i===2?'◷':'◇'}</span><span><b>${esc(sample.name)}</b><small>${esc(sample.description)}</small></span><span class="sample-arrow">→</span></button>`).join('')}</section></aside></div><div class="privacy-note">Demo content is stored in API memory, or locally in this browser if the API is unavailable.</div></main>`;
}
function highlightText() {
  const ranges = [...state.findings].sort((a,b) => a.span_start - b.span_start);
  let cursor = 0; let html = '';
  for (const [index, finding] of ranges.entries()) {
    if (finding.span_start < cursor) continue;
    html += esc(state.text.slice(cursor, finding.span_start));
    const findingNumber=state.findings.indexOf(finding)+1;
    html += `<mark class="span ${finding.severity} ${state.selectedFinding===state.findings.indexOf(finding)?'active':''}" data-finding="${finding.id}" data-finding-index="${state.findings.indexOf(finding)}" title="Finding ${findingNumber} of ${state.findings.length}: ${esc(finding.category)}"><sup>${findingNumber}</sup><span>${esc(state.text.slice(finding.span_start, finding.span_end))}</span></mark>`;
    cursor = finding.span_end;
  }
  return html + esc(state.text.slice(cursor));
}
function contentMarkup() {
  if(state.contentView==='Original')return highlightText();
  const edits=state.findings.filter(f=>['accepted','edited'].includes(f.status)&&f.suggestion&&state.text.slice(f.span_start,f.span_end)===f.span_text).sort((a,b)=>a.span_start-b.span_start);
  let cursor=0,html='';
  for(const finding of edits){if(finding.span_start<cursor)continue;html+=esc(state.text.slice(cursor,finding.span_start));html+=state.contentView==='Diff'?renderWordDiff(finding.span_text,finding.suggestion):esc(finding.suggestion);cursor=finding.span_end;}
  return html+esc(state.text.slice(cursor));
}
function findingCard(f) {
  const closed = f.status !== 'open';
  const confidence=Math.round((f.confidence||0)*100);
  const matchLabel=f.source_type==='ledger'?'Ledger match ✓':f.source_type==='rule'?'Rule match ✓':`${confidence}% confidence`;
  const confidenceMarkup=confidence===100&&f.source_type!=='ai'?`<span class="confidence-match">${matchLabel}</span>`:`<span class="confidence" title="Confidence reflects the rule or ledger match, not overall system accuracy."><span class="confidence-meter" aria-hidden="true"><i style="width:${confidence}%"></i></span>${confidence}%</span>`;
  return `<article class="finding ${f.severity} ${closed ? 'resolved' : ''}" id="f-${f.id}"><div class="finding-top"><span class="category">${esc(f.category.replace('_',' '))}</span><span class="severity ${f.severity}"><b>${f.severity === 'high' ? '▲' : f.severity==='medium'?'●':'◆'}</b> ${esc(f.severity.charAt(0).toUpperCase()+f.severity.slice(1))}</span>${confidenceMarkup}</div><p>${esc(f.message)}</p>${f.suggestion?`<div class="suggestion-box"><small>Suggested fix</small><span>${esc(f.suggestion)}</span></div>`:''}<button class="source source-button" data-action="source" data-id="${esc(f.id)}">↗ &nbsp;${esc(f.source_type==='ledger'?'Facts Ledger':'Brand rule')} · ${esc(f.source_id)}</button>${f.status === 'dismissed' ? `<div class="resolved-note">✕ Dismissed · ${esc(f.reason)}</div>` : f.status === 'accepted' ? '<div class="resolved-note accepted">✓ Accepted</div>' : f.status === 'edited' ? '<div class="resolved-note edited">✎ Edited suggestion</div>' : state.role!=='Reviewer'?`<div class="readonly-note" title="Only a Reviewer can record a finding decision">Read only · Reviewer decision required</div>`:`<div class="actions"><button class="primary mini" data-action="accept" data-id="${f.id}">Accept</button><button class="secondary mini" data-action="edit" data-id="${f.id}">Edit</button><button class="quiet mini" data-action="dismiss" data-id="${f.id}">Dismiss</button></div>`}</article>`;
}
function sourceEvidence(finding) {
  const evidence={
    'ledger-users':'Facts Ledger: 8,500 registered users · status Supported',
    'ledger-offer':'Facts Ledger: offer valid through 2024-01-01 · status Expired',
    'ledger-clinical':'Facts Ledger: clinical efficacy claim · status Unregistered',
    'rule-superlative':'Brand rule: avoid unsupported superlatives.',
    'rule-guarantee':'Brand rule: guarantees need approved evidence.',
    'rule-slang':'Brand rule: use the approved, professional brand voice.'
  };
  return evidence[finding.source_id]||`Brand rule source: ${finding.source_id}`;
}
function auditLine(event) { const action=event.action||'Review updated'; const icon=action.toLowerCase().includes('accept')?'✓':action.toLowerCase().includes('edit')?'✎':action.toLowerCase().includes('dismiss')?'×':action.toLowerCase().includes('comment')?'“':action.toLowerCase().includes('status')?'→':'•'; const finding=state.findings.find(row=>row.id===event.detail); const detail=finding?`${finding.span_text} · ${finding.category.replace('_',' ')}`:event.detail||'Review workspace'; return `<div class="audit-line"><span class="audit-dot">${icon}</span><div class="audit-copy"><div class="audit-title"><b>${esc(action)}</b></div><p>${esc(detail)}</p><small>${new Date(event.at).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</small></div></div>`; }
function auditCategory(event) { const action=(event.action||'').toLowerCase(); return action.includes('finding')?'Decisions':action.includes('comment')?'Comments':action.includes('status')?'Status':'All'; }
function exportReport(format) {
  const payload={title:'BrightDay · Summer launch',status:state.item?.status||'Draft',score:reviewScores(state.findings,state.text).overall,findings:state.findings.map(({category,severity,confidence,span_text,message,suggestion,status,reason,source_type,source_id})=>({category,severity,confidence,span_text,message,suggestion,status,reason,source_type,source_id})),audit:state.audit.map(({at,action,detail})=>({at,action,detail}))};
  const content=format==='json'?JSON.stringify(payload,null,2):`# ${payload.title}\n\n- Status: ${payload.status}\n- Review score: ${payload.score}/100 (heuristic based on open findings)\n\n## Findings\n\n${payload.findings.map(f=>`- **${f.severity} · ${f.category} · ${f.status}** — “${f.span_text}”\n  - ${f.message}\n  - Suggested fix: ${f.suggestion||'None'}${f.reason?`\n  - Dismissal reason: ${f.reason}`:''}\n  - Source: ${f.source_type} · ${f.source_id}`).join('\n')}\n\n## Audit trail\n\n${payload.audit.map(e=>`- ${e.at} — ${e.action}: ${e.detail||'Review updated'}`).join('\n')}`;
  const blob=new Blob([content],{type:format==='json'?'application/json':'text/markdown'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`brand-review-report.${format==='json'?'json':'md'}`;link.click();URL.revokeObjectURL(url);
}
function stepper() {
  const active = steps.indexOf(state.item?.status || 'Draft');
  return `<div class="stepper">${steps.map((step,i)=>`<div class="step ${i < active ? 'done' : i === active ? 'current' : ''}"><span>${i < active ? '✓' : i+1}</span><small>${step}</small></div>`).join('')}</div>`;
}
function riskSummary() {
  const high=state.findings.filter(f=>f.severity==='high'&&f.status==='open').length;
  const expired=state.findings.filter(f=>f.source_id==='ledger-offer'&&f.status==='open').length;
  const facts=state.findings.filter(f=>f.source_type==='ledger'&&f.status==='open').length;
  const tone=state.findings.some(f=>/slang|tone/i.test(`${f.category} ${f.source_id}`)&&f.status==='open');
  const parts=[];
  if(high)parts.push(`${high} high-severity ${high===1?'finding':'findings'} need review`);
  if(expired)parts.push('an offer date is marked expired in the demo ledger');
  else if(facts)parts.push(`${facts} ledger-backed ${facts===1?'claim needs':'claims need'} review`);
  if(tone)parts.push('a tone or banned-term signal was found');
  return parts.length?parts.join(' · '):'No open findings remain. A reviewer can continue to approval.';
}
function qualityScores() {
  const scores=reviewScores(state.findings,state.text);
  return [['Compliance',scores.compliance],['Evidence',scores.evidence],['Tone',scores.tone],['Clarity',scores.clarity]];
}
function judgeGuide() {
  if(state.guideDismissed || state.guideCollapsed || state.page==='home')return '';
  const done=[state.guide.sampleLoaded,Boolean(state.analysis),state.guide.openedFinding,state.findings.some(f=>f.status!=='open'),state.item?.status==='Approved',state.guide.auditSeen];
  const labels=['Load the sample ad','Analyze the copy','Open a finding source','Decide on a finding','Approve the item','View the audit trail'];
  const count=done.filter(Boolean).length;
  const current=done.findIndex(value=>!value);
  return `<aside class="judge-guide" aria-label="Judge guide"><div class="judge-guide-head"><div><b>Judge guide</b><small><span>${count}</span> / ${done.length}</small></div><button class="guide-control" data-action="guide-collapse" aria-label="Collapse judge guide" aria-expanded="true">⌄</button><button class="guide-control" data-action="guide-dismiss" aria-label="Dismiss judge guide">×</button></div><div class="guide-progress"><i style="width:${Math.round(count/done.length*100)}%"></i></div><ol>${labels.map((label,i)=>`<li class="${done[i]?'complete':''} ${i===current?'current':''}"><span aria-hidden="true">${done[i]?'✓':i+1}</span><span>${esc(label)}</span></li>`).join('')}</ol></aside>`;
}
function workspace() {
  const openFindings=state.findings.filter(f=>f.status==='open');
  const accepted=state.findings.filter(f=>f.status==='accepted').length;
  const edited=state.findings.filter(f=>f.status==='edited').length;
  const dismissed=state.findings.filter(f=>f.status==='dismissed').length;
  const highOpen=openFindings.filter(f=>f.severity==='high').length;
  const analysisPending=state.loading&&['queued','running'].includes(state.analysis?.status);
  const score=analysisPending?'–':reviewScores(state.findings,state.text).overall;
  const selected=state.findings[state.selectedFinding]||state.findings[0]||null;
  const index=selected?state.findings.indexOf(selected):-1;
  const complete=state.findings.length>0&&openFindings.length===0;
  const quality=analysisPending?qualityScores().map(([label])=>[label,'–']):qualityScores();
  const visible=state.findings.map((finding,findingIndex)=>({finding,findingIndex})).filter(({finding})=>state.findingFilter==='All'||(state.findingFilter==='Open'?finding.status==='open':finding.status!=='open'));
  const groups=['high','medium','low'].map(severity=>({severity,rows:visible.filter(({finding})=>finding.severity===severity)})).filter(group=>group.rows.length);
  const listing=groups.map(group=>'<section class="finding-group"><h3>'+esc(group.severity)+' <span>'+group.rows.length+'</span></h3>'+group.rows.map(({finding,findingIndex})=>'<button class="finding-index-row '+(findingIndex===index?'selected':'')+' '+(finding.status!=='open'?'decided':'')+'" data-select-finding="'+findingIndex+'" aria-current="'+(findingIndex===index?'true':'false')+'"><span class="index-number">'+(findingIndex+1)+'</span><span class="index-copy"><b>'+esc(finding.category.replace('_',' '))+'</b><small>“'+esc(finding.span_text)+'”</small></span><span class="index-state" aria-label="'+esc(finding.status)+'">'+(finding.status==='open'?'○':finding.status==='accepted'?'✓':finding.status==='edited'?'✎':'×')+'</span></button>').join('')+'</section>').join('');
  const ledger=selected?demoLedger.find(row=>row.id===selected.source_id):null;
  const rule=selected?demoGuidelines.find(row=>row.id===selected.source_id):null;
  const sourceTitle=ledger?.claim||rule?.text||'Brand source';
  const sourceStatus=ledger?.status?'<span class="ledger-chip '+(ledger.status==='Supported'?'supported':ledger.status==='Expired'?'expired':'unregistered')+'">'+esc(ledger.status)+'</span>':'<span class="ledger-chip">Guideline</span>';
  const recent=state.audit.slice(-3).reverse();
  const blocked=highOpen?highOpen+' high '+(highOpen===1?'finding':'findings')+' undecided':openFindings.length?openFindings.length+' findings undecided':'';
  const reviewerControls=state.role!=='Reviewer'?`<span class="readonly-note" title="Only a Reviewer can change approval status">${state.role==='Creator'?'Reviewer approval required':'Manager view · Reviewer decides'}</span>`:`<div class="review-actions"><button class="secondary mini" data-action="request-changes" title="Return this item to Draft">Request changes</button><button class="primary mini" data-action="approve" title="${esc(blocked||'All findings have a human decision')}" ${openFindings.length||state.item?.status==='Approved'?'disabled':''}>${state.item?.status==='Approved'?'Approved':'Approve'}</button></div>`;
  const detailContent=selected?`<div class="pane-heading"><div><div class="pane-title">FINDING ${index+1} OF ${state.findings.length}</div><small>Human review required</small></div><span class="category">${esc(selected.category.replace('_',' '))}</span></div><div class="detail-scroll"><div class="detail-severity"><span class="severity ${selected.severity}"><b>${selected.severity==='high'?'▲':selected.severity==='medium'?'●':'◆'}</b> ${esc(selected.severity.charAt(0).toUpperCase()+selected.severity.slice(1))}</span><span class="confidence-match">${selected.source_type==='ledger'?'Ledger match ✓':'Rule match ✓'}</span></div><div class="matched-phrase ${selected.severity}"><span>MATCHED PHRASE</span><b>“${esc(selected.span_text)}”</b></div><p class="detail-message">${esc(selected.message)}</p><section class="footnote-card"><div class="footnote-head"><span>SOURCE NOTE</span>${sourceStatus}</div><b>${esc(sourceTitle)}</b><p>${esc(sourceEvidence(selected))}</p><button class="source source-button" data-action="source" data-id="${esc(selected.id)}">${esc(selected.source_id)} ↗</button>${ledger?.expires_at?`<small>Expiry · ${esc(ledger.expires_at)}</small>`:''}</section><label class="suggestion-label" for="finding-suggestion">SUGGESTED REVISION</label><textarea id="finding-suggestion" maxlength="2000" data-field="finding-suggestion" ${selected.status!=='open'||state.role==='Creator'?'disabled':''}>${esc(state.findingDraft||selected.suggestion||'')}</textarea>${selected.status!=='open'?`<p class="resolved-note">${esc(selected.status.charAt(0).toUpperCase()+selected.status.slice(1))}</p>`:''}</div>`:complete?`<div class="all-decided"><span class="section-label">HUMAN REVIEW COMPLETE</span><h2>Every finding has a decision.</h2><p>The original ad copy is unchanged. Reviewers can approve this item or return it with a comment.</p><button class="primary" data-action="approve" ${state.item?.status==='Approved'?'disabled':''}>Approve item</button></div>`:analysisPending?`<div class="analysis-wait" role="status" aria-live="polite">${logoSvg()}<span class="progress-spinner" aria-hidden="true"></span><h2>Analysis in progress</h2><p>${esc(state.analysis?.stage||state.stage||'Preparing your review')} · Stage ${Math.max(1,state.analysis?.stage_index||1)} of 8</p></div>`:`<div class="empty-state">${logoSvg()}<h2>No findings yet</h2><p>Start an analysis to see grounded review notes.</p><button class="primary" data-route="/start">Start a review</button></div>`;
  const completionMarkup=`<div class="all-decided"><span class="section-label">HUMAN REVIEW COMPLETE</span><h2>Every finding has a decision.</h2><p>The original ad copy is unchanged. Reviewers can approve this item or return it with a comment.</p><button class="primary" data-action="approve" ${state.item?.status==='Approved'?'disabled':''}>${state.item?.status==='Approved'?'Approved':'Approve item'}</button></div>`;
  const commentPanel=`<div class="review-comment"><label for="comment">Reviewer note</label><div class="comment-row"><input id="comment" placeholder="Add context to the audit trail…" value="${esc(state.comment)}" ${state.role!=='Reviewer'?'disabled title="Only a Reviewer can add comments"':''}><button class="secondary mini" data-action="comment" ${state.role!=='Reviewer'?'disabled title="Only a Reviewer can add comments"':''}>Add</button></div></div>`;
  return `<main class="workspace review-screen" data-mobile-panel="${state.mobilePanel}">
    <header class="review-topbar">
      <div class="review-breadcrumb"><span>BrightDay</span><b>/</b><strong>Summer launch</strong><small>v${state.item?.version||2}</small></div>
      <span class="status-pill">${esc(state.item?.status||'Draft')}</span>
      <div class="review-score"><span class="score-ring" title="Heuristic from open findings, not measured accuracy"><b>${score}</b><small>${analysisPending?'': '/100'}</small></span><span>Review score · heuristic</span></div>
      <div class="decision-counts"><b>${analysisPending?'–':accepted} accepted</b><span>·</span><b>${analysisPending?'–':edited} edited</b><span>·</span><b>${analysisPending?'–':dismissed} dismissed</b><span>·</span><b>${analysisPending?'Analyzing':openFindings.length+' open'}</b></div>
      ${reviewerControls}
    </header>
    ${state.offline?'<div class="ai-banner"><b>Local fallback</b><span>'+(state.text===SAMPLE?'Using the saved sample findings.':'Deterministic local checks completed.')+' The live service did not respond. Decisions and audit events are stored only in this browser.</span><button class="secondary mini" data-action="retry-live">Retry live</button><button class="quiet mini" data-action="copy-diagnostics">Copy diagnostics</button></div>':''}
    ${analysisPending?'<div class="analysis-progress" role="status" aria-live="polite"><span class="progress-spinner" aria-hidden="true"></span><div><b>'+esc(state.analysis?.stage||state.stage||'Preparing review')+'</b><span>Stage '+Math.max(1,state.analysis?.stage_index||1)+' of 8'+(state.analysis?.stage_index?` · ${Object.values(state.analysis?.timings_ms||{}).reduce((sum,ms)=>sum+Number(ms||0),0)} ms`:'')+'</span></div><div class="analysis-progress-track"><i style="width:'+Math.max(8,Math.round((state.analysis?.stage_index||0)/8*100))+'%"></i></div></div>':''}
    ${state.error?`<div class="workspace-error" role="alert"><span>${esc(state.error)}</span><button class="secondary mini" data-action="retry-current-analysis">Retry analysis</button><button class="quiet mini" data-route="/start">Edit copy</button></div>`:''}
    ${complete&&state.item?.status==='Approved'?'<div class="approval-stamp" aria-label="Approved stamp"><svg viewBox="0 0 240 80" role="img" aria-labelledby="stamp-title"><title id="stamp-title">Approved</title><rect x="3" y="3" width="234" height="74" rx="4"></rect><text x="120" y="51" text-anchor="middle">APPROVED</text></svg></div>':''}
    <div class="mobile-review-tabs" role="tablist" aria-label="Review panes">${['findings','text','detail'].map(panel=>'<button role="tab" aria-selected="'+(state.mobilePanel===panel?'true':'false')+'" class="'+(state.mobilePanel===panel?'active':'')+'" data-mobile-panel="'+panel+'">'+(panel==='text'?'Ad copy':panel.charAt(0).toUpperCase()+panel.slice(1))+'</button>').join('')}</div>    <div class="review-grid">
      <aside class="review-list-pane" aria-label="Finding list">
        <div class="pane-heading"><div><div class="pane-title">FINDINGS</div><small>${state.findings.length} grounded · ${openFindings.length} open · numbers follow copy order</small></div><button class="quiet mini" data-action="toggle-help" aria-label="Show keyboard shortcuts">?</button></div>
        <div class="finding-filters">${['All','Open','Decided'].map(filter=>'<button class="'+(state.findingFilter===filter?'active':'')+'" data-finding-filter="'+filter+'">'+filter+'</button>').join('')}</div>
        <div class="finding-index-list">${listing||'<div class="empty">No findings in this view.</div>'}</div>
        ${state.showStages?'<div class="pipeline-flow" aria-label="Analysis pipeline stages">'+['Ingest','Sanitize','Checks','Rules','Ledger','AI','Validate','Score'].map((stage,i)=>'<div class="pipeline-stage '+(i<(state.analysis?.stage_index||8)?'done':'')+'"><span>'+(i+1)+'</span><b>'+stage+'</b><small>'+esc(Object.values(state.analysis?.timings_ms||{})[i]??'—')+' ms</small></div>').join('')+'</div>':'<button class="pipeline-pill" data-action="toggle-stages" aria-expanded="false">Analysis stages · '+(state.analysis?.stage_index||8)+'/8 <span>＋</span></button>'}
      </aside>
      <section class="manuscript-pane" aria-label="Ad copy manuscript">
        <div class="pane-heading"><div><div class="pane-title">SUMMER LAUNCH · AD COPY</div><small>Click a numbered mark to inspect its finding</small></div><span class="tiny-pill">${state.contentView.toUpperCase()}</span></div>
        <div class="score-strip ${analysisPending?'score-pending':''}" aria-label="Heuristic review signals">${quality.map(([label,value])=>'<div><span>'+label+'</span><b>'+value+'</b></div>').join('')}</div>
        <div class="content-tabs">${['Original','Revised','Diff'].map(view=>'<button data-view="'+view+'" class="'+(state.contentView===view?'active':'')+'">'+view+'</button>').join('')}</div>
        <article class="manuscript-sheet"><div class="paper-meta"><span>BrightDay · Summer launch</span><span>MARKETING COPY / V2</span></div><div class="ad-content paper manuscript-text">${contentMarkup()||'No copy was supplied.'}</div><footer class="paper-foot">Original copy remains unchanged. Accepted and edited suggestions appear in Revised and Diff previews.</footer></article>
      </section>
      <aside class="finding-detail-pane" aria-label="Selected finding detail">
        <div class="detail-pane-tabs" role="tablist" aria-label="Finding details"><button role="tab" aria-selected="${state.detailTab==='finding'}" data-detail-tab="finding" class="${state.detailTab==='finding'?'active':''}">Finding</button><button role="tab" aria-selected="${state.detailTab==='comments'}" data-detail-tab="comments" class="${state.detailTab==='comments'?'active':''}">Comments</button><button role="tab" aria-selected="${state.detailTab==='audit'}" data-detail-tab="audit" class="${state.detailTab==='audit'?'active':''}">Audit</button></div>
        ${state.detailTab==='audit'?`<div class="detail-scroll audit-tab"><div class="audit-controls"><div class="audit-filters">${['All','Decisions','Comments','Status'].map(filter=>'<button data-audit-filter="'+filter+'" class="'+(state.auditFilter===filter?'active':'')+'">'+filter+'</button>').join('')}</div><div class="audit-exports"><button class="secondary mini" data-action="export-report" data-format="md">Markdown</button><button class="secondary mini" data-action="export-report" data-format="json">JSON</button><button class="secondary mini" data-action="print-report">Print</button></div></div><div class="audit-list">${[...state.audit.filter(event=>state.auditFilter==='All'||auditCategory(event)===state.auditFilter)].reverse().map(auditLine).join('')||'<div class="empty">No audit events yet.</div>'}</div></div>`:state.detailTab==='comments'?commentPanel:complete?completionMarkup:detailContent}
        ${state.detailTab==='finding'&&!complete?commentPanel:''}
        ${selected&&selected.status==='open'&&state.role!=='Reviewer'?`<p class="readonly-note" title="Only a Reviewer can record finding decisions">${state.role==='Creator'?'Read only · Reviewer decision required':'Manager view · Reviewer decides'}</p>`:''}
        ${selected&&selected.status==='open'&&state.role==='Reviewer'?`<div class="detail-actions pinned-actions"><button class="primary" data-action="accept" data-id="${esc(selected.id)}">Accept <kbd>A</kbd></button><button class="secondary" data-action="save-detail-edit" data-id="${esc(selected.id)}">Save edit <kbd>E</kbd></button><button class="quiet" data-action="dismiss" data-id="${esc(selected.id)}">Dismiss <kbd>D</kbd></button></div>`:''}
      </aside>
    </div>
    <div class="mobile-decision-bar">${selected&&selected.status==='open'&&state.role==='Reviewer'?'<button class="primary" data-action="accept" data-id="'+esc(selected.id)+'">Accept</button><button class="secondary" data-action="save-detail-edit" data-id="'+esc(selected.id)+'">Save edit</button><button class="quiet" data-action="dismiss" data-id="'+esc(selected.id)+'">Dismiss</button>':''}</div>
  </main>`;
}
function brandPage() {
  const data=state.brandTab==='Guidelines'?state.brandData.guidelines.map(row=>({id:row.id,title:row.id.replace('rule-','').replaceAll('-',' '),description:row.text})):state.brandTab==='Terms'?state.brandData.terms.map(row=>({title:row.term,description:row.meaning})):state.brandTab==='Facts Ledger'?state.brandData.ledger.map(row=>({title:row.claim,description:`${row.value||'No value recorded'} · ${row.source||'Demo source'} · Owner: ${row.owner||'Demo brand team'} · Valid until: ${row.expires_at||'No expiry recorded'}`,status:row.status,expires_at:row.expires_at})):[
    {title:'Rules with no sample matches',description:'This demo insight uses the bundled sample set.',status:'Review'},
    {title:'Facts expiring soon',description:`${state.brandData.ledger.filter(row=>row.expires_at&&new Date(row.expires_at)-Date.now()<30*86400000&&new Date(row.expires_at)>Date.now()).length} illustrative ledger fact(s) expire within 30 days.`,status:'Action'},
    {title:'Top sample violations',description:'Unsupported superlative · guarantee · clinical claim · expired offer · tone.',status:'Sample'},
  ];
  const filtered=data.filter(row=>`${row.title} ${row.description} ${row.status||''}`.toLowerCase().includes(state.brandSearch.toLowerCase()));
  const countLabel=`${state.brandData.guidelines.length} guidelines · ${state.brandData.terms.length} terms · ${state.brandData.ledger.length} facts`;
  return `<main class="simple-page"><h1>Brand Hub</h1><p>Approved guidance and evidence used to ground this review.</p><div class="hub-toolbar"><span>${countLabel}</span><span class="hub-tools"><input id="brand-search" aria-label="Search brand data" placeholder="Search ${state.brandTab.toLowerCase()}…" value="${esc(state.brandSearch)}"><button class="secondary mini" data-action="export-brand-csv">Export CSV</button></span></div><div class="tabs">${['Guidelines','Terms','Facts Ledger','Health'].map(tab=>`<button class="${state.brandTab===tab?'active':''}" data-tab="${tab}">${tab}</button>`).join('')}</div>${state.role==='Manager'&&state.brandTab==='Guidelines'?'<div class="hub-manager-tools"><span>Manager editing · changes are held in demo API memory</span><button class="primary mini" data-action="add-guideline">Add guideline</button></div>':''}${state.role!=='Manager'&&state.brandTab==='Guidelines'?'<p class="readonly-note">Guidelines are read-only for this demo role. Switch to Manager to edit.</p>':''}${state.brandError?`<div class="hub-error">${esc(state.brandError)} <button class="secondary mini" data-action="reload-brand">Try again</button></div>`:`<div class="hub-list">${filtered.length?filtered.map(row=>`<article><div class="hub-icon">${state.brandTab==='Facts Ledger'?'◉':state.brandTab==='Health'?'✓':'◇'}</div><div><b>${esc(row.title)}</b><p>${esc(row.description)}</p>${row.good_example?`<small>Good: ${esc(row.good_example)} · Avoid: ${esc(row.bad_example||'')}</small>`:''}</div>${state.brandTab==='Facts Ledger'?`<span class="ledger-chip ${row.status==='Supported'?'supported':row.status==='Expired'?'expired':'unregistered'}">${esc(row.status||'Supported')}${row.expires_at&&new Date(row.expires_at)>Date.now()&&new Date(row.expires_at)-Date.now()<30*86400000?' · Expiring soon':''}</span>`:''}${state.role==='Manager'&&state.brandTab==='Guidelines'?`<span class="hub-row-actions"><button class="secondary mini" data-action="edit-guideline" data-id="${esc(row.id)}">Edit</button><button class="quiet mini" data-action="delete-guideline" data-id="${esc(row.id)}">Delete</button></span>`:''}</article>`).join(''):'<div class="empty">No matching brand data. Try another search.</div>'}</div><div class="demo-label">${state.brandSource==='bundled'?'Illustrative bundled demo brand data shown; API data could not be reached.':'Illustrative demo brand data · API response.'}</div>`}</main>`;
}
function auditPage() {
  state.guide.auditSeen=true;
  if(state.routeError)return `<main class="simple-page"><h1>Review unavailable</h1><p>${esc(state.routeError)}</p><button class="primary" data-route="/start">Start a new review</button></main>`;
  if(state.loading&&!state.item)return `<main class="simple-page"><div class="eyebrow">LOADING AUDIT</div><h1>Opening review activity…</h1><p>Restoring the item and its audit events.</p></main>`;
  const events=[...state.audit].filter(event=>state.auditFilter==='All'||auditCategory(event)===state.auditFilter).reverse();
  return `<main class="simple-page audit-page"><button class="back-link" data-route="/review/${encodeURIComponent(state.routeId||'')}">← Back to review</button><h1>Review activity</h1><p>Recorded actions for this item, newest first.</p><div class="audit-controls"><div class="audit-filters">${['All','Decisions','Comments','Status'].map(filter=>`<button data-audit-filter="${filter}" class="${state.auditFilter===filter?'active':''}">${filter}</button>`).join('')}</div><div class="audit-exports"><button class="secondary mini" data-action="export-report" data-format="md">Markdown</button><button class="secondary mini" data-action="export-report" data-format="json">JSON</button><button class="secondary mini" data-action="print-report">Print</button></div></div><div class="audit-list">${events.length?events.map(auditLine).join(''):'<div class="empty">No events in this filter yet.</div>'}</div><button class="secondary mini" data-action="verify-audit">Verify audit chain</button>${state.auditVerified?`<p class="info-tag">${state.auditVerified.ok?'Audit chain verified':'Audit chain integrity check failed'} · ${state.auditVerified.checked} events checked</p>`:''}</main>`;
}
function queuePage() {
  const saved=state.item?null:readReviewSession();
  const current=state.item||saved?.item||null;
  const rows=[{name:'Summer launch',version:current?.version||2,status:current?.status||'In review',severity:'High',open:state.item?state.findings.filter(f=>f.status==='open').length:saved?.findings?.filter(f=>f.status==='open').length??6,owner:state.role,updated:state.audit.at(-1)?.at||current?.created_at||'Illustrative example',id:current?.id},{name:'Q3 social draft',version:1,status:'In review',severity:'Medium',open:2,owner:'Creator',updated:'Illustrative example'},{name:'Product update',version:1,status:'Approved',severity:'Low',open:0,owner:'Reviewer',updated:'Illustrative example'}];
  const visible=rows.filter(row=>(state.queueFilter==='All'||row.status===state.queueFilter)&&`${row.name} ${row.status} ${row.owner}`.toLowerCase().includes(state.queueSearch.toLowerCase())).sort((a,b)=>String(a[state.queueSort]??'').localeCompare(String(b[state.queueSort]??'')));
  return `<main class="simple-page queue-page"><h1>Review queue</h1><p>Reviews in this browser session. Seeded rows are illustrative examples.</p><div class="queue-toolbar"><input id="queue-search" aria-label="Search reviews" placeholder="Search campaigns…" value="${esc(state.queueSearch)}"><div class="tabs">${['All','In review','Changes requested','Approved'].map(filter=>`<button data-queue-filter="${filter}" class="${state.queueFilter===filter?'active':''}">${filter}</button>`).join('')}</div></div><div class="queue-table-wrap"><table class="queue-table"><thead><tr>${[['name','Campaign'],['version','Version'],['status','Status'],['severity','Worst severity'],['open','Open'],['owner','Owner'],['updated','Updated']].map(([key,label])=>`<th><button data-queue-sort="${key}" aria-label="Sort by ${label}">${label}${state.queueSort===key?' ↑':''}</button></th>`).join('')}</tr></thead><tbody>${visible.map(row=>`<tr tabindex="0" data-queue-item="${esc(row.id||'')}"><td><b>${esc(row.name)}</b>${row.id?'':' <small>Illustrative</small>'}</td><td>v${row.version}</td><td>${esc(row.status)}</td><td><span class="severity ${row.severity.toLowerCase()}">${row.severity==='High'?'▲':row.severity==='Medium'?'●':'◆'} ${row.severity}</span></td><td>${row.open}</td><td>${esc(row.owner)}</td><td>${esc(row.updated.startsWith('Illustrative')?'Illustrative example':new Date(row.updated).toLocaleString())}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">No reviews match. Start with a sample ad.</td></tr>'}</tbody></table></div><button class="primary" data-route="/start">Start a review</button></main>`;
}
function notFoundPage() { return `<main class="simple-page"><div class="eyebrow">404 · PAGE NOT FOUND</div><h1>That page isn’t here.</h1><p>Return to the demo or start a brand review.</p><button class="primary" data-route="/">Go to ${BRAND_NAME}</button></main>`; }
function privacyPage() {
 return `<main class="simple-page"><div class="eyebrow">TRANSPARENCY</div><h1>AI & Privacy</h1><p>See what the review pipeline uses and what the local demo stores.</p><div class="privacy-grid"><section><div class="privacy-icon blue">✦</div><h2>Sent to a model</h2><p>Optional grounded review may receive sanitized ad copy plus matching brand rules and ledger rows. This demo has no model credentials configured; deterministic checks run locally.</p><div class="info-tag">MODEL REVIEW · OPTIONAL</div></section><section><div class="privacy-icon green">▣</div><h2>Stored in this demo</h2><p>Copy, findings, decisions and audit events stay in API memory while it runs. Restarting the API clears them. No persistent database is connected.</p><div class="info-tag">LOCAL DEMO · EPHEMERAL</div></section></div><div class="privacy-callout"><b>People stay in control</b><span>Findings are suggestions. Your team makes every accept, edit, dismiss and approval decision.</span></div></main>`;
}
function decisionDialog() {
  if (!state.modal) return '';
  if (state.keyboardHelp) return `<div class="modal-backdrop"><section class="decision-modal" role="dialog" aria-modal="true" aria-labelledby="decision-title"><div class="eyebrow">KEYBOARD SHORTCUTS</div><h2 id="decision-title">Review faster</h2><p>Use these shortcuts when the workspace is active.</p><div class="shortcut-list"><span><kbd>J</kbd> / <kbd>K</kbd></span><b>Next / previous open finding</b><span><kbd>A</kbd></span><b>Accept selected finding</b><span><kbd>D</kbd></span><b>Dismiss selected finding</b><span><kbd>E</kbd></span><b>Edit selected suggestion</b><span><kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd></span><b>Open quick navigation</b><span><kbd>Esc</kbd></span><b>Close dialog</b></div><div class="modal-actions"><button class="primary" data-action="close-help">Done</button></div></section></div>`;
  if (state.modal.type==='palette') return `<div class="modal-backdrop"><section class="decision-modal command-palette" role="dialog" aria-modal="true" aria-labelledby="decision-title"><div class="eyebrow">QUICK NAVIGATION</div><h2 id="decision-title">Go to…</h2><input id="command-search" placeholder="Search pages and actions" value="${esc(state.modal.query||'')}" aria-label="Search commands"><div class="command-list">${[['submit','Start a review','Submit ads'],['sample','Load planted sample ad','Six deterministic findings'],['workspace','Open workspace','Review current item'],['brand','Open Brand Hub','Guidelines, terms, ledger'],['privacy','Open AI & Privacy','Model and data details']].filter(row=>row.join(' ').toLowerCase().includes((state.modal.query||'').toLowerCase())).map(([command,title,detail])=>`<button data-command="${command}"><span>${title}</span><small>${detail}</small></button>`).join('')||'<p class="empty">No matching actions.</p>'}</div><div class="modal-actions"><button class="secondary" data-action="close-palette">Close <kbd>Esc</kbd></button></div></section></div>`;
  if (state.modal.type==='approval') { const decisionsDone=state.findings.every(f=>f.status!=='open'); const offerHandled=!state.findings.some(f=>f.source_id==='ledger-offer'&&f.status==='open'); return `<div class="modal-backdrop"><section class="decision-modal" role="dialog" aria-modal="true" aria-labelledby="decision-title"><div class="eyebrow">FINAL HUMAN REVIEW</div><h2 id="decision-title">Approve this item?</h2><p>Approval records your decision. It does not change the original ad copy.</p><ul class="approval-checks"><li>${decisionsDone?'✓':'○'} All findings have a human decision</li><li>${offerHandled?'✓':'○'} Expired-offer finding has a recorded decision</li><li>○ Reviewer comment is optional</li></ul><div class="modal-actions"><button class="secondary" data-action="cancel-decision">Cancel</button><button class="primary" data-action="confirm-approve" ${decisionsDone?'':'disabled'}>Confirm approval</button></div></section></div>`; }
  if (state.modal.type==='source') { const finding=state.findings.find(row=>row.id===state.modal.id); return finding?`<div class="modal-backdrop"><section class="decision-modal source-dialog" role="dialog" aria-modal="true" aria-labelledby="decision-title"><div class="eyebrow">${finding.source_type==='ledger'?'FACTS LEDGER':'BRAND RULE'}</div><h2 id="decision-title">${esc(finding.source_id)}</h2><p>${esc(finding.message)}</p><div class="source-evidence"><b>Matched span</b><br>“${esc(finding.span_text)}”<hr>${esc(sourceEvidence(finding))}<p class="grounded-badge">✓ Grounded: source verified and span matches the ad exactly.</p></div><div class="modal-actions"><button class="primary" data-action="close-source">Done</button></div></section></div>`:''; }
  const dismiss = state.modal.type === 'dismiss';
  return `<div class="modal-backdrop"><section class="decision-modal" role="dialog" aria-modal="true" aria-labelledby="decision-title"><div class="eyebrow">HUMAN REVIEW</div><h2 id="decision-title">${dismiss ? 'Dismiss finding' : 'Edit suggestion'}</h2><p>${dismiss ? 'A reason is required and will be stored in the audit trail.' : 'Write a replacement suggestion for the reviewer.'}</p><textarea id="decision-value" placeholder="${dismiss ? 'Reason for dismissal…' : 'Suggested replacement…'}" autofocus>${esc(state.modal.value || '')}</textarea><div class="modal-actions"><button class="secondary" data-action="cancel-decision">Cancel</button><button class="primary" data-action="save-decision" data-id="${state.modal.id}" data-kind="${state.modal.type}">${dismiss ? 'Dismiss finding' : 'Save edit'}</button></div></section></div>`;
}
function render() {
  document.documentElement.dataset.theme=state.theme;
  const content=state.page==='home'?landing():state.page==='submit'?submitPage():state.page==='brand'?brandPage():state.page==='privacy'?privacyPage():state.page==='audit'?auditPage():state.page==='queue'?queuePage():state.page==='workspace'?(state.routeError?`<main class="simple-page route-error"><h1>Review unavailable</h1><p>${esc(state.routeError)}</p><button class="primary" data-action="retry-open-review">Retry</button><button class="secondary" data-route="/start">Start a review</button></main>`:state.item?workspace():state.loading?`<main class="simple-page route-loading">${logoSvg()}<h1>Opening review…</h1><p>Restoring the item and its audit events.</p></main>`:workspace()):notFoundPage();
  const pageTitle=state.page==='brand'?'Brand Hub':state.page==='privacy'?'AI & Privacy':state.page==='submit'?'Start a review':state.page==='workspace'?'Review workspace':state.page==='audit'?'Review activity':state.page==='queue'?'Queue view':state.page==='notfound'?'Page not found':BRAND_NAME;
  document.title=state.page==='home'?BRAND_NAME:`${pageTitle} · ${BRAND_NAME}`;
  const description=document.querySelector('meta[name="description"]');
  if(description)description.content=state.page==='privacy'?`What the ${BRAND_NAME} demo sends to a model and stores in the browser or API memory.`:state.page==='brand'?'Read the demo brand guidelines, terms and Facts Ledger.':state.page==='workspace'?'Review ad copy findings grounded in demo brand rules and facts.':'Review marketing copy against brand rules and approved facts. Human reviewers make every final decision.';
  app.innerHTML = `<a class="skip-link" href="#main-content">Skip to content</a>${nav()}${content}<footer class="connection-footer ${state.page==='workspace'?'footer-app':'footer-read'}"><span class="connection-indicator" data-status="${connection.status}" aria-live="polite">${connectionLabel()}</span><button class="guide-reopen" data-action="guide-reopen" ${state.page==='home'||(!state.guideDismissed&&!state.guideCollapsed)?'hidden':''}>${state.guideDismissed?'Show judge guide':'Judge guide · follow the steps'}</button></footer>${state.toast?`<div class="toast" role="status" aria-live="polite">${esc(state.toast)}</div>`:''}${decisionDialog()}${judgeGuide()}`;
  const main=app.querySelector('main'); if(main)main.id='main-content';
}
async function refreshAudit() { if (state.item) { state.audit = (await api(`/items/${state.item.id}/audit`)).events; saveReviewSession(); } }
function localFindings(text) {
  return [...analyzeLocalText(text,SAMPLE)].sort((a,b)=>a.span_start-b.span_start);
}
function copyOrder(findings) { return orderFindingsByCopyPosition(findings); }
async function analyze() {
  state.text = document.querySelector('#copy')?.value || state.text;
  if (!state.text.trim()) { state.error = 'Add some ad copy before starting a review.'; render(); return; }
  state.loading = true; state.error = ''; render();
  try {
    const ready=await api('/health/ready');
    if(ready.status!=='ready')throw new ApiClientError('The review service is not ready yet.',{kind:'not_ready',url:`${API}/health/ready`});
    state.offline=false;
    state.item = await api('/items', { method:'POST', body:JSON.stringify({text:state.text}) });
    const {analysis_id} = await api(`/items/${state.item.id}/analyze`, {method:'POST'});
    state.analysis = {id:analysis_id, status:'running', stage:'Queued', stage_index:0, timings_ms:{},created_at:new Date().toISOString()}; state.findings = []; saveReviewSession(); navigate(`/review/${encodeURIComponent(state.item.id)}`,{hydrate:false}); state.loading=true; render();
    while (['running','queued'].includes(state.analysis.status)) {
      state.analysis = await api(`/analyses/${analysis_id}`); state.stage = state.analysis.stage; state.findings = copyOrder(state.analysis.findings || []);
      state.item.status = state.analysis.status === 'complete' ? 'Analyzed' : 'Draft'; await refreshAudit(); saveReviewSession(); render();
      if (state.analysis.status !== 'complete') await new Promise(resolve => setTimeout(resolve, 170));
    }
    await api(`/items/${state.item.id}/status`, {method:'POST', body:JSON.stringify({status:'In review'})}); state.item.status='In review'; await refreshAudit(); saveReviewSession(); render();
  } catch (error) {
    state.diagnostics=diagnosticInfo(error);
    if(error instanceof ApiClientError&&error.kind==='http_client'){
      state.loading=false;state.error=error.message;render();return;
    }
    await runOfflineDemo(); return;
  }
  state.loading = false; render();
}
async function reanalyzeCurrentItem() {
  if(!state.item)return;
  state.loading=true;state.error='';state.findings=[];state.detailTab='finding';state.selectedFinding=0;render();
  try{
    const {analysis_id}=await api(`/items/${encodeURIComponent(state.item.id)}/analyze`,{method:'POST'});
    state.analysis={id:analysis_id,status:'queued',stage:'Queued',stage_index:0,timings_ms:{}};
    while(['queued','running'].includes(state.analysis.status)){
      state.analysis=await api(`/analyses/${encodeURIComponent(analysis_id)}`);state.stage=state.analysis.stage;state.findings=copyOrder(state.analysis.findings||[]);render();
      if(state.analysis.status!=='complete')await new Promise(resolve=>setTimeout(resolve,150));
    }
    state.item.status='In review';await api(`/items/${encodeURIComponent(state.item.id)}/status`,{method:'POST',body:JSON.stringify({status:'In review'})});
    await refreshAudit();saveReviewSession();
  }catch(error){state.error=error.message;state.diagnostics=diagnosticInfo(error);}
  finally{state.loading=false;render();}
}
async function runOfflineDemo() {
  state.offline=true; state.loading=true; state.error=''; state.findings=localFindings(state.text);
  try {
    state.item=await api('/items',{method:'POST',body:JSON.stringify({text:state.text})});
    const {analysis_id}=await api(`/items/${state.item.id}/analyze`,{method:'POST'});
    state.analysis=await api(`/analyses/${analysis_id}`); state.stage='Local deterministic fallback';
    await pushOfflineAudit(state.item.id,'Analysis completed','Local deterministic fallback; API unavailable');
    state.item.status='Analyzed'; saveReviewSession(); navigate(`/review/${encodeURIComponent(state.item.id)}`,{hydrate:false}); state.loading=true; render();
    await api(`/items/${state.item.id}/status`,{method:'POST',body:JSON.stringify({status:'In review'})});
    state.item.status='In review'; await refreshAudit(); saveReviewSession();
  } catch (error) { state.offline=false; state.error=error.message; state.diagnostics=diagnosticInfo(error); navigate('/start'); }
  finally { state.loading=false; render(); }
}
app.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button) return;
  try {
    if(button.dataset.route){navigate(button.dataset.route);return;}
    if(button.dataset.action==='toggle-menu'){state.mobileMenuOpen=!state.mobileMenuOpen;render();return;}
    if(button.dataset.action==='retry-open-review'){void hydrateReviewRoute();return;}
    if(button.dataset.action==='retry-current-analysis'){if(state.item)void reanalyzeCurrentItem();else navigate('/start');return;}
    if(button.dataset.selectFinding!==undefined){state.selectedFinding=Number(button.dataset.selectFinding);state.findingDraft=state.findings[state.selectedFinding]?.suggestion||'';state.mobilePanel='detail';state.guide.openedFinding=true;render();document.querySelector('.manuscript-pane mark.active')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    if(button.dataset.findingFilter){state.findingFilter=button.dataset.findingFilter;render();return;}
    if(button.dataset.mobilePanel){state.mobilePanel=button.dataset.mobilePanel;render();return;}
    if (button.dataset.action==='back-landing') { if(history.state?.internal&&history.length>1)history.back();else navigate('/'); return; }
    if (button.dataset.action==='guide-collapse') { state.guideCollapsed=!state.guideCollapsed; localStorage.setItem('brand-review-guide-collapsed',String(state.guideCollapsed)); render(); return; }
    if (button.dataset.action==='guide-dismiss') { state.guideDismissed=true; localStorage.setItem('brand-review-guide-dismissed','1'); render(); return; }
    if (button.dataset.action==='guide-reopen') { state.guideDismissed=false; state.guideCollapsed=false; localStorage.removeItem('brand-review-guide-dismissed'); localStorage.setItem('brand-review-guide-collapsed','false'); render(); return; }
    if (button.dataset.detailTab) { state.detailTab=button.dataset.detailTab; if(button.dataset.detailTab==='audit')state.guide.auditSeen=true; render(); return; }
    if (button.dataset.action==='open-palette') { state.modal={type:'palette',query:''}; render(); document.querySelector('#command-search')?.focus(); return; }
    if (button.dataset.action==='next-step') { const openFinding=state.findings.find(f=>f.status==='open'); if(openFinding){document.querySelector(`#f-${CSS.escape(openFinding.id)}`)?.scrollIntoView({behavior:'smooth',block:'center'});document.querySelector(`#f-${CSS.escape(openFinding.id)} [data-action="source"]`)?.focus();} else if(state.item?.status!=='Approved'&&state.role!=='Creator'){document.querySelector('[data-action="approve"]')?.click();} else {state.guide.auditSeen=true;document.querySelector('#audit-trail')?.scrollIntoView({behavior:'smooth',block:'start'});render();} return; }
    if (button.dataset.action==='toggle-theme') { state.theme=state.theme==='dark'?'light':'dark';localStorage.setItem('brandgate-theme',state.theme);render();return; }
    if (button.dataset.role) { state.role = button.dataset.role; localStorage.setItem('brand-review-role',state.role); render(); return; }
    if (button.dataset.page) { navigate(button.dataset.page==='privacy'?'/privacy':button.dataset.page==='brand'?routeForPage('brand'):button.dataset.page==='submit'?'/start':routeForPage('home')); return; }
    if (button.dataset.tab) { state.brandTab=button.dataset.tab; navigate(routeForPage('brand')); return; }
    if (button.dataset.auditFilter) { state.auditFilter=button.dataset.auditFilter; render(); }
    if (button.dataset.queueFilter) { state.queueFilter=button.dataset.queueFilter; render(); }
    if (button.dataset.queueSort) { state.queueSort=button.dataset.queueSort; render(); }
    if(button.dataset.action==='export-brand-csv'){
      const records=state.brandTab==='Guidelines'?state.brandData.guidelines:state.brandTab==='Terms'?state.brandData.terms:state.brandData.ledger;
      const keys=[...new Set(records.flatMap(row=>Object.keys(row)))];
      const csv=[keys.join(','),...records.map(row=>keys.map(key=>'"'+String(row[key]??'').replaceAll('"','""')+'"').join(','))].join('\n');
      const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));link.download=`brand-${state.brandTab.toLowerCase().replaceAll(' ','-')}.csv`;link.click();URL.revokeObjectURL(link.href);
    }
    if(['add-guideline','edit-guideline','delete-guideline'].includes(button.dataset.action)){
      if(state.role!=='Manager'){showToast('Only the Manager role can edit guidelines.');return;}
      if(button.dataset.action==='delete-guideline'){
        await api(`/brand/guidelines/${encodeURIComponent(button.dataset.id)}`,{method:'DELETE'});
      } else {
        const existing=state.brandData.guidelines.find(row=>row.id===button.dataset.id);
        const text=window.prompt(existing?'Edit the guideline text':'Add a guideline');
        if(!text?.trim())return;
        await api(existing?`/brand/guidelines/${encodeURIComponent(existing.id)}`:'/brand/guidelines',{method:existing?'PUT':'POST',body:JSON.stringify({text:text.trim()})});
      }
      await loadBrandData();render();return;
    }
    if (button.dataset.command) {
      const command=button.dataset.command; state.modal=null;
      if(command==='submit'){state.item=null;state.analysis=null;state.findings=[];navigate('/start');}
      if(command==='sample'){state.text=SAMPLE;navigate('/start');}
      if(command==='workspace'){navigate(state.item?`/review/${encodeURIComponent(state.item.id)}`:'/');return;}
      if(command==='brand'){navigate('/hub/guidelines');return;}
      if(command==='privacy'){navigate('/privacy');return;}
      render(); if(command==='submit'||command==='sample')document.querySelector('#copy')?.focus(); return;
    }
    if (button.dataset.action==='landing-sample'||button.dataset.action==='preview-source') { state.item=null;state.analysis=null;state.findings=[];state.audit=[];state.guide.sampleLoaded=true;state.text=demoSamples.find(sample=>sample.id==='risky')?.text||SAMPLE;state.draft=state.text;localStorage.setItem('brand-review-draft',state.draft);navigate('/start'); }
    if (button.dataset.action==='try') { state.item=null; state.analysis=null; state.findings=[]; state.guide.sampleLoaded=true; state.text=SAMPLE; navigate('/start'); }
    if (button.dataset.action==='sample') { state.guide.sampleLoaded=true; state.text=SAMPLE; render(); }
    if (button.dataset.action==='restore-draft') { state.text=state.draft; render(); }
    if (button.dataset.action==='sample-choice') { state.guide.sampleLoaded=true; state.text=demoSamples[Number(button.dataset.sample)]?.text||SAMPLE; render(); document.querySelector('#copy')?.focus(); }
    if (button.dataset.action==='upload-copy') { document.querySelector('#copy-file')?.click(); }
    if (button.dataset.view) { state.contentView=button.dataset.view; render(); }
    if (button.dataset.action==='toggle-stages') { state.showStages=!state.showStages; render(); }
    if (button.dataset.action==='toggle-decided') { state.showDecided=!state.showDecided; render(); }
    if (button.dataset.action==='source') { const f=state.findings.find(row=>row.id===button.dataset.id); if(f) {state.guide.openedFinding=true;state.modal={type:'source',id:f.id};} render(); }
    if (button.dataset.action==='analyze') { await analyze(); }
    if (button.dataset.action==='retry-analyze') { await analyze(); }
    if (button.dataset.action==='retry-live') { const copy=state.text;state.offline=false;state.item=null;state.analysis=null;state.findings=[];state.text=copy;navigate('/start');void analyze();return; }
    if (button.dataset.action==='request-changes') { if(state.role!=='Reviewer')return; const result=await api(`/items/${state.item.id}/status`,{method:'POST',body:JSON.stringify({status:'Draft'})});state.item.status='Draft';state.item.version=result.version||((state.item.version||1)+1);state.findings=state.findings.map(finding=>({...finding,status:'open',reason:null}));await refreshAudit();saveReviewSession();await reanalyzeCurrentItem();return; }
    if (button.dataset.action==='use-saved-result') { await runOfflineDemo(); }
    if (button.dataset.action==='accept') { await api(`/findings/${button.dataset.id}/accept`,{method:'POST'}); }
    if (button.dataset.action==='save-detail-edit') { const suggestion=state.findingDraft.trim(); if(!suggestion){document.querySelector('#finding-suggestion')?.focus();return;} await api(`/findings/${button.dataset.id}/edit`,{method:'POST',body:JSON.stringify({suggestion})}); }
    if (button.dataset.action==='edit' || button.dataset.action==='dismiss') { state.modal={type:button.dataset.action,id:button.dataset.id}; render(); document.querySelector('#decision-value')?.focus(); }
    if (button.dataset.action==='cancel-decision') { state.modal=null; render(); }
    if (button.dataset.action==='close-source') { state.modal=null; render(); }
    if (button.dataset.action==='close-help') { state.keyboardHelp=false; state.modal=null; render(); }
    if (button.dataset.action==='close-palette') { state.modal=null; render(); }
    if (button.dataset.action==='copy-diagnostics') {
      const payload=JSON.stringify(state.diagnostics||diagnosticInfo(new Error('Request failed')),null,2);
      await navigator.clipboard.writeText(payload); showToast('Diagnostics copied. Ad text and secrets are excluded.');
    }
    if (button.dataset.action==='export-report') { exportReport(button.dataset.format==='json'?'json':'md'); }
    if (button.dataset.action==='print-report') { window.print(); }
    if (button.dataset.action==='save-decision') {
      const value=document.querySelector('#decision-value')?.value.trim();
      if (!value) { document.querySelector('#decision-value')?.focus(); return; }
      const path=button.dataset.kind==='dismiss'?'dismiss':'edit'; const body=path==='dismiss'?{reason:value}:{suggestion:value};
      await api(`/findings/${button.dataset.id}/${path}`,{method:'POST',body:JSON.stringify(body)}); state.modal=null;
    }
    if (['accept','edit','dismiss','save-decision','save-detail-edit'].includes(button.dataset.action)) {
      const actedId=button.dataset.id||state.modal?.id; const action=button.dataset.action;
      state.findings=copyOrder((await api(`/analyses/${state.analysis.id}`)).findings||[]);
      const actedIndex=state.findings.findIndex(finding=>finding.id===actedId);
      if(['accept','save-detail-edit','save-decision'].includes(action))state.findingDraft='';
      const next=state.findings.findIndex((finding,index)=>index>actedIndex&&finding.status==='open');
      if(next>=0)state.selectedFinding=next;
      await refreshAudit(); saveReviewSession(); render();
      if(['accept','save-detail-edit','save-decision'].includes(action))showToast(action==='accept'?'Accepted':action==='save-detail-edit'?'Edited':'Decision recorded');
    }
    if (button.dataset.action==='approve') { state.modal={type:'approval'}; render(); return; }
    if (button.dataset.action==='confirm-approve') { await api(`/items/${state.item.id}/status`,{method:'POST',body:JSON.stringify({status:'Approved'})}); state.modal=null; state.item.status='Approved'; await refreshAudit(); render(); }
    if (button.dataset.action==='comment') { const field=document.querySelector('#comment'); const comment=field?.value.trim(); if (!comment) return; await api(`/items/${state.item.id}/comments`,{method:'POST',body:JSON.stringify({comment})}); state.comment=''; await refreshAudit(); render(); }
    if (button.dataset.action==='refresh-audit') { navigate(`/review/${encodeURIComponent(state.item.id)}/audit`); return; }
    if (button.dataset.action==='verify-audit') { state.auditVerified=await api(`/items/${state.item.id}/audit/verify`); render(); }
    if (button.dataset.action==='reload-brand') { await loadBrandData(); render(); }
  } catch (error) { state.error=error.message; render(); }
});
app.addEventListener('input', event => { if (event.target.id==='copy') { state.text=event.target.value; state.draft=state.text; localStorage.setItem('brand-review-draft',state.draft); const count=app.querySelector('.card-label span:last-child'); if (count) count.textContent=`${state.text.length.toLocaleString()}/12,000 characters`; const words=state.text.trim()?state.text.trim().split(/\s+/).length:0; const tools=app.querySelector('.editor-tools span');if(tools)tools.textContent=`${words} words · ${state.text.length.toLocaleString()} characters`; event.target.style.height='auto';event.target.style.height=Math.max(280,event.target.scrollHeight)+'px';const analyzeButton=app.querySelector('[data-action="analyze"]'); if(analyzeButton) analyzeButton.disabled=!state.text.trim()||state.loading; } if (event.target.id==='comment') state.comment=event.target.value; if(event.target.id==='command-search'){const start=event.target.selectionStart;state.modal.query=event.target.value;render();const field=document.querySelector('#command-search');field?.focus();field?.setSelectionRange(start,start);} });
app.addEventListener('input', event => { if(event.target.id==='queue-search'){const start=event.target.selectionStart;state.queueSearch=event.target.value;render();const field=document.querySelector('#queue-search');field?.focus();field?.setSelectionRange(start,start);} });
app.addEventListener('change', async event=>{if(event.target.id==='copy-file'){const file=event.target.files?.[0];if(!file)return;if(file.size>12000){state.error='Choose a text file under 12 KB.';render();return;}state.text=await file.text();if(!/\.md$|\.txt$/i.test(file.name)){state.error='Choose a .txt or .md file.';render();return;}state.error='';render();}});
app.addEventListener('input', event => { if(event.target.id==='finding-suggestion')state.findingDraft=event.target.value; });
app.addEventListener('input', event => { if(event.target.id==='brand-search'){const start=event.target.selectionStart;state.brandSearch=event.target.value;render();const field=document.querySelector('#brand-search');field?.focus();field?.setSelectionRange(start,start);} });
app.addEventListener('click', event => { const mark=event.target.closest('mark[data-finding]'); if(mark){state.selectedFinding=Number(mark.dataset.findingIndex);state.findingDraft=state.findings[state.selectedFinding]?.suggestion||'';state.mobilePanel='detail';render();document.querySelector('.finding-index-row.selected')?.scrollIntoView({behavior:'smooth',block:'nearest'});} });
app.addEventListener('click', event => { const row=event.target.closest('[data-queue-item]'); if(row){if(row.dataset.queueItem)navigate(`/review/${encodeURIComponent(row.dataset.queueItem)}`);else{state.text=demoSamples.find(sample=>sample.id==='expired')?.text||SAMPLE;navigate('/start');}} });
app.addEventListener('keydown', event => { const row=event.target.closest('[data-queue-item]'); if(row&&(event.key==='Enter'||event.key===' ')){event.preventDefault();if(row.dataset.queueItem)navigate(`/review/${encodeURIComponent(row.dataset.queueItem)}`);else{state.text=demoSamples.find(sample=>sample.id==='expired')?.text||SAMPLE;navigate('/start');}} });
app.addEventListener('keydown', event => { if(state.page!=='queue'||!['j','k'].includes(event.key.toLowerCase()))return;const rows=[...document.querySelectorAll('[data-queue-item]')];if(!rows.length)return;event.preventDefault();const current=rows.indexOf(document.activeElement);rows[(current+(event.key.toLowerCase()==='j'?1:-1)+rows.length)%rows.length].focus(); });
render();
void api('/health/ready').catch(() => {});
if(state.page==='workspace'||state.page==='audit')void hydrateReviewRoute();
if(state.page==='brand')void loadBrandData();

document.addEventListener('keydown', event => {
  if((event.ctrlKey||event.metaKey)&&event.key==='Enter'&&state.page==='submit'){event.preventDefault();document.querySelector('[data-action="analyze"]')?.click();return;}
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='k') { event.preventDefault(); state.modal={type:'palette',query:''}; state.keyboardHelp=false; render(); document.querySelector('#command-search')?.focus(); return; }
  if (event.key==='Escape') { if(state.modal){state.modal=null;state.keyboardHelp=false;render();} else if(state.keyboardHelp){state.keyboardHelp=false;render();} return; }
  if (event.target.matches('input,textarea,[contenteditable="true"]') || !['home','workspace'].includes(state.page) || !state.findings.length) return;
  const open=state.findings.map((finding,index)=>({finding,index})).filter(row=>row.finding.status==='open');
  if(event.key==='?'){state.modal={type:'help'};state.keyboardHelp=true;render();}
  if(event.key.toLowerCase()==='j'||event.key.toLowerCase()==='k') { event.preventDefault(); const current=open.findIndex(row=>row.index===state.selectedFinding); const next=(current+(event.key.toLowerCase()==='j'?1:-1)+open.length)%Math.max(open.length,1); if(open[next]){state.selectedFinding=open[next].index;state.findingDraft=open[next].finding.suggestion||'';state.mobilePanel='detail';render();document.querySelector('.manuscript-pane mark.active')?.scrollIntoView({behavior:'smooth',block:'center'});} }
  if(event.key.toLowerCase()==='a'&&state.findings[state.selectedFinding]?.status==='open') document.querySelector('.finding-detail-pane [data-action="accept"]')?.click();
  if(event.key.toLowerCase()==='d'&&state.findings[state.selectedFinding]?.status==='open') document.querySelector('.finding-detail-pane [data-action="dismiss"]')?.click();
  if(event.key.toLowerCase()==='e'&&state.findings[state.selectedFinding]?.status==='open') document.querySelector('#finding-suggestion')?.focus();
});

async function loadBrandData() {
  state.brandError='';
  try {
    const [guidelines,terms,ledger]=await Promise.all([api('/brand/guidelines'),api('/brand/terms'),api('/brand/ledger')]);
    state.brandData={guidelines:guidelines.items,terms:terms.items,ledger:ledger.items};
    state.brandSource='live';
  } catch {
    state.brandData={guidelines:demoGuidelines,terms:demoTerms,ledger:demoLedger};
    state.brandSource='bundled';
  }
  if(state.page==='brand')render();
}
