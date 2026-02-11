# Keyboard Package Refactor

Self-contained refactor plan for `packages/keyboard`. No prior context needed.

---

## Package Overview

`@diffgazer/keyboard` provides scoped keyboard handling for a React 19 web app with terminal-style UI. Key files:

```
packages/keyboard/src/
├── keyboard-provider.tsx          # Context provider, scope stack, handler registry
├── keyboard-utils.ts              # matchesHotkey(), isInputElement()
├── use-key.ts                     # Single hotkey registration
├── use-keys.ts                    # Multiple hotkeys → same handler
├── use-scope.ts                   # Push/pop keyboard scope
├── use-navigation.ts              # List navigation (ArrowUp/Down/Home/End/Enter/Space)
├── use-tab-navigation.ts          # Tab list navigation (standalone, no Provider)
├── use-focus-zone.ts              # Multi-zone navigation (filters/list/details)
├── use-keyboard-context.ts        # Context accessor
├── types.ts                       # NavigationRole type
└── internal/
    └── use-dom-navigation-core.ts # DOM query + focus management
```

Consumers are page-level keyboard hooks in `apps/web/src/features/*/hooks/`:
- `use-review-results-keyboard.ts` — review results page (3 zones, ~15 useKey calls)
- `use-providers-keyboard.ts` — providers page (4 zones, ~20 useKey calls)
- `use-history-keyboard.ts` — history page (3 zones, ~5 useKey calls)
- `use-trust-form-keyboard.ts` — trust form
- Plus various settings pages using `useNavigation` + `useKey` directly

---

## Problem 1: Zone-Conditional Key Explosion

### What's happening

Every page with focus zones (filters/list/details) has 15-20+ individual `useKey` calls, each repeating the same `{ enabled: zone === "x" }` condition:

**`apps/web/src/features/providers/hooks/use-providers-keyboard.ts` (lines 91-151):**

```ts
// Input zone (2 calls)
useKey("ArrowDown", () => { setZone("filters"); inputRef.current?.blur(); },
  { enabled: !dialogOpen && inInput, allowInInput: true });
useKey("Escape", () => { setZone("filters"); inputRef.current?.blur(); },
  { enabled: !dialogOpen && inInput, allowInInput: true });

// Filters zone (6 calls)
useKey("ArrowUp", () => { setZone("input"); inputRef.current?.focus(); },
  { enabled: !dialogOpen && inFilters });
useKey("ArrowDown", () => { ... setZone("list"); },
  { enabled: !dialogOpen && inFilters });
useKey("ArrowLeft", () => setFilterIndex(i => Math.max(0, i - 1)),
  { enabled: !dialogOpen && inFilters });
useKey("ArrowRight", () => setFilterIndex(i => Math.min(max, i + 1)),
  { enabled: !dialogOpen && inFilters });
useKey("Enter", () => setFilter(PROVIDER_FILTER_VALUES[filterIndex]),
  { enabled: !dialogOpen && inFilters });
useKey(" ", () => setFilter(PROVIDER_FILTER_VALUES[filterIndex]),
  { enabled: !dialogOpen && inFilters });

// Buttons zone (6 calls)
useKey("ArrowLeft", () => { ... }, { enabled: !dialogOpen && inButtons });
useKey("ArrowRight", () => ..., { enabled: !dialogOpen && inButtons });
useKey("ArrowUp", () => ..., { enabled: !dialogOpen && inButtons });
useKey("ArrowDown", () => ..., { enabled: !dialogOpen && inButtons });
useKey("Enter", () => ..., { enabled: !dialogOpen && inButtons });
useKey(" ", () => ..., { enabled: !dialogOpen && inButtons });

// List zone (1 call)
useKey("ArrowRight", () => { setZone("buttons"); },
  { enabled: !dialogOpen && inZone("list") && !!selectedProvider });

// Global (2 calls)
useKey("Escape", () => navigate({ to: "/settings" }), { enabled: !dialogOpen && !inInput });
useKey("/", () => { setZone("input"); inputRef.current?.focus(); },
  { enabled: !dialogOpen && !inInput });
```

**`apps/web/src/features/review/hooks/use-review-results-keyboard.ts` (lines 107-169):**

Same pattern — `useKey` with `{ enabled: focusZone === "filters" }` repeated 5 times, `{ enabled: focusZone === "details" }` repeated 8 times.

### Why it's bad

- Same `enabled` condition copy-pasted per zone group
- No visual grouping — hard to see which keys belong to which zone
- Easy to typo a zone name or forget `!dialogOpen`
- Adding a key to a zone means copying the full options object again

---

## Problem 2: `useFocusZone` Implementation Issues

