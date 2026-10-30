import { test, expect } from '@playwright/test';

const KIT_URL = 'https://carrowmont.kit.com/6ba4a35ab0/index.js';

async function mockKit(page) {
  await page.route(KIT_URL, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `(() => { const s=document.currentScript; if(!s) return; const f=document.createElement('form'); f.className='formkit-form'; f.setAttribute('data-testid','mock-kit-form'); f.innerHTML='<label>Email Address<input type="email" aria-label="Email Address"></label><button type="submit">Get the weekly money briefing</button><span>Built with Kit</span>'; s.before(f); })();`
    });
  });
}

async function revealNewsletter(page) {
  const section = page.locator('[data-cm-newsletter]');
  await expect(section).toHaveCount(1);
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator('[data-testid="mock-kit-form"]')).toBeVisible();
  return section;
}

test.describe('NEWSLETTER1 Carrowmont Money in Real Life', () => {
  test('homepage keeps guest-first promise and loads the approved Kit signup near viewport', async ({ page }) => {
    await mockKit(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByText('No account required', { exact: true })).toBeVisible();
    await expect(page.getByText('No sign-up required', { exact: true })).toHaveCount(0);
    const section = await revealNewsletter(page);
    await expect(section.getByText('Money explained for real life — once a week.', { exact: true })).toBeVisible();
    await expect(section.getByText('Key developments', { exact: true })).toBeVisible();
    await expect(section.getByText('Real-life impact', { exact: true })).toBeVisible();
    await expect(section.getByText('Practical next steps', { exact: true })).toBeVisible();
    await expect(section.locator('.cm-newsletter-promise-icon svg')).toHaveCount(3);
    await expect(section.getByText('No hype', { exact: true })).toHaveCount(0);
    await expect(section.getByText('No stock tips', { exact: true })).toHaveCount(0);
    await expect(section.getByText(/No Carrowmont account required/)).toBeVisible();
    await expect(section.locator('script[data-uid="6ba4a35ab0"][src="https://carrowmont.kit.com/6ba4a35ab0/index.js"]')).toHaveCount(1);
  });

  test('Learn article receives one compact newsletter module after article content', async ({ page }) => {
    await mockKit(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/4-percent-rule-retirement.html');
    const section = await revealNewsletter(page);
    await expect(section).toHaveAttribute('data-cm-newsletter-context', 'article');
    await expect(page.locator('main > [data-cm-newsletter]')).toHaveCount(1);
    await expect(section.locator('a[href="/privacy.html"]')).toBeVisible();
  });

  test('Research study receives one newsletter module without changing study identity', async ({ page }) => {
    await mockKit(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/research/inflation-purchasing-power-monitor.html');
    await expect(page.locator('body')).toHaveClass(/research-page/);
    const section = await revealNewsletter(page);
    await expect(section).toHaveAttribute('data-cm-newsletter-context', 'article');
    await expect(section.getByRole('button', { name: 'Get the weekly money briefing' })).toBeVisible();
  });

  test('mobile newsletter module fits 390 and 360 without horizontal overflow', async ({ page }) => {
    await mockKit(page);
    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      const section = await revealNewsletter(page);
      await expect(section.locator('[data-testid="mock-kit-form"]')).toBeVisible();
      const dims = await page.evaluate(() => ({ body: document.body.scrollWidth, doc: document.documentElement.scrollWidth, width: window.innerWidth }));
      expect(dims.body).toBeLessThanOrEqual(dims.width);
      expect(dims.doc).toBeLessThanOrEqual(dims.width);
    }
  });

  test('privacy explains active newsletter processing and confirmation page remains noindex', async ({ page }) => {
    await page.goto('/privacy.html');
    await expect(page.getByRole('heading', { name: 'Newsletter subscriptions' })).toBeVisible();
    await expect(page.getByText(/uses Kit to collect and store your email address/)).toBeVisible();
    await expect(page.getByText(/does not send calculator inputs or calculated financial results to Kit/)).toBeVisible();
    await page.goto('/newsletter-confirmed.html');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
    await expect(page.getByRole('heading', { name: "You're subscribed." })).toBeVisible();
  });
});
