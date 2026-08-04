import { execFile } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const securityCheckScript = path.resolve(process.cwd(), 'scripts/vite-server-security-check.mjs');

describe('Vite development server security', () => {
  it('restricts Host headers and CORS origins', async () => {
    const result = await new Promise((resolve) => {
      execFile(
        process.execPath,
        [securityCheckScript],
        { encoding: 'utf8', timeout: 30_000, windowsHide: true },
        (error, stdout, stderr) => resolve({ error, stderr, stdout })
      );
    });

    expect(result.error, result.error?.message || result.stderr || result.stdout).toBeNull();
  }, 35_000);
});
