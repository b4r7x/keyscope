# Navigation

Two hooks for keyboard-driven list and tab navigation. Both query the DOM for items inside a container, then move focus between them with arrow keys, Home, End, Enter, and Space.

## useNavigation

The main hook. Handles arrow key navigation, selection, and focus tracking for any list of role-attributed elements.

### DOM setup

Three things need to be true about your HTML:

1. A **container element** with a ref
2. Child elements with a matching **`role`** attribute (`"option"`, `"menuitem"`, `"radio"`, `"checkbox"`, or `"button"`)
3. Each child has a **`data-value`** attribute -- this is how the hook tracks which item is focused

Disabled items use `aria-disabled="true"` (not the HTML `disabled` attribute). When `skipDisabled` is true (the default), the selector becomes `[role="option"]:not([aria-disabled="true"])`, so disabled items get skipped during navigation.

```tsx
const containerRef = useRef<HTMLDivElement>(null);

const { focusedValue, isFocused } = useNavigation({
  containerRef,
  role: "option",
  onSelect: (value) => console.log("selected", value),
});

return (
  <div ref={containerRef} role="listbox">
    {items.map((item) => (
      <div
        key={item.id}
        role="option"
        data-value={item.id}
        aria-disabled={item.disabled ? "true" : undefined}
        aria-selected={isFocused(item.id)}
        style={{ background: isFocused(item.id) ? "#e0e7ff" : undefined }}
      >
        {item.label}
      </div>
    ))}
  </div>
);
```

On every focus change, the hook calls `scrollIntoView({ block: "nearest" })` on the focused element, so long lists scroll to keep the focused item visible.

### Scoped vs local mode

`useNavigation` has two modes that change how key events are captured.

**Scoped mode** (default) registers keys through keyscope's `KeyboardProvider` via `useKey`. Keys are active based on the current scope stack, and you can use `requireFocusWithin` to only handle keys when focus is inside the container.

```tsx
// Scoped mode -- keys register globally (or scoped to the active scope)
const { focusedValue, isFocused, focus } = useNavigation({
  containerRef,
  role: "option",
  // mode: "scoped" is the default
  requireFocusWithin: true, // only respond when focus is inside container
});
```

**Local mode** returns an `onKeyDown` handler that you attach to the container yourself. Useful when you don't want keyscope's scope system involved -- for example in a combobox dropdown where the input's `onKeyDown` should drive navigation.

```tsx
// Local mode -- you wire up the handler
const { focusedValue, isFocused, focus, onKeyDown } = useNavigation({
  containerRef,
  role: "option",
  mode: "local",
});

return (
  <div ref={containerRef} role="listbox" onKeyDown={onKeyDown}>
    {/* items */}
  </div>
);
```

When to use which:
- **Scoped**: the list is the main content of a panel, dialog, or page. You want arrow keys to work without the user clicking into the list first.
- **Local**: the list is embedded inside a larger component (combobox, dropdown). You only want navigation when the container has focus.

### Controlled vs uncontrolled

**Uncontrolled** (default): pass `initialValue` and the hook manages focus state internally. `focusedValue` reflects the internal state.

```tsx
const { focusedValue } = useNavigation({
  containerRef,
  role: "option",
  initialValue: "first-item", // starts focused here (null if omitted)
});
```

**Controlled**: pass `value` and `onValueChange`. The hook calls `onValueChange` instead of updating internal state -- you own the focus value.

```tsx
const [focused, setFocused] = useState<string | null>("first-item");

const { isFocused } = useNavigation({
  containerRef,
  role: "option",
  value: focused,
  onValueChange: setFocused,
});
```

The distinction is the same as controlled/uncontrolled inputs in React. If `value` is passed (even as `null`), the hook is controlled.

### Selection semantics

Two keys trigger selection, and they map to different callbacks:

- **Space** calls `onSelect(value, event)`. Think "toggle" or "check".
- **Enter** calls `onEnter(value, event)`. Think "activate" or "open". If `onEnter` is not provided, Enter falls back to `onSelect`.

This matches ARIA guidelines where Space toggles and Enter activates.

```tsx
useNavigation({
  containerRef,
  role: "option",
  onSelect: (value) => toggleItem(value),     // Space
  onEnter: (value) => openItem(value),         // Enter (falls back to onSelect if omitted)
});
```

### Orientation

Default is `"vertical"` -- ArrowUp/ArrowDown navigate. Set `orientation: "horizontal"` for ArrowLeft/ArrowRight.

```tsx
useNavigation({
  containerRef,
  role: "option",
  orientation: "horizontal",
});
```

You can also override the exact keys with `upKeys` and `downKeys`:

```tsx
useNavigation({
  containerRef,
  role: "option",
  upKeys: ["ArrowUp", "k"],    // vim-style
  downKeys: ["ArrowDown", "j"],
});
```

