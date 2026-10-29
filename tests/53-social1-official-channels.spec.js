import { test, expect } from '@playwright/test';

const CHANNELS = [
  'https://www.linkedin.com/company/carrowmont/',
  'https://www.facebook.com/carrowmont',
  'https://www.instagram.com/carrowmont.finance/',
  'https://www.youtube.com/@carrowmontfinance'
];


const BRAND_COLORS = {
  linkedin: 'rgb(10, 102, 194)',
  facebook: 'rgb(24, 119, 242)',
  youtube: 'rgb(255, 0, 0)'
};

async function expectBrandColourSet(scope, instagramGradientId, footer = false) {
  const iconClass = footer ? '.footer-social-icon' : '.social-platform-icon svg';
  const linkedIn = scope.locator(`a[href="${CHANNELS[0]}"] ${iconClass}`);
  const facebook = scope.locator(`a[href="${CHANNELS[1]}"] ${iconClass}`);
  const instagram = scope.locator(`a[href="${CHANNELS[2]}"] ${iconClass}`);
  const youtube = scope.locator(`a[href="${CHANNELS[3]}"] ${iconClass}`);

  await expect(linkedIn).toHaveCSS('color', BRAND_COLORS.linkedin);
  await expect(facebook).toHaveCSS('color', BRAND_COLORS.facebook);
  await expect(youtube).toHaveCSS('color', BRAND_COLORS.youtube);
  await expect(instagram.locator(`linearGradient#${instagramGradientId}`)).toHaveCount(1);
  await expect(instagram.locator(`linearGradient#${instagramGradientId} stop`)).toHaveCount(5);
}

test.describe('SOCIAL1 official channels', () => {
  test('homepage publishes the official social identity in Organization schema', async ({ page }) => {
    await page.goto('/');
    const graph = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(graph).toBeTruthy();
    const data = JSON.parse(graph);
    const org = data['@graph'].find((node) => node['@type'] === 'Organization');
    expect(org.sameAs).toEqual(CHANNELS);
    expect(org.email).toBe('contact@carrowmont.com');
  });

  test('homepage exposes a visible Follow Carrowmont section with all four official links', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('.social-follow-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Financial awareness, beyond the calculator.' })).toBeVisible();
    for (const href of CHANNELS) {
      const link = section.locator(`a[href="${href}"]`);
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(link.locator('.social-platform-icon svg')).toHaveCount(1);
    }
    await expectBrandColourSet(section, 'cmInstagramGradientHome');
  });

  test('shared site footer exposes official social links on a content page', async ({ page }) => {
    await page.goto('/learn.html');
    const footer = page.locator('.site-footer');
    const social = footer.locator('[data-cm-footer-social]');
    await expect(social).toBeVisible();
    for (const href of CHANNELS) {
      const link = social.locator(`a[href="${href}"]`);
      await expect(link).toHaveCount(1);
      await expect(link.locator('svg.footer-social-icon')).toHaveCount(1);
    }
    await expectBrandColourSet(social, 'cmInstagramGradientFooter', true);
  });

  test('About page carries the financial-awareness promise without becoming recommendation copy', async ({ page }) => {
    await page.goto('/about.html');
    await expect(page.getByRole('heading', { name: 'Understand the system. See the impact. Make your own decision.' })).toBeVisible();
    await expect(page.getByText('We do not exist to tell people what to buy or sell.')).toBeVisible();
  });

  test('Contact page provides the four official social destinations', async ({ page }) => {
    await page.goto('/contact.html');
    const panel = page.locator('.contact-social-panel');
    await expect(panel).toBeVisible();
    for (const href of CHANNELS) {
      const link = panel.locator(`a[href="${href}"]`);
      await expect(link).toHaveCount(1);
      await expect(link.locator('.social-platform-icon svg')).toHaveCount(1);
    }
    await expectBrandColourSet(panel, 'cmInstagramGradientContact');
  });

  test('SOCIAL1 homepage and contact page do not create horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/contact.html']) {
      await page.goto(path);
      const dims = await page.evaluate(() => ({ body: document.body.scrollWidth, doc: document.documentElement.scrollWidth, width: window.innerWidth }));
      expect(dims.body).toBeLessThanOrEqual(dims.width);
      expect(dims.doc).toBeLessThanOrEqual(dims.width);
    }
  });
});
