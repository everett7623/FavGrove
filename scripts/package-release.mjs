import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { extensionDistDir, releaseArchivePaths } from './extension-paths.mjs';
import { assertReleaseVersionConsistency } from './release-version.mjs';

const root = process.cwd();
const distDir = extensionDistDir(root);
const manifestPath = resolve(distDir, 'manifest.json');
const sourceManifestPath = resolve(root, 'manifest.json');
const packagePath = resolve(root, 'package.json');
const packageLockPath = resolve(root, 'package-lock.json');
const sourceLicensePath = resolve(root, 'LICENSE');
const builtLicensePath = resolve(distDir, 'LICENSE');

if (!existsSync(manifestPath)) {
  console.error('Missing dist/chrome-mv3/manifest.json. Run npm run build first.');
  process.exit(1);
}

if (!existsSync(sourceLicensePath) || !existsSync(builtLicensePath)) {
  console.error('Production build must include the repository LICENSE file.');
  process.exit(1);
}

if (!readFileSync(sourceLicensePath).equals(readFileSync(builtLicensePath))) {
  console.error('Production build LICENSE does not match the repository LICENSE.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.manifest_version !== 3 || typeof manifest.version !== 'string') {
  console.error('The built manifest is invalid or is not Manifest V3.');
  process.exit(1);
}

const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const packageLock = JSON.parse(readFileSync(packageLockPath, 'utf8'));
const versions = {
  'package.json': packageJson.version,
  'package-lock.json': packageLock.version,
  'package-lock.json packages[""]': packageLock.packages?.['']?.version,
  'manifest.json': sourceManifest.version,
  'dist/chrome-mv3/manifest.json': manifest.version
};
try {
  assertReleaseVersionConsistency(versions);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const expectedPermissions = ['alarms', 'bookmarks', 'storage'];
const permissions = manifest.permissions ?? [];
if (
  permissions.length !== expectedPermissions.length ||
  expectedPermissions.some((permission) => !permissions.includes(permission))
) {
  console.error(`The built manifest permissions must be exactly: ${expectedPermissions.join(', ')}.`);
  process.exit(1);
}

const optionalHostPermissions = manifest.optional_host_permissions ?? [];
if (optionalHostPermissions.length !== 1 || optionalHostPermissions[0] !== '<all_urls>') {
  console.error('The built manifest optional host permissions must be limited to <all_urls>.');
  process.exit(1);
}

const requiredIconSizes = [16, 48, 128];
for (const iconSet of [manifest.icons, manifest.action?.default_icon]) {
  if (!iconSet || requiredIconSizes.some((size) => !existsSync(resolve(distDir, iconSet[String(size)] ?? '')))) {
    console.error('The built manifest references missing extension icons.');
    process.exit(1);
  }
}

const serviceWorkerPath = resolve(distDir, manifest.background?.service_worker ?? '');
if (!manifest.background?.service_worker || !existsSync(serviceWorkerPath)) {
  console.error('The built manifest references a missing background service worker.');
  process.exit(1);
}

const manifestSource = JSON.stringify(manifest);
const serviceWorkerSource = readFileSync(serviceWorkerPath, 'utf8');
const developmentMarkers = ['localhost:', '127.0.0.1:', '/@vite/', '@crx/client'];
if (developmentMarkers.some((marker) => manifestSource.includes(marker) || serviceWorkerSource.includes(marker))) {
  console.error('Refusing to package a development build. Run npm run build and try again.');
  process.exit(1);
}

const exposedResources = manifest.web_accessible_resources?.flatMap((entry) => entry.resources ?? []) ?? [];
if (exposedResources.includes('*') || exposedResources.includes('**/*')) {
  console.error('Refusing to package a manifest that exposes every extension resource.');
  process.exit(1);
}

const { archivePath, checksumPath, archiveName } = releaseArchivePaths(manifest.version, root);
rmSync(archivePath, { force: true });
rmSync(checksumPath, { force: true });

const command = [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  resolve(root, 'scripts/create-release-archive.ps1'),
  '-SourceDirectory',
  distDir,
  '-DestinationPath',
  archivePath
];
const packaged = spawnSync('powershell.exe', command, { stdio: 'inherit' });

if (packaged.status !== 0 || !existsSync(archivePath)) {
  console.error('Unable to create the release archive.');
  process.exit(packaged.status ?? 1);
}

const verification = spawnSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    resolve(root, 'scripts/verify-release-archive.ps1'),
    '-SourceDirectory',
    distDir,
    '-ArchivePath',
    archivePath
  ],
  { stdio: 'inherit' }
);
if (verification.status !== 0) {
  rmSync(archivePath, { force: true });
  console.error('Release archive verification failed.');
  process.exit(verification.status ?? 1);
}

const checksum = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
writeFileSync(checksumPath, `${checksum}  ${archiveName}\n`, 'utf8');

console.log(`Created ${archivePath}`);
console.log(`Created ${checksumPath}`);
