
  /model to try Opus 4.6

❯ /clear
  ⎿  (no content)

❯ check my implementation of useKeys and overall implementation of my web. We need to think about best way scallable to make the useKeys reusable and work best way possible to implement it
   correctly and be done as for other people to be using as reusable library

● I'll explore the codebase to understand the current useKeys implementation and the web app structure.

● Explore(Explore useKeys implementation)
  ⎿  Done (24 tool uses · 31.9k tokens · 59s)

● Let me read the actual implementation files to understand the details better.

● Searched for 1 pattern, read 1 file (ctrl+o to expand)

● Let me check how keyboard navigation is being used in the web app.

● Read 1 file (ctrl+o to expand)

● Now I have a complete picture. Let me provide my analysis and recommendations.

  ---
  Current Implementation Analysis

  Your @diffgazer/keyboard package has a solid foundation with scoped keyboard handling, React 19 features (useEffectEvent), and good accessibility support. Here's my assessment:

  Strengths

  - Clean separation between useKey (single) and useKeys (multiple)
  - Scope-based architecture allows nested keyboard contexts
  - useEffectEvent eliminates stale closure issues
  - Good TypeScript support with proper overloads in useNavigation

  Issues for Library-Scale Reuse
  ┌───────────────────────────────┬───────────────────────────────────┬─────────────────────────────────────────────────────────────────┐
  │             Issue             │           Current State           │                             Impact                              │
  ├───────────────────────────────┼───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Tight coupling to Provider    │ useKeys requires KeyboardProvider │ Can't be used standalone                                        │
  ├───────────────────────────────┼───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Options referential stability │ Destructured in deps array        │ Inline options objects cause unnecessary re-registrations       │
  ├───────────────────────────────┼───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Hidden from public API        │ useKeys not exported in index.ts  │ Not reusable as intended                                        │
  ├───────────────────────────────┼───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ Handler signature             │ (key, index) => void              │ Unusual; most libs use (event) => void or key-specific handlers │
  └───────────────────────────────┴───────────────────────────────────┴─────────────────────────────────────────────────────────────────┘
  ---
  Recommendations for Scalable Library API

  1. Export useKeys Publicly

  // packages/keyboard/src/index.ts
  export { useKeys } from "./use-keys";
  export type { UseKeysOptions } from "./use-keys"; // need to export this

  2. Make Options More Stable

  The current destructuring of options fields in the deps array is fragile. Users passing inline objects will cause re-registrations:

  // ❌ Current: inline options cause re-registration
  useKeys(['a', 'b'], handler, { enabled: isActive })

  Recommended fix - use a single stable options reference:

  // packages/keyboard/src/use-keys.ts
  import { useEffect, useEffectEvent } from "react";
  import type { HandlerOptions } from "./keyboard-provider";
  import { useKeyboardContext } from "./use-keyboard-context";

  export interface UseKeysOptions extends HandlerOptions {
    enabled?: boolean;
  }

  export function useKeys(
    keys: readonly string[],
    handler: (key: string, index: number) => void,
    options?: UseKeysOptions
  ): void {
    const { register, activeScope } = useKeyboardContext();
    const stableHandler = useEffectEvent(handler);
    const keysKey = keys.join(",");

    // Destructure once, use individual fields in deps
    const { enabled, allowInInput, targetRef, requireFocusWithin, preventDefault } = options ?? {};

    useEffect(() => {
      if (enabled === false) return;
      if (!activeScope) return;

      const cleanups = keys.map((key, index) =>
        register(activeScope, key, () => stableHandler(key, index), {
          allowInInput,
          targetRef,
          requireFocusWithin,
          preventDefault,
        })
      );

      return () => cleanups.forEach((cleanup) => cleanup());
    }, [
      register,
      activeScope,
      keysKey,
      enabled,
      allowInInput,
      targetRef,
      requireFocusWithin,
      preventDefault,
      stableHandler,
    ]);
  }

  3. Consider a Standalone Version (No Provider Required)

  For true reusability as a library, offer a version that works without KeyboardProvider:

  // packages/keyboard/src/use-global-keys.ts
  import { useEffect, useEffectEvent } from "react";
  import { matchesHotkey, isInputElement } from "./keyboard-utils";

  interface UseGlobalKeysOptions {
    enabled?: boolean;
    allowInInput?: boolean;
    preventDefault?: boolean;
    stopPropagation?: boolean;
  }

  export function useGlobalKeys(
    keys: readonly string[],
    handler: (key: string, index: number) => void,
    options?: UseGlobalKeysOptions
  ): void {
    const stableHandler = useEffectEvent(handler);

    useEffect(() => {
      if (options?.enabled === false) return;

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.defaultPrevented) return;

        const isInput = isInputElement(event.target);
        if (isInput && !options?.allowInInput) return;

        for (let i = 0; i < keys.length; i++) {
          if (matchesHotkey(event, keys[i]!)) {
            if (options?.preventDefault !== false) {
              event.preventDefault();
            }
            if (options?.stopPropagation) {
              event.stopPropagation();
            }
            stableHandler(keys[i]!, i);
            return;
          }
        }
      };

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [keys.join(","), options?.enabled, options?.allowInInput, options?.preventDefault, options?.stopPropagation]);
  }

  4. API Design Trade-offs
  ┌─────────────────────┬──────────────────────────────────┬─────────────────────────────┬──────────────────────────────────┐
  │      Approach       │               Pros               │            Cons             │             Use Case             │
  ├─────────────────────┼──────────────────────────────────┼─────────────────────────────┼──────────────────────────────────┤
  │ Current (scoped)    │ Nested contexts, clean isolation │ Requires Provider           │ Complex apps with modals/panels  │
  ├─────────────────────┼──────────────────────────────────┼─────────────────────────────┼──────────────────────────────────┤
  │ Global (standalone) │ Zero setup, immediate use        │ No scope isolation          │ Simple hotkeys, reusable widgets │
  ├─────────────────────┼──────────────────────────────────┼─────────────────────────────┼──────────────────────────────────┤
  │ Mixed (both)        │ Flexible, covers all cases       │ Slightly larger API surface │ Library for public consumption   │
  └─────────────────────┴──────────────────────────────────┴─────────────────────────────┴──────────────────────────────────┘
  ---
  Suggested File Structure for Library

  packages/keyboard/src/
  ├── index.ts                    # Public exports
  ├── provider.ts                 # KeyboardProvider + useKey/useKeys (scoped)
  ├── global.ts                   # useGlobalKey/useGlobalKeys (standalone)
  ├── navigation.ts               # useNavigation, useTabNavigation
  ├── focus-zone.ts               # useFocusZone
  └── internal/
      ├── utils.ts                # matchesHotkey, isInputElement
      └── dom-navigation.ts       # DOM traversal logic

  ---
  Quick Questions

  1. Do you want useKeys to work standalone (without Provider) for simpler use cases, or is the scoped approach mandatory?
  2. Should useKeys handler receive the raw KeyboardEvent alongside the key name? This would allow event.preventDefault() decisions in the handler itself.
  3. Is the (key, index) signature intentional for mapping keys to actions, or would an object map be clearer?
  // Alternative: object map API
  useKeys({
    "ArrowUp": () => move(-1),
    "ArrowDown": () => move(1),
    "Enter": () => select(),
  }, options);

  Based on your answers, I can implement the changes.

