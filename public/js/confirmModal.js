let modal;
let titleEl;
let messageEl;
let confirmBtn;
let cancelBtn;
let resolver;

function ensureModal() {
  if (modal) return;
  modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 hidden';

  const panel = document.createElement('div');
  panel.className = 'bg-slate-900 rounded-xl p-6 shadow-xl border border-slate-800 max-w-sm w-full space-y-3';

  titleEl = document.createElement('h3');
  titleEl.className = 'text-lg font-semibold text-white';
  panel.appendChild(titleEl);

  messageEl = document.createElement('p');
  messageEl.className = 'text-sm text-slate-300';
  panel.appendChild(messageEl);

  const actions = document.createElement('div');
  actions.className = 'flex justify-end gap-3 pt-4';

  cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'px-4 py-2 rounded border border-slate-700 text-sm text-slate-200 hover:bg-slate-800';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => close(false));
  actions.appendChild(cancelBtn);

  confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'px-4 py-2 rounded text-sm text-white bg-indigo-600 hover:bg-indigo-500';
  confirmBtn.addEventListener('click', () => close(true));
  actions.appendChild(confirmBtn);

  panel.appendChild(actions);
  modal.appendChild(panel);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      close(false);
    }
  });
  document.body.appendChild(modal);
}

function close(result) {
  modal.classList.add('hidden');
  if (resolver) {
    resolver(result);
    resolver = null;
  }
}

function setVariant(variant) {
  const base = 'px-4 py-2 rounded text-sm text-white ';
  if (variant === 'danger') {
    confirmBtn.className = base + 'bg-rose-600 hover:bg-rose-500';
    return;
  }
  confirmBtn.className = base + 'bg-indigo-600 hover:bg-indigo-500';
}

export function confirmAction({ title, message, confirmLabel = 'Confirm', variant = 'primary' }) {
  ensureModal();
  titleEl.textContent = title || 'Please Confirm';
  messageEl.textContent = message || 'Are you sure?';
  confirmBtn.textContent = confirmLabel;
  setVariant(variant === 'danger' ? 'danger' : 'primary');
  modal.classList.remove('hidden');
  return new Promise((resolve) => {
    resolver = resolve;
  });
}
