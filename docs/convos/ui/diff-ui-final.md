# diff-ui — Final Package Specification

Terminal-inspired React component library. shadcn/ui-style CLI distribution — you own the code. Extracted from `@diffgazer/ui`.

---

## What Changes vs Current `@diffgazer/ui`

| Change | Type | Why |
|--------|------|-----|
| Rename to `diff-ui` | **Rename** | Standalone npm identity |
| Add CLI (`npx diff-ui add button`) | **New** | shadcn-style distribution — components copied into your project |
| Add component registry | **New** | JSON manifest for CLI to resolve dependencies and fetch components |
| Ship `@diff-ui/core` npm package | **New** | `cn()`, `cva` re-export — the only traditional npm dependency |
| Remove diffgazer-specific tokens | **Change** | Generalize theme (no `--severity-*`, `--status-*`) — those stay in diffgazer app |
| Add light/dark theme out of the box | **Improvement** | Current theme.css already has both — just needs cleanup |

## What Does NOT Change

| Thing | Why |
|-------|-----|
| Component APIs | All props, compound patterns, and context structures stay identical |
| Keyboard integration pattern | Props-based (`focusedValue`, `onKeyDown`) — NO dependency on keyscope |
| Tailwind 4 + CVA + tailwind-merge | Proven stack, no reason to change |
| Compound component architecture | Dialog, Tabs, Menu, NavigationList, Stepper, Toast — all use context + sub-components |
| Zero keyboard dependency | UI components accept props; keyboard logic lives in consumer app (or keyscope) |

---

## Architecture: Keyboard Separation

This is the load-bearing design decision. diff-ui components do NOT handle keyboard navigation internally.

### Pattern

```
┌─────────────────────────────────────────────┐
│  App / Feature Layer                         │
│  ┌─────────────┐   ┌──────────────────┐     │
│  │  keyscope    │──▶│  Page keyboard   │     │
│  │  (optional)  │   │  hooks           │     │
│  └─────────────┘   └──────┬───────────┘     │
│                            │ props           │
│  ┌─────────────────────────▼───────────────┐ │
│  │  diff-ui components                      │ │
│  │  focusedValue, onKeyDown, onSelect       │ │
│  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Why

1. **UI components are reusable** — work in any React app, with or without keyscope
2. **Keyboard logic is centralized** — page-level hooks decide what happens per keypress
3. **Cross-component navigation works** — zone transitions, boundary handling need page-level awareness
4. **Testable in isolation** — components can be tested with just props, no keyboard provider

### Keyboard-Aware Component Props

Components that accept keyboard focus follow this interface pattern:

```ts
interface KeyboardAwareProps {
  focusedValue?: string | null;      // Which child is visually highlighted
  onKeyDown?: (event: KeyboardEvent) => void;  // Delegates to parent
  onSelect?: (id: string) => void;   // Child clicked
  onActivate?: (id: string) => void; // Child activated (Enter/Space)
}
```

Components with this pattern: **RadioGroup**, **CheckboxGroup**, **Menu**, **NavigationList**.

Components WITHOUT keyboard props (purely visual): Button, Badge, Input, Textarea, Panel, Tabs, Dialog, ScrollArea, FocusablePane, all others.

---

## Distribution Model

### CLI (Primary)

```bash
# Initialize project config
npx diff-ui init

# Add specific components
npx diff-ui add button dialog tabs

# Add all components
npx diff-ui add --all
```

`init` creates:
- `components.json` — project config (component path, tailwind config path, aliases)
- Ensures tailwind is configured with diff-ui theme variables

`add` copies component source files into your project:
- Resolves dependencies between components (Dialog needs Portal)
- Installs npm dependencies (`class-variance-authority`, `clsx`, `tailwind-merge`)
- Respects path config from `components.json`

### NPM Package (Core Only)

```bash
npm install @diff-ui/core
```

Only ships utilities — NOT components:

```ts
import { cn } from "@diff-ui/core";
```

### Manual Copy

Components are also available at:
- GitHub repository
- Registry API: `https://diff-ui.dev/r/<component>.json`

---

## Components

### Complete Component List

#### Primitives