✻ Sautéed for 2m 8s

❯ I think I like the object map API more. Please rewrite everyting with that and tell me how to exactly do this. Do not implement, just rewrite the previous output with object map and how
  it should look like

● Object Map API Design for useKeys

  New Type Signature

  // packages/keyboard/src/use-keys.ts
  import type { HandlerOptions } from "./keyboard-provider";

  export interface UseKeysOptions extends HandlerOptions {
    enabled?: boolean;
  }

  // Object map: key → handler
  export type KeyHandlerMap = Record<string, () => void>;

  export function useKeys(
    handlers: KeyHandlerMap,
    options?: UseKeysOptions
  ): void;

  Implementation Sketch

  export function useKeys(
    handlers: KeyHandlerMap,
    options?: UseKeysOptions
  ): void {
    const { register, activeScope } = useKeyboardContext();

    // Stable key list for effect deps
    const keysKey = Object.keys(handlers).join(",");

    // Store handlers in a ref to avoid re-registration on handler changes
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    const { enabled, allowInInput, targetRef, requireFocusWithin, preventDefault } = options ?? {};

    useEffect(() => {
      if (enabled === false) return;
      if (!activeScope) return;

      const cleanups = Object.entries(handlersRef.current).map(([key, handler]) =>
        register(activeScope, key, handler, {
          allowInInput,
          targetRef,
          requireFocusWithin,
          preventDefault,
        })
      );

      return () => cleanups.forEach((cleanup) => cleanup());
    }, [
      register,
      activeScope,
      keysKey,      // Only re-register if key set changes
      enabled,
      allowInInput,
      targetRef,
      requireFocusWithin,
      preventDefault,
    ]);
  }

  Updated useNavigation (Internal Usage)

  // packages/keyboard/src/use-navigation.ts
  import { useKeys } from "./use-keys";

  // Before (array-based):
  useKeys(upKeys, () => move(-1), keyOptions);
  useKeys(downKeys, () => move(1), keyOptions);
  useKey("Home", () => focusIndex(0), keyOptions);
  useKey("End", () => { ... }, keyOptions);

  // After (object map):
  useKeys({
    [upKeys[0]!]: () => move(-1),
    [downKeys[0]!]: () => move(1),
    Home: () => focusIndex(0),
    End: () => {
      const elements = getElements();
      if (elements.length > 0) {
        focusIndex(elements.length - 1);
      }
    },
    Enter: handleEnter,
    " ": handleSelect,
  }, keyOptions);

  Standalone Global Version

  // packages/keyboard/src/use-global-keys.ts
  import { useEffect, useRef } from "react";
  import { matchesHotkey, isInputElement } from "./keyboard-utils";

  export interface UseGlobalKeysOptions {
    enabled?: boolean;
    allowInInput?: boolean;
    preventDefault?: boolean;
    stopPropagation?: boolean;
  }

  export type KeyHandlerMap = Record<string, () => void>;

  export function useGlobalKeys(
    handlers: KeyHandlerMap,
    options?: UseGlobalKeysOptions
  ): void {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;
    const keysKey = Object.keys(handlers).join(",");

    useEffect(() => {
      if (options?.enabled === false) return;

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.defaultPrevented) return;

        const isInput = isInputElement(event.target);
        if (isInput && !options?.allowInInput) return;

        for (const [hotkey, handler] of Object.entries(handlersRef.current)) {
          if (matchesHotkey(event, hotkey)) {
            if (options?.preventDefault !== false) {
              event.preventDefault();
            }
            if (options?.stopPropagation) {
              event.stopPropagation();
            }
            handler();
            return;
          }
        }
      };

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [
      keysKey,
      options?.enabled,
      options?.allowInInput,
      options?.preventDefault,
      options?.stopPropagation,
    ]);
  }

  Public API Surface

  // packages/keyboard/src/index.ts

  // Provider-based (scoped, supports nested contexts)
  export { KeyboardProvider } from "./keyboard-provider";
  export { useKey } from "./use-key";
  export { useKeys } from "./use-keys";
  export { useScope } from "./use-scope";

  // Global (standalone, no Provider needed)
  export { useGlobalKeys } from "./use-global-keys";

  // Navigation primitives
  export { useNavigation } from "./use-navigation";
  export { useTabNavigation } from "./use-tab-navigation";
  export { useFocusZone } from "./use-focus-zone";

  // Types
  export type { KeyHandlerMap, UseKeysOptions } from "./use-keys";
  export type { UseGlobalKeysOptions } from "./use-global-keys";
  export type { NavigationRole } from "./types";

  Usage Examples

  // Scoped (with Provider)
  function ReviewList() {
    const containerRef = useRef<HTMLDivElement>(null);

    useKeys({
      j: () => selectNext(),
      k: () => selectPrev(),
      "ctrl+enter": () => openSelected(),
      "?": () => showHelp(),
    }, {
      targetRef: containerRef,
      requireFocusWithin: true,
    });

    return <div ref={containerRef}>...</div>;
  }

  // Global (no Provider)
  function GlobalShortcuts() {
    useGlobalKeys({
      "mod+s": () => saveDocument(),      // mod = Cmd on Mac, Ctrl on Win
      "mod+k": () => openCommandPalette(),
      "esc": () => closeModals(),
    }, {
      allowInInput: false,  // Don't trigger when typing
    });

    return null;
  }

  // Inside useNavigation (library internal)
  useKeys({
    ArrowUp: () => move(-1),
    ArrowDown: () => move(1),
    Home: () => focusIndex(0),
    End: () => focusIndex(items.length - 1),
    Enter: handleEnter,
    " ": handleSelect,
  }, {
    enabled: isScoped,
    targetRef: containerRef,
    requireFocusWithin,
  });

  Key Design Decisions
  ┌─────────────────────────┬────────────────────────────────────────────┬──────────────────────────────────────────────────────┐
  │         Aspect          │                   Choice                   │                      Rationale                       │
  ├─────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Handler signature       │ () => void                                 │ Clean, no unused parameters                          │
  ├─────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Key format              │ Same as useKey (ArrowUp, ctrl+enter, etc.) │ Consistent with existing API                         │
  ├─────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Re-registration trigger │ Object.keys(handlers).join(",")            │ Only when key set changes, not handler references    │
  ├─────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Handler updates         │ Ref-based                                  │ Latest handler always called without re-registration │
  ├─────────────────────────┼────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Options stability       │ Individual fields in deps                  │ Predictable, documentable behavior                   │
  └─────────────────────────┴────────────────────────────────────────────┴──────────────────────────────────────────────────────┘
  Migration Path

  // BEFORE (array-based)
  useKeys(['ArrowUp', 'ArrowDown'], (key) => {
    if (key === 'ArrowUp') move(-1);
    else move(1);
  }, options);

  // AFTER (object map)
  useKeys({
    ArrowUp: () => move(-1),
    ArrowDown: () => move(1),
  }, options);

