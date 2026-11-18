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
  add('PWA: Draw the C renders the complete approved icon at animation end',page.includes('cm-pwa-draw-stroke')&&page.includes('cm-pwa-draw-finish')&&page.includes('carrowmont-512.png')&&css.includes('100%{opacity:1}')&&css.includes('stroke-dashoffset:0'));
  add('PWA: reduced motion, bounded dismissal, and non-blocking overlay remain intact',page.includes('window.setTimeout(release,1600)')&&page.includes('prefers-reduced-motion: reduce')&&css.includes('pointer-events:none')&&css.includes('@media(prefers-reduced-motion:reduce)'));
  const site=fs.readFileSync(path.join(main,'site.js'),'utf8');
  const plan=fs.readFileSync(path.join(main,'assets/account/carrowmont-financial-plan.js'),'utf8');
  const dashboard=fs.readFileSync(path.join(main,'assets/dashboard/my-carrowmont.js'),'utf8');
  add('dynamic display headings: no trailing periods in newsletter and dashboard large headings',!site.includes('week.</h2>')&&!plan.includes('view.</h2>')&&!plan.includes('forecast.</h3>')&&!dashboard.includes('wheel.</h3>'));
  return checks;
}
