import i18n from '../shared/i18n';
import type {
  AiAnalysisPreview,
  AiConnectionSettings,
  AiPreprocessWorkerResponse,
  AiProviderRequest,
  AiProviderResult,
  BookmarkNode,
  Result
} from '../shared/types';
import { createAiAnalysisPayload } from '../shared/utils/aiPreprocess';
import { getAiProviderDefinition, parseOpenAiCompatibleEndpoint, resolveAiEndpoint } from './aiProviderConfig';
import { aiProviderService } from './aiProviderService';

export const parseAiEndpoint = parseOpenAiCompatibleEndpoint;

async function requestEndpointPermission(endpoint: URL): Promise<boolean> {
  if (!globalThis.chrome?.permissions?.request) return true;
  try {
    return await chrome.permissions.request({ origins: [`${endpoint.origin}/*`] });
  } catch {
    return false;
  }
}

function prepareWithWorker(bookmarks: BookmarkNode[], scopeId: string | null, privacyMode: AiConnectionSettings['privacyMode']) {
  if (typeof Worker === 'undefined') return Promise.resolve({ success: true, data: createAiAnalysisPayload(bookmarks, scopeId, privacyMode) } as const);

  let worker: Worker;
  try {
    worker = new Worker(new URL('../workers/aiPreprocess.worker.ts', import.meta.url), { type: 'module' });
  } catch (error) {
    return Promise.resolve({ success: false, error: error instanceof Error ? error.message : i18n.t('ai.errors.preprocessFailed') } as const);
  }

  return new Promise<Result<ReturnType<typeof createAiAnalysisPayload>>>((resolve) => {
    const finish = (result: Result<ReturnType<typeof createAiAnalysisPayload>>) => {
      worker.terminate();
      resolve(result);
    };
    worker.onmessage = (event: MessageEvent<AiPreprocessWorkerResponse>) => {
      if (event.data.type === 'complete' && event.data.payload && event.data.fields) {
        finish({ success: true, data: { payload: event.data.payload, fields: event.data.fields } });
      } else {
        finish({ success: false, error: event.data.error ?? i18n.t('ai.errors.preprocessFailed') });
      }
    };
    worker.onerror = () => finish({ success: false, error: i18n.t('ai.errors.preprocessFailed') });
    try {
      worker.postMessage({ type: 'prepare-ai-analysis', bookmarks, scopeId, privacyMode });
    } catch (error) {
      finish({ success: false, error: error instanceof Error ? error.message : i18n.t('ai.errors.preprocessFailed') });
    }
  });
}

export const aiAnalysisService = {
  async prepare(
    bookmarks: BookmarkNode[],
    scopeId: string | null,
    scopeLabel: string,
    privacyMode: AiConnectionSettings['privacyMode']
  ): Promise<Result<AiAnalysisPreview>> {
    const prepared = await prepareWithWorker(bookmarks, scopeId, privacyMode);
    if (!prepared.success) return prepared;
    return {
      success: true,
      data: {
        ...prepared.data,
        scopeLabel,
        estimatedTokens: Math.ceil(JSON.stringify(prepared.data.payload).length / 4) + 500
      }
    };
  },

  async run(
    settings: AiConnectionSettings,
    apiKey: string,
    language: string,
    preview: AiAnalysisPreview,
    signal: AbortSignal
  ): Promise<AiProviderResult> {
    if (signal.aborted) return { success: false, error: i18n.t('ai.errors.cancelled') };
    const endpoint = resolveAiEndpoint(settings);
    if (!endpoint) return { success: false, error: i18n.t('ai.errors.invalidEndpoint') };
    if (!settings.model.trim()) return { success: false, error: i18n.t('ai.errors.missingModel') };
    if (getAiProviderDefinition(settings.provider).apiKeyRequired && !apiKey.trim()) {
      return { success: false, error: i18n.t('ai.errors.missingApiKey') };
    }
    if (!(await requestEndpointPermission(endpoint))) return { success: false, error: i18n.t('ai.errors.permissionDenied') };
    if (signal.aborted) return { success: false, error: i18n.t('ai.errors.cancelled') };

    const request: AiProviderRequest = {
      type: 'run-ai-analysis',
      requestId: crypto.randomUUID(),
      provider: settings.provider,
      endpoint: endpoint.toString(),
      model: settings.model.trim(),
      apiKey: apiKey.trim(),
      language,
      payload: preview.payload
    };
    if (!globalThis.chrome?.runtime?.id) {
      const cancelDirect = () => aiProviderService.cancel(request.requestId);
      signal.addEventListener('abort', cancelDirect, { once: true });
      try {
        return await aiProviderService.run(request);
      } finally {
        signal.removeEventListener('abort', cancelDirect);
      }
    }

    const cancel = () => {
      void chrome.runtime
        .sendMessage({ type: 'cancel-ai-analysis', requestId: request.requestId })
        .catch(() => undefined);
    };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      if (signal.aborted) return { success: false, error: i18n.t('ai.errors.cancelled') };
      return (await chrome.runtime.sendMessage(request)) as AiProviderResult;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : i18n.t('ai.errors.providerFailed') };
    } finally {
      signal.removeEventListener('abort', cancel);
    }
  }
};
