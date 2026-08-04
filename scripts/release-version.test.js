import { describe, expect, it } from 'vitest';
import { assertReleaseVersionConsistency } from './release-version.mjs';

describe('release version consistency', () => {
  it('accepts matching semantic versions', () => {
    expect(assertReleaseVersionConsistency({ package: '0.2.1', manifest: '0.2.1', build: '0.2.1' })).toBe('0.2.1');
  });

  it('rejects a non-semantic version', () => {
    expect(() => assertReleaseVersionConsistency({ package: 'v0.2.1', manifest: 'v0.2.1' })).toThrow(
      'package must declare a semantic x.y.z version'
    );
  });

  it('rejects mismatched release sources', () => {
    expect(() => assertReleaseVersionConsistency({ package: '0.2.1', manifest: '0.2.2' })).toThrow(
      'Release version mismatch: package=0.2.1, manifest=0.2.2.'
    );
  });
});
