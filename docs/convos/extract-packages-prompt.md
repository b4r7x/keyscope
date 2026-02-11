# Prompt: Extract keyscope and diff-ui from diffgazer monorepo

## Context

We're COPYING (not removing!) two packages from the diffgazer monorepo at `/Users/voitz/Projects/diffgazer` into two new standalone repositories:

1. **keyscope** → `/Users/voitz/Projects/keyscope` (single package, NOT monorepo)
2. **diff-ui** → `/Users/voitz/Projects/diff-ui` (monorepo: cli + core + registry)

Source monorepo stays untouched. We're extracting and restructuring.

**IMPORTANT**: Read the final specs before doing anything:
- `/Users/voitz/Projects/diffgazer/docs/design/keyscope-final.md` — complete keyscope spec with all fixes
- `/Users/voitz/Projects/diffgazer/docs/design/diff-ui-final.md` — complete diff-ui spec

---

## PART 1: keyscope (`/Users/voitz/Projects/keyscope`)

### 1.1 Create directory structure

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

### 1.2 Copy files with path mapping

Source: `/Users/voitz/Projects/diffgazer/packages/keyboard/src/`

| Source file | Target file | Action |
|-------------|-------------|--------|
| `keyboard-provider.tsx` | `src/providers/keyboard-provider.tsx` | Copy, fix imports |
| `use-keyboard-context.ts` | `src/context/keyboard-context.ts` | Copy, fix imports |
| `use-key.ts` | `src/hooks/use-key.ts` | Copy, fix imports |
| `use-keys.ts` | `src/hooks/use-keys.ts` | Copy, fix imports |
| `use-scope.ts` | `src/hooks/use-scope.ts` | Copy, fix imports |
| `use-navigation.ts` | `src/hooks/use-navigation.ts` | Copy, fix imports |
| `use-tab-navigation.ts` | `src/hooks/use-tab-navigation.ts` | Copy, fix imports |
| `use-focus-zone.ts` | `src/hooks/use-focus-zone.ts` | **APPLY FIXES from spec** |
| `keyboard-utils.ts` | `src/utils/keyboard-utils.ts` | **ADD `mod` alias** |
| `types.ts` | `src/utils/types.ts` | Copy as-is |
| `internal/use-dom-navigation-core.ts` | `src/internal/use-dom-navigation-core.ts` | Copy, fix imports |

Tests:

| Source test | Target test | Action |
|-------------|-------------|--------|
| `keyboard-utils.test.ts` | `src/utils/keyboard-utils.test.ts` | Copy, fix imports, add mod tests |
| `use-focus-zone.test.ts` | `src/hooks/use-focus-zone.test.ts` | Copy, fix imports |
| `keyboard-provider.test.tsx` | `src/providers/keyboard-provider.test.tsx` | Copy, fix imports |

### 1.3 Create NEW files (from keyscope-final.md spec)

**`src/hooks/use-zone-keys.ts`** — New hook. Implementation is in keyscope-final.md section "New: `useZoneKeys`". Support the `" | "` pipe syntax for multi-key handlers:
- Split key specs on `" | "` separator
- Normalize aliases (e.g. `Space` → `" "`)
- Register each individual key as separate handler pointing to same callback

**`src/utils/keys.ts`** — New helper. Implementation is in keyscope-final.md section "Alternative: `keys()` helper":
```ts
export function keys(hotkeys: readonly string[], handler: () => void): Record<string, () => void> {
  return Object.fromEntries(hotkeys.map(key => [key, handler]));
}
```

**`src/hooks/use-zone-keys.test.ts`** — Tests for useZoneKeys. Test cases listed in keyscope-final.md section "Tests for `useZoneKeys`" (10 test cases).

### 1.4 Fix imports in ALL copied files

Old imports use flat structure. New structure has subdirectories. Transform ALL internal imports:

