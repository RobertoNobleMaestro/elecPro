// Lightweight, accessible toast notifications.
// Region uses aria-live="polite" so screen readers announce messages.

const ICONS = {
  success:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  error:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
};

let region;

function getRegion() {
  if (region) return region;
  region = document.querySelector('.toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  return region;
}

/**
 * Show a transient toast.
 * @param {{type?: 'success'|'error', title?: string, message: string, duration?: number}} opts
 */
export function showToast({ type = 'success', title = '', message, duration = 4500 }) {
  const root = getRegion();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${ICONS[type] || ICONS.success}</span>
    <div class="toast__body">
      ${title ? `<span class="toast__title">${title}</span> ` : ''}<span>${message}</span>
    </div>`;

  root.appendChild(toast);

  const remove = () => {
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  const timer = setTimeout(remove, duration);
  toast.addEventListener('click', () => {
    clearTimeout(timer);
    remove();
  });

  return toast;
}
