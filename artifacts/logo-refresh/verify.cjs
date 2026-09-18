const { chromium } = require('../browser-check/node_modules/playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.route(/chatbase\.co/, route => route.abort());
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/', '/construction/', '/trades/', '/privacy/', '/cookies/']) {
        await page.goto(`http://127.0.0.1:4173${route === '/' ? '/index.html' : route}`);
        await page.locator('.brand-mark').evaluateAll(images => Promise.all(images.map(image => image.decode())));
        const logos = await page.locator('.brand-mark').evaluateAll(images => images.map(image => ({
          path: new URL(image.src).pathname,
          width: image.naturalWidth,
          height: image.naturalHeight
        })));
        assert.deepEqual(logos, [
          { path: '/assets/images/logo-vh-on-light.png', width: 512, height: 512 },
          { path: '/assets/images/logo-vh-on-dark.png', width: 512, height: 512 }
        ]);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        for (const scheme of ['light', 'dark']) {
          await page.emulateMedia({ colorScheme: scheme });
          const faviconPath = await page.locator(`link[rel="icon"][media="(prefers-color-scheme: ${scheme})"]`).getAttribute('href');
          assert.equal(faviconPath, `/assets/images/logo-vh-on-${scheme}.png`);
          assert.equal((await page.request.get(new URL(faviconPath, page.url()).href)).status(), 200);
        }
        if (route === '/' && width !== 320) {
          await page.locator('.site-header').screenshot({ path: `artifacts/logo-refresh/header-${width}.png` });
          await page.locator('.site-footer').screenshot({ path: `artifacts/logo-refresh/footer-${width}.png` });
        }
        console.log(`PASS ${route} at ${width}px: both logos load, favicon variants resolve, no overflow`);
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
