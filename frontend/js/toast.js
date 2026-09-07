const ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const DURATIONS = {
  error: 6000,
  warning: 5000,
  success: 3500,
  info: 3500,
};

const MAX_VISIBLE_TOASTS = 4;

export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  while (container.children.length >= MAX_VISIBLE_TOASTS) {
    container.firstChild.remove();
  }

  const validType = ICONS[type] ? type : 'info';
  const duration = DURATIONS[validType];

  const toast = document.createElement('div');
  toast.className = `toast toast-${validType}`;

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = ICONS[validType];

  const text = document.createElement('span');
  text.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', 'Dismiss');
  closeBtn.textContent = '✕';

  const progress = document.createElement('div');
  progress.className = 'toast-progress';
  progress.style.animationDuration = `${duration}ms`;

  toast.appendChild(icon);
  toast.appendChild(text);
  toast.appendChild(closeBtn);
  toast.appendChild(progress);
  container.appendChild(toast);

  let remaining = duration;
  let startedAt = Date.now();
  let timer = setTimeout(dismiss, remaining);

  function pause() {
    clearTimeout(timer);
    remaining -= Date.now() - startedAt;
    progress.classList.add('paused');
  }

  function resume() {
    startedAt = Date.now();
    progress.classList.remove('paused');
    timer = setTimeout(dismiss, Math.max(remaining, 0));
  }

  function dismiss() {
    clearTimeout(timer);
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }

  toast.addEventListener('mouseenter', pause);
  toast.addEventListener('mouseleave', resume);
  toast.addEventListener('click', (e) => {
    if (e.target !== closeBtn) dismiss();
  });
  closeBtn.addEventListener('click', dismiss);
}
