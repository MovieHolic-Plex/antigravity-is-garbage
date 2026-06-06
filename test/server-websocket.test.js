import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createServer } from '../src/server/server.js';

describe('server websocket relay', () => {
  let runtime;
  let baseUrl;
  let wsBaseUrl;

  beforeEach(async () => {
    runtime = createServer({ port: 0, host: '127.0.0.1' });
    const address = await runtime.listen();
    baseUrl = `http://127.0.0.1:${address.port}`;
    wsBaseUrl = `ws://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise((resolve) => runtime.server.close(resolve));
  });

  it('relays generate requests from browser sockets to paired bridge sockets', async () => {
    const session = await fetchJson(`${baseUrl}/api/sessions`, { method: 'POST' });
    const browser = await openSocket(`${wsBaseUrl}/ws/browser/${session.sessionId}`);
    const bridge = await openSocket(`${wsBaseUrl}/ws/bridge/${session.pairingCode}`);
    const bridgeMessage = waitForMessage(bridge, (message) => message.type === 'generate');
    const browserMessage = waitForMessage(browser, (message) => message.type === 'result');

    browser.send(JSON.stringify({ type: 'generate', prompt: 'pricing page', variants: 2, screenCount: 1 }));
    expect(await bridgeMessage).toMatchObject({ type: 'generate', prompt: 'pricing page' });

    bridge.send(JSON.stringify({ type: 'result', files: ['outputs/variant-1.png'] }));
    expect(await browserMessage).toEqual({ type: 'result', files: ['outputs/variant-1.png'] });

    browser.close();
    bridge.close();
  });
});

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  expect(response.ok).toBe(true);
  return response.json();
}

function openSocket(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function waitForMessage(socket, predicate) {
  return new Promise((resolve) => {
    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString());
      if (predicate(message)) resolve(message);
    });
  });
}
