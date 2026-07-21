export function assertReleaseVersionConsistency(versions) {
  const invalidVersion = Object.entries(versions).find(
    ([, version]) => typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)
  );
  if (invalidVersion) {
    throw new Error(`${invalidVersion[0]} must declare a semantic x.y.z version, received: ${JSON.stringify(invalidVersion[1])}.`);
  }

  if (new Set(Object.values(versions)).size !== 1) {
    throw new Error(`Release version mismatch: ${Object.entries(versions).map(([file, version]) => `${file}=${version}`).join(', ')}.`);
  }

  return Object.values(versions)[0];
}
