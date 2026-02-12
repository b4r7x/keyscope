# keyscope

Composable, scoped keyboard navigation hooks for React.

- **Scoped** -- handlers only fire in the active scope (modal layering, dialogs)
- **Composable** -- build complex navigation from simple hooks
- **Tiny** -- ~1.5KB gzipped, zero dependencies
- **React 19** -- uses `useEffectEvent` for stable handlers, no stale closures

## Install

```
npm install keyscope
```

> Requires React 19+ as a peer dependency.

## Quick Start

```tsx
import { KeyboardProvider, useKey } from "keyscope";

function App() {
  return (
    <KeyboardProvider>
      <Editor />
    </KeyboardProvider>
  );
}

function Editor() {
  useKey("ctrl+s", (event) => {
    event.preventDefault();
    save();
  });

  useKey("Escape", () => close());

  return <div>...</div>;
}
```

## API

### KeyboardProvider

Wrap your app (or a subtree) with `KeyboardProvider`. It manages a scope stack and dispatches keyboard events to handlers registered in the active scope.

```tsx
import { KeyboardProvider } from "keyscope";

function App() {
  return (
    <KeyboardProvider>
      {children}
    </KeyboardProvider>
  );
}
```

The provider starts with a `"global"` scope. When a scope is pushed (via `useScope`), only handlers in the topmost scope receive events. When that scope unmounts, the previous scope becomes active again.

### useKey

Register keyboard handlers. Three overloads:

**Single key + handler:**

```ts
function useKey(
  hotkey: string,
  handler: (event: KeyboardEvent) => void,
  options?: UseKeyOptions,
): void;
```

```tsx
useKey("Escape", () => setOpen(false));
useKey("ctrl+k", () => openSearch(), { preventDefault: true });
```

**Array of keys, same handler:**

```ts
function useKey(
  hotkeys: readonly string[],
  handler: (event: KeyboardEvent) => void,
  options?: UseKeyOptions,
): void;
```

```tsx
useKey(["ArrowUp", "ArrowDown"], (e) => {
  navigate(e.key === "ArrowUp" ? -1 : 1);
});
```

**Key map, different handlers:**

```ts
function useKey(
  handlers: Record<string, (event: KeyboardEvent) => void>,
  options?: UseKeyOptions,
): void;
```

```tsx
useKey({
  "ArrowUp": () => move(-1),
  "ArrowDown": () => move(1),
  "Enter": () => select(),
});
```

### useScope

Push a named scope onto the scope stack. While active, only handlers in this scope fire. Automatically pops when the component unmounts.

```ts
function useScope(name: string, options?: { enabled?: boolean }): void;
```

```tsx
function Modal({ open }: { open: boolean }) {
  useScope("modal", { enabled: open });
  useKey("Escape", () => close());

  if (!open) return null;
  return <div>...</div>;
}
```

### useFocusZone

Manage logical focus zones with arrow key and Tab transitions.

```ts
function useFocusZone<T extends string>(
  options: UseFocusZoneOptions<T>,
): UseFocusZoneReturn<T>;
```

**Options:**

```ts
interface UseFocusZoneOptions<T extends string> {
  initial: T;
  zones: readonly T[];
  zone?: T;                                    // controlled mode
  onZoneChange?: (zone: T) => void;
  onLeaveZone?: (zone: T) => void;             // fires before leaving current zone
  onEnterZone?: (zone: T) => void;             // fires before entering new zone
  transitions?: (params: {
    zone: T;
    key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Tab";
  }) => T | null;
  tabCycle?: readonly T[];                     // Tab/Shift+Tab cycle order
  scope?: string;
  enabled?: boolean;
}
```

**Return:**

```ts
interface UseFocusZoneReturn<T extends string> {
  zone: T;
  setZone: (zone: T) => void;
  inZone: (...zones: T[]) => boolean;
  forZone: (target: T, extra?: UseKeyOptions) => UseKeyOptions;
}
```

