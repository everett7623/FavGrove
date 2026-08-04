import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiAnalysisPreview, AiAnalysisResult, AiConnectionSettings } from '../shared/types';
import { aiAnalysisService, parseAiEndpoint } from './aiAnalysisService';
import { resolveAiEndpoint } from './aiProviderConfig';

const settings: AiConnectionSettings = { enabled: true, provider: 'openai-compatible', endpoint: 'https://provider.test/v1/chat/completions', model: 'test-model', privacyMode: 'domain-only' };
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

  it('resolves fixed provider endpoints and places the Gemini model in its request path', () => {
    expect(resolveAiEndpoint({ ...settings, provider: 'openai' })?.toString()).toBe('https://api.openai.com/v1/chat/completions');
    expect(resolveAiEndpoint({ ...settings, provider: 'anthropic' })?.toString()).toBe('https://api.anthropic.com/v1/messages');
    expect(resolveAiEndpoint({ ...settings, provider: 'xai' })?.toString()).toBe('https://api.x.ai/v1/chat/completions');
    expect(resolveAiEndpoint({ ...settings, provider: 'gemini', model: 'models/gemini-test' })?.toString()).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent'
    );
  });

  it('requires separate endpoint permission before background transport', async () => {
    const requestPermission = vi.fn().mockResolvedValue(true);
    const sendMessage = vi.fn().mockResolvedValue({ success: true, data: analysis });
    vi.stubGlobal('chrome', { permissions: { request: requestPermission }, runtime: { id: 'extension-id', sendMessage } });

    const result = await aiAnalysisService.run({ ...settings, endpoint: 'https://provider.test/v1' }, 'temporary-key', 'en', preview, new AbortController().signal);
    expect(result).toEqual({ success: true, data: analysis });
    expect(requestPermission).toHaveBeenCalledWith({ origins: ['https://provider.test/*'] });
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'run-ai-analysis', provider: 'openai-compatible', endpoint: 'https://provider.test/v1/chat/completions', apiKey: 'temporary-key', model: 'test-model' }));
  });

  it('requires an API key before requesting access to an official provider', async () => {
    const requestPermission = vi.fn();
    vi.stubGlobal('chrome', { permissions: { request: requestPermission }, runtime: { id: 'extension-id', sendMessage: vi.fn() } });
    const result = await aiAnalysisService.run({ ...settings, provider: 'anthropic' }, '', 'en', preview, new AbortController().signal);
    expect(result.success).toBe(false);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('does not contact the provider when permission is denied', async () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { permissions: { request: vi.fn().mockResolvedValue(false) }, runtime: { id: 'extension-id', sendMessage } });
    const result = await aiAnalysisService.run(settings, '', 'en', preview, new AbortController().signal);
    expect(result.success).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
