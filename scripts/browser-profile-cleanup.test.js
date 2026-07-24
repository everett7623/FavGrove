import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { removeBrowserProfile, waitForBrowserDisconnect } from './browser-profile-cleanup.mjs';

describe('browser profile cleanup', () => {
  it('waits for the browser process to disconnect', async () => {
    const browser = new EventEmitter();
    browser.isConnected = () => true;

    const waiting = waitForBrowserDisconnect(browser, 1_000);
    browser.emit('disconnected');

    await expect(waiting).resolves.toBeUndefined();
  });

  it('retries transient Windows file-handle errors', async () => {
    const remove = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('busy'), { code: 'EPERM' }))
      .mockRejectedValueOnce(Object.assign(new Error('busy'), { code: 'EBUSY' }))
      .mockResolvedValue(undefined);

    await removeBrowserProfile('temporary-profile', { remove, retryCount: 2, retryDelayMs: 0 });

    expect(remove).toHaveBeenCalledTimes(3);
  });

  it('surfaces non-transient removal errors immediately', async () => {
    const error = Object.assign(new Error('denied'), { code: 'EACCES' });
    const remove = vi.fn().mockRejectedValue(error);

    await expect(removeBrowserProfile('temporary-profile', { remove, retryDelayMs: 0 })).rejects.toBe(error);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
