# keyscope

Composable, scoped keyboard navigation hooks for React 19. Zero external dependencies, ~1.5 KB gzipped.

## What This Package Provides

### Standalone Hooks (copy-paste via CLI)
These work independently, without `KeyboardProvider`. Available via `keyscope add --mode copy`:

| Hook | Purpose | Registry Item |
|------|---------|--------------|
| `useNavigation` | Keyboard list navigation (arrow keys, Enter, Space). Queries `[role][data-value]` elements | `navigation` |
| `useFocusTrap` | Trap Tab key within a container, cycling focus to first/last focusable element | `focus-trap` |
| `useScrollLock` | Prevent body/element scrolling with reference counting (supports concurrent locks) | `scroll-lock` |

### Provider-Dependent Hooks (require full package)
These require `KeyboardProvider` context. Install via `keyscope add --mode package`:

| Hook | Purpose |
|------|---------|
| `useKey` | Register scoped hotkey handlers. Multiple signatures: single key, array, key map |
| `useScope` | Push/pop scope onto stack for layered handler execution (modals, dialogs) |
| `useScopedNavigation` | Navigation with scope awareness (only active scope receives events) |
| `useFocusZone` | Multi-zone focus management with configurable arrow key transitions between zones |

### Infrastructure
- `KeyboardProvider` — context provider managing scope stack + handler registry
- `keys()` — utility to map multiple hotkeys to same handler
- `useOptionalKeyboardContext()` — returns null if no provider (for optional integration)

## Structure

```
src/
├── index.ts                      # barrel exports
├── hooks/
│   ├── use-key.ts               # hotkey binding (+ test)
│   ├── use-scope.ts             # scope push/pop (+ test)
│   ├── use-navigation.ts        # standalone navigation (+ test)
│   ├── use-scoped-navigation.ts # scoped navigation (+ test)
│   ├── use-focus-trap.ts        # focus trapping (+ test)
│   ├── use-focus-zone.ts        # multi-zone focus (+ test)
│   └── use-scroll-lock.ts       # scroll prevention (+ test)
├── providers/
│   └── keyboard-provider.tsx    # KeyboardProvider context
├── context/
│   └── keyboard-context.ts      # context hooks
├── internal/
│   └── normalize-key-input.ts   # normalize useKey overloads
├── utils/
│   ├── keys.ts                  # keys() utility
│   ├── keyboard-utils.ts        # matchesHotkey(), isInputElement()
│   └── keyboard-utils.test.ts
├── cli/
│   ├── index.ts                 # CLI entry point (createCli)
│   ├── constants.ts             # VERSION, CONFIG_FILE
│   ├── commands/                # init, add, list, diff, remove
│   ├── utils/                   # config, registry, commands
│   └── generated/               # registry-bundle.json (built)
registry/
│   └── registry.json            # 3 standalone hooks
scripts/
│   ├── bundle-registry.ts       # bundle registry for CLI
│   ├── copy-generated.ts        # copy to dist/
│   └── build-publish-artifacts.mjs  # build docs/registry artifacts
docs/
│   ├── content/                 # MDX documentation
│   └── assets/                  # images, SVGs
artifacts/                       # generated dist artifacts
```

## Commands

```bash
pnpm build            # bundle registry → tsc → copy generated
pnpm test             # vitest (all hook tests)
pnpm test -- -t "name" # single test by name
pnpm test:watch       # watch mode
pnpm playground       # interactive demo app
pnpm build:artifacts  # build docs/registry artifacts for publishing
```

## CLI Commands

```bash
keyscope init          # create keyscope.json config
keyscope add <hooks>   # install hooks (--mode copy|package)
keyscope list          # show available hooks
keyscope diff          # compare local vs registry
keyscope remove <hooks> # uninstall hooks
```

## Conventions

- React 19 required (`useEffectEvent` used internally)
- Tests co-located as `*.test.tsx` next to source
- `@testing-library/react` + `vitest` + `jsdom`
- Registry bundle must be built before publish (`prebuild` script)
- ESM only, `.js` extensions, strict TypeScript
- `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns` enabled

## Dependencies

- **Production**: `@b4r7/cli-core` (workspace) — CLI framework
- **Peer**: `react@^19.0.0`
- **Dev**: `@b4r7x/registry-kit` (artifact generation), `shadcn`, `vitest`, `@testing-library/react`

## Key Patterns

- **Scope-based event routing**: Global `keydown` listener routes to handlers in active scope only (LIFO)
- **Handler registration**: Multiple handlers per hotkey, filters for input elements/target refs/focus
- **Platform-aware**: `mod` key maps to `meta` on macOS, `ctrl` on Windows
- **Two install modes**: `copy` (files only, zero deps) or `package` (full keyscope as dependency)
