import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";
import type { HandlerOptions } from "../providers/keyboard-provider.js";
import { useOptionalKeyboardContext } from "../context/keyboard-context.js";
import { normalizeKeyInput } from "../internal/normalize-key-input.js";

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
  const { handlerMap, options } = normalizeKeyInput<UseKeyOptions>(first, second, third);

  const ctx = useOptionalKeyboardContext();
  const register = ctx?.register ?? null;
  const activeScope = ctx?.activeScope ?? null;

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
    if (!register || !activeScope) return;

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
