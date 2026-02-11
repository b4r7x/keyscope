# Prompt: Extract keyscope from diffgazer monorepo

## Context

You are extracting the keyboard navigation package from the diffgazer monorepo into a new standalone repository. **COPY only — do NOT modify or delete anything in the source monorepo.**

- **Source**: `/Users/voitz/Projects/diffgazer/packages/keyboard/`
- **Target**: `/Users/voitz/Projects/keyscope/` (new repo, single package — NOT a monorepo)
- **Spec**: Read `/Users/voitz/Projects/diffgazer/docs/design/keyscope-final.md` FIRST — it contains the complete spec with all fixes, new hooks, and refactored code.

keyscope is a composable, scoped keyboard navigation hooks library for React 19. It uses `useEffectEvent` (React 19 only).

---

## Step 1: Create directory structure

Create this at `/Users/voitz/Projects/keyscope/`:

```
keyscope/
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

---

## Step 2: Copy files with path mapping

Source base: `/Users/voitz/Projects/diffgazer/packages/keyboard/src/`

| Source file | Target file | Action |
|-------------|-------------|--------|
| `keyboard-provider.tsx` | `src/providers/keyboard-provider.tsx` | Copy, fix imports |
| `use-keyboard-context.ts` | `src/context/keyboard-context.ts` | Copy, fix imports |
| `use-key.ts` | `src/hooks/use-key.ts` | Copy, fix imports |
| `use-keys.ts` | `src/hooks/use-keys.ts` | Copy, fix imports |
| `use-scope.ts` | `src/hooks/use-scope.ts` | Copy, fix imports |
| `use-navigation.ts` | `src/hooks/use-navigation.ts` | Copy, fix imports |
| `use-tab-navigation.ts` | `src/hooks/use-tab-navigation.ts` | Copy, fix imports |
| `use-focus-zone.ts` | `src/hooks/use-focus-zone.ts` | **REWRITE — apply fixes from spec** |
| `keyboard-utils.ts` | `src/utils/keyboard-utils.ts` | **MODIFY — add `mod` alias** |
| `types.ts` | `src/utils/types.ts` | Copy as-is |
| `internal/use-dom-navigation-core.ts` | `src/internal/use-dom-navigation-core.ts` | Copy, fix imports |

Tests:

| Source test | Target test | Action |
|-------------|-------------|--------|
| `keyboard-utils.test.ts` | `src/utils/keyboard-utils.test.ts` | Copy, fix imports, add `mod` tests |
| `use-focus-zone.test.ts` | `src/hooks/use-focus-zone.test.ts` | Copy, fix imports |
| `keyboard-provider.test.tsx` | `src/providers/keyboard-provider.test.tsx` | Copy, fix imports |

---

## Step 3: Fix imports in ALL copied files

The source uses a flat directory — all files in `src/`. The new structure has subdirectories. You MUST fix every internal import in every copied file.

**Import mapping** (adjust relative paths based on each file's actual location):

| Old import (flat) | New import (from `hooks/`) | New import (from `providers/`) |
|---|---|---|
| `"./keyboard-provider"` | `"../providers/keyboard-provider"` | `"./keyboard-provider"` |
| `"./use-keyboard-context"` | `"../context/keyboard-context"` | `"../context/keyboard-context"` |
| `"./use-key"` | `"./use-key"` | `"../hooks/use-key"` |
| `"./use-scope"` | `"./use-scope"` | `"../hooks/use-scope"` |
| `"./keyboard-utils"` | `"../utils/keyboard-utils"` | `"../utils/keyboard-utils"` |
| `"./types"` | `"../utils/types"` | `"../utils/types"` |
| `"./internal/use-dom-navigation-core"` | `"../internal/use-dom-navigation-core"` | `"../internal/use-dom-navigation-core"` |

Calculate the correct relative path for EACH file individually based on its subdirectory.

---

## Step 4: Apply `useFocusZone` fixes

Replace `src/hooks/use-focus-zone.ts` with the refactored version from keyscope-final.md section **"Full refactored `useFocusZone`"**. Two fixes:

**Fix A — Extract `setZoneValue`**: The current code has this block duplicated 3 times (in `stableTransitions`, `stableTabCycle`, `setZone`):
```ts
if (isControlled) {
  options.onZoneChange?.(next);
} else {
  setInternalZone(next);
  options.onZoneChange?.(next);
}
```
Replace all 3 with a single `setZoneValue` useEffectEvent helper.

**Fix B — Remove `canTransition`**: Delete the `canTransition` function and simplify arrow key registration. The handler already no-ops when `transitions()` returns null.

---

## Step 5: Add `mod` alias to keyboard-utils

In `src/utils/keyboard-utils.ts`, modify `matchesHotkey()` to support `mod` modifier:

```ts
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

