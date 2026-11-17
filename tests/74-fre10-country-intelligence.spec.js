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

const supported=[
  ['IN','INR','India','5.50%','4% target; 2%-6% tolerance band'],
  ['US','USD','United States','3.75%-4.00%','2%'],
  ['GB','GBP','United Kingdom','4.00%','2%'],
  ['CA','CAD','Canada','2.50%','2% target; 1%-3% control range'],
  ['AU','AUD','Australia','4.85%','2%-3%']
];

test.describe('FRE10 Country-Aware Financial Intelligence',()=>{
  test('[AUTO] five priority markets show sourced official context and locale switches do not overwrite the calculator rate',async({page})=>{
    const errors=monitorPageErrors(page);
    await page.setViewportSize({width:1280,height:900});
    await gotoClean(page,'/home-affordability-calculator.html');
    const rate=page.locator('#annualRate');await setInput(page,'#annualRate',7.25);await expect(rate).toHaveValue('7.25');
    for(const [region,currency,country,policy,inflation] of supported){
      await selectLocale(page,region,currency);
      const card=page.locator('#cmCountryContext');await expect(card).toBeVisible();
      await expect(card).toHaveAttribute('data-cm-country-region',region);
      await expect(card).toContainText(`Official reference points for ${country}`);
      await expect(card).toContainText(policy);
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
  });

  test('[AUTO] inflation tools state that an official target is not today\'s inflation or a forecast and preserve the entered assumption',async({page})=>{
    await gotoClean(page,'/inflation-calculator/');
    const input=page.locator('#inflationInput');await expect(input).toHaveValue('5');
    await selectLocale(page,'US','USD');
    const card=page.locator('#cmCountryContext');await expect(card).toBeVisible();
    await expect(card).toContainText("not today's inflation and not a forecast");
    await expect(input).toHaveValue('5');
    const api=await page.evaluate(async()=>{const item=await window.CarrowmontCountryIntelligence.getReference('US');return {country:item.country,policy:item.policyRate.display};});
    expect(api).toEqual({country:'United States',policy:'3.75%-4.00%'});
  });

  test('[AUTO] official source links and mobile Country Context geometry remain usable',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,'/home-affordability-calculator.html');await selectLocale(page,'AU','AUD');
    const card=page.locator('#cmCountryContext');await expect(card).toBeVisible();await card.locator('summary').click();
    const links=card.locator('a[target="_blank"][rel="noopener"]');await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute('href',/rba\.gov\.au/);await expect(links.nth(1)).toHaveAttribute('href',/rba\.gov\.au/);
    await assertNoHorizontalOverflow(page,'Batch 10 Country Context 390px');
  });
});
