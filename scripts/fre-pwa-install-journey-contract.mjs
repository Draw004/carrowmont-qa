import fs from 'node:fs';
import path from 'node:path';

export function runFrePwaInstallJourneyContract(root){
  const base=path.join(root,'draw004.github.io');
  const read=(rel)=>fs.readFileSync(path.join(base,rel),'utf8');
  const site=read('site.js');
  const my=read('my-carrowmont.html');
  const home=read('index.html');
  const css=read('assets/pwa/carrowmont-install.css');
  const doc=read('docs/CARROWMONT_APP_WEBSITE_BEHAVIOR_STANDARD.md');
  const manifest=JSON.parse(read('carrowmont.webmanifest'));
  const result=[];
  const add=(name,ok)=>result.push({name,ok:Boolean(ok)});
  add('PWA identity and Home launch remain unchanged',manifest.id==='/my-carrowmont.html'&&manifest.start_url==='/?source=pwa');
  add('same-scope app relationship is declared without changing identity',
    Array.isArray(manifest.related_applications)&&manifest.related_applications.some(a=>a.platform==='webapp'&&a.id==='https://carrowmont.com/my-carrowmont.html'&&a.url==='/carrowmont.webmanifest'));
  add('Home captures native prompt early and both key pages load refreshed installation runtime',
    home.includes('window.__cmPwaEarlyInstallPrompt = event;')&&home.includes("window.addEventListener('beforeinstallprompt'")&&home.includes('site.js?v=20261119-pwa-install-v6')&&my.includes('site.js?v=20261119-pwa-install-v6'));
  add('one-time first-visit CTA uses local-only dismissal and never requires sign in',
    site.includes("var SEEN_KEY='cm-pwa-install-offer-seen-v1'")&&site.includes('localStorage.setItem(SEEN_KEY')&&site.includes('No account required.')&&site.includes('if(!installed()&&!seen())'));
  add('native install prompt originates directly from a click when available',
    site.includes("offerButton")&&site.includes("button.addEventListener('click',installOrExplain)")&&site.includes('await prompt.prompt()')&&site.includes('result.outcome'));
  add('unavailable native install has honest browser-dependent fallback',
    site.includes('if(!hasNativePrompt())')&&site.includes('function instructions()')&&site.includes('How to install'));
  add('My Money installation controls stay discoverable in the browser',
    my.includes('id="cmPwaInstallCard"')&&my.includes('id="cmPwaInstallButton"')&&site.includes('if(card)card.hidden=isInstalled;'));
  add('installed standalone and supported PWA detection hide redundant prompts',
    site.includes('function standalone()')&&site.includes('navigator.getInstalledRelatedApps')&&site.includes('if(isInstalled&&offer)')&&site.includes('button.hidden=isInstalled'));
  add('website never forces cross-browser app redirects',
    !site.includes('location.replace("carrowmont://')&&!site.includes('location.href="carrowmont://')&&doc.includes('do **not** force redirects'));
  add('invitation stays compact and clear of mobile navigation',
    css.includes('bottom:calc(78px + env(safe-area-inset-bottom,0px))')&&css.includes('position:fixed')&&css.includes('.cm-pwa-offer-close'));
  add('existing approved startup remains intact',home.includes('Plan today. Build tomorrow.')&&home.includes('cm-home-pwa-c-stroke'));
  add('installation behaviour contract is documented',doc.includes('Installation — locked v1.1'));
  return result;
}
