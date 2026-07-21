import { spawnSync } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const securityCheckScript = path.resolve(process.cwd(), 'scripts/vite-server-security-check.mjs');

describe('Vite development server security', () => {
  it('restricts Host headers and CORS origins', () => {
    const result = spawnSync(process.execPath, [securityCheckScript], { encoding: 'utf8' });

    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
