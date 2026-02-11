# keyscope - Keyboard Navigation Library

Composable keyboard navigation hooks for React applications. Scoped hotkeys, list navigation, and zone-based focus management.

## Overview

`keyscope` provides scoped keyboard handling with support for complex multi-zone navigation patterns. Unlike generic hotkey libraries, keyscope is designed for applications with multiple focus zones (sidebar, lists, panels) that need coordinated keyboard control.

## Installation

```bash
npm install keyscope
# or
yarn add keyscope
# or
pnpm add keyscope
```

## Core Concepts

### Scoped vs Global

keyscope uses a **scope-based architecture**. All keyboard handlers are registered within a scope, and only the active scope's handlers fire. This prevents conflicts when multiple components (modals, panels, lists) register the same keys.

```tsx
import { KeyboardProvider, useKey, useScope } from 'keyscope';

// Wrap your app
function App() {
  return (
    <KeyboardProvider>
      <MainContent />
    </KeyboardProvider>
  );
}

// Use scopes to isolate handlers
function Modal() {
  useScope('modal'); // Activates this scope when mounted
  useKey('Escape', closeModal);
  return <div>...</div>;
}
```

### Zone-Based Navigation

For complex UIs with multiple zones (filters, list, details), use `useFocusZone` + `useZoneKeys`:

```tsx
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
  });

  return (
    <div>
      <FilterPanel active={inZone('filters')} />
      <IssueList active={inZone('list')} />
      <DetailsPanel active={inZone('details')} />
    </div>
  );
}
```

## API Reference

### KeyboardProvider

Required context provider for all keyboard functionality.

```tsx
import { KeyboardProvider } from 'keyscope';

function App() {
  return (
    <KeyboardProvider>
      <YourApp />
    </KeyboardProvider>
  );
}
```

### useKey

Register a single keyboard shortcut within the current scope.

```tsx
const useKey = (
  hotkey: string,
  handler: () => void,
  options?: {
    enabled?: boolean;
    allowInInput?: boolean;
    preventDefault?: boolean;
    targetRef?: React.RefObject<HTMLElement>;
    requireFocusWithin?: boolean;
  }
) => void;
```

**Example:**
```tsx
import { useKey } from 'keyscope';

function SearchDialog() {
  const [isOpen, setIsOpen] = useState(false);

  // Global shortcut (no zone condition)
  useKey('cmd+k', () => setIsOpen(true), { preventDefault: true });
  
  // Only when dialog is open
  useKey('escape', () => setIsOpen(false), { enabled: isOpen });

  return <Dialog open={isOpen} />;
}
```

**Supported Key Formats:**
```tsx
useKey('enter', handler);
useKey('escape', handler);
useKey('arrowup', handler);
useKey('cmd+k', handler);        // Cmd on Mac, Ctrl on Windows
useKey('ctrl+s', handler);       // Always Ctrl
useKey('shift+tab', handler);
useKey('ctrl+shift+p', handler);
```

### useZoneKeys

Register multiple handlers active only in a specific zone. This is the primary API for zone-based keyboard navigation.

```tsx
const useZoneKeys = (
  currentZone: string,
  targetZone: string,
  handlers: Record<string, () => void>,
  options?: {
    enabled?: boolean;
    allowInInput?: boolean;
    preventDefault?: boolean;
    targetRef?: React.RefObject<HTMLElement>;
    requireFocusWithin?: boolean;
  }
) => void;
```

**Example:**
```tsx
import { useFocusZone, useZoneKeys } from 'keyscope';

function ProvidersPage() {
  const { zone } = useFocusZone({
    initial: 'list',
    zones: ['input', 'filters', 'list', 'buttons'],
  });

  // Input zone handlers
  useZoneKeys(zone, 'input', {
    ArrowDown: () => setZone('filters'),
    Escape: () => setZone('filters'),
  }, { allowInInput: true });

  // Filters zone handlers
  useZoneKeys(zone, 'filters', {
    ArrowUp: () => setZone('input'),
    ArrowDown: () => setZone('list'),
    ArrowLeft: () => prevFilter(),
    ArrowRight: () => nextFilter(),
    Enter: () => applyFilter(),
    ' ': () => applyFilter(),
  });

  // List zone handlers
  useZoneKeys(zone, 'list', {
    ArrowUp: () => prevItem(),
    ArrowDown: () => nextItem(),
    Enter: () => openItem(),
  });

  return <div>...</div>;
}
```

