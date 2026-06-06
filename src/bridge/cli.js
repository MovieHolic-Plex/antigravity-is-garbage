#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { WebSocket } from 'ws';
import { GuardedWriter } from './guarded-writer.js';
import { createMockupSet } from './mockup-generator.js';
import { probeAntigravity } from './antigravity-probe.js';
import { DEFAULT_AGY_PATH, runAgyPlanning } from './agy-client.js';

const options = parseArgs(process.argv.slice(2));
const server = options.server || process.env.AIGG_SERVER || 'ws://localhost:4173';
const pairing = options.pairing || process.env.AIGG_PAIRING;
const projectRoot = path.resolve(options.project || process.env.AIGG_PROJECT || process.cwd());

if (!pairing) {
  console.error('Missing pairing code. Use --pairing CODE or AIGG_PAIRING=CODE.');
  process.exit(1);
}

const socket = new WebSocket(`${server.replace(/\/$/, '')}/ws/bridge/${encodeURIComponent(pairing)}`);

socket.on('open', async () => {
  const antigravity = await probeAntigravity(options.agyPath || options.antigravityPath);
  socket.send(JSON.stringify({ type: 'bridge_status', status: 'connected', projectRoot, antigravity }));
});

socket.on('message', async (raw) => {
  const message = parseJson(raw);
  if (message?.type !== 'generate') return;

  try {
    socket.send(JSON.stringify({ type: 'progress', stage: 'agy', message: 'Asking agy for image-only planning' }));
    const agy = await runAgyPlanning({
      commandPath: options.agyPath || options.antigravityPath || DEFAULT_AGY_PATH,
      userPrompt: message.prompt,
      variants: message.variants || 3,
      screenCount: message.screenCount || 1,
      timeoutMs: Number(options.agyTimeoutMs || process.env.AIGG_AGY_TIMEOUT_MS || 60000)
    });

    if (!agy.ok) {
      socket.send(
        JSON.stringify({
          type: 'error',
          error: `agy_${agy.reason}`,
          detail: agy.stderr || `Failed to get planning output from ${agy.commandPath}`
        })
      );
      return;
    }

    socket.send(JSON.stringify({ type: 'progress', stage: 'planning', message: 'Writing agy planning Markdown' }));
    const writer = new GuardedWriter(projectRoot);
    const result = await createMockupSet({
      writer,
      prompt: message.prompt,
      agyMarkdown: agy.markdown,
      variants: message.variants || 3,
      screenCount: message.screenCount || 1
    });

    const files = await Promise.all(result.files.map(hydrateFile));
    socket.send(JSON.stringify({ type: 'result', files, blockedActions: result.blockedActions }));
  } catch (error) {
    socket.send(JSON.stringify({ type: 'error', error: error.message }));
  }
});

socket.on('close', () => {
  console.log('Bridge disconnected.');
});

socket.on('error', (error) => {
  console.error(error.message);
});

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--server') parsed.server = args[index + 1];
    if (arg === '--pairing') parsed.pairing = args[index + 1];
    if (arg === '--project') parsed.project = args[index + 1];
    if (arg === '--antigravity-path') parsed.antigravityPath = args[index + 1];
    if (arg === '--agy-path') parsed.agyPath = args[index + 1];
    if (arg === '--agy-timeout-ms') parsed.agyTimeoutMs = args[index + 1];
  }
  return parsed;
}

function parseJson(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch {
    return null;
  }
}

async function hydrateFile(file) {
  const buffer = await readFile(file.absolutePath);
  const mime = file.extension === '.md' ? 'text/markdown' : `image/${file.extension.slice(1).replace('jpg', 'jpeg')}`;
  return {
    relativePath: file.relativePath,
    extension: file.extension,
    text: file.extension === '.md' ? buffer.toString('utf8') : undefined,
    dataUrl: file.extension === '.md' ? undefined : `data:${mime};base64,${buffer.toString('base64')}`
  };
}