❯ ok how about the useFocusZone, useScope? what does these do and do we need to
      refactor them to be better anyhow? (do not make any changes)

● Read 1 file (ctrl+o to expand)

● Analysis of useScope and useFocusZone

  useScope — Simple, Clean, No Changes Needed

  export function useScope(name: string, options: UseScopeOptions = {}): void

  What it does: Pushes a scope onto the keyboard context stack when enabled. This isolates hotkeys to a specific section (modals, panels, etc.).

  Assessment: ✅ No refactoring needed. It's already minimal and correct. One consideration:
  ┌──────────────┬───────────────────────────────────────────────────────────────────────────┐
  │   Current    │                                 Question                                  │
  ├──────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ name: string │ Empty string default feels odd. Consider name?: string and skip if falsy? │
  └──────────────┴───────────────────────────────────────────────────────────────────────────┘
  // Current: requires empty string when unused
  useScope(options.scope ?? "", { enabled: options.scope != null })

  // Alternative: optional name, skip internally
  useScope(options.scope, { enabled: !!options.scope })
  // inside: if (!enabled || !name) return;

  ---
  useFocusZone — Feature-Rich, But Has Issues

  export function useFocusZone<T extends string>(options: UseFocusZoneOptions<T>): UseFocusZoneReturn<T>

  What it does: Manages directional focus zones (like Vim panes or IDE panels). Arrow keys move between zones; Tab cycles through a subset.

  Issues identified:

  1. Array loop over useKey (lines 73-77)

  for (const key of ARROW_KEYS) {
    useKey(key, () => stableTransitions(key), { ... });
  }
  This breaks Rules of Hooks — loops are fine if array is constant, but it's fragile. With object-map useKeys, this becomes:

  useKeys({
    ArrowLeft: () => canTransition("ArrowLeft") && stableTransitions("ArrowLeft"),
    ArrowRight: () => canTransition("ArrowRight") && stableTransitions("ArrowRight"),
    // ... etc
  }, { enabled: enabled && options.transitions != null });

  Or keep the loop but build the object:

  const arrowHandlers = Object.fromEntries(
    ARROW_KEYS.map(key => [key, () => stableTransitions(key)])
  );
  useKeys(arrowHandlers, { enabled: enabled && options.transitions != null });

  2. Logic duplication (lines 46-52, 62-66, 86-91)

  The controlled/uncontrolled zone change logic is copy-pasted 3 times. Extract:

  const setZoneValue = useEffectEvent((zone: T) => {
    if (!isControlled) setInternalZone(zone);
    options.onZoneChange?.(zone);
  });

  3. canTransition called every render (line 71)

  const canTransition = (key) => options.transitions?.({ zone: currentZone, key }) != null;
  This is used to disable individual keys, but it calls transitions twice (once in check, once in handler). Consider:

  // In handler, just try and no-op if null
  useKeys({
    ArrowLeft: () => {
      const next = options.transitions?.({ zone: currentZone, key: "ArrowLeft" });
      if (next != null && zones.includes(next)) setZoneValue(next);
    },
  }, { enabled });

  4. Mixed concerns: arrows + Tab + scope

  This hook does 3 things:
  - Arrow key zone transitions
  - Tab cycling through zones
  - Scope management

  Consider if Tab cycling belongs here or in a separate useTabCycle hook.

  ---
  Summary Table
  ┌──────────────┬───────────────┬──────────────────────────────────────────────┐
  │     Hook     │    Status     │                  Key Issue                   │
  ├──────────────┼───────────────┼──────────────────────────────────────────────┤
  │ useScope     │ ✅ Good       │ Empty string default is slightly awkward     │
  ├──────────────┼───────────────┼──────────────────────────────────────────────┤
  │ useFocusZone │ ⚠️  Needs work │ Hook loop, logic duplication, mixed concerns │
  └──────────────┴───────────────┴──────────────────────────────────────────────┘
  Recommended Refactors for useFocusZone

  1. Use object-map useKeys instead of useKey loop
  2. Extract setZoneValue helper to deduplicate controlled/uncontrolled logic
  3. Decide on Tab cycling — keep bundled or split out?
  4. Simplify transition checking — don't pre-check canTransition, just try in handler

  Question for You

  Do you actually use tabCycle separately from transitions? If not, you could unify:

  useFocusZone({
    initial: "sidebar",
    zones: ["sidebar", "main", "panel"] as const,
    transitions: {
      sidebar: { ArrowRight: "main" },
      main: { ArrowLeft: "sidebar", ArrowRight: "panel", Tab: "sidebar" }, // Tab as transition
      panel: { ArrowLeft: "main" },
    },
  });

  This would replace both transitions function AND tabCycle with a declarative map.

