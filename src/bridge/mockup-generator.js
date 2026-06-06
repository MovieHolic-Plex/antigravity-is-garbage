import { PNG } from 'pngjs';

const PALETTES = [
  { background: [248, 249, 250], panel: [30, 64, 175], accent: [245, 158, 11] },
  { background: [245, 247, 250], panel: [5, 150, 105], accent: [220, 38, 38] },
  { background: [250, 250, 250], panel: [17, 24, 39], accent: [14, 165, 233] }
];

export async function createMockupSet({ writer, prompt, agyMarkdown, variants = 3, screenCount = 1 }) {
  const normalizedVariants = Math.max(1, Math.min(3, Number(variants) || 3));
  const normalizedScreenCount = Math.max(1, Math.min(6, Number(screenCount) || 1));
  const files = [];

  await writer.clearOutputs();

  files.push(
    await writer.writeText(
      'outputs/planning-brief.md',
      createPlanningBrief({
        prompt,
        agyMarkdown,
        variants: normalizedVariants,
        screenCount: normalizedScreenCount
      })
    )
  );

  for (let index = 1; index <= normalizedVariants; index += 1) {
    files.push(
      await writer.writeBuffer(
        `outputs/variant-${index}.png`,
        createMockupPng({ prompt, variant: index, screenCount: normalizedScreenCount })
      )
    );
  }

  files.push(
    await writer.writeText(
      'outputs/final-report.md',
      createFinalReport({
        prompt,
        agyMarkdown,
        variants: normalizedVariants,
        screenCount: normalizedScreenCount
      })
    )
  );

  return {
    files,
    blockedActions: writer.blockedActions
  };
}

export function createPlanningBrief({ prompt, agyMarkdown, variants, screenCount }) {
  return `# Planning Brief

## User Prompt

${prompt}

## Mockup Scope

- Screens: ${screenCount}
- Variants per primary screen: ${variants}
- Output type: image mockup only
- Code generation: forbidden

## Image Prompt

Create polished product mockup imagery for: ${prompt}

The output should communicate layout, visual hierarchy, color direction, and user intent without producing HTML, CSS, JavaScript, or app scaffold files.

## Agy Planning Output

${agyMarkdown || 'No agy planning output was provided.'}
`;
}

export function createFinalReport({ prompt, agyMarkdown, variants, screenCount }) {
  return `# Final Mockup Report

## Summary

Generated ${variants} image variant${variants === 1 ? '' : 's'} for ${screenCount} screen${screenCount === 1 ? '' : 's'}.

## Source Prompt

${prompt}

## Deliverables

- Planning brief: \`outputs/planning-brief.md\`
${Array.from({ length: variants }, (_, index) => `- Variant ${index + 1}: \`outputs/variant-${index + 1}.png\``).join('\n')}
- Final report: \`outputs/final-report.md\`

## Guardrail

This project is intentionally limited to Markdown and image outputs. Code files are not generated.

## Agy Planning Source

${agyMarkdown || 'No agy planning output was provided.'}
`;
}

function createMockupPng({ prompt, variant, screenCount }) {
  const width = 960;
  const height = 640;
  const png = new PNG({ width, height });
  const palette = PALETTES[(variant - 1) % PALETTES.length];

  fillRect(png, 0, 0, width, height, palette.background);
  fillRect(png, 48, 44, width - 96, height - 88, [255, 255, 255]);
  strokeRect(png, 48, 44, width - 96, height - 88, [214, 219, 226]);

  fillRect(png, 48, 44, width - 96, 72, palette.panel);
  fillRect(png, 82, 72, 220, 16, [255, 255, 255]);
  fillRect(png, 696, 68, 164, 24, palette.accent);

  const cards = screenCount > 1 ? Math.min(4, screenCount) : 3;
  for (let i = 0; i < cards; i += 1) {
    const x = 82 + i * 206;
    fillRect(png, x, 154, 164, 132, [246, 248, 251]);
    strokeRect(png, x, 154, 164, 132, [218, 224, 232]);
    fillRect(png, x + 20, 180, 82, 12, palette.panel);
    fillRect(png, x + 20, 212, 120, 10, [159, 169, 183]);
    fillRect(png, x + 20, 236, 96, 10, [188, 196, 207]);
  }

  fillRect(png, 82, 330, 500, 196, [246, 248, 251]);
  strokeRect(png, 82, 330, 500, 196, [218, 224, 232]);
  for (let i = 0; i < 5; i += 1) {
    fillRect(png, 116, 370 + i * 28, 390 - i * 34, 12, i === 0 ? palette.accent : [174, 183, 196]);
  }

  fillRect(png, 628, 330, 232, 196, [246, 248, 251]);
  strokeRect(png, 628, 330, 232, 196, [218, 224, 232]);
  fillRect(png, 672, 366, 144, 112, palette.panel);
  fillRect(png, 704, 396, 80, 52, palette.accent);

  drawHashBars(png, prompt, palette);

  return PNG.sync.write(png);
}

function drawHashBars(png, prompt, palette) {
  let hash = 0;
  for (const char of prompt) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  for (let i = 0; i < 8; i += 1) {
    const width = 70 + ((hash >> (i * 3)) % 120);
    fillRect(png, 116, 552 + i * 8, width, 4, i % 2 === 0 ? palette.panel : palette.accent);
  }
}

function fillRect(png, x, y, width, height, color) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      setPixel(png, col, row, color);
    }
  }
}

function strokeRect(png, x, y, width, height, color) {
  fillRect(png, x, y, width, 1, color);
  fillRect(png, x, y + height - 1, width, 1, color);
  fillRect(png, x, y, 1, height, color);
  fillRect(png, x + width - 1, y, 1, height, color);
}

function setPixel(png, x, y, [red, green, blue]) {
  const index = (png.width * y + x) << 2;
  png.data[index] = red;
  png.data[index + 1] = green;
  png.data[index + 2] = blue;
  png.data[index + 3] = 255;
}
