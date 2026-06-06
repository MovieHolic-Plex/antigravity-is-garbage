import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('structured view markup', () => {
  it('exposes the primary workflow as accessible, scannable regions', async () => {
    const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('data-role="workflow-stepper"');
    expect(html).toContain('data-role="session-panel"');
    expect(html).toContain('data-role="prompt-composer"');
    expect(html).toContain('data-role="mockup-results"');
    expect(html).toContain('data-role="export-panel"');
    expect(html).toContain('id="copyInviteButton"');
    expect(html).toContain('id="copyBridgeButton"');
  });

  it('starts with a useful empty state for image variants and markdown exports', async () => {
    const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

    expect(html).toContain('id="emptyVariants"');
    expect(html).toContain('id="emptyMarkdown"');
    expect(html).toContain('No image variants yet');
    expect(html).toContain('Markdown exports will appear after generation');
  });
});
