import {
  initWorldSelector,
  getWorldList,
  refreshWorldSelector,
  setActiveWorldOnServer,
  selectWorld,
  getSelectedWorld,
  setSelectedWorldLocal,
} from './worldSelector.js';
import { handleBdsError } from './bdsWarning.js';

const worldSelect = document.getElementById('world-select');
const listEl = document.getElementById('world-list');
const listStatusEl = document.getElementById('world-list-status');
const fileInput = document.getElementById('world-file');
const importBtn = document.getElementById('import-world-btn');
const importStatusEl = document.getElementById('world-import-status');
const dropzone = document.getElementById('world-dropzone');
const dropLabel = document.getElementById('world-dropzone-label');
const worldIconPlaceholder = '/images/world-placeholder.svg';
let selectedWorldFile = null;

initWorldSelector(worldSelect).then(renderWorlds);

async function renderWorlds() {
  try {
    const { worlds, activeWorld } = await getWorldList();
    if (!worlds.length) {
      listEl.innerHTML = '<p class="text-slate-500 text-sm">No worlds detected.</p>';
      return;
    }
    listEl.innerHTML = worlds
      .map((world) => worldCard(world, activeWorld))
      .join('');
  } catch (error) {
    if (!handleBdsError(error.message, listStatusEl)) {
      listEl.innerHTML = `<p class="text-rose-400 text-sm">${error.message}</p>`;
    }
  }
}

function worldCard(world, activeWorld) {
  const isActive = world.name === activeWorld;
  const iconUrl = `/api/worlds/${encodeURIComponent(world.name)}/icon`;
  return `
    <article class="bg-slate-800 rounded-lg p-5 border border-slate-700 space-y-3" data-world="${world.name}">
      <div class="flex items-center gap-4">
        <img src="${iconUrl}" alt="${world.name} icon" loading="lazy" class="w-16 h-16 rounded-lg border border-slate-700 object-cover bg-slate-900" data-world-icon="${world.name}" />
        <div class="flex-1">
          <h4 class="font-semibold">${world.name}</h4>
          <p class="text-xs text-slate-400">${world.path}</p>
        </div>
        <span class="text-xs uppercase ${isActive ? 'text-emerald-400' : 'text-slate-500'}">
          ${isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div class="flex flex-wrap gap-3">
        <button class="px-3 py-2 rounded bg-slate-700 text-white" data-action="use" data-world="${world.name}">Use</button>
        <button class="px-3 py-2 rounded bg-slate-700/70 text-white" data-action="backup" data-world="${world.name}">Backup</button>
        <button class="px-3 py-2 rounded bg-amber-600 text-white" data-action="rename" data-world="${world.name}">Rename</button>
        <button class="px-3 py-2 rounded ${isActive ? 'bg-slate-600 cursor-not-allowed text-slate-400' : 'bg-indigo-600 text-white'}" data-action="set-active" data-world="${world.name}" ${isActive ? 'disabled' : ''}>
          Set Active
        </button>
        <button class="px-3 py-2 rounded bg-rose-600 text-white" data-action="delete" data-world="${world.name}">Delete</button>
      </div>
    </article>
  `;
}

