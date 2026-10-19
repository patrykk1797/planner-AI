import React from 'react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed top-4 left-4 right-4 max-w-sm mx-auto z-50 liquid-glass px-4 py-3 flex items-center justify-between animate-ios border border-[var(--accent)]"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">⚡</span>
        <span className="text-xs font-bold txt-main">{message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Zamknij powiadomienie"
        className="ml-2 w-6 h-6 flex items-center justify-center text-xs font-bold txt-muted hover:text-white rounded"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
};
