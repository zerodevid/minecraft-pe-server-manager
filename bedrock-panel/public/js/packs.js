import { initWorldSelector, getSelectedWorld, onWorldChange } from './worldSelector.js';
import { handleBdsError } from './bdsWarning.js';

const container = document.getElementById('pack-list');
const worldSelect = document.getElementById('world-select');
const dropzone = document.getElementById('dropzone');
const dropLabel = document.getElementById('dropzone-label');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatusEl = document.getElementById('upload-status');
let selectedUploadFile = null;

function packTemplate(group) {
  const iconSrc = group.iconUrl || '/images/pack-placeholder.svg';
  const rows = group.entries
    .map((pack) => {
      const statusClass = pack.enabled ? 'text-emerald-400' : 'text-slate-400';
      const statusLabel = pack.enabled ? 'Enabled' : 'Disabled';
      const version = Array.isArray(pack.version) ? pack.version.join('.') : pack.version;
      const toggleAction = pack.enabled ? 'disable' : 'enable';
      const toggleLabel = pack.enabled ? 'Disable' : 'Enable';
      return `
        <div class="flex flex-wrap items-center gap-4 border-t border-slate-800 pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
          <div class="flex-1 min-w-[200px]">
            <p class="text-sm text-slate-300">${pack.type === 'behavior' ? 'Behavior Pack' : 'Resource Pack'} · v${version}</p>
            <p class="text-xs text-slate-500 break-all">${pack.uuid}</p>
            <span class="text-xs uppercase ${statusClass}">${statusLabel}</span>
          </div>
          <div class="flex gap-3">
            <button class="px-3 py-2 rounded bg-indigo-600 text-white" data-action="${toggleAction}" data-uuid="${pack.uuid}">${toggleLabel}</button>
            <button class="px-3 py-2 rounded bg-rose-600 text-white" data-action="delete" data-uuid="${pack.uuid}">Remove</button>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <article class="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow space-y-4">
      <div class="flex items-start gap-4">
        <img src="${iconSrc}" alt="${group.name} icon" class="w-16 h-16 rounded border border-slate-800 object-cover bg-slate-800" />
        <div class="flex-1">
          <h3 class="text-lg font-semibold">${group.name}</h3>
          <p class="text-sm text-slate-500">${group.entries.length} pack${group.entries.length > 1 ? 's' : ''}</p>
        </div>
      </div>
      <div class="space-y-2">
        ${rows}
      </div>
    </article>
  `;
}

function groupPacks(packs) {
  const byUuid = new Map();
  const dependents = new Map();
  packs.forEach((pack) => {
    byUuid.set(pack.uuid, pack);
    if (Array.isArray(pack.dependencies)) {
      pack.dependencies.forEach((depUuid) => {
        if (!dependents.has(depUuid)) {
          dependents.set(depUuid, []);
        }
        dependents.get(depUuid).push(pack);
      });
    }
  });

  const map = new Map();
  packs.forEach((pack) => {
    let key = pack.bundleId;
    if (!key && Array.isArray(pack.dependencies)) {
      key = pack.dependencies
        .map((depUuid) => {
          const target = byUuid.get(depUuid);
          return target?.bundleId || target?.uuid;
        })
        .find(Boolean);
    }
    if (!key) {
      const reverse = dependents.get(pack.uuid)?.[0];
      if (reverse) {
        key = reverse.bundleId || reverse.uuid;
      }
    }
    if (!key) {
      key = pack.uuid;
    }

    if (!map.has(key)) {
      map.set(key, {
        key,
        name: pack.name,
        iconUrl: pack.iconUrl,
        entries: [],
      });
    }
    const group = map.get(key);
    group.entries.push(pack);
    if (!group.iconUrl && pack.iconUrl) {
      group.iconUrl = pack.iconUrl;
    }
    if (!group.name && pack.name) {
      group.name = pack.name;
    }
  });
  return Array.from(map.values());
}

function renderPacks(packs) {
  if (!packs.length) {
    container.innerHTML = '<p class="text-slate-500 text-sm">No packs installed</p>';
    return;
  }
  const grouped = groupPacks(packs);
  container.innerHTML = grouped.map(packTemplate).join('');
}

async function loadPacks(world = getSelectedWorld()) {
  if (!world) return;
  try {
    const res = await fetch(`/api/packs?world=${encodeURIComponent(world)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load packs');
    }
    renderPacks(data);
  } catch (error) {
    if (!handleBdsError(error.message, container)) {
      container.innerHTML = `<p class="text-rose-400">${error.message}</p>`;
    }
  }
}

async function postPack(action, uuid, world) {
  if (!world) {
    throw new Error('Please select a world first');
  }
  const endpoint =
    action === 'delete'
      ? `/api/packs/${uuid}`
      : `/api/packs/${action}`;
  const options = {
    method: action === 'delete' ? 'DELETE' : 'POST',
    headers: { 'Content-Type': 'application/json' },
  };
  if (action !== 'delete') {
    options.body = JSON.stringify({ uuid, world });
  }

  const res = await fetch(endpoint, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function setUploadFile(file) {
  selectedUploadFile = file;
  if (!dropLabel || !uploadBtn) return;
  if (file) {
    dropLabel.textContent = file.name;
    uploadBtn.disabled = false;
    if (uploadStatusEl) {
      uploadStatusEl.textContent = '';
    }
  } else {
    dropLabel.textContent = 'Drag & drop your pack here';
    uploadBtn.disabled = true;
  }
}

dropzone?.addEventListener('click', () => fileInput?.click());

fileInput?.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  setUploadFile(file || null);
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
    setUploadFile(file);
  }
});

async function uploadSelectedPack() {
  if (!selectedUploadFile || !uploadBtn) return;
  const form = new FormData();
  form.append('pack', selectedUploadFile);
  uploadBtn.disabled = true;
  if (uploadStatusEl) {
    uploadStatusEl.textContent = 'Uploading pack...';
  }

  try {
    const res = await fetch('/api/packs/upload', {
      method: 'POST',
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    const installed = Array.isArray(data.installed) ? data.installed : [];
    if (uploadStatusEl) {
      if (installed.length === 0) {
        uploadStatusEl.textContent = 'No packs installed.';
      } else if (installed.length === 1) {
        const pack = installed[0];
        uploadStatusEl.textContent = `Uploaded ${pack.name} (${pack.type})`;
      } else {
        const names = installed.map((pack) => `${pack.name} (${pack.type})`).join(', ');
        uploadStatusEl.textContent = `Uploaded packs: ${names}`;
      }
    }
    if (fileInput) {
      fileInput.value = '';
    }
    setUploadFile(null);
    await loadPacks(getSelectedWorld());
  } catch (error) {
    if (uploadStatusEl) {
      uploadStatusEl.textContent = error.message;
    }
  } finally {
    if (uploadBtn) {
      uploadBtn.disabled = false;
    }
  }
}

uploadBtn?.addEventListener('click', uploadSelectedPack);

container?.addEventListener('click', async (event) => {
  const target = event.target.closest('button[data-action]');
  if (!target) return;
  const uuid = target.dataset.uuid;
  const action = target.dataset.action;
  target.disabled = true;
  try {
    await postPack(action, uuid, getSelectedWorld());
    await loadPacks(getSelectedWorld());
  } catch (error) {
    if (!handleBdsError(error.message)) {
      alert(error.message);
    }
  } finally {
    target.disabled = false;
  }
});

initWorldSelector(worldSelect).then((world) => loadPacks(world));
onWorldChange((world) => loadPacks(world));