// Inside matchesHotkey(), after parsing parts:
if (mods.has("mod")) {
  mods.delete("mod");
  if (isMac) mods.add("meta");
  else mods.add("ctrl");
}
```

Also ensure `space` is in KEY_ALIASES: `space: " "`.

---

## Step 6: Create NEW `useZoneKeys` hook

Create `src/hooks/use-zone-keys.ts`. Full implementation is in keyscope-final.md section **"New: `useZoneKeys`"**, but with this addition — support `" | "` pipe syntax for multi-key handlers:

When processing the `handlers` Record, split each key on `" | "` separator and register each individual key separately. Normalize the alias `Space` → `" "`.

Example: `{ "Enter | Space": handler }` registers TWO handlers — one for `Enter`, one for `" "` (space).

```ts
// Inside the useEffect, when building cleanups:
const cleanups: (() => void)[] = [];
for (const [keySpec, _handler] of Object.entries(handlers)) {
  const individualKeys = keySpec.includes(" | ")
    ? keySpec.split(" | ").map(k => {
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
      })
    );
  }
}
return () => cleanups.forEach((cleanup) => cleanup());
```

The `keysKey` for the dependency array should be computed from the expanded individual keys, not just Object.keys.

---

## Step 7: Create `keys()` helper

Create `src/utils/keys.ts`:

```ts
export function keys(
  hotkeys: readonly string[],
  handler: () => void,
): Record<string, () => void> {
  return Object.fromEntries(hotkeys.map(key => [key, handler]));
}
```

---

## Step 8: Create `src/index.ts`

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

## Step 9: Write tests for `useZoneKeys`

Create `src/hooks/use-zone-keys.test.ts` with these test cases:

1. Fires handler only when `currentZone === targetZone`
2. Does not fire when zone doesn't match
3. Respects `enabled: false` option
4. Re-registers when key set changes (add/remove a key from the map)
5. Calls latest handler without re-registration (useEffectEvent stability)
6. Supports `allowInInput` option passthrough
7. Cleans up all registrations on unmount
8. Cleans up when zone changes away from targetZone
9. Pipe syntax: `"Enter | Space"` registers both keys
10. Pipe syntax: both keys trigger the same handler

Use the same test utilities and patterns as the existing test files (`keyboard-provider.test.tsx`, `use-focus-zone.test.ts`). Wrap with `KeyboardProvider`, simulate keydown events.

---

## Step 10: Create config files

**`package.json`:**

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

**`tsconfig.json`:**

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

**`vitest.config.ts`:**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "jsdom",
  },
});
```

**`.gitignore`:**

```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
```

---

## Step 11: Initialize, install, verify, commit

```bash
cd /Users/voitz/Projects/keyscope
git init
pnpm install
pnpm type-check    # MUST pass with 0 errors
pnpm test          # MUST pass ALL tests (old + new)
pnpm build         # MUST produce dist/
```

If type-check or tests fail, fix the issues before committing.

Then commit:

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

---

## Verification Checklist

- [ ] `/Users/voitz/Projects/diffgazer/` is UNTOUCHED — no files modified or removed
- [ ] `pnpm type-check` passes with 0 errors
- [ ] `pnpm test` passes ALL tests (3 existing + 1 new useZoneKeys test file)
- [ ] `pnpm build` produces `dist/` with `.js` and `.d.ts` files
- [ ] `src/hooks/use-zone-keys.ts` exists with pipe syntax support
- [ ] `src/hooks/use-focus-zone.ts` has `setZoneValue` helper (no duplicated blocks)
- [ ] `src/hooks/use-focus-zone.ts` has NO `canTransition` function
- [ ] `src/utils/keyboard-utils.ts` supports `mod+k` syntax
- [ ] `src/utils/keys.ts` exports `keys()` helper
- [ ] `src/index.ts` exports all public API (including new `useZoneKeys`, `keys`)
- [ ] All imports use correct relative paths (no broken `./` from flat structure)
- [ ] git repo initialized with initial commit
