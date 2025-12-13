import { initWorldSelector } from './worldSelector.js';
import { handleBdsError } from './bdsWarning.js';

const playerTableBody = document.getElementById('player-table');
const worldSelect = document.getElementById('world-select');
const playerFeedbackEl = document.getElementById('player-feedback');
const banTableBody = document.getElementById('ban-table');
const banStatusEl = document.getElementById('ban-list-status');
const refreshBansBtn = document.getElementById('refresh-bans');

initWorldSelector(worldSelect);

function renderPlayers(players) {
  if (!players.length) {
    playerTableBody.innerHTML =
      '<tr><td colspan="5" class="px-4 py-6 text-center text-slate-500">No players online</td></tr>';
    return;
  }

  playerTableBody.innerHTML = players
    .map(
      (player) => `
        <tr>
          <td class="px-4 py-3">${player.name}</td>
          <td class="px-4 py-3">${player.xuid || '—'}</td>
          <td class="px-4 py-3 capitalize">${player.gamemode || 'survival'}</td>
          <td class="px-4 py-3">${player.ping ?? 0} ms</td>
          <td class="px-4 py-3 space-x-2">
            <button
              class="px-3 py-1 rounded bg-amber-500/80 text-xs text-white hover:bg-amber-500"
              data-player-action="kick"
              data-player-name="${player.name}"
              data-player-xuid="${player.xuid || ''}"
            >
              Kick
            </button>
            <button
              class="px-3 py-1 rounded bg-rose-600/90 text-xs text-white hover:bg-rose-600"
              data-player-action="ban"
              data-player-name="${player.name}"
              data-player-xuid="${player.xuid || ''}"
            >
              Ban
            </button>
          </td>
        </tr>
      `,
    )
    .join('');
}

async function fetchPlayers() {
  try {
    const res = await fetch('/api/players');
    const data = await res.json();
    renderPlayers(data.players || []);
  } catch (error) {
    playerTableBody.innerHTML =
      '<tr><td colspan="5" class="px-4 py-6 text-center text-rose-500">Unable to load players</td></tr>';
  }
}

async function fetchBanList() {
  if (banStatusEl) {
    banStatusEl.textContent = 'Refreshing ban list...';
  }
  try {
    const res = await fetch('/api/players/bans');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Unable to load bans');
    }
    renderBanList(data.bans || []);
    if (banStatusEl) {
      banStatusEl.textContent = `Loaded ${data.bans?.length || 0} banned player(s).`;
    }
  } catch (error) {
    if (!handleBdsError(error.message, banStatusEl)) {
      banStatusEl.textContent = error.message;
    }
    banTableBody.innerHTML =
      '<tr><td colspan="3" class="px-4 py-6 text-center text-rose-500">Unable to load ban list</td></tr>';
  }
}

function renderBanList(bans) {
  if (!bans.length) {
    banTableBody.innerHTML =
      '<tr><td colspan="3" class="px-4 py-6 text-center text-slate-500">No banned players.</td></tr>';
    return;
  }
  banTableBody.innerHTML = bans
    .map(
      (ban) => `
        <tr>
          <td class="px-4 py-3">${ban.name}</td>
          <td class="px-4 py-3">${ban.xuid || '—'}</td>
          <td class="px-4 py-3">
            <button
              class="px-3 py-1 rounded bg-emerald-600/90 text-xs text-white hover:bg-emerald-500"
              data-ban-action="unban"
              data-player-name="${ban.name}"
              data-player-xuid="${ban.xuid || ''}"
            >
              Unban
            </button>
          </td>
        </tr>
      `,
    )
    .join('');
}

async function performPlayerAction(url, body, statusEl) {
  if (statusEl) {
    statusEl.textContent = 'Sending command...';
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Action failed');
    }
    if (statusEl) {
      statusEl.textContent = data.message || 'Action completed.';
    }
    if (url.includes('/ban') || url.includes('/unban')) {
      fetchBanList();
    }
  } catch (error) {
    if (!handleBdsError(error.message, statusEl)) {
      statusEl.textContent = error.message;
    }
  }
}

playerTableBody?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-player-action]');
  if (!button) return;
  const action = button.dataset.playerAction;
  const name = button.dataset.playerName;
  const xuid = button.dataset.playerXuid;
  if (!name) return;

  if (action === 'kick') {
    const reason = window.prompt(`Kick reason for ${name}? (optional)`, '') || '';
    performPlayerAction('/api/players/kick', { name, reason }, playerFeedbackEl);
  }

  if (action === 'ban') {
    const reason = window.prompt(`Ban reason for ${name}? (optional)`, '') || '';
    performPlayerAction('/api/players/ban', { name, xuid, reason }, playerFeedbackEl);
  }
});

banTableBody?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-ban-action="unban"]');
  if (!button) return;
  const name = button.dataset.playerName;
  const xuid = button.dataset.playerXuid;
  if (!window.confirm(`Unban ${name || xuid}?`)) {
    return;
  }
  performPlayerAction('/api/players/unban', { name, xuid }, banStatusEl);
});

refreshBansBtn?.addEventListener('click', () => fetchBanList());

function connectPlayerSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const socket = new WebSocket(`${protocol}://${window.location.host}/ws/players`);

  socket.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.players) {
        renderPlayers(payload.players);
      }
    } catch (error) {
      console.error(error);
    }
  });

  socket.addEventListener('close', () => {
    setTimeout(connectPlayerSocket, 2000);
  });
}

fetchPlayers();
fetchBanList();
connectPlayerSocket();
