# keyscope extraction — Corrected Execution Plan

## Orchestrator Prompt

The main agent should NOT execute any steps directly. Instead, create a team and dispatch teammates to execute the work. Here's the prompt for the orchestrating agent:

---

```
You are orchestrating the extraction of the keyboard navigation package from the diffgazer monorepo into a new standalone keyscope repository.

RULES:
- You do NOT write any code yourself
- You create a team and dispatch teammates to do all work
- You coordinate, review results, and handle the final verification

SOURCE: /Users/voitz/Projects/diffgazer/packages/keyboard/
TARGET: /Users/voitz/Projects/keyscope/
SPEC: /Users/voitz/Projects/diffgazer/docs/design/keyboard/keyscope-final.md
PLAN: /Users/voitz/Projects/diffgazer/docs/design/keyboard/keyscope-extraction-plan.md

CRITICAL: Do NOT modify or delete anything in /Users/voitz/Projects/diffgazer/

## Team Structure

Create a team called "keyscope-extraction" and dispatch these teammates:

### Teammate 1: "setup" (general-purpose)
Task: Create directory structure and config files at /Users/voitz/Projects/keyscope/
- Create directories: src/providers, src/context, src/hooks, src/utils, src/internal
- Write package.json, tsconfig.json, vitest.config.ts, .gitignore, LICENSE (MIT)
- Initialize git repo
- See plan Phase 1 for exact file contents

### Teammate 2: "copier" (general-purpose) — BLOCKED BY setup
Task: Copy and fix imports for all source files
- Copy all 11 source files from the plan's file mapping table
- Fix all internal imports per the import mapping rules
- For use-focus-zone.ts: use the FULL REFACTORED version from the spec (keyscope-final.md "Full refactored useFocusZone" section)
- For keyboard-utils.ts: add the `mod` alias code from the plan
- Create the NEW files: use-zone-keys.ts, keys.ts, index.ts
- See plan Phase 2 for exact details on each file

### Teammate 3: "tester" (general-purpose) — BLOCKED BY copier
Task: Copy tests, fix imports, write new tests, update broken test
- Copy 3 existing test files with import fixes
- Update use-focus-zone.test.ts (the canTransition test — see plan Phase 2, Step 4 CRITICAL)
- Add mod tests to keyboard-utils.test.ts
- Write new use-zone-keys.test.ts with all 10 test cases
- See plan Phase 3 for details

### Teammate 4: "verifier" (general-purpose) — BLOCKED BY tester
Task: Install dependencies, run type-check, tests, build, and commit
- cd /Users/voitz/Projects/keyscope && pnpm install
- pnpm type-check (must pass with 0 errors)
- pnpm test (must pass ALL tests)
- pnpm build (must produce dist/)
- If anything fails, fix it
- Verify /Users/voitz/Projects/diffgazer/ is untouched
- Create the initial commit with the message from the plan
- See plan Phase 4 for verification checklist

Dispatch teammates sequentially as each dependency completes. Monitor progress via task list.
```

---

## Phase 1: Directory Structure & Config Files

### Directory structure

```
/Users/voitz/Projects/keyscope/
├── src/
│   ├── providers/
│   ├── context/
│   ├── hooks/
│   ├── utils/
│   └── internal/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
└── LICENSE
```

### package.json

```json
{
  "name": "keyscope",
  "version": "0.1.0",
  "description": "Composable, scoped keyboard navigation hooks for React",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@types/react": "^19.0.0",
    "jsdom": "^28.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.9.3",
    "vitest": "^3.0.0"
  },
  "keywords": [
    "react", "keyboard", "hotkeys", "shortcuts",
    "navigation", "focus", "accessibility", "a11y",
    "scoped", "zones"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

### tsconfig.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx"]
}
```

