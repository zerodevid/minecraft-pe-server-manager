import { initWorldSelector } from './worldSelector.js';

const output = document.getElementById('console-output');
const form = document.getElementById('command-form');
const input = document.getElementById('command-input');
const feedback = document.getElementById('console-feedback');
const worldSelect = document.getElementById('world-select');
initWorldSelector(worldSelect);

function appendLine(text) {
  const line = document.createElement('div');
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function connectSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const socket = new WebSocket(`${protocol}://${window.location.host}/ws/console`);

  socket.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.message) {
        appendLine(payload.message);
      }
    } catch (error) {
      appendLine(event.data);
    }
  });

  socket.addEventListener('close', () => {
    appendLine('Console stream disconnected. Reconnecting...');
    setTimeout(connectSocket, 2000);
  });
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const command = input.value.trim();
  if (!command) return;

  try {
    const res = await fetch('/api/console/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to send');
    }
    feedback.textContent = data.message;
    input.value = '';
  } catch (error) {
    feedback.textContent = error.message;
  }
});

connectSocket();
