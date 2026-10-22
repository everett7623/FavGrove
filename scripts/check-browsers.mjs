import { chromium } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { findBrowserExecutable } from './browser-paths.mjs';
import { extensionDistDir } from './extension-paths.mjs';

const root = process.cwd();
const distDir = extensionDistDir(root);
const manifestPath = path.join(distDir, 'manifest.json');
const routes = ['/', '/scanner', '/manager', '/import-export', '/ai-analysis', '/settings'];

if (!existsSync(manifestPath)) {
  throw new Error('dist/chrome-mv3/manifest.json is missing. Run npm run build:extension first.');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.manifest_version !== 3 || !manifest.options_ui?.open_in_tab || !manifest.options_ui.page) {
  throw new Error('dist manifest is not the expected Manifest V3 options-page extension.');
}

async function verifyBrowser(name, executablePath) {
  const tempRoot = path.resolve(tmpdir());
  const profileDir = mkdtempSync(path.join(tempRoot, `favgrove-${name}-`));
  const resolvedProfileDir = path.resolve(profileDir);
  if (!resolvedProfileDir.startsWith(`${tempRoot}${path.sep}`)) {
    throw new Error('Refusing to use an unsafe temporary browser profile path.');
  }

  let context;
  try {
    // Chrome 137+ removed unpacked-extension command-line loading from branded builds.
    // The Extensions CDP domain is the supported automation path when unsafe debugging is explicitly enabled.
    context = await chromium.launchPersistentContext(profileDir, {
      executablePath,
      headless: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: ['--enable-unsafe-extension-debugging']
    });

    const browser = context.browser();
    if (!browser) throw new Error(`Unable to inspect the ${name} browser process.`);
    const session = await browser.newBrowserCDPSession();
    const { id: extensionId } = await session.send('Extensions.loadUnpacked', { path: distDir });
    const extensionInfo = (await session.send('Extensions.getExtensions')).extensions.find((item) => item.id === extensionId);
    if (!extensionInfo?.enabled || extensionInfo.name !== manifest.name || extensionInfo.version !== manifest.version) {
      throw new Error(`${name} did not register the expected enabled extension: ${JSON.stringify(extensionInfo)}`);
    }

    const pageErrors = [];
    const externalRequests = [];
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(`chrome-extension://${extensionId}/`) && !url.startsWith('data:')) externalRequests.push(url);
    });

    for (const route of routes) {
      await page.goto(`chrome-extension://${extensionId}/${manifest.options_ui.page}#${route}`, { waitUntil: 'domcontentloaded' });
      await page.locator('main').waitFor({ state: 'visible', timeout: 10_000 });
    }

    await page.goto(`chrome-extension://${extensionId}/${manifest.options_ui.page}#/manager`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="manager-move-target"]').waitFor({ state: 'visible', timeout: 10_000 });
    const rootInfo = await page.evaluate(async () => {
      const [syntheticRoot] = await globalThis.chrome.bookmarks.getTree();
      return {
        syntheticRootId: syntheticRoot.id,
        permanentRoots: (syntheticRoot.children ?? []).map((node) => ({
          id: node.id,
          writable: !node.unmodifiable && node.folderType !== 'managed'
        }))
      };
    });
    if (await page.locator(`[data-folder-id="${rootInfo.syntheticRootId}"]`).count()) {
      throw new Error(`${name} rendered the synthetic bookmark root.`);
    }
    for (const rootNode of rootInfo.permanentRoots) {
      const row = page.locator(`[data-folder-id="${rootNode.id}"]`);
      await row.waitFor({ state: 'visible', timeout: 10_000 });
      if ((await row.getAttribute('data-readonly')) !== 'true') throw new Error(`${name} rendered permanent root ${rootNode.id} as writable.`);
    }
    const moveTargetValues = await page.locator('[data-testid="manager-move-target"] option').evaluateAll((options) => options.map((option) => option.value));
    if (!rootInfo.permanentRoots.some((rootNode) => rootNode.writable && moveTargetValues.includes(rootNode.id))) {
      throw new Error(`${name} did not expose a writable permanent root as a move target.`);
    }

    let worker = context.serviceWorkers().find((item) => new URL(item.url()).host === extensionId);
    if (!worker) {
      worker = await context.waitForEvent('serviceworker', {
        timeout: 15_000,
        predicate: (item) => new URL(item.url()).host === extensionId
      });
    }

    await page.goto(`chrome-extension://${extensionId}/${manifest.options_ui.page}#/ai-analysis`, { waitUntil: 'domcontentloaded' });
    const aiCheckboxes = page.locator('input[type=checkbox]');
    await aiCheckboxes.first().waitFor({ state: 'visible', timeout: 10_000 });
    if ((await aiCheckboxes.count()) !== 1 || (await aiCheckboxes.isChecked())) {
      throw new Error(`${name} did not render AI analysis disabled by default.`);
    }
    if (externalRequests.length) throw new Error(`${name} made unexpected external requests: ${[...new Set(externalRequests)].join(', ')}`);
    if (pageErrors.length) throw new Error(`${name} options-page error: ${pageErrors.join('; ')}`);

    console.log(
      `Verified ${name} ${browser.version()}: FavGrove ${extensionInfo.version}, MV3 service worker, ${routes.length} routes, AI disabled, no external requests.`
    );
    console.log(`Verified ${name} service worker: ${worker.url()}`);
  } finally {
    await context?.close().catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 300));
    rmSync(resolvedProfileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

for (const name of ['chrome', 'edge']) {
  const executable = findBrowserExecutable(name);
  if (!executable) throw new Error(`Unable to find an installed ${name} executable.`);
  await verifyBrowser(name, executable);
}

console.log('Chrome and Edge loaded the production dist/chrome-mv3 extension successfully in isolated profiles.');
