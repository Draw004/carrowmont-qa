import fs from 'node:fs';
import path from 'node:path';

export function runFreHeadlineAndDrawCContract(root){
  const checks=[];
  const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const repos=['draw004.github.io','sip-calculator','goal-planner','financial-independence','inflation-calculator','retirement-calculator','budget-cash-flow-planner','mortgage-payoff-calculator','compound-interest-calculator','loan-calculator'];
  let checked=0;const violations=[];
  for(const repo of repos){
    const dir=path.join(root,repo);
    if(!fs.existsSync(dir)){violations.push('missing repository: '+repo);continue;}
    const stack=[dir];
    while(stack.length){
      const current=stack.pop();
      for(const ent of fs.readdirSync(current,{withFileTypes:true})){
        if(ent.name==='.git'||ent.name==='node_modules')continue;
        const p=path.join(current,ent.name);
        if(ent.isDirectory()){stack.push(p);continue;}
        if(!ent.name.endsWith('.html'))continue;
        const content=fs.readFileSync(p,'utf8');checked++;
        for(const h of content.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)){
          const visible=h[2].replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').trim();
          if(visible.endsWith('...')||!visible.endsWith('.'))continue;
          // A terminal full stop in initials/abbreviations is meaningful, not decorative.
          if(/(?:\b[A-Z]\.\s*){2,}$/.test(visible)||/\b(?:Dr|Mr|Mrs|Ms|Prof|etc|vs)\.$/i.test(visible))continue;
          violations.push(path.relative(root,p)+': '+visible.slice(0,90));
        }
      }
    }
  }
  add('headings: sitewide H1-H6 typography has no terminal decorative periods',checked>=145&&violations.length===0,violations.slice(0,10).join(' | ')||`Audited ${checked} HTML documents`);
  const main=path.join(root,'draw004.github.io');
  const page=fs.readFileSync(path.join(main,'my-carrowmont.html'),'utf8');
  const css=fs.readFileSync(path.join(main,'assets/dashboard/my-carrowmont.css'),'utf8');
  const home=fs.readFileSync(path.join(main,'index.html'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(main,'carrowmont.webmanifest'),'utf8'));
  const homeBoot=fs.readFileSync(path.join(main,'assets/pwa/carrowmont-launch.css'),'utf8');
  add('PWA: stable installed-app identity, Home launch and approved top-to-bottom Draw the C',
    manifest.id==='/my-carrowmont.html' && manifest.start_url==='/?source=pwa' &&
    home.includes('d="M355 164 C306 109') && home.includes('Plan today. Build tomorrow.') &&
    home.includes('class="cm-home-pwa-c-finish"') && homeBoot.includes('cm-home-draw-c'));
  add('PWA: full-screen intro is mobile icon-launch-only, website/desktop navigation is immediate',
    home.includes("searchParams.get('source') === 'pwa'") && home.includes("matchMedia('(display-mode: standalone)')") &&
    home.includes("matchMedia('(max-width: 700px)')") && home.includes("matchMedia('(prefers-reduced-motion: reduce)')") &&
    (home.includes("root.classList.remove('cm-home-pwa-launch')")||home.includes("root.classList.remove('cm-home-pwa-launch','cm-home-pwa-dismissing')")) &&
    page.includes("window.location.replace('/?source=pwa')") &&
    !page.includes('window.setTimeout(release,1600)') &&
    homeBoot.includes('pointer-events:none'));
  const site=fs.readFileSync(path.join(main,'site.js'),'utf8');
  const plan=fs.readFileSync(path.join(main,'assets/account/carrowmont-financial-plan.js'),'utf8');
  const dashboard=fs.readFileSync(path.join(main,'assets/dashboard/my-carrowmont.js'),'utf8');
  add('install guidance remains visible without a browser prompt and retains a one-click prompt if offered',
    page.includes('id="cmPwaInstallShortcut"') && site.includes('function instructions()') &&
    site.includes('function update()') && site.includes('event.preventDefault();') && site.includes('deferredPrompt=event;') && site.includes('update();') &&
    site.includes("if(card)card.hidden=isInstalled;") && site.includes("How to install"));
  add('dynamic display headings: no trailing periods in newsletter and dashboard large headings',!site.includes('week.</h2>')&&!plan.includes('view.</h2>')&&!plan.includes('forecast.</h3>')&&!dashboard.includes('wheel.</h3>'));
  return checks;
}
