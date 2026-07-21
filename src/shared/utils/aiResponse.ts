import type { AiAnalysisResult, AiAnalysisSuggestion, AiAnalysisTopic, Result } from '../types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function readConfidence(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

function readEvidence(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const evidence = value.map((item) => readString(item, 240));
  return evidence.every((item): item is string => item !== null) ? evidence.slice(0, 8) : null;
}

function readTopic(value: unknown): AiAnalysisTopic | null {
  const record = asRecord(value);
  if (!record) return null;
  const label = readString(record.label, 120);
  const confidence = readConfidence(record.confidence);
  const evidence = readEvidence(record.evidence);
  const count = record.count;
  if (!label || confidence === null || !evidence || typeof count !== 'number' || !Number.isInteger(count) || count < 0) return null;
  return { label, count, confidence, evidence };
}

function readSuggestion(value: unknown): AiAnalysisSuggestion | null {
  const record = asRecord(value);
  if (!record) return null;
  const allowedTypes = new Set<AiAnalysisSuggestion['type']>(['folder', 'tag', 'organization', 'review']);
  const type = record.type;
  const title = readString(record.title, 160);
  const rationale = readString(record.rationale, 600);
  const confidence = readConfidence(record.confidence);
  const evidence = readEvidence(record.evidence);
  if (typeof type !== 'string' || !allowedTypes.has(type as AiAnalysisSuggestion['type']) || !title || !rationale || confidence === null || !evidence) return null;
  return { type: type as AiAnalysisSuggestion['type'], title, rationale, confidence, evidence };
}

function extractJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Missing JSON object.');
  return JSON.parse(trimmed.slice(start, end + 1));
}

export function parseAiAnalysisResponse(content: string, errorMessage: string): Result<AiAnalysisResult> {
  try {
    const record = asRecord(extractJson(content));
    if (!record || record.schemaVersion !== 1) return { success: false, error: errorMessage };
    const summary = readString(record.summary, 2_000);
    const topics = Array.isArray(record.topics) ? record.topics.map(readTopic) : null;
    const suggestions = Array.isArray(record.suggestions) ? record.suggestions.map(readSuggestion) : null;
    const warnings = Array.isArray(record.warnings) ? record.warnings.map((item) => readString(item, 400)) : null;
    if (!summary || !topics || !suggestions || !warnings || topics.some((item) => !item) || suggestions.some((item) => !item) || warnings.some((item) => !item)) {
      return { success: false, error: errorMessage };
    }
    return {
      success: true,
      data: {
        schemaVersion: 1,
        summary,
        topics: topics.slice(0, 12) as AiAnalysisTopic[],
        suggestions: suggestions.slice(0, 12) as AiAnalysisSuggestion[],
        warnings: warnings.slice(0, 12) as string[]
      }
    };
  } catch {
    return { success: false, error: errorMessage };
  }
}
