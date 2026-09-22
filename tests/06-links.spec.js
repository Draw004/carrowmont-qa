import { test, expect } from '@playwright/test';
import { tools, mainSitePages } from '../qa.config.js';
import { gotoClean } from '../helpers/common.js';

const pages = [...tools.map(t => ({ key: t.key, path: t.path })), ...mainSitePages];

test.describe('Internal link health', () => {
  for (const item of pages) {
    test(`[AUTO] ${item.key}: same-origin links do not return 4xx/5xx`, async ({ page, request }, testInfo) => {
      test.skip(testInfo.project.name !== 'chrome-desktop', 'Link health only needs one browser');
      await gotoClean(page, item.path);
      const baseOrigin = new URL(page.url()).origin;
      const hrefs = await page.locator('a[href]').evaluateAll(nodes => [...new Set(nodes.map(a => a.href).filter(Boolean))]);
      const sameOrigin = hrefs.filter(h => {
        try {
          const u = new URL(h);
          return u.origin === baseOrigin && !u.href.includes('#') && !u.pathname.match(/\.(pdf|zip|png|jpg|jpeg|svg)$/i);
        } catch (_) { return false; }
      }).slice(0, 40);
      const failures = [];
      for (const href of sameOrigin) {
        const response = await request.get(href, { timeout: 15000, failOnStatusCode: false });
        if (response.status() >= 400) failures.push(`${response.status()} ${href}`);
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }
});
