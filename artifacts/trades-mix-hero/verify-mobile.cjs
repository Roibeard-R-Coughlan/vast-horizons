const { chromium, devices } = require('../browser-check/node_modules/playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const [width, height] of [[320, 568], [390, 844], [430, 932], [844, 390], [768, 1024], [1440, 900]]) {
      const page = await browser.newPage({ ...devices['iPhone 13'], viewport: { width, height }, deviceScaleFactor: 1 });
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route(/chatbase\.co/, route => route.abort());
      await page.goto('http://127.0.0.1:4173/trades/');
      await page.waitForFunction(() => document.querySelector('video').currentTime > .3);
      const checkBounds = async () => {
        const state = await page.evaluate(() => {
          const media = document.querySelector('.trades-hero-media');
          const hero = document.querySelector('.trades-hero-main').getBoundingClientRect();
          const bounds = media.getBoundingClientRect();
          const video = media.querySelector('video');
          const frame = media.querySelector('canvas');
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            contained: bounds.top >= hero.top - 1 && bounds.bottom <= hero.bottom + 1,
            height: bounds.height,
            videoWidth: video.getBoundingClientRect().width,
            frameWidth: frame.hidden ? null : frame.getBoundingClientRect().width,
            fit: getComputedStyle(video).objectFit,
            clip: getComputedStyle(media).clipPath,
            paint: getComputedStyle(media).contain
          };
        });
        assert.equal(state.overflow, false);
        assert.equal(state.contained, true);
        assert.equal(state.fit, 'cover');
        assert.equal(state.clip, 'inset(0px)');
        assert.equal(state.paint, 'paint');
        if (width <= 580) {
          assert.ok(state.height <= height - 70 + 1);
          assert.equal(state.videoWidth, width);
          if (state.frameWidth !== null) assert.equal(state.frameWidth, width);
        }
      };
      await checkBounds();
      await page.locator('video').evaluate(video => video.currentTime = video.duration - .05);
      await page.waitForFunction(() => document.querySelector('video').currentTime < 1.5 && !document.querySelector('video').paused);
      assert.equal(await page.locator('video').evaluate(video => video.loop), true);
      assert.equal(await page.locator('[data-hero-loop-frame]').evaluate(frame => frame.hidden), true);
      await checkBounds();
      if (width === 390 || width === 320 || width === 1440) {
        await page.screenshot({ path: `artifacts/browser-check/trades-fixed-${width}x${height}.png` });
      }
      await page.evaluate(() => document.querySelector('#audit').scrollIntoView({ behavior: 'instant' }));
      await page.waitForFunction(() => document.querySelector('video').paused);
      await checkBounds();
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForFunction(() => !document.querySelector('video').paused);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.querySelector('video').paused && !document.querySelector('video').seeking);
      await checkBounds();
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}x${height}: clipped video and loop frame, scroll/resume, reduced motion`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
