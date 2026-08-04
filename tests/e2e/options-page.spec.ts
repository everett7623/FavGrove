import { expect, test } from '@playwright/test';

test('renders all foundation navigation routes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Last scanned:/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quick actions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Local recommendations' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Start scan/ })).toBeVisible();
  await expect(page.getByText('v0.2.1 · everettlabs · everett7623@gmail.com')).toBeVisible();

  await page.getByRole('link', { name: 'Scanner' }).click();
  await expect(page.getByRole('heading', { name: 'Scanner' })).toBeVisible();

  await page.getByRole('link', { name: 'FavGrove' }).click();
  await expect(page.getByRole('heading', { name: 'FavGrove' })).toBeVisible();

  await page.getByRole('link', { name: 'Import / Export' }).click();
  await expect(page.getByRole('heading', { name: 'Import / Export' })).toBeVisible();
  await expect(page.getByText('Choose file')).toBeVisible();

  await page.getByRole('link', { name: 'AI Analysis' }).click();
  await expect(page.getByRole('heading', { name: 'AI Analysis' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Enable AI analysis/ })).not.toBeChecked();

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Automatic daily scan/ })).toBeVisible();
  await expect(page.getByText('Backup management')).toBeVisible();
});

test('renders manager controls for search, tags, move, undo, and delete', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'FavGrove' }).click();

  await expect(page.getByRole('combobox', { name: 'Filter by tag' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Sort bookmarks' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Move target' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Select all visible bookmarks' })).toBeVisible();
  await expect(page.getByLabel('Shortcuts: Delete selected, Escape clear selection, Ctrl+A select visible bookmarks')).toBeVisible();
  await expect(page.getByRole('button', { name: /Move selected/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Add tags/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Remove tags' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Delete selected/ })).toBeDisabled();
});

test('keeps the manager inside a 1280px desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/#/manager');
  await expect(page.getByRole('heading', { name: 'Bookmark list' })).toBeVisible();

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(viewport.scrollWidth).toBe(viewport.clientWidth);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('Actions', { exact: true })).toBeVisible();
  await expect(page.getByText('URL', { exact: true })).toBeHidden();
  await expect(page.getByRole('link', { name: 'GitHub', exact: true })).toBeVisible();

  const narrowViewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(narrowViewport.scrollWidth).toBe(narrowViewport.clientWidth);
});

test('checks primary routes in Chinese localization', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('combobox', { name: 'Language' }).selectOption('zh_CN');

  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /每日自动扫描/ })).toBeVisible();

  await page.getByRole('link', { name: '仪表盘' }).click();
  await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '快捷操作' })).toBeVisible();
  await expect(page.getByText('Loaded 4 bookmarks')).toHaveCount(0);

  await page.getByRole('link', { name: '扫描检测' }).click();
  await expect(page.getByRole('heading', { name: '扫描检测' })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始扫描' })).toBeVisible();

  await page.getByRole('link', { name: '书签管理' }).click();
  await expect(page.getByRole('heading', { name: '书签管理' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: '按标签筛选' })).toBeVisible();

  await page.getByRole('link', { name: '导入 / 导出' }).click();
  await expect(page.getByRole('heading', { name: '导入 / 导出' })).toBeVisible();
  await expect(page.getByText('选择文件')).toBeVisible();

  await page.getByRole('link', { name: 'AI 分析' }).click();
  await expect(page.getByRole('heading', { name: 'AI 分析' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /启用 AI 分析/ })).not.toBeChecked();
});