❯ now, next tasks is looking on how we have been using it along with lists in the ui package and how can we cleanly connect it, maybe there is a other better way, maybe we can somehow
  improve it to be much better and less code or better quality or more readable or improving DX

● Searched for 2 patterns, read 3 files (ctrl+o to expand)

● Now I have the full picture. Here's my analysis of the current architecture and DX improvement opportunities.

  ---
  Current Architecture Analysis

  The Good

  - Clean separation between @diffgazer/keyboard (navigation logic) and @diffgazer/ui (presentation)
  - useNavigation handles both scoped and local modes
  - Components accept focusedValue and onKeyDown props for external keyboard control

  The Pain Points
  ┌──────────────────────────┬─────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────┐
  │          Issue           │                                Current State                                │                  DX Impact                  │
  ├──────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ Boilerplate hell         │ Every list needs containerRef, useNavigation, focusedValue, onKeyDown props │ 20+ lines of wiring for basic keyboard nav  │
  ├──────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ Prop drilling            │ focusedValue passed through multiple layers                                 │ Easy to break, hard to trace                │
  ├──────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ Two-mode confusion       │ "scoped" vs "local" mode isn't obvious                                      │ Developers pick wrong mode, keys don't work │
  ├──────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ Manual DOM queries       │ useNavigation queries DOM for [role="option"] elements                      │ Brittle, relies on correct role attributes  │
  ├──────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ Inconsistent integration │ Some components use useNavigation, others receive props                     │ No single pattern to follow                 │
  └──────────────────────────┴─────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────┘
  ---
  Proposed Improvements

  1. Compound Component Pattern with Built-in Keyboard

  Instead of wiring useNavigation manually, the list components should provide keyboard navigation by default:

  // BEFORE: Manual wiring (20+ lines)
  const containerRef = useRef<HTMLDivElement>(null);
  const { focusedValue, onKeyDown } = useNavigation({
    containerRef,
    role: "radio",
    value,
    onValueChange: onChange,
  });

  <RadioGroup
    ref={containerRef}
    onKeyDown={onKeyDown}
    focusedValue={focusedValue}
  >
    {items.map(item => <RadioGroupItem key={item.value} value={item.value} />)}
  </RadioGroup>

  // AFTER: Built-in keyboard (zero wiring)
  <RadioGroup value={value} onValueChange={onChange}>
    {items.map(item => <RadioGroupItem key={item.value} value={item.value} />)}
  </RadioGroup>

  The keyboard navigation should be the default behavior, not opt-in.

  ---
  2. Optional External Control via Context

  When you need external control (focus zones, programmatic focus), use a context-based API:

  // Define keyboard zones at app level
  <KeyboardZones
    initial="list"
    zones={["filters", "list", "details"]}
    transitions={{
      "filters": { ArrowRight: "list" },
      "list": { ArrowLeft: "filters", ArrowRight: "details" },
      "details": { ArrowLeft: "list" },
    }}
  >
    <FilterZone name="filters">
      <SeverityFilterGroup />
    </FilterZone>

    <FocusZone name="list">
      <NavigationList>
        {issues.map(i => <NavigationListItem key={i.id} id={i.id} />)}
      </NavigationList>
    </FocusZone>

    <FocusZone name="details">
      <IssueDetails />
    </FocusZone>
  </KeyboardZones>

  No useFocusZone hook needed — it's declarative.

  ---
  3. Simplified useNavigation for Custom Components

  For custom components that need keyboard nav, reduce the API surface:

  // BEFORE: Many options, easy to get wrong
  const { focusedValue, onKeyDown, isFocused, focus } = useNavigation({
    containerRef,
    role: "option",
    value,
    onValueChange,
    onSelect,
    onEnter,
    onFocusChange,
    wrap,
    enabled,
    onBoundaryReached,
    initialValue,
    upKeys,
    downKeys,
  });

  // AFTER: Sensible defaults, minimal config
  const { focusedIndex, onKeyDown } = useListNavigation({
    count: items.length,
    onSelect: (index) => handleSelect(items[index]),
  });

  // Or for simple arrow navigation without DOM:
  const { activeIndex, moveUp, moveDown } = useSimpleNavigation(items.length);

  ---
  4. Remove focusedValue Prop Drilling

  Currently, focusedValue flows: useNavigation → RadioGroup → Radio → visual state.

  Better approach: The UI component manages its own visual focus state internally. Only the selection value needs to be controlled externally.

  // RadioGroup internally manages visual focus
  // Only the checked state is controlled
  <RadioGroup
    value={selectedValue}           // Controlled selection
    onValueChange={setSelectedValue}
  >
    {/* Internal: visual focus moves with arrows, selects with Enter/Space */}
    <RadioGroupItem value="a" />
    <RadioGroupItem value="b" />
  </RadioGroup>

  ---
  5. Unified List Component API

  All list-like components should share the same pattern:

  // Consistent API across all list components
  <RadioGroup
    items={themeOptions}        // Array of items
    value={value}
    onValueChange={onChange}
    renderItem={(item, { isSelected, isFocused }) => (
      <CustomRadioItem selected={isSelected} focused={isFocused} />
    )}
  />

  <NavigationList
    items={issues}
    selectedId={selectedId}
    onSelect={onSelect}
    renderItem={(issue, { isSelected, isFocused }) => (
      <IssueListItem issue={issue} />
    )}
  />

  The renderItem pattern gives full control while the component handles keyboard/selection logic.

  ---
  6. Declarative Hotkeys

  Replace imperative useKey calls with declarative components:

  // BEFORE: useKey scattered in hooks
  useKey("Escape", handleBack);
  useKey("j", () => setFocusZone("list"), { enabled: focusZone === "filters" });
  useKey("1", () => setActiveTab("details"), { enabled: focusZone === "details" });

  // AFTER: Declarative Hotkey components
  <Hotkeys>
    <Hotkey keys={["Escape"]} onPress={handleBack} />
    <Hotkey
      keys={["j"]}
      onPress={() => setFocusZone("list")}
      when={focusZone === "filters"}
    />
    <Hotkey
      keys={["1", "2", "3", "4"]}
      onPress={(key) => setActiveTab(tabMap[key])}
      when={focusZone === "details"}
    />
  </Hotkeys>

  Or with object-map useKeys:
  useKeys({
    Escape: handleBack,
    j: () => focusZone === "filters" && setFocusZone("list"),
    "1": () => focusZone === "details" && setActiveTab("details"),
    "2": () => focusZone === "details" && setActiveTab("explain"),
  });

  ---
  Recommended Migration Path
  ┌───────┬──────────────────────────────────────────────┬─────────────────────────────────────────────────┐
  │ Phase │                    Change                    │                 Files Affected                  │
  ├───────┼──────────────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ 1     │ Make useNavigation internal to UI components │ RadioGroup, CheckboxGroup, NavigationList, Menu │
  ├───────┼──────────────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ 2     │ Add items + renderItem API as alternative    │ Same components                                 │
  ├───────┼──────────────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ 3     │ Simplify useNavigation for custom components │ @diffgazer/keyboard                             │
  ├───────┼──────────────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ 4     │ Replace useFocusZone with declarative API    │ New component, migrate gradually                │
  ├───────┼──────────────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ 5     │ Deprecate old imperative patterns            │ Migration guide                                 │
  └───────┴──────────────────────────────────────────────┴─────────────────────────────────────────────────┘
  ---
  Key Questions

  1. Should keyboard navigation be opt-in or opt-out? Currently opt-in (requires useNavigation), but should be default for list components.
  2. Do you need both controlled and uncontrolled focus? Most use cases only need controlled selection + uncontrolled focus. The focusedValue prop is rarely needed externally.
  3. Is useFocusZone solving a real problem? It adds complexity. Could zone transitions be handled at the layout level instead of hook level?

