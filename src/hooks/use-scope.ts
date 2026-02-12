import { useEffect } from "react";
import { useKeyboardContext } from "../context/keyboard-context.js";

interface UseScopeOptions {
  enabled?: boolean;
}

export function useScope(name: string, options: UseScopeOptions = {}): void {
  const { enabled = true } = options;
  const { pushScope } = useKeyboardContext();

  useEffect(() => {
    if (!enabled) return;
    return pushScope(name);
  }, [name, pushScope, enabled]);
}
