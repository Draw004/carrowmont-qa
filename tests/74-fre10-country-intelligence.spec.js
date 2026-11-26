import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow, monitorPageErrors, setInput } from '../helpers/common.js';

async function selectLocale(page, regionCode, currencyCode){
  const summary=page.locator('#localeSummary, #localeMenu > summary, summary.locale-summary').first();
  if(await summary.count()){
    const details=summary.locator('xpath=ancestor::details[1]');
    if((await details.count())&&!(await details.getAttribute('open')))await summary.click();
  }
  const region=page.locator('#regionSelect');
  await expect(region).toBeAttached();
  await region.selectOption(regionCode);
  const currency=page.locator('#currencySelect');
  if(await currency.count())await currency.selectOption(currencyCode);
  const done=page.locator('#localeDone, #localeDoneBtn').filter({visible:true}).first();
  if(await done.count())await done.click();
  await page.waitForFunction(code=>window.CarrowmontLocale?.getRegion?.()===code,regionCode);
  await page.waitForTimeout(120);
}

// Policy rates change through the reviewed official-reference updater. Compare the
// browser against the canonical published reference, not a frozen rate fixture.
// Keep country names and inflation frameworks explicit to protect coverage.
const supported=[
  ['IN','INR','India','4% target; 2%-6% tolerance band'],
  ['US','USD','United States','2%'],
  ['GB','GBP','United Kingdom','2%'],
  ['CA','CAD','Canada','2% target; 1%-3% control range'],
  ['AU','AUD','Australia','2%-3%'],
  ['JP','JPY','Japan','2%'],
  ['KR','KRW','South Korea','2%'],
  ['FR','EUR','France','2% over the medium term'],
  ['IT','EUR','Italy','2% over the medium term']
];

async function getPublishedReferences(page) {
  const url = new URL('/data/country-financial-reference.json', page.url()).toString();
  const response = await page.request.get(url);
  expect(response.ok(), `The published official references must load: ${url}`).toBe(true);
  const data = await response.json();
  expect(data.schemaVersion).toBe(1);
  expect(data.markets).toBeTruthy();
  return data.markets;
}

test.describe('FRE10 Country-Aware Financial Intelligence',()=>{
  test('[AUTO] nine supported country profiles show sourced official context and locale switches do not overwrite the calculator rate',async({page})=>{
    const errors=monitorPageErrors(page);
    await page.setViewportSize({width:1280,height:900});
    await gotoClean(page,'/home-affordability-calculator.html');
    const rate=page.locator('#annualRate');await setInput(page,'#annualRate',7.25);await expect(rate).toHaveValue('7.25');
    const references=await getPublishedReferences(page);
    for(const [region,currency,country,inflation] of supported){
      const official=references[region];
      expect(official?.country, `${region} must have the reviewed country identity`).toBe(country);
      expect(official?.policyRate?.display, `${region} must have a reviewed policy-rate display`).toMatch(/\d/);
      expect(official?.policyRate?.sourceUrl, `${region} must link to an official source`).toMatch(/^https:\/\//);
      await selectLocale(page,region,currency);
      const card=page.locator('#cmCountryContext');await expect(card).toBeVisible();
      await expect(card).toHaveAttribute('data-cm-country-region',region);
      await expect(card).toContainText(`Official reference points for ${country}`);
      await expect(card).toContainText(official.policyRate.display);
      await expect(card).toContainText(inflation);
      await expect(card).toContainText('does not automatically replace an entered interest rate');
      await expect(rate).toHaveValue('7.25');
    }
    expect(errors).toEqual([]);
  });

  test('[AUTO] unsupported localized countries do not receive invented country-specific reference data',async({page})=>{
    await gotoClean(page,'/home-affordability-calculator.html');
    await selectLocale(page,'IN','INR');await expect(page.locator('#cmCountryContext')).toBeVisible();
    await selectLocale(page,'NZ','NZD');await expect(page.locator('#cmCountryContext')).toBeHidden();
    await selectLocale(page,'CN','CNY');await expect(page.locator('#cmCountryContext')).toBeHidden();
  });

  test('[AUTO] inflation tools state that an official target is not today\'s inflation or a forecast and preserve the entered assumption',async({page})=>{
    await gotoClean(page,'/inflation-calculator/');
    const input=page.locator('#inflationInput');await expect(input).toHaveValue('5');
    await selectLocale(page,'US','USD');
    const card=page.locator('#cmCountryContext');await expect(card).toBeVisible();
    await expect(card).toContainText("not today's inflation and not a forecast");
    await expect(input).toHaveValue('5');
    const references=await getPublishedReferences(page);
    const api=await page.evaluate(async()=>{const item=await window.CarrowmontCountryIntelligence.getReference('US');return {country:item.country,policy:item.policyRate.display};});
    expect(api).toEqual({country:references.US.country,policy:references.US.policyRate.display});
  });

  test('[AUTO] official source links and mobile Country Context geometry remain usable',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,'/home-affordability-calculator.html');await selectLocale(page,'FR','EUR');
    const card=page.locator('#cmCountryContext');await expect(card).toBeVisible();await card.locator('summary').click();
    const links=card.locator('a[target="_blank"][rel="noopener"]');await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute('href',/ecb\.europa\.eu/);await expect(links.nth(1)).toHaveAttribute('href',/ecb\.europa\.eu/);
    await assertNoHorizontalOverflow(page,'Batch 10 Country Context 390px');
  });
});
