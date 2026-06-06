import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createSessionStore } from './session-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const publicDir = path.join(projectRoot, 'public');

export function createApp({ store = createSessionStore() } = {}) {
  const app = express();
  app.locals.store = store;
  app.use(express.json());
  app.use(express.static(publicDir));

  app.post('/api/sessions', (_request, response) => {
    response.json(store.createSession());
  });

  app.get('/api/sessions/:sessionId', (request, response) => {
    const session = store.findBySessionId(request.params.sessionId);
    if (!session) {
      response.status(404).json({ error: 'session_not_found' });
      return;
    }
    response.json(session);
  });

  app.get('/invite/:sessionId', (_request, response) => {
    response.sendFile(path.join(publicDir, 'index.html'));
  });

  return app;
}

export function createServer({ port = process.env.PORT ?? 4173, host = process.env.HOST || '0.0.0.0' } = {}) {
  const store = createSessionStore();
  const app = createApp({ store });
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (socket, request) => {
    const url = new URL(request.url, 'http://localhost');
    const [, namespace, kind, token] = url.pathname.split('/');

    if (namespace !== 'ws') {
      socket.close(1008, 'unsupported_socket_path');
      return;
    }

    if (kind === 'browser') {
      if (!store.attachBrowser(token, socket)) {
        socket.close(1008, 'session_not_found');
        return;
      }

      socket.on('message', (raw) => {
        const message = parseJson(raw);
        if (!message) return;

        if (message.type === 'generate') {
          const delivered = store.sendToBridge(token, {
            type: 'generate',
            prompt: message.prompt,
            variants: message.variants,
            screenCount: message.screenCount
          });

          if (!delivered) {
            store.sendToBrowsers(token, { type: 'error', error: 'bridge_not_connected' });
          }
        }
      });
      return;
    }

    if (kind === 'bridge') {
      const session = store.attachBridge(token, socket);
      if (!session) {
        socket.close(1008, 'pairing_not_found');
        return;
      }

      socket.on('message', (raw) => {
        const message = parseJson(raw);
        if (message) store.sendToBrowsers(session.sessionId, message);
      });
      return;
    }

    socket.close(1008, 'unsupported_socket_path');
  });

  return {
    app,
    server,
    store,
    listen() {
      return new Promise((resolve) => {
        server.listen(port, host, () => resolve(server.address()));
      });
    }
  };
}

function parseJson(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch {
    return null;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runtime = createServer();
  const address = await runtime.listen();
  const actualPort = typeof address === 'object' ? address.port : process.env.PORT;
  console.log(`antigravity-is-garbage listening on http://localhost:${actualPort}`);
}
