const { chromium } = require('../browser-check/node_modules/playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/chatbase\.co/, route => route.abort());
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://127.0.0.1:4173/trades/');
    await page.waitForFunction(() => document.querySelector('video').currentTime > 1.5);
    const state = await page.locator('video').evaluate(video => ({ rate: video.playbackRate, loop: video.loop, duration: video.duration, muted: video.muted, source: video.currentSrc, width: video.videoWidth, height: video.videoHeight }));
    assert.equal(state.rate, .9);
    assert.equal(state.loop, false);
    assert.equal(state.muted, true);
    assert.ok(state.source.endsWith('/assets/video/trades-mix-hero.mp4'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.screenshot({ path: `artifacts/trades-mix-hero/mix-${width}x${height}.png` });
    if (width === 1440 || width === 390) {
      await page.locator('video').evaluate(video => video.currentTime = video.duration * .7);
      await page.waitForFunction(() => !document.querySelector('video').seeking);
      await page.screenshot({ path: `artifacts/trades-mix-hero/mix-hammer-${width}x${height}.png` });
      await page.locator('video').evaluate(video => video.currentTime = video.duration - .05);
      await page.waitForFunction(() => !document.querySelector('[data-hero-loop-frame]').hidden);
      await page.waitForFunction(() => document.querySelector('[data-hero-loop-frame]').getAnimations()[0]?.currentTime > 900);
      await page.screenshot({ path: `artifacts/trades-mix-hero/loop-cloud-${width}x${height}.png` });
      assert.equal(await page.locator('h1').evaluate(heading => getComputedStyle(heading).opacity), '1');
      await page.waitForFunction(() => document.querySelector('[data-hero-loop-frame]').hidden);
    }
    console.log(`PASS: ${width}x${height}, 90% speed and mixed video source`);
  }
  await page.locator('video').evaluate(video => video.currentTime = video.duration - .15);
  await page.waitForFunction(() => document.querySelector('video').currentTime < 1.5 && !document.querySelector('video').paused);
  await page.waitForFunction(() => !document.querySelector('[data-hero-loop-frame]').hidden);
  await page.evaluate(() => document.querySelector('#drains').scrollIntoView({ behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('video').paused);
  assert.equal(await page.locator('[data-hero-loop-frame]').evaluate(frame => frame.getAnimations()[0].playState), 'paused');
  const transitionTime = await page.locator('[data-hero-loop-frame]').evaluate(frame => frame.getAnimations()[0].currentTime);
  await page.waitForTimeout(250);
  assert.equal(await page.locator('[data-hero-loop-frame]').evaluate(frame => frame.getAnimations()[0].currentTime), transitionTime);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => !document.querySelector('video').paused);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('[data-hero-loop-frame]').hidden
    && document.querySelector('[data-hero-loop-frame]').getAnimations().length === 0);
  assert.equal(await page.locator('[data-hero-loop-frame]').evaluate(frame => frame.hidden && frame.getAnimations().length === 0), true);
  await page.waitForFunction(() => document.querySelector('video').paused && !document.querySelector('video').seeking && Math.abs(document.querySelector('video').currentTime - 4.6) < .1);
  await page.screenshot({ path: 'artifacts/trades-mix-hero/mix-reduced-motion.png' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => !document.querySelector('video').paused);
  console.log('PASS: cloud dissolve at loop, pausing video and dissolve offscreen, reduced motion cancels dissolve, normal motion resumes');
  const failure = await browser.newPage();
  await failure.route(/chatbase\.co|\.mp4/, route => route.abort());
  await failure.goto('http://127.0.0.1:4173/trades/');
  assert.equal(await failure.locator('.trades-hero-poster').evaluate(image => image.complete && image.naturalWidth > 0 && Number(getComputedStyle(image).opacity) === .85), true);
  const still = await browser.newPage({ javaScriptEnabled: false });
  await still.goto('http://127.0.0.1:4173/trades/');
  assert.equal(await still.locator('.trades-hero-poster').evaluate(image => image.complete && image.naturalWidth > 0), true);
  assert.deepEqual(errors, []);
  console.log('PASS: static fallback, no JavaScript errors');
  console.log(`Web copy: ${fs.statSync('assets/video/trades-mix-hero.mp4').size} bytes`);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
