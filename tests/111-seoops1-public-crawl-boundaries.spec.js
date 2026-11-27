import { test, expect } from '@playwright/test';
import {
  parseCarrowmontRobots,
  isAllowedByCarrowmontRobots,
  compareSeoOps1Policy
} from '../scripts/seoops1-crawl-boundary-contract.mjs';

const ROBOTS = 'User-agent: *\nDisallow: /docs/\nDisallow: /ops/\nAllow: /\nSitemap: https://carrowmont.com/sitemap.xml\n';
const SITEMAP = `<?xml version="1.0"?><urlset>${Array.from({length:150},(_,i)=>`<url><loc>https://carrowmont.com/${i===0?'':'guide-'+i+'.html'}</loc></url>`).join('')}</urlset>`;

test.describe('SEOOPS1 public crawl boundaries', () => {
  test('[AUTO] published pages are allowed while public operational folder paths are discouraged from crawling', () => {
    const policy = parseCarrowmontRobots(ROBOTS);
    expect(policy.errors).toEqual([]);
    for (const pathname of ['/', '/ask-carrowmont.html', '/learn.html', '/research/emergency-savings-resilience.html', '/retirement-calculator/withdrawal-calculator.html', '/assets/ui/site.css']) {
      expect(isAllowedByCarrowmontRobots(pathname, policy), pathname).toBe(true);
    }
    for (const pathname of ['/docs/CARROWMONT_CURRENT_PROJECT_STATUS.md', '/ops/credential-expiry-registry.json']) {
      expect(isAllowedByCarrowmontRobots(pathname, policy), pathname).toBe(false);
    }
    expect(compareSeoOps1Policy(ROBOTS, SITEMAP)).toEqual([]);
  });

  test('[AUTO] accidental block of a sitemap page is detected', () => {
    const bad = ROBOTS.replace('Disallow: /docs/', 'Disallow: /guide-');
    // Prefix /guide- includes each synthetic public guide URL.
    expect(compareSeoOps1Policy(bad, SITEMAP).join(' ')).toMatch(/indexed public URL is blocked/);
  });

  test('[AUTO] missing operational disallow or incorrect sitemap reference is detected', () => {
    const missing = ROBOTS.replace('Disallow: /ops/\n', '');
    expect(compareSeoOps1Policy(missing, SITEMAP).join(' ')).toMatch(/crawler can reach \/ops\//);
    const wrong = ROBOTS.replace('https://carrowmont.com/sitemap.xml', 'https://example.org/sitemap.xml');
    expect(compareSeoOps1Policy(wrong, SITEMAP).join(' ')).toMatch(/canonical sitemap reference/);
  });

  test('[AUTO] source check is crawler housekeeping, not a site access control or noindex claim', () => {
    const policy = parseCarrowmontRobots(ROBOTS);
    expect(policy.rules.some(r => r.type === 'disallow' && r.path === '/docs/')).toBe(true);
    // A robots rule is a request to well-behaved crawlers, not a 403, login gate or removal request.
    expect(isAllowedByCarrowmontRobots('/docs/example.md', policy)).toBe(false);
    expect(policy).not.toHaveProperty('accessPolicy');
  });
});
