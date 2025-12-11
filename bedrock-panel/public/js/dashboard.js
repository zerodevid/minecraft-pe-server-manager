import { initWorldSelector, getSelectedWorld, onWorldChange } from './worldSelector.js';
import { handleBdsError } from './bdsWarning.js';

const statusEl = document.getElementById('server-status');
const playerEl = document.getElementById('player-count');
const packEl = document.getElementById('pack-count');
const versionEl = document.getElementById('server-version');
const feedbackEl = document.getElementById('control-feedback');
const worldSelect = document.getElementById('world-select');

async function fetchStatus(world = getSelectedWorld()) {
  if (!world) return;
  try {
    const response = await fetch(`/api/status?world=${encodeURIComponent(world)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Unable to load status');
    }
    statusEl.textContent = data.running ? 'Running' : data.status || 'Stopped';
    playerEl.textContent = data.playerCount ?? 0;
    packEl.textContent = data.enabledPacks ?? 0;
    versionEl.textContent = data.version || '—';
  } catch (error) {
    if (!handleBdsError(error.message, feedbackEl)) {
      feedbackEl.textContent = 'Unable to load status';
    }
  }
}

async function postAction(url) {
  const world = getSelectedWorld();
  feedbackEl.textContent = 'Sending command...';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ world }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Action failed');
    }
    feedbackEl.textContent = data.message;
    fetchStatus(world);
  } catch (error) {
    if (!handleBdsError(error.message, feedbackEl)) {
      feedbackEl.textContent = error.message;
    }
  }
}

['btn-start', 'btn-stop', 'btn-restart'].forEach((id) => {
  const button = document.getElementById(id);
  button?.addEventListener('click', () => {
    const action = id.split('-')[1];
    postAction(`/api/server/${action}`);
  });
});

initWorldSelector(worldSelect).then((world) => {
  fetchStatus(world);
  setInterval(() => fetchStatus(getSelectedWorld()), 4000);
});

onWorldChange((world) => fetchStatus(world));
