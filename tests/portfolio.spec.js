/**
 * Functional coverage for the static portfolio (there is no application JS).
 * Requires @playwright/test and its Chromium browser. Once those are available:
 * npx playwright test tests/portfolio.spec.js --workers=1 --reporter=line --global-timeout=110000
 *
 * Serve the actual repository files through browser routing, so no development
 * server or network access is required. Font requests deliberately fail to cover
 * the monospace fallback. No snapshots, generated files, or test config needed.
 */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const origin = 'https://portfolio.test';
const links = [
  ['Taras Hor', '/'],
  ['GitHub', 'https://github.com/tarashor'],
  ['LinkedIn', 'https://www.linkedin.com/in/tarashoryachko'],
  ['View work →', 'https://github.com/tarashor?tab=repositories'],
  ['Contact →', 'https://www.linkedin.com/in/tarashoryachko'],
];

test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
test.setTimeout(10000);

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const files = {
      '/': ['index.html', 'text/html; charset=utf-8'],
      '/css/styles.css': ['css/styles.css', 'text/css; charset=utf-8'],
    };
    const file = url.origin === origin && files[url.pathname];
    if (!file) return route.abort();
    return route.fulfill({
      contentType: file[1],
      body: fs.readFileSync(path.join(root, file[0])),
    });
  });
  await page.goto(origin);
});

test('publishes search and social metadata with decoded text', async ({ page }) => {
  const title = 'Taras Hor — AI & Software Engineer';
  await expect(page).toHaveTitle(title);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('meta[charset]')).toHaveAttribute('charset', /^utf-8$/i);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content', /Taras Hor.*AI and software engineer/,
  );
  const metadata = {
    'og:title': title,
    'og:description': 'Practical AI and reliable software engineering.',
    'og:type': 'website',
    'og:url': 'https://tarashor.com/',
  };
  for (const [property, content] of Object.entries(metadata)) {
    await expect(page.locator(`meta[property="${property}"]`)).toHaveAttribute('content', content);
  }
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff');
});

test('allows the device viewport and does not disable user zoom', async ({ page }) => {
  const viewport = page.locator('meta[name="viewport"]');
  await expect(viewport).toHaveCount(1);
  const directives = Object.fromEntries((await viewport.getAttribute('content'))
    .split(',').map((part) => part.trim().split(/\s*=\s*/)));
  expect(directives.width).toBe('device-width');
  expect(Number(directives['initial-scale'])).toBe(1);
  expect(directives['user-scalable'] || '').not.toMatch(/^(no|0)$/i);
  if (directives['maximum-scale']) {
    expect(Number(directives['maximum-scale'])).toBeGreaterThanOrEqual(2);
  }
});

test('exposes the introduction, credentials, and footer without JavaScript', async ({ page }) => {
  await expect(page.getByRole('banner')).toHaveCount(1);
  const main = page.getByRole('main');
  await expect(main).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(main.getByRole('heading', { level: 1 })).toHaveText(
    'Building practical AI products and reliable software.',
  );
  await expect(main.getByText('AI & Software Engineer', { exact: true })).toBeVisible();
  await expect(main.locator('.summary')).toContainText('early experiments to production engineering.');
  await expect(main.locator('.phd')).toContainText('Trained to go deep and solve problems without obvious answers.');
  await expect(main.locator('.phd strong')).toHaveText('PhD.');
  const footer = page.getByRole('contentinfo');
  await expect(footer).toHaveCount(1);
  // The year is published copy, not a JavaScript clock.
  await expect(footer).toContainText('© 2026 Taras Hor');
  await expect(footer).toContainText('Warsaw, Poland');
});