```
"./keyboard-provider"        → "../providers/keyboard-provider"
"./use-keyboard-context"     → "../context/keyboard-context"
"./use-key"                  → "../hooks/use-key"  (or relative)
"./use-keys"                 → "../hooks/use-keys"  (or relative)
"./use-scope"                → "../hooks/use-scope"  (or relative)
"./keyboard-utils"           → "../utils/keyboard-utils"
"./types"                    → "../utils/types"
"./internal/..."             → "../internal/..."
```

Calculate correct relative paths based on each file's location. Within the same subdirectory, use `./` prefix.

### 1.5 Apply useFocusZone fixes (from spec)

In `src/hooks/use-focus-zone.ts`:

**Fix A**: Extract `setZoneValue` — replace 3 duplicated controlled/uncontrolled blocks with single `useEffectEvent` helper. Full refactored implementation is in keyscope-final.md section "Full refactored `useFocusZone`".

**Fix B**: Remove `canTransition` — delete the pre-check function, simplify arrow key registration. The handler already no-ops when `transitions()` returns null.

### 1.6 Add `mod` alias to keyboard-utils

In `src/utils/keyboard-utils.ts`, add platform detection and `mod` expansion in `matchesHotkey()`. Implementation in keyscope-final.md section "New: `mod` Key Alias". Also add `space` → `" "` to KEY_ALIASES if not already there.

### 1.7 Create `src/index.ts`

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

### 1.8 Create `package.json`

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

### 1.9 Create `tsconfig.json`

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

### 1.10 Create `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "jsdom",
  },
});
```

### 1.11 Create `.gitignore`

```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
```

### 1.12 Initialize git + install + verify

```bash
cd /Users/voitz/Projects/keyscope
git init
pnpm install
pnpm type-check    # Must pass with 0 errors
pnpm test          # Must pass all tests
pnpm build         # Must produce dist/
git add .
git commit -m "Initial keyscope extraction from diffgazer

