import type { AiProviderRequest } from '../shared/types';
import { getAiProviderDefinition } from './aiProviderConfig';

export interface AiProviderHttpRequest {
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

function openAiRequest(request: AiProviderRequest, prompt: string): AiProviderHttpRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (request.apiKey) headers.Authorization = `Bearer ${request.apiKey}`;
  return {
    headers,
    body: {
      model: request.model,
      stream: false,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(request.payload) }
      ]
    }
  };
}

function anthropicRequest(request: AiProviderRequest, prompt: string): AiProviderHttpRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  };
  if (request.apiKey) headers['x-api-key'] = request.apiKey;
  return {
    headers,
    body: {
      model: request.model,
      max_tokens: 4_096,
      stream: false,
      system: prompt,
      messages: [{ role: 'user', content: JSON.stringify(request.payload) }]
    }
  };
}

function geminiRequest(request: AiProviderRequest, prompt: string): AiProviderHttpRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (request.apiKey) headers['x-goog-api-key'] = request.apiKey;
  return {
    headers,
    body: {
      systemInstruction: { parts: [{ text: prompt }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(request.payload) }] }],
      generationConfig: { responseMimeType: 'application/json' }
    }
  };
}

export function buildAiProviderHttpRequest(request: AiProviderRequest, prompt: string): AiProviderHttpRequest {
  const protocol = getAiProviderDefinition(request.provider).protocol;
  if (protocol === 'anthropic-messages') return anthropicRequest(request, prompt);
  if (protocol === 'gemini-generate-content') return geminiRequest(request, prompt);
  return openAiRequest(request, prompt);
}

function joinTextParts(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const text = value
    .map((part) => (part && typeof part === 'object' ? (part as Record<string, unknown>).text : null))
    .filter((part): part is string => typeof part === 'string')
    .join('');
  return text || null;
}

function openAiContent(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const choices = (value as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return null;
  const message = (choices[0] as Record<string, unknown>).message;
  if (!message || typeof message !== 'object') return null;
  const content = (message as Record<string, unknown>).content;
  return typeof content === 'string' ? content : joinTextParts(content);
}

function anthropicContent(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  return joinTextParts((value as Record<string, unknown>).content);
}

function geminiContent(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const candidates = (value as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== 'object') return null;
  const content = (candidates[0] as Record<string, unknown>).content;
  if (!content || typeof content !== 'object') return null;
  return joinTextParts((content as Record<string, unknown>).parts);
}

export function extractAiProviderContent(request: AiProviderRequest, value: unknown): string | null {
  const protocol = getAiProviderDefinition(request.provider).protocol;
  if (protocol === 'anthropic-messages') return anthropicContent(value);
  if (protocol === 'gemini-generate-content') return geminiContent(value);
  return openAiContent(value);
}

export function getAiProviderResponsePath(request: AiProviderRequest): string {
  const protocol = getAiProviderDefinition(request.provider).protocol;
  if (protocol === 'anthropic-messages') return 'content[].text';
  if (protocol === 'gemini-generate-content') return 'candidates[0].content.parts[].text';
  return 'choices[0].message.content';
}
