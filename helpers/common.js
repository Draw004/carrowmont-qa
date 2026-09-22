import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

export async function gotoClean(page, targetPath) {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
  });
  const response = await page.goto(targetPath, { waitUntil: 'domcontentloaded' });
  expect(response, `No navigation response for ${targetPath}`).not.toBeNull();
  expect(response.status(), `${targetPath} returned HTTP ${response.status()}`).toBeLessThan(400);
  await page.waitForLoadState('networkidle').catch(() => {});
}

export function monitorPageErrors(page) {
  const errors = [];
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

export async function setInput(page, selector, value) {
  const locator = page.locator(selector);
  await expect(locator, `${selector} should exist`).toHaveCount(1);
  await locator.fill(String(value));
  await locator.dispatchEvent('input');
  await locator.dispatchEvent('change');
  await locator.blur();
  await page.waitForTimeout(120);
}

export function parseMoney(text) {
  if (text == null) return NaN;
  const raw = String(text).replace(/,/g, '').replace(/\u00a0/g, ' ').trim();
  if (!raw || /—|No gap|No increase required/i.test(raw)) return 0;
  const match = raw.match(/(-?\d+(?:\.\d+)?)\s*(Cr|Crore|L|Lakh|K|M|B)?/i);
  if (!match) return NaN;
  const n = Number(match[1]);
  const unit = (match[2] || '').toLowerCase();
  const mult = unit === 'cr' || unit === 'crore' ? 1e7
    : unit === 'l' || unit === 'lakh' ? 1e5
    : unit === 'k' ? 1e3
    : unit === 'm' ? 1e6
    : unit === 'b' ? 1e9
    : 1;
  return n * mult;
}

export function parsePercent(text) {
  const m = String(text || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

export function relativeError(actual, expected) {
  if (expected === 0) return Math.abs(actual);
  return Math.abs(actual - expected) / Math.abs(expected);
}

export async function assertNoHorizontalOverflow(page, label = 'page') {
  const dims = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    body: document.body ? document.body.scrollWidth : 0
  }));
  expect(Math.max(dims.doc, dims.body), `${label} has horizontal overflow: ${JSON.stringify(dims)}`).toBeLessThanOrEqual(dims.viewport + 2);
}

export async function assertInsideParent(page, childSelector, parentSelector) {
  const result = await page.evaluate(({ childSelector, parentSelector }) => {
    const child = document.querySelector(childSelector);
    const parent = document.querySelector(parentSelector);
    if (!child || !parent) return { ok: false, reason: 'missing element', child: !!child, parent: !!parent };
    const c = child.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    return {
      ok: c.left >= p.left - 1 && c.right <= p.right + 1 && c.top >= p.top - 1 && c.bottom <= p.bottom + 1,
      child: { left: c.left, right: c.right, top: c.top, bottom: c.bottom, width: c.width },
      parent: { left: p.left, right: p.right, top: p.top, bottom: p.bottom, width: p.width }
    };
  }, { childSelector, parentSelector });
  expect(result.ok, `${childSelector} is outside ${parentSelector}: ${JSON.stringify(result)}`).toBeTruthy();
}

export async function installCanvasTextProbe(page) {
  await page.evaluate(() => {
    window.__carrowmontQaCanvasText = [];
    const proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
    if (!proto || proto.__carrowmontQaPatched) return;
    proto.__carrowmontQaPatched = true;
    const fill = proto.fillText;
    const stroke = proto.strokeText;
    proto.fillText = function(text, ...args) {
      try { window.__carrowmontQaCanvasText.push(String(text)); } catch (_) {}
      return fill.call(this, text, ...args);
    };
    proto.strokeText = function(text, ...args) {
      try { window.__carrowmontQaCanvasText.push(String(text)); } catch (_) {}
      return stroke.call(this, text, ...args);
    };
  });
}

export async function getCanvasText(page) {
  return await page.evaluate(() => (window.__carrowmontQaCanvasText || []).join('\n'));
}

export async function validatePdfDownload(download, minPages = 1) {
  const suggested = download.suggestedFilename();
  expect(suggested.toLowerCase()).toMatch(/\.pdf$/);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const bytes = fs.readFileSync(filePath);
  expect(bytes.length, `Downloaded PDF ${suggested} is suspiciously small`).toBeGreaterThan(10000);
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('%PDF');
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  expect(pdf.getPageCount(), `${suggested} should have at least ${minPages} pages`).toBeGreaterThanOrEqual(minPages);
  return { suggested, filePath, bytes: bytes.length, pages: pdf.getPageCount() };
}

export async function saveReferenceScreenshot(page, projectName, key, viewportName) {
  const dir = path.resolve('qa-artifacts', 'visual', projectName);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${key}-${viewportName}.png`);
  await page.screenshot({ path: out, fullPage: true });
  return out;
}

export async function svgText(page, selector) {
  return await page.locator(selector).evaluate(el => el.textContent || '');
}

export async function chartHasGeometry(page, selector) {
  const data = await page.locator(selector).evaluate(el => {
    const svg = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg');
    const target = svg || el;
    const rect = target.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      paths: target.querySelectorAll ? target.querySelectorAll('path, polyline, line').length : 0,
      texts: target.querySelectorAll ? target.querySelectorAll('text').length : 0,
      content: (target.textContent || '').trim()
    };
  });
  expect(data.width, `${selector} width`).toBeGreaterThan(150);
  expect(data.height, `${selector} height`).toBeGreaterThan(100);
  expect(data.paths, `${selector} should contain chart geometry`).toBeGreaterThan(2);
  return data;
}
