import { initWorldSelector } from './worldSelector.js';

const tableBody = document.getElementById('player-table');
const worldSelect = document.getElementById('world-select');
initWorldSelector(worldSelect);

function renderPlayers(players) {
  if (!players.length) {
    tableBody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-slate-500">No players online</td></tr>';
    return;
  }

  tableBody.innerHTML = players
    .map(
      (player) => `
        <tr>
          <td class="px-4 py-3">${player.name}</td>
          <td class="px-4 py-3">${player.xuid}</td>
          <td class="px-4 py-3 capitalize">${player.gamemode || 'survival'}</td>
          <td class="px-4 py-3">${player.ping ?? 0} ms</td>
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
    tableBody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-rose-500">Unable to load players</td></tr>';
  }
}

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
connectPlayerSocket();
