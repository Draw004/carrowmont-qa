import fs from 'node:fs';
import path from 'node:path';
export function runFreAppWebBehaviorContract(root) {
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const main=path.join(root,'draw004.github.io');
  const read=p=>fs.readFileSync(path.join(main,p),'utf8');
  const manifest=JSON.parse(read('carrowmont.webmanifest'));
  const home=read('index.html'),my=read('my-carrowmont.html'),site=read('site.js'),css=read('carrowmont.css'),startup=read('assets/pwa/carrowmont-launch.css');
  const test=fs.readFileSync(path.join(root,'carrowmont-qa/tests/85-pwa-startup-context.spec.js'),'utf8');
  add('manifest: Home first and stable installed-app ID',manifest.start_url==='/?source=pwa'&&manifest.id==='/my-carrowmont.html'&&manifest.scope==='/');
  add('mobile app: approved C draws top-to-bottom with complete tip and tagline',home.includes('d="M355 164 C306 109')&&home.includes('class="cm-home-pwa-c-finish"')&&home.includes('Plan today. Build tomorrow.')&&startup.includes('cm-home-complete-c'));
  add('startup: limited to genuine installed mobile icon launch and respects reduced motion',home.includes("searchParams.get('source') === 'pwa'")&&home.includes("matchMedia('(display-mode: standalone)')")&&home.includes("matchMedia('(max-width: 700px)')")&&home.includes("matchMedia('(prefers-reduced-motion: reduce)'")&&startup.includes('pointer-events:none'));
  add('legacy installed-app My Money launch redirects only in app mode',my.includes("if (launch && standalone) { window.location.replace('/?source=pwa'); return; }"));
  add('desktop: nav role, active style and Ask neutral by default',site.includes('var activeHref = null;')&&site.includes("link.removeAttribute('aria-current')")&&css.includes('a.site-ask-link:not([aria-current="page"])')&&css.includes('a[aria-current="page"]:not(.site-search-link)::after'));
  add('mobile Search: current header search action is highlighted independently of bottom tabs',site.includes("if (window.location.pathname === '/search.html') link.setAttribute('aria-current', 'page');")&&css.includes('.mobile1-header-search[aria-current="page"]'))
  add('installation: still in My Carrowmont, with fallback and no forced sign-in',my.includes('id="cmPwaInstallCard"')&&my.includes('id="cmPwaInstallShortcut"')&&site.includes('function instructions()')&&site.includes('if(card)card.hidden=isInstalled;'));
  add('governance: cross-device app/website behaviour is recorded and browser tested',read('docs/CARROWMONT_APP_WEBSITE_BEHAVIOR_STANDARD.md').includes('Common rules')&&test.includes('mobile installed app opens Home')&&test.includes('desktop browser Home, Ask, Tools'));
  return checks;
}
