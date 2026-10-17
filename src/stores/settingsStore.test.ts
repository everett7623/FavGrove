import { afterEach, describe, expect, it, vi } from 'vitest';
import { backupService } from '../services/backupService';
import type { AppSettings, BackupRecord, Result } from '../shared/types';
import { CURRENT_SCHEMA_VERSION, STORAGE_KEYS } from '../shared/constants/storage';
import { storageService } from '../services/storageService';
import { defaultSettings, useSettingsStore } from './settingsStore';

describe('settingsStore', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps persisted settings visible when retention cleanup fails', async () => {
    await useSettingsStore.getState().update({ ...defaultSettings });
    vi.spyOn(backupService, 'trimToRetention').mockResolvedValue({ success: false, error: 'Cleanup failed' });

    const result = await useSettingsStore.getState().update({ backupRetention: 3 });

    expect(result).toEqual({ success: false, error: 'Cleanup failed' });
    expect(useSettingsStore.getState().error).toBe('Cleanup failed');
    expect(useSettingsStore.getState().settings.backupRetention).toBe(3);
    const stored = await storageService.get<AppSettings>(STORAGE_KEYS.settings);
    expect(stored.success && stored.data?.data).toEqual(useSettingsStore.getState().settings);
  });

  it('preserves a later edit while retention cleanup is pending', async () => {
    await useSettingsStore.getState().update({ ...defaultSettings });
    let finishCleanup!: (result: Result<BackupRecord[]>) => void;
    const cleanup = new Promise<Result<BackupRecord[]>>((resolve) => { finishCleanup = resolve; });
    const trim = vi.spyOn(backupService, 'trimToRetention').mockReturnValue(cleanup);

    const retentionUpdate = useSettingsStore.getState().update({ backupRetention: 3 });
    await vi.waitFor(() => expect(trim).toHaveBeenCalledWith(3));
    await useSettingsStore.getState().update({ theme: 'dark' });
    finishCleanup({ success: true, data: [] });
    await retentionUpdate;

    expect(useSettingsStore.getState().settings).toMatchObject({ theme: 'dark', backupRetention: 3 });
    const stored = await storageService.get<AppSettings>(STORAGE_KEYS.settings);
    expect(stored.success && stored.data?.data).toEqual(useSettingsStore.getState().settings);
  });

  it('persists and normalizes app settings', async () => {
    await useSettingsStore.getState().update({
      theme: 'dark',
      language: 'zh_CN',
      cacheHours: 999,
      backupRetention: 0,
      autoScan: true
    });

    const state = useSettingsStore.getState().settings;
    expect(state.theme).toBe('dark');
    expect(state.language).toBe('zh_CN');
    expect(state.cacheHours).toBe(168);
    expect(state.backupRetention).toBe(1);
    expect(state.autoScan).toBe(true);

    const stored = await storageService.get(STORAGE_KEYS.settings);
    expect(stored.success).toBe(true);
    if (stored.success) {
      expect(stored.data?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    }
  });

  it('persists scanner settings with safe bounds', async () => {
    await useSettingsStore.getState().update({ ...defaultSettings });
    await useSettingsStore.getState().updateScanner({ timeoutMs: 250, concurrency: 99, retryCount: 9 });

    expect(useSettingsStore.getState().settings.scanner).toEqual({
      timeoutMs: 1000,
      concurrency: 12,
      retryCount: 5
    });
  });
});