| Component | File | Keyboard Props | Notes |
|-----------|------|----------------|-------|
| Button | `button.tsx` | No | Variants: default, secondary, destructive, outline, ghost, link, success, error, tab, toggle |
| Badge | `badge.tsx` | No | Variants: default, secondary, success, error, warning, info, outline |
| Input | `input.tsx` | No | Input + Textarea components |
| Callout | `callout.tsx` | No | Variants: info, success, warning, error, neutral |
| Checkbox | `checkbox.tsx` | **Yes** | CheckboxGroup accepts `focusedValue`, `onKeyDown` |
| Radio | `radio-group.tsx` | **Yes** | RadioGroup accepts `focusedValue`, `onKeyDown` |

#### Display & Layout

| Component | File | Notes |
|-----------|------|-------|
| Panel | `panel.tsx` | Panel + PanelHeader + PanelContent |
| ScrollArea | `scroll-area.tsx` | Overflow wrapper |
| FocusablePane | `focusable-pane.tsx` | Visual focus ring, `isFocused` prop |
| CardLayout | `card-layout.tsx` | Card grid container |
| BlockBar | `block-bar.tsx` | Horizontal block visualization |
| SectionHeader | `section-header.tsx` | Section title with optional actions |
| EmptyState | `empty-state.tsx` | Empty state display |
| KeyValueRow | `key-value-row.tsx` | Key-value pair row |
| KeyValue | `key-value.tsx` | Key-value pair display |
| LabeledField | `labeled-field.tsx` | Label + value with color variant |

#### Compound Components

| Component | Files | Keyboard Props | Notes |
|-----------|-------|----------------|-------|
| Dialog | `dialog/*.tsx` (9 files) | No | Trigger, Content, Header, Title, Description, Body, Footer, Close, Overlay |
| Tabs | `tabs/*.tsx` (5 files) | No | Internal arrow key nav via registeredTriggers ref |
| Menu | `menu/*.tsx` (4 files) | **Yes** | `focusedValue`, `onKeyDown`, `onActivate` |
| NavigationList | `navigation-list/*.tsx` (3 files) | **Yes** | `focusedValue`, `onKeyDown`, `isFocused`, `onActivate` |
| Toast | `toast/*.tsx` (3 files) | No | ToastProvider + useToast hooks |
| Stepper | `stepper/*.tsx` (3 files) | No | Step + Substep |

#### Feature Components

| Component | File | Notes |
|-----------|------|-------|
| SearchInput | `search-input.tsx` | Internal arrow/escape/enter handling |
| ToggleGroup | `toggle-group.tsx` | Toggle button group |
| CodeBlock | `code-block.tsx` | Code display with line numbers |
| DiffView | `diff-view.tsx` | Side-by-side or unified diff |
| Checklist | `checklist.tsx` | Checkbox list |
| HorizontalStepper | `horizontal-stepper.tsx` | Horizontal progress indicator |

#### Utilities

| Export | File | Notes |
|--------|------|-------|
| `cn()` | `lib/cn.ts` | `clsx` + `tailwind-merge` |

---

### Component API Examples

#### Button

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default" size="default">Click me</Button>
<Button variant="success" size="sm">Save</Button>
<Button variant="ghost" size="icon"><Icon /></Button>
```

Variants: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`, `success`, `error`, `tab`, `toggle`
Sizes: `default`, `sm`, `lg`, `icon`

#### Dialog (Compound)

```tsx
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger><Button>Open</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm</DialogTitle>
      <DialogDescription>Are you sure?</DialogDescription>
    </DialogHeader>
    <DialogBody>Content here</DialogBody>
    <DialogFooter>
      <DialogClose><Button variant="ghost">Cancel</Button></DialogClose>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Menu (Keyboard-Aware)

```tsx
import { Menu, MenuItem, MenuDivider } from "@/components/ui/menu";

<Menu
  focusedValue={focusedItemId}
  onKeyDown={handleKeyDown}
  onActivate={handleActivate}
  selectedId={selectedId}
>
  <MenuItem id="edit" label="Edit" />
  <MenuItem id="delete" label="Delete" variant="destructive" />
  <MenuDivider />
  <MenuItem id="settings" label="Settings" />