```tsx
type Zone = "sidebar" | "content" | "preview";

const { zone, forZone } = useFocusZone({
  initial: "sidebar",
  zones: ["sidebar", "content", "preview"] as const,
  tabCycle: ["sidebar", "content", "preview"] as const,
  transitions: ({ zone, key }) => {
    if (zone === "sidebar" && key === "ArrowRight") return "content";
    if (zone === "content" && key === "ArrowLeft") return "sidebar";
    if (zone === "content" && key === "ArrowRight") return "preview";
    return null;
  },
});

// Use forZone to conditionally enable keys per zone
useKey("Enter", () => openItem(), forZone("sidebar"));
useKey("Enter", () => editContent(), forZone("content"));
```

The `forZone` helper returns `{ enabled: true }` when the current zone matches the target, and `{ enabled: false }` otherwise. This lets you bind different handlers to the same key in different zones. Pass an optional second argument to merge extra options: `forZone("sidebar", { preventDefault: true })`.

`tabCycle` enables Tab and Shift+Tab to cycle through the listed zones in order, with `preventDefault` set automatically.

### useNavigation

Full list navigation with DOM item queries, focus tracking, selection, and boundary detection.

```ts
function useNavigation(options: UseNavigationOptions): UseNavigationReturn;
```

**Options:**

```ts
interface UseNavigationBaseOptions {
  containerRef: RefObject<HTMLElement | null>;
  role: NavigationRole;                        // "radio" | "checkbox" | "option" | "menuitem"
  value?: string | null;                       // controlled focused value
  onValueChange?: (value: string) => void;
  onSelect?: (value: string, event: KeyboardEvent) => void;   // Space key (ARIA selection)
  onEnter?: (value: string, event: KeyboardEvent) => void;    // Enter key (ARIA activation, falls back to onSelect)
  preventDefault?: boolean;                    // default: true
  onFocusChange?: (value: string) => void;
  wrap?: boolean;                              // default: true
  enabled?: boolean;                           // default: true
  onBoundaryReached?: (direction: "up" | "down") => void;
  initialValue?: string | null;
  orientation?: "vertical" | "horizontal";     // default: "vertical"
  skipDisabled?: boolean;                      // skip aria-disabled items
  upKeys?: string[];                           // default: ["ArrowUp"] (or ["ArrowLeft"] if horizontal)
  downKeys?: string[];                         // default: ["ArrowDown"] (or ["ArrowRight"] if horizontal)
}

// Scoped mode (default): keys registered via KeyboardProvider
interface UseScopedNavigationOptions extends UseNavigationBaseOptions {
  mode?: "scoped";
  requireFocusWithin?: boolean;
}

// Local mode: returns an onKeyDown handler you attach yourself
interface UseLocalNavigationOptions extends UseNavigationBaseOptions {
  mode: "local";
}
```

**Return:**

```ts
interface UseNavigationReturn {
  focusedValue: string | null;
  isFocused: (value: string) => boolean;
  focus: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;  // only in local mode
}
```

```tsx
const containerRef = useRef<HTMLDivElement>(null);

const { focusedValue, isFocused } = useNavigation({
  containerRef,
  role: "option",
  onSelect: (value) => toggleItem(value),
  onEnter: (value) => openItem(value),
  wrap: true,
});
```

**Local mode** is useful inside components that manage their own key events:

```tsx
const { onKeyDown } = useNavigation({
  containerRef,
  role: "menuitem",
  mode: "local",
  onSelect: (value) => activate(value),
});

return <div ref={containerRef} onKeyDown={onKeyDown}>...</div>;
```

Items are queried from the DOM using `[role="${role}"][data-value]:not([aria-disabled="true"])` inside the container. Each navigable item needs a `role` and `data-value` attribute.

`onSelect` fires on **Space** (ARIA selection pattern), `onEnter` fires on **Enter** (ARIA activation pattern). If `onEnter` is not provided, Enter falls back to `onSelect`. For most components, passing the same handler to both is fine.

`useNavigation` defaults to `preventDefault: true` in both scoped and local modes — this prevents page scrolling on arrow keys, Space, and Home/End. Set `preventDefault: false` to override.

### useTabNavigation

