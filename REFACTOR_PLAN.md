# keyscope v0.2 — Refactor Plan

## Goal

Unify the hook API surface, fix quality issues, and prepare integration bridge for diff-ui.
No over-engineering. Every change must have a clear reason.

---

## PHASE 1: Unified `useKey` (FOUNDATION — everything depends on this)

### What changes

Replace `useKey` (single key) + `useZoneKeys` (zone-conditional multi-key) with ONE unified `useKey` hook that supports 3 calling conventions via overloads.

### New API

```typescript
// 1. Single key + handler
useKey("Escape", close);
useKey("mod+s", save, { preventDefault: true });

// 2. Array of keys + single handler (replaces pipe syntax "Enter | Space")
useKey(["Enter", " "], activate);

// 3. Key map — different handler per key (replaces useZoneKeys)
useKey({
  ArrowUp: moveUp,
  ArrowDown: moveDown,
  Enter: select,
});

// All overloads accept options
useKey("j", moveDown, { enabled: zone === "list" });
useKey({ ArrowUp: moveUp }, { enabled: zone === "list" });
```

### Type signatures

```typescript
interface UseKeyOptions {
  enabled?: boolean;
  allowInInput?: boolean;
  targetRef?: RefObject<HTMLElement | null>;
  requireFocusWithin?: boolean;
  preventDefault?: boolean;
}

// Overloads
function useKey(hotkey: string, handler: (event: KeyboardEvent) => void, options?: UseKeyOptions): void;
function useKey(hotkeys: readonly string[], handler: (event: KeyboardEvent) => void, options?: UseKeyOptions): void;
function useKey(handlers: Record<string, (event: KeyboardEvent) => void>, options?: UseKeyOptions): void;
```

### Implementation strategy

The unified `useKey` internally normalizes all 3 forms into a `Record<string, handler>` and does a single `useEffect` that registers all keys (similar to current `useZoneKeys` internals, but without zone logic — zone is just `enabled`).

### Files to change

- `src/hooks/use-key.ts` — rewrite with overloads
- `src/hooks/use-zone-keys.ts` — DELETE (replaced by unified useKey)
- `src/index.ts` — remove useZoneKeys export, remove UseZoneKeysOptions export

### Migration for consumers

```typescript
// BEFORE:
useZoneKeys(zone, "list", {
  "Enter | Space": activate,
  ArrowDown: moveDown,
}, { allowInInput: true });

// AFTER:
useKey({
  ...keys(["Enter", " "], activate),
  ArrowDown: moveDown,
}, { enabled: zone === "list", allowInInput: true });

// Or simpler with forZone (Phase 2):
useKey({
  ...keys(["Enter", " "], activate),
  ArrowDown: moveDown,
}, forZone("list"));
```

### What stays the same

- `useKeys` (internal) — still used by `useNavigation`
- Registration mechanism in provider — unchanged
- Scope stack — unchanged
- `keys()` utility — unchanged, becomes more useful

---

## PHASE 2: `useFocusZone` improvements

### 2A: Add `forZone` helper to return value

```typescript
// BEFORE:
const { zone, setZone, inZone } = useFocusZone({ ... });

// AFTER:
const { zone, setZone, inZone, forZone } = useFocusZone({ ... });

// forZone returns UseKeyOptions
useKey({ ArrowUp: moveUp }, forZone("list"));
// equivalent to: useKey({ ArrowUp: moveUp }, { enabled: zone === "list" })
```

Implementation (trivial — just add to return value):

```typescript
return {
  zone: currentZone,
  setZone: (zone: T) => setZoneValue(zone),
  inZone: (...zones: T[]) => zones.includes(currentZone),
  forZone: (target: T): UseKeyOptions => ({ enabled: currentZone === target }),
};
```

### 2B: Fix hook-in-loop (ARROW_KEYS)

Replace the `for` loop calling `useKey` 4 times with unified `useKey` map:

