import i18n from '../shared/i18n';
import type { AiAnalysisResult, AiProviderRequest, Result } from '../shared/types';
import { parseAiAnalysisResponse } from '../shared/utils/aiResponse';
import { buildAiProviderHttpRequest, extractAiProviderContent, getAiProviderResponsePath } from './aiProviderAdapters';
import { getAiProviderDefinition, isAiProvider, resolveAiEndpoint } from './aiProviderConfig';

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_PROVIDER_RESPONSE_BYTES = 1_000_000;
const activeRequests = new Map<string, AbortController>();

function systemPrompt(language: string): string {
  return `You analyze bookmark-library metadata. Return only one JSON object using this exact contract:
{"schemaVersion":1,"summary":"string","topics":[{"label":"string","count":0,"confidence":0.0,"evidence":["string"]}],"suggestions":[{"type":"folder|tag|organization|review","title":"string","rationale":"string","confidence":0.0,"evidence":["string"]}],"warnings":["string"]}.
All confidence values must be between 0 and 1. Every evidence string must exactly equal one hostname, folder aggregate value, or item ref present in the request. Omit a finding when no request evidence supports it. Do not invent visited-page content. Do not suggest automatic destructive actions. Respond in ${language === 'zh_CN' ? 'Simplified Chinese' : 'English'}.`;
}

function providerMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const error = record.error && typeof record.error === 'object' ? (record.error as Record<string, unknown>) : null;
  const message = error?.message ?? record.message;
  return typeof message === 'string' && message.trim() ? message.trim().slice(0, 300) : null;
}

async function readProviderBody(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PROVIDER_RESPONSE_BYTES) {
    await response.body?.cancel();
    return null;
  }
  if (!response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_PROVIDER_RESPONSE_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function validateEvidence(result: AiAnalysisResult, request: AiProviderRequest): Result<AiAnalysisResult> {
  const allowed = new Map([
    ...request.payload.items.map((item) => item.ref),
    ...request.payload.aggregate.topDomains.map((item) => item.value),
    ...request.payload.aggregate.topFolders.map((item) => item.value)
  ].map((item) => [item.toLowerCase(), item] as const));
  let removed = 0;
  const cleanEvidence = (evidence: string[]) => [...new Set(evidence.map((item) => allowed.get(item.trim().toLowerCase())).filter((item): item is string => Boolean(item)))];
  const topics = result.topics.flatMap((topic) => {
    const evidence = cleanEvidence(topic.evidence);
    if (!evidence.length || topic.count > request.payload.scope.bookmarkCount) {
      removed += 1;
      return [];
    }
    return [{ ...topic, evidence }];
  });
  const suggestions = result.suggestions.flatMap((suggestion) => {
    const evidence = cleanEvidence(suggestion.evidence);
    if (!evidence.length) {
      removed += 1;
      return [];
    }
    return [{ ...suggestion, evidence }];
  });
  const originalCount = result.topics.length + result.suggestions.length;
  if (originalCount > 0 && topics.length + suggestions.length === 0) {
    return { success: false, error: i18n.t('ai.errors.invalidEvidence') };
  }
  const warnings = removed
    ? [...result.warnings.slice(0, 11), i18n.t('ai.providerWarnings.filteredEvidence', { count: removed })]
    : result.warnings;
  return { success: true, data: { ...result, topics, suggestions, warnings } };
}

export const aiProviderService = {
  async run(request: AiProviderRequest): Promise<Result<AiAnalysisResult>> {
    if (!isAiProvider(request.provider)) return { success: false, error: i18n.t('ai.errors.invalidEndpoint') };
    const expectedEndpoint = resolveAiEndpoint(request);
    if (!expectedEndpoint || expectedEndpoint.toString() !== request.endpoint) {
      return { success: false, error: i18n.t('ai.errors.invalidEndpoint') };
    }
    if (getAiProviderDefinition(request.provider).apiKeyRequired && !request.apiKey.trim()) {
      return { success: false, error: i18n.t('ai.errors.missingApiKey') };
    }
    if (activeRequests.has(request.requestId)) return { success: false, error: i18n.t('ai.errors.providerFailed') };
    const controller = new AbortController();
    activeRequests.set(request.requestId, controller);
    const timeoutId = setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT_MS);

    try {
      const providerRequest = buildAiProviderHttpRequest(request, systemPrompt(request.language));
      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: providerRequest.headers,
        body: JSON.stringify(providerRequest.body),
        signal: controller.signal
      });
      const body = await readProviderBody(response);
      if (!response.ok) {
        const detail = providerMessage(body);
        return { success: false, error: detail ? `${detail} (HTTP ${response.status})` : `${i18n.t('ai.errors.providerFailed')} (HTTP ${response.status})` };
      }
      if (body === null) return { success: false, error: i18n.t('ai.errors.invalidResponse') };
      const content = extractAiProviderContent(request, body);
      if (!content) {
        return { success: false, error: i18n.t('ai.errors.missingResponseContent', { path: getAiProviderResponsePath(request) }) };
      }
      const parsed = parseAiAnalysisResponse(content, i18n.t('ai.errors.invalidResponseSchema'));
      return parsed.success ? validateEvidence(parsed.data, request) : parsed;
    } catch (error) {
      if (controller.signal.aborted) {
        return { success: false, error: controller.signal.reason === 'timeout' ? i18n.t('ai.errors.timedOut') : i18n.t('ai.errors.cancelled') };
      }
      return { success: false, error: error instanceof Error ? error.message : i18n.t('ai.errors.providerFailed') };
    } finally {
      clearTimeout(timeoutId);
      activeRequests.delete(request.requestId);
    }
  },

  cancel(requestId: string): boolean {
    const controller = activeRequests.get(requestId);
    if (!controller) return false;
    controller.abort('cancelled');
    return true;
  }
};