### File: `packages/keyboard/src/use-focus-zone.ts`

**Issue A: Controlled/uncontrolled logic duplicated 3 times**

Lines 46-53 (stableTransitions), 62-67 (stableTabCycle), and 86-92 (setZone) all repeat:

```ts
if (isControlled) {
  options.onZoneChange?.(next);
} else {
  setInternalZone(next);
  options.onZoneChange?.(next);
}
```

This should be extracted into a single helper.

**Issue B: `canTransition` called redundantly**

Line 70-71 computes `canTransition(key)` on every render for every arrow key to set `enabled`. Then the handler (line 45-46) calls `transitions()` again. The transition function runs twice per keypress.

```ts
// Line 70-71: called every render, 4 times (once per arrow key)
const canTransition = (key) =>
  options.transitions?.({ zone: currentZone, key }) != null;

// Line 73-76: useKey enabled depends on canTransition
for (const key of ARROW_KEYS) {
  useKey(key, () => stableTransitions(key), {
    enabled: enabled && options.transitions != null && canTransition(key),
  });
}

// Line 45-46: stableTransitions ALSO calls transitions()
const next = options.transitions?.({ zone: currentZone, key });
```

Fix: Remove `canTransition`. Always register the arrow keys (when transitions exist). Let the handler no-op when `next` is null — it already does (`if (next != null && ...)`).

---

## Solution: New `useZoneKeys` Hook

### API

```ts
function useZoneKeys(
  currentZone: string,
  targetZone: string,
  handlers: Record<string, () => void>,
  options?: HandlerOptions & { enabled?: boolean }
): void;
```

- `currentZone` — the active zone, from `useFocusZone().zone`
- `targetZone` — which zone these handlers apply to
- `handlers` — object map of hotkey → handler
- `options` — standard `HandlerOptions` + `enabled` gate

Internally: `useEffect` registers all keys when `currentZone === targetZone && enabled !== false`. Uses `useEffectEvent` for handler stability (same pattern as existing `useKey`).

### Implementation

Create `packages/keyboard/src/use-zone-keys.ts`:

```ts
import { useEffect, useEffectEvent } from "react";
import type { HandlerOptions } from "./keyboard-provider";
import { useKeyboardContext } from "./use-keyboard-context";

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

    const cleanups = Object.keys(handlers).map((key) =>
      register(activeScope, key, () => stableHandlers(key), {
        allowInInput: options?.allowInInput,
        targetRef: options?.targetRef,
        requireFocusWithin: options?.requireFocusWithin,
        preventDefault: options?.preventDefault,
      }),
    );

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
```

### Export

Add to `packages/keyboard/src/index.ts`:

```ts
export { useZoneKeys } from "./use-zone-keys";
export type { UseZoneKeysOptions } from "./use-zone-keys";
```

---

## `useFocusZone` Fixes

### Fix A: Extract `setZoneValue`

Replace the 3 duplicated blocks with one helper using `useEffectEvent`:

```ts
const setZoneValue = useEffectEvent((next: T) => {
  if (!isControlled) setInternalZone(next);
  options.onZoneChange?.(next);
});
```

Then `stableTransitions`, `stableTabCycle`, and `setZone` all call `setZoneValue(next)`.

### Fix B: Remove `canTransition`, simplify arrow key registration

Replace:

```ts
const canTransition = (key: ...) =>
  options.transitions?.({ zone: currentZone, key }) != null;

for (const key of ARROW_KEYS) {
  useKey(key, () => stableTransitions(key), {
    enabled: enabled && options.transitions != null && canTransition(key),
  });
}
```

With:

```ts
for (const key of ARROW_KEYS) {
  useKey(key, () => stableTransitions(key), {
    enabled: enabled && options.transitions != null,
  });
}
```

The handler already no-ops when `transitions()` returns null (line 46: `if (next != null && zones.includes(next))`). No need to pre-check.

### Full refactored `useFocusZone`

```ts
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

  // Single helper for all zone changes (controlled + uncontrolled)
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

  const setZone = (zone: T) => setZoneValue(zone);
  const inZone = (...zones: T[]) => zones.includes(currentZone);

  return { zone: currentZone, setZone, inZone };
}
```

---

## Migration: Consumer Files

### `apps/web/src/features/providers/hooks/use-providers-keyboard.ts`

**Before** (~20 useKey calls):

```ts
import { useKey, useFocusZone } from "@diffgazer/keyboard";

// ... 20+ useKey calls with repeated { enabled: !dialogOpen && inZone }
```

**After** (~5 useZoneKeys blocks + 2 global useKey calls):

