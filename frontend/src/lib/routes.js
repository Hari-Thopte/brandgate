export function routeFor(pathname) {
  if (pathname === '/') return {page:'home'};
  if (pathname === '/start') return {page:'submit'};
  if (pathname === '/privacy') return {page:'privacy'};
  if (pathname === '/queue') return {page:'queue'};
  if (pathname === '/hub') return {page:'brand',tab:'Guidelines',redirect:'/hub/guidelines'};
  if (pathname === '/hub/guidelines') return {page:'brand',tab:'Guidelines'};
  if (pathname === '/hub/terms') return {page:'brand',tab:'Terms'};
  if (pathname === '/hub/ledger') return {page:'brand',tab:'Facts Ledger'};
  if (pathname === '/hub/health') return {page:'brand',tab:'Health'};
  const match=pathname.match(/^\/review\/([^/]+)(\/audit)?$/);
  if(match){
    try { return {page:match[2]?'audit':'workspace',id:decodeURIComponent(match[1])}; }
    catch { return {page:'notfound'}; }
  }
  return {page:'notfound'};
}
