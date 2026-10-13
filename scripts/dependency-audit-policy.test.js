import { describe, expect, it } from 'vitest';
import { allowedDevelopmentVulnerabilities, findUnexpectedDevelopmentVulnerabilities } from './dependency-audit-policy.mjs';

// The shipped allowlist carries only the documented Tailwind 3 toolchain exceptions.
const shippedTailwindReport = {
  vulnerabilities: {
    braces: { severity: 'high', via: [{ source: 1240992 }] },
    chokidar: { severity: 'high', via: ['braces'] },
    'fast-glob': { severity: 'high', via: ['micromatch'] },
    micromatch: { severity: 'high', via: ['braces'] },
    'postcss-nested': { severity: 'moderate', via: ['postcss-selector-parser'] },
    'postcss-selector-parser': { severity: 'moderate', via: [{ source: 1241232 }] },
    tailwindcss: {
      severity: 'high',
      via: ['chokidar', 'fast-glob', 'micromatch', 'postcss-nested', 'postcss-selector-parser']
    }
  }
};

// Exemption behavior beyond the shipped entries is exercised through an injected sample.
const sampleAllowlist = Object.freeze({
  'sample-package': Object.freeze({
    sources: Object.freeze([1102341]),
    dependencies: Object.freeze(['sample-dependency']),
    maxSeverity: 'moderate'
  })
});

describe('dependency audit policy', () => {
  it('limits the shipped allowlist to the documented Tailwind 3 toolchain packages', () => {
    expect(Object.keys(allowedDevelopmentVulnerabilities).sort()).toEqual([
      'braces',
      'chokidar',
      'fast-glob',
      'micromatch',
      'postcss-nested',
      'postcss-selector-parser',
      'tailwindcss'
    ]);
  });

  it('accepts the documented Tailwind 3 toolchain findings in the shipped allowlist', () => {
    expect(findUnexpectedDevelopmentVulnerabilities(shippedTailwindReport)).toEqual([]);
  });

  it('accepts a clean development report', () => {
    expect(findUnexpectedDevelopmentVulnerabilities({ vulnerabilities: {} })).toEqual([]);
  });

  it('reports a missing vulnerability map', () => {
    expect(findUnexpectedDevelopmentVulnerabilities({})).toEqual(['npm audit returned no vulnerability map.']);
  });

  it('rejects any advisory on a package outside the shipped allowlist', () => {
    expect(findUnexpectedDevelopmentVulnerabilities({
      vulnerabilities: { vite: { severity: 'high', via: [{ source: 1116229 }] } }
    })).toContain('vite: package is not in the development advisory allowlist.');
  });

  it('accepts an advisory that matches an allowlist entry', () => {
    expect(findUnexpectedDevelopmentVulnerabilities({
      vulnerabilities: { 'sample-package': { severity: 'moderate', via: [{ source: 1102341 }, 'sample-dependency'] } }
    }, sampleAllowlist)).toEqual([]);
  });

  it('rejects a vulnerability in a package outside the allowlist', () => {
    expect(findUnexpectedDevelopmentVulnerabilities({
      vulnerabilities: { other: { severity: 'low', via: [{ source: 123 }] } }
    }, sampleAllowlist)).toContain('other: package is not in the development advisory allowlist.');
  });

  it('rejects a new advisory attached to an allowed package', () => {
    expect(findUnexpectedDevelopmentVulnerabilities({
      vulnerabilities: { 'sample-package': { severity: 'moderate', via: [{ source: 1102341 }, { source: 9999999 }] } }
    }, sampleAllowlist)).toContain('sample-package: unexpected advisory source 9999999.');
  });

  it('rejects an allowed advisory whose severity escalates', () => {
    expect(findUnexpectedDevelopmentVulnerabilities({
      vulnerabilities: { 'sample-package': { severity: 'critical', via: [{ source: 1102341 }] } }
    }, sampleAllowlist)).toContain('sample-package: severity critical exceeds moderate.');
  });

  it('rejects an unexpected dependency advisory on an allowed package', () => {
    expect(findUnexpectedDevelopmentVulnerabilities({
      vulnerabilities: { 'sample-package': { severity: 'moderate', via: ['other-dependency'] } }
    }, sampleAllowlist)).toContain('sample-package: unexpected dependency advisory other-dependency.');
  });
});