Home always jumps to the first item, End to the last. These aren't configurable.

### Boundary behavior

When the user presses down on the last item (or up on the first):

- **`wrap: true`** (default): focus wraps to the other end of the list
- **`wrap: false`**: nothing happens, but `onBoundaryReached` fires with `"up"` or `"down"`

```tsx
useNavigation({
  containerRef,
  role: "option",
  wrap: false,
  onBoundaryReached: (direction) => {
    if (direction === "down") focusNextSection();
  },
});
```

This is useful for multi-section layouts where hitting the bottom of one list should move focus to the next list.

### Focus tracking

Three ways to observe focus:

- `focusedValue` -- the current focused item's `data-value`, or `null`
- `isFocused(value)` -- returns `true` if that value is currently focused
- `onFocusChange(value)` -- callback fired on every focus change

The `focus(value)` function lets you programmatically set focus:

```tsx
const { focus } = useNavigation({ containerRef, role: "option" });

// Jump to a specific item
focus("item-42");
```

### Full options reference

```ts
interface UseNavigationBaseOptions {
  containerRef: RefObject<HTMLElement | null>;  // required
  role: NavigationRole;                         // required
  value?: string | null;
  onValueChange?: (value: string) => void;
  onSelect?: (value: string, event: KeyboardEvent) => void;
  onEnter?: (value: string, event: KeyboardEvent) => void;
  onFocusChange?: (value: string) => void;
  wrap?: boolean;                   // default: true
  enabled?: boolean;                // default: true
  preventDefault?: boolean;         // default: true
  onBoundaryReached?: (direction: "up" | "down") => void;
  initialValue?: string | null;     // default: null
  orientation?: "vertical" | "horizontal";  // default: "vertical"
  skipDisabled?: boolean;           // default: true
  upKeys?: string[];                // default: ["ArrowUp"] or ["ArrowLeft"]
  downKeys?: string[];              // default: ["ArrowDown"] or ["ArrowRight"]
}

// Scoped mode adds:
requireFocusWithin?: boolean;       // default: false

// Local mode adds:
mode: "local";
// Returns onKeyDown in the result
```

---

## useTabNavigation

A simpler hook for tab bar navigation. Always local mode (returns `onKeyDown`), always auto-activates tabs.

### How it differs from useNavigation

| | useNavigation | useTabNavigation |
|---|---|---|
| Modes | Scoped or local | Local only |
| Focus tracking | `data-value` + internal state | DOM `activeElement` |
| Selection | Separate focus + select | Auto-activates (focus + click) |
| Disabled check | `aria-disabled="true"` | HTML `disabled` attribute |
| Item selector | `[role="${role}"]` | `[role="tab"]` |

The key difference: `useTabNavigation` calls `.focus()` then `.click()` on the target tab. This means moving to a tab immediately activates it -- there's no separate "focused but not selected" state. This matches the WAI-ARIA tabs pattern with automatic activation.

### DOM setup

The container needs `role="tablist"`. Tab buttons need `role="tab"`. Disabled tabs use the HTML `disabled` attribute (not `aria-disabled`).

```tsx
const containerRef = useRef<HTMLDivElement>(null);
const { onKeyDown } = useTabNavigation({ containerRef });

return (
  <div ref={containerRef} role="tablist" onKeyDown={onKeyDown}>
    <button role="tab" onClick={() => setTab("one")}>
      Tab One
    </button>
    <button role="tab" onClick={() => setTab("two")}>
      Tab Two
    </button>
    <button role="tab" disabled onClick={() => setTab("three")}>
      Tab Three
    </button>
  </div>
);
```

Arrow keys move between tabs. Home jumps to the first tab, End to the last. Wrapping is on by default. The hook always calls `event.preventDefault()` on handled keys.

### Vertical tabs

Pass `orientation: "vertical"` to switch from ArrowLeft/ArrowRight to ArrowUp/ArrowDown.

```tsx
const { onKeyDown } = useTabNavigation({
  containerRef,
  orientation: "vertical",
});
```

### Full example

```tsx
function Tabs() {
  const [active, setActive] = useState("overview");
  const containerRef = useRef<HTMLDivElement>(null);
  const { onKeyDown } = useTabNavigation({ containerRef });

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "settings", label: "Settings" },
    { id: "billing", label: "Billing", disabled: true },
    { id: "team", label: "Team" },
  ];

  return (
    <div>
      <div ref={containerRef} role="tablist" onKeyDown={onKeyDown}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            disabled={tab.disabled}
            aria-selected={active === tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {active === "overview" && <p>Overview content</p>}
        {active === "settings" && <p>Settings content</p>}
        {active === "team" && <p>Team content</p>}
      </div>
    </div>
  );
}
```

Focus a tab with your mouse or Tab key, then use Left/Right arrows to move between tabs. The billing tab is skipped because it's disabled. Home/End jump to the first and last enabled tabs.
