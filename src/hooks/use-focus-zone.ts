import { useState, useEffectEvent } from "react";
import { useKey } from "./use-key";
import { useScope } from "./use-scope";

type ZoneTransition<T extends string> = (params: {
  zone: T;
  key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Tab";
}) => T | null;

interface UseFocusZoneOptions<T extends string> {
  initial: T;
  zones: readonly T[];
  zone?: T;
  onZoneChange?: (zone: T) => void;
  transitions?: ZoneTransition<T>;
  tabCycle?: readonly T[];
  scope?: string;
  enabled?: boolean;
}

interface UseFocusZoneReturn<T extends string> {
  zone: T;
  setZone: (zone: T) => void;
  inZone: (...zones: T[]) => boolean;
}

const ARROW_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
] as const;

export function useFocusZone<T extends string>(
  options: UseFocusZoneOptions<T>,
): UseFocusZoneReturn<T> {
  const { initial, zones, enabled = true } = options;
  const [internalZone, setInternalZone] = useState<T>(initial);

  const isControlled = options.zone !== undefined;
  const currentZone = isControlled ? options.zone! : internalZone;

  // Single helper for ALL zone changes (controlled + uncontrolled)
  const setZoneValue = useEffectEvent((next: T) => {
    if (!isControlled) setInternalZone(next);
    options.onZoneChange?.(next);
  });

  const stableTransitions = useEffectEvent(
    (key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Tab") => {
      const next = options.transitions?.({ zone: currentZone, key });
      if (next != null && zones.includes(next)) {
        setZoneValue(next);
      }
    },
  );

  const stableTabCycle = useEffectEvent(() => {
    if (!options.tabCycle || options.tabCycle.length === 0) return;
    const cycle = options.tabCycle;
    const idx = cycle.indexOf(currentZone);
    const next = cycle[(idx + 1) % cycle.length]!;
    setZoneValue(next);
  });

  // Arrow keys — handler no-ops when transition returns null
  for (const key of ARROW_KEYS) {
    useKey(key, () => stableTransitions(key), {
      enabled: enabled && options.transitions != null,
    });
  }

  useKey("Tab", stableTabCycle, {
    enabled: enabled && options.tabCycle != null,
    preventDefault: true,
  });

  useScope(options.scope ?? "", { enabled: enabled && options.scope != null });

  return {
    zone: currentZone,
    setZone: (zone: T) => setZoneValue(zone),
    inZone: (...zones: T[]) => zones.includes(currentZone),
  };
}
