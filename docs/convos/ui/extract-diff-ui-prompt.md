# Prompt: Extract diff-ui from diffgazer monorepo

## Context

You are extracting the UI component library from the diffgazer monorepo into a new standalone monorepo. **COPY only — do NOT modify or delete anything in the source monorepo.**

- **Source**: `/Users/voitz/Projects/diffgazer/packages/ui/`
- **Target**: `/Users/voitz/Projects/diff-ui/` (new repo — this IS a monorepo with pnpm workspaces)
- **Spec**: Read `/Users/voitz/Projects/diffgazer/docs/design/diff-ui-final.md` FIRST — it contains the complete spec with component list, architecture, and theme system.

diff-ui is a terminal-inspired React component library distributed shadcn-style (CLI copies components into your project). It has 30+ components, a CSS theme system, and zero keyboard dependencies.

---

## Step 1: Create monorepo structure

Create this at `/Users/voitz/Projects/diff-ui/`:

```
diff-ui/
├── packages/
│   ├── core/                    # @diff-ui/core npm package (cn utility)
│   │   └── src/
│   ├── cli/                     # diff-ui CLI (scaffold for now)
│   │   └── src/
│   └── tsconfig/                # Shared TS configs
│
├── registry/                    # Component source files for CLI distribution
│   ├── registry.json            # Component manifest
│   └── components/
│       └── internal/
│
├── styles/                      # Theme CSS
│
├── package.json                 # Root workspace
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
└── LICENSE
```

---

## Step 2: Create shared tsconfig

Copy from source `/Users/voitz/Projects/diffgazer/packages/tsconfig/`:

Copy `base.json` and `react.json` to `packages/tsconfig/`.

Create `packages/tsconfig/package.json`:

```json
{
  "name": "@diff-ui/tsconfig",
  "version": "0.0.1",
  "private": true,
  "license": "MIT",
  "files": ["*.json"]
}
```

---

## Step 3: Create `@diff-ui/core` package

This is the ONLY npm package consumers install. Contains `cn()` (clsx + tailwind-merge).

**Copy** `/Users/voitz/Projects/diffgazer/packages/ui/src/lib/cn.ts` → `packages/core/src/cn.ts`

