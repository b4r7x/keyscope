import { useEffect, type RefObject } from "react";

const lockCounts = new WeakMap<Element, number>();

export function useScrollLock(
  target?: RefObject<HTMLElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const el = target?.current ?? document.body;
    const count = lockCounts.get(el) ?? 0;
    const prev = el.style.overflow;

    lockCounts.set(el, count + 1);
    if (count === 0) {
      el.style.overflow = "hidden";
    }

    return () => {
      const current = lockCounts.get(el) ?? 1;
      const next = current - 1;
      if (next <= 0) {
        lockCounts.delete(el);
        el.style.overflow = prev;
      } else {
        lockCounts.set(el, next);
      }
    };
  }, [enabled, target]);
}
