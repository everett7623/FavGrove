import { spawnSync } from 'node:child_process';
import { findUnexpectedDevelopmentVulnerabilities } from './dependency-audit-policy.mjs';

const npmCliPath = process.env.npm_execpath;
if (!npmCliPath) throw new Error('Run dependency auditing through npm run audit:dependencies.');
const registryArgument = '--registry=https://registry.npmjs.org';

function runAudit(arguments_) {
  const result = spawnSync(process.execPath, [npmCliPath, 'audit', '--json', registryArgument, ...arguments_], {
    encoding: 'utf8'
  });
  if (result.error) throw result.error;

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(`Unable to parse npm audit output: ${result.stderr || result.stdout || 'no output'}`);
  }
  if (report.error) throw new Error(`npm audit failed: ${report.error.summary || report.error.detail || JSON.stringify(report.error)}`);

  return { report, status: result.status };
}

try {
  const production = runAudit(['--omit=dev']);
  const productionVulnerabilities = Object.keys(production.report.vulnerabilities ?? {});
  if (production.status !== 0 || productionVulnerabilities.length > 0) {
    throw new Error(`Production dependency vulnerabilities: ${productionVulnerabilities.join(', ') || 'audit command failed'}.`);
  }

  const development = runAudit([]);
  const unexpected = findUnexpectedDevelopmentVulnerabilities(development.report);
  if (unexpected.length > 0) throw new Error(`Unexpected development dependency vulnerabilities:\n${unexpected.join('\n')}`);

  const productionCount = production.report.metadata?.dependencies?.prod ?? 'unknown';
  const knownDevelopmentPackages = Object.keys(development.report.vulnerabilities ?? {});
  console.log(`Production dependency audit passed for ${productionCount} packages with zero vulnerabilities.`);
  if (knownDevelopmentPackages.length > 0) {
    console.log(`Allowed documented development advisories: ${knownDevelopmentPackages.join(', ')}.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
