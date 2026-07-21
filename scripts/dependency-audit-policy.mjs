const severityRank = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

export const allowedDevelopmentVulnerabilities = Object.freeze({
  esbuild: Object.freeze({
    sources: Object.freeze([1102341]),
    dependencies: Object.freeze([]),
    maxSeverity: 'moderate'
  }),
  vite: Object.freeze({
    sources: Object.freeze([1116229, 1120784, 1123525]),
    dependencies: Object.freeze(['esbuild']),
    maxSeverity: 'high'
  })
});

export function findUnexpectedDevelopmentVulnerabilities(report) {
  const vulnerabilities = report?.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== 'object') {
    return ['npm audit returned no vulnerability map.'];
  }

  const unexpected = [];
  for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
    const allowed = allowedDevelopmentVulnerabilities[packageName];
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
