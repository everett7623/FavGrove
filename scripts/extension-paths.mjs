import { resolve } from 'node:path';

/** Production unpacked extension directory (load this in Chrome/Edge). */
export const EXTENSION_OUT_DIR = 'dist/chrome-mv3';

/** Parent of the unpacked build; release ZIP/sha256 sit beside chrome-mv3. */
export const DIST_ROOT = 'dist';

export function extensionDistDir(root = process.cwd()) {
  return resolve(root, EXTENSION_OUT_DIR);
}

export function distRootDir(root = process.cwd()) {
  return resolve(root, DIST_ROOT);
}

export function releaseArchivePaths(version, root = process.cwd()) {
  const base = `favgrove-v${version}-chrome`;
  return {
    archivePath: resolve(root, DIST_ROOT, `${base}.zip`),
    checksumPath: resolve(root, DIST_ROOT, `${base}.sha256`),
    archiveName: `${base}.zip`
  };
}
