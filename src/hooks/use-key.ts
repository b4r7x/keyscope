import { useEffect, useEffectEvent } from "react";
import type { HandlerOptions } from "../providers/keyboard-provider.js";
import { useKeyboardContext } from "../context/keyboard-context.js";
import type { RefObject } from "react";

export interface UseKeyOptions {
  enabled?: boolean;
  allowInInput?: boolean;
  targetRef?: RefObject<HTMLElement | null>;
  requireFocusWithin?: boolean;
  preventDefault?: boolean;
}

type KeyHandler = (event: KeyboardEvent) => void;

// Overload 1: Single key + handler
export function useKey(
  hotkey: string,
  handler: KeyHandler,
  options?: UseKeyOptions,
): void;

// Overload 2: Array of keys → same handler
export function useKey(
  hotkeys: readonly string[],
  handler: KeyHandler,
  options?: UseKeyOptions,
): void;

// Overload 3: Key map → different handlers
export function useKey(
  handlers: Record<string, KeyHandler>,
  options?: UseKeyOptions,
): void;

// Implementation
export function useKey(
  first: string | readonly string[] | Record<string, KeyHandler>,
  second?: KeyHandler | UseKeyOptions,
  third?: UseKeyOptions,
): void {
  // Normalize all forms into a key map and options
  let handlerMap: Record<string, KeyHandler>;
  let options: UseKeyOptions | undefined;

  if (typeof first === "string") {
    // Overload 1: single key
    handlerMap = { [first]: second as KeyHandler };
    options = third;
  } else if (Array.isArray(first)) {
    // Overload 2: array of keys
    const handler = second as KeyHandler;
    handlerMap = Object.fromEntries(
      (first as readonly string[]).map((k) => [k, handler]),
    );
    options = third;
  } else {
    // Overload 3: key map
    handlerMap = first as Record<string, KeyHandler>;
    options = second as UseKeyOptions | undefined;
  }

  const { register, activeScope } = useKeyboardContext();

  const stableDispatch = useEffectEvent((key: string, event: KeyboardEvent) => {
    handlerMap[key]?.(event);
  });

  const keysKey = Object.keys(handlerMap).sort().join(",");

  const handlerOptions: HandlerOptions | undefined =
    options?.allowInInput !== undefined ||
    options?.targetRef !== undefined ||
    options?.requireFocusWithin !== undefined ||
    options?.preventDefault !== undefined
      ? {
          allowInInput: options?.allowInInput,
          targetRef: options?.targetRef,
          requireFocusWithin: options?.requireFocusWithin,
          preventDefault: options?.preventDefault,
        }
      : undefined;

  useEffect(() => {
    if (options?.enabled === false) return;
    if (!activeScope) return;

    const keys = keysKey.split(",");
    const cleanups = keys.map((key) =>
      register(
        activeScope,
        key,
        (event: KeyboardEvent) => stableDispatch(key, event),
        handlerOptions,
      ),
    );

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [
    register,
    activeScope,
    keysKey,
    options?.enabled,
    options?.allowInInput,
    options?.targetRef,
    options?.requireFocusWithin,
    options?.preventDefault,
  ]);
}
