# antigravity-is-garbage Design

## Goal

Build a friend-invite MVP for image-only vibe mockups. A friend opens a hosted structured view, pairs a local bridge, enters a prompt, receives image variants, and can export both a planning Markdown file and a final report Markdown file.

## Hard Constraints

- The product is for image mockups, not code mockups.
- The local bridge must never create code files.
- Allowed output extensions are `.md`, `.png`, `.jpg`, `.jpeg`, and `.webp`.
- Blocked output extensions include `.html`, `.css`, `.js`, `.ts`, `.tsx`, `.jsx`, `.json`, package files, and arbitrary scaffolded app files.
- The default creation unit is one screen with multiple visual variants.
- Multi-screen sets are allowed only when the user explicitly asks for them.
- Public MVP distribution starts as a friend-only invite link plus local bridge.
- The local bridge connects outbound to the hosted session using a pairing code.

## Product Flow

1. The host creates an invite session.
2. The friend opens the invite link.
3. The friend runs the local bridge with the pairing code.
4. The browser submits a prompt for a visual mockup.
5. The bridge creates a planning Markdown document before image generation.
6. The bridge creates two or three image variants.
7. The structured view shows status, variants, Markdown export links, and blocked actions.
8. The friend selects a direction or asks for another pass.
9. The bridge creates a final report Markdown document.

## Architecture

- `src/server`: Express HTTP server and WebSocket relay for browser and bridge clients.
- `src/bridge`: local outbound bridge, guarded writer, Antigravity availability probe, and restricted image/Markdown generator.
- `src/shared`: output policy and message schema helpers shared by server, bridge, and tests.
- `public`: browser structured view for invite sessions.
- `test`: Vitest coverage for guardrails, generator output, and session relay behavior.

## MVP Generation

The first implementation uses a deterministic local image/Markdown generator behind the same bridge boundary. This keeps the guardrails testable even when Antigravity is a GUI-only binary in the current environment. The bridge reports Antigravity availability, but it does not give Antigravity broad filesystem access.

## Release

The repository will be initialized as `antigravity-is-garbage`, tested locally, and pushed to a public GitHub repository.
