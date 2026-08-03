import { useState, useCallback, useRef, createContext, useContext } from 'react';

/* ─── Context ─────────────────────────────────────────────────── */
const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

/* ─── Individual Toast ────────────────────────────────────────── */
const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-signal" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-cone" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-meter" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
    </svg>
  ),
};

function ToastItem({ id, type = 'info', title, message, onDismiss }) {
  return (
    <div
      role="alert"
      className="animate-toast-in flex w-full max-w-sm items-start gap-3 rounded-2xl border border-asphalt/10 bg-white p-4 shadow-lift"
    >
      <span className="mt-0.5 shrink-0">{ICONS[type]}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-display text-sm font-semibold text-ink">{title}</p>}
        {message && <p className="mt-0.5 text-xs text-ink/60 leading-relaxed">{message}</p>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-0.5 text-ink/30 hover:text-ink/70 transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Provider ────────────────────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts) => {
    const id = ++counterRef.current;
    const item = typeof opts === 'string' ? { type: 'info', message: opts, id } : { ...opts, id };
    setToasts((prev) => [...prev, item]);
    const duration = item.duration ?? 4000;
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Convenience shortcuts
  toast.success = (msg, opts) => toast({ type: 'success', message: msg, ...opts });
  toast.error   = (msg, opts) => toast({ type: 'error',   message: msg, ...opts });
  toast.info    = (msg, opts) => toast({ type: 'info',    message: msg, ...opts });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast stack — bottom-right corner */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem {...t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
