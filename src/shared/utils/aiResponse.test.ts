import { describe, expect, it } from 'vitest';
import { parseAiAnalysisResponse } from './aiResponse';

const valid = {
  schemaVersion: 1,
  summary: 'A focused documentation library.',
  topics: [{ label: 'Documentation', count: 2, confidence: 0.9, evidence: ['example.com'] }],
  suggestions: [{ type: 'folder', title: 'Create Docs', rationale: 'Group documentation links.', confidence: 0.8, evidence: ['bookmark-1'] }],
  warnings: []
};

describe('AI response validation', () => {
  it('accepts a bounded structured JSON result', () => {
    const result = parseAiAnalysisResponse(`\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``, 'invalid');
    expect(result).toEqual({ success: true, data: valid });
  });

  it('rejects invalid schema and confidence values while leaving evidence checks to the provider boundary', () => {
    expect(parseAiAnalysisResponse(JSON.stringify({ ...valid, schemaVersion: 2 }), 'invalid')).toEqual({ success: false, error: 'invalid' });
    expect(
      parseAiAnalysisResponse(JSON.stringify({ ...valid, topics: [{ ...valid.topics[0], confidence: 4 }] }), 'invalid')
    ).toEqual({ success: false, error: 'invalid' });
    expect(parseAiAnalysisResponse(JSON.stringify({ ...valid, suggestions: [{ ...valid.suggestions[0], evidence: [] }] }), 'invalid')).toMatchObject({ success: true });
  });
});