Create `packages/core/src/index.ts`:

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
  },
  "devDependencies": {
    "@diff-ui/tsconfig": "workspace:*",
    "typescript": "^5.9.3"
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

---

## Step 4: Copy styles

Source: `/Users/voitz/Projects/diffgazer/packages/ui/src/styles/`

| Source | Target | Action |
|--------|--------|--------|
| `theme.css` | `styles/theme.css` | Copy, then **REMOVE app-specific tokens** |
| `index.css` | `styles/styles.css` | Copy as-is |
| `sources.css` | `styles/sources.css` | Copy, then **update `@source` paths** |

### Clean `styles/theme.css`

After copying, DELETE these app-specific token blocks from **BOTH** the `:root` / `[data-theme="dark"]` section AND the `[data-theme="light"]` section:

```css
/* DELETE all of these */
--severity-blocker: ...;
--severity-high: ...;
--severity-medium: ...;
--severity-low: ...;
--severity-nit: ...;
--status-running: ...;
--status-complete: ...;
--status-pending: ...;
```

Also DELETE the corresponding entries from the `@theme` block:

```css
/* DELETE all of these from @theme */
--color-severity-blocker: ...;
--color-severity-high: ...;
--color-severity-medium: ...;
--color-severity-low: ...;
--color-severity-nit: ...;
--color-status-running: ...;
--color-status-complete: ...;
--color-status-pending: ...;
```

Everything else in theme.css stays (tui primitives, semantic tokens, subtle/strong variants, animations, scrollbar styles, font-face, @theme, @custom-variant, utility classes).

### Update `styles/sources.css`

The source file has `@source "./components"` and `@source "./internal"`. These paths are relative to the old structure. Update to point to the registry:

```css
@source "../registry/components";
```

---

## Step 5: Copy ALL components into registry

Source base: `/Users/voitz/Projects/diffgazer/packages/ui/src/`

### Single-file components → each gets its own directory

| Source (`components/`) | Target (`registry/components/`) |
|---|---|
| `button.tsx` | `button/button.tsx` |
| `badge.tsx` | `badge/badge.tsx` |
| `input.tsx` | `input/input.tsx` |
| `callout.tsx` | `callout/callout.tsx` |
| `checkbox.tsx` | `checkbox/checkbox.tsx` |
| `radio-group.tsx` | `radio-group/radio-group.tsx` |
| `panel.tsx` | `panel/panel.tsx` |
| `scroll-area.tsx` | `scroll-area/scroll-area.tsx` |
| `focusable-pane.tsx` | `focusable-pane/focusable-pane.tsx` |
| `card-layout.tsx` | `card-layout/card-layout.tsx` |
| `block-bar.tsx` | `block-bar/block-bar.tsx` |
| `section-header.tsx` | `section-header/section-header.tsx` |
| `empty-state.tsx` | `empty-state/empty-state.tsx` |
| `key-value-row.tsx` | `key-value-row/key-value-row.tsx` |
| `key-value.tsx` | `key-value/key-value.tsx` |
| `labeled-field.tsx` | `labeled-field/labeled-field.tsx` |
| `search-input.tsx` | `search-input/search-input.tsx` |
| `toggle-group.tsx` | `toggle-group/toggle-group.tsx` |
| `code-block.tsx` | `code-block/code-block.tsx` |
| `diff-view.tsx` | `diff-view/diff-view.tsx` |
| `checklist.tsx` | `checklist/checklist.tsx` |
| `horizontal-stepper.tsx` | `horizontal-stepper/horizontal-stepper.tsx` |

### Compound components → preserve directory structure INCLUDING `index.ts`

Each compound component directory has an `index.ts` barrel export file. Copy ALL files (`.tsx` + `index.ts`):

| Source directory (`components/`) | Target directory (`registry/components/`) | Files to copy |
|---|---|---|
| `dialog/` | `dialog/` | ALL `.tsx` files + `index.ts` |
| `tabs/` | `tabs/` | ALL `.tsx` files + `index.ts` |
| `menu/` | `menu/` | ALL `.tsx` files + `index.ts` |
| `navigation-list/` | `navigation-list/` | ALL `.tsx` files + `index.ts` |
| `toast/` | `toast/` | ALL `.tsx` files + `index.ts` |
| `stepper/` | `stepper/` | ALL `.tsx` files + `index.ts` |

### Internal utilities

Source: `/Users/voitz/Projects/diffgazer/packages/ui/src/internal/`

| Source | Target |
|--------|--------|
| `selectable-item.ts` | `registry/components/internal/selectable-item.ts` |
| `portal.tsx` | `registry/components/internal/portal.tsx` |

---

## Step 6: Fix imports in ALL registry components

Four categories of import transforms needed:

### A. `cn` utility import

In EVERY component file, replace the `cn` import. The target is always `"@/lib/utils"` (shadcn convention):

```
FROM: import { cn } from "../lib/cn"        (single-file components)
TO:   import { cn } from "@/lib/utils"

FROM: import { cn } from "../../lib/cn"      (compound component subfiles)
TO:   import { cn } from "@/lib/utils"
```

### B. Internal cross-references

**Single-file components** (checkbox, radio-group) import from `../internal/...`. These paths are STILL CORRECT after the move because both `checkbox/` and `internal/` are siblings under `registry/components/`:

```
FROM (checkbox.tsx):        import { ... } from "../internal/selectable-item"
TO (checkbox/checkbox.tsx): import { ... } from "../internal/selectable-item"   ← NO CHANGE needed
```

**Compound components** imported from `../../internal/...` (two levels up). After the move, `internal/` is a sibling, so only ONE level up:

```
FROM (dialog/dialog-content.tsx):  import { Portal } from "../../internal/portal"
TO (dialog/dialog-content.tsx):    import { Portal } from "../internal/portal"    ← CHANGED
```

### C. Cross-component imports

**Single-file → single-file** (was same directory, now sibling directories):

```
FROM (code-block.tsx):     import { ScrollArea } from "./scroll-area"
TO (code-block/code-block.tsx): import { ScrollArea } from "../scroll-area/scroll-area"

FROM (toggle-group.tsx):   import { Button } from "./button"
TO (toggle-group/toggle-group.tsx): import { Button } from "../button/button"
```

**Compound → single-file** (was `../component`, now `../component/component`):

```
FROM (stepper/stepper-step.tsx):    import { Badge } from "../badge"
TO (stepper/stepper-step.tsx):      import { Badge } from "../badge/badge"

FROM (stepper/stepper-substep.tsx): import { Badge } from "../badge"
TO (stepper/stepper-substep.tsx):   import { Badge } from "../badge/badge"
```

### D. Intra-compound imports (NO CHANGE needed)

Imports within the same compound directory stay as-is:
- `./dialog-context` in dialog files
- `./menu-context` in menu files
- `./navigation-list-context` in navigation-list files
- `./tabs-context` in tabs files
- `./toast-context` and `./toast` in toast files
- `./stepper-substep` in stepper-step.tsx

---

## Step 7: Scaffold CLI package

Create `packages/cli/src/index.ts`:

```ts
#!/usr/bin/env node
// diff-ui CLI
// TODO: implement init, add, list commands
console.log("diff-ui CLI - coming soon");
console.log("Usage: diff-ui <command>");
console.log("Commands: init, add, list");
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
  },
  "devDependencies": {
    "@diff-ui/tsconfig": "workspace:*",
    "typescript": "^5.9.3"
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

---

## Step 8: Create `registry.json`

Create `registry/registry.json` with a manifest of ALL components. Use the shadcn registry schema.

Corrected component dependency graph (verified against actual source imports):

```
button             → (none)
badge              → (none)
input              → (none)
callout            → (none)
checkbox           → internal/selectable-item
radio-group        → internal/selectable-item
panel              → (none)
scroll-area        → (none)
focusable-pane     → (none)
card-layout        → (none)
block-bar          → (none)
section-header     → (none)
empty-state        → (none)
key-value-row      → (none)
key-value          → (none)
labeled-field      → (none)
dialog             → internal/portal
tabs               → (none)
menu               → (none)
navigation-list    → (none)
toast              → (none)
stepper            → badge              ← stepper-step.tsx + stepper-substep.tsx import Badge
search-input       → (none)             ← does NOT import input (renders own <input> inline)
toggle-group       → button
code-block         → scroll-area        ← code-block.tsx imports ScrollArea
diff-view          → (none)
checklist          → (none)             ← does NOT import checkbox (uses plain <button> with [x]/[ ] text)
horizontal-stepper → (none)
```

Format for each entry:

```json
{
  "name": "button",
  "type": "registry:component",
  "title": "Button",
  "description": "Terminal-inspired button with variants",
  "dependencies": ["class-variance-authority", "clsx", "tailwind-merge"],
  "registryDependencies": [],
  "files": [
    { "path": "registry/components/button/button.tsx", "type": "registry:component" }
  ]
}
```

For components with registry dependencies:

```json
{
  "name": "code-block",
  "type": "registry:component",
  "title": "Code Block",
  "description": "Code display with line numbers",
  "dependencies": ["class-variance-authority", "clsx", "tailwind-merge"],
  "registryDependencies": ["scroll-area"],
  "files": [
    { "path": "registry/components/code-block/code-block.tsx", "type": "registry:component" }
  ]
}
```

For compound components, list ALL files including `index.ts` barrel:

```json
{
  "name": "dialog",
  "type": "registry:component",
  "title": "Dialog",
  "description": "Modal dialog with compound components",
  "dependencies": ["class-variance-authority", "clsx", "tailwind-merge"],
  "registryDependencies": [],
  "files": [
    { "path": "registry/components/dialog/index.ts", "type": "registry:component" },
    { "path": "registry/components/dialog/dialog.tsx", "type": "registry:component" },
    { "path": "registry/components/dialog/dialog-trigger.tsx", "type": "registry:component" },
    { "path": "registry/components/dialog/dialog-content.tsx", "type": "registry:component" },
    { "path": "registry/components/dialog/dialog-context.tsx", "type": "registry:component" },
    { "path": "registry/components/dialog/dialog-header.tsx", "type": "registry:component" },
    { "path": "registry/components/dialog/dialog-title.tsx", "type": "registry:component" },
    { "path": "registry/components/dialog/dialog-description.tsx", "type": "registry:component" },
    { "path": "registry/components/dialog/dialog-body.tsx", "type": "registry:component" },
    { "path": "registry/components/dialog/dialog-footer.tsx", "type": "registry:component" },
    { "path": "registry/components/dialog/dialog-close.tsx", "type": "registry:component" },
    { "path": "registry/components/internal/portal.tsx", "type": "registry:component" }
  ]
}
```

Stepper (has badge dependency + index.ts):

```json
{
  "name": "stepper",
  "type": "registry:component",
  "title": "Stepper",
  "description": "Step-by-step progress indicator",
  "dependencies": ["class-variance-authority", "clsx", "tailwind-merge"],
  "registryDependencies": ["badge"],
  "files": [
    { "path": "registry/components/stepper/index.ts", "type": "registry:component" },
    { "path": "registry/components/stepper/stepper.tsx", "type": "registry:component" },
    { "path": "registry/components/stepper/stepper-step.tsx", "type": "registry:component" },
    { "path": "registry/components/stepper/stepper-substep.tsx", "type": "registry:component" }
  ]
}
```

Create entries for ALL 28 components with correct dependencies per the graph above. All compound component entries must include their `index.ts` barrel file.

---

## Step 9: Create root monorepo config

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
  "type": "module",
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

**`.gitignore`:**

```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
.turbo/
```

---

## Step 10: Initialize, install, verify, commit

```bash
cd /Users/voitz/Projects/diff-ui
git init
pnpm install
pnpm build         # MUST build core + cli packages successfully
pnpm type-check    # MUST pass for core + cli
```

If build or type-check fails, fix the issues before committing.

Then commit:

```bash
git add .
git commit -m "Initial diff-ui extraction from diffgazer

Terminal-inspired React component library with shadcn-style CLI distribution.
Extracted from @diffgazer/ui:
- @diff-ui/core: cn() utility (npm package)
- Component registry: 28 components with dependency manifest
- Theme system: dark/light CSS variables (app-specific tokens removed)
- CLI scaffold for future npx diff-ui add <component>"
```

---

## Verification Checklist

- [ ] `/Users/voitz/Projects/diffgazer/` is UNTOUCHED — no files modified or removed
- [ ] `pnpm build` succeeds (core + cli produce `dist/`)
- [ ] `pnpm type-check` passes for core and cli packages
- [ ] `packages/core/src/cn.ts` exists and exports `cn()`
- [ ] `styles/theme.css` has NO `--severity-*` or `--status-*` tokens
- [ ] `styles/theme.css` still has all `--tui-*` primitives and semantic tokens
- [ ] ALL 28 components exist in `registry/components/` (22 single-file dirs + 6 compound dirs)
- [ ] All 6 compound dirs have `index.ts` barrel files
- [ ] `registry/components/internal/` has `selectable-item.ts` and `portal.tsx`
- [ ] `registry/registry.json` has entries for all 28 components
- [ ] `code-block` has `registryDependencies: ["scroll-area"]`
- [ ] `stepper` has `registryDependencies: ["badge"]`
- [ ] `checklist` has `registryDependencies: []` (NOT checkbox)
- [ ] `search-input` has `registryDependencies: []` (NOT input)
- [ ] ALL `cn` imports point to `"@/lib/utils"` (NOT `"../lib/cn"` or `"../../lib/cn"`)
- [ ] `dialog-content.tsx` imports portal as `"../internal/portal"` (NOT `"../../internal/portal"`)
- [ ] `stepper-step.tsx` and `stepper-substep.tsx` import badge as `"../badge/badge"` (NOT `"../badge"`)
- [ ] `code-block.tsx` imports scroll-area as `"../scroll-area/scroll-area"` (NOT `"./scroll-area"`)
- [ ] `toggle-group.tsx` imports button as `"../button/button"` (NOT `"./button"`)
- [ ] `styles/sources.css` has `@source "../registry/components"` (NOT `"./components"`)
- [ ] `pnpm-workspace.yaml` and `turbo.json` exist
- [ ] git repo initialized with initial commit