### vitest.config.ts

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "jsdom",
  },
});
```

### .gitignore

```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
```

### LICENSE

Standard MIT license with current year.

---

## Phase 2: Source Files

### Import Mapping Rules

Source uses flat `src/` directory. Target uses subdirectories. Fix every internal import.

**Per-directory import resolution:**

| Import target | From `hooks/` | From `providers/` | From `context/` | From `internal/` |
|---|---|---|---|---|
| `keyboard-provider` | `../providers/keyboard-provider` | `./keyboard-provider` | `../providers/keyboard-provider` | `../providers/keyboard-provider` |
| `keyboard-context` (was `use-keyboard-context`) | `../context/keyboard-context` | `../context/keyboard-context` | `./keyboard-context` | `../context/keyboard-context` |
| `use-key` | `./use-key` | `../hooks/use-key` | `../hooks/use-key` | `../hooks/use-key` |
| `use-keys` | `./use-keys` | `../hooks/use-keys` | `../hooks/use-keys` | `../hooks/use-keys` |
| `use-scope` | `./use-scope` | `../hooks/use-scope` | `../hooks/use-scope` | `../hooks/use-scope` |
| `keyboard-utils` | `../utils/keyboard-utils` | `../utils/keyboard-utils` | `../utils/keyboard-utils` | `../utils/keyboard-utils` |
| `types` | `../utils/types` | `../utils/types` | `../utils/types` | `../utils/types` |
| `use-dom-navigation-core` | `../internal/use-dom-navigation-core` | `../internal/use-dom-navigation-core` | — | `./use-dom-navigation-core` |

### File-by-file instructions

#### 1. `src/providers/keyboard-provider.tsx`
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/keyboard-provider.tsx`
- **Action:** Copy, fix imports
- **Import changes:**
  - `"./keyboard-utils"` → `"../utils/keyboard-utils"`

#### 2. `src/context/keyboard-context.ts`
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/use-keyboard-context.ts`
- **Action:** Copy, fix imports, rename file
- **Import changes:**
  - `"./keyboard-provider"` → `"../providers/keyboard-provider"`

#### 3. `src/hooks/use-key.ts`
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/use-key.ts`
- **Action:** Copy, fix imports
- **Import changes:**
  - `"./keyboard-provider"` → `"../providers/keyboard-provider"`
  - `"./use-keyboard-context"` → `"../context/keyboard-context"`

#### 4. `src/hooks/use-keys.ts`
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/use-keys.ts`
- **Action:** Copy, fix imports
- **Import changes:**
  - `"./keyboard-provider"` → `"../providers/keyboard-provider"`
  - `"./use-keyboard-context"` → `"../context/keyboard-context"`

#### 5. `src/hooks/use-scope.ts`
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/use-scope.ts`
- **Action:** Copy, fix imports
- **Import changes:**
  - `"./use-keyboard-context"` → `"../context/keyboard-context"`

#### 6. `src/hooks/use-navigation.ts`
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/use-navigation.ts`
- **Action:** Copy, fix imports
- **Import changes:**
  - `"./use-key"` → stays `"./use-key"` (same dir)
  - `"./use-keys"` → stays `"./use-keys"` (same dir)
  - `"./internal/use-dom-navigation-core"` → `"../internal/use-dom-navigation-core"`
  - `"./types"` → `"../utils/types"`

#### 7. `src/hooks/use-tab-navigation.ts`
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/use-tab-navigation.ts`
- **Action:** Copy as-is (no internal imports — only imports from `react`)

#### 8. `src/hooks/use-focus-zone.ts` — REWRITE
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/use-focus-zone.ts`
- **Action:** REWRITE using the "Full refactored `useFocusZone`" from keyscope-final.md (spec lines 401-487)
- **Import changes** (the spec version already has correct relative paths for hooks/ dir):
  - `"./use-key"` → stays `"./use-key"` (same dir)
  - `"./use-scope"` → stays `"./use-scope"` (same dir)
- **Changes vs source:**
  - **Fix A:** 3x duplicated controlled/uncontrolled blocks → single `setZoneValue` useEffectEvent helper
  - **Fix B:** `canTransition` function REMOVED. Arrow keys registered with `enabled: enabled && options.transitions != null` (no per-key filtering)

#### 9. `src/utils/keyboard-utils.ts` — MODIFY
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/keyboard-utils.ts`
- **Action:** Copy + add `mod` alias
- **No import changes needed** (no internal imports)
- **Modification:** Add `isMac` detection and `mod` expansion inside `matchesHotkey()`:

```ts
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

// Inside matchesHotkey(), after `const mods = new Set(parts);`:
if (mods.has("mod")) {
  mods.delete("mod");
  if (isMac) mods.add("meta");
  else mods.add("ctrl");
}
```

Note: `space: " "` already exists in KEY_ALIASES — no addition needed.

#### 10. `src/utils/types.ts`
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/types.ts`
- **Action:** Copy as-is (no imports)

#### 11. `src/internal/use-dom-navigation-core.ts`
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/internal/use-dom-navigation-core.ts`
- **Action:** Copy, fix imports
- **Import changes:**
  - `"../types"` → `"../utils/types"`

#### 12. `src/hooks/use-zone-keys.ts` — NEW FILE
- **Action:** Create from spec + pipe syntax
- **Base implementation:** keyscope-final.md lines 113-163
- **Modification:** Replace the `Object.keys(handlers).map(...)` block inside `useEffect` with pipe-syntax-aware loop:

