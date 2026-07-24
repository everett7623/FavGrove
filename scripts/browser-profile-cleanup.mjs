import { rm } from 'node:fs/promises';

const RETRYABLE_REMOVE_CODES = new Set(['EBUSY', 'ENOTEMPTY', 'EPERM']);

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function waitForBrowserDisconnect(browser, timeoutMs = 5_000) {
  if (!browser?.isConnected()) return;

  await new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timeout);
      browser.off('disconnected', finish);
      resolve();
    };
    const timeout = setTimeout(finish, timeoutMs);
    browser.once('disconnected', finish);
    if (!browser.isConnected()) finish();
  });
}

export async function removeBrowserProfile(
  profileDir,
  { remove = rm, retryCount = 20, retryDelayMs = 250 } = {}
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await remove(profileDir, { recursive: true, force: true });
      return;
    } catch (error) {
      const canRetry = RETRYABLE_REMOVE_CODES.has(error?.code) && attempt < retryCount;
      if (!canRetry) throw error;
      await delay(retryDelayMs);
    }
  }
}
