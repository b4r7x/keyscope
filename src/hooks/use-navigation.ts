import { useEffectEvent, type RefObject, type KeyboardEvent } from "react";
import { useKey } from "./use-key.js";
import { useDomNavigationCore } from "../internal/use-dom-navigation-core.js";
import { keys } from "../utils/keys.js";
import type { NavigationRole } from "../utils/types.js";

interface UseNavigationBaseOptions {
  containerRef: RefObject<HTMLElement | null>;
  role: NavigationRole;
  value?: string | null;
  onValueChange?: (value: string) => void;
  onSelect?: (value: string, event: globalThis.KeyboardEvent) => void;
  onEnter?: (value: string, event: globalThis.KeyboardEvent) => void;
  onFocusChange?: (value: string) => void;
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

interface UseScopedNavigationOptions extends UseNavigationBaseOptions {
  mode?: "scoped";
  requireFocusWithin?: boolean;
}

interface UseLocalNavigationOptions extends UseNavigationBaseOptions {
  mode: "local";
}

export type UseNavigationOptions =
  | UseScopedNavigationOptions
  | UseLocalNavigationOptions;

export interface UseNavigationReturn {
  focusedValue: string | null;
  isFocused: (value: string) => boolean;
  focus: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
}

export function useNavigation(options: UseLocalNavigationOptions): UseNavigationReturn & { onKeyDown: (event: KeyboardEvent) => void };
export function useNavigation(options: UseScopedNavigationOptions): UseNavigationReturn & { onKeyDown?: undefined };
export function useNavigation(options: UseNavigationOptions): UseNavigationReturn;
export function useNavigation({
  containerRef,
  role,
  value,
  onValueChange,
  onSelect,
  onEnter,
  onFocusChange,
  wrap = true,
  enabled = true,
  preventDefault: preventDefaultOpt = true,
  onBoundaryReached,
  initialValue = null,
  orientation = "vertical",
  upKeys = orientation === "vertical" ? ["ArrowUp"] : ["ArrowLeft"],
  downKeys = orientation === "vertical" ? ["ArrowDown"] : ["ArrowRight"],
  skipDisabled,
  ...rest
}: UseNavigationOptions): UseNavigationReturn {
  const mode = "mode" in rest ? rest.mode ?? "scoped" : "scoped";
  const isScoped = mode === "scoped";
  const requireFocusWithin = "requireFocusWithin" in rest ? rest.requireFocusWithin : false;

  const { focusedValue, isFocused, focus, move, focusIndex, handleSelect, handleEnter, getElements } =
    useDomNavigationCore({
      containerRef,
      role,
      value,
      onValueChange,
      onSelect,
      onEnter,
      onFocusChange,
      wrap,
      onBoundaryReached,
      initialValue,
      skipDisabled,
    });

  // Shared key→action dispatch (used by both scoped and local modes)
  const dispatch = useEffectEvent((key: string, nativeEvent: globalThis.KeyboardEvent) => {
    if (upKeys.includes(key)) { move(-1); return; }
    if (downKeys.includes(key)) { move(1); return; }
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

  // Scoped mode: register keys via KeyboardProvider
  const scopedEnabled = enabled && isScoped;
  const keyOptions = {
    enabled: scopedEnabled,
    preventDefault: preventDefaultOpt,
    targetRef: containerRef,
    requireFocusWithin,
  } as const;

  useKey(
    {
      ...keys(upKeys, (e) => dispatch(e.key, e)),
      ...keys(downKeys, (e) => dispatch(e.key, e)),
      Home: (e) => dispatch("Home", e),
      End: (e) => dispatch("End", e),
      Enter: (e) => dispatch("Enter", e),
      " ": dispatch.bind(null, " "),
    },
    keyOptions,
  );

  const onKeyDown = (event: KeyboardEvent) => {
    if (!enabled) return;
    const key = event.key;
    const handled = upKeys.includes(key) || downKeys.includes(key)
      || key === "Home" || key === "End" || key === "Enter" || key === " ";
    if (!handled) return;
    if (preventDefaultOpt) event.preventDefault();
    dispatch(key, event.nativeEvent);
  };

  if (!isScoped) {
    return { focusedValue, isFocused, focus, onKeyDown };
  }

  return { focusedValue, isFocused, focus };
}