test('provides named navigation and the intended profile and work destinations', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'External links' });
  await expect(nav).toHaveCount(1);
  await expect(nav.getByRole('link')).toHaveCount(2);
  await expect(page.getByRole('link')).toHaveCount(links.length);
  for (const [name, href] of links) {
    const link = page.getByRole('link', { name, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', href);
  }
  await page.getByRole('link', { name: 'Taras Hor', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/`);
  await expect(page.getByRole('main')).toBeVisible();
});

for (const [scheme, palette] of Object.entries({
  light: { background: 'rgb(255, 255, 255)', text: 'rgb(22, 22, 22)', muted: 'rgb(102, 102, 102)', line: 'rgb(221, 221, 221)' },
  dark: { background: 'rgb(17, 17, 17)', text: 'rgb(238, 238, 238)', muted: 'rgb(153, 153, 153)', line: 'rgb(51, 51, 51)' },
})) {
  test(`${scheme} preference updates text, backgrounds, and separators without a reload`, async ({ page }) => {
    // Switch through the opposite preference to catch stale theme application.
    await page.emulateMedia({ colorScheme: scheme === 'light' ? 'dark' : 'light' });
    await page.emulateMedia({ colorScheme: scheme });
    await expect(page.locator('body')).toHaveCSS('background-color', palette.background);
    await expect(page.locator('body')).toHaveCSS('color', palette.text);
    for (const selector of ['.role', '.summary', 'footer']) {
      await expect(page.locator(selector)).toHaveCSS('color', palette.muted);
    }
    for (const [selector, edge] of [['header', 'bottom'], ['.phd', 'top'], ['footer', 'top']]) {
      await expect(page.locator(selector)).toHaveCSS(`border-${edge}-color`, palette.line);
      await expect(page.locator(selector)).toHaveCSS(`border-${edge}-style`, 'solid');
      await expect(page.locator(selector)).toHaveCSS(`border-${edge}-width`, '1px');
    }
    for (const [name] of links) {
      await expect(page.getByRole('link', { name, exact: true })).toHaveCSS('color', palette.text);
    }
  });

  test(`${scheme} links show an underline on hover and clear it on exit`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const [name] of links) {
      const link = page.getByRole('link', { name, exact: true });
      await expect(link).toHaveCSS('text-decoration-line', 'none');
      await link.hover();
      await expect(link).toHaveCSS('text-decoration-line', 'underline');
      await expect(link).toHaveCSS('text-underline-offset', '4px');
      await page.mouse.move(0, 0);
      await expect(link).toHaveCSS('text-decoration-line', 'none');
    }
  });

  test(`${scheme} keyboard navigation reaches every link with a visible focus indicator`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const [name] of links) {
      await page.keyboard.press('Tab');
      const link = page.getByRole('link', { name, exact: true });
      await expect(link).toBeFocused();
      await expect(link).toHaveCSS('outline-style', 'solid');
      await expect(link).toHaveCSS('outline-width', '2px');
      await expect(link).toHaveCSS('outline-offset', '4px');
      await expect(link).toHaveCSS('outline-color', palette.text);
    }
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('link', { name: 'View work →', exact: true })).toBeFocused();
  });
}

for (const width of [240, 320, 519, 520, 521, 768, 1440]) {
  test(`content fits at ${width}px without external fonts or JavaScript`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    const layout = await page.evaluate(() => {
      const rect = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        header: rect('header'), main: rect('main'), footer: rect('footer'),
        content: [...document.querySelectorAll('h1, main p, a, footer p')]
          .map((element) => element.getBoundingClientRect().toJSON()),
      };
    });
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport);
    expect(layout.header.bottom).toBeLessThanOrEqual(layout.main.top + 1);
    expect(layout.main.bottom).toBeLessThanOrEqual(layout.footer.top + 1);
    for (const rect of layout.content) {
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(width + 1);
    }
    await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
    await expect(page.getByRole('contentinfo')).toBeInViewport();
  });
}

for (const [width, fontSize, mainPadding] of [
  [519, '34px', '56px'],
  [520, '34px', '56px'],
  [521, '32px', '64px'],
  [1440, '56px', '64px'],
]) {
  test(`responsive typography and spacing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', fontSize);
    await expect(page.getByRole('main')).toHaveCSS('padding-top', mainPadding);
  });
}

test('keeps the reading column centered and the footer at the bottom on tall screens', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  const intro = await page.locator('.intro').boundingBox();
  const footer = await page.getByRole('contentinfo').boundingBox();
  expect(intro).not.toBeNull();
  expect(footer).not.toBeNull();
  expect(intro.width).toBeLessThanOrEqual(760);
  expect(Math.abs(intro.x + intro.width / 2 - 800)).toBeLessThanOrEqual(1);
  expect(Math.abs(footer.y + footer.height - 1200)).toBeLessThanOrEqual(1);
});

test('wraps crowded flex groups instead of overlapping or clipping their children', async ({ page }) => {
  await page.setViewportSize({ width: 240, height: 640 });
  // Constrain each group independently to exercise navigation wrapping as well
  // as header/footer/actions. A normal phone viewport may not wrap navigation.
  for (const selector of ['header', 'footer', 'nav', '.links']) {
    const group = page.locator(selector);
    await group.evaluate((element) => { element.style.maxWidth = '130px'; });
    const bounds = await group.boundingBox();
    expect(bounds).not.toBeNull();
    const children = await group.locator(':scope > *').evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().toJSON()));
    expect(children.length).toBeGreaterThanOrEqual(2);
    for (const child of children) {
      expect(child.left).toBeGreaterThanOrEqual(bounds.x - 1);
      expect(child.right).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
    }
    for (let i = 1; i < children.length; i++) {
      expect(children[i].top).toBeGreaterThanOrEqual(children[i - 1].bottom);
    }
    await group.evaluate((element) => { element.style.removeProperty('max-width'); });
  }
});
