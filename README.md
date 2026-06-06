# antigravity-is-garbage

Image-only mockup planning MVP with a friend invite UI and a guarded local bridge.

The point is deliberately narrow: use an agent-style local bridge for visual planning, but do not let it scaffold apps or write code files. It can only produce Markdown and image assets.

## What It Does

- Creates friend invite sessions in a hosted browser UI.
- Pairs a local bridge with the invite session over an outbound WebSocket.
- Accepts a prompt for an image mockup.
- Writes a planning Markdown file before generation.
- Writes PNG image variants.
- Writes a final Markdown report.
- Blocks code-file writes through a shared output policy.

## Guardrails

Allowed outputs:

- `.md`
- `.png`
- `.jpg`
- `.jpeg`
- `.webp`

Blocked outputs include `.html`, `.css`, `.js`, `.ts`, `.tsx`, `.jsx`, `.json`, package files, and anything outside the project `outputs/` directory.

## Run Locally

```bash
npm install
npm start
```

Open `http://localhost:4173`, copy the pairing code, then run the local bridge in another terminal:

```bash
npm run bridge -- --server ws://localhost:4173 --pairing YOUR_PAIRING_CODE
```

Generated files are written under `outputs/`.

## Test

```bash
npm test
```

## Notes on Antigravity

The bridge probes `/usr/local/bin/antigravity` and reports whether it exists. In this environment Antigravity behaves like a GUI app, so the MVP keeps the generator deterministic and local while preserving the output boundary that an Antigravity adapter must obey.
