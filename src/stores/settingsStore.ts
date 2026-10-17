import { create } from 'zustand';
import { DEFAULT_BACKUP_RETENTION, DEFAULT_CACHE_HOURS, STORAGE_KEYS } from '../shared/constants/storage';
import type { AppSettings, Result, ScannerConfig } from '../shared/types';
import { backupService } from '../services/backupService';
import { migrateSettings, storageService } from '../services/storageService';

export const defaultSettings: AppSettings = {
  theme: 'system',
  language: 'en',
  scanner: { timeoutMs: 15000, concurrency: 8, retryCount: 1 },
  cacheHours: DEFAULT_CACHE_HOURS,
  backupRetention: DEFAULT_BACKUP_RETENTION,
  autoScan: false
};

interface SettingsStore {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  update: (settings: Partial<AppSettings>) => Promise<Result<AppSettings>>;
  updateScanner: (scanner: Partial<ScannerConfig>) => Promise<Result<AppSettings>>;
}

function normalizeSettings(settings: Partial<AppSettings> | null | undefined): AppSettings {
  const scanner = settings?.scanner ?? defaultSettings.scanner;
  const cacheHours = settings?.cacheHours;
  const backupRetention = settings?.backupRetention;
  return {
    theme: settings?.theme === 'light' || settings?.theme === 'dark' || settings?.theme === 'system' ? settings.theme : defaultSettings.theme,
    language: settings?.language === 'zh_CN' || settings?.language === 'en' ? settings.language : defaultSettings.language,
    scanner: {
      timeoutMs: Number.isFinite(scanner.timeoutMs) ? Math.max(1000, Math.min(scanner.timeoutMs, 60000)) : defaultSettings.scanner.timeoutMs,
      concurrency: Number.isFinite(scanner.concurrency) ? Math.max(1, Math.min(scanner.concurrency, 12)) : defaultSettings.scanner.concurrency,
      retryCount: Number.isFinite(scanner.retryCount) ? Math.max(0, Math.min(scanner.retryCount, 5)) : defaultSettings.scanner.retryCount
    },
    cacheHours: typeof cacheHours === 'number' && Number.isFinite(cacheHours) ? Math.max(1, Math.min(cacheHours, 168)) : defaultSettings.cacheHours,
    backupRetention:
      typeof backupRetention === 'number' && Number.isFinite(backupRetention) ? Math.max(1, Math.min(backupRetention, 50)) : defaultSettings.backupRetention,
    autoScan: typeof settings?.autoScan === 'boolean' ? settings.autoScan : defaultSettings.autoScan
  };
}

async function persistSettings(settings: AppSettings): Promise<Result<AppSettings>> {
  const saved = await storageService.set(STORAGE_KEYS.settings, settings);
  return saved.success ? { success: true, data: settings } : saved;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    const stored = await storageService.get<AppSettings>(STORAGE_KEYS.settings);
    if (!stored.success) {
      set({ loading: false, error: stored.error });
      return;
    }

    if (!stored.data) {
      const saved = await persistSettings(defaultSettings);
      set(saved.success ? { settings: defaultSettings, loading: false } : { loading: false, error: saved.error });
      return;
    }

    const migrated = await migrateSettings(stored.data);
    const settings = normalizeSettings(migrated.data);
    set({ settings, loading: false });
  },
  update: async (updates) => {
    const settings = normalizeSettings({ ...get().settings, ...updates });
    const saved = await persistSettings(settings);
    // Publish the persisted settings before retention cleanup, which can fail or
    // overlap a subsequent settings edit.
    set(saved.success ? { settings, error: null } : { error: saved.error });
    if (saved.success && typeof updates.backupRetention === 'number') {
      const trimmed = await backupService.trimToRetention(settings.backupRetention);
      if (!trimmed.success) {
        set({ error: trimmed.error });
        return { success: false, error: trimmed.error };
      }
    }
    return saved;
  },
  updateScanner: async (scanner) => {
    const settings = normalizeSettings({ ...get().settings, scanner: { ...get().settings.scanner, ...scanner } });
    const saved = await persistSettings(settings);
    set(saved.success ? { settings, error: null } : { error: saved.error });
    return saved;
  }
}));
