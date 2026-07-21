import { chromium } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { findBrowserExecutable } from './browser-paths.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const manifestPath = path.join(distDir, 'manifest.json');
const browserName = process.argv[2]?.toLowerCase();

if (!['chrome', 'edge'].includes(browserName)) {
  throw new Error('Choose a browser: npm run check:browsers:visible -- chrome|edge');
}

if (!existsSync(manifestPath)) {
  throw new Error('dist/manifest.json is missing. Run npm run build:extension first.');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.manifest_version !== 3 || !manifest.options_ui?.open_in_tab || !manifest.options_ui.page) {
  throw new Error('dist manifest is not the expected Manifest V3 options-page extension.');
}

const executablePath = findBrowserExecutable(browserName);
if (!executablePath) throw new Error(`Unable to find an installed ${browserName} executable.`);

const tempRoot = path.resolve(tmpdir());
const profileDir = mkdtempSync(path.join(tempRoot, `favgrove-visible-${browserName}-`));
const resolvedProfileDir = path.resolve(profileDir);
if (!resolvedProfileDir.startsWith(`${tempRoot}${path.sep}`)) {
  throw new Error('Refusing to use an unsafe temporary browser profile path.');
}

let context;
const closeContext = () => void context?.close().catch(() => undefined);
process.once('SIGINT', closeContext);
process.once('SIGTERM', closeContext);

try {
  context = await chromium.launchPersistentContext(profileDir, {
    executablePath,
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--enable-unsafe-extension-debugging', '--no-first-run', '--no-default-browser-check']
  });

  const browser = context.browser();
  if (!browser) throw new Error(`Unable to inspect the ${browserName} browser process.`);

  const session = await browser.newBrowserCDPSession();
  const { id: extensionId } = await session.send('Extensions.loadUnpacked', { path: distDir });
  const extensionInfo = (await session.send('Extensions.getExtensions')).extensions.find((item) => item.id === extensionId);
  if (!extensionInfo?.enabled || extensionInfo.name !== manifest.name || extensionInfo.version !== manifest.version) {
    throw new Error(`${browserName} did not register the expected enabled extension: ${JSON.stringify(extensionInfo)}`);
  }

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto('about:blank');

  console.log(`Visible ${browserName} ${browser.version()} is ready with FavGrove ${extensionInfo.version}.`);
  console.log(`Extension ID: ${extensionId}`);
  console.log('Close the browser window to clean up the isolated profile and finish.');

  await new Promise((resolve) => context.once('close', resolve));
  context = undefined;
} finally {
  process.removeListener('SIGINT', closeContext);
  process.removeListener('SIGTERM', closeContext);
  await context?.close().catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 300));
  rmSync(resolvedProfileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
