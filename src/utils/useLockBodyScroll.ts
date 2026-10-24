import { useEffect } from 'react';

/**
 * Custom hook to lock body & html scrolling and touch-actions when a modal is active.
 * Ensures the background is completely frozen and the modal remains centered in the viewport.
 */
export function useLockBodyScroll(isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalTouchAction = document.body.style.touchAction;

    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen]);
}