Keyboard navigation for tab lists. Handles arrow keys and Home/End. Queries `[role="tab"]:not([disabled])` elements inside the container.

```ts
function useTabNavigation(options: {
  containerRef: RefObject<HTMLElement | null>;
  orientation?: "horizontal" | "vertical";     // default: "horizontal"
  wrap?: boolean;                              // default: true
}): { onKeyDown: (event: KeyboardEvent) => void };
```

```tsx
const tabListRef = useRef<HTMLDivElement>(null);
const { onKeyDown } = useTabNavigation({ containerRef: tabListRef });

return (
  <div ref={tabListRef} role="tablist" onKeyDown={onKeyDown}>
    <button role="tab">Tab 1</button>
    <button role="tab">Tab 2</button>
    <button role="tab">Tab 3</button>
  </div>
);
```

### keys()

Utility to build a key map from an array of keys and a single handler. Useful with the key map overload of `useKey`.

```ts
function keys(
  hotkeys: readonly string[],
  handler: (event: KeyboardEvent) => void,
): Record<string, (event: KeyboardEvent) => void>;
```

```tsx
import { useKey, keys } from "keyscope";

useKey({
  ...keys(["j", "ArrowDown"], () => move(1)),
  ...keys(["k", "ArrowUp"], () => move(-1)),
  "/": () => focusSearch(),
});
```

### useFocusTrap

Trap Tab focus within a container element. Useful for modals and dialogs.

```ts
function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  options?: UseFocusTrapOptions,
): void;
```

```ts
interface UseFocusTrapOptions {
  initialFocus?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;                      // default: true
  enabled?: boolean;                           // default: true
}
```

```tsx
const containerRef = useRef<HTMLDivElement>(null);
useFocusTrap(containerRef, { enabled: isOpen });
```

Queries focusable elements on each Tab press, so dynamic content is handled automatically. Focus is restored to the previously focused element when the trap is disabled or unmounts.

> **Note:** `useFocusTrap` operates independently of `KeyboardProvider` and the scope system. It attaches its own `keydown` listener directly on the container element. This is by design — focus trapping is a DOM-level concern that should work regardless of which scope is active. Use the `enabled` option for conditional trapping.

### useScrollLock

Lock scroll on an element while a component is mounted. Uses reference counting, so multiple locks on the same element work correctly — scroll is only restored when all locks release.

```ts
function useScrollLock(
  target?: RefObject<HTMLElement | null>,  // default: document.body
  enabled?: boolean,                       // default: true
): void;
```

```tsx
const containerRef = useRef<HTMLDivElement>(null);
useScrollLock(containerRef, isOpen);
```

> **Note:** `useScrollLock` operates independently of `KeyboardProvider`. It directly manages `overflow: hidden` on the target element.

### useOptionalKeyboardContext

Returns the keyboard context or `null` if no `KeyboardProvider` exists in the tree. Useful for libraries or components that optionally integrate with keyscope.

```tsx
import { useOptionalKeyboardContext } from "keyscope";

const ctx = useOptionalKeyboardContext();
if (ctx) {
  // KeyboardProvider is available, use keyscope features
}
```

## Options

`UseKeyOptions` is shared across `useKey` and returned by `forZone`:

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Enable/disable the handler |
| `allowInInput` | `boolean` | `false` | Fire handler when an input/textarea/select is focused |
| `targetRef` | `RefObject<HTMLElement \| null>` | -- | Only fire when event target is within this element |
| `requireFocusWithin` | `boolean` | `false` | Used with `targetRef` to require focus within the target |
| `preventDefault` | `boolean` | `false` | Call `event.preventDefault()` before the handler |

## Key Matching

Hotkey strings are **case-insensitive** — `"escape"` and `"Escape"` both match the Escape key.

**Uppercase single letters imply Shift.** `useKey("G", handler)` is equivalent to `useKey("shift+g", handler)` — both match Shift+G. Lowercase `useKey("g", handler)` matches `g` without Shift.

Modifier matching is **strict**: `useKey("ctrl+s", handler)` only matches Ctrl+S, not Ctrl+Shift+S. Extra modifiers cause a non-match.

