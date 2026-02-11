# keyscope — Final Package Specification

Composable, scoped keyboard navigation hooks for React 19. Extracted from `@diffgazer/keyboard` with all identified fixes applied.

---

## What Changes vs Current `@diffgazer/keyboard`

| Change | Type | Why |
|--------|------|-----|
| Add `useZoneKeys` hook | **New** | Eliminates 20+ repetitive `useKey` calls with zone-gated `enabled` |
| Add `mod` key alias | **New** | Cross-platform: Cmd on Mac, Ctrl on Win/Linux |
| Add multi-key grouping in handler maps | **New** | `"Enter \| Space"` → same handler, no duplication |
| Fix `useFocusZone` internals | **Fix** | 3x duplicated controlled/uncontrolled logic → single `setZoneValue` helper |
| Remove `canTransition` pre-check | **Fix** | Redundant — handler already no-ops when transition returns null |
| Export `useZoneKeys` + types | **Export** | New public API |
| Rename package to `keyscope` | **Rename** | Standalone identity for npm |

## What Does NOT Change

| Thing | Why |
|-------|-----|
| `useKey` | Simple, correct, well-used for single keys and global shortcuts |
| `useKeys` (array version) | Internal to `useNavigation` for dynamic key arrays `["ArrowUp", "k"]` — object map doesn't help here |
| `useScope` | Minimal, correct |
| `useNavigation` (scoped + local modes) | Cross-component coordination via `onBoundaryReached` requires separation from UI components |
| `useTabNavigation` | Standalone, does its job |
| `KeyboardProvider` + scope stack | Load-bearing architecture for all keyboard handling |
| `useEffectEvent` usage | Correct React 19 pattern — do NOT regress to `useRef` |
| `useDomNavigationCore` | Internal, works correctly |
| `keyboard-utils.ts` | Simple, correct (only adding `mod` alias) |
| Handler options (`allowInInput`, `targetRef`, `requireFocusWithin`, `preventDefault`) | Complete and correct |
| LIFO handler precedence | Last registered handler wins — correct for scope stacking |

## What NOT to Add

| Thing | Why |
|-------|-----|
| `useGlobalKeys` (standalone, no Provider) | Every consumer uses scoped handling — no use case exists |
| Declarative `<Hotkey>` / `<KeyboardZones>` JSX | Hooks are the right abstraction for side effects |
| `renderItem` prop on list components | Compound components are idiomatic React |
| Built-in keyboard nav in UI components | Breaks `onBoundaryReached` wiring for cross-component coordination |
| Public export of `useKeys` | Only used internally in `useNavigation` — export when there's a real use case |

---

## Public API

```ts
// Provider
export { KeyboardProvider } from "./providers/keyboard-provider";

// Core hooks
export { useKey } from "./hooks/use-key";
export { useZoneKeys } from "./hooks/use-zone-keys";         // NEW
export { useScope } from "./hooks/use-scope";

// Navigation hooks
export { useNavigation } from "./hooks/use-navigation";
export { useTabNavigation } from "./hooks/use-tab-navigation";
export { useFocusZone } from "./hooks/use-focus-zone";

// Utilities
export { keys } from "./utils/keys";                         // NEW - multi-key helper

// Types
export type { HandlerOptions } from "./providers/keyboard-provider";
export type { UseZoneKeysOptions } from "./hooks/use-zone-keys";
export type { NavigationRole } from "./utils/types";
```

---

## New: `useZoneKeys`

### Problem it solves

Page-level keyboard hooks have 15-20+ individual `useKey` calls, each repeating `{ enabled: zone === "x" }`:

```ts
// BEFORE: 20+ lines of this
useKey("ArrowUp", handler, { enabled: !dialogOpen && zone === "filters" });
useKey("ArrowDown", handler, { enabled: !dialogOpen && zone === "filters" });
useKey("ArrowLeft", handler, { enabled: !dialogOpen && zone === "filters" });
useKey("ArrowRight", handler, { enabled: !dialogOpen && zone === "filters" });
useKey("Enter", handler, { enabled: !dialogOpen && zone === "filters" });
useKey(" ", handler, { enabled: !dialogOpen && zone === "filters" });
// ... 14 more for other zones
```

### API

```ts
function useZoneKeys(
  currentZone: string,
  targetZone: string,
  handlers: Record<string, () => void>,
  options?: UseZoneKeysOptions,
): void;

interface UseZoneKeysOptions extends HandlerOptions {
  enabled?: boolean;
}
```