✻ Cogitated for 1m 21s

❯ so that's reviewed of what you've said and "OK, I've read everything. Here's my honest critique of the previous
    conversation's suggestions.

    ---
    What the previous conversation got right

    Object map API is cleaner for grouped keys. No debate there. This:
    useKeys({ ArrowUp: () => move(-1), ArrowDown: () => move(1) }, options)
    beats the current (key, index) => void signature where the handler has to
    re-dispatch.

    useFocusZone has real implementation issues — the controlled/uncontrolled
    duplication (3 copies of the same logic) and the for loop over useKey are
    legitimate problems.

    ---
    What the previous conversation got wrong or over-engineered

    1. useRef instead of useEffectEvent — regression

    The previous suggestion was:
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    Your current code uses useEffectEvent, which is the React 19 blessed solution for
     this exact problem. The ref pattern is a pre-React 19 workaround. Don't go
    backwards.

    2. useGlobalKeys (standalone, no Provider) — no use case

    I looked at every keyboard consumer. KeyboardProvider wraps the app in
    AppProviders. Every page uses scoped handling:
    - Settings hub → "settings-hub" scope
    - Review results → "review" scope
    - Providers → "providers" scope
    - History → "history" scope

    Without scopes you'd have shortcut conflicts everywhere. useGlobalKeys adds API
    surface for a use case that doesn't exist in this codebase. If someone external
    needs it later, add it then.

    3. Declarative <Hotkey> / <KeyboardZones> components — wrong abstraction

    Keyboard handlers are side effects, not UI. Hooks are the correct abstraction for
     side effects. Wrapping useKey in JSX adds indirection without value. This:
    <Hotkey keys={["Escape"]} onPress={handleBack} />
    is just useKey("Escape", handleBack) wearing a costume.

    4. renderItem pattern — second API for the same thing

    The compound component pattern (<RadioGroup> + <RadioGroupItem>) is idiomatic
    React (Radix, Headless UI, etc.). Adding renderItem creates two ways to do the
    same thing. Don't.

    5. Built-in keyboard in UI components — sounds good, doesn't work

    The suggestion to bake useNavigation into <Menu>, <RadioGroup>, etc. ignores why
    they're separated. Looking at actual usage:

    - use-review-results-keyboard.ts:83-85 — uses onBoundaryReached to jump from list
     → filters zone
    - use-providers-keyboard.ts:121-124 — uses useNavigation result + zone
    transitions
    - Settings hub — uses useNavigation with onEnter to route

    These all need cross-component coordination (zone → list → details). If
    navigation is buried inside <Menu>, you can't wire onBoundaryReached to switch
    zones. The separation is load-bearing.

    ---
    What the previous conversation completely missed

    The actual pain point: zone-conditional key explosion

    Look at use-providers-keyboard.ts. 20+ individual useKey calls, each repeating {
    enabled: !dialogOpen && inSomeZone }:

    useKey("ArrowUp", handler, { enabled: !dialogOpen && inFilters });
    useKey("ArrowDown", handler, { enabled: !dialogOpen && inFilters });
    useKey("ArrowLeft", handler, { enabled: !dialogOpen && inFilters });
    useKey("ArrowRight", handler, { enabled: !dialogOpen && inFilters });
    useKey("Enter", handler, { enabled: !dialogOpen && inFilters });
    useKey(" ", handler, { enabled: !dialogOpen && inFilters });
    // ... and 14 more for other zones

    Same in use-review-results-keyboard.ts — 15+ useKey calls with { enabled:
    focusZone === "details" } repeated.

    This is where the object map actually helps, but combined with zone awareness:

    // Instead of 20+ useKey calls:
    useZoneKeys("filters", {
      ArrowUp: () => { setZone("input"); inputRef.current?.focus(); },
      ArrowDown: () => { if (filteredProviders.length > 0) setZone("list"); },
      ArrowLeft: () => setFilterIndex(i => Math.max(0, i - 1)),
      ArrowRight: () => setFilterIndex(i => Math.min(max, i + 1)),
      Enter: () => setFilter(PROVIDER_FILTER_VALUES[filterIndex]),
      " ": () => setFilter(PROVIDER_FILTER_VALUES[filterIndex]),
    }, { enabled: !dialogOpen });

    useZoneKeys("buttons", {
      ArrowLeft: () => { /* ... */ },
      ArrowRight: () => setButtonIndex(i => getNextButtonIndex(i, 1)),
      Enter: () => handleButtonAction(buttonIndex),
      " ": () => handleButtonAction(buttonIndex),
    }, { enabled: !dialogOpen });

    This cuts the providers keyboard hook from ~60 lines of useKey calls to ~30 lines
     of zone blocks. Readable, grouped by zone, less repetition.

    useKeys barely matters — it's used in ONE place

    Current useKeys is only used inside use-navigation.ts for dynamic key arrays:
    useKeys(upKeys, () => move(-1), keyOptions);  // upKeys = ["ArrowUp", "k"]
    useKeys(downKeys, () => move(1), keyOptions);

    The object map doesn't help here because the keys are dynamic arrays mapping to
    the same handler. The current array API is correct for this use case. Keep it.

    The object map should be a new hook (useZoneKeys or an overload of useKeys), not
    a replacement for the array version.

    ---
    What I'd actually recommend

    Keep as-is (it's fine)

    - useKey — simple, correct, well-used
    - useKeys (array version) — only used in useNavigation, correct for that use case
    - useScope — minimal, correct
    - useTabNavigation — standalone, does its job
    - KeyboardProvider + scope system — load-bearing architecture
    - useEffectEvent usage — correct React 19 pattern
    - Compound component pattern in UI — idiomatic

    Add: useZoneKeys — the missing abstraction

    export function useZoneKeys(
      zone: string,
      handlers: Record<string, () => void>,
      options?: { enabled?: boolean } & HandlerOptions
    ): void

    This is the object map API, but it reads the current zone from useFocusZone
    context (or takes it as a param) and auto-gates on zone === activeZone. This is
    what the codebase actually needs.

    Fix: useFocusZone internals

    1. Extract setZoneValue helper to deduplicate the 3x controlled/uncontrolled
    logic
    2. Build the arrow handler object once instead of looping useKey per arrow key
    3. Merge canTransition check into the handler (try and no-op)

    Export: useKeys publicly

    It's not in index.ts. Add it.

    Don't add

    - useGlobalKeys — no use case
    - Declarative <Hotkey> / <KeyboardZones> — wrong abstraction level
    - Built-in keyboard in UI components — breaks cross-component coordination
    - renderItem API — redundant with compound components

    ---
    TL;DR: The previous conversation correctly identified the object map pattern and
    useFocusZone bugs, but over-scoped the solution. The real win is useZoneKeys
    (object map + zone gating) which directly addresses the 20+ useKey explosion in
    your page-level keyboard hooks. Everything else is either fine as-is or would be
    over-engineering.

    Want me to design the useZoneKeys API in detail, or fix the useFocusZone
    internals first?" please tell me if there are rights and wrongs about it

● The critique is mostly correct. I over-engineered and missed the actual pain point. Let me break it down:

  ---
  Where the Critique is Right
  ┌──────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────┐
  │                  Point                   │                                        Verdict                                         │
  ├──────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ useEffectEvent > useRef                  │ ✅ Correct. I suggested a regression. Keep useEffectEvent.                             │
  ├──────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ useGlobalKeys — no use case              │ ✅ Correct. Every consumer uses scoped handling.                                       │
  ├──────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ Declarative <Hotkey> — wrong abstraction │ ✅ Correct. Hooks are right for side effects.                                          │
  ├──────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ renderItem — second API                  │ ✅ Correct. Compound components are idiomatic.                                         │
  ├──────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ Built-in keyboard breaks coordination    │ ✅ Correct. I missed onBoundaryReached wiring.                                         │
  ├──────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ Zone-conditional key explosion           │ ✅ This is the real problem. 20+ useKey calls with { enabled: zone === "x" } repeated. │
  ├──────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
  │ useKeys only used once                   │ ✅ True, it's internal to useNavigation.                                               │
  └──────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────┘
  ---
  Where I'd Push Back Slightly

  useZoneKeys API Design

  The suggested signature:
  useZoneKeys("filters", { ArrowUp: () => {...} }, options)

  This reads the zone from useFocusZone context. But looking at actual usage in use-review-results-keyboard.ts, the zone state lives in the hook, not in context:

  const [focusZone, setFocusZone] = useState<FocusZone>("list");
  // ...
  useKey("j", () => setFocusZone("list"), { enabled: focusZone === "filters" });

  So useZoneKeys should probably accept the zone state explicitly, not read from context:

  useZoneKeys({
    zone: focusZone,           // current zone
    when: "filters",           // only active when zone === "filters"
    keys: {
      ArrowUp: () => {...},
      ArrowDown: () => {...},
    },
    enabled: !dialogOpen,      // additional gate
  });

  Or even simpler — just make it a conditional:
  useZoneKeys("filters", focusZone, {
    ArrowUp: () => {...},
  }, { enabled: !dialogOpen });

  useKeys Public Export

  The critique says export it. I'd say: don't export it yet. It's only used internally. Export when there's an actual use case.

  ---
  The Real Win: useZoneKeys

  You're right — this cuts 60 lines of repetitive useKey calls to ~30 lines grouped by zone.

  Current (use-providers-keyboard.ts):
  useKey("ArrowUp", handler, { enabled: !dialogOpen && inFilters });
  useKey("ArrowDown", handler, { enabled: !dialogOpen && inFilters });
  // ... 6 more for filters

  useKey("ArrowUp", handler, { enabled: !dialogOpen && inList });
  useKey("ArrowDown", handler, { enabled: !dialogOpen && inList });
  // ... 6 more for list

  useKey("ArrowLeft", handler, { enabled: !dialogOpen && inButtons });
  // ... 4 more for buttons

  With useZoneKeys:
  useZoneKeys("filters", focusZone, {
    ArrowUp: () => setZone("input"),
    ArrowDown: () => filtered.length > 0 && setZone("list"),
    ArrowLeft: () => setFilterIndex(i => Math.max(0, i - 1)),
    ArrowRight: () => setFilterIndex(i => Math.min(max, i + 1)),
    Enter: () => setFilter(FILTER_VALUES[filterIndex]),
    " ": () => setFilter(FILTER_VALUES[filterIndex]),
  }, { enabled: !dialogOpen });

  useZoneKeys("list", focusZone, {
    ArrowUp: () => move(-1),
    ArrowDown: () => move(1),
    Enter: () => handleSelect(),
    " ": () => handleSelect(),
    // ...
  }, { enabled: !dialogOpen });

  useZoneKeys("buttons", focusZone, {
    ArrowLeft: () => moveButton(-1),
    ArrowRight: () => moveButton(1),
    Enter: () => activateButton(),
    " ": () => activateButton(),
  }, { enabled: !dialogOpen });

  This is objectively better DX.

  ---
  What to Actually Do
  ┌──────────┬────────────────────────────┬───────────────────────────────────────────────────────────────┐
  │ Priority │            Task            │                              Why                              │
  ├──────────┼────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 1        │ Add useZoneKeys            │ Solves the real pain point (repetitive zone-gated keys)       │
  ├──────────┼────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 2        │ Fix useFocusZone internals │ Deduplicate controlled/uncontrolled logic, remove useKey loop │
  ├──────────┼────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ 3        │ Keep everything else as-is │ It's working, don't break it                                  │
  └──────────┴────────────────────────────┴───────────────────────────────────────────────────────────────┘
  Don't:
  - Export useKeys (no use case)
  - Add useGlobalKeys (no use case)
  - Change UI component APIs (load-bearing separation)
  - Add declarative JSX wrappers (wrong abstraction)

  ---
  Want me to design the useZoneKeys implementation, or start with fixing useFocusZone?
