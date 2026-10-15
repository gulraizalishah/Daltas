import { useCallback, useRef } from 'react';
import type { TouchEvent as RTE } from 'react';

type Options = { onSwipe: (dir: 'next' | 'prev') => void; enabled?: boolean };

/** True when a horizontal swipe starting here already means something else. */
function shouldIgnore(target: EventTarget | null): boolean {
  let node = target as HTMLElement | null;
  while (node && node !== document.body) {
    if (node.dataset && node.dataset.noTabSwipe !== undefined) return true;   // opt-out marker, e.g. the Home card
    if (node.getAttribute && node.getAttribute('role') === 'dialog') return true;
    const tag = node.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    const ox = getComputedStyle(node).overflowX;
    if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 1) return true;  // carousels
    node = node.parentElement;
  }
  return false;
}

export function useSwipeTabs({ onSwipe, enabled = true }: Options) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  const onTouchStart = useCallback((e: RTE) => {
    start.current = null;
    if (!enabled || e.touches.length !== 1) return;
    const t = e.touches[0];
    // leave the browser's own edge-swipe "back" gesture alone
    if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
    if (shouldIgnore(e.target)) return;
    start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, [enabled]);

  const onTouchEnd = useCallback((e: RTE) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    const fastEnough = Date.now() - s.t < 700;
    const farEnough = Math.abs(dx) >= 70;
    const mostlyHorizontal = Math.abs(dx) >= Math.abs(dy) * 1.8;
    if (fastEnough && farEnough && mostlyHorizontal) onSwipe(dx < 0 ? 'next' : 'prev');
  }, [onSwipe]);

  const onTouchCancel = useCallback(() => { start.current = null; }, []);

  return { onTouchStart, onTouchEnd, onTouchCancel };
}