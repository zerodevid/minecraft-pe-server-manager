import { handleBdsError } from './bdsWarning.js';

const STORAGE_KEY = 'bedrock-panel-world';
let cachedWorlds = [];
let activeWorld = 'world';
let selectedWorld = null;
const listeners = new Set();

function isValidWorld(world) {
  return cachedWorlds.some((entry) => entry.name === world);
}

async function fetchWorldData() {
  const res = await fetch('/api/worlds');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Unable to load worlds');
  }
  cachedWorlds = data.worlds || [];
  activeWorld = data.activeWorld;
  return { worlds: cachedWorlds, activeWorld };
}

function emitWorldChange() {
  listeners.forEach((cb) => {
    try {
      cb(selectedWorld);
    } catch (error) {
      console.error(error);
    }
  });
}

function renderSelect(selectEl) {
  if (!selectEl) return;
  const options = cachedWorlds
    .map((world) => {
      const label = world.name === activeWorld ? `${world.name} (active)` : world.name;
      return `<option value="${world.name}">${label}</option>`;
    })
    .join('');
  selectEl.innerHTML = options || '<option value="world">world</option>';
}

function setSelected(world, { silent = false } = {}) {
  if (!world) return;
  if (!isValidWorld(world) && cachedWorlds.length) {
    world = cachedWorlds[0].name;
  }
  selectedWorld = world;
  localStorage.setItem(STORAGE_KEY, world);
  if (!silent) {
    emitWorldChange();
  }
}

export function getSelectedWorld() {
  return selectedWorld || localStorage.getItem(STORAGE_KEY) || activeWorld || 'world';
}

export function onWorldChange(callback) {
  listeners.add(callback);
  if (selectedWorld) {
    callback(selectedWorld);
  }
}

export async function initWorldSelector(selectEl) {
  let defaultWorld = 'world';
  try {
    const data = await fetchWorldData();
    const stored = localStorage.getItem(STORAGE_KEY);
    defaultWorld =
      (stored && isValidWorld(stored) && stored) ||
      data.activeWorld ||
      cachedWorlds[0]?.name ||
      'world';
    setSelected(defaultWorld, { silent: true });
  } catch (error) {
    if (!handleBdsError(error.message, selectEl)) {
      console.error(error);
    }
  }
  renderSelect(selectEl);
  if (selectEl) {
    selectEl.value = getSelectedWorld();
    selectEl.addEventListener('change', async (event) => {
      const newWorld = event.target.value;
      setSelected(newWorld);
      try {
        await setActiveWorldOnServer(newWorld);
      } catch (error) {
        console.error(error);
      }
    });
    onWorldChange((world) => {
      if (selectEl.value !== world) {
        selectEl.value = world;
      }
    });
  }
  return defaultWorld;
}

export async function refreshWorldSelector(selectEl) {
  try {
    await fetchWorldData();
    if (!isValidWorld(selectedWorld) && (cachedWorlds.length || activeWorld)) {
      const fallback = isValidWorld(activeWorld)
        ? activeWorld
        : cachedWorlds[0]?.name || 'world';
      setSelected(fallback, { silent: true });
    }
    renderSelect(selectEl);
    const current = getSelectedWorld();
    if (selectEl) {
      selectEl.value = current;
    }
    emitWorldChange();
  } catch (error) {
    if (!handleBdsError(error.message, selectEl)) {
      console.error(error);
    }
  }
}

export function selectWorld(world) {
  setSelected(world);
  setActiveWorldOnServer(world).catch((error) => console.error(error));
}

export async function setActiveWorldOnServer(world) {
  const res = await fetch('/api/worlds/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: world }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to set active world');
  }
  activeWorld = data.activeWorld;
  await refreshWorldSelector(null);
  return data;
}

export async function getWorldList() {
  if (!cachedWorlds.length) {
    await fetchWorldData();
  }
  return { worlds: cachedWorlds, activeWorld };
}
