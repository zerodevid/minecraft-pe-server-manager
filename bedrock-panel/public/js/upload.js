import { initWorldSelector } from './worldSelector.js';

const dropzone = document.getElementById('dropzone');
const dropLabel = document.getElementById('dropzone-label');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const statusEl = document.getElementById('upload-status');
const worldSelect = document.getElementById('world-select');
initWorldSelector(worldSelect);
let selectedFile = null;

function setFile(file) {
  selectedFile = file;
  if (file) {
    if (dropLabel) {
      dropLabel.textContent = file.name;
    }
    uploadBtn.disabled = false;
    statusEl.textContent = '';
  } else {
    if (dropLabel) {
      dropLabel.textContent = 'Drag & drop your pack here';
    }
    uploadBtn.disabled = true;
  }
}

dropzone?.addEventListener('click', () => fileInput.click());

fileInput?.addEventListener('change', (event) => {
  const file = event.target.files[0];
  setFile(file || null);
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
  const file = event.dataTransfer.files[0];
  if (file) {
    setFile(file);
  }
});

uploadBtn?.addEventListener('click', async () => {
  if (!selectedFile) return;
  const form = new FormData();
  form.append('pack', selectedFile);
  uploadBtn.disabled = true;
  statusEl.textContent = 'Uploading pack...';

  try {
    const res = await fetch('/api/packs/upload', {
      method: 'POST',
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    const installed = Array.isArray(data.installed) ? data.installed : [];
    if (installed.length === 0) {
      statusEl.textContent = 'No packs installed.';
    } else if (installed.length === 1) {
      const pack = installed[0];
      statusEl.textContent = `Uploaded ${pack.name} (${pack.type})`;
    } else {
      const names = installed.map((pack) => `${pack.name} (${pack.type})`).join(', ');
      statusEl.textContent = `Uploaded packs: ${names}`;
    }
    fileInput.value = '';
    setFile(null);
  } catch (error) {
    statusEl.textContent = error.message;
  } finally {
    uploadBtn.disabled = false;
  }
});
