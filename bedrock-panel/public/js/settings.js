import { handleBdsError } from './bdsWarning.js';

const formContainer = document.getElementById('settings-form');
const saveButton = document.getElementById('save-settings');
const feedbackEl = document.getElementById('settings-feedback');

let sectionState = [];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderField(field) {
  const id = `setting-${field.key}`;
  const description = field.description ? `<p class="text-xs text-slate-400">${escapeHtml(field.description)}</p>` : '';

  if (field.input === 'toggle') {
    return `
      <div class="space-y-1 border border-slate-800 rounded-lg p-3">
        <label for="${id}" class="flex items-center justify-between gap-4 text-sm font-medium">
          <span>${escapeHtml(field.label)}</span>
          <input
            type="checkbox"
            id="${id}"
            data-setting="${field.key}"
            ${field.value ? 'checked' : ''}
            class="h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
          />
        </label>
        ${description}
      </div>
    `;
  }

  const inputClasses =
    'w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500';
  const attrs = [`id="${id}"`, `data-setting="${field.key}"`];
  if (field.placeholder) {
    attrs.push(`placeholder="${escapeHtml(field.placeholder)}"`);
  }
  if (typeof field.min === 'number') {
    attrs.push(`min="${field.min}"`);
  }
  if (typeof field.max === 'number') {
    attrs.push(`max="${field.max}"`);
  }

  let inputHtml = '';
  if (field.input === 'select' && Array.isArray(field.options)) {
    const options = field.options
      .map(
        (option) =>
          `<option value="${escapeHtml(option.value)}" ${option.value === field.value ? 'selected' : ''}>${escapeHtml(
            option.label,
          )}</option>`,
      )
      .join('');
    inputHtml = `<select ${attrs.join(' ')} class="${inputClasses}">${options}</select>`;
  } else {
    const type = field.input === 'number' ? 'number' : 'text';
    const value =
      field.value === undefined || field.value === null ? '' : escapeHtml(field.value.toString());
    inputHtml = `<input type="${type}" value="${value}" ${attrs.join(' ')} class="${inputClasses}" />`;
  }

  return `
    <div class="space-y-1">
      <label class="text-sm font-medium" for="${id}">${escapeHtml(field.label)}</label>
      ${inputHtml}
      ${description}
    </div>
  `;
}

function renderSections(sections) {
  sectionState = sections || [];
  if (!sections?.length) {
    formContainer.innerHTML = '<p class="text-slate-500 text-sm">No configurable settings found.</p>';
    return;
  }
  formContainer.innerHTML = sections
    .map(
      (section) => `
        <article class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold">${escapeHtml(section.title)}</h3>
            <p class="text-slate-400 text-sm">${escapeHtml(section.description || '')}</p>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            ${section.fields.map((field) => renderField(field)).join('')}
          </div>
        </article>
      `,
    )
    .join('');
}

async function loadSettings() {
  if (saveButton) {
    saveButton.disabled = true;
  }
  feedbackEl.textContent = 'Loading settings...';
  try {
    const res = await fetch('/api/settings');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Unable to load settings');
    }
    renderSections(data.sections);
    feedbackEl.textContent = 'Settings loaded.';
    if (saveButton) {
      saveButton.disabled = false;
    }
  } catch (error) {
    if (!handleBdsError(error.message, feedbackEl)) {
      feedbackEl.textContent = error.message;
    }
    formContainer.innerHTML = `<p class="text-rose-400 text-sm">${escapeHtml(error.message)}</p>`;
  }
}

function collectValues() {
  const payload = {};
  sectionState.forEach((section) => {
    section.fields.forEach((field) => {
      const element = formContainer.querySelector(`[data-setting="${field.key}"]`);
      if (!element) return;
      if (field.valueType === 'boolean') {
        payload[field.key] = element.checked;
      } else if (field.valueType === 'number') {
        const raw = element.value;
        payload[field.key] = raw === '' ? null : Number(raw);
      } else {
        payload[field.key] = element.value;
      }
    });
  });
  return payload;
}

async function saveSettings() {
  const payload = collectValues();
  feedbackEl.textContent = 'Saving settings...';
  saveButton.disabled = true;
  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Unable to save settings');
    }
    feedbackEl.textContent = data.message || 'Settings updated.';
    await loadSettings();
  } catch (error) {
    if (!handleBdsError(error.message, feedbackEl)) {
      feedbackEl.textContent = error.message;
    }
  } finally {
    saveButton.disabled = false;
  }
}

saveButton?.addEventListener('click', (event) => {
  event.preventDefault();
  saveSettings();
});

loadSettings();

// --- Telegram Settings Logic ---

const tgSaveBtn = document.getElementById('save-telegram');
const tgTestBtn = document.getElementById('tg-test-btn');

async function loadTelegramSettings() {
  if (tgSaveBtn) tgSaveBtn.disabled = true;
  try {
    const res = await fetch('/api/settings/panel');
    const data = await res.json();
    if (res.ok && data.telegram) {
      const t = data.telegram;
      document.getElementById('tg-enabled').checked = t.enabled;
      document.getElementById('tg-token').value = t.botToken || '';
      document.getElementById('tg-chatid').value = t.chatId || '';

      document.getElementById('tg-event-start').checked = t.events.serverStart;
      document.getElementById('tg-event-stop').checked = t.events.serverStop;
      document.getElementById('tg-event-join').checked = t.events.playerJoin;
      document.getElementById('tg-event-leave').checked = t.events.playerLeave;
      document.getElementById('tg-event-ban').checked = t.events.playerBan;
      document.getElementById('tg-event-hourly').checked = t.events.hourlyStatus;
    }
  } catch (err) {
    console.error('Failed to load telegram settings', err);
  } finally {
    if (tgSaveBtn) tgSaveBtn.disabled = false;
  }
}

async function saveTelegramSettings() {
  const payload = {
    enabled: document.getElementById('tg-enabled').checked,
    botToken: document.getElementById('tg-token').value,
    chatId: document.getElementById('tg-chatid').value,
    events: {
      serverStart: document.getElementById('tg-event-start').checked,
      serverStop: document.getElementById('tg-event-stop').checked,
      playerJoin: document.getElementById('tg-event-join').checked,
      playerLeave: document.getElementById('tg-event-leave').checked,
      playerBan: document.getElementById('tg-event-ban').checked,
      hourlyStatus: document.getElementById('tg-event-hourly').checked,
    }
  };

  tgSaveBtn.textContent = 'Saving...';
  tgSaveBtn.disabled = true;

  try {
    const res = await fetch('/api/settings/telegram', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      tgSaveBtn.textContent = 'Saved!';
      setTimeout(() => tgSaveBtn.textContent = 'Save Telegram Settings', 2000);
    } else {
      alert(data.message || 'Failed to save');
      tgSaveBtn.textContent = 'Save Failed';
    }
  } catch (err) {
    console.error(err);
    alert('Error saving settings');
  } finally {
    tgSaveBtn.disabled = false;
  }
}

async function testTelegram() {
  tgTestBtn.disabled = true;
  tgTestBtn.textContent = '...';
  try {
    const res = await fetch('/api/settings/telegram/test', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Req failed');
  } finally {
    tgTestBtn.disabled = false;
    tgTestBtn.textContent = 'Test';
  }
}

if (tgSaveBtn) {
  tgSaveBtn.addEventListener('click', saveTelegramSettings);
}
if (tgTestBtn) {
  tgTestBtn.addEventListener('click', testTelegram);
}

loadTelegramSettings();