Complete implementation:

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
```

#### 13. `src/utils/keys.ts` — NEW FILE

```ts
export function keys(
  hotkeys: readonly string[],
  handler: () => void,
): Record<string, () => void> {
  return Object.fromEntries(hotkeys.map((key) => [key, handler]));
}
```

#### 14. `src/index.ts` — NEW FILE

```ts
// Provider
export { KeyboardProvider } from "./providers/keyboard-provider";
export type { HandlerOptions } from "./providers/keyboard-provider";

// Core hooks
export { useKey } from "./hooks/use-key";
export { useZoneKeys } from "./hooks/use-zone-keys";
export type { UseZoneKeysOptions } from "./hooks/use-zone-keys";
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

---

## Phase 3: Test Files

### Test 1: `src/utils/keyboard-utils.test.ts`
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/keyboard-utils.test.ts`
- **Action:** Copy, fix imports, add `mod` tests
- **Import changes:** `"./keyboard-utils"` → stays `"./keyboard-utils"` (same dir)
- **Add these tests** to the `matchesHotkey` describe block:

```ts
it("should resolve mod to meta on Mac", () => {
  // Temporarily mock navigator.userAgent for Mac
  const originalNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)" },
    writable: true,
    configurable: true,
  });

  // Re-import to pick up new navigator — or test the function directly
  // Note: isMac is evaluated at module load time, so this may need
  // module re-evaluation or testing against the known platform
  // For CI, test both branches by mocking at the module level

  Object.defineProperty(globalThis, "navigator", {
    value: originalNavigator,
    writable: true,
    configurable: true,
  });
});

it("should match mod+key as ctrl+key on non-Mac", () => {
  // In jsdom, navigator.userAgent does not contain "Mac"
  // so mod should resolve to ctrl
  expect(matchesHotkey(makeKeyEvent("k", { ctrl: true }), "mod+k")).toBe(true);
  expect(matchesHotkey(makeKeyEvent("k", { meta: true }), "mod+k")).toBe(false);
});

it("should not match mod+key without any modifier", () => {
  expect(matchesHotkey(makeKeyEvent("k"), "mod+k")).toBe(false);
});
```

**Important:** The `isMac` const is evaluated at module load time. In jsdom, `navigator.userAgent` doesn't contain "Mac", so `mod` resolves to `ctrl`. Testing the Mac branch requires module-level mocking. At minimum, test the non-Mac branch (ctrl).

### Test 2: `src/providers/keyboard-provider.test.tsx`
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/keyboard-provider.test.tsx`
- **Action:** Copy, fix imports
- **Import changes:**
  - `"./keyboard-provider"` → stays `"./keyboard-provider"` (same dir)
  - `"./use-keyboard-context"` → `"../context/keyboard-context"`

### Test 3: `src/hooks/use-focus-zone.test.ts` — COPY + FIX
- **Source:** `/Users/voitz/Projects/diffgazer/packages/keyboard/src/use-focus-zone.test.ts`
- **Action:** Copy, fix mock paths, **update canTransition test**
- **Mock path changes:**
  - `vi.mock("./use-key")` → stays `vi.mock("./use-key")` (same dir)
  - `vi.mock("./use-scope")` → stays `vi.mock("./use-scope")` (same dir)
  - `import { useFocusZone } from "./use-focus-zone"` → stays same (same dir)

**CRITICAL FIX — Update the "registers only transition keys" test (source lines 122-143):**

Replace:
```ts
it("registers only transition keys for the current zone", () => {
  const { result } = renderHook(() =>
    useFocusZone({
      initial: "main",
      zones: ["main", "sidebar"],
      transitions: ({ zone, key }) => {
        if (zone === "main" && key === "ArrowRight") return "sidebar";
        if (zone === "sidebar" && key === "ArrowLeft") return "main";
        return null;
      },
    }),
  );

  expect(capturedKeyHandlers.has("ArrowRight")).toBe(true);
  expect(capturedKeyHandlers.has("ArrowLeft")).toBe(false);
  expect(capturedKeyHandlers.has("ArrowUp")).toBe(false);
  expect(capturedKeyHandlers.has("ArrowDown")).toBe(false);

  act(() => simulateKey("ArrowRight"));
  expect(result.current.zone).toBe("sidebar");
  expect(capturedKeyHandlers.has("ArrowLeft")).toBe(true);
});
```

