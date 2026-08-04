import type { BookmarkNode, Result } from './index';

export type AiPrivacyMode = 'domain-only' | 'metadata';
export type AiTaskStatus = 'idle' | 'preparing' | 'ready' | 'running' | 'success' | 'failed' | 'cancelled';
export type AiAnalysisField = 'hostname' | 'count' | 'title' | 'urlPath' | 'folderPath' | 'tags';
export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'xai' | 'openai-compatible';

export interface AiConnectionSettings {
  enabled: boolean;
  provider: AiProvider;
  endpoint: string;
  model: string;
  privacyMode: AiPrivacyMode;
}

export interface AiAnalysisPayload {
  schemaVersion: 1;
  scope: { kind: 'library' | 'folder'; bookmarkCount: number };
  aggregate: {
    topDomains: Array<{ value: string; count: number }>;
    topFolders: Array<{ value: string; count: number }>;
  };
  items: Array<{
    ref: string;
    title: string;
    hostname: string;
    urlPath: string;
    folderPath: string;
    tags: string[];
  }>;
  truncated: boolean;
}

export interface AiAnalysisPreview {
  payload: AiAnalysisPayload;
  scopeLabel: string;
  fields: AiAnalysisField[];
  estimatedTokens: number;
}

export interface AiAnalysisTopic {
  label: string;
  count: number;
  confidence: number;
  evidence: string[];
}

export interface AiAnalysisSuggestion {
  type: 'folder' | 'tag' | 'organization' | 'review';
  title: string;
  rationale: string;
  confidence: number;
  evidence: string[];
}

export interface AiAnalysisResult {
  schemaVersion: 1;
  summary: string;
  topics: AiAnalysisTopic[];
  suggestions: AiAnalysisSuggestion[];
  warnings: string[];
}

export interface AiPreprocessWorkerRequest {
  type: 'prepare-ai-analysis';
  bookmarks: BookmarkNode[];
  scopeId: string | null;
  privacyMode: AiPrivacyMode;
}

export interface AiPreprocessWorkerResponse {
  type: 'complete' | 'error';
  payload?: AiAnalysisPayload;
  fields?: AiAnalysisField[];
  error?: string;
}

export interface AiProviderRequest {
  type: 'run-ai-analysis';
  requestId: string;
  provider: AiProvider;
  endpoint: string;
  model: string;
  apiKey: string;
  language: string;
  payload: AiAnalysisPayload;
}

export interface AiProviderCancelRequest {
  type: 'cancel-ai-analysis';
  requestId: string;
}

export type AiProviderResult = Result<AiAnalysisResult>;
