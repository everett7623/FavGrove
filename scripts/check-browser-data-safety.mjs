import { chromium } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { findBrowserExecutable } from './browser-paths.mjs';
import { removeBrowserProfile, waitForBrowserDisconnect } from './browser-profile-cleanup.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const manifestPath = path.join(distDir, 'manifest.json');
const executablePath = findBrowserExecutable('chrome');

if (!existsSync(manifestPath)) throw new Error('dist/manifest.json is missing. Run npm run build:extension first.');
if (!executablePath) throw new Error('Unable to find an installed Chrome executable.');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const tempRoot = path.resolve(tmpdir());
const profileDir = mkdtempSync(path.join(tempRoot, 'favgrove-data-safety-'));
const resolvedProfileDir = path.resolve(profileDir);
if (!resolvedProfileDir.startsWith(`${tempRoot}${path.sep}`)) throw new Error('Refusing to use an unsafe temporary browser profile path.');

const token = `FG-DS-${process.pid}-${Date.now()}`;
const urls = {
  crud: `https://favgrove.invalid/${token}/crud`,
  imported: `https://favgrove.invalid/${token}/imported`
};
let context;
let browser;
let fixtureRootId;

function flatten(nodes) {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
}

async function getBookmarkTree(page) {
  return page.evaluate(async () => globalThis.chrome.bookmarks.getTree());
}

async function findBookmarkByUrl(page, url) {
  const tree = await getBookmarkTree(page);
  return flatten(tree).find((node) => node.url === url) ?? null;
}

async function findFolderByTitle(page, title) {
  const tree = await getBookmarkTree(page);
  return flatten(tree).find((node) => !node.url && node.title === title) ?? null;
}

