import { useEffectEvent } from "react";
import {
  useNavigationCore,
  type UseNavigationOptions,
  type NavigationRole,
} from "./use-navigation.js";
import { useKey } from "./use-key.js";
import { keys } from "../utils/keys.js";

export interface UseScopedNavigationOptions extends UseNavigationOptions {
  requireFocusWithin?: boolean;
}

export interface UseScopedNavigationReturn {
  highlighted: string | null;
  isHighlighted: (value: string) => boolean;
  highlight: (value: string) => void;
}

/**
 * Scoped keyboard navigation — registers keys via KeyboardProvider.
 * Use when you need scope-aware navigation (e.g., modals, panels).
 * Requires a <KeyboardProvider> ancestor.
 */
export function useScopedNavigation(options: UseScopedNavigationOptions): UseScopedNavigationReturn {
  const {
    enabled = true,
    preventDefault = true,
    requireFocusWithin = false,
    orientation = "vertical",
    upKeys,
    downKeys,
    containerRef,
  } = options;

  const resolvedUpKeys = upKeys ?? (orientation === "vertical" ? ["ArrowUp"] : ["ArrowLeft"]);
  const resolvedDownKeys = downKeys ?? (orientation === "vertical" ? ["ArrowDown"] : ["ArrowRight"]);

  const { highlighted, isHighlighted, highlight, move, focusIndex, handleSelect, handleEnter, getElements } =
    useNavigationCore(options);

  const dispatch = useEffectEvent((key: string, nativeEvent: globalThis.KeyboardEvent) => {
    if (resolvedUpKeys.includes(key)) { move(-1); return; }
    if (resolvedDownKeys.includes(key)) { move(1); return; }
    switch (key) {
      case "Home": focusIndex(0); break;
      case "End": {
        const elements = getElements();
        if (elements.length > 0) focusIndex(elements.length - 1);
        break;
      }
      case "Enter": handleEnter(nativeEvent); break;
      case " ": handleSelect(nativeEvent); break;
    }
  });

  useKey(
    {
      ...keys(resolvedUpKeys, (e) => dispatch(e.key, e)),
      ...keys(resolvedDownKeys, (e) => dispatch(e.key, e)),
      Home: (e) => dispatch("Home", e),
      End: (e) => dispatch("End", e),
      Enter: (e) => dispatch("Enter", e),
      " ": dispatch.bind(null, " "),
    },
    {
      enabled,
      preventDefault,
      targetRef: containerRef,
      requireFocusWithin,
    },
  );

  return { highlighted, isHighlighted, highlight };
}

export type { NavigationRole, UseNavigationOptions } from "./use-navigation.js";
