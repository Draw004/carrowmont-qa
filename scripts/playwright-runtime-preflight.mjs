import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const EXPECTED_PLAYWRIGHT = '1.65.0';
const ATTEMPTS = 3;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = process.platform === 'win32'
  ? path.join(projectRoot, 'node_modules', '.bin', 'playwright.cmd')
  : path.join(projectRoot, 'node_modules', '.bin', 'playwright');

function fail(message) {
  console.error(`QA RUNTIME FAILURE: ${message}`);
  process.exit(1);
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const rootPackage = readJSON(path.join(projectRoot, 'package.json'));
const lock = readJSON(path.join(projectRoot, 'package-lock.json'));
const testPackage = readJSON(require.resolve('@playwright/test/package.json'));
const corePackagePath = require.resolve('playwright-core/package.json');
const corePackage = readJSON(corePackagePath);

if (rootPackage.devDependencies?.['@playwright/test'] !== EXPECTED_PLAYWRIGHT)
  fail(`package.json must pin @playwright/test exactly to ${EXPECTED_PLAYWRIGHT}.`);
if (lock.packages?.['node_modules/@playwright/test']?.version !== EXPECTED_PLAYWRIGHT)
  fail(`package-lock.json must lock @playwright/test to ${EXPECTED_PLAYWRIGHT}.`);
if (testPackage.version !== EXPECTED_PLAYWRIGHT || corePackage.version !== EXPECTED_PLAYWRIGHT)
  fail(`installed Playwright versions do not match ${EXPECTED_PLAYWRIGHT} (test=${testPackage.version}, core=${corePackage.version}).`);
if (!fs.existsSync(cli))
  fail(`local Playwright CLI is missing: ${cli}`);

console.log(`QA runtime Playwright version: ${EXPECTED_PLAYWRIGHT}`);

let installed = false;
for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  console.log(`Local Playwright FFmpeg install attempt ${attempt}/${ATTEMPTS}`);
  const result = spawnSync(cli, ['install', 'ffmpeg', '--no-remove'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT: process.env.PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT || '120000'
    }
  });
  if (result.status === 0) {
    installed = true;
    break;
  }
  if (attempt < ATTEMPTS)
    await new Promise(resolve => setTimeout(resolve, attempt * 5000));
}
if (!installed)
  fail('the exact local Playwright version could not install its FFmpeg runtime.');

const browsers = readJSON(path.join(path.dirname(corePackagePath), 'browsers.json'));
const ffmpeg = browsers.browsers.find(item => item.name === 'ffmpeg');
if (!ffmpeg?.revision)
  fail('Playwright browsers.json does not declare an FFmpeg revision.');

const cacheRoot = process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== '0'
  ? process.env.PLAYWRIGHT_BROWSERS_PATH
  : path.join(os.homedir(), '.cache', 'ms-playwright');
const ffmpegDir = path.join(cacheRoot, `ffmpeg-${ffmpeg.revision}`);
if (!fs.existsSync(ffmpegDir))
  fail(`expected FFmpeg revision ${ffmpeg.revision} is not present at ${ffmpegDir}.`);

console.log(`QA runtime FFmpeg revision: ${ffmpeg.revision}`);

const { chromium } = await import('@playwright/test');
const videoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carrowmont-pw-video-'));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    recordVideo: { dir: videoDir, size: { width: 320, height: 240 } }
  });
  const page = await context.newPage();
  await page.setContent('<!doctype html><title>Carrowmont QA runtime preflight</title><p>ok</p>');
  await page.waitForTimeout(150);
  await context.close();
  await browser.close();
  browser = undefined;
} catch (error) {
  if (browser) await browser.close().catch(() => {});
  fail(`Chrome + video preflight failed: ${error?.message || error}`);
}

const videoFiles = fs.readdirSync(videoDir).filter(name => name.endsWith('.webm'));
fs.rmSync(videoDir, { recursive: true, force: true });
if (videoFiles.length === 0)
  fail('Chrome + video preflight completed without producing a video artifact.');

console.log('QA runtime preflight passed: pinned Playwright, matching FFmpeg, Chrome launch, and video capture are operational.');
