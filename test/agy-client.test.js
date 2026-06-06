import { access, chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildAgyPrompt, runAgyPlanning } from '../src/bridge/agy-client.js';

describe('agy client', () => {
  let directory;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'agy-client-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('builds a prompt that forbids code file generation', () => {
    const prompt = buildAgyPrompt({
      userPrompt: 'A sharp dashboard',
      variants: 3,
      screenCount: 1
    });

    expect(prompt).not.toContain('shell commands');
    expect(prompt).not.toContain('app scaffolds');
    expect(prompt).toContain('Return Markdown only');
    expect(prompt).toContain('A sharp dashboard');
  });

  it('runs agy in print mode and returns Markdown planning output', async () => {
    const fakeAgy = path.join(directory, 'agy');
    await writeFile(
      fakeAgy,
      '#!/usr/bin/env bash\nprintf "%b" "## Visual Direction\\nUse a focused command-center layout."\n'
    );
    await chmod(fakeAgy, 0o755);

    const result = await runAgyPlanning({
      commandPath: fakeAgy,
      userPrompt: 'command center',
      variants: 2,
      screenCount: 1,
      timeoutMs: 1000
    });

    expect(result).toEqual({
      ok: true,
      commandPath: fakeAgy,
      markdown: '## Visual Direction\nUse a focused command-center layout.'
    });
  });

  it('does not let agy create cache files in the project working directory', async () => {
    const fakeAgy = path.join(directory, 'agy');
    await writeFile(
      fakeAgy,
      '#!/usr/bin/env bash\nmkdir -p cache\nprintf "%s" "{}" > cache/projects.json\nprintf "%s" "## Visual Direction\\nIsolated output."\n'
    );
    await chmod(fakeAgy, 0o755);

    const projectCachePath = path.join(process.cwd(), 'cache', 'projects.json');
    await rm(path.join(process.cwd(), 'cache'), { recursive: true, force: true });

    const result = await runAgyPlanning({
      commandPath: fakeAgy,
      userPrompt: 'isolated cache',
      variants: 1,
      screenCount: 1,
      timeoutMs: 1000
    });

    const cacheExists = await access(projectCachePath).then(() => true, () => false);
    expect(result.ok).toBe(true);
    expect(cacheExists).toBe(false);
  });

  it('reports a timeout instead of hanging generation', async () => {
    const fakeAgy = path.join(directory, 'agy');
    await writeFile(fakeAgy, '#!/usr/bin/env bash\nsleep 5\n');
    await chmod(fakeAgy, 0o755);

    const result = await runAgyPlanning({
      commandPath: fakeAgy,
      userPrompt: 'slow plan',
      variants: 1,
      screenCount: 1,
      timeoutMs: 100
    });

    expect(result).toMatchObject({
      ok: false,
      commandPath: fakeAgy,
      reason: 'timeout'
    });
  });
});
