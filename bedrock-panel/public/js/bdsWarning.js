let warned = false;
let modal;
let modalMessageEl;

function ensureModal() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 hidden';

  const panel = document.createElement('div');
  panel.className =
    'bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-xl p-6 space-y-4';

  const title = document.createElement('h3');
  title.className = 'text-lg font-semibold text-white';
  title.textContent = 'Bedrock Path Required';

  modalMessageEl = document.createElement('p');
  modalMessageEl.className = 'text-sm text-slate-300';

  const actions = document.createElement('div');
  actions.className = 'flex justify-end gap-3';

  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'px-4 py-2 rounded bg-indigo-600 text-white text-sm';
  reloadBtn.textContent = 'Reload';
  reloadBtn.addEventListener('click', () => window.location.reload());

  const closeBtn = document.createElement('button');
  closeBtn.className = 'px-4 py-2 rounded border border-slate-600 text-sm text-slate-200';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  actions.appendChild(closeBtn);
  actions.appendChild(reloadBtn);
  panel.appendChild(title);
  panel.appendChild(modalMessageEl);
  panel.appendChild(actions);
  modal.appendChild(panel);
  document.body.appendChild(modal);
  return modal;
}

function showModal(message) {
  ensureModal();
  modalMessageEl.textContent = message;
  modal.classList.remove('hidden');
}

export function handleBdsError(message, targetEl) {
  if (!message) return false;
  const normalized = String(message);
  if (!normalized.toLowerCase().includes('bedrock server directory')) {
    return false;
  }
  const fullMessage = `${normalized} Update your .env (see .env.example) and set BDS_DIR to the correct Bedrock server folder.`;
  if (targetEl) {
    targetEl.textContent = fullMessage;
  }
  if (!warned) {
    showModal(fullMessage);
    warned = true;
  }
  return true;
}
