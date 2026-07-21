import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiSettingsService, defaultAiSettings } from '../../services/aiSettingsService';
import { parseAiEndpoint } from '../../services/aiAnalysisService';
import type { AiConnectionSettings } from '../../shared/types';
import { flattenFolders } from '../../shared/utils/bookmarks';
import { useAiAnalysisStore } from '../../stores/aiAnalysisStore';
import { useBookmarkStore } from '../../stores/bookmarkStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { AiPreviewCard } from './AiPreviewCard';
import { AiResults } from './AiResults';
import { AiSetupCard } from './AiSetupCard';

export default function AiAnalysisPage() {
  const { t } = useTranslation();
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const language = useSettingsStore((state) => state.settings.language);
  const status = useAiAnalysisStore((state) => state.status);
  const preview = useAiAnalysisStore((state) => state.preview);
  const result = useAiAnalysisStore((state) => state.result);
  const taskError = useAiAnalysisStore((state) => state.error);
  const prepare = useAiAnalysisStore((state) => state.prepare);
  const run = useAiAnalysisStore((state) => state.run);
  const cancel = useAiAnalysisStore((state) => state.cancel);
  const reset = useAiAnalysisStore((state) => state.reset);
  const [settings, setSettings] = useState<AiConnectionSettings>(defaultAiSettings);
  const [apiKey, setApiKey] = useState('');
  const [scopeId, setScopeId] = useState('all');
  const [configError, setConfigError] = useState<string | null>(null);
  const folders = useMemo(() => flattenFolders(bookmarks), [bookmarks]);
  const endpoint = parseAiEndpoint(settings.endpoint);

  useEffect(() => {
    void aiSettingsService.load().then((loaded) => {
      if (loaded.success) setSettings(loaded.data);
      else setConfigError(loaded.error);
    });
  }, []);

  useEffect(() => {
    reset();
  }, [scopeId, settings.enabled, settings.privacyMode, reset]);

  useEffect(() => () => useAiAnalysisStore.getState().cancel(), []);

  const handlePrepare = async () => {
    setConfigError(null);
    if (!endpoint) return setConfigError(t('ai.errors.invalidEndpoint'));
    if (!settings.model.trim()) return setConfigError(t('ai.errors.missingModel'));
    const saved = await aiSettingsService.save({ ...settings, endpoint: endpoint.toString() });
    if (!saved.success) return setConfigError(saved.error);
    setSettings(saved.data);
    const folder = scopeId === 'all' ? null : folders.find((item) => item.id === scopeId);
    await prepare(bookmarks, folder?.id ?? null, folder?.path?.join(' / ') || folder?.title || t('ai.wholeLibrary'), saved.data.privacyMode);
  };

  const handleRun = () => {
    if (preview) void run(settings, apiKey, language);
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">{t('pages.aiAnalysis.title')}</h1><p className="mt-1 text-sm text-slate-500">{t('pages.aiAnalysis.description')}</p></div>

      <AiSetupCard
        settings={settings}
        setSettings={setSettings}
        apiKey={apiKey}
        setApiKey={setApiKey}
        folders={folders}
        scopeId={scopeId}
        setScopeId={setScopeId}
        status={status}
        onPrepare={() => void handlePrepare()}
      />

      {configError || taskError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{configError ?? taskError}</div> : null}
      {status === 'cancelled' ? <div className="rounded-md border bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">{t('ai.cancelled')}</div> : null}
      {preview && endpoint ? <AiPreviewCard preview={preview} endpointUrl={endpoint.toString()} model={settings.model} status={status} onRun={handleRun} onCancel={cancel} /> : null}
      {result ? <AiResults result={result} /> : null}
    </div>
  );
}
