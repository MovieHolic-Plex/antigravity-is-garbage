import { describe, expect, it } from 'vitest';
import { createSessionStore } from '../src/server/session-store.js';

describe('session store', () => {
  it('creates invite sessions with unique pairing codes', () => {
    const store = createSessionStore();
    const first = store.createSession();
    const second = store.createSession();

    expect(first.sessionId).not.toEqual(second.sessionId);
    expect(first.pairingCode).not.toEqual(second.pairingCode);
    expect(store.findByPairingCode(first.pairingCode)?.sessionId).toEqual(first.sessionId);
  });

  it('relays browser prompts to a paired bridge and bridge results to browsers', () => {
    const store = createSessionStore();
    const session = store.createSession();
    const browserMessages = [];
    const bridgeMessages = [];

    store.attachBrowser(session.sessionId, { send: (message) => browserMessages.push(JSON.parse(message)) });
    store.attachBridge(session.pairingCode, { send: (message) => bridgeMessages.push(JSON.parse(message)) });

    store.sendToBridge(session.sessionId, { type: 'generate', prompt: 'mobile app splash screen' });
    store.sendToBrowsers(session.sessionId, { type: 'result', files: ['outputs/variant-1.png'] });

    expect(bridgeMessages).toEqual([{ type: 'generate', prompt: 'mobile app splash screen' }]);
    expect(browserMessages).toEqual([{ type: 'bridge_status', status: 'connected' }, { type: 'result', files: ['outputs/variant-1.png'] }]);
  });
});