Composable, scoped keyboard navigation hooks for React 19.
Extracted from @diffgazer/keyboard with fixes:
- New useZoneKeys hook for zone-based handler maps
- useFocusZone: deduplicated controlled/uncontrolled logic
- useFocusZone: removed redundant canTransition pre-check
- Added mod key alias (Cmd on Mac, Ctrl on Win/Linux)
- Added multi-key pipe syntax (Enter | Space)
- Added keys() helper for programmatic key grouping"
```

---

## PART 2: diff-ui (`/Users/voitz/Projects/diff-ui`)

### 2.1 Create monorepo structure

```
diff-ui/
├── packages/
│   ├── core/                    # @diff-ui/core npm package
│   │   ├── src/
│   │   │   ├── cn.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                     # diff-ui CLI (scaffold only)
│   │   ├── src/
│   │   │   └── index.ts         # placeholder
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── tsconfig/                # Shared TS configs
│       ├── base.json
│       └── react.json
│
├── registry/                    # Component source files
│   ├── registry.json
│   └── components/
│       └── (all components)
│
├── styles/
│   ├── theme.css
│   ├── styles.css
│   └── sources.css
│
├── package.json                 # Root
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
└── LICENSE
```

### 2.2 Copy `@diff-ui/core`

Source: `/Users/voitz/Projects/diffgazer/packages/ui/src/lib/cn.ts`

Copy to `packages/core/src/cn.ts`. Create `packages/core/src/index.ts`:

```ts
export { cn } from "./cn";
```

Create `packages/core/package.json`:

```json
{
  "name": "@diff-ui/core",
  "version": "0.1.0",
  "description": "Core utilities for diff-ui components",
  "license": "MIT",
  "type": "module",
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
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "clsx": "^2.1.0",
    "tailwind-merge": "^3.0.0"
  }
}
```

Create `packages/core/tsconfig.json`:

```json
{
  "extends": "@diff-ui/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": false,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.3 Copy shared tsconfig

Source: `/Users/voitz/Projects/diffgazer/packages/tsconfig/`

Copy `base.json` and `react.json` to `packages/tsconfig/`.

Create `packages/tsconfig/package.json`:

```json
{
  "name": "@diff-ui/tsconfig",
  "version": "0.0.1",
  "license": "MIT",
  "files": ["*.json"]
}
```

### 2.4 Copy styles

Source: `/Users/voitz/Projects/diffgazer/packages/ui/src/styles/`

| Source | Target | Action |
|--------|--------|--------|
| `theme.css` | `styles/theme.css` | Copy, then **REMOVE** app-specific tokens (see below) |
| `index.css` | `styles/styles.css` | Copy as-is |
| `sources.css` | `styles/sources.css` | Copy as-is |

**Remove from `styles/theme.css`** — these are diffgazer app-specific:

```css
/* DELETE these blocks from BOTH :root and [data-theme="light"] */
--severity-blocker: ...;
--severity-high: ...;
--severity-medium: ...;
--severity-low: ...;
--severity-nit: ...;
--status-running: ...;
--status-complete: ...;
--status-pending: ...;
```

Also remove the corresponding `--color-severity-*` and `--color-status-*` entries from the `@theme` block.

### 2.5 Copy ALL components into registry

Source: `/Users/voitz/Projects/diffgazer/packages/ui/src/components/`
Target: `registry/components/`

**Single-file components** — each gets its own directory:

| Source | Target |
|--------|--------|
| `button.tsx` | `registry/components/button/button.tsx` |
| `badge.tsx` | `registry/components/badge/badge.tsx` |
| `input.tsx` | `registry/components/input/input.tsx` |
| `callout.tsx` | `registry/components/callout/callout.tsx` |
| `checkbox.tsx` | `registry/components/checkbox/checkbox.tsx` |
| `radio-group.tsx` | `registry/components/radio-group/radio-group.tsx` |
| `panel.tsx` | `registry/components/panel/panel.tsx` |
| `scroll-area.tsx` | `registry/components/scroll-area/scroll-area.tsx` |
| `focusable-pane.tsx` | `registry/components/focusable-pane/focusable-pane.tsx` |
| `card-layout.tsx` | `registry/components/card-layout/card-layout.tsx` |
| `block-bar.tsx` | `registry/components/block-bar/block-bar.tsx` |
| `section-header.tsx` | `registry/components/section-header/section-header.tsx` |
| `empty-state.tsx` | `registry/components/empty-state/empty-state.tsx` |
| `key-value-row.tsx` | `registry/components/key-value-row/key-value-row.tsx` |
| `key-value.tsx` | `registry/components/key-value/key-value.tsx` |
| `labeled-field.tsx` | `registry/components/labeled-field/labeled-field.tsx` |
| `search-input.tsx` | `registry/components/search-input/search-input.tsx` |
| `toggle-group.tsx` | `registry/components/toggle-group/toggle-group.tsx` |
| `code-block.tsx` | `registry/components/code-block/code-block.tsx` |
| `diff-view.tsx` | `registry/components/diff-view/diff-view.tsx` |
| `checklist.tsx` | `registry/components/checklist/checklist.tsx` |
| `horizontal-stepper.tsx` | `registry/components/horizontal-stepper/horizontal-stepper.tsx` |

**Compound components** — keep directory structure:

| Source directory | Target directory |
|------------------|------------------|
| `dialog/*.tsx` | `registry/components/dialog/*.tsx` |
| `tabs/*.tsx` | `registry/components/tabs/*.tsx` |
| `menu/*.tsx` | `registry/components/menu/*.tsx` |
| `navigation-list/*.tsx` | `registry/components/navigation-list/*.tsx` |
| `toast/*.tsx` | `registry/components/toast/*.tsx` |
| `stepper/*.tsx` | `registry/components/stepper/*.tsx` |

**Internal utilities:**

| Source | Target |
|--------|--------|
| `../internal/selectable-item.ts` | `registry/components/internal/selectable-item.ts` |
| `../internal/portal.tsx` | `registry/components/internal/portal.tsx` |

### 2.6 Fix imports in ALL registry components

In every copied component file, transform the `cn` import:

```
BEFORE: import { cn } from "../lib/cn"
AFTER:  import { cn } from "@/lib/utils"
```

This follows shadcn convention — the CLI will handle path resolution during `add`. The `cn` utility gets installed during `npx diff-ui init`.

Also fix internal cross-references. Components that import from `../internal/...` should become:
```
BEFORE: import { selectableItemVariants } from "../internal/selectable-item"
AFTER:  import { selectableItemVariants } from "./internal/selectable-item"
```

For compound components, internal imports within the same group (e.g. `dialog/dialog-context.tsx` imported by `dialog/dialog-content.tsx`) stay as `./dialog-context` since they're in the same directory.

### 2.7 Scaffold CLI package

Create `packages/cli/src/index.ts`:

```ts
#!/usr/bin/env node
// diff-ui CLI - TODO: implement
console.log("diff-ui CLI - coming soon");
```

Create `packages/cli/package.json`:

```json
{
  "name": "diff-ui",
  "version": "0.1.0",
  "description": "Terminal-inspired UI components for React - CLI",
  "license": "MIT",
  "type": "module",
  "bin": {
    "diff-ui": "./dist/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit"
  }
}
```

Create `packages/cli/tsconfig.json`:

```json
{
  "extends": "@diff-ui/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": false,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.8 Create registry.json

Create `registry/registry.json` — a manifest of all available components. Include every component with its files and dependencies. See diff-ui-final.md section "Registry Schema" for the format and section "Component Dependencies" for the dependency graph. Each component entry needs:
- `name` — component name
- `type` — `"registry:component"`
- `title` — display name
- `description` — short description
- `dependencies` — npm deps (`["class-variance-authority", "clsx", "tailwind-merge"]`)
- `registryDependencies` — other diff-ui components this depends on
- `files` — array of file paths

### 2.9 Create root monorepo config

**`pnpm-workspace.yaml`:**

```yaml
packages:
  - "packages/*"
```

**Root `package.json`:**

```json
{
  "name": "diff-ui-monorepo",
  "version": "0.1.0",
  "private": true,
  "description": "Terminal-inspired UI components for React",
  "license": "MIT",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.9.3"
  }
}
```

**`turbo.json`:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

### 2.10 Create `.gitignore`

```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
.turbo/
```

### 2.11 Initialize git + install + verify

```bash
cd /Users/voitz/Projects/diff-ui
git init
pnpm install
pnpm build         # Must build core package successfully
pnpm type-check    # Must pass
git add .
git commit -m "Initial diff-ui extraction from diffgazer