test('runs the scanner and renders structural results', async ({ page }) => {
  await page.route(/https:\/\/(github\.com|developer\.mozilla\.org|react\.dev).*/, async (route) => {
    await route.fulfill({ status: 200, body: '' });
  });

  await page.goto('/');
  await page.getByRole('link', { name: 'Scanner' }).click();
  await page.getByRole('button', { name: 'Run scan' }).click();

  await expect(page.getByText('100%')).toBeVisible();
  await expect(page.getByText('4 / 4 bookmarks processed · 3 unique URLs checked')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Duplicate bookmarks' }).locator('..').getByText('1', { exact: true })).toBeVisible();
  await expect(page.getByText('https://github.com')).toBeVisible();
  await expect(page.getByText('Bookmarks Bar / Empty Folder', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Delete empty folder Bookmarks Bar \/ Empty Folder/ }).click();
  const deleteEmptyFolderDialog = page.getByRole('dialog', { name: 'Delete empty folder' });
  await expect(deleteEmptyFolderDialog).toBeVisible();
  await deleteEmptyFolderDialog.getByRole('button', { name: 'Delete folder' }).click();

  const emptyFolderPanel = page.getByRole('heading', { name: 'Empty folders' }).locator('../..');
  await expect(emptyFolderPanel.getByText('0', { exact: true })).toBeVisible();
  await expect(emptyFolderPanel.getByText('No results')).toBeVisible();
});

test('keeps ambiguous HTTP and proxy failures in the manual review workflow', async ({ page }) => {
  await page.route(/https:\/\/github\.com.*/, async (route) => {
    await route.fulfill({ status: 404, body: 'Not found' });
  });
  await page.route(/https:\/\/react\.dev.*/, async (route) => {
    await route.abort('failed');
  });
  await page.route(/https:\/\/developer\.mozilla\.org.*/, async (route) => {
    await route.fulfill({ status: 200, body: '' });
  });

  await page.goto('/');
  await page.getByRole('link', { name: 'Scanner' }).click();
  await page.getByRole('button', { name: 'Run scan' }).click();

  await expect(page.getByText(/0 confirmed broken, 3 could not be verified/)).toBeVisible();
  await page.getByRole('link', { name: 'Review all 3 link issues' }).click();

  await expect(page.getByRole('heading', { name: 'Link issue review' })).toBeVisible();
  await expect(page.getByText(/browser\/system network and proxy configuration/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmed broken (0)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Could not verify (3)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select this page' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check selected (0)' })).toBeVisible();

  await page.getByRole('button', { name: 'Could not verify (3)' }).click();
  await expect(page.getByText('Network, proxy, DNS, TLS, or regional access failure')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check again' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit URL' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Works for me' }).first().click();
  await expect(page.getByRole('button', { name: 'Could not verify (2)' })).toBeVisible();
});

test('cleans duplicate bookmarks and persists the refreshed scan result', async ({ page }) => {
  await page.route(/https:\/\/(github\.com|developer\.mozilla\.org|react\.dev).*/, async (route) => {
    await route.fulfill({ status: 200, body: '' });
  });

  await page.goto('/');
  await page.getByRole('link', { name: 'Scanner' }).click();
  await page.getByRole('button', { name: 'Run scan' }).click();
  await page.getByRole('button', { name: 'Keep oldest, remove 1' }).click();

  const duplicatePanel = page.getByRole('heading', { name: 'Duplicate bookmarks' }).locator('../..');
  await expect(duplicatePanel.getByText('0', { exact: true })).toBeVisible();
  await expect(duplicatePanel.getByText('No results')).toBeVisible();

  await page.reload();
  await expect(duplicatePanel.getByText('0', { exact: true })).toBeVisible();
});

test('previews an HTML import, resolves conflicts, and imports new bookmarks', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Import / Export' }).click();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'bookmarks.html',
    mimeType: 'text/html',
    buffer: Buffer.from(`<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><H3>Imported E2E</H3>
  <DL><p>
    <DT><A HREF="https://github.com">Existing GitHub</A>
    <DT><A HREF="https://e2e-import.test">E2E Imported Bookmark</A>
  </DL><p>
</DL><p>`)
  });

  await expect(page.getByRole('heading', { name: 'Import preview' })).toBeVisible();
  await expect(page.getByText(/2 detected/)).toBeVisible();
  await expect(page.getByText(/1 conflicts/)).toBeVisible();
  await expect(page.getByText('Conflict resolver')).toBeVisible();
  await page.getByTestId('import-target').selectOption({ label: 'Bookmarks Bar' });

  await page.getByRole('button', { name: 'Import new only (1)' }).click();
  await expect(page.getByRole('heading', { name: 'Import preview' })).toBeHidden();

  await page.getByRole('link', { name: 'FavGrove' }).click();
  await expect(page.getByText('E2E Imported Bookmark')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Imported E2E', exact: true })).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: 'Select E2E Imported Bookmark' }).locator('..').getByText('Bookmarks Bar / Imported E2E', { exact: true })
  ).toBeVisible();
});

test('exports the selected bookmark format through the export worker', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Import / Export' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^bookmarks-\d{4}-\d{2}-\d{2}\.csv$/);
});

