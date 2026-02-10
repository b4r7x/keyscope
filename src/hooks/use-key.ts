import { useEffect, useEffectEvent } from "react";
import type { HandlerOptions } from "../providers/keyboard-provider";
import { useKeyboardContext } from "../context/keyboard-context";

interface UseKeyOptions extends HandlerOptions {
  enabled?: boolean;
}

export function useKey(
  hotkey: string,
  handler: () => void,
  options?: UseKeyOptions
): void {
  const { register, activeScope } = useKeyboardContext();

  const stableHandler = useEffectEvent(handler);

  useEffect(() => {
    if (options?.enabled === false) return;
    if (!activeScope) return;
    return register(activeScope, hotkey, stableHandler, options);
  }, [
    register,
    activeScope,
    hotkey,
    options?.enabled,
    options?.allowInInput,
    options?.targetRef,
    options?.requireFocusWithin,
    options?.preventDefault,
  ]);
}
