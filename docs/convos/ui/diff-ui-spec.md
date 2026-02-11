# diff-ui - Terminal-Inspired UI Library

A shadcn/ui-style component library with terminal aesthetics. CLI-driven code distribution with copy-paste fallback.

## Overview

`diff-ui` provides beautifully-designed, terminal-inspired React components. Unlike traditional npm packages, diff-ui uses a **CLI-first approach** where you own the code.

## Philosophy

**"Own your UI"** - We don't ship a black-box npm package. Instead:
- CLI installs components directly into your codebase
- Full control over styling and behavior
- No dependency on our update cycle
- Easy to customize and extend

## Quick Start

```bash
# 1. Initialize your project
npx diff-ui init

# 2. Add components
npx diff-ui add button dialog tabs

# 3. Use in your code
import { Button } from '@/components/ui/button';
```

## Installation Methods

### Method 1: CLI (Recommended)

```bash
# Initialize project configuration
npx diff-ui init

# Add specific components
npx diff-ui add button
npx diff-ui add dialog tabs panel

# Add all components
npx diff-ui add --all

# Options
npx diff-ui add button --overwrite
npx diff-ui add button --path=src/ui
npx diff-ui add button --base-color=slate
```

### Method 2: NPM Package (Core Only)

```bash
# Install only utilities
npm install @diff-ui/core

# Import utilities
import { cn } from '@diff-ui/core';
```

### Method 3: Manual Copy

