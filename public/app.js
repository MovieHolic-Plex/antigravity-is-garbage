const elements = {
  bridgeStatus: document.querySelector('#bridgeStatus'),
  sessionId: document.querySelector('#sessionId'),
  pairingCode: document.querySelector('#pairingCode'),
  prompt: document.querySelector('#prompt'),
  variants: document.querySelector('#variants'),
  screenCount: document.querySelector('#screenCount'),
  generateButton: document.querySelector('#generateButton'),
  bridgeCommand: document.querySelector('#bridgeCommand'),
  progress: document.querySelector('#progress'),
  variantGrid: document.querySelector('#variantGrid'),
  markdownFiles: document.querySelector('#markdownFiles'),
  blockedActions: document.querySelector('#blockedActions')
};

let socket;
let session;

main();

async function main() {
  session = await getOrCreateSession();
  elements.sessionId.textContent = session.sessionId;
  elements.pairingCode.textContent = session.pairingCode;
  elements.bridgeCommand.textContent = `npm run bridge -- --server ${wsBase()} --pairing ${session.pairingCode}`;
  connectBrowserSocket(session.sessionId);

  elements.generateButton.addEventListener('click', () => {
    send({
      type: 'generate',
      prompt: elements.prompt.value,
      variants: Number(elements.variants.value),
      screenCount: Number(elements.screenCount.value)
    });
    elements.progress.textContent = 'Generation requested';
  });
}

async function getOrCreateSession() {
  const inviteMatch = window.location.pathname.match(/^\/invite\/([^/]+)/);
  if (inviteMatch) {
    const response = await fetch(`/api/sessions/${inviteMatch[1]}`);
    if (response.ok) return response.json();
  }

  const response = await fetch('/api/sessions', { method: 'POST' });
  const created = await response.json();
  window.history.replaceState(null, '', `/invite/${created.sessionId}`);
  return created;
}

function connectBrowserSocket(sessionId) {
  socket = new WebSocket(`${wsBase()}/ws/browser/${sessionId}`);

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'bridge_status') {
      elements.bridgeStatus.textContent = `bridge: ${message.status}`;
      if (message.antigravity) {
        elements.progress.textContent = `Antigravity detected: ${message.antigravity.available ? 'yes' : 'no'}`;
      }
    }

    if (message.type === 'progress') {
      elements.progress.textContent = message.message;
    }

    if (message.type === 'result') {
      renderResult(message);
    }

    if (message.type === 'error') {
      elements.progress.textContent = message.error;
    }
  });
}

function send(message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    elements.progress.textContent = 'Browser socket is not connected yet';
    return;
  }
  socket.send(JSON.stringify(message));
}

function renderResult(message) {
  elements.progress.textContent = 'Generation complete';
  elements.variantGrid.replaceChildren();
  elements.markdownFiles.replaceChildren();
  elements.blockedActions.replaceChildren();

  for (const file of message.files || []) {
    if (file.dataUrl) {
      const article = document.createElement('article');
      article.className = 'variant';
      article.innerHTML = `<img alt="${file.relativePath}" src="${file.dataUrl}"><p>${file.relativePath}</p>`;
      elements.variantGrid.append(article);
    }

    if (file.text) {
      const section = document.createElement('section');
      const title = document.createElement('h3');
      const pre = document.createElement('pre');
      title.textContent = file.relativePath;
      pre.textContent = file.text;
      section.append(title, pre);
      elements.markdownFiles.append(section);
    }
  }

  for (const blocked of message.blockedActions || []) {
    const item = document.createElement('li');
    item.textContent = `${blocked.relativePath}: ${blocked.reason}`;
    elements.blockedActions.append(item);
  }
}

function wsBase() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}
