const elements = {
  socketStatus: document.querySelector('#socketStatus'),
  bridgeStatus: document.querySelector('#bridgeStatus'),
  inviteUrl: document.querySelector('#inviteUrl'),
  pairingCode: document.querySelector('#pairingCode'),
  prompt: document.querySelector('#prompt'),
  variants: document.querySelector('#variants'),
  screenCount: document.querySelector('#screenCount'),
  generateButton: document.querySelector('#generateButton'),
  generateHint: document.querySelector('#generateHint'),
  copyInviteButton: document.querySelector('#copyInviteButton'),
  copyBridgeButton: document.querySelector('#copyBridgeButton'),
  bridgeCommand: document.querySelector('#bridgeCommand'),
  progress: document.querySelector('#progress'),
  variantGrid: document.querySelector('#variantGrid'),
  emptyVariants: document.querySelector('#emptyVariants'),
  resultCount: document.querySelector('#resultCount'),
  markdownFiles: document.querySelector('#markdownFiles'),
  emptyMarkdown: document.querySelector('#emptyMarkdown'),
  blockedActions: document.querySelector('#blockedActions'),
  pairStep: document.querySelector('#pairStep'),
  generateStep: document.querySelector('#generateStep'),
  exportStep: document.querySelector('#exportStep')
};

const state = {
  socketConnected: false,
  bridgeConnected: false,
  selectedVariant: null
};

let socket;
let session;

main();

async function main() {
  session = await getOrCreateSession();
  const inviteUrl = `${window.location.origin}/invite/${session.sessionId}`;
  const command = `npm run bridge -- --server ${wsBase()} --pairing ${session.pairingCode}`;

  elements.inviteUrl.textContent = inviteUrl;
  elements.pairingCode.textContent = session.pairingCode;
  elements.bridgeCommand.textContent = command;
  elements.copyInviteButton.addEventListener('click', () => copyText(inviteUrl, elements.copyInviteButton));
  elements.copyBridgeButton.addEventListener('click', () => copyText(command, elements.copyBridgeButton));
  elements.generateButton.addEventListener('click', requestGeneration);

  connectBrowserSocket(session.sessionId);
  updateGenerateAvailability();
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

  socket.addEventListener('open', () => {
    state.socketConnected = true;
    elements.socketStatus.textContent = 'browser: connected';
    elements.socketStatus.classList.add('status-pill--ready');
    updateGenerateAvailability();
  });

  socket.addEventListener('close', () => {
    state.socketConnected = false;
    state.bridgeConnected = false;
    elements.socketStatus.textContent = 'browser: disconnected';
    elements.socketStatus.classList.remove('status-pill--ready');
    elements.bridgeStatus.textContent = 'bridge: disconnected';
    elements.bridgeStatus.classList.remove('status-pill--ready');
    updateGenerateAvailability();
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'bridge_status') {
      state.bridgeConnected = message.status === 'connected';
      elements.bridgeStatus.textContent = `bridge: ${message.status}`;
      elements.bridgeStatus.classList.toggle('status-pill--ready', state.bridgeConnected);
      elements.bridgeStatus.classList.toggle('status-pill--muted', !state.bridgeConnected);
      elements.pairStep.classList.toggle('is-complete', state.bridgeConnected);
      updateGenerateAvailability();

      if (message.antigravity) {
        elements.progress.textContent = `Antigravity binary detected: ${message.antigravity.available ? 'yes' : 'no'}`;
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
      elements.generateButton.disabled = false;
      updateGenerateAvailability();
    }
  });
}

function requestGeneration() {
  if (!socket || socket.readyState !== WebSocket.OPEN || !state.bridgeConnected) {
    elements.progress.textContent = 'Pair the local bridge before generating.';
    return;
  }

  state.selectedVariant = null;
  elements.generateButton.disabled = true;
  elements.generateHint.textContent = 'Generating planning Markdown and image variants...';
  elements.progress.textContent = 'Generation requested';
  elements.generateStep.classList.add('is-active');

  send({
    type: 'generate',
    prompt: elements.prompt.value.trim(),
    variants: Number(elements.variants.value),
    screenCount: Number(elements.screenCount.value)
  });
}

