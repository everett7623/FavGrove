import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistAvailableExtensionUpdate } from '../background/updateLifecycle';
import { STORAGE_KEYS } from '../shared/constants/storage';
import { CURRENT_EXTENSION_VERSION, isNewerVersion, updateService } from './updateService';

type StorageChangeListener = Parameters<typeof chrome.storage.onChanged.addListener>[0];

describe('isNewerVersion', () => {
  it('compares Chrome manifest version segments numerically', () => {
    expect(isNewerVersion('0.2.0', '0.2.1')).toBe(true);
    expect(isNewerVersion('0.9.0', '0.10.0')).toBe(true);
    expect(isNewerVersion('1.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.1.0', '1.0.9')).toBe(false);
    expect(isNewerVersion('1.0.0', 'v1.1.0')).toBe(false);
  });
});

describe('updateService', () => {
  const values = new Map<string, unknown>();
  const sendMessage = vi.fn();
  const addStorageListener = vi.fn();
  const removeStorageListener = vi.fn();
  let storageListener: StorageChangeListener | undefined;

  beforeEach(() => {
    values.clear();
    sendMessage.mockReset();
    addStorageListener.mockReset();
    removeStorageListener.mockReset();
    storageListener = undefined;
    addStorageListener.mockImplementation((listener: StorageChangeListener) => {
      storageListener = listener;
    });
    vi.stubGlobal('chrome', {
      runtime: { id: 'test-extension', sendMessage },
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: values.get(key) })),
          set: vi.fn(async (entries: Record<string, unknown>) => {
            Object.entries(entries).forEach(([key, value]) => values.set(key, value));
          })
        },
        onChanged: { addListener: addStorageListener, removeListener: removeStorageListener }
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a newer update persisted by the background lifecycle', async () => {
    await persistAvailableExtensionUpdate('0.3.1', 123);

    await expect(updateService.getAvailableUpdate()).resolves.toEqual({
      success: true,
      data: { version: '0.3.1', detectedAt: 123 }
    });
  });

  it('hides stale or current-version update records', async () => {
    await persistAvailableExtensionUpdate(CURRENT_EXTENSION_VERSION, 123);
    await expect(updateService.getAvailableUpdate()).resolves.toEqual({ success: true, data: null });
    expect(values.get(STORAGE_KEYS.availableExtensionUpdate)).toEqual(expect.objectContaining({ data: null }));
  });

  it('notifies the options page when the local update record changes', async () => {
    const listener = vi.fn();
    const unsubscribe = updateService.subscribeToAvailableUpdate(listener);
    await persistAvailableExtensionUpdate('0.3.1', 456);

    storageListener?.({
      [STORAGE_KEYS.availableExtensionUpdate]: { newValue: values.get(STORAGE_KEYS.availableExtensionUpdate) }
    }, 'local');

    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith({
      success: true,
      data: { version: '0.3.1', detectedAt: 456 }
    }));
    unsubscribe();
    expect(removeStorageListener).toHaveBeenCalledWith(storageListener);
  });

  it('asks the background service worker to apply the update', async () => {
    sendMessage.mockResolvedValue({ success: true, data: true });
    await expect(updateService.applyAvailableUpdate()).resolves.toEqual({ success: true, data: true });
    expect(sendMessage).toHaveBeenCalledWith({ type: 'apply-extension-update' });
  });
});
