#!/usr/bin/env node
/**
 * Screenshot-only E2E tour of Grok Desktop.
 * Launches Electron, walks chrome states, writes PNGs for docs/README.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'docs', 'screenshots');
const fixtureUrl = pathToFileURL(path.join(__dirname, 'fixtures', 'grok-shell.html')).href;

const USAGE_OK = {
  DEFAULT: {
    totalTokens: 140,
    lowEffortRateLimits: { remainingQueries: 140, waitTimeSeconds: 0 },
    highEffortRateLimits: { remainingQueries: 35, cost: 4, waitTimeSeconds: 0 }
  },
  GROK4HEAVY: { remainingQueries: 10, totalQueries: 10 }
};

const USAGE_WARNING = {
  DEFAULT: {
    totalTokens: 140,
    lowEffortRateLimits: { remainingQueries: 28, waitTimeSeconds: 120 },
    highEffortRateLimits: { remainingQueries: 8, cost: 4, waitTimeSeconds: 180 }
  },
  GROK4HEAVY: { remainingQueries: 2, totalQueries: 10 }
};

const USAGE_CRITICAL = {
  DEFAULT: {
    totalTokens: 140,
    lowEffortRateLimits: { remainingQueries: 8, waitTimeSeconds: 540 },
    highEffortRateLimits: { remainingQueries: 2, cost: 4, waitTimeSeconds: 600 }
  },
  GROK4HEAVY: { remainingQueries: 0, totalQueries: 10 }
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function capturePage(electronApp, dest, rect) {
  const base64 = await electronApp.evaluate(async ({ BrowserWindow }, clip) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) throw new Error('No BrowserWindow');
    win.show();
    const img = clip ? await win.capturePage(clip) : await win.capturePage();
    return img.toPNG().toString('base64');
  }, rect || null);
  fs.writeFileSync(dest, Buffer.from(base64, 'base64'));
  return dest;
}

async function setTheme(electronApp, page, theme) {
  await page.evaluate((nextTheme) => window.__GROK_E2E__.setTheme(nextTheme), theme);
  await page.waitForFunction((nextTheme) => {
    return window.__GROK_E2E__ && window.__GROK_E2E__.getTheme() === nextTheme;
  }, theme, { timeout: 5000 }).catch(() => {});
  await delay(350);
}

async function getHostPage(electronApp) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const windows = electronApp.windows();
    const host = windows.find((win) => /index\.html/.test(win.url()));
    if (host) return host;
    await delay(200);
  }
  return electronApp.firstWindow();
}

async function waitReady(page) {
  await page.waitForFunction(() => window.__GROK_E2E__ && window.__GROK_E2E__.ready, { timeout: 30000 });
  try {
    await page.evaluate(() => window.__GROK_E2E__.waitForTabsIdle());
  } catch (_) {}
  await delay(400);
}

async function main() {
  let electronPath;
  try {
    electronPath = require('electron');
  } catch (err) {
    console.error('Electron is not installed. Run npm install first.');
    process.exit(1);
  }

  let electron;
  try {
    ({ _electron: electron } = require('playwright'));
  } catch (err) {
    console.error('Playwright is not installed. Run npm install first.');
    process.exit(1);
  }

  ensureDir(outDir);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grok-desktop-e2e-'));
  const catalog = [];

  const electronApp = await electron.launch({
    executablePath: electronPath,
    args: [repoRoot, `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      GROK_E2E: '1',
      GROK_DISABLE_GPU: 'true',
      GROK_E2E_THEME: 'dark',
      GROK_E2E_START_URL: fixtureUrl,
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1'
    },
    timeout: 90000
  });

  try {
    await electronApp.firstWindow();
    const page = await getHostPage(electronApp);
    page.on('pageerror', (err) => console.error('pageerror', err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('console', msg.text());
    });
    console.log('host window', page.url());
    try {
      await waitReady(page);
    } catch (err) {
      const urls = electronApp.windows().map((win) => win.url());
      console.error('E2E hook not ready. windows=', urls);
      try {
        console.error(await page.evaluate(() => ({
          search: location.search,
          ready: !!(window.__GROK_E2E__ && window.__GROK_E2E__.ready)
        })));
      } catch (_) {}
      throw err;
    }
    await setTheme(electronApp, page, 'dark');

    const shot = async (file, caption, rect) => {
      const dest = path.join(outDir, file);
      await delay(200);
      await capturePage(electronApp, dest, rect);
      const stat = fs.statSync(dest);
      catalog.push({ file, caption, bytes: stat.size });
      console.log(`wrote ${path.relative(repoRoot, dest)} (${stat.size} bytes)`);
      return dest;
    };

    await shot('01-main-window.png', 'Main window with tab bar, toolbar, and Grok shell');

    await page.evaluate((data) => window.__GROK_E2E__.showUsage(data), USAGE_OK);
    await delay(250);
    await shot('02-usage-bar.png', 'Usage stats bar with remaining query counts');

    await shot('03-toolbar.png', 'Tab bar and window controls', { x: 0, y: 0, width: 1280, height: 48 });

    await page.evaluate((url) => window.__GROK_E2E__.createTab(url), fixtureUrl);
    await page.evaluate((url) => window.__GROK_E2E__.createTab(url), fixtureUrl);
    await page.evaluate(() => window.__GROK_E2E__.waitForTabsIdle());
    await delay(300);
    await shot('04-multiple-tabs.png', 'Multiple conversation tabs');

    for (let i = 0; i < 8; i += 1) {
      await page.evaluate((url) => window.__GROK_E2E__.createTab(url), fixtureUrl);
    }
    await page.evaluate(() => window.__GROK_E2E__.waitForTabsIdle());
    await delay(300);
    await shot('05-tab-overflow.png', 'Overflowing tab strip with scroll controls');

    await page.evaluate(() => window.__GROK_E2E__.openAbout());
    await page.evaluate(() => window.__GROK_E2E__.waitForTabsIdle());
    await delay(400);
    await shot('06-about.png', 'About tab');

    await page.evaluate(() => window.__GROK_E2E__.setAotActive(true));
    await delay(200);
    await shot('07-aot-active.png', 'Always-on-top control in the active state');
    await page.evaluate(() => window.__GROK_E2E__.setAotActive(false));

    await page.evaluate((data) => window.__GROK_E2E__.showUsage(data), USAGE_WARNING);
    await delay(200);
    await shot('08-usage-warning.png', 'Usage warning when remaining quota is low');

    await page.evaluate((data) => window.__GROK_E2E__.showUsage(data), USAGE_CRITICAL);
    await delay(200);
    await shot('09-usage-critical.png', 'Usage critical when remaining quota is nearly exhausted');

    await setTheme(electronApp, page, 'light');
    await page.evaluate((data) => window.__GROK_E2E__.showUsage(data), USAGE_OK);
    await delay(300);
    await shot('10-light-mode.png', 'Light theme');

    await setTheme(electronApp, page, 'dark');
    await delay(300);
    await shot('11-dark-mode.png', 'Dark theme');

    try {
      await page.evaluate(() => window.__GROK_E2E__.createTab('https://grok.com'));
      await Promise.race([
        page.evaluate(() => window.__GROK_E2E__.waitForTabsIdle()),
        delay(18000)
      ]);
      await delay(1200);
      await shot('12-live-grok.png', 'Live grok.com session (login or home, depending on cookies)');
    } catch (err) {
      console.warn('Live grok.com screenshot skipped:', err.message);
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      platform: process.platform,
      window: { width: 1280, height: 800 },
      shots: catalog
    };
    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`captured ${catalog.length} screenshots -> ${path.relative(repoRoot, outDir)}`);
  } finally {
    try {
      await electronApp.close();
    } catch (_) {}
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
