const severityRank = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

// Entries look like { sources: [advisoryId], dependencies: ['package'], maxSeverity: 'moderate' }.
// The Tailwind CSS 3 toolchain entries are the only exceptions in force. braces, micromatch,
// fast-glob, and chokidar have no fixed releases in their current lines, and the
// postcss-selector-parser fix (7.1.6) is outside the ^6 range of its parents, so no
// non-breaking resolution exists; the eventual fix is the approved Tailwind 4 migration.
// All findings are dev-only build-time pattern-parsing denial-of-service issues. See
// docs/security/dependency-audit.md for the disposition history.
export const allowedDevelopmentVulnerabilities = Object.freeze({
  braces: Object.freeze({
    sources: Object.freeze([1240992]),
    dependencies: Object.freeze([]),
    maxSeverity: 'high'
  }),
  chokidar: Object.freeze({
    sources: Object.freeze([]),
    dependencies: Object.freeze(['braces']),
    maxSeverity: 'high'
  }),
  'fast-glob': Object.freeze({
    sources: Object.freeze([]),
    dependencies: Object.freeze(['micromatch']),
    maxSeverity: 'high'
  }),
  micromatch: Object.freeze({
    sources: Object.freeze([]),
    dependencies: Object.freeze(['braces']),
    maxSeverity: 'high'
  }),
  'postcss-nested': Object.freeze({
    sources: Object.freeze([]),
    dependencies: Object.freeze(['postcss-selector-parser']),
    maxSeverity: 'moderate'
  }),
  'postcss-selector-parser': Object.freeze({
    sources: Object.freeze([1241232]),
    dependencies: Object.freeze([]),
    maxSeverity: 'moderate'
  }),
  tailwindcss: Object.freeze({
    sources: Object.freeze([]),
    dependencies: Object.freeze(['chokidar', 'fast-glob', 'micromatch', 'postcss-nested', 'postcss-selector-parser']),
    maxSeverity: 'high'
  })
});

export function findUnexpectedDevelopmentVulnerabilities(report, allowlist = allowedDevelopmentVulnerabilities) {
  const vulnerabilities = report?.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== 'object') {
    return ['npm audit returned no vulnerability map.'];
  }

  const unexpected = [];
  for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
    const allowed = allowlist[packageName];
    if (!allowed) {
      unexpected.push(`${packageName}: package is not in the development advisory allowlist.`);
      continue;
    }

    const actualRank = severityRank[vulnerability.severity] ?? Number.POSITIVE_INFINITY;
    if (actualRank > severityRank[allowed.maxSeverity]) {
      unexpected.push(`${packageName}: severity ${vulnerability.severity} exceeds ${allowed.maxSeverity}.`);
    }

    for (const item of vulnerability.via ?? []) {
      if (typeof item === 'string') {
        if (!allowed.dependencies.includes(item)) unexpected.push(`${packageName}: unexpected dependency advisory ${item}.`);
      } else if (!allowed.sources.includes(item.source)) {
        unexpected.push(`${packageName}: unexpected advisory source ${JSON.stringify(item.source)}.`);
      }
    }
  }

  return unexpected;
}
