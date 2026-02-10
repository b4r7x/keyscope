import { useEffect, useEffectEvent } from "react";
import type { HandlerOptions } from "../providers/keyboard-provider";
import { useKeyboardContext } from "../context/keyboard-context";

export interface UseZoneKeysOptions extends HandlerOptions {
  enabled?: boolean;
}

export function useZoneKeys(
  currentZone: string,
  targetZone: string,
  handlers: Record<string, () => void>,
  options?: UseZoneKeysOptions,
): void {
  const { register, activeScope } = useKeyboardContext();

  const stableHandlers = useEffectEvent(
    (key: string) => handlers[key]?.(),
  );

  const keysKey = Object.keys(handlers).join(",");
  const isActive = currentZone === targetZone;

  useEffect(() => {
    if (options?.enabled === false) return;
    if (!isActive) return;
    if (!activeScope) return;

    const cleanups: (() => void)[] = [];

    for (const [keySpec] of Object.entries(handlers)) {
      const individualKeys = keySpec.includes(" | ")
        ? keySpec.split(" | ").map((k) => {
            const trimmed = k.trim();
            return trimmed === "Space" ? " " : trimmed;
          })
        : [keySpec];

      for (const key of individualKeys) {
        cleanups.push(
          register(activeScope, key, () => stableHandlers(keySpec), {
            allowInInput: options?.allowInInput,
            targetRef: options?.targetRef,
            requireFocusWithin: options?.requireFocusWithin,
            preventDefault: options?.preventDefault,
          }),
        );
      }
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [
    register,
    activeScope,
    keysKey,
    isActive,
    options?.enabled,
    options?.allowInInput,
    options?.targetRef,
    options?.requireFocusWithin,
    options?.preventDefault,
  ]);
}
