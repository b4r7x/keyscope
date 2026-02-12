import { useState, useEffectEvent } from "react";
import { useKey } from "./use-key.js";
import type { UseKeyOptions } from "./use-key.js";
import { useScope } from "./use-scope.js";
import { keys } from "../utils/keys.js";

type ZoneTransition<T extends string> = (params: {
  zone: T;
  key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Tab";
}) => T | null;

interface UseFocusZoneOptions<T extends string> {
  initial: T;
  zones: readonly T[];
  zone?: T;
  onZoneChange?: (zone: T) => void;
  onLeaveZone?: (zone: T) => void;
  onEnterZone?: (zone: T) => void;
  transitions?: ZoneTransition<T>;
  tabCycle?: readonly T[];
  scope?: string;
  enabled?: boolean;
}

interface UseFocusZoneReturn<T extends string> {
  zone: T;
  setZone: (zone: T) => void;
  inZone: (...zones: T[]) => boolean;
  forZone: (target: T, extra?: UseKeyOptions) => UseKeyOptions;
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
    if (next === currentZone) return;
    options.onLeaveZone?.(currentZone);
    options.onEnterZone?.(next);
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

  const stableTabCycleReverse = useEffectEvent(() => {
    if (!options.tabCycle || options.tabCycle.length === 0) return;
    const cycle = options.tabCycle;
    const idx = cycle.indexOf(currentZone);
    const next = cycle[(idx - 1 + cycle.length) % cycle.length]!;
    setZoneValue(next);
  });

  // Arrow keys — single useKey call with object overload (no hook-in-loop)
  useKey(
    keys(ARROW_KEYS, (e) => stableTransitions(e.key as typeof ARROW_KEYS[number])),
    { enabled: enabled && options.transitions != null },
  );

  useKey("Tab", stableTabCycle, {
    enabled: enabled && options.tabCycle != null,
    preventDefault: true,
  });

  useKey("shift+Tab", stableTabCycleReverse, {
    enabled: enabled && options.tabCycle != null,
    preventDefault: true,
  });

  useScope(options.scope ?? "__noop__", { enabled: enabled && !!options.scope });

  if (!zones.includes(initial)) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[keyscope] useFocusZone: initial zone "${initial}" is not in zones [${zones.join(", ")}]`
      );
    }
  }

  const safeZone = zones.includes(currentZone) ? currentZone : zones[0]!;

  return {
    zone: safeZone,
    setZone: (zone: T) => setZoneValue(zone),
    inZone: (...zones: T[]) => zones.includes(safeZone),
    forZone: (target: T, extra?: UseKeyOptions): UseKeyOptions => ({
      ...extra,
      enabled: safeZone === target && (extra?.enabled ?? true),
    }),
  };
}