function send(message) {
  socket.send(JSON.stringify(message));
}

function renderResult(message) {
  const files = message.files || [];
  const imageFiles = files.filter((file) => file.dataUrl);
  const markdownFiles = files.filter((file) => file.text);

  elements.progress.textContent = 'Generation complete';
  elements.generateStep.classList.add('is-complete');
  elements.exportStep.classList.add('is-complete');
  elements.resultCount.textContent = `${files.length} file${files.length === 1 ? '' : 's'}`;
  elements.variantGrid.replaceChildren();
  elements.markdownFiles.replaceChildren();
  elements.blockedActions.replaceChildren();
  elements.emptyVariants.hidden = imageFiles.length > 0;
  elements.emptyMarkdown.hidden = markdownFiles.length > 0;

  for (const file of imageFiles) {
    elements.variantGrid.append(createVariantCard(file));
  }

  for (const file of markdownFiles) {
    elements.markdownFiles.append(createMarkdownCard(file));
  }

  const blockedActions = message.blockedActions || [];
  if (blockedActions.length === 0) {
    const item = document.createElement('li');
    item.className = 'muted-item';
    item.textContent = 'No blocked writes in this session.';
    elements.blockedActions.append(item);
  } else {
    for (const blocked of blockedActions) {
      const item = document.createElement('li');
      item.textContent = `${blocked.relativePath}: ${blocked.reason}`;
      elements.blockedActions.append(item);
    }
  }

  updateGenerateAvailability();
}

function createVariantCard(file) {
  const article = document.createElement('article');
  article.className = 'variant';

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', `Select ${file.relativePath}`);
  button.addEventListener('click', () => {
    state.selectedVariant = file.relativePath;
    for (const card of elements.variantGrid.querySelectorAll('.variant')) {
      card.classList.toggle('is-selected', card.dataset.path === state.selectedVariant);
    }
  });

  const image = document.createElement('img');
  image.alt = `Generated mockup ${file.relativePath}`;
  image.src = file.dataUrl;

  const label = document.createElement('p');
  label.textContent = file.relativePath;

  button.append(image, label);
  article.dataset.path = file.relativePath;
  article.append(button);
  return article;
}

function createMarkdownCard(file) {
  const section = document.createElement('section');
  section.className = 'markdown-card';

  const header = document.createElement('header');
  const title = document.createElement('h3');
  const downloadButton = document.createElement('button');
  const pre = document.createElement('pre');

  title.textContent = file.relativePath;
  downloadButton.className = 'copy-button';
  downloadButton.type = 'button';
  downloadButton.textContent = 'Download';
  downloadButton.addEventListener('click', () => downloadTextFile(file.relativePath, file.text));
  pre.textContent = file.text;

  header.append(title, downloadButton);
  section.append(header, pre);
  return section;
}

async function copyText(text, button) {
  try {
    if (!navigator.clipboard) throw new Error('clipboard_unavailable');
    await navigator.clipboard.writeText(text);
  } catch {
    fallbackCopy(text);
  }
  const original = button.textContent;
  button.textContent = 'Copied';
  setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

function fallbackCopy(text) {
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

function downloadTextFile(relativePath, text) {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = relativePath.split('/').at(-1);
  link.click();
  URL.revokeObjectURL(url);
}

function updateGenerateAvailability() {
  const ready = state.socketConnected && state.bridgeConnected;
  elements.generateButton.disabled = !ready;
  elements.generateHint.textContent = ready
    ? 'Ready. The bridge will only write Markdown and image files under outputs/.'
    : 'Pair the local bridge before generating.';
}

function wsBase() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}
