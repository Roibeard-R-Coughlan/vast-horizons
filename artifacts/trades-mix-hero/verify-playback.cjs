const { chromium, devices } = require('../browser-check/node_modules/playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const errors = [];
    const page = await browser.newPage({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/chatbase\.co/, route => route.abort());
    // Prevent native autoplay, then model a browser rejecting scripted autoplay.
    await page.route('**/trades/', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace(' autoplay muted', ' muted') });
    });
    await page.addInitScript(() => {
      Object.defineProperty(HTMLMediaElement.prototype, 'autoplay', { get: () => false, set() {} });
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        return window.allowVideoPlayback ? play.call(this) : Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'));
      };
    });
    await page.goto('http://127.0.0.1:4173/trades/');
    await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
    await page.locator('[data-hero-video-play]').waitFor({ state: 'visible' });
    assert.equal(await page.locator('video').evaluate(video => video.paused && !video.classList.contains('is-ready')), true);
    assert.equal(await page.locator('.trades-hero-poster').evaluate(poster => getComputedStyle(poster).visibility), 'visible');
    assert.equal(await page.locator('[data-hero-loop-frame]').evaluate(frame => frame.hidden), true);
    await page.screenshot({ path: 'artifacts/browser-check/trades-autoplay-blocked.png' });
    await page.evaluate(() => { window.allowVideoPlayback = true; });
    await page.locator('[data-hero-video-play]').click();
    await page.waitForFunction(() => document.querySelector('video').currentTime > .3);
    assert.equal(await page.locator('[data-hero-video-play]').evaluate(button => button.hidden), true);
    assert.equal(await page.locator('.trades-hero-poster').evaluate(poster => getComputedStyle(poster).visibility), 'hidden');
    await page.locator('video').evaluate(video => video.currentTime = video.duration - .05);
    await page.waitForFunction(() => document.querySelector('video').currentTime < 1.5);
    assert.equal(await page.locator('[data-hero-loop-frame]').evaluate(frame => frame.hidden && frame.getAnimations().length === 0), true);
    console.log('PASS: blocked autoplay shows one poster; play button starts video; mobile native loop has no duplicate canvas');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('video').paused && !document.querySelector('video').seeking);
    assert.equal(await page.locator('[data-hero-video-play]').evaluate(button => button.hidden), true);
    console.log('PASS: reduced motion keeps the background still');

    const failed = await browser.newPage({ ...devices['iPhone 13'] });
    failed.setDefaultTimeout(10000);
    failed.on('pageerror', error => errors.push(error.message));
    await failed.route(/chatbase\.co|\.mp4/, route => route.abort());
    await failed.goto('http://127.0.0.1:4173/trades/');
    await failed.waitForFunction(() => document.querySelector('video').networkState === 3 || document.querySelector('video').error);
    assert.equal(await failed.locator('video').evaluate(video => !video.classList.contains('is-ready')), true);
    assert.equal(await failed.locator('.trades-hero-poster').evaluate(poster => poster.complete && poster.naturalWidth > 0 && getComputedStyle(poster).visibility === 'visible'), true);
    console.log('PASS: failed video keeps one static poster');

    const desktop = await browser.newPage();
    desktop.setDefaultTimeout(10000);
    desktop.on('pageerror', error => errors.push(error.message));
    await desktop.route(/chatbase\.co/, route => route.abort());
    await desktop.goto('http://127.0.0.1:4173/trades/');
    await desktop.waitForFunction(() => document.querySelector('video').currentTime > .3);
    assert.equal(await desktop.locator('video').evaluate(video => video.loop), false);
    await desktop.locator('video').evaluate(video => video.currentTime = video.duration - .05);
    await desktop.waitForFunction(() => !document.querySelector('[data-hero-loop-frame]').hidden);
    await desktop.waitForFunction(() => document.querySelector('[data-hero-loop-frame]').hidden);
    assert.deepEqual(errors, []);
    console.log('PASS: desktop dissolve preserved; no JavaScript errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
