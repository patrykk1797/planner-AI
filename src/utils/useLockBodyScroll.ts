import { useEffect } from 'react';

let activeLockCount = 0;

function unlockBodyScrollCompletely() {
  if (typeof document === 'undefined') return;
  document.body.classList.remove('modal-open');
  document.documentElement.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  document.body.style.position = '';
  document.body.style.touchAction = '';
  document.documentElement.style.touchAction = '';
}

/**
 * Custom hook to lock background body & html scrolling when a modal is active.
 * Uses reference counting so nested or transitioning modals never leave the page scroll-locked.
 */
export function useLockBodyScroll(isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    activeLockCount += 1;
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      activeLockCount = Math.max(0, activeLockCount - 1);
      if (activeLockCount === 0) {
        unlockBodyScrollCompletely();
      }
    };
  }, [isOpen]);
}