async function waitForValue(read, predicate, message, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await read();
    if (predicate(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyDataSafety() {
  context = await chromium.launchPersistentContext(profileDir, {
    executablePath,
    headless: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--enable-unsafe-extension-debugging']
  });

  browser = context.browser();
  if (!browser) throw new Error('Unable to inspect the Chrome browser process.');
  const session = await browser.newBrowserCDPSession();
  const { id: extensionId } = await session.send('Extensions.loadUnpacked', { path: distDir });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const optionsUrl = `chrome-extension://${extensionId}/${manifest.options_ui.page}`;

  await page.goto(`${optionsUrl}#/manager`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Bookmark list' }).waitFor();

  const fixture = await page.evaluate(async ({ token: fixtureToken, crudUrl }) => {
    const [syntheticRoot] = await globalThis.chrome.bookmarks.getTree();
    const permanentRoots = syntheticRoot.children ?? [];
    const writableRoot = permanentRoots.find((node) => node.folderType === 'other' && !node.unmodifiable)
      ?? permanentRoots.find((node) => !node.unmodifiable);
    if (!writableRoot) throw new Error('No writable permanent bookmark root is available.');

    const owner = await globalThis.chrome.bookmarks.create({ parentId: writableRoot.id, title: fixtureToken });
    const destination = await globalThis.chrome.bookmarks.create({ parentId: owner.id, title: `${fixtureToken}-Destination` });
    const empty = await globalThis.chrome.bookmarks.create({ parentId: owner.id, title: `${fixtureToken}-Empty` });
    const bookmark = await globalThis.chrome.bookmarks.create({ parentId: owner.id, title: `${fixtureToken}-Bookmark`, url: crudUrl });
    return {
      syntheticRootId: syntheticRoot.id,
      permanentRoots: permanentRoots.map((node) => ({ id: node.id, managed: Boolean(node.unmodifiable) || node.folderType === 'managed' })),
      writableRootId: writableRoot.id,
      owner,
      destination,
      empty,
      bookmark
    };
  }, { token, crudUrl: urls.crud });
  fixtureRootId = fixture.owner.id;

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Bookmark list' }).waitFor();
  assert(await page.locator(`[data-folder-id="${fixture.syntheticRootId}"]`).count() === 0, 'Synthetic root is visible in Manager.');
  for (const permanentRoot of fixture.permanentRoots) {
    const row = page.locator(`[data-folder-id="${permanentRoot.id}"]`);
    await row.waitFor();
    assert(await row.getAttribute('data-readonly') === 'true', `Permanent root ${permanentRoot.id} is not read-only.`);
  }
  const moveTargetValues = await page.getByTestId('manager-move-target').locator('option').evaluateAll((options) => options.map((option) => option.value));
  assert(moveTargetValues.includes(fixture.writableRootId), 'Writable permanent root is missing from move targets.');

  let bookmarkRow = page.locator(`[data-bookmark-id="${fixture.bookmark.id}"]`);
  await bookmarkRow.waitFor();
  await bookmarkRow.locator('[data-action="rename"]').click();
  let dialog = page.getByRole('dialog', { name: 'Rename bookmark' });
  await dialog.getByRole('textbox').fill(`${token}-Renamed`);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await waitForValue(
    () => page.evaluate(async (id) => (await globalThis.chrome.bookmarks.get(id))[0]?.title, fixture.bookmark.id),
    (title) => title === `${token}-Renamed`,
    'Chrome did not persist the bookmark rename.'
  );

  bookmarkRow = page.locator(`[data-bookmark-id="${fixture.bookmark.id}"]`);
  await bookmarkRow.locator('[data-action="tags"]').click();
  dialog = page.getByRole('dialog', { name: 'Comma-separated tags' });
  await dialog.getByRole('textbox').fill('data-safety');
  await dialog.getByRole('button', { name: 'Save tags' }).click();
  await bookmarkRow.locator('input[type="checkbox"]').check();
  await page.getByTestId('manager-move-target').selectOption(fixture.destination.id);
  await page.getByRole('button', { name: 'Move selected (1)' }).click();
  await waitForValue(
    () => page.evaluate(async (id) => (await globalThis.chrome.bookmarks.get(id))[0]?.parentId, fixture.bookmark.id),
    (parentId) => parentId === fixture.destination.id,
    'Chrome did not persist the bookmark move.'
  );
  await page.getByRole('button', { name: 'Move selected', exact: true }).waitFor();

  bookmarkRow = page.locator(`[data-bookmark-id="${fixture.bookmark.id}"]`);
  await bookmarkRow.locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Delete selected (1)' }).click();
  await bookmarkRow.waitFor({ state: 'detached' });
  assert(await findBookmarkByUrl(page, urls.crud) === null, 'Deleted bookmark remains in Chrome.');

  await page.getByTestId('manager-undo').click();
  const restoredBookmark = await waitForValue(
    () => findBookmarkByUrl(page, urls.crud),
    (bookmark) => Boolean(bookmark),
    'Undo did not recreate the bookmark in Chrome.'
  );
  assert(restoredBookmark.id !== fixture.bookmark.id, 'Undo reused the deleted Chrome bookmark ID.');
  bookmarkRow = page.locator(`[data-bookmark-id="${restoredBookmark.id}"]`);
  await bookmarkRow.waitFor();
  const storedTags = await page.evaluate(async () => (await globalThis.chrome.storage.local.get('bookmark-tags'))['bookmark-tags']?.data ?? {});
  assert(storedTags[fixture.bookmark.id] === undefined, 'Undo kept tags on the deleted bookmark ID.');
  assert(storedTags[restoredBookmark.id]?.includes('data-safety'), 'Undo did not migrate tags to the restored bookmark ID.');

  await bookmarkRow.locator('[data-action="rename"]').click();
  dialog = page.getByRole('dialog', { name: 'Rename bookmark' });
  await dialog.getByRole('textbox').fill(`${token}-Restored`);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await waitForValue(
    () => page.evaluate(async (id) => (await globalThis.chrome.bookmarks.get(id))[0]?.title, restoredBookmark.id),
    (title) => title === `${token}-Restored`,
    'A second rename after Undo did not use the restored Chrome ID.'
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator(`[data-bookmark-id="${restoredBookmark.id}"]`).waitFor();

  const emptyNode = await page.evaluate(async (id) => (await globalThis.chrome.bookmarks.get(id))[0], fixture.empty.id);
  await page.evaluate(async ({ node }) => {
    const now = Date.now();
    await globalThis.chrome.storage.local.set({
      'scan-cache': {
        schemaVersion: 1,
        updatedAt: now,
        data: {
          createdAt: now,
          result: { duplicateBookmarkGroups: [], duplicateFolderGroups: [], emptyFolders: [node], invalidLinks: [] }
        }
      }
    });
  }, { node: emptyNode });
  await page.goto(`${optionsUrl}#/scanner`, { waitUntil: 'domcontentloaded' });
  await page.getByText(`${token}-Empty`, { exact: true }).waitFor();
  await page.getByRole('button', { name: `Delete empty folder ${token}-Empty` }).click();
  dialog = page.getByRole('dialog', { name: 'Delete empty folder' });
  await dialog.getByRole('button', { name: 'Delete folder' }).click();
  await waitForValue(
    () => findFolderByTitle(page, `${token}-Empty`),
    (folder) => folder === null,
    'Empty folder deletion did not reach Chrome.'
  );
  await page.goto(`${optionsUrl}#/manager`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('manager-undo').click();
  const restoredFolder = await waitForValue(
    () => findFolderByTitle(page, `${token}-Empty`),
    (folder) => Boolean(folder),
    'Undo did not recreate the empty folder in Chrome.'
  );
  assert(restoredFolder.id !== fixture.empty.id, 'Undo reused the deleted Chrome folder ID.');
  await page.locator(`[data-folder-id="${restoredFolder.id}"]`).waitFor();

  await page.goto(`${optionsUrl}#/import-export`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('import-target').selectOption(fixture.owner.id);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'data-safety.html',
    mimeType: 'text/html',
    buffer: Buffer.from(`<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p><DT><H3>${token}-Imported</H3><DL><p><DT><H3>${token}-Nested</H3><DL><p><DT><A HREF="${urls.imported}">${token}-Imported Bookmark</A></DL><p></DL><p></DL><p>`)
  });
  await page.getByRole('button', { name: 'Import new only (1)' }).click();
  await page.getByRole('heading', { name: 'Import preview' }).waitFor({ state: 'hidden' });
  const importedBookmark = await waitForValue(
    () => findBookmarkByUrl(page, urls.imported),
    (bookmark) => Boolean(bookmark),
    'Nested import did not create the bookmark in Chrome.'
  );
  await page.goto(`${optionsUrl}#/manager`, { waitUntil: 'domcontentloaded' });
  let importedRow = page.locator(`[data-bookmark-id="${importedBookmark.id}"]`);
  await importedRow.waitFor();
  const immediateText = await importedRow.textContent();
  assert(immediateText.includes(token) && immediateText.includes(`${token}-Nested`), 'Imported path is incorrect before reload.');
  await page.reload({ waitUntil: 'domcontentloaded' });
  importedRow = page.locator(`[data-bookmark-id="${importedBookmark.id}"]`);
  await importedRow.waitFor();
  const reloadedText = await importedRow.textContent();
  assert(reloadedText.includes(token) && reloadedText.includes(`${token}-Nested`), 'Imported path changed after reload.');

  if (pageErrors.length) throw new Error(`Options-page errors: ${pageErrors.join('; ')}`);
  console.log(`Verified Chrome ${browser.version()}: protected roots, real CRUD, bookmark/folder Undo, tag ID migration, and nested import consistency.`);
}

try {
  await verifyDataSafety();
} finally {
  if (context && fixtureRootId) {
    const page = context.pages().find((candidate) => candidate.url().startsWith('chrome-extension://'));
    await page?.evaluate(async ({ id, fixtureToken }) => {
      try {
        const [node] = await globalThis.chrome.bookmarks.get(id);
        if (node?.title === fixtureToken) await globalThis.chrome.bookmarks.removeTree(id);
      } catch {
        // The temporary profile is removed below even if fixture cleanup is unnecessary.
      }
    }, { id: fixtureRootId, fixtureToken: token }).catch(() => undefined);
  }
  await context?.close().catch(() => undefined);
  await waitForBrowserDisconnect(browser);
  await removeBrowserProfile(resolvedProfileDir);
}
