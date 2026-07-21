import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const archiveScript = path.resolve(process.cwd(), 'scripts/create-release-archive.ps1');
const archiveVerificationScript = path.resolve(process.cwd(), 'scripts/verify-release-archive.ps1');

function createFixture(directory, reverseOrder) {
  mkdirSync(path.join(directory, 'nested'), { recursive: true });
  const files = reverseOrder
    ? [['nested/a.txt', 'alpha'], ['b.txt', 'bravo']]
    : [['b.txt', 'bravo'], ['nested/a.txt', 'alpha']];

  for (const [relativePath, contents] of files) {
    const filePath = path.join(directory, relativePath);
    writeFileSync(filePath, contents, 'utf8');
    const timestamp = reverseOrder ? new Date('2024-01-02T03:04:05Z') : new Date('2026-07-22T08:09:10Z');
    utimesSync(filePath, timestamp, timestamp);
  }
}

function createArchive(sourceDirectory, destinationPath) {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      archiveScript,
      '-SourceDirectory',
      sourceDirectory,
      '-DestinationPath',
      destinationPath
    ],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Unable to create test archive.');
}

function verifyArchive(sourceDirectory, archivePath) {
  return spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      archiveVerificationScript,
      '-SourceDirectory',
      sourceDirectory,
      '-ArchivePath',
      archivePath
    ],
    { encoding: 'utf8' }
  );
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

describe.skipIf(process.platform !== 'win32')('deterministic release archive', () => {
  it('ignores source creation order and file timestamps', () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'favgrove-archive-test-'));
    try {
      const firstSource = path.join(tempRoot, 'first');
      const secondSource = path.join(tempRoot, 'second');
      const firstArchive = path.join(tempRoot, 'first.zip');
      const secondArchive = path.join(tempRoot, 'second.zip');
      createFixture(firstSource, false);
      createFixture(secondSource, true);

      createArchive(firstSource, firstArchive);
      createArchive(secondSource, secondArchive);

      expect(sha256(firstArchive)).toBe(sha256(secondArchive));
      expect(verifyArchive(firstSource, firstArchive).status).toBe(0);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects an archive that no longer matches its source directory', () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'favgrove-archive-test-'));
    try {
      const source = path.join(tempRoot, 'source');
      const archive = path.join(tempRoot, 'release.zip');
      createFixture(source, false);
      createArchive(source, archive);
      writeFileSync(path.join(source, 'b.txt'), 'changed', 'utf8');

      const result = verifyArchive(source, archive);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toContain('does not match dist/');
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
