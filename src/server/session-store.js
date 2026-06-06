import crypto from 'node:crypto';

export function createSessionStore() {
  const sessions = new Map();
  const pairings = new Map();

  function createSession() {
    const session = {
      sessionId: crypto.randomUUID(),
      pairingCode: createPairingCode(),
      browsers: new Set(),
      bridge: null,
      createdAt: new Date().toISOString()
    };

    sessions.set(session.sessionId, session);
    pairings.set(session.pairingCode, session.sessionId);
    return publicSession(session);
  }

  function findBySessionId(sessionId) {
    const session = sessions.get(sessionId);
    return session ? publicSession(session) : null;
  }

  function findByPairingCode(pairingCode) {
    const sessionId = pairings.get(normalizePairingCode(pairingCode));
    const session = sessionId ? sessions.get(sessionId) : null;
    return session ? publicSession(session) : null;
  }

  function attachBrowser(sessionId, socket) {
    const session = sessions.get(sessionId);
    if (!session) return false;

    session.browsers.add(socket);
    socket.on?.('close', () => session.browsers.delete(socket));

    if (session.bridge) sendJson(socket, { type: 'bridge_status', status: 'connected' });
    return true;
  }

  function attachBridge(pairingCode, socket) {
    const sessionId = pairings.get(normalizePairingCode(pairingCode));
    const session = sessionId ? sessions.get(sessionId) : null;
    if (!session) return null;

    session.bridge = socket;
    socket.on?.('close', () => {
      if (session.bridge === socket) {
        session.bridge = null;
        sendToBrowsers(session.sessionId, { type: 'bridge_status', status: 'disconnected' });
      }
    });

    sendToBrowsers(session.sessionId, { type: 'bridge_status', status: 'connected' });
    return publicSession(session);
  }

  function sendToBridge(sessionId, message) {
    const session = sessions.get(sessionId);
    if (!session?.bridge) return false;
    sendJson(session.bridge, message);
    return true;
  }

  function sendToBrowsers(sessionId, message) {
    const session = sessions.get(sessionId);
    if (!session) return false;
    for (const browser of session.browsers) {
      sendJson(browser, message);
    }
    return true;
  }

  return {
    createSession,
    findBySessionId,
    findByPairingCode,
    attachBrowser,
    attachBridge,
    sendToBridge,
    sendToBrowsers
  };
}

function publicSession(session) {
  return {
    sessionId: session.sessionId,
    pairingCode: session.pairingCode,
    createdAt: session.createdAt,
    bridgeConnected: Boolean(session.bridge)
  };
}

function createPairingCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function normalizePairingCode(pairingCode) {
  return String(pairingCode || '').trim().toUpperCase();
}

function sendJson(socket, message) {
  socket.send(JSON.stringify(message));
}
