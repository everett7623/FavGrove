import { RotateCcw, Save, Search, Settings, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { alarmService } from '../../services/alarmService';
import { scanService } from '../../services/scanService';
import { ConfirmDialog } from '../../shared/components/ui/ConfirmDialog';
import { flattenBookmarks } from '../../shared/utils/bookmarks';
import { useBookmarkStore } from '../../stores/bookmarkStore';
import type { AppSettings, BackupRecord, Language, ScannerConfig, Theme } from '../../shared/types';
import { useSettingsStore } from '../../stores/settingsStore';

type NumberSettingKey = 'cacheHours' | 'backupRetention';
type ScannerNumberKey = keyof ScannerConfig;

function getBackupReasonLabel(t: (key: string) => string, reason: BackupRecord['reason']): string {
  return t(`settings.backupReasons.${reason}`);
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const loading = useSettingsStore((state) => state.loading);
  const error = useSettingsStore((state) => state.error);
  const update = useSettingsStore((state) => state.update);
  const updateScanner = useSettingsStore((state) => state.updateScanner);
  const backups = useBookmarkStore((state) => state.backups);
  const mutating = useBookmarkStore((state) => state.mutating);
  const bookmarkError = useBookmarkStore((state) => state.error);
  const loadBackups = useBookmarkStore((state) => state.loadBackups);
  const restoreBackup = useBookmarkStore((state) => state.restoreBackup);
  const deleteBackup = useBookmarkStore((state) => state.deleteBackup);
  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null);
  const [alarmError, setAlarmError] = useState<string | null>(null);
  const [ignoredUrls, setIgnoredUrls] = useState<string[]>([]);
  const [ignoredQuery, setIgnoredQuery] = useState('');
  const [confirmClearIgnored, setConfirmClearIgnored] = useState(false);

  useEffect(() => {
    void loadBackups();
    void scanService.getIgnoredLinkUrls().then((result) => {
      if (result.success) setIgnoredUrls([...result.data].sort());
    });
  }, [loadBackups]);

  const filteredIgnoredUrls = ignoredUrls.filter((url) => url.toLowerCase().includes(ignoredQuery.trim().toLowerCase()));

  const restoreIgnoredUrl = async (url: string) => {
    const restored = await scanService.restoreIgnoredLinkUrl(url);
    if (restored.success) setIgnoredUrls([...restored.data].sort());
  };

  const clearIgnoredUrls = async () => {
    setConfirmClearIgnored(false);
    const cleared = await scanService.clearIgnoredLinkUrls();
    if (cleared.success) setIgnoredUrls([]);
  };

  const updateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
    void update({ [key]: value });
  };

  const updateNumberSetting = async (key: NumberSettingKey, value: string) => {
    const saved = await update({ [key]: Number(value) });
    if (saved.success && key === 'backupRetention') await loadBackups();
  };

  const updateScannerNumber = (key: ScannerNumberKey, value: string) => {
    void updateScanner({ [key]: Number(value) });
  };

  const updateAutoScan = async (autoScan: boolean) => {
    setAlarmError(null);
    const saved = await update({ autoScan });
    if (!saved.success) return;

    const registered = await alarmService.registerAlarms();
    if (!registered.success) setAlarmError(registered.error);
  };

  const confirmRestore = async () => {
    const target = restoreTarget;
    if (!target) return;
    const restored = await restoreBackup(target.id);
    if (restored.success) setRestoreTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200">
          <Settings size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{t('pages.settings.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('pages.settings.description')}</p>
        </div>
      </div>

      {(error || alarmError || bookmarkError) && <div role="alert" data-testid="settings-error" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error ?? alarmError ?? bookmarkError}</div>}

      <section className="grid gap-4 lg:grid-cols-2">
        <SettingsCard title={t('settings.appearance')}>
          <SelectField
            label={t('settings.theme')}
            value={settings.theme}
            disabled={loading}
            options={[
              { value: 'system', label: t('settings.themeOptions.system') },
              { value: 'light', label: t('settings.themeOptions.light') },
              { value: 'dark', label: t('settings.themeOptions.dark') }
            ]}
            onChange={(value) => updateSetting('theme', value as Theme)}
          />
          <SelectField
            label={t('settings.language')}
            value={settings.language}
            disabled={loading}
            options={[
              { value: 'en', label: t('settings.languageEnglish') },
              { value: 'zh_CN', label: t('settings.languageChinese') }
            ]}
            onChange={(value) => updateSetting('language', value as Language)}
          />
        </SettingsCard>

        <SettingsCard title={t('settings.scanner')}>
          <NumberField
            label={t('settings.timeoutMs')}
            min={1000}
            max={60000}
            step={1000}
            value={settings.scanner.timeoutMs}
            disabled={loading}
            onChange={(value) => updateScannerNumber('timeoutMs', value)}
          />
          <NumberField
            label={t('settings.concurrency')}
            min={1}
            max={12}
            value={settings.scanner.concurrency}
            disabled={loading}
            onChange={(value) => updateScannerNumber('concurrency', value)}
          />
          <NumberField
            label={t('settings.retryCount')}
            min={0}
            max={5}
            value={settings.scanner.retryCount}
            disabled={loading}
            onChange={(value) => updateScannerNumber('retryCount', value)}
          />
          <CheckboxField
            label={t('settings.autoScan')}
            description={t('settings.autoScanDescription')}
            checked={settings.autoScan}
            disabled={loading}
            onChange={(checked) => void updateAutoScan(checked)}
          />
        </SettingsCard>

        <SettingsCard title={t('settings.cache')}>
          <NumberField
            label={t('settings.cacheHours')}
            min={1}
            max={168}
            value={settings.cacheHours}
            disabled={loading}
            onChange={(value) => void updateNumberSetting('cacheHours', value)}
          />
        </SettingsCard>

        <SettingsCard title={t('settings.backup')}>
          <NumberField
            label={t('settings.backupRetention')}
            min={1}
            max={50}
            value={settings.backupRetention}
            disabled={loading}
            onChange={(value) => void updateNumberSetting('backupRetention', value)}
          />
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium">{t('settings.backupManagement')}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {backups.length === 0
                  ? t('settings.noBackups')
                  : t('settings.backupCount', { count: backups.length })}
              </p>
            </div>
            <div className="max-h-72 space-y-2 overflow-auto pr-1">
              {backups.map((backup) => (
                <div key={backup.id} className="rounded-md border p-3 text-sm dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{getBackupReasonLabel(t, backup.reason)}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(backup.createdAt).toLocaleString()} · {t('settings.bookmarksCount', { count: flattenBookmarks(backup.bookmarks).length })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRestoreTarget(backup)}
                        disabled={mutating}
                        className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-900"
                      >
                        <RotateCcw size={13} />
                        {t('settings.restoreBackup')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteBackup(backup.id)}
                        disabled={mutating}
                        className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={13} />
                        {t('settings.deleteBackup')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SettingsCard>

        <div className="lg:col-span-2">
          <SettingsCard title={t('settings.ignoredLinks')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">{t('settings.ignoredLinksCount', { count: ignoredUrls.length })}</p>
              <button type="button" disabled={ignoredUrls.length === 0} onClick={() => setConfirmClearIgnored(true)} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10">
                <Trash2 size={14} />
                {t('settings.clearIgnoredLinks')}
              </button>
            </div>
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={ignoredQuery} onChange={(event) => setIgnoredQuery(event.target.value)} placeholder={t('settings.searchIgnoredLinks')} className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <div className="max-h-72 divide-y overflow-auto rounded-md border dark:divide-slate-800 dark:border-slate-800">
              {filteredIgnoredUrls.length > 0 ? filteredIgnoredUrls.map((url) => (
                <div key={url} className="flex items-center justify-between gap-3 p-3">
                  <span className="min-w-0 truncate text-sm" title={url}>{url}</span>
                  <button type="button" onClick={() => void restoreIgnoredUrl(url)} className="inline-flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                    <RotateCcw size={13} />
                    {t('settings.restoreIgnoredLink')}
                  </button>
                </div>
              )) : <div className="p-5 text-center text-sm text-slate-500">{t(ignoredUrls.length === 0 ? 'settings.noIgnoredLinks' : 'settings.noIgnoredLinkMatches')}</div>}
            </div>
          </SettingsCard>
        </div>
      </section>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Save size={16} />
        {t('settings.autoSave')}
      </div>

      <ConfirmDialog
        open={restoreTarget !== null}
        title={t('settings.confirmRestoreTitle')}
        description={t('settings.confirmRestoreDescription', {
          count: restoreTarget ? flattenBookmarks(restoreTarget.bookmarks).length : 0
        })}
        confirmLabel={t('settings.restoreBackup')}
        cancelLabel={t('dialog.cancel')}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={() => void confirmRestore()}
      />
      <ConfirmDialog
        open={confirmClearIgnored}
        title={t('settings.confirmClearIgnoredTitle')}
        description={t('settings.confirmClearIgnoredDescription', { count: ignoredUrls.length })}
        confirmLabel={t('settings.clearIgnoredLinks')}
        cancelLabel={t('dialog.cancel')}
        variant="destructive"
        onCancel={() => setConfirmClearIgnored(false)}
        onConfirm={() => void clearIgnoredUrls()}
      />
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-950">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
      />
    </label>
  );
}

function CheckboxField({
  label,
  description,
  checked,
  disabled,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border p-3 text-sm dark:border-slate-800">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
    </label>
  );
}