</Menu>
```

#### NavigationList (Keyboard-Aware)

```tsx
import { NavigationList, NavigationListItem } from "@/components/ui/navigation-list";

<NavigationList
  focusedValue={focusedId}
  onKeyDown={handleKeyDown}
  onActivate={handleActivate}
  isFocused={inZone("list")}
>
  <NavigationListItem id="item-1">
    <span>Item 1</span>
  </NavigationListItem>
  <NavigationListItem id="item-2">
    <span>Item 2</span>
  </NavigationListItem>
</NavigationList>
```

#### Tabs (Internal Keyboard)

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="details">Details</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
  <TabsContent value="details">...</TabsContent>
</Tabs>
```

#### RadioGroup (Keyboard-Aware)

```tsx
import { RadioGroup, RadioGroupItem, Radio } from "@/components/ui/radio-group";

<RadioGroup
  value={selected}
  onValueChange={setSelected}
  focusedValue={focusedValue}
  onKeyDown={handleKeyDown}
>
  <RadioGroupItem value="opt1">
    <Radio />
    <span>Option 1</span>
  </RadioGroupItem>
  <RadioGroupItem value="opt2">
    <Radio />
    <span>Option 2</span>
  </RadioGroupItem>
</RadioGroup>
```

---

## Theme System

### CSS Variables Architecture

diff-ui uses a two-layer variable system:

**Layer 1: Primitive tokens** (raw colors)

```css
:root {
  --tui-bg: #0d1117;
  --tui-fg: #c9d1d9;
  --tui-blue: #58a6ff;
  --tui-violet: #bc8cff;
  --tui-green: #3fb950;
  --tui-red: #ff7b72;
  --tui-yellow: #d29922;
  --tui-border: #30363d;
  --tui-selection: #1f2428;
  --tui-muted: #6e7681;
  --tui-input-bg: #010409;
}
```

**Layer 2: Semantic tokens** (map primitives to roles)

```css
:root {
  --background: var(--tui-bg);
  --foreground: var(--tui-fg);
  --primary: var(--tui-blue);
  --primary-foreground: var(--tui-bg);
  --secondary: var(--tui-selection);
  --secondary-foreground: var(--tui-fg);
  --muted: var(--tui-muted);
  --muted-foreground: #484f58;
  --border: var(--tui-border);
  --input: var(--tui-selection);
  --destructive: var(--tui-red);
  --success: var(--tui-green);
  --warning: var(--tui-yellow);
  --error: var(--tui-red);
  --info: var(--tui-blue);
  --ring: var(--tui-blue);
  --radius: 0.25rem;
}
```

**Light mode** overrides primitive tokens:

```css
[data-theme="light"] {
  --tui-bg: #ffffff;
  --tui-fg: #24292f;
  --tui-blue: #0969da;
  /* ... all primitives change, semantics follow automatically */
}
```

### What Gets Generalized

Current `@diffgazer/ui` has app-specific tokens that should NOT ship in diff-ui:

```css
/* REMOVE from diff-ui (stay in diffgazer app) */
--severity-blocker: var(--tui-red);
--severity-high: var(--tui-yellow);
--severity-medium: #6e7681;
--severity-low: var(--tui-blue);
--severity-nit: var(--muted-foreground);
--status-running: var(--tui-blue);
--status-complete: var(--tui-green);
--status-pending: #6e7681;
```

These are domain-specific (code review) and don't belong in a general UI library. Apps can define their own semantic tokens on top of the primitive layer.

### What Ships

diff-ui ships 3 CSS files:

| File | Contents |
|------|----------|
| `theme.css` | CSS variables (primitive + semantic tokens), dark/light themes, Tailwind 4 `@theme` block, animations, scrollbar styles |
| `styles.css` | Base component styles (if any needed beyond Tailwind) |
| `sources.css` | Font imports (JetBrains Mono) |

Consumer imports:

```ts
// In your app's root CSS or layout
import "diff-ui/theme.css";
import "diff-ui/sources.css";
```

Or via the CLI `init` command which sets this up automatically.

