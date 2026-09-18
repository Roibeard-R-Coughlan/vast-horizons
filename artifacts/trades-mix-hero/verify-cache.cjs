const { chromium, devices } = require('../browser-check/node_modules/playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  // Model a phone that cached the shared stylesheet before the video hero existed.
  const staleCss = execFileSync('git', ['show', '65e90e5:assets/css/styles.css'], { encoding: 'utf8' });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
    page.setDefaultTimeout(10000);
    const requests = [];
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/chatbase\.co/, route => route.abort());
    await page.route(/\/assets\/(css\/styles\.css|js\/site\.js)(\?|$)/, route => {
      const url = new URL(route.request().url());
      requests.push(url.pathname + url.search);
      const isCss = url.pathname.endsWith('.css');
      const body = url.search ? fs.readFileSync('.' + url.pathname, 'utf8') : (isCss ? staleCss : '');
      return route.fulfill({ contentType: isCss ? 'text/css' : 'application/javascript', body });
    });
    await page.goto('http://127.0.0.1:4173/trades/');
    await page.waitForFunction(() => document.querySelector('video').currentTime > .3);
    const state = await page.evaluate(() => {
      const video = document.querySelector('video');
      const rect = video.getBoundingClientRect();
      const media = video.parentElement.getBoundingClientRect();
      return {
        viewport: innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        position: getComputedStyle(video).position,
        width: rect.width,
        height: rect.height,
        contained: rect.top >= media.top - 1 && rect.bottom <= media.bottom + 1,
        poster: getComputedStyle(document.querySelector('.trades-hero-poster')).visibility,
        nativeLoop: video.loop
      };
    });
    assert.equal(state.viewport, 390);
    assert.equal(state.pageWidth, 390);
    assert.equal(state.position, 'absolute');
    assert.equal(state.width, 390);
    assert.ok(state.height <= 844 - 70 + 1);
    assert.equal(state.contained, true);
    assert.equal(state.poster, 'hidden');
    assert.equal(state.nativeLoop, true);
    assert.equal(requests.length, 2);
    assert.ok(requests.every(url => url.includes('?v=20260918-trades-video-3')));
    await page.screenshot({ path: 'artifacts/browser-check/trades-stale-css-fixed.png' });
    await page.locator('video').evaluate(video => video.currentTime = video.duration * .7);
    await page.waitForFunction(() => !document.querySelector('video').seeking);
    assert.equal(await page.locator('video').evaluate(video => video.getBoundingClientRect().width), 390);
    await page.evaluate(() => document.querySelector('#audit').scrollIntoView({ behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('video').paused);
    assert.deepEqual(errors, []);
    console.log('PASS: versioned assets bypass stale CSS and JavaScript; one bounded playing video; no overflow or JavaScript errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
