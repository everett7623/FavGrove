import type { AiConnectionSettings, Result } from '../shared/types';
import { STORAGE_KEYS } from '../shared/constants/storage';
import { getAiProviderDefinition, isAiProvider } from './aiProviderConfig';
import { storageService } from './storageService';

export const defaultAiSettings: AiConnectionSettings = {
  enabled: false,
  provider: 'openai',
  endpoint: '',
  model: getAiProviderDefinition('openai').defaultModel,
  privacyMode: 'domain-only'
};

function normalize(value: Partial<AiConnectionSettings> | null | undefined): AiConnectionSettings {
  const hasLegacyConnection = typeof value?.endpoint === 'string' && Boolean(value.endpoint.trim());
  const provider = isAiProvider(value?.provider) ? value.provider : hasLegacyConnection ? 'openai-compatible' : 'openai';
  const definition = getAiProviderDefinition(provider);
  const model = typeof value?.model === 'string' ? value.model.trim().slice(0, 200) : '';
  return {
    enabled: value?.enabled === true,
    provider,
    endpoint: typeof value?.endpoint === 'string' ? value.endpoint.trim().slice(0, 2_000) : '',
    model: model || definition.defaultModel,
    privacyMode: value?.privacyMode === 'metadata' ? 'metadata' : 'domain-only'
  };
}

export const aiSettingsService = {
  async load(): Promise<Result<AiConnectionSettings>> {
    const stored = await storageService.get<AiConnectionSettings>(STORAGE_KEYS.aiSettings);
    if (!stored.success) return stored;
    return { success: true, data: normalize(stored.data?.data) };
  },

  async save(settings: AiConnectionSettings): Promise<Result<AiConnectionSettings>> {
    const normalized = normalize(settings);
    const saved = await storageService.set(STORAGE_KEYS.aiSettings, normalized);
    return saved.success ? { success: true, data: normalized } : saved;
  }
};