```typescript
// BEFORE (line 67-71):
for (const key of ARROW_KEYS) {
    useKey(key, () => stableTransitions(key), {
      enabled: enabled && options.transitions != null,
    });
}

// AFTER:
useKey(
  Object.fromEntries(ARROW_KEYS.map(k => [k, () => stableTransitions(k)])),
  { enabled: enabled && options.transitions != null },
);
```

### 2C: Update Tab key registration

Same pattern — use unified `useKey` instead of old single-key `useKey`.
No functional change, just uses new API consistently.

### Files to change

- `src/hooks/use-focus-zone.ts` — forZone helper, fix loop, update types

---

## PHASE 3: Provider & utils quality fixes

### 3A: Handler receives KeyboardEvent

Change handler type from `() => void` to `(event: KeyboardEvent) => void`.

```typescript
// keyboard-provider.tsx
type Handler = (event: KeyboardEvent) => void;

// In dispatch (line 86):
entry.handler(event);  // was: entry.handler()
```

This is backwards-compatible — existing `() => void` handlers work fine because JS ignores extra arguments.

### 3B: `preventDefault` default → `false`

Change line 82:

```typescript
// BEFORE:
if (entry.options?.preventDefault !== false) {
    event.preventDefault();
}

// AFTER:
if (entry.options?.preventDefault === true) {
    event.preventDefault();
}
```

**BREAKING CHANGE** — document in changelog. Consumers who relied on implicit preventDefault need to add `{ preventDefault: true }`.

### 3C: Lazy `isMac` detection (SSR safety)

```typescript
// BEFORE (keyboard-utils.ts:10):
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

// AFTER:
let _isMac: boolean | null = null;
function isMac(): boolean {
  if (_isMac === null) {
    _isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
  }
  return _isMac;
}
```

Update `matchesHotkey` to call `isMac()` instead of reading `isMac`.

### 3D: `isWithinTarget` → plain function outside component

Move from inside `KeyboardProvider` (with `useCallback`) to a plain module-level function. It has no closure dependencies.

```typescript
// BEFORE (inside KeyboardProvider, wrapped in useCallback):
const isWithinTarget = useCallback((eventTarget, options) => { ... }, []);

// AFTER (module-level, before KeyboardProvider):
function isWithinTarget(eventTarget: EventTarget | null, options?: HandlerOptions): boolean {
  if (!options?.targetRef || !options.requireFocusWithin) return true;
  const targetElement = options.targetRef.current;
  if (!targetElement || !(eventTarget instanceof Node)) return false;
  return targetElement.contains(eventTarget);
}
```

Remove from `useEffect` dependency array too.

### Files to change

- `src/providers/keyboard-provider.tsx` — handler type, preventDefault, isWithinTarget
- `src/utils/keyboard-utils.ts` — lazy isMac

---

## PHASE 4: Tests

### Strategy

Every phase above needs test updates. Tests should be written/updated alongside implementation, not after.

### Test plan

| Change | Test action |
|--------|-------------|
| Unified `useKey` (string) | Keep existing use-key tests, adapt API |
| Unified `useKey` (array) | NEW tests: array of keys → single handler |
| Unified `useKey` (map) | Migrate use-zone-keys tests to use-key |
| Pipe syntax removal | Delete pipe syntax tests |
| `forZone` helper | NEW tests: forZone returns correct options |
| Hook-in-loop fix | Existing focus-zone tests should still pass |
| Handler gets event | Update provider tests: verify event passed |
| preventDefault default | Update provider tests: verify default=false |
| Lazy isMac | NEW test: verify function not evaluated at import |
| isWithinTarget extraction | Existing provider tests should still pass |

### Files to change

- `src/hooks/use-key.test.ts` — NEW (consolidate from old tests)
- `src/providers/keyboard-provider.test.tsx` — update
- `src/hooks/use-focus-zone.test.ts` — update
- `src/hooks/use-zone-keys.test.tsx` — DELETE (tests migrated to use-key.test.ts)
- `src/utils/keyboard-utils.test.ts` — update isMac tests