Copy components directly from:
- [GitHub Repository](https://github.com/yourusername/diff-ui)
- [Documentation Site](https://diff-ui.dev)
- Registry API: `https://diff-ui.dev/r/button.json`

## Components

### Core Primitives

#### Button
Terminal-inspired button with variants.

```tsx
import { Button } from '@/components/ui/button';

<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="success">Success</Button>
<Button variant="error">Error</Button>
```

**Props:**
- `variant`: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' | 'success' | 'error'
- `size`: 'default' | 'sm' | 'lg' | 'icon'

#### Badge
Status indicators with semantic colors.

```tsx
import { Badge } from '@/components/ui/badge';

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="error">Error</Badge>
```

#### Input & Textarea
Form controls with terminal styling.

```tsx
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

<Input placeholder="Type here..." />
<Textarea placeholder="Multi-line..." />
```

#### Checkbox & Radio
Selection controls.

```tsx
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

<Checkbox />
<RadioGroup>
  <RadioGroupItem value="1">Option 1</RadioGroupItem>
  <RadioGroupItem value="2">Option 2</RadioGroupItem>
</RadioGroup>
```

### Layout Components

#### Panel
Card-like containers.

```tsx
import { Panel } from '@/components/ui/panel';

<Panel>
  <Panel.Header>Title</Panel.Header>
  <Panel.Content>Content here</Panel.Content>
</Panel>
```

#### Dialog
Modal dialogs with keyboard support.

```tsx
import { Dialog } from '@/components/ui/dialog';

<Dialog>
  <Dialog.Trigger>
    <Button>Open</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Description>Description</Dialog.Description>
    </Dialog.Header>
    <Dialog.Body>Content</Dialog.Body>
    <Dialog.Footer>
      <Button>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

#### Tabs
Tab navigation.

```tsx
import { Tabs } from '@/components/ui/tabs';

<Tabs defaultValue="1">
  <Tabs.List>
    <Tabs.Trigger value="1">Tab 1</Tabs.Trigger>
    <Tabs.Trigger value="2">Tab 2</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="1">Content 1</Tabs.Content>
  <Tabs.Content value="2">Content 2</Tabs.Content>
</Tabs>
```

### Advanced Components

#### Stepper
Wizard/progress indicator.

```tsx
import { Stepper } from '@/components/ui/stepper';

<Stepper currentStep={2}>
  <Stepper.Step title="Step 1" />
  <Stepper.Step title="Step 2" />
  <Stepper.Step title="Step 3" />
</Stepper>
```

#### DiffView
**Unique component** - code diff display.

```tsx
import { DiffView } from '@/components/ui/diff-view';

<DiffView
  oldValue={oldCode}
  newValue={newCode}
  language="typescript"
/>
```

#### SearchInput
Search with icon and keyboard shortcut.

```tsx
import { SearchInput } from '@/components/ui/search-input';

<SearchInput 
  placeholder="Search..."
  shortcut="cmd+k"
/>
```

### Keyboard Integration

Components work seamlessly with `keyscope`:

```bash
# Add keyboard navigation support
npx diff-ui add keyboard
# This installs: npm install keyscope
```

#### Basic Hotkeys

```tsx
import { useKey } from 'keyscope';
import { Dialog } from '@/components/ui/dialog';

function AccessibleDialog() {
  useKey('escape', closeDialog);
  
  return (
    <Dialog>
      {/* Dialog with built-in keyboard support */}
    </Dialog>
  );
}
```

#### Zone-Based Navigation (Recommended)

For complex UIs with multiple zones (sidebar, list, details), use `useZoneKeys`:

```tsx
import { useFocusZone, useZoneKeys } from 'keyscope';
import { NavigationList } from '@/components/ui/navigation-list';
import { Panel } from '@/components/ui/panel';

function ReviewPage() {
  const { zone, inZone } = useFocusZone({
    initial: 'filters',
    zones: ['filters', 'list', 'details'],
  });

  // Keys active only in 'filters' zone
  useZoneKeys(zone, 'filters', {
    ArrowLeft: () => moveFilter(-1),
    ArrowRight: () => moveFilter(1),
    Enter: () => applyFilter(),
  });

  // Keys active only in 'list' zone
  useZoneKeys(zone, 'list', {
    ArrowUp: () => selectPrev(),
    ArrowDown: () => selectNext(),
    Enter: () => openSelected(),
    j: () => selectNext(),
    k: () => selectPrev(),
  });

  // Keys active only in 'details' zone
  useZoneKeys(zone, 'details', {
    ArrowUp: () => scrollUp(),
    ArrowDown: () => scrollDown(),
    '1': () => setTab('overview'),
    '2': () => setTab('changes'),
  });

  return (
    <div>
      <FilterPanel active={inZone('filters')} />
      <NavigationList active={inZone('list')} />
      <DetailsPanel active={inZone('details')} />
    </div>
  );
}
```

**Benefits of `useZoneKeys`:**
- Groups related keys by zone
- No repetition of `enabled: zone === 'x'` for each key
- Cleaner, more maintainable code
- Automatic cleanup when zone changes

## Theming

### CSS Variables

```css
:root {
  /* Base colors */
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
  
  /* Terminal-specific colors */
  --terminal-green: 142 76% 36%;
  --terminal-red: 0 84% 60%;
  --terminal-yellow: 45 93% 47%;
  --terminal-blue: 217 91% 60%;
  --terminal-cyan: 189 94% 43%;
  --terminal-magenta: 292 84% 61%;
}
```

### Dark Mode

```css
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 240 4.9% 83.9%;
}
```

## CLI Commands

### `init`
Initialize project configuration.

```bash
npx diff-ui init

# Options
npx diff-ui init --yes        # Skip prompts
npx diff-ui init --defaults   # Use defaults
```

Creates:
- `components.json` - Component configuration
- `tailwind.config.ts` - Tailwind setup
- `src/components/ui/` - Component directory

### `add`
Add components to your project.

```bash
npx diff-ui add <component...>

# Examples
npx diff-ui add button
npx diff-ui add button dialog tabs
npx diff-ui add --all

# Options
npx diff-ui add button --overwrite
npx diff-ui add button --path=src/ui
npx diff-ui add button --base-color=zinc
npx diff-ui add button --no-deps
```

### `list`
List available components.

```bash
npx diff-ui list
npx diff-ui list --json
```

## Project Structure

```
diff-ui/
├── apps/
│   └── docs/                    # Documentation site
│       ├── app/
│       │   ├── components/      # Component showcase
│       │   ├── docs/           # MDX documentation
│       │   └── registry/       # Registry API endpoint
│       └── package.json
│
├── packages/
│   ├── cli/                     # CLI package (diff-ui)
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── add.ts
│   │   │   │   ├── init.ts
│   │   │   │   └── list.ts
│   │   │   ├── utils/
│   │   │   │   ├── registry.ts
│   │   │   │   ├── templates.ts
│   │   │   │   └── transformers.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── core/                   # @diff-ui/core
│   │   ├── src/
│   │   │   ├── cn.ts          # Class merging
│   │   │   ├── cva.ts         # Variant utilities
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── tsconfig/              # Shared configurations
│
├── registry/                   # Component registry
│   ├── registry.json          # Main manifest
│   └── components/
│       ├── button/
│       │   ├── button.tsx
│       │   ├── button.css
│       │   └── registry-item.json
│       ├── dialog/
│       └── ...
│
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Registry Schema

### registry.json

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
      "description": "Terminal-inspired button component",
      "dependencies": ["@diff-ui/core"],
      "files": [
        {
          "path": "registry/components/button/button.tsx",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```

### Component Structure

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "button",
  "type": "registry:component",
  "title": "Button",
  "description": "Terminal-inspired button component",
  "dependencies": ["@diff-ui/core"],
  "registryDependencies": [],
  "files": [
    {
      "path": "button.tsx",
      "content": "base64-encoded-content"
    }
  ],
  "css": {
    "vars": {
      "--button-primary": "var(--color-primary)"
    }
  }
}
```

## NPM Packages

### @diff-ui/core

Core utilities used by components.

```bash
npm install @diff-ui/core
```

```tsx
import { cn } from '@diff-ui/core';
import { cva, type VariantProps } from '@diff-ui/core';
```

### diff-ui (CLI)

Command-line interface.

```bash
npm install -g diff-ui
# or
npx diff-ui
```

## Migration from diffgazer

If you're migrating from the internal `@diffgazer/ui`:

```bash
# 1. Remove old package
npm uninstall @diffgazer/ui

# 2. Initialize diff-ui
npx diff-ui init

# 3. Add your components
npx diff-ui add button dialog tabs

# 4. Update imports
# Before:
import { Button } from '@diffgazer/ui';
// After:
import { Button } from '@/components/ui/button';
```

## Roadmap

### Phase 1: Foundation
- [ ] Core utilities (@diff-ui/core)
- [ ] CLI implementation
- [ ] Registry hosting
- [ ] 10 core components

### Phase 2: Expansion
- [ ] 25+ components
- [ ] Documentation site
- [ ] Component playground
- [ ] Dark mode themes

### Phase 3: Ecosystem
- [ ] VS Code extension
- [ ] Figma plugin
- [ ] Component templates
- [ ] Community registry

## Contributing

We welcome contributions! See our [Contributing Guide](./CONTRIBUTING.md).

## License

MIT
