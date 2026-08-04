import { afterEach, describe, expect, it, vi } from 'vitest';
import { aiAnalysisService } from '../services/aiAnalysisService';
import type { AiAnalysisPreview, AiConnectionSettings } from '../shared/types';
import { useAiAnalysisStore } from './aiAnalysisStore';

const preview: AiAnalysisPreview = {
  scopeLabel: 'Whole library',
  fields: ['hostname'],
  estimatedTokens: 500,
  payload: { schemaVersion: 1, scope: { kind: 'library', bookmarkCount: 0 }, aggregate: { topDomains: [], topFolders: [] }, items: [], truncated: false }
};
const settings: AiConnectionSettings = { enabled: true, provider: 'openai-compatible', endpoint: 'https://provider.test/v1/chat/completions', model: 'test-model', privacyMode: 'domain-only' };

afterEach(() => vi.restoreAllMocks());

describe('AI analysis task state', () => {
  it('cancels one running request without allowing its completion to overwrite state', async () => {
    useAiAnalysisStore.setState({ status: 'ready', preview, result: null, error: null });
    vi.spyOn(aiAnalysisService, 'run').mockImplementation(
      (_settings, _apiKey, _language, _preview, signal) =>
        new Promise((resolve) => signal.addEventListener('abort', () => resolve({ success: false, error: 'cancelled' }), { once: true }))
    );

    const running = useAiAnalysisStore.getState().run(settings, '', 'en');
    expect(useAiAnalysisStore.getState().status).toBe('running');
    useAiAnalysisStore.getState().cancel();
    expect(useAiAnalysisStore.getState().status).toBe('cancelled');
    await running;
    expect(useAiAnalysisStore.getState().status).toBe('cancelled');
  });
});
