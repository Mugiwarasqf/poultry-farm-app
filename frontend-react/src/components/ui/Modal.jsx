import { useEffect, useCallback } from 'react';

export function Modal({ open, isOpen, title, children, actions, onClose }) {
  const isVisible = Boolean(open ?? isOpen);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isVisible, handleKeyDown]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#17191A] rounded-2xl shadow-xl border border-stone-200 dark:border-[#2B3238] p-6 animate-slide-up transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="text-lg font-bold text-stone-900 dark:text-[#F5F7F5] mb-2 font-heading">
            {title}
          </div>
        )}
        <div className="text-sm text-stone-600 dark:text-[#94A3B8] mb-6 leading-relaxed">
          {children}
        </div>
        {actions && (
          <div className="flex items-center justify-end gap-3 pt-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