---

## PHASE 5: Exports & cleanup

### Updated public API

```typescript
// src/index.ts

// Provider
export { KeyboardProvider } from "./providers/keyboard-provider";
export type { HandlerOptions } from "./providers/keyboard-provider";

// Core hooks
export { useKey } from "./hooks/use-key";
export type { UseKeyOptions } from "./hooks/use-key";
export { useScope } from "./hooks/use-scope";

// Navigation hooks
export { useNavigation } from "./hooks/use-navigation";
export { useTabNavigation } from "./hooks/use-tab-navigation";
export { useFocusZone } from "./hooks/use-focus-zone";

// Utilities
export { keys } from "./utils/keys";

// Types
export type { NavigationRole } from "./utils/types";
```

### Removed exports

- `useZoneKeys` — replaced by unified `useKey`
- `UseZoneKeysOptions` — replaced by `UseKeyOptions`

### Files to delete

- `src/hooks/use-zone-keys.ts`
- `src/hooks/use-zone-keys.test.tsx`

### Files to change

- `src/index.ts` — update exports
- `src/hooks/use-navigation.ts` — update internal useKey import if needed

---

## Dependency graph (execution order)

```
PHASE 3C (isMac)  ─────────────────────────────────────┐
PHASE 3D (isWithinTarget) ─────────────────────────────┤
                                                        ├─→ PHASE 4 (tests)
PHASE 3A (handler event) ──┐                            │         │
PHASE 3B (preventDefault) ─┼─→ PHASE 1 (unified useKey) ┤         │
                            │         │                  │         ↓
                            │         ↓                  │    PHASE 5
                            │   PHASE 2 (focusZone)  ────┘   (exports)
                            │         │
                            │         ↓
                            └─→ update useNavigation
                                  (uses internal useKeys,
                                   may need useKey map form)
```

### Parallelizable work

These can run in PARALLEL (no dependencies between them):
- Phase 3A + 3B (provider changes)
- Phase 3C (isMac fix)
- Phase 3D (isWithinTarget extraction)

These must be SEQUENTIAL:
- Phase 3 → Phase 1 (unified useKey needs updated provider types)
- Phase 1 → Phase 2 (useFocusZone uses new useKey)
- Phase 1 + 2 → Phase 4 (tests validate new API)
- Phase 4 → Phase 5 (cleanup after tests pass)

---

## Team assignment

### Agent 1: "provider-fixes" (Phase 3A + 3B + 3C + 3D)
- Update handler type to include event
- Change preventDefault default
- Lazy isMac
- Extract isWithinTarget
- Update provider tests for these changes

### Agent 2: "unified-usekey" (Phase 1) — BLOCKED BY Agent 1
- Implement unified useKey with 3 overloads
- Delete use-zone-keys.ts
- Write new use-key tests (including migrated zone-keys tests)

### Agent 3: "focus-zone" (Phase 2) — BLOCKED BY Agent 2
- Add forZone helper
- Fix hook-in-loop
- Update focus-zone tests

### Agent 4: "validation" (Phase 4 + 5) — BLOCKED BY Agent 2 + 3
- Run full test suite
- Update exports in index.ts
- Verify build succeeds
- Delete dead files
- Final type-check

---

## Quality gates

Before marking ANY phase complete:

1. `npm run type-check` passes
2. `npm run test` passes
3. No TypeScript `any` types introduced
4. No `eslint-disable` comments added
5. No TODO comments left in code
6. Every public function has TypeScript overload signatures

---

## Version bump

After all phases: bump to `0.2.0` in package.json.
This is a BREAKING release (removed `useZoneKeys`, changed `preventDefault` default).

---

## Out of scope (conscious decisions NOT to do)

- Key sequences (vim g g) — future v0.3
- Merge useNavigation + useTabNavigation — different enough to stay separate
- React 18 compatibility — useEffectEvent requires React 19
- Visual debugger component — future feature
- Priority system for handlers — LIFO is sufficient
