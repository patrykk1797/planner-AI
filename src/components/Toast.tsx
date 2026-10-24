import React from 'react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  React.useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed top-4 left-4 right-4 max-w-sm mx-auto z-50 liquid-glass px-4 py-3 flex items-center justify-between animate-ios border border-[var(--accent)] shadow-2xl rounded-2xl backdrop-blur-xl"
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <span className="text-base shrink-0">⚡</span>
        <span className="text-xs font-bold txt-main leading-snug">{message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Zamknij powiadomienie"
        className="ml-1 w-6 h-6 flex items-center justify-center text-xs font-bold txt-muted hover:text-white rounded-full bg-white/5 shrink-0"
      >
        ✕
      </button>
    </div>
  );
};
