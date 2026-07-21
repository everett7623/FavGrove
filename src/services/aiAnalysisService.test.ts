import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiAnalysisPreview, AiAnalysisResult, AiConnectionSettings } from '../shared/types';
import { aiAnalysisService, parseAiEndpoint } from './aiAnalysisService';

const settings: AiConnectionSettings = { enabled: true, endpoint: 'https://provider.test/v1/chat/completions', model: 'test-model', privacyMode: 'domain-only' };
const preview: AiAnalysisPreview = {
  scopeLabel: 'Whole library',
  fields: ['hostname'],
  estimatedTokens: 500,
  payload: { schemaVersion: 1, scope: { kind: 'library', bookmarkCount: 0 }, aggregate: { topDomains: [], topFolders: [] }, items: [], truncated: false }
};
const analysis: AiAnalysisResult = { schemaVersion: 1, summary: 'Empty library.', topics: [], suggestions: [], warnings: [] };

afterEach(() => vi.unstubAllGlobals());

describe('AI analysis service', () => {
  it('validates endpoint protocols and embedded credentials', () => {
    expect(parseAiEndpoint(settings.endpoint)?.toString()).toBe('https://provider.test/v1/chat/completions');
    expect(parseAiEndpoint('https://provider.test')?.toString()).toBe('https://provider.test/v1/chat/completions');
    expect(parseAiEndpoint('https://provider.test/v1/')?.toString()).toBe('https://provider.test/v1/chat/completions');
    expect(parseAiEndpoint('https://provider.test/custom/')?.toString()).toBe('https://provider.test/custom');
    expect(parseAiEndpoint('ftp://provider.test/model')).toBeNull();
    expect(parseAiEndpoint('https://user:pass@provider.test/model')).toBeNull();
  });

  it('requires separate endpoint permission before background transport', async () => {
    const requestPermission = vi.fn().mockResolvedValue(true);
    const sendMessage = vi.fn().mockResolvedValue({ success: true, data: analysis });
    vi.stubGlobal('chrome', { permissions: { request: requestPermission }, runtime: { id: 'extension-id', sendMessage } });

    const result = await aiAnalysisService.run({ ...settings, endpoint: 'https://provider.test/v1' }, 'temporary-key', 'en', preview, new AbortController().signal);
    expect(result).toEqual({ success: true, data: analysis });
    expect(requestPermission).toHaveBeenCalledWith({ origins: ['https://provider.test/*'] });
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'run-ai-analysis', endpoint: 'https://provider.test/v1/chat/completions', apiKey: 'temporary-key', model: 'test-model' }));
  });

  it('does not contact the provider when permission is denied', async () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { permissions: { request: vi.fn().mockResolvedValue(false) }, runtime: { id: 'extension-id', sendMessage } });
    const result = await aiAnalysisService.run(settings, '', 'en', preview, new AbortController().signal);
    expect(result.success).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
