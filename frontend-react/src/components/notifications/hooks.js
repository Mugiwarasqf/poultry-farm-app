import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';

/**
 * Keeps an element mounted long enough to animate out.
 * `mounted` controls rendering; `visible` flips a frame after mount so the
 * enter transition actually runs.
 *
 * @param {boolean} open
 * @param {number} [exitMs]
 */
export function usePresence(open, exitMs = 180) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Two frames: one to mount in the "from" state, one to transition.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(timer);
  }, [open, exitMs]);

  return { mounted, visible };
}

/**
 * Clicking a notification: mark it read, then go to its page if it has one.
 * @param {() => void} [afterOpen]  e.g. close the dropdown.
 */
export function useOpenNotification(afterOpen) {
  const { markRead } = useNotifications();
  const navigate = useNavigate();

  return useCallback(
    (/** @type {import('../../lib/notifications/types').Notification} */ n) => {
      if (!n.read) markRead(n.id);
      if (n.link) {
        afterOpen?.();
        navigate(n.link);
      }
    },
    [markRead, navigate, afterOpen]
  );
}

/**
 * Arrow-key movement between notification rows inside `container`.
 * Up / Down step, Home / End jump. Returns true when it handled the key.
 *
 * @param {import('react').KeyboardEvent} event
 * @param {HTMLElement | null} container
 */
export function moveFocusInList(event, container) {
  if (!container || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return false;
  const items = [...container.querySelectorAll('[data-notification-item]')];
  if (items.length === 0) return false;
  event.preventDefault();
  const index = items.indexOf(/** @type {Element} */ (document.activeElement));
  let next;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = items.length - 1;
  else if (event.key === 'ArrowDown') next = index < 0 ? 0 : Math.min(index + 1, items.length - 1);
  else next = index < 0 ? items.length - 1 : Math.max(index - 1, 0);
  /** @type {HTMLElement} */ (items[next]).focus();
  return true;
}
