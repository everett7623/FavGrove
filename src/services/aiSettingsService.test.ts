import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiConnectionSettings } from '../shared/types';
import { aiSettingsService, defaultAiSettings } from './aiSettingsService';
import { storageService } from './storageService';

afterEach(() => vi.restoreAllMocks());

describe('AI settings service', () => {
  it('uses the official OpenAI preset for a new installation', async () => {
    vi.spyOn(storageService, 'get').mockResolvedValue({ success: true, data: null });
    await expect(aiSettingsService.load()).resolves.toEqual({ success: true, data: defaultAiSettings });
  });

  it('migrates legacy endpoint settings to the third-party compatible provider', async () => {
    const legacy = {
      enabled: true,
      endpoint: ' https://legacy-provider.test/v1 ',
      model: ' legacy-model ',
      privacyMode: 'metadata'
    };
    vi.spyOn(storageService, 'get').mockResolvedValue({
      success: true,
      data: { schemaVersion: 1, data: legacy as unknown as AiConnectionSettings, updatedAt: 1 }
    });

    await expect(aiSettingsService.load()).resolves.toEqual({
      success: true,
      data: {
        enabled: true,
        provider: 'openai-compatible',
        endpoint: 'https://legacy-provider.test/v1',
        model: 'legacy-model',
        privacyMode: 'metadata'
      }
    });
  });
});
