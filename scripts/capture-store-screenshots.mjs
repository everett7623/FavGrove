import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { findChromiumExecutable } from './browser-paths.mjs';
import { extensionDistDir } from './extension-paths.mjs';

const root = process.cwd();
const distDir = extensionDistDir(root);
const screenshotDir = path.join(root, 'store', 'screenshots');
mkdirSync(screenshotDir, { recursive: true });

const executablePath = findChromiumExecutable();

const mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1:4173');
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.join(distDir, pathname);

  if (!filePath.startsWith(distDir) || !existsSync(filePath)) {
    response.writeHead(404);
    response.end();
    return;
  }

  response.writeHead(200, { 'content-type': mimeTypes[path.extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
});

await new Promise((resolve) => server.listen(4173, '127.0.0.1', resolve));

const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

async function screenshot(name) {
  await page.screenshot({
    path: path.join(screenshotDir, `${name}-1280x800.png`),
    fullPage: false,
    animations: 'disabled'
  });
}

try {
  await page.route(/https:\/\/(github\.com|developer\.mozilla\.org|react\.dev).*/, async (route) => {
    await route.fulfill({ status: 200, body: '' });
  });

  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await screenshot('dashboard');

  await page.getByRole('link', { name: 'Scanner' }).click();
  await page.getByRole('button', { name: 'Run scan' }).click();
  await expect(page.getByText('100%')).toBeVisible();
  await screenshot('scanner');

  await page.getByRole('link', { name: 'FavGrove' }).click();
  await expect(page.getByRole('heading', { name: 'FavGrove' })).toBeVisible();
  await screenshot('manager');

  await page.getByRole('link', { name: 'Import / Export' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'store-demo.html',
    mimeType: 'text/html',
    buffer: Buffer.from(`<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><H3>Store Demo</H3>
  <DL><p>
    <DT><A HREF="https://store-demo.example">Store Demo Bookmark</A>
  </DL><p>
</DL><p>`)
  });
  await expect(page.getByRole('heading', { name: 'Import preview' })).toBeVisible();
  await screenshot('import-preview');

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await screenshot('settings');
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

console.log(`Store screenshots written to ${screenshotDir}`);
