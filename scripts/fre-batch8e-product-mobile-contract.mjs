import fs from 'node:fs';
import path from 'node:path';

export function runFreBatch8eProductMobileContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok,detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const exists=rel=>fs.existsSync(path.join(root,rel));
  const home=read('draw004.github.io/index.html');
  const css=read('draw004.github.io/carrowmont.css');
  const site=read('draw004.github.io/site.js');
  const my=read('draw004.github.io/my-carrowmont.html');
  const mycss=read('draw004.github.io/assets/dashboard/my-carrowmont.css');
  const about=read('draw004.github.io/about.html');
  let manifest={};try{manifest=JSON.parse(read('draw004.github.io/carrowmont.webmanifest'));}catch{}
  add('homepage: connected product journey explains Plan Keep Track Understand without numbered cards',home.includes('HOW CARROWMONT HELPS')&&home.includes('cm-product-journey')&&home.includes('cm-journey-node')&&home.includes('>Plan</h3>')&&home.includes('>Keep</h3>')&&home.includes('>Track</h3>')&&home.includes('>Understand</h3>')&&!home.includes('cm-product-step'));
  add('homepage: connected journey has desktop line and mobile vertical line',css.includes('.cm-product-journey::before')&&css.includes('left:12.5%;right:12.5%')&&css.includes('left:43px;right:auto')&&css.includes('grid-template-columns:48px minmax(0,1fr)'));
  add('what-if separation remains explicit in My Carrowmont after homepage cleanup',my.includes('What-if calculation')&&my.includes('Stays separate until you choose to update My Carrowmont.')&&!home.includes('Explore freely.'));
  add('homepage: product preview is explicitly illustrative',home.includes('SEE CARROWMONT IN ACTION')&&home.includes('Illustrative example'));
  add('homepage: core tool grid remains present',home.includes('data-homepage-core-grid')&&home.includes('Explore All Tools'));
  add('homepage: one My Carrowmont showcase remains and newsletter is separate after it',!site.includes('data-cm-home-mycarrowmont')&&site.includes("var productPreview = main.querySelector('.cm-product-preview-section')")&&site.includes('if (authority) main.insertBefore(section, authority)'));
  add('homepage: duplicate trust ribbon removed and lower principles are consolidated',!home.includes('class="trust-strip"')&&home.includes('Transparent by design')&&home.includes('Explore before deciding')&&home.includes('Built for different financial lives')&&!home.includes('Clear &amp; Independent'));
  add('mobile: connected product journey and preview have responsive contracts',css.includes('@media(max-width:700px)')&&css.includes('.cm-product-journey{grid-template-columns:1fr')&&css.includes('.cm-product-preview-layout{grid-template-columns:1fr'));
  add('my carrowmont: canonical country and currency control replaces legacy text glyphs',my.includes('class="locale-icon"')&&my.includes('aria-label="Choose country and currency"')&&my.includes('<span id="localeCountryLabel">India</span>')&&my.includes('<span id="localeCurrencyLabel">INR</span>')&&my.includes('class="chevron" aria-hidden="true"><svg')&&!my.includes('<span class="globe">◎</span>')&&!my.includes('<span class="chevron">⌄</span>'));
  add('my carrowmont: phone install access is explicit',my.includes('Keep My Carrowmont one tap away.')&&my.includes('Installing it does not change what is saved in your account.'));
  add('my carrowmont: mobile quick access covers four core destinations',my.includes('My Carrowmont quick access')&&my.includes('>Progress</a>')&&my.includes('>Saved plans</a>')&&my.includes('>Financial picture</a>')&&my.includes('>Saved details</a>'));
  add('my carrowmont: quick access is mobile scoped',mycss.includes('.mycm-mobile-quick{display:none}')&&mycss.includes('@media(max-width:800px)')&&mycss.includes('.mycm-mobile-quick{display:grid'));
  add('pwa: manifest is standards-ready',manifest.name==='Carrowmont'&&manifest.short_name==='Carrowmont'&&manifest.start_url==='/my-carrowmont.html?source=pwa'&&manifest.scope==='/'&&manifest.display==='standalone'&&manifest.prefer_related_applications===false);
  add('pwa: required 192 and 512 icons are declared and present',Array.isArray(manifest.icons)&&manifest.icons.some(x=>x.sizes==='192x192')&&manifest.icons.some(x=>x.sizes==='512x512')&&exists('draw004.github.io/assets/pwa/carrowmont-192.png')&&exists('draw004.github.io/assets/pwa/carrowmont-512.png'));
  add('pwa: shortcuts cover My Carrowmont Ask and Tools',Array.isArray(manifest.shortcuts)&&manifest.shortcuts.some(x=>x.url==='/my-carrowmont.html')&&manifest.shortcuts.some(x=>x.url==='/ask-carrowmont.html')&&manifest.shortcuts.some(x=>x.url==='/tools.html'));
  add('pwa: custom install interception is limited to the My Carrowmont install button',site.includes("if(!button) return;")&&site.includes("event.preventDefault();deferredPrompt=event;button.hidden=false;"));
  add('pwa: no service worker or offline financial-data cache is introduced',!site.includes('serviceWorker.register')&&!exists('draw004.github.io/service-worker.js')&&!exists('draw004.github.io/sw.js'));
  add('about: product positioning moves beyond calculator directory',about.includes('financial planning system, not just a directory of calculators')&&about.includes('track what changed over time'));
  add('docs: Batch 8E implementation and acceptance ledger exist',exists('draw004.github.io/docs/CARROWMONT_FRE_BATCH8E_PRODUCT_STORY_MOBILE_FOUNDATION.md')&&exists('draw004.github.io/docs/CARROWMONT_FRE_BATCH8E_ACCEPTANCE_LEDGER.md')&&exists('draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V19.json'));
  return checks;
}
