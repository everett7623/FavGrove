import { describe, expect, it } from 'vitest';
import { findUnexpectedDevelopmentVulnerabilities } from './dependency-audit-policy.mjs';

const knownReport = {
  vulnerabilities: {
    esbuild: {
      severity: 'moderate',
      via: [{ source: 1102341 }]
    },
    vite: {
      severity: 'high',
      via: [{ source: 1116229 }, { source: 1120784 }, { source: 1123525 }, 'esbuild']
    }
  }
};

describe('dependency audit policy', () => {
  it('accepts only the documented Vite 5 development advisories', () => {
    expect(findUnexpectedDevelopmentVulnerabilities(knownReport)).toEqual([]);
  });

  it('rejects a vulnerability in another package', () => {
    expect(findUnexpectedDevelopmentVulnerabilities({
      vulnerabilities: { ...knownReport.vulnerabilities, other: { severity: 'low', via: [{ source: 123 }] } }
    })).toContain('other: package is not in the development advisory allowlist.');
  });

  it('rejects a new advisory attached to an allowed package', () => {
    expect(findUnexpectedDevelopmentVulnerabilities({
      vulnerabilities: {
        ...knownReport.vulnerabilities,
        vite: { severity: 'high', via: [...knownReport.vulnerabilities.vite.via, { source: 9999999 }] }
      }
    })).toContain('vite: unexpected advisory source 9999999.');
  });

  it('rejects an allowed advisory whose severity escalates', () => {
    expect(findUnexpectedDevelopmentVulnerabilities({
      vulnerabilities: {
        ...knownReport.vulnerabilities,
        esbuild: { severity: 'critical', via: [{ source: 1102341 }] }
      }
    })).toContain('esbuild: severity critical exceeds moderate.');
  });
});
