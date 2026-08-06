import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiProvider, AiProviderRequest } from '../shared/types';
import { aiProviderService } from './aiProviderService';

const providerEndpoints: Record<AiProvider, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent',
  xai: 'https://api.x.ai/v1/chat/completions',
  'openai-compatible': 'https://provider.test/v1/chat/completions'
};

function request(requestId: string, provider: AiProvider = 'openai-compatible'): AiProviderRequest {
  return {
    type: 'run-ai-analysis',
    requestId,
    provider,
    endpoint: providerEndpoints[provider],
    model: 'test-model',
    apiKey: 'session-key',
    language: 'en',
    payload: {
      schemaVersion: 1,
      scope: { kind: 'library', bookmarkCount: 2 },
      aggregate: { topDomains: [{ value: 'example.com', count: 2 }], topFolders: [] },
      items: [],
      truncated: false
    }
  };
}

const analysis = {
  schemaVersion: 1,
  summary: 'Documentation links.',
  topics: [{ label: 'Docs', count: 2, confidence: 0.9, evidence: ['example.com'] }],
  suggestions: [{ type: 'organization', title: 'Group docs', rationale: 'Keep documentation together.', confidence: 0.8, evidence: ['example.com'] }],
  warnings: []
};

afterEach(() => vi.unstubAllGlobals());

describe('AI provider service', () => {
  it('sends the compatible contract and validates evidence', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(analysis) } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await aiProviderService.run(request('success'));
    expect(result).toEqual({ success: true, data: analysis });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ Authorization: 'Bearer session-key' });
    expect(JSON.parse(String(init.body))).toMatchObject({ model: 'test-model', stream: false });
  });

  it('uses the Anthropic Messages contract and extracts text content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(analysis) }] }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(aiProviderService.run(request('anthropic', 'anthropic'))).resolves.toEqual({ success: true, data: analysis });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe(providerEndpoints.anthropic);
    expect(init.headers).toMatchObject({
      'x-api-key': 'session-key',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    });
    expect(body).toMatchObject({ model: 'test-model', max_tokens: 4096, stream: false });
    expect(body.messages[0].content).toContain('schemaVersion');
  });

  it('uses the Gemini generateContent contract and extracts candidate parts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(analysis) }] } }] }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(aiProviderService.run(request('gemini', 'gemini'))).resolves.toEqual({ success: true, data: analysis });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe(providerEndpoints.gemini);
    expect(init.headers).toMatchObject({ 'x-goog-api-key': 'session-key' });
    expect(body.systemInstruction.parts[0].text).toContain('bookmark-library metadata');
    expect(body.contents[0].parts[0].text).toContain('schemaVersion');
  });

  it('uses the OpenAI-compatible contract for xAI', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(analysis) } }] }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(aiProviderService.run(request('xai', 'xai'))).resolves.toEqual({ success: true, data: analysis });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(providerEndpoints.xai);
    expect(init.headers).toMatchObject({ Authorization: 'Bearer session-key' });
  });

  it('rejects an official provider request when its endpoint is overridden', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await aiProviderService.run({ ...request('wrong-endpoint', 'openai'), endpoint: 'https://attacker.test/v1/chat/completions' });
    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('filters unsupported findings while preserving supported findings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ...analysis, topics: [{ ...analysis.topics[0], evidence: ['invented.test'] }] }) } }] }), { status: 200 })));
    const result = await aiProviderService.run(request('invalid-evidence'));
    expect(result).toMatchObject({ success: true, data: { topics: [], suggestions: analysis.suggestions } });
    if (result.success) expect(result.data.warnings).toHaveLength(1);
  });

  it('keeps evidence from item hostnames outside the aggregate top domains', async () => {
    const itemRequest = request('item-hostname');
    const supportedAnalysis = {
      ...analysis,
      topics: [{ ...analysis.topics[0], evidence: ['long-tail.example'] }],
      suggestions: [{ ...analysis.suggestions[0], evidence: ['bookmark-1'] }]
    };
    itemRequest.payload.items = [{
      ref: 'bookmark-1',
      title: 'Long-tail bookmark',
      hostname: 'long-tail.example',
      urlPath: '/',
      folderPath: '',
      tags: []
    }];
    const response = new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(supportedAnalysis) } }] }),
      { status: 200 }
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    await expect(aiProviderService.run(itemRequest)).resolves.toEqual({ success: true, data: supportedAnalysis });
  });

  it('rejects a result when none of its findings have request evidence', async () => {
    const unsupported = {
      ...analysis,
      topics: [{ ...analysis.topics[0], evidence: ['invented.test'] }],
      suggestions: [{ ...analysis.suggestions[0], evidence: [] }]
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(unsupported) } }] }), { status: 200 })));
    const result = await aiProviderService.run(request('no-valid-evidence'));
    expect(result).toMatchObject({ success: false });
  });

  it('accepts compatible text-part message content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: [{ type: 'text', text: JSON.stringify(analysis) }] } }] }), { status: 200 }))
    );
    await expect(aiProviderService.run(request('text-parts'))).resolves.toEqual({ success: true, data: analysis });
  });

  it('identifies a response without Chat Completions message content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: null } }] }), { status: 200 })));
    const result = await aiProviderService.run(request('missing-content'));
    expect(result).toMatchObject({ success: false, error: expect.stringContaining('choices[0].message.content') });
  });

  it('rejects oversized provider responses before parsing them', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Length': '1000001' } }))
    );
    const result = await aiProviderService.run(request('oversized'));
    expect(result.success).toBe(false);
  });

  it('cancels an active provider request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))))
    );
    const pending = aiProviderService.run(request('cancel'));
    await Promise.resolve();
    expect(aiProviderService.cancel('cancel')).toBe(true);
    await expect(pending).resolves.toMatchObject({ success: false });
  });
});
