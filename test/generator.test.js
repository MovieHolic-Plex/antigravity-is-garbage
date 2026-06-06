import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GuardedWriter } from '../src/bridge/guarded-writer.js';
import { createMockupSet } from '../src/bridge/mockup-generator.js';

describe('createMockupSet', () => {
  let projectRoot;

  beforeEach(async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), 'aigg-'));
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('creates planning Markdown, image variants, and a final report only', async () => {
    const writer = new GuardedWriter(projectRoot);

    const result = await createMockupSet({
      writer,
      prompt: 'A polished dashboard for a small coffee subscription business',
      agyMarkdown: '## Visual Direction\nAgy says to use editorial cards and focused image hierarchy.',
      variants: 3
    });

    expect(result.files.map((file) => file.relativePath).sort()).toEqual([
      'outputs/final-report.md',
      'outputs/planning-brief.md',
      'outputs/variant-1.png',
      'outputs/variant-2.png',
      'outputs/variant-3.png'
    ]);

    const outputFiles = await readdir(path.join(projectRoot, 'outputs'));
    expect(outputFiles.sort()).toEqual([
      'final-report.md',
      'planning-brief.md',
      'variant-1.png',
      'variant-2.png',
      'variant-3.png'
    ]);

    const planning = await readFile(path.join(projectRoot, 'outputs/planning-brief.md'), 'utf8');
    expect(planning).toContain('A polished dashboard');
    expect(planning).toContain('Agy says to use editorial cards');
    expect(planning).toContain('## Image Prompt');
  });

  it('refuses direct writes to code files', async () => {
    const writer = new GuardedWriter(projectRoot);

    await expect(writer.writeText('outputs/index.html', '<html></html>')).rejects.toThrow(
      'extension_not_allowed'
    );
  });
});