---

## Integration with keyscope

diff-ui and keyscope are **independent packages**. They work together through props — no import dependency.

### Pattern: Page-Level Wiring

```tsx
import { useFocusZone, useZoneKeys, useNavigation } from "keyscope";
import { NavigationList, NavigationListItem, FocusablePane } from "@/components/ui";

function ProvidersPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { zone, setZone, inZone } = useFocusZone({
    initial: "list",
    zones: ["filters", "list", "buttons"] as const,
  });

  const { focusedValue, onKeyDown } = useNavigation({
    containerRef,
    role: "option",
    enabled: inZone("list"),
    onBoundaryReached: (dir) => {
      if (dir === "start") setZone("filters");
    },
  });

  useZoneKeys(zone, "buttons", {
    "Enter | Space": () => handleAction(),
    ArrowLeft: () => setZone("list"),
  });

  return (
    <div>
      <FocusablePane isFocused={inZone("filters")}>
        <FilterBar />
      </FocusablePane>

      <FocusablePane isFocused={inZone("list")}>
        <NavigationList
          ref={containerRef}
          focusedValue={focusedValue}
          onKeyDown={onKeyDown}
          isFocused={inZone("list")}
        >
          {items.map(item => (
            <NavigationListItem key={item.id} id={item.id}>
              {item.name}
            </NavigationListItem>
          ))}
        </NavigationList>
      </FocusablePane>
    </div>
  );
}
```

### Without keyscope

diff-ui works without keyscope — just wire keyboard events yourself:

```tsx
import { Menu, MenuItem } from "@/components/ui/menu";

function SimpleMenu() {
  const [focused, setFocused] = useState<string | null>(null);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") setFocused(nextItem);
    if (e.key === "ArrowUp") setFocused(prevItem);
  };

  return (
    <Menu focusedValue={focused} onKeyDown={handleKeyDown}>
      <MenuItem id="a" label="Option A" />
      <MenuItem id="b" label="Option B" />
    </Menu>
  );
}
```

---

## File Structure

```
diff-ui/
├── apps/
│   └── docs/                          # Documentation site (future)
│
├── packages/
│   ├── cli/                           # diff-ui CLI
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts            # Project setup
│   │   │   │   ├── add.ts             # Add components
│   │   │   │   └── list.ts            # List available
│   │   │   ├── utils/
│   │   │   │   ├── registry.ts        # Fetch from registry
│   │   │   │   ├── templates.ts       # Component templates
│   │   │   │   └── transformers.ts    # Path/import transforms
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── core/                          # @diff-ui/core (npm package)
│   │   ├── src/
│   │   │   ├── cn.ts                  # clsx + tailwind-merge
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── tsconfig/                      # Shared TS configs
│
├── registry/                          # Component registry
│   ├── registry.json                  # Main manifest
│   └── components/
│       ├── button/
│       │   ├── button.tsx
│       │   └── registry-item.json
│       ├── badge/
│       ├── input/
│       ├── checkbox/
│       ├── radio-group/
│       ├── callout/
│       ├── panel/
│       ├── scroll-area/
│       ├── focusable-pane/
│       ├── card-layout/
│       ├── block-bar/
│       ├── section-header/
│       ├── empty-state/
│       ├── key-value-row/
│       ├── key-value/
│       ├── labeled-field/
│       ├── dialog/
│       │   ├── dialog.tsx
│       │   ├── dialog-trigger.tsx
│       │   ├── dialog-content.tsx
│       │   ├── dialog-context.tsx
│       │   ├── dialog-header.tsx
│       │   ├── dialog-title.tsx
│       │   ├── dialog-description.tsx
│       │   ├── dialog-body.tsx
│       │   ├── dialog-footer.tsx
│       │   ├── dialog-close.tsx
│       │   └── registry-item.json
│       ├── tabs/
│       ├── menu/
│       ├── navigation-list/
│       ├── toast/
│       ├── stepper/
│       ├── search-input/
│       ├── toggle-group/
│       ├── code-block/
│       ├── diff-view/
│       ├── checklist/
│       ├── horizontal-stepper/
│       └── internal/
│           ├── selectable-item.ts     # Shared CVA for radio/checkbox
│           └── portal.tsx             # Portal component
│
├── styles/
│   ├── theme.css                      # Theme variables + Tailwind config
│   ├── styles.css                     # Base styles
│   └── sources.css                    # Font imports
│
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Registry Schema

### registry.json (main manifest)

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "diff-ui",
  "homepage": "https://diff-ui.dev",
  "items": [
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
    },
    {
      "name": "dialog",
      "type": "registry:component",
      "title": "Dialog",
      "description": "Modal dialog with keyboard support",
      "dependencies": ["class-variance-authority", "clsx", "tailwind-merge"],
      "registryDependencies": ["button"],
      "files": [
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
    },
    {
      "name": "menu",
      "type": "registry:component",
      "title": "Menu",
      "description": "Navigation menu with keyboard focus support",
      "dependencies": ["class-variance-authority", "clsx", "tailwind-merge"],
      "registryDependencies": [],
      "files": [
        { "path": "registry/components/menu/menu.tsx", "type": "registry:component" },
        { "path": "registry/components/menu/menu-item.tsx", "type": "registry:component" },
        { "path": "registry/components/menu/menu-divider.tsx", "type": "registry:component" },
        { "path": "registry/components/menu/menu-context.tsx", "type": "registry:component" }
      ]
    }
  ]
}
```