```ts
import { useKey, useFocusZone, useZoneKeys } from "@diffgazer/keyboard";

const { zone, setZone, inZone } = useFocusZone({
  initial: "list" as FocusZone,
  zones: ["input", "filters", "list", "buttons"] as const,
  scope: "providers",
  enabled: !dialogOpen,
});

const effectiveFocusZone = (!selectedProvider && zone === "buttons") ? "list" : zone;

useZoneKeys(effectiveFocusZone, "input", {
  ArrowDown: () => { setZone("filters"); inputRef.current?.blur(); },
  Escape: () => { setZone("filters"); inputRef.current?.blur(); },
}, { enabled: !dialogOpen, allowInInput: true });

useZoneKeys(effectiveFocusZone, "filters", {
  ArrowUp: () => { setZone("input"); inputRef.current?.focus(); },
  ArrowDown: () => { if (filteredProviders.length > 0) { setZone("list"); focusBoundaryProvider("first"); } },
  ArrowLeft: () => setFilterIndex((i) => Math.max(0, i - 1)),
  ArrowRight: () => setFilterIndex((i) => Math.min(PROVIDER_FILTER_VALUES.length - 1, i + 1)),
  Enter: () => setFilter(PROVIDER_FILTER_VALUES[filterIndex]),
  " ": () => setFilter(PROVIDER_FILTER_VALUES[filterIndex]),
}, { enabled: !dialogOpen });

useZoneKeys(effectiveFocusZone, "list", {
  ArrowRight: () => {
    if (selectedProvider) { setZone("buttons"); setButtonIndex(getNextButtonIndex(-1, 1)); }
  },
}, { enabled: !dialogOpen });

useZoneKeys(effectiveFocusZone, "buttons", {
  ArrowLeft: () => {
    const next = getNextButtonIndex(buttonIndex, -1);
    if (next === buttonIndex) setZone("list");
    else setButtonIndex(next);
  },
  ArrowRight: () => setButtonIndex((i) => getNextButtonIndex(i, 1)),
  ArrowUp: () => setButtonIndex((i) => getNextButtonIndex(i, -1)),
  ArrowDown: () => setButtonIndex((i) => getNextButtonIndex(i, 1)),
  Enter: () => handleButtonAction(buttonIndex),
  " ": () => handleButtonAction(buttonIndex),
}, { enabled: !dialogOpen });

// Global shortcuts (not zone-specific — keep as useKey)
useKey("Escape", () => navigate({ to: "/settings" }), { enabled: !dialogOpen && effectiveFocusZone !== "input" });
useKey("/", () => { setZone("input"); inputRef.current?.focus(); }, { enabled: !dialogOpen && effectiveFocusZone !== "input" });
```

### `apps/web/src/features/review/hooks/use-review-results-keyboard.ts`

**Before** (~15 useKey calls):

```ts
useKey("ArrowLeft", () => { ... }, { enabled: focusZone === "filters" });
useKey("ArrowRight", () => { ... }, { enabled: focusZone === "filters" });
useKey("j", () => setFocusZone("list"), { enabled: focusZone === "filters" });
useKey("Enter", handleToggle, { enabled: focusZone === "filters" });
useKey(" ", handleToggle, { enabled: focusZone === "filters" });

useKey("ArrowLeft", () => moveTab(-1), { enabled: focusZone === "details" });
useKey("ArrowRight", () => moveTab(1), { enabled: focusZone === "details" });
useKey("ArrowUp", () => scrollDetails(-80), { enabled: focusZone === "details" });
useKey("ArrowDown", () => scrollDetails(80), { enabled: focusZone === "details" });
useKey("1", () => setActiveTab("details"), { enabled: focusZone === "details" });
useKey("2", () => setActiveTab("explain"), { enabled: focusZone === "details" });
useKey("3", () => setActiveTab("trace"), { enabled: focusZone === "details" });
useKey("4", () => setActiveTab("patch"), { enabled: focusZone === "details" && !!patch });
```

**After** (2 useZoneKeys blocks + 1 global useKey):

```ts
const { zone: focusZone } = useFocusZone({ ... });

useZoneKeys(focusZone, "filters", {
  ArrowLeft: () => { if (focusedFilterIndex > 0) setFocusedFilterIndex((i) => i - 1); },
  ArrowRight: () => { if (focusedFilterIndex < SEVERITY_ORDER.length - 1) setFocusedFilterIndex((i) => i + 1); },
  j: () => setFocusZone("list"),
  Enter: handleToggleSeverityFilter,
  " ": handleToggleSeverityFilter,
});

useZoneKeys(focusZone, "details", {
  ArrowLeft: () => moveTab(-1),
  ArrowRight: () => moveTab(1),
  ArrowUp: () => scrollDetails(-80),
  ArrowDown: () => scrollDetails(80),
  "1": () => setActiveTab("details"),
  "2": () => setActiveTab("explain"),
  "3": () => setActiveTab("trace"),
  "4": () => { if (selectedIssue?.suggested_patch) setActiveTab("patch"); },
});

// Global (no zone condition)
useKey("Escape", handleBack);
```

