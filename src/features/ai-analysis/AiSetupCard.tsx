import { BrainCircuit, ShieldCheck } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { AI_PROVIDER_DEFINITIONS, getAiProviderDefinition, resolveAiEndpoint } from '../../services/aiProviderConfig';
import type { AiConnectionSettings, AiProvider, AiTaskStatus, BookmarkNode } from '../../shared/types';
import { Button } from '../../shared/components/ui/Button';

interface AiSetupCardProps {
  settings: AiConnectionSettings;
  setSettings: Dispatch<SetStateAction<AiConnectionSettings>>;
  apiKey: string;
  setApiKey: (value: string) => void;
  folders: BookmarkNode[];
  scopeId: string;
  setScopeId: (value: string) => void;
  status: AiTaskStatus;
  onPrepare: () => void;
}

const inputClassName = 'mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:bg-slate-950';

export function AiSetupCard({ settings, setSettings, apiKey, setApiKey, folders, scopeId, setScopeId, status, onPrepare }: AiSetupCardProps) {
  const { t } = useTranslation();
  const busy = status === 'preparing' || status === 'running';
  const provider = getAiProviderDefinition(settings.provider);
  const endpoint = resolveAiEndpoint(settings);
  const ready = settings.enabled && Boolean(endpoint) && Boolean(settings.model.trim());

  const handleProviderChange = (nextProvider: AiProvider) => {
    const definition = getAiProviderDefinition(nextProvider);
    setSettings((current) => ({ ...current, provider: nextProvider, model: definition.defaultModel }));
    setApiKey('');
  };

  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-950">
      <div className="flex items-center gap-2">
        <BrainCircuit size={19} className="text-indigo-600" />
        <h2 className="font-semibold">{t('ai.configuration')}</h2>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-md border p-3">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
          className="mt-1"
        />
        <span>
          <span className="block text-sm font-medium">{t('ai.enabled')}</span>
          <span className="mt-1 block text-xs text-slate-500">{t('ai.enabledDescription')}</span>
        </span>
      </label>

      {!settings.enabled ? <div className="mt-4 rounded-md bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">{t('ai.disabledNotice')}</div> : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-medium">
          {t('ai.provider')}
          <select
            value={settings.provider}
            onChange={(event) => handleProviderChange(event.target.value as AiProvider)}
            className={inputClassName}
            disabled={!settings.enabled || busy}
          >
            {AI_PROVIDER_DEFINITIONS.map((definition) => (
              <option key={definition.id} value={definition.id}>{t(`ai.providers.${definition.id}`)}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {t('ai.model')}
          <input
            value={settings.model}
            onChange={(event) => setSettings((current) => ({ ...current, model: event.target.value }))}
            placeholder={t('ai.modelPlaceholder')}
            list="ai-model-options"
            className={inputClassName}
            disabled={!settings.enabled || busy}
          />
          <datalist id="ai-model-options">
            {provider.modelSuggestions.map((model) => <option key={model} value={model} />)}
          </datalist>
          <span className="mt-1 block text-xs font-normal text-slate-500">{t('ai.modelDescription')}</span>
        </label>
        <label className="text-sm font-medium lg:col-span-2">
          {t('ai.endpoint')}
          <input
            type="url"
            value={provider.endpointMode === 'custom' ? settings.endpoint : endpoint?.toString() ?? provider.endpoint}
            onChange={(event) => setSettings((current) => ({ ...current, endpoint: event.target.value }))}
            placeholder={t('ai.endpointPlaceholder')}
            className={inputClassName}
            disabled={!settings.enabled || busy}
            readOnly={provider.endpointMode === 'fixed'}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            {t(provider.endpointMode === 'custom' ? 'ai.endpointDescription' : 'ai.officialEndpointDescription')}
          </span>
        </label>
        <label className="text-sm font-medium">
          {t(provider.apiKeyRequired ? 'ai.apiKeyRequired' : 'ai.apiKeyOptional')}
          <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} className={inputClassName} disabled={!settings.enabled || busy} />
          <span className="mt-1 block text-xs font-normal text-slate-500">{t('ai.apiKeyDescription')}</span>
        </label>
        <label className="text-sm font-medium">
          {t('ai.privacyMode')}
          <select
            value={settings.privacyMode}
            onChange={(event) => setSettings((current) => ({ ...current, privacyMode: event.target.value as AiConnectionSettings['privacyMode'] }))}
            className={inputClassName}
            disabled={!settings.enabled || busy}
          >
            <option value="domain-only">{t('ai.privacyModes.domainOnly')}</option>
            <option value="metadata">{t('ai.privacyModes.metadata')}</option>
          </select>
        </label>
        <label className="text-sm font-medium lg:col-span-2">
          {t('ai.scope')}
          <select value={scopeId} onChange={(event) => setScopeId(event.target.value)} className={inputClassName} disabled={!settings.enabled || busy}>
            <option value="all">{t('ai.wholeLibrary')}</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.path?.join(' / ') || folder.title}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={15} />{t('ai.readOnly')}</span>
        <Button onClick={onPrepare} disabled={!ready || busy}>{status === 'preparing' ? t('ai.preparing') : t('ai.buildPreview')}</Button>
      </div>
    </section>
  );
}
