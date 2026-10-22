import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extensionDistDir } from './extension-paths.mjs';
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
  throw new Error('Missing dist/chrome-mv3/manifest.json. Run npm run build first.');
}

if (!existsSync(sourceLicensePath) || !existsSync(builtLicensePath)) {
  throw new Error('Production build must include the repository LICENSE file.');
}

if (!readFileSync(sourceLicensePath).equals(readFileSync(builtLicensePath))) {
  throw new Error('Production build LICENSE does not match the repository LICENSE.');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.manifest_version !== 3) {
  throw new Error('Built extension must use Manifest V3.');
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
assertReleaseVersionConsistency(versions);

const expectedPermissions = ['alarms', 'bookmarks', 'storage'];
const permissions = manifest.permissions ?? [];
if (
  permissions.length !== expectedPermissions.length ||
  expectedPermissions.some((permission) => !permissions.includes(permission))
) {
  throw new Error(`Built manifest permissions must be exactly: ${expectedPermissions.join(', ')}.`);
}

const optionalHostPermissions = manifest.optional_host_permissions ?? [];
if (optionalHostPermissions.length !== 1 || optionalHostPermissions[0] !== '<all_urls>') {
  throw new Error('Built manifest optional host permissions must be limited to <all_urls>.');
}

const requiredIconSizes = [16, 48, 128];
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function validateIconSet(iconSet, label) {
  if (!iconSet || typeof iconSet !== 'object') {
    throw new Error(`Built manifest is missing ${label}.`);
  }

  for (const size of requiredIconSizes) {
    const relativePath = iconSet[String(size)];
    if (typeof relativePath !== 'string') {
      throw new Error(`${label} is missing the ${size}px icon declaration.`);
    }

    const iconPath = resolve(distDir, relativePath);
    if (!existsSync(iconPath)) {
      throw new Error(`${label} references missing icon: ${relativePath}`);
    }

    const icon = readFileSync(iconPath);
    if (icon.length < 24 || !icon.subarray(0, 8).equals(pngSignature)) {
      throw new Error(`${relativePath} is not a valid PNG file.`);
    }

    const width = icon.readUInt32BE(16);
    const height = icon.readUInt32BE(20);
    if (width !== size || height !== size) {
      throw new Error(`${relativePath} must be ${size}x${size}, received ${width}x${height}.`);
    }
  }
}

validateIconSet(manifest.icons, 'manifest.icons');
validateIconSet(manifest.action?.default_icon, 'manifest.action.default_icon');

const serviceWorker = manifest.background?.service_worker;
if (typeof serviceWorker !== 'string' || !existsSync(resolve(distDir, serviceWorker))) {
  throw new Error('Built extension has no loadable background service worker.');
}

const filesToCheck = [manifestPath, resolve(distDir, serviceWorker)];
const developmentMarkers = ['localhost:', '127.0.0.1:', '/@vite/', '@crx/client'];
for (const file of filesToCheck) {
  const source = readFileSync(file, 'utf8');
  const marker = developmentMarkers.find((candidate) => source.includes(candidate));
  if (marker) throw new Error(`Development marker "${marker}" found in ${file}.`);
}

const exposedResources = manifest.web_accessible_resources?.flatMap((entry) => entry.resources ?? []) ?? [];
if (exposedResources.includes('*') || exposedResources.includes('**/*')) {
  throw new Error('Production manifest must not expose every extension resource.');
}

console.log('Extension build validation passed.');