Note: The `"4"` key handler moves the conditional inside the handler instead of on `enabled`. This is acceptable — the handler no-ops when there's no patch. Alternatively, keep it as a separate `useKey` if the enabled gate is important for preventing `event.preventDefault()`.

### `apps/web/src/features/history/hooks/use-history-keyboard.ts`

This file has only ~5 `useKey` calls. Migration is optional — the current code is readable enough. But for consistency:

```ts
const { zone } = useFocusZone({ ... });

// Only 2 zone-specific keys — useKey is fine here, useZoneKeys optional
useKey("/", () => { setFocusZone("search"); searchInputRef.current?.focus(); },
  { enabled: focusZone !== "search" });
useKey("o", navigateToSelectedRun, { enabled: focusZone === "runs" });
useKey(" ", navigateToSelectedRun, { enabled: focusZone === "runs" });
useKey("Escape", () => navigate({ to: "/" }));
```

Verdict: Leave as-is. Only migrate when a file has 5+ zone-gated keys.

---

## What NOT to Change

| Thing | Why |
|---|---|
| `useKey` | Simple, correct, well-used for single keys and global shortcuts |
| `useKeys` (array version) | Only used internally in `useNavigation` for dynamic key arrays like `upKeys: ["ArrowUp", "k"]` — object map doesn't help here |
| `useScope` | Minimal, correct |
| `useTabNavigation` | Standalone, does its job |
| `KeyboardProvider` + scope system | Load-bearing architecture for all keyboard handling |
| `useEffectEvent` usage | Correct React 19 pattern — do NOT regress to `useRef` |
| `useNavigation` (scoped + local modes) | Cross-component coordination via `onBoundaryReached` requires this separation |
| `useDomNavigationCore` | Internal, works correctly |
| UI component APIs (`Menu`, `RadioGroup`, etc.) | They accept `focusedValue`/`onKeyDown` props — this separation is load-bearing because keyboard hooks need cross-component coordination (zone transitions, boundary handling) |
| `keyboard-utils.ts` | Simple, correct |

Do NOT add:
- `useGlobalKeys` (standalone, no Provider) — every consumer uses scoped handling, no use case
- Declarative `<Hotkey>` / `<KeyboardZones>` JSX components — hooks are the right abstraction for side effects
- `renderItem` prop on list components — compound components are idiomatic
- Built-in keyboard navigation in UI components — breaks `onBoundaryReached` wiring

Do NOT export `useKeys` publicly yet — it's only used internally in `useNavigation`.

---

## Tests

### New test file: `packages/keyboard/src/use-zone-keys.test.ts`

Test cases:
1. Fires handler only when `currentZone === targetZone`
2. Does not fire when zone doesn't match
3. Respects `enabled: false` option
4. Re-registers when key set changes (add/remove a key from the object)
5. Calls latest handler without re-registration (useEffectEvent stability)
6. Supports `allowInInput` option passthrough
7. Cleans up all registrations on unmount
8. Cleans up when zone changes away from targetZone

### Existing tests to verify still pass

- `packages/keyboard/src/use-focus-zone.test.ts` — all existing tests must pass after the refactor
- `packages/keyboard/src/keyboard-provider.test.ts` — unchanged, verify passing
- `apps/web/src/components/shared/keyboard-navigation.integration.test.tsx` — unchanged, verify passing
- `apps/web/src/features/review/hooks/use-review-results-keyboard.test.ts` (if exists)
- `apps/web/src/features/providers/hooks/use-providers-keyboard.test.ts` (if exists)

Run: `pnpm --filter @diffgazer/keyboard test` and `pnpm --filter @diffgazer/web test`

---

## Execution Order

1. **Create `use-zone-keys.ts`** + export in `index.ts`
2. **Write tests for `useZoneKeys`** — verify it works before migrating consumers
3. **Refactor `useFocusZone`** — extract `setZoneValue`, remove `canTransition`
4. **Run existing `useFocusZone` tests** — verify no regressions
5. **Migrate `use-providers-keyboard.ts`** — largest consumer, most benefit
6. **Migrate `use-review-results-keyboard.ts`** — second largest
7. **Skip small files** (history, settings pages) — not worth the churn
8. **Run full test suite** — `pnpm --filter @diffgazer/keyboard test && pnpm --filter @diffgazer/web test`
