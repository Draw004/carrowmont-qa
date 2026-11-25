import fs from 'node:fs';
import path from 'node:path';

export function runStartupNavigationPerformanceContract(root){
  const main=path.join(root,'draw004.github.io');
  const read=rel=>fs.readFileSync(path.join(main,rel),'utf8');
  const checks=[];
  const add=(name,ok)=>checks.push({name,ok:Boolean(ok)});
  const css=read('carrowmont.css');
  const home=read('index.html');
  const launch=read('assets/pwa/carrowmont-launch.css');
  const site=read('site.js');
  const manifest=JSON.parse(read('carrowmont.webmanifest'));
  const pages=['index.html','my-carrowmont.html','tools.html','ask-carrowmont.html','research.html','search.html','learn.html','about.html','contact.html','methodology.html'];
  add('installed PWA identity and Home-first launch unchanged',manifest.id==='/my-carrowmont.html'&&manifest.start_url==='/?source=pwa');
  add('native and web splash use identical background',manifest.background_color==='#f8fbfc'&&launch.includes('background:#f8fbfc'));
  add('approved mobile C is upper-tip-first, fully completed, with exact tagline',home.includes('d="M355 164 C306 109')&&home.includes('class="cm-home-pwa-c-finish"')&&home.includes('Plan today. Build tomorrow.'));
  add('startup plays only in installed-mobile launch',home.includes("searchParams.get('source') === 'pwa'")&&home.includes("matchMedia('(display-mode: standalone)')")&&home.includes("matchMedia('(max-width: 700px)')")&&home.includes("matchMedia('(prefers-reduced-motion: reduce)'"));
  add('startup release waits for animation completion and readiness; no fixed post-load wait',home.includes('animationend')&&home.includes('if (!ready || !drawn || released) return;')&&home.includes('DOMContentLoaded')&&!home.includes('780 - elapsed')&&launch.includes('cm-home-draw-c .56s'));
  add('ordinary navigation has no whole-page view crossfade',!css.includes('@view-transition{navigation:auto}')&&!css.includes('::view-transition-old(root)'));
  add('desktop header breakpoint loads in CSS, not late JS injection',css.includes('@media (min-width:981px) and (max-width:1560px)')&&!site.includes("style.id = 'traffic1aResearchNavFit'"));
  add('static headers are in final order with one route selected',pages.every((page)=>{
    const html=read(page);
    const nav=html.match(/<nav class="desktop-nav"[^>]*>([\s\S]*?)<\/nav>/);
    const links=(nav?.[1].match(/href="[^"]+"/g)||[]).map(a=>a.slice(6,-1));
    const order=['/','/my-carrowmont.html','/tools.html','/ask-carrowmont.html','/learn.html','/research.html','/search.html'];
    return links.join('|')===order.join('|')&&html.includes('data-cm-static-mobile-header')&&html.includes('data-mobile1-header-search')&&html.includes('site.js?v=20261119-startup-nav-perf1');
  }));
  const articles=fs.readdirSync(main).filter(name=>name.endsWith('.html')&&read(name).includes('data-cm-learn-article'));
  add('all 103 Learn articles retain their content and have pre-rendered final desktop nav',articles.length===103&&articles.every(name=>{
    const html=read(name);
    const nav=html.match(/<nav class="desktop-nav"[^>]*>([\s\S]*?)<\/nav>/);
    const order=(nav?.[1].match(/href="[^"]+"/g)||[]).map(a=>a.slice(6,-1));
    return order.join('|')==='/|/my-carrowmont.html|/tools.html|/ask-carrowmont.html|/learn.html|/research.html|/search.html'&&
      html.includes('site.js?v=20261119-startup-nav-perf1')&&html.includes('carrowmont.css?v=20261119-startup-nav-perf1');
  }));
  add('three Research studies retain final canonical header links',
    fs.readdirSync(path.join(main,'research')).filter(name=>name.endsWith('.html')).length===3&&
    fs.readdirSync(path.join(main,'research')).filter(name=>name.endsWith('.html')).every(name=>read('research/'+name).includes('site.js?v=20261119-startup-nav-perf1')));
  add('canonical nav is not forcibly moved on every script execution',site.includes('if (ordered.some(function(node,i){return currentOrder[i]!==node;}))'));
  add('large My Money and Ask script dependencies download without parser blocking, preserving order',
    ['my-carrowmont.html','ask-carrowmont.html'].every(page=>{const html=read(page);return !/<script src=/.test(html)&&/<script defer src=/.test(html);}));
  add('guest-first installation logic and existing app detection preserved',site.includes('function instructions()')&&site.includes('navigator.getInstalledRelatedApps')&&read('my-carrowmont.html').includes('id="cmPwaInstallCard"'));
  add('no new service worker or offline storage of financial data',!site.includes('serviceWorker.register')&&!fs.existsSync(path.join(main,'service-worker.js')));
  return checks;
}