Terminal-inspired React component library with shadcn-style CLI distribution.
Extracted from @diffgazer/ui with:
- @diff-ui/core: cn() utility (npm package)
- Component registry: 30+ components with dependency manifest
- Theme system: dark/light with CSS variables (app-specific tokens removed)
- CLI scaffold for future npx diff-ui add <component>"
```

---

## Verification Checklist

After both repos are set up:

- [ ] `/Users/voitz/Projects/keyscope/` — git repo initialized, `pnpm test` passes, `pnpm build` produces `dist/`
- [ ] `/Users/voitz/Projects/diff-ui/` — git repo initialized, `pnpm build` builds core package
- [ ] Source monorepo `/Users/voitz/Projects/diffgazer/` — UNTOUCHED, no files removed
- [ ] keyscope: `useZoneKeys` hook exists with pipe syntax support
- [ ] keyscope: `useFocusZone` has `setZoneValue` helper (no duplicated controlled/uncontrolled logic)
- [ ] keyscope: `matchesHotkey` supports `mod+k` syntax
- [ ] keyscope: `keys()` helper exported
- [ ] keyscope: all 3 original test files pass + new useZoneKeys tests
- [ ] diff-ui: all 30+ components copied to `registry/components/`
- [ ] diff-ui: theme.css has NO `--severity-*` or `--status-*` tokens
- [ ] diff-ui: `cn` imports in components point to `@/lib/utils`
- [ ] diff-ui: `registry.json` lists all components with correct dependencies
