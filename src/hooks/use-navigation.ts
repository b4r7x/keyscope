"use client";

import {
  useState,
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
  moveFocus?: boolean;
}

export interface UseNavigationReturn {
  highlighted: string | null;
  isHighlighted: (value: string) => boolean;
  highlight: (value: string) => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

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

function wrapIndex(index: number, length: number, wrap: boolean): number | null {
  if (index < 0) return wrap ? length - 1 : null;
  if (index >= length) return wrap ? 0 : null;
  return index;
}

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
  moveFocus = false,
}: UseNavigationOptions): UseNavigationCoreReturn {
  const [internalValue, setInternalValue] = useState<string | null>(initialValue);
  const isControlled = value !== undefined;
  const highlighted = isControlled ? value ?? null : internalValue;

  const setFocusedValue = (nextValue: string) => {
    if (isControlled) {
      onValueChange?.(nextValue);
    } else {
      setInternalValue(nextValue);
      onValueChange?.(nextValue);
    }
    onHighlightChange?.(nextValue);
  };

  const getElements = () => queryElements(containerRef, role, skipDisabled);

  const getFocusedIndex = (): number => {
    const elements = getElements();
    if (elements.length === 0) return -1;
    if (!highlighted) return 0;
    const index = elements.findIndex((el) => el.dataset.value === highlighted);
    return index >= 0 ? index : 0;
  };

  const focusIndex = (index: number) => {
    const elements = getElements();
    const el = elements[index];
    if (el?.dataset.value) {
      el.scrollIntoView?.({ block: "nearest" });
      if (moveFocus) el.focus();
      setFocusedValue(el.dataset.value);
    }
  };

  const move = (delta: 1 | -1) => {
    const elements = getElements();
    if (elements.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[useNavigation] No elements found matching [role="${role}"]. ` +
          `Ensure each navigable element has an explicit role="${role}" attribute.`,
        );
      }
      return;
    }

    const current = getFocusedIndex();
    const rawNext = current + delta;
    const next = wrapIndex(rawNext, elements.length, wrap);
    if (next === null) {
      onBoundaryReached?.(delta < 0 ? "up" : "down");
      return;
    }

    focusIndex(next);
  };

  const handleSelect = (event: globalThis.KeyboardEvent) => {
    if (highlighted) onSelect?.(highlighted, event);
  };

  const handleEnter = (event: globalThis.KeyboardEvent) => {
    if (highlighted) {
      if (onEnter) onEnter(highlighted, event);
      else onSelect?.(highlighted, event);
    }
  };

  const isHighlighted = (v: string) => highlighted === v;
  const highlight = (v: string) => setFocusedValue(v);

  return { highlighted, isHighlighted, highlight, move, focusIndex, handleSelect, handleEnter, getElements };
}

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

  const onKeyDown = (event: KeyboardEvent) => {
    if (!enabled) return;

    const key = event.key;
    const isMoveKey = resolvedUpKeys.includes(key) || resolvedDownKeys.includes(key);
    const isSpecialKey = key === "Home" || key === "End" || (!options.moveFocus && (key === "Enter" || key === " "));
    if (!isMoveKey && !isSpecialKey) return;

    if (preventDefault) event.preventDefault();

    const nativeEvent = event.nativeEvent;

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
  };

  return { highlighted, isHighlighted, highlight, onKeyDown };
}
