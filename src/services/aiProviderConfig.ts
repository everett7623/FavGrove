import type { AiConnectionSettings, AiProvider } from '../shared/types';

export type AiProviderProtocol = 'openai-chat-completions' | 'anthropic-messages' | 'gemini-generate-content';

export interface AiProviderDefinition {
  id: AiProvider;
  protocol: AiProviderProtocol;
  endpointMode: 'fixed' | 'custom';
  endpoint: string;
  defaultModel: string;
  modelSuggestions: readonly string[];
  apiKeyRequired: boolean;
}

export const AI_PROVIDER_DEFINITIONS: readonly AiProviderDefinition[] = [
  {
    id: 'openai',
    protocol: 'openai-chat-completions',
    endpointMode: 'fixed',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-5.6-terra',
    modelSuggestions: ['gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-4.1-mini'],
    apiKeyRequired: true
  },
  {
    id: 'anthropic',
    protocol: 'anthropic-messages',
    endpointMode: 'fixed',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-5',
    modelSuggestions: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5'],
    apiKeyRequired: true
  },
  {
    id: 'gemini',
    protocol: 'gemini-generate-content',
    endpointMode: 'fixed',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-3-flash',
    modelSuggestions: ['gemini-3-flash', 'gemini-3.1-pro', 'gemini-2.5-flash'],
    apiKeyRequired: true
  },
  {
    id: 'xai',
    protocol: 'openai-chat-completions',
    endpointMode: 'fixed',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    defaultModel: 'grok-4.3',
    modelSuggestions: ['grok-4.5', 'grok-4.3', 'grok-4.20-0309-non-reasoning'],
    apiKeyRequired: true
  },
  {
    id: 'openai-compatible',
    protocol: 'openai-chat-completions',
    endpointMode: 'custom',
    endpoint: '',
    defaultModel: '',
    modelSuggestions: [],
    apiKeyRequired: false
  }
];

const providerDefinitions = new Map(AI_PROVIDER_DEFINITIONS.map((definition) => [definition.id, definition]));

export function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === 'string' && providerDefinitions.has(value as AiProvider);
}

export function getAiProviderDefinition(provider: AiProvider): AiProviderDefinition {
  return providerDefinitions.get(provider) ?? AI_PROVIDER_DEFINITIONS[0];
}

export function parseOpenAiCompatibleEndpoint(value: string): URL | null {
  try {
    const endpoint = new URL(value.trim());
    if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) return null;
    const pathname = endpoint.pathname.replace(/\/+$/, '');
    if (!pathname) endpoint.pathname = '/v1/chat/completions';
    else if (pathname === '/v1') endpoint.pathname = '/v1/chat/completions';
    else endpoint.pathname = pathname;
    endpoint.hash = '';
    return endpoint;
  } catch {
    return null;
  }
}

export function resolveAiEndpoint(settings: Pick<AiConnectionSettings, 'provider' | 'endpoint' | 'model'>): URL | null {
  const definition = getAiProviderDefinition(settings.provider);
  if (definition.endpointMode === 'custom') return parseOpenAiCompatibleEndpoint(settings.endpoint);
  if (settings.provider === 'gemini') {
    const model = settings.model.trim().replace(/^models\//, '');
    return model ? new URL(`${definition.endpoint}/${encodeURIComponent(model)}:generateContent`) : null;
  }
  return new URL(definition.endpoint);
}