- `currentZone` — active zone, from `useFocusZone().zone` (no external `useState` needed)
- `targetZone` — which zone these handlers apply to
- `handlers` — object map of hotkey → handler
- `options` — standard handler options + `enabled` gate

### Implementation

```ts
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

### Usage pattern (no external state)

`useFocusZone` manages all zone state internally. `useZoneKeys` reads the zone from `useFocusZone`'s return value — no separate `useState` needed:

```ts
// useFocusZone is the SINGLE source of truth for zone state
const { zone, setZone, inZone } = useFocusZone({
  initial: "list",
  zones: ["filters", "list", "details"] as const,
  scope: "review",
});

// zone comes from useFocusZone — no external useState
useZoneKeys(zone, "filters", {
  ArrowLeft: () => moveFocusedFilter(-1),
  ArrowRight: () => moveFocusedFilter(1),
  Enter: handleToggleSeverityFilter,
  " ": handleToggleSeverityFilter,
  j: () => setZone("list"),
});

useZoneKeys(zone, "list", {
  Enter: () => openSelectedIssue(),
});

useZoneKeys(zone, "details", {
  ArrowLeft: () => moveTab(-1),
  ArrowRight: () => moveTab(1),
  ArrowUp: () => scrollDetails(-80),
  ArrowDown: () => scrollDetails(80),
  "1": () => setActiveTab("details"),
  "2": () => setActiveTab("explain"),
  "3": () => setActiveTab("trace"),
  "4": () => { if (patch) setActiveTab("patch"); },
});

// Global shortcuts that don't belong to a zone — keep as useKey
useKey("Escape", handleBack);
```

### When to use useZoneKeys vs useKey

| Situation | Use |
|-----------|-----|
| 3+ keys gated on the same zone condition | `useZoneKeys` |
| 1-2 zone-gated keys | `useKey` with `enabled` — not worth a zone block |
| Global shortcuts (no zone condition) | `useKey` |
| Hooks with < 5 useKey calls total | `useKey` — useZoneKeys adds no value |

---

## New: Multi-Key Handler Grouping

### Problem

Many actions share Enter + Space handlers:

```ts
useZoneKeys(zone, "filters", {
  Enter: applyFilter,    // same handler
  " ": applyFilter,      // duplicated
});
```

### Solution: Pipe syntax in key strings

Keys separated by ` | ` trigger the same handler:

```ts
useZoneKeys(zone, "filters", {
  "Enter | Space": applyFilter,       // Enter OR Space
  "ArrowLeft": () => moveFilter(-1),
  "ArrowRight": () => moveFilter(1),
});
```

Implementation: `useZoneKeys` splits keys on ` | `, normalizes aliases, and registers each as a separate handler:

```ts
// Inside useZoneKeys, when processing handler keys:
for (const [keySpec, handler] of Object.entries(handlers)) {
  const individualKeys = keySpec.split(" | ").map(k => k.trim());
  for (const key of individualKeys) {
    register(activeScope, key, () => stableHandlers(keySpec), options);
  }
}
```

**Key aliases in pipe syntax:**
- `Space` → `" "` (the literal space character)
- Standard aliases from `matchesHotkey` also apply (`esc` → `escape`, etc.)

### Alternative: `keys()` helper for composition

For building handler maps programmatically:

```ts
import { keys } from "keyscope";

