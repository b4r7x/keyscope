"use client";

import { useEffect, type RefObject } from "react";

const lockCounts = new WeakMap<Element, number>();
const savedOverflow = new WeakMap<Element, string>();

export function useScrollLock(
  target?: RefObject<HTMLElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const el = target?.current ?? document.body;
    const count = lockCounts.get(el) ?? 0;

    if (count === 0) {
      savedOverflow.set(el, el.style.overflow);
      el.style.overflow = "hidden";
    }
    lockCounts.set(el, count + 1);

    return () => {
      const current = lockCounts.get(el) ?? 1;
      const next = current - 1;
      if (next <= 0) {
        lockCounts.delete(el);
        el.style.overflow = savedOverflow.get(el) ?? "";
        savedOverflow.delete(el);
      } else {
        lockCounts.set(el, next);
      }
    };
  }, [enabled]);
}