### Component Dependencies

Verified against actual source imports:

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
search-input       → (none)             ← renders own <input> inline, no import
toggle-group       → button
code-block         → scroll-area        ← code-block.tsx imports ScrollArea
diff-view          → (none)
checklist          → (none)             ← uses plain <button> with [x]/[ ] text, no checkbox import
horizontal-stepper → (none)
```

---

## NPM Packages

### @diff-ui/core

```json
{
  "name": "@diff-ui/core",
  "version": "1.0.0",
  "description": "Core utilities for diff-ui components",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "dependencies": {
    "clsx": "^2.1.0",
    "tailwind-merge": "^3.0.0"
  },
  "files": ["dist"],
  "license": "MIT"
}
```

Exports only:

```ts
export { cn } from "./cn";
```

### diff-ui (CLI)

```json
{
  "name": "diff-ui",
  "version": "1.0.0",
  "description": "Terminal-inspired UI components for React",
  "type": "module",
  "bin": {
    "diff-ui": "./dist/index.js"
  },
  "files": ["dist"],
  "license": "MIT"
}
```

---

## Migration from @diffgazer/ui

### In diffgazer monorepo

After extracting to diff-ui, the diffgazer app switches from workspace dependency to either:

**Option A: Use diff-ui CLI** (recommended for dogfooding)

```bash
npx diff-ui init
npx diff-ui add --all
```

Components live in `apps/web/src/components/ui/`. Import paths change:

```ts
// Before:
import { Button } from "@diffgazer/ui";
// After:
import { Button } from "@/components/ui/button";
```

**Option B: Keep as workspace dependency during transition**

Point to the diff-ui registry package as a workspace dep temporarily. Migrate imports gradually.

### App-specific tokens

Move these from diff-ui's theme.css into diffgazer's own CSS:

```css
/* apps/web/src/styles/app-tokens.css */
:root {
  --severity-blocker: var(--tui-red);
  --severity-high: var(--tui-yellow);
  --severity-medium: #6e7681;
  --severity-low: var(--tui-blue);
  --severity-nit: var(--muted-foreground);
  --status-running: var(--tui-blue);
  --status-complete: var(--tui-green);
  --status-pending: #6e7681;
}
```

---

## Relationship to keyscope

| | diff-ui | keyscope |
|---|---|---|
| **Type** | UI component library | Keyboard navigation library |
| **Distribution** | CLI (shadcn-style) | npm package |
| **React version** | 18 or 19 | 19 only (useEffectEvent) |
| **Dependency on each other** | None | None |
| **Work together via** | Props (`focusedValue`, `onKeyDown`) | Returns values to pass as props |
| **Can use independently** | Yes | Yes |

Neither package imports the other. They communicate through the props interface that keyboard-aware components accept.