With:
```ts
it("registers all arrow key handlers when transitions are provided", () => {
  const { result } = renderHook(() =>
    useFocusZone({
      initial: "main",
      zones: ["main", "sidebar"],
      transitions: ({ zone, key }) => {
        if (zone === "main" && key === "ArrowRight") return "sidebar";
        if (zone === "sidebar" && key === "ArrowLeft") return "main";
        return null;
      },
    }),
  );

  // All arrow keys registered — handler no-ops when transition returns null
  expect(capturedKeyHandlers.has("ArrowRight")).toBe(true);
  expect(capturedKeyHandlers.has("ArrowLeft")).toBe(true);
  expect(capturedKeyHandlers.has("ArrowUp")).toBe(true);
  expect(capturedKeyHandlers.has("ArrowDown")).toBe(true);

  // Valid transition works
  act(() => simulateKey("ArrowRight"));
  expect(result.current.zone).toBe("sidebar");

  // Invalid transition is a no-op
  act(() => simulateKey("ArrowUp"));
  expect(result.current.zone).toBe("sidebar");
});
```

### Test 4: `src/hooks/use-zone-keys.test.ts` — NEW FILE

Write tests using the same patterns as existing test files. Use `vi.mock` for `use-key` like `use-focus-zone.test.ts` does, OR use the full `KeyboardProvider` wrapper like `keyboard-provider.test.tsx` does.

**Recommended approach:** Use `KeyboardProvider` wrapper + `window.dispatchEvent(new KeyboardEvent(...))` for integration-style tests (matches `keyboard-provider.test.tsx` pattern).

**10 test cases:**

1. **Fires handler when zone matches** — Set currentZone=targetZone, press key, handler fires
2. **Does not fire when zone doesn't match** — Set currentZone≠targetZone, press key, handler doesn't fire
3. **Respects enabled: false** — Set enabled=false with matching zone, press key, handler doesn't fire
4. **Re-registers when key set changes** — Change handlers object keys, verify new keys work
5. **Calls latest handler (useEffectEvent stability)** — Change handler callback, verify latest is called without re-registration
6. **Supports allowInInput passthrough** — Register with allowInInput:true, dispatch from input element, handler fires
7. **Cleans up on unmount** — Unmount component, press key, handler doesn't fire
8. **Cleans up when zone changes away** — Change currentZone away from targetZone, press key, handler doesn't fire
9. **Pipe syntax: "Enter | Space" registers both keys** — Press Enter, handler fires; press Space, handler fires
10. **Pipe syntax: both keys call same handler** — Verify handler called with same keySpec for both Enter and Space

**Test helper pattern:**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { KeyboardProvider } from "../providers/keyboard-provider";
import { useZoneKeys } from "./use-zone-keys";

function Wrapper({ children }: { children: ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}

function pressKey(key: string, target: EventTarget = window) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
}
```

---

## Phase 4: Verification

### Commands (in order)

```bash
cd /Users/voitz/Projects/keyscope
git init
pnpm install
pnpm type-check    # MUST pass with 0 errors
pnpm test          # MUST pass ALL tests
pnpm build         # MUST produce dist/
```

If type-check or tests fail, fix the issues before committing.

### Commit

```bash
git add .
git commit -m "Initial keyscope extraction from diffgazer

Composable, scoped keyboard navigation hooks for React 19.
Extracted from @diffgazer/keyboard with improvements:
- New useZoneKeys hook for zone-based handler maps
- Multi-key pipe syntax: Enter | Space
- useFocusZone: deduplicated controlled/uncontrolled logic
- useFocusZone: removed redundant canTransition pre-check
- Added mod key alias (Cmd on Mac, Ctrl on Win/Linux)
- Added keys() helper for programmatic key grouping"
```

### Checklist

- [ ] `/Users/voitz/Projects/diffgazer/` is UNTOUCHED
- [ ] `pnpm type-check` passes with 0 errors
- [ ] `pnpm test` passes ALL tests (3 existing + 1 new)
- [ ] `pnpm build` produces `dist/` with `.js` and `.d.ts` files
- [ ] `src/hooks/use-zone-keys.ts` exists with pipe syntax support
- [ ] `src/hooks/use-focus-zone.ts` has `setZoneValue` helper (no 3x duplication)
- [ ] `src/hooks/use-focus-zone.ts` has NO `canTransition` function
- [ ] `src/utils/keyboard-utils.ts` supports `mod+k` syntax
- [ ] `src/utils/keys.ts` exports `keys()` helper
- [ ] `src/index.ts` exports all public API
- [ ] All imports use correct relative paths
- [ ] `use-focus-zone.test.ts` updated — "registers all arrow key handlers" test passes
- [ ] git repo initialized with initial commit