useZoneKeys(zone, "filters", {
  ...keys(["Enter", " "], applyFilter),
  // Expands to: { Enter: applyFilter, " ": applyFilter }
  ArrowLeft: () => moveFilter(-1),
  ArrowRight: () => moveFilter(1),
});
```

Implementation:

```ts
export function keys(
  hotkeys: readonly string[],
  handler: () => void,
): Record<string, () => void> {
  return Object.fromEntries(hotkeys.map(key => [key, handler]));
}
```

Both approaches are valid. Pipe syntax is cleaner for inline usage. `keys()` helper is better for programmatic composition.

---

## New: `mod` Key Alias

### Problem

Cross-platform apps need `Cmd+K` on Mac and `Ctrl+K` on Windows/Linux. Currently you'd write two separate handlers or detect platform yourself.

### Solution

Add `mod` alias to `matchesHotkey()`:

```ts
useKey("mod+k", openCommandPalette);
// Mac: Cmd+K
// Windows/Linux: Ctrl+K
```

Implementation in `keyboard-utils.ts`:

```ts
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export function matchesHotkey(event: KeyboardEvent, hotkey: string): boolean {
  const parts = hotkey.toLowerCase().split("+");
  const key = parts.pop() ?? "";
  const mods = new Set(parts);

  // Expand "mod" to platform-specific modifier
  if (mods.has("mod")) {
    mods.delete("mod");
    if (isMac) mods.add("meta");
    else mods.add("ctrl");
  }

  const normalizedKey = KEY_ALIASES[key] ?? key;
  const eventKey = event.key.toLowerCase();

  return (
    eventKey === normalizedKey &&
    event.ctrlKey === mods.has("ctrl") &&
    event.metaKey === mods.has("meta") &&
    event.shiftKey === mods.has("shift") &&
    event.altKey === mods.has("alt")
  );
}
```

### Key alias table (complete)

| Alias | Resolves to |
|-------|-------------|
| `mod` | `meta` (Mac) / `ctrl` (Win/Linux) |
| `up` | `arrowup` |
| `down` | `arrowdown` |
| `left` | `arrowleft` |
| `right` | `arrowright` |
| `esc` | `escape` |
| `space` | `" "` |

---

## Fix: `useFocusZone` Internals

### Fix A: Extract `setZoneValue` (deduplicate 3x controlled/uncontrolled logic)

Current code has this block repeated 3 times (in `stableTransitions`, `stableTabCycle`, and `setZone`):

```ts
if (isControlled) {
  options.onZoneChange?.(next);
} else {
  setInternalZone(next);
  options.onZoneChange?.(next);
}
```

Extract into one helper:

```ts
const setZoneValue = useEffectEvent((next: T) => {
  if (!isControlled) setInternalZone(next);
  options.onZoneChange?.(next);
});
```

Then all three callers just call `setZoneValue(next)`.

### Fix B: Remove `canTransition` pre-check

Current code pre-checks `canTransition(key)` on every render for every arrow key, then the handler calls `transitions()` again. The transition function runs twice per keypress.

```ts
// REMOVE this:
const canTransition = (key) =>
  options.transitions?.({ zone: currentZone, key }) != null;

for (const key of ARROW_KEYS) {
  useKey(key, () => stableTransitions(key), {
    enabled: enabled && options.transitions != null && canTransition(key),
  });
}

// REPLACE with:
for (const key of ARROW_KEYS) {
  useKey(key, () => stableTransitions(key), {
    enabled: enabled && options.transitions != null,
  });
}
```

The handler already no-ops when `transitions()` returns null (line: `if (next != null && zones.includes(next))`).

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
```

---

## Unchanged Hooks (Reference)

### `useKey`

```ts
function useKey(
  hotkey: string,
  handler: () => void,
  options?: {
    enabled?: boolean;
    allowInInput?: boolean;
    preventDefault?: boolean;
    targetRef?: React.RefObject<HTMLElement>;
    requireFocusWithin?: boolean;
  }
): void;
```

Uses `useEffectEvent` for handler stability. Registers in active scope via `KeyboardProvider`.

### `useKeys` (internal, not exported)

```ts
function useKeys(
  keys: readonly string[],
  handler: (key: string, index: number) => void,
  options?: UseKeysOptions
): void;
```

Only used inside `useNavigation` for dynamic key arrays like `["ArrowUp", "k"]`. Object map doesn't help this use case.

### `useScope`

```ts
function useScope(name: string, options?: { enabled?: boolean }): void;
```

Pushes scope onto stack when enabled, pops on unmount.

### `useNavigation`

```ts
function useNavigation(options: {
  containerRef: React.RefObject<HTMLElement>;
  role: NavigationRole;
  value?: string;
  onValueChange?: (value: string) => void;
  onSelect?: () => void;
  onEnter?: (value: string) => void;
  onFocusChange?: (value: string) => void;
  onBoundaryReached?: (direction: "start" | "end") => void;
  wrap?: boolean;
  enabled?: boolean;
  initialValue?: string;
  upKeys?: string[];
  downKeys?: string[];
}): {
  focusedValue: string | null;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  isFocused: (value: string) => boolean;
  focus: (value: string) => void;
};
```