**Benefits over multiple `useKey` calls:**
- No repetition of `{ enabled: zone === 'filters' }` for each key
- Visual grouping of keys by zone
- Easier to add/remove keys from a zone

### useScope

Push/pop a scope to isolate keyboard handlers.

```tsx
const useScope = (
  name: string,
  options?: {
    enabled?: boolean;
  }
) => void;
```

**Example:**
```tsx
import { useScope } from 'keyscope';

function Modal() {
  // Activates 'modal' scope on mount, deactivates on unmount
  useScope('modal');
  
  useKey('Escape', closeModal);
  
  return <div>...</div>;
}
```

### useFocusZone

Manage multi-zone focus with arrow key transitions between zones.

```tsx
const useFocusZone = <T extends string>(options: {
  initial: T;
  zones: readonly T[];
  zone?: T;                    // Controlled mode
  onZoneChange?: (zone: T) => void;
  transitions?: (params: { zone: T; key: ArrowKey | 'Tab' }) => T | null;
  tabCycle?: readonly T[];
  scope?: string;
  enabled?: boolean;
}) => {
  zone: T;
  setZone: (zone: T) => void;
  inZone: (...zones: T[]) => boolean;
};
```

**Example with transitions:**
```tsx
import { useFocusZone } from 'keyscope';

function IDE() {
  const { zone, inZone } = useFocusZone({
    initial: 'sidebar',
    zones: ['sidebar', 'editor', 'panel'] as const,
    transitions: ({ zone, key }) => {
      const map: Record<string, Record<string, string>> = {
        sidebar: { ArrowRight: 'editor' },
        editor: { ArrowLeft: 'sidebar', ArrowDown: 'panel' },
        panel: { ArrowUp: 'editor' },
      };
      return map[zone]?.[key] ?? null;
    },
    tabCycle: ['sidebar', 'editor', 'panel'],
  });

  return (
    <div>
      <Sidebar active={inZone('sidebar')} />
      <Editor active={inZone('editor')} />
      <Panel active={inZone('panel')} />
    </div>
  );
}
```

### useNavigation

Navigate through a list using arrow keys. Used internally by UI components.

```tsx
const useNavigation = (options: {
  containerRef: React.RefObject<HTMLElement>;
  role: 'radio' | 'checkbox' | 'option' | 'menuitem';
  value?: string;
  onValueChange?: (value: string) => void;
  onSelect?: () => void;
  onEnter?: (value: string) => void;
  onFocusChange?: (value: string) => void;
  onBoundaryReached?: (direction: 'start' | 'end') => void;
  wrap?: boolean;
  enabled?: boolean;
  initialValue?: string;
  upKeys?: string[];
  downKeys?: string[];
}) => {
  focusedValue: string | null;
  onKeyDown: (event: React.KeyboardEvent) => void;
  isFocused: boolean;
  focus: () => void;
};
```

**Example:**
```tsx
import { useNavigation } from 'keyscope';

function CustomList({ items, value, onChange }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { focusedValue, onKeyDown } = useNavigation({
    containerRef,
    role: 'option',
    value,
    onValueChange: onChange,
    onBoundaryReached: (dir) => {
      // Jump to another zone when reaching list boundary
      if (dir === 'start') setFocusZone('filters');
    },
  });

  return (
    <div ref={containerRef} onKeyDown={onKeyDown}>
      {items.map(item => (
        <div
          key={item.id}
          data-value={item.id}
          aria-selected={item.id === value}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
```

### useTabNavigation

Manage tab panels with keyboard support. Independent of scopes (no Provider required).

