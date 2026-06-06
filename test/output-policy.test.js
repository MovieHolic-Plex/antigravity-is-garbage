import { describe, expect, it } from 'vitest';
import { validateOutputPath } from '../src/shared/output-policy.js';

describe('validateOutputPath', () => {
  it('allows Markdown and image files inside the outputs directory', () => {
    expect(validateOutputPath('/workspace/project', 'outputs/plan.md')).toEqual({
      ok: true,
      absolutePath: '/workspace/project/outputs/plan.md',
      extension: '.md'
    });

    expect(validateOutputPath('/workspace/project', 'outputs/variant-a.png')).toEqual({
      ok: true,
      absolutePath: '/workspace/project/outputs/variant-a.png',
      extension: '.png'
    });
  });

  it('blocks code and package files even when they are inside outputs', () => {
    expect(validateOutputPath('/workspace/project', 'outputs/index.html')).toMatchObject({
      ok: false,
      reason: 'extension_not_allowed'
    });

    expect(validateOutputPath('/workspace/project', 'outputs/package.json')).toMatchObject({
      ok: false,
      reason: 'extension_not_allowed'
    });
  });

  it('blocks path traversal outside the outputs directory', () => {
    expect(validateOutputPath('/workspace/project', '../escape.md')).toMatchObject({
      ok: false,
      reason: 'outside_outputs'
    });

    expect(validateOutputPath('/workspace/project', 'outputs/../README.md')).toMatchObject({
      ok: false,
      reason: 'outside_outputs'
    });
  });
});