Two modes: scoped (uses provider) and local (returns `onKeyDown`). Queries DOM for `[role="${role}"]:not([aria-disabled="true"])` elements.

### `useTabNavigation`

```ts
function useTabNavigation(
  tabCount: number,
  options?: { loop?: boolean; manual?: boolean; onActivate?: (index: number) => void }
): {
  activeTab: number;
  selectedTab: number;
  setSelectedTab: (index: number) => void;
  getTabProps: (index: number) => object;
  getPanelProps: (index: number) => object;
};
```

Standalone (no Provider required). Manages tab panels with arrow key navigation.

### `KeyboardProvider`

```ts
function KeyboardProvider({ children }: { children: ReactNode }): JSX.Element;
```

Scope stack architecture. Handlers registered per scope. LIFO precedence (last registered wins). Input elements filtered by default. `queueMicrotask` for scope cleanup.

---

## File Structure

```
keyscope/
├── src/
│   ├── providers/
│   │   └── keyboard-provider.tsx    # Context provider, scope stack, handler registry
│   ├── context/
│   │   └── keyboard-context.ts      # Context accessor (useKeyboardContext)
│   ├── hooks/
│   │   ├── use-key.ts               # Single hotkey registration
│   │   ├── use-keys.ts              # Multiple hotkeys → same handler (internal)
│   │   ├── use-zone-keys.ts         # NEW: Zone-based handler map
│   │   ├── use-scope.ts             # Push/pop keyboard scope
│   │   ├── use-navigation.ts        # List navigation (arrows/Home/End/Enter/Space)
│   │   ├── use-tab-navigation.ts    # Tab list navigation (standalone)
│   │   └── use-focus-zone.ts        # Multi-zone focus management (FIXED)
│   ├── utils/
│   │   ├── keyboard-utils.ts        # matchesHotkey() (+ mod alias), isInputElement()
│   │   ├── keys.ts                  # NEW: keys() multi-key helper
│   │   └── types.ts                 # NavigationRole type
│   ├── internal/
│   │   └── use-dom-navigation-core.ts  # DOM query + focus management
│   └── index.ts                     # Public exports
├── package.json
├── tsconfig.json
└── README.md
```

---

## Migration Examples

### `use-providers-keyboard.ts` (20+ useKey → 4 useZoneKeys + 2 useKey)

**Before** (~23 useKey calls, ~60 lines of key registration):

```ts
import { useKey, useFocusZone } from "@diffgazer/keyboard";

const { zone, setZone, inZone } = useFocusZone({ ... });

// Input zone (2 calls)
useKey("ArrowDown", () => { setZone("filters"); inputRef.current?.blur(); },
  { enabled: !dialogOpen && inZone("input"), allowInInput: true });
useKey("Escape", () => { setZone("filters"); inputRef.current?.blur(); },
  { enabled: !dialogOpen && inZone("input"), allowInInput: true });

// Filters zone (6 calls)
useKey("ArrowUp", () => { setZone("input"); inputRef.current?.focus(); },
  { enabled: !dialogOpen && inZone("filters") });
useKey("ArrowDown", () => { ... setZone("list"); },
  { enabled: !dialogOpen && inZone("filters") });
useKey("ArrowLeft", () => setFilterIndex(i => Math.max(0, i - 1)),
  { enabled: !dialogOpen && inZone("filters") });
useKey("ArrowRight", () => setFilterIndex(i => Math.min(max, i + 1)),
  { enabled: !dialogOpen && inZone("filters") });
useKey("Enter", () => setFilter(VALUES[filterIndex]),
  { enabled: !dialogOpen && inZone("filters") });
useKey(" ", () => setFilter(VALUES[filterIndex]),
  { enabled: !dialogOpen && inZone("filters") });

// Buttons zone (6 calls) ...
// List zone (1 call) ...
// Global (2 calls) ...
```

**After** (~30 lines, visually grouped by zone):