```tsx
useKey("g", () => goToTop());       // matches g (no Shift)
useKey("G", () => goToBottom());    // matches Shift+G
useKey("shift+g", () => {});        // same as "G"
useKey("ctrl+s", () => save());     // matches Ctrl+S only
useKey("mod+k", () => search());    // Meta+K on Mac, Ctrl+K elsewhere
```

## Patterns

### Single Key

```tsx
useKey("Escape", () => close());
```

### Multiple Keys (OR)

```tsx
useKey(["Enter", " "], () => activate());
```

### Key Map (Different Handlers)

```tsx
useKey({
  "ArrowUp": () => move(-1),
  "ArrowDown": () => move(1),
  "Escape": () => close(),
  "Enter": () => confirm(),
});
```

### Zone-Conditional Keys (forZone)

```tsx
const { zone, forZone } = useFocusZone({
  initial: "list",
  zones: ["list", "detail"] as const,
  transitions: ({ zone, key }) => {
    if (zone === "list" && key === "ArrowRight") return "detail";
    if (zone === "detail" && key === "ArrowLeft") return "list";
    return null;
  },
});

useKey("Enter", () => openItem(), forZone("list"));
useKey("Enter", () => editDetail(), forZone("detail"));
useKey("Escape", () => goBack(), forZone("detail"));
```

### Scoped Modals

```tsx
function ConfirmDialog({ open, onConfirm, onCancel }) {
  useScope("confirm-dialog", { enabled: open });
  useKey("Enter", onConfirm);
  useKey("Escape", onCancel);

  if (!open) return null;
  return <div role="dialog">...</div>;
}
```

While the dialog is open, only its handlers fire. Parent handlers (in the `"global"` scope) are paused until the dialog unmounts.

### Vim-Style Navigation

```tsx
import { useKey, keys } from "keyscope";

useKey({
  ...keys(["j", "ArrowDown"], () => move(1)),
  ...keys(["k", "ArrowUp"], () => move(-1)),
  ...keys(["g", "Home"], () => first()),
  ...keys(["G", "End"], () => last()),
  "/": () => focusSearch(),
  "Escape": () => clearSearch(),
});
```

## Migration from diffgazer

| Feature | diffgazer | keyscope |
|---|---|---|
| `preventDefault` default | `true` | `false` |
| Custom up/down keys | `upKeys` / `downKeys` | Same (`upKeys` / `downKeys`) |
| `onEnter` callback | Available | Available (separate from `onSelect`) |
| `useFocusZone` | Same concept | Same API, added `tabCycle` and `forZone` |
| Handler stability | Manual `useCallback` | Automatic via `useEffectEvent` |
| Scope management | Manual context | Built-in scope stack |
| `useZoneKeys` | Available | Removed -- use `useKey` with `forZone` |

## Integration with Component Libraries

Use `KeyboardProvider` at your app root, then use `useKey` and `useNavigation` inside individual components:

```tsx
import { KeyboardProvider } from "keyscope";

function App() {
  return (
    <KeyboardProvider>
      <CommandPalette />
      <Sidebar />
      <MainContent />
    </KeyboardProvider>
  );
}
```

Inside a component like a command palette:

```tsx
function CommandPalette() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useKey("ctrl+k", () => setOpen(true), { preventDefault: true });
  useScope("command-palette", { enabled: open });
  useKey("Escape", () => setOpen(false));

  const { focusedValue, isFocused } = useNavigation({
    containerRef,
    role: "option",
    onSelect: (value) => runCommand(value),
    enabled: open,
  });

  if (!open) return null;

  return (
    <div ref={containerRef}>
      <input placeholder="Search commands..." />
      <div role="listbox">
        <div role="option" data-value="save" data-focused={isFocused("save")}>Save</div>
        <div role="option" data-value="open" data-focused={isFocused("open")}>Open</div>
      </div>
    </div>
  );
}
```

## Requirements

- React 19+ (uses `useEffectEvent`)
- ESM only

## License

MIT
