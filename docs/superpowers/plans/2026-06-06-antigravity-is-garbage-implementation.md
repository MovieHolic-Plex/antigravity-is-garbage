# antigravity-is-garbage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a tested MVP for image-only mockup generation with friend invite sessions, outbound local bridge pairing, strict output guardrails, and Markdown exports.

**Architecture:** A Node.js Express server hosts the structured browser UI and relays WebSocket messages between the browser and local bridge. The bridge runs locally, generates only Markdown and image files, and validates every write through a shared allowlist policy.

**Tech Stack:** Node.js ESM, Express, ws, pngjs, Vitest, vanilla browser UI.

---

## Files

- Create `package.json` for scripts and dependencies.
- Create `src/shared/output-policy.js` for path and extension validation.
- Create `src/server/session-store.js` for invite sessions and pairing codes.
- Create `src/server/server.js` for HTTP and WebSocket relay.
- Create `src/bridge/guarded-writer.js` for output-only writes.
- Create `src/bridge/mockup-generator.js` for planning MD, final MD, and PNG variant generation.
- Create `src/bridge/cli.js` for outbound bridge connection.
- Create `public/index.html`, `public/styles.css`, and `public/app.js` for the structured view.
- Create `test/*.test.js` for TDD coverage.
- Create `README.md` with usage and guardrail documentation.

## Tasks

- [ ] Write failing tests for output policy.
- [ ] Implement output policy.
- [ ] Write failing tests for guarded writer and generator.
- [ ] Implement guarded writer and generator.
- [ ] Write failing tests for session pairing and relay.
- [ ] Implement server session store and WebSocket relay.
- [ ] Implement browser UI and bridge CLI.
- [ ] Run full test/build/manual verification.
- [ ] Initialize git, commit, create public GitHub repo, and push.

## Self-Review

- Spec coverage: all explicit constraints are represented in the tasks.
- Placeholder scan: no placeholders or deferred requirements.
- Type consistency: all modules use ESM named exports and plain JSON messages.