```ts
import { useKey, useFocusZone, useZoneKeys } from "keyscope";

const { zone, setZone, inZone } = useFocusZone({
  initial: "list",
  zones: ["input", "filters", "list", "buttons"] as const,
  scope: "providers",
  enabled: !dialogOpen,
});

useZoneKeys(zone, "input", {
  ArrowDown: () => { setZone("filters"); inputRef.current?.blur(); },
  Escape: () => { setZone("filters"); inputRef.current?.blur(); },
}, { enabled: !dialogOpen, allowInInput: true });

useZoneKeys(zone, "filters", {
  ArrowUp: () => { setZone("input"); inputRef.current?.focus(); },
  ArrowDown: () => { if (filteredProviders.length > 0) { setZone("list"); focusBoundary("first"); } },
  ArrowLeft: () => setFilterIndex((i) => Math.max(0, i - 1)),
  ArrowRight: () => setFilterIndex((i) => Math.min(max, i + 1)),
  "Enter | Space": () => setFilter(VALUES[filterIndex]),
}, { enabled: !dialogOpen });

useZoneKeys(zone, "list", {
  ArrowRight: () => { if (selectedProvider) { setZone("buttons"); setButtonIndex(getNext(-1, 1)); } },
}, { enabled: !dialogOpen });

useZoneKeys(zone, "buttons", {
  ArrowLeft: () => { const n = getNext(buttonIndex, -1); n === buttonIndex ? setZone("list") : setButtonIndex(n); },
  ArrowRight: () => setButtonIndex((i) => getNext(i, 1)),
  ArrowUp: () => setButtonIndex((i) => getNext(i, -1)),
  ArrowDown: () => setButtonIndex((i) => getNext(i, 1)),
  "Enter | Space": () => handleButtonAction(buttonIndex),
}, { enabled: !dialogOpen });

// Global shortcuts — not zone-specific, keep as useKey
useKey("Escape", () => navigate({ to: "/settings" }), { enabled: !dialogOpen && !inZone("input") });
useKey("/", () => { setZone("input"); inputRef.current?.focus(); }, { enabled: !dialogOpen && !inZone("input") });
```

### `use-review-results-keyboard.ts` (15+ useKey → 2 useZoneKeys + 1 useKey)

**After:**

```ts
const { zone, setZone } = useFocusZone({
  initial: "list",
  zones: ["filters", "list", "details"] as const,
  scope: "review",
});

useZoneKeys(zone, "filters", {
  ArrowLeft: () => setFocusedFilterIndex((i) => Math.max(0, i - 1)),
  ArrowRight: () => setFocusedFilterIndex((i) => Math.min(SEVERITY_ORDER.length - 1, i + 1)),
  "Enter | Space": handleToggleSeverityFilter,
  j: () => setZone("list"),
});

useZoneKeys(zone, "details", {
  ArrowLeft: () => moveTab(-1),
  ArrowRight: () => moveTab(1),
  ArrowUp: () => scrollDetails(-80),
  ArrowDown: () => scrollDetails(80),
  "1": () => setActiveTab("details"),
  "2": () => setActiveTab("explain"),
  "3": () => setActiveTab("trace"),
  "4": () => { if (selectedIssue?.suggested_patch) setActiveTab("patch"); },
});

useKey("Escape", handleBack);
```

### When NOT to migrate

Files with < 5 `useKey` calls (e.g., `use-history-keyboard.ts`, `use-trust-form-keyboard.ts`) — leave as-is. The current code is readable enough and useZoneKeys adds no value at that scale.

---

## Tests for `useZoneKeys`

### Test cases

1. Fires handler only when `currentZone === targetZone`
2. Does not fire when zone doesn't match
3. Respects `enabled: false` option
4. Re-registers when key set changes (add/remove a key from the map)
5. Calls latest handler without re-registration (useEffectEvent stability)
6. Supports `allowInInput` option passthrough
7. Cleans up all registrations on unmount
8. Cleans up when zone changes away from targetZone
9. Multi-key syntax: `"Enter | Space"` registers both keys
10. Multi-key: both keys trigger the same handler

### Existing tests to verify

- `use-focus-zone.test.ts` — all existing tests must pass after refactor
- `keyboard-provider.test.ts` — unchanged
- Integration tests — unchanged

---

## NPM Configuration

```json
{
  "name": "keyscope",
  "version": "1.0.0",
  "description": "Composable, scoped keyboard navigation hooks for React",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "files": ["dist"],
  "publishConfig": {
    "access": "public"
  },
  "keywords": [
    "react", "keyboard", "hotkeys", "shortcuts",
    "navigation", "focus", "accessibility", "a11y",
    "scoped", "zones"
  ],
  "license": "MIT"
}
```

**Note:** React 19+ only (uses `useEffectEvent`). No React 18 support — `useEffectEvent` is not available in 18.