listEl?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const world = button.dataset.world;
  const action = button.dataset.action;

  if (action === 'use') {
    selectWorld(world);
    listStatusEl.textContent = `World "${world}" selected for panel configuration.`;
    return;
  }

  if (action === 'set-active') {
    button.disabled = true;
    button.textContent = 'Setting...';
    try {
      await setActiveWorldOnServer(world);
      listStatusEl.textContent = `World "${world}" is now active.`;
      await refreshWorldSelector(worldSelect);
      await renderWorlds();
    } catch (error) {
      if (!handleBdsError(error.message, listStatusEl)) {
        listStatusEl.textContent = error.message;
      }
    } finally {
      button.disabled = false;
      button.textContent = 'Set Active';
    }
  }

  if (action === 'backup') {
    button.disabled = true;
    button.textContent = 'Packaging...';
    try {
      await backupWorld(world);
      listStatusEl.textContent = `Backup for "${world}" downloaded.`;
    } catch (error) {
      if (!handleBdsError(error.message, listStatusEl)) {
        listStatusEl.textContent = error.message;
      }
    } finally {
      button.disabled = false;
      button.textContent = 'Backup';
    }
    return;
  }

  if (action === 'rename') {
    const desired = window.prompt('Enter a new name for this world', world);
    if (!desired) {
      return;
    }
    const trimmed = desired.trim();
    if (!trimmed || trimmed === world) {
      return;
    }
    const previousLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Renaming...';
    const previouslySelected = getSelectedWorld();
    try {
      const result = await renameWorldRequest(world, trimmed);
      listStatusEl.textContent = `World "${world}" renamed to "${result.name}".`;
      await refreshWorldSelector(worldSelect);
      if (previouslySelected === world) {
        setSelectedWorldLocal(result.name);
        if (worldSelect) {
          worldSelect.value = result.name;
        }
      }
      await renderWorlds();
    } catch (error) {
      if (!handleBdsError(error.message, listStatusEl)) {
        listStatusEl.textContent = error.message;
      }
    } finally {
      button.disabled = false;
      button.textContent = previousLabel;
    }
    return;
  }

  if (action === 'delete') {
    if (!window.confirm(`Delete world "${world}"? This cannot be undone.`)) {
      return;
    }
    button.disabled = true;
    button.textContent = 'Deleting...';
    try {
      await deleteWorld(world);
      listStatusEl.textContent = `World "${world}" deleted.`;
      await refreshWorldSelector(worldSelect);
      await renderWorlds();
    } catch (error) {
      if (!handleBdsError(error.message, listStatusEl)) {
        listStatusEl.textContent = error.message;
      }
    } finally {
      button.disabled = false;
      button.textContent = 'Delete';
    }
  }
});

listEl?.addEventListener(
  'error',
  (event) => {
    const target = event.target;
    if (target instanceof HTMLImageElement && target.dataset.worldIcon && !target.dataset.fallbackApplied) {
      target.dataset.fallbackApplied = '1';
      target.src = worldIconPlaceholder;
    }
  },
  true
);

function setWorldUploadFile(file) {
  selectedWorldFile = file;
  if (dropLabel) {
    dropLabel.textContent = file ? file.name : 'Drag & drop your world .zip here';
  }
  if (importBtn) {
    importBtn.disabled = !file;
  }
  if (importStatusEl && !file) {
    importStatusEl.textContent = '';
  }
}

dropzone?.addEventListener('click', () => fileInput?.click());

fileInput?.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  setWorldUploadFile(file || null);
});

dropzone?.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('border-indigo-500');
});

dropzone?.addEventListener('dragleave', () => {
  dropzone.classList.remove('border-indigo-500');
});

dropzone?.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('border-indigo-500');
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    if (fileInput) {
      fileInput.value = '';
    }
    setWorldUploadFile(file);
  }
});

importBtn?.addEventListener('click', async () => {
  if (!selectedWorldFile) return;
  const form = new FormData();
  form.append('world', selectedWorldFile);
  importBtn.disabled = true;
  importStatusEl.textContent = 'Importing world...';

  try {
    const res = await fetch('/api/worlds/import', {
      method: 'POST',
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Import failed');
    }
    importStatusEl.textContent = `World "${data.name}" imported.`;
    if (fileInput) {
      fileInput.value = '';
    }
    setWorldUploadFile(null);
    selectWorld(data.name);
    listStatusEl.textContent = `World "${data.name}" ready for configuration.`;
    await refreshWorldSelector(worldSelect);
    await renderWorlds();
  } catch (error) {
    if (!handleBdsError(error.message, importStatusEl)) {
      importStatusEl.textContent = error.message;
    }
  } finally {
    importBtn.disabled = false;
  }
});

async function backupWorld(world) {
  const res = await fetch(`/api/worlds/${encodeURIComponent(world)}/backup`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Backup failed');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?(.+?)"?$/);
  const filename = match ? match[1] : `${world}.zip`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function deleteWorld(world) {
  const res = await fetch(`/api/worlds/${encodeURIComponent(world)}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete world');
  }
  return data;
}

async function renameWorldRequest(world, newName) {
  const res = await fetch(`/api/worlds/${encodeURIComponent(world)}/rename`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to rename world');
  }
  return data;
}
