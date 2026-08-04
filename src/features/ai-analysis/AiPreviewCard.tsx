import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AiAnalysisPreview, AiProvider, AiTaskStatus } from '../../shared/types';
import { Button } from '../../shared/components/ui/Button';

interface AiPreviewCardProps {
  preview: AiAnalysisPreview;
  provider: AiProvider;
  endpointUrl: string;
  model: string;
  status: AiTaskStatus;
  onRun: () => void;
  onCancel: () => void;
}

export function AiPreviewCard({ preview, provider, endpointUrl, model, status, onRun, onCancel }: AiPreviewCardProps) {
  const { t } = useTranslation();
  const running = status === 'running';

  return (
    <section className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-5 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/5">
      <div className="flex items-center gap-2">
        <Send size={18} className="text-indigo-600" />
        <h2 className="font-semibold">{t('ai.previewTitle')}</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">{t('ai.previewDescription')}</p>

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <div><dt className="text-slate-500">{t('ai.provider')}</dt><dd className="mt-1 font-medium">{t(`ai.providers.${provider}`)}</dd></div>
        <div><dt className="text-slate-500">{t('ai.resolvedEndpoint')}</dt><dd className="mt-1 break-all font-medium">{endpointUrl}</dd></div>
        <div><dt className="text-slate-500">{t('ai.model')}</dt><dd className="mt-1 break-all font-medium">{model}</dd></div>
        <div><dt className="text-slate-500">{t('ai.selectedScope')}</dt><dd className="mt-1 font-medium">{preview.scopeLabel}</dd></div>
        <div><dt className="text-slate-500">{t('ai.fields')}</dt><dd className="mt-1 font-medium">{preview.fields.map((field) => t(`ai.fieldLabels.${field}`)).join(', ')}</dd></div>
        <div><dt className="text-slate-500">{t('ai.estimatedTokens', { count: preview.estimatedTokens })}</dt></div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
        <span className="rounded-full border bg-white px-3 py-1 dark:bg-slate-950">{t('ai.detectedCount', { count: preview.payload.scope.bookmarkCount })}</span>
        <span className="rounded-full border bg-white px-3 py-1 dark:bg-slate-950">{t('ai.includedCount', { count: preview.payload.items.length })}</span>
      </div>
      {preview.payload.truncated ? <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t('ai.truncated')}</p> : null}
      <details className="mt-4 rounded-md border bg-white p-3 text-sm dark:bg-slate-950">
        <summary className="cursor-pointer font-medium">{t('ai.payloadPreview')}</summary>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-600 dark:text-slate-300">{JSON.stringify(preview.payload, null, 2)}</pre>
      </details>

      <div className="mt-5 flex justify-end gap-2">
        {running ? <Button variant="outline" onClick={onCancel}>{t('ai.cancel')}</Button> : null}
        <Button onClick={onRun} disabled={running}>{running ? t('ai.running') : t('ai.confirm')}</Button>
      </div>
    </section>
  );
}
