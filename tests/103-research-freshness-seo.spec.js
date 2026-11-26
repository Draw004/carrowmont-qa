import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow, monitorPageErrors } from '../helpers/common.js';

const mortgage='/research/mortgage-affordability-monitor.html';
const inflation='/research/inflation-purchasing-power-monitor.html';
const host='https://carrowmont.com';

// RESEARCH-FRESHNESS1 + SEO1: prevent accidental URL growth, broken indexing or stale "current" labels.
test.describe('Research official-source freshness and SEO URL integrity',()=>{
  test('[AUTO] fresh official source status is visible and historical calculator datasets stay labelled as snapshots',async({page})=>{
    const errors=monitorPageErrors(page);
    await gotoClean(page,mortgage);
    await expect(page.locator('#research-freshness')).toBeVisible();
    await expect(page.locator('#research-freshness')).toContainText('7.21%');
    await expect(page.locator('#research-freshness')).toContainText('$391,300');
    await expect(page.locator('#research-freshness')).toContainText('not been recalculated');
    await expect(page.locator('.research-finding')).toContainText('7.32%');
    await expect(page.locator('th').filter({hasText:'7.32% study rate'})).toHaveCount(1);
    await gotoClean(page,inflation);
    await expect(page.locator('#research-freshness')).toBeVisible();
    await expect(page.locator('#research-freshness')).toContainText('October 2026 CPI');
    await expect(page.locator('#research-freshness')).toContainText('0.4% for the month');
    await expect(page.locator('.research-meta')).toContainText('Study snapshot:');
    await expect(page.locator('.research-meta')).toContainText('10 December 2026');
    await expect(page.locator('.research-finding')).toContainText('3.7%');
    expect(errors).toEqual([]);
  });

  test('[AUTO] verified official notes and archived research datasets are distinct in JSON downloads',async({request})=>{
    const m=await (await request.get('/data/research/mortgage-affordability-monitor.json')).json();
    expect(m.official_source_status.checked_on).toBe('2026-11-26');
    expect(m.official_source_status.dataset_is_archived_snapshot).toBe(true);
    expect(m.official_source_status.latest_official_mortgage_rate.rate_30yr_pct).toBe(7.21);
    expect(m.official_source_status.latest_official_new_home_price.median_usd).toBe(391300);
    expect(m.headline_metrics.current_30yr_fixed_pct).toBe(7.32);
    const i=await (await request.get('/data/research/inflation-purchasing-power-monitor.json')).json();
    expect(i.official_source_status.checked_on).toBe('2026-11-26');
    expect(i.official_source_status.dataset_is_archived_snapshot).toBe(true);
    expect(i.official_source_status.latest_official_cpi.month_on_month_seasonally_adjusted_pct).toBe(0.4);
    expect(i.official_metrics.all_items_yoy_nsa_pct).toBe(3.7);
  });

  test('[AUTO] sitemap URLs stay readable, stable, uniquely indexed and below precautionary length guard',async({request})=>{
    const sitemap=await (await request.get('/sitemap.xml')).text();
    const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
    const index=await (await request.get('/data/carrowmont-search-index.json')).json();
    expect(urls).toHaveLength(151);
    expect(new Set(urls).size).toBe(urls.length);
    const indexed=index.entries.map(entry=>host+(entry.url==='/'?'/':entry.url));
    expect(new Set(indexed)).toEqual(new Set(urls));
    for(const original of urls){
      const u=new URL(original);
      expect(u.origin).toBe(host);
      expect(u.pathname.length,original).toBeLessThanOrEqual(120);
      expect(u.search,original).toBe('');
      expect(u.hash,original).toBe('');
      expect(/[A-Z\s]/.test(u.pathname),original).toBe(false);
    }
  });

  test('[AUTO] research canonicals and updated schema dates match the sitemap',async({page})=>{
    for(const destination of [mortgage,inflation]){
      await gotoClean(page,destination);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',host+destination);
      await expect(page.locator('meta[property="article:modified_time"]')).toHaveAttribute('content','2026-11-26');
      const objects=await page.locator('script[type="application/ld+json"]').allTextContents();
      const nodes=objects.flatMap(body=>{const data=JSON.parse(body);return data['@graph']??[data];});
      const article=nodes.find(node=>node['@type']==='Article');
      expect(article?.dateModified).toBe('2026-11-26');
    }
  });

  test('[AUTO] [1440,1280,390,360] refreshed research pages remain overflow-safe',async({page})=>{
    for(const width of [1440,1280,390,360]){
      await page.setViewportSize({width,height:1000});
      for(const destination of [mortgage,inflation]){
        await gotoClean(page,destination);
        await assertNoHorizontalOverflow(page,`research source status ${width}px ${destination}`);
        await expect(page.locator('#research-freshness')).toBeVisible();
      }
    }
  });
});
