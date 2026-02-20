"use client";

import {
  useState,
  useCallback,
  type RefObject,
  type KeyboardEvent,
} from "react";

export type NavigationRole = "radio" | "checkbox" | "option" | "menuitem" | "button" | "tab";

export interface UseNavigationOptions {
  containerRef: RefObject<HTMLElement | null>;
  role: NavigationRole;
  value?: string | null;
  onValueChange?: (value: string) => void;
  onSelect?: (value: string, event: globalThis.KeyboardEvent) => void;
  onEnter?: (value: string, event: globalThis.KeyboardEvent) => void;
  onHighlightChange?: (value: string) => void;
  wrap?: boolean;
  enabled?: boolean;
  preventDefault?: boolean;
  onBoundaryReached?: (direction: "up" | "down") => void;
  initialValue?: string | null;
  upKeys?: string[];
  downKeys?: string[];
  orientation?: "vertical" | "horizontal";
  skipDisabled?: boolean;
}

export interface UseNavigationReturn {
  highlighted: string | null;
  isHighlighted: (value: string) => boolean;
  highlight: (value: string) => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

/** @internal Core return type — includes movement primitives for composition. */
export interface UseNavigationCoreReturn {
  highlighted: string | null;
  isHighlighted: (value: string) => boolean;
  highlight: (value: string) => void;
  move: (delta: 1 | -1) => void;
  focusIndex: (index: number) => void;
  handleSelect: (event: globalThis.KeyboardEvent) => void;
  handleEnter: (event: globalThis.KeyboardEvent) => void;
  getElements: () => HTMLElement[];
}

function queryElements(
  containerRef: RefObject<HTMLElement | null>,
  role: NavigationRole,
  skipDisabled: boolean,
): HTMLElement[] {
  if (!containerRef.current) return [];
  const selector = skipDisabled
    ? `[role="${role}"]:not([aria-disabled="true"])`
    : `[role="${role}"]`;
  return Array.from(containerRef.current.querySelectorAll<HTMLElement>(selector));
}

/**
 * Core navigation state and movement logic.
 * Used internally by useNavigation and useScopedNavigation.
 * @internal
 */
export function useNavigationCore({
  containerRef,
  role,
  value,
  onValueChange,
  onSelect,
  onEnter,
  onHighlightChange,
  wrap = true,
  onBoundaryReached,
  initialValue = null,
  skipDisabled = true,
}: UseNavigationOptions): UseNavigationCoreReturn {
  const [internalValue, setInternalValue] = useState<string | null>(initialValue);
  const isControlled = value !== undefined;
  const highlighted = isControlled ? value ?? null : internalValue;

  const setFocusedValue = useCallback(
    (nextValue: string) => {
      if (isControlled) {
        onValueChange?.(nextValue);
      } else {
        setInternalValue(nextValue);
        onValueChange?.(nextValue);
      }
      onHighlightChange?.(nextValue);
    },
    [isControlled, onHighlightChange, onValueChange],
  );

  const getElements = useCallback(
    () => queryElements(containerRef, role, skipDisabled),
    [containerRef, role, skipDisabled],
  );

  const getFocusedIndex = useCallback((): number => {
    const elements = getElements();
    if (elements.length === 0) return -1;
    if (!highlighted) return 0;
    const index = elements.findIndex((el) => el.dataset.value === highlighted);
    return index >= 0 ? index : 0;
  }, [getElements, highlighted]);

  const focusIndex = useCallback(
    (index: number) => {
      const elements = getElements();
      const el = elements[index];
      if (el?.dataset.value) {
        el.scrollIntoView?.({ block: "nearest" });
        setFocusedValue(el.dataset.value);
      }
    },
    [getElements, setFocusedValue],
  );

  const move = useCallback(
    (delta: 1 | -1) => {
      const elements = getElements();
      if (elements.length === 0) return;

      const current = getFocusedIndex();
      let next = current + delta;

      if (next < 0) {
        if (wrap) {
          next = elements.length - 1;
        } else {
          onBoundaryReached?.("up");
          return;
        }
      } else if (next >= elements.length) {
        if (wrap) {
          next = 0;
        } else {
          onBoundaryReached?.("down");
          return;
        }
      }

      focusIndex(next);
    },
    [getElements, getFocusedIndex, wrap, onBoundaryReached, focusIndex],
  );

  const handleSelect = useCallback(
    (event: globalThis.KeyboardEvent) => {
      if (highlighted) onSelect?.(highlighted, event);
    },
    [highlighted, onSelect],
  );

  const handleEnter = useCallback(
    (event: globalThis.KeyboardEvent) => {
      if (highlighted) {
        if (onEnter) onEnter(highlighted, event);
        else onSelect?.(highlighted, event);
      }
    },
    [highlighted, onEnter, onSelect],
  );

  const isHighlighted = useCallback((v: string) => highlighted === v, [highlighted]);
  const highlight = useCallback((v: string) => setFocusedValue(v), [setFocusedValue]);

  return { highlighted, isHighlighted, highlight, move, focusIndex, handleSelect, handleEnter, getElements };
}

/**
 * Standalone keyboard navigation for role-based lists.
 * Returns an onKeyDown handler — no KeyboardProvider required.
 */
export function useNavigation(options: UseNavigationOptions): UseNavigationReturn {
  const {
    enabled = true,
    preventDefault = true,
    orientation = "vertical",
    upKeys,
    downKeys,
  } = options;

  const resolvedUpKeys = upKeys ?? (orientation === "vertical" ? ["ArrowUp"] : ["ArrowLeft"]);
  const resolvedDownKeys = downKeys ?? (orientation === "vertical" ? ["ArrowDown"] : ["ArrowRight"]);

  const { highlighted, isHighlighted, highlight, move, focusIndex, handleSelect, handleEnter, getElements } =
    useNavigationCore(options);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const key = event.key;
      const isMoveKey = resolvedUpKeys.includes(key) || resolvedDownKeys.includes(key);
      const isSpecialKey = key === "Home" || key === "End" || key === "Enter" || key === " ";
      if (!isMoveKey && !isSpecialKey) return;

      if (preventDefault) event.preventDefault();

      const nativeEvent = event.nativeEvent as globalThis.KeyboardEvent;

      if (resolvedUpKeys.includes(key)) { move(-1); return; }
      if (resolvedDownKeys.includes(key)) { move(1); return; }

      switch (key) {
        case "Home": focusIndex(0); return;
        case "End": {
          const elements = getElements();
          if (elements.length > 0) focusIndex(elements.length - 1);
          return;
        }
        case "Enter": handleEnter(nativeEvent); return;
        case " ": handleSelect(nativeEvent); return;
      }
    },
    [enabled, preventDefault, resolvedUpKeys, resolvedDownKeys, move, focusIndex, getElements, handleSelect, handleEnter],
  );

  return { highlighted, isHighlighted, highlight, onKeyDown };
}