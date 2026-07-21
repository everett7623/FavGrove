import { describe, expect, it } from 'vitest';
import { assertReleaseVersionConsistency } from './release-version.mjs';

describe('release version consistency', () => {
  it('accepts matching semantic versions', () => {
    expect(assertReleaseVersionConsistency({ package: '0.2.0', manifest: '0.2.0', build: '0.2.0' })).toBe('0.2.0');
  });

  it('rejects a non-semantic version', () => {
    expect(() => assertReleaseVersionConsistency({ package: 'v0.2.0', manifest: 'v0.2.0' })).toThrow(
      'package must declare a semantic x.y.z version'
    );
  });

  it('rejects mismatched release sources', () => {
    expect(() => assertReleaseVersionConsistency({ package: '0.2.0', manifest: '0.2.1' })).toThrow(
      'Release version mismatch: package=0.2.0, manifest=0.2.1.'
    );
  });
});