```tsx
const useTabNavigation = (tabCount: number, options?: {
  loop?: boolean;
  manual?: boolean;  // Manual activation vs automatic
  onActivate?: (index: number) => void;
}) => {
  activeTab: number;
  selectedTab: number;
  setSelectedTab: (index: number) => void;
  getTabProps: (index: number) => object;
  getPanelProps: (index: number) => object;
};
```

**Example:**
```tsx
import { useTabNavigation } from 'keyscope';

function Tabs({ tabs }) {
  const { selectedTab, getTabProps, getPanelProps } = useTabNavigation(
    tabs.length,
    { manual: false }
  );

  return (
    <div>
      <div role="tablist">
        {tabs.map((tab, i) => (
          <button key={i} {...getTabProps(i)}>
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div key={i} {...getPanelProps(i)}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

## Internal Hooks (Not Exported)

### useKeys (Array Version)

Used internally by `useNavigation` for dynamic key arrays. Not exported publicly.

```tsx
// Internal use only - for dynamic keys like ["ArrowUp", "k"]
useKeys(['ArrowUp', 'k'], () => move(-1), options);
```

## Migration from diffgazer

If migrating from `@diffgazer/keyboard`:

```tsx
// Before:
import { useKey, useNavigation } from '@diffgazer/keyboard';

// After:
import { useKey, useNavigation, useZoneKeys, useFocusZone } from 'keyscope';
```

**Major change:** Replace multiple `useKey` calls with `useZoneKeys`:

```tsx
// Before (verbose):
const inFilters = zone === 'filters';
useKey('ArrowLeft', () => {}, { enabled: inFilters });
useKey('ArrowRight', () => {}, { enabled: inFilters });
useKey('Enter', () => {}, { enabled: inFilters });

// After (clean):
useZoneKeys(zone, 'filters', {
  ArrowLeft: () => {},
  ArrowRight: () => {},
  Enter: () => {},
});
```

## Package Structure

```
keyscope/
├── src/
│   ├── hooks/
│   │   ├── useKey.ts              # Single hotkey
│   │   ├── useZoneKeys.ts         # Zone-based handlers (NEW)
│   │   ├── useNavigation.ts       # List navigation
│   │   ├── useTabNavigation.ts    # Tab panels
│   │   └── useFocusZone.ts        # Multi-zone focus
│   ├── providers/
│   │   └── KeyboardProvider.tsx   # Context provider
│   ├── context/
│   │   └── KeyboardContext.tsx    # Context definition
│   ├── utils/
│   │   ├── isInputElement.ts      # Input detection
│   │   ├── matchesHotkey.ts       # Key matching
│   │   └── types.ts               # TypeScript types
│   └── index.ts                   # Public exports
├── package.json
├── tsconfig.json
└── README.md
```

## NPM Configuration

```json
{
  "name": "keyscope",
  "version": "1.0.0",
  "description": "Composable keyboard navigation hooks for React",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "files": ["dist"],
  "publishConfig": {
    "access": "public"
  },
  "keywords": [
    "react",
    "keyboard",
    "hotkeys",
    "shortcuts",
    "navigation",
    "focus",
    "accessibility",
    "a11y"
  ],
  "license": "MIT"
}
```

## Comparison with Other Libraries

| Library | Scope Support | Zone Navigation | React 19 | Size |
|---------|--------------|-----------------|----------|------|
| keyscope | ✅ Built-in | ✅ useZoneKeys | ✅ useEffectEvent | ~2kb |
| react-hotkeys-hook | ❌ Global only | ❌ | ✅ | ~3kb |
| react-hotkeys | ❌ Global only | ❌ | ❌ | ~5kb |
| reakeys | ❌ Global only | ❌ | ✅ | ~2kb |

## Roadmap

- [x] Initial implementation
- [ ] Comprehensive test suite
- [ ] React 19 concurrent features support
- [ ] DevTools integration
- [ ] Keyboard shortcut visualization component

## License

MIT