test('requires AI opt-in and preview before returning read-only analysis', async ({ page }) => {
  let providerRequests = 0;
  await page.route('https://provider.test/**', async (route) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    providerRequests += 1;
    const request = JSON.parse(route.request().postData() ?? '{}');
    const payload = JSON.parse(request.messages[1].content);
    expect(payload.items).toEqual([]);
    expect(JSON.stringify(payload)).not.toContain('GitHub Duplicate');
    return route.fulfill({
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          schemaVersion: 1,
          summary: 'This library is centered on developer documentation.',
          topics: [{ label: 'Developer tools', count: 2, confidence: 0.9, evidence: ['github.com'] }],
          suggestions: [{ type: 'organization', title: 'Group developer resources', rationale: 'Keep frequently used developer domains together.', confidence: 0.8, evidence: ['github.com'] }],
          warnings: []
        }) } }]
      })
    });
  });

  await page.goto('/');
  await page.getByRole('link', { name: 'AI Analysis' }).click();
  const previewButton = page.getByRole('button', { name: 'Build request preview' });
  await expect(previewButton).toBeDisabled();
  await page.getByRole('checkbox', { name: /Enable AI analysis/ }).check();
  await page.getByRole('textbox', { name: /OpenAI-compatible base URL/ }).fill('https://provider.test');
  await page.getByRole('textbox', { name: 'Model' }).fill('test-model');
  await previewButton.click();

  await expect(page.getByRole('heading', { name: 'Request preview' })).toBeVisible();
  await expect(page.getByText('https://provider.test/v1/chat/completions')).toBeVisible();
  expect(providerRequests).toBe(0);
  await page.getByRole('button', { name: 'Confirm and analyze' }).click();
  await expect(page.getByRole('heading', { name: 'Analysis result' })).toBeVisible();
  await expect(page.getByText('This library is centered on developer documentation.')).toBeVisible();
  await expect(page.getByRole('paragraph').filter({ hasText: 'Results are suggestions only' })).toBeVisible();
  expect(providerRequests).toBe(1);
});

test('cancels an AI request and surfaces provider failures', async ({ page }) => {
  let mode: 'pending' | 'failed' = 'pending';
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS' };
  await page.route('https://slow-provider.test/**', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (mode === 'failed') {
      return route.fulfill({ status: 503, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: { message: 'Provider unavailable' } }) });
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: '{}' }).catch(() => undefined);
  });

  await page.goto('/');
  await page.getByRole('link', { name: 'AI Analysis' }).click();
  await page.getByRole('checkbox', { name: /Enable AI analysis/ }).check();
  await page.getByRole('textbox', { name: /OpenAI-compatible base URL/ }).fill('https://slow-provider.test/v1/chat/completions');
  await page.getByRole('textbox', { name: 'Model' }).fill('test-model');
  await page.getByRole('button', { name: 'Build request preview' }).click();
  await page.getByRole('button', { name: 'Confirm and analyze' }).click();
  await expect(page.getByRole('button', { name: 'Cancel analysis' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel analysis' }).click();
  await expect(page.getByText('Analysis cancelled. No result was saved.')).toBeVisible();

  mode = 'failed';
  await page.getByRole('button', { name: 'Confirm and analyze' }).click();
  await expect(page.getByText(/Provider unavailable \(HTTP 503\)/)).toBeVisible();
});

test('renames, tags, moves, deletes, and restores a bookmark', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'FavGrove' }).click();

  await page.getByRole('button', { name: 'Rename GitHub', exact: true }).click();
  const renameDialog = page.getByRole('dialog', { name: 'Rename bookmark' });
  await expect(renameDialog).toBeVisible();
  await renameDialog.getByRole('textbox').fill('GitHub Renamed');
  await renameDialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('GitHub Renamed', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Edit tags for GitHub Renamed' }).click();
  const tagDialog = page.getByRole('dialog', { name: 'Comma-separated tags' });
  await expect(tagDialog).toBeVisible();
  await tagDialog.getByRole('textbox').fill('work, code');
  await tagDialog.getByRole('button', { name: 'Save tags' }).click();
  await expect(page.getByText('#work #code')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Select GitHub Renamed' }).check();
  await page.getByRole('combobox', { name: 'Move target' }).selectOption({ label: 'Other Bookmarks' });
  await page.getByRole('button', { name: 'Move selected (1)' }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Select GitHub Renamed' }).locator('..').getByText('Other Bookmarks', { exact: true })
  ).toBeVisible();

  await page.getByRole('checkbox', { name: 'Select GitHub Renamed' }).check();
  await page.getByRole('button', { name: 'Delete selected (1)' }).click();
  await expect(page.getByRole('checkbox', { name: 'Select GitHub Renamed' })).toBeHidden();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('checkbox', { name: 'Select GitHub Renamed' })).toBeVisible();

  await page.getByRole('button', { name: 'Rename GitHub Renamed', exact: true }).click();
  const restoredRenameDialog = page.getByRole('dialog', { name: 'Rename bookmark' });
  await restoredRenameDialog.getByRole('textbox').fill('GitHub Restored');
  await restoredRenameDialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('checkbox', { name: 'Select GitHub Restored' })).toBeVisible();
});
