import fs from 'node:fs';
import path from 'node:path';

export function runEvergreenLearnWave1Contract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const exists=rel=>fs.existsSync(path.join(root,rel));
  const main='draw004.github.io/';
  const guides=[
    ['emergency-fund-vs-paying-off-debt.html','Emergency fund vs paying off debt','/ask-carrowmont.html?decision=money-priorities'],
    ['risk-tolerance-vs-risk-capacity.html','Risk tolerance vs risk capacity','/goal-planner/'],
    ['portfolio-rebalancing-explained.html','Portfolio rebalancing','/goal-planner/'],
    ['investment-fees-and-expense-ratios.html','Investment fees','/compound-interest-calculator/'],
    ['market-timing-vs-staying-invested.html','Market timing','/sip-calculator/'],
    ['home-buying-upfront-costs.html','home beyond the deposit','/home-affordability-calculator.html']
  ];
  const learn=read(main+'learn.html');
  const pages=read(main+'data/carrowmont-search-pages.json');
  const index=read(main+'data/carrowmont-search-index.json');
  const sitemap=read(main+'sitemap.xml');
  const status=read(main+'docs/CARROWMONT_CURRENT_PROJECT_STATUS.md');
  const audit=read(main+'docs/CARROWMONT_EVERGREEN_LEARN_CONTENT_GAP_AUDIT_2026-11-25.md');
  const impl=read(main+'docs/CARROWMONT_EVERGREEN_LEARN_WAVE1_IMPLEMENTATION.md');
  const ledger=read(main+'docs/CARROWMONT_EVERGREEN_LEARN_WAVE1_ACCEPTANCE_LEDGER.md');
  const browser=read('carrowmont-qa/tests/101-evergreen-learn-wave1.spec.js');
  const topicUrls=Array.from(learn.matchAll(/<a class="category-topic" href="([^"]+)"/g),m=>m[1]);

  add('Evergreen Wave 1 ships exactly the six approved unique-intent guide files',
    guides.every(([file])=>exists(main+file)) && guides.filter(([file])=>exists(main+file)).length===6);
  add('Every Wave 1 guide has canonical Article metadata, 30-second answer, authoritative-source disclosure, educational disclaimer and practical CTA',
    guides.every(([file,title,cta])=>{
      const html=read(main+file);
      return html.includes(`<link rel="canonical" href="https://carrowmont.com/${file}"`) &&
        html.includes('"@type":"Article"') && html.includes('"datePublished":"2026-11-25"') &&
        html.includes('<strong>30-second answer</strong>') && html.includes('Sources and how this guide was prepared') &&
        html.includes('authoritative consumer-finance and investor-education sources') &&
        html.includes('<strong>Educational information only.</strong>') && html.includes(cta) &&
        html.toLowerCase().includes(title.toLowerCase().split(' ')[0]);
    }));
  add('Wave 1 expands the crawlable Learn source library to 108 unique destinations while preserving eleven categories',
    new Set(topicUrls).size===108 && (learn.match(/class="category-box/g)||[]).length===11 && guides.every(([file])=>learn.includes(`href="/${file}"`)));
  add('Wave 1 is discoverable through both Search source data and generated Search index',
    guides.every(([file])=>pages.includes(`"url": "/${file}"`) && index.includes(`"url": "/${file}"`)) && pages.includes('"reviewed_at": "2026-11-25"'));
  add('Wave 1 updates sitemap with all six public URLs and current lastmod',
    guides.every(([file])=>sitemap.includes(`<loc>https://carrowmont.com/${file}</loc>`) && /2026-11-25/.test(sitemap)));
  add('Wave 1 strengthens bidirectional internal linking from established related guides instead of leaving isolated SEO pages',
    read(main+'emergency-fund-how-much.html').includes('/emergency-fund-vs-paying-off-debt.html') &&
    read(main+'pay-off-debt-or-invest.html').includes('/emergency-fund-vs-paying-off-debt.html') &&
    read(main+'asset-allocation-explained.html').includes('/risk-tolerance-vs-risk-capacity.html') &&
    read(main+'asset-allocation-explained.html').includes('/portfolio-rebalancing-explained.html') &&
    read(main+'investing-for-beginners.html').includes('/investment-fees-and-expense-ratios.html') &&
    read(main+'investing-for-beginners.html').includes('/market-timing-vs-staying-invested.html') &&
    read(main+'mutual-funds-explained.html').includes('/investment-fees-and-expense-ratios.html') &&
    read(main+'how-much-home-can-i-afford.html').includes('/home-buying-upfront-costs.html') &&
    read(main+'sip-during-market-fall.html').includes('/market-timing-vs-staying-invested.html'));
  add('Wave 1 research record is multi-market, authoritative and explicitly avoids volume/collision publishing',
    Boolean(audit&&impl&&ledger) && ['MoneyHelper','Consumer Financial Protection Bureau','Investor.gov','Moneysmart','SEBI','Reserve Bank of India','Financial Consumer Agency of Canada','Financial Conduct Authority'].every(x=>audit.includes(x)) &&
    audit.includes('Priority A') && audit.includes('Priority B') && /collision|duplicate/i.test(audit) && impl.includes('six new public Learn URLs'));
  add('Wave 1 continuity keeps deployment/indexing gated behind the full green release path',
    status.includes('Evergreen Learn Expansion Wave 1') && status.includes('active controlled review release') &&
    impl.includes('Publisher') && impl.includes('IndexNow') && ledger.includes('Publisher') && ledger.includes('Source Snapshot'));
  add('Wave 1 browser QA covers direct article quality, Learn discovery, related CTA paths and mobile overflow',
    browser.includes('six new evergreen guides load with durable article metadata') && browser.includes('Learn Hub discovers the new decision and investing guides') &&
    browser.includes('new evergreen guides stay mobile-safe') && browser.includes('related action paths remain real links'));
  return checks;
}
