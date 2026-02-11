# Orchestrate keyscope extraction

You are orchestrating the extraction of the keyboard navigation package from the diffgazer monorepo into a new standalone keyscope repository.

## Rules

- You do NOT write any code yourself
- You create a team and dispatch teammates to do all work
- You coordinate, review teammate results, and handle blockers
- You MUST read both the original prompt and the corrected plan BEFORE dispatching any teammate

## Reference Files

All documentation lives in `/Users/voitz/Projects/diffgazer/docs/design/keyboard/`:

| File | What it is | Read order |
|------|-----------|------------|
| `extract-keyscope-prompt.md` | **Original extraction prompt** — 11-step instructions with file mappings, import tables, config files. The base instructions. | 1st |
| `keyscope-extraction-plan.md` | **Corrected execution plan** — validated against actual source code. Contains fixes and clarifications that override the original prompt where they differ. **This is the source of truth.** | 2nd |
| `keyscope-final.md` | Package spec — API design, full refactored `useFocusZone`, `useZoneKeys` implementation, `mod` alias spec. Referenced by both docs above. | As needed |

### What the corrected plan fixes vs the original prompt

1. **`use-focus-zone.test.ts`** — original prompt says "Copy, fix imports" but the test WILL FAIL after removing `canTransition`. The plan provides the exact replacement test code.
2. **`useZoneKeys` implementation** — original prompt has a partial snippet. The plan provides the complete, verbatim implementation.
3. **`keysKey` computation** — original prompt says "compute from expanded individual keys". The plan says keep it simple: `Object.keys(handlers).join(",")`.
4. **`space` in KEY_ALIASES** — original prompt says "ensure `space` is in KEY_ALIASES". The plan confirms it already exists — no addition needed.
5. **Import mapping** — original prompt has a 3-column table (hooks/, providers/). The plan has a complete 5-column table (hooks/, providers/, context/, internal/).

## Paths

- **Source monorepo:** `/Users/voitz/Projects/diffgazer/packages/keyboard/`
- **Target repo:** `/Users/voitz/Projects/keyscope/`

**CRITICAL: Do NOT modify or delete anything in `/Users/voitz/Projects/diffgazer/`**

## Team Setup

Create a team called `keyscope-extraction`. Create 4 tasks, then dispatch teammates sequentially (each blocked by the previous).

### Task 1 → Teammate "setup" (general-purpose)

**Prompt:**
```
Read /Users/voitz/Projects/diffgazer/docs/design/keyboard/keyscope-extraction-plan.md — Phase 1.

Create the directory structure and ALL config files at /Users/voitz/Projects/keyscope/:
- mkdir -p src/providers src/context src/hooks src/utils src/internal
- Write package.json, tsconfig.json, vitest.config.ts, .gitignore (exact contents in plan Phase 1)
- Write LICENSE (MIT, 2026)
- git init

Do NOT run pnpm install yet — that's a later step.
Do NOT touch /Users/voitz/Projects/diffgazer/.
```

### Task 2 → Teammate "copier" (general-purpose)

**Prompt:**
```
Read /Users/voitz/Projects/diffgazer/docs/design/keyboard/keyscope-extraction-plan.md — Phase 2.
Also read /Users/voitz/Projects/diffgazer/docs/design/keyboard/keyscope-final.md for the full refactored useFocusZone.

Copy and create ALL source files at /Users/voitz/Projects/keyscope/src/:

STRAIGHTFORWARD COPIES (fix imports per plan's mapping table):
1. src/providers/keyboard-provider.tsx — from source keyboard-provider.tsx
2. src/context/keyboard-context.ts — from source use-keyboard-context.ts (RENAME)
3. src/hooks/use-key.ts — from source use-key.ts
4. src/hooks/use-keys.ts — from source use-keys.ts
5. src/hooks/use-scope.ts — from source use-scope.ts
6. src/hooks/use-navigation.ts — from source use-navigation.ts
7. src/hooks/use-tab-navigation.ts — from source (NO import changes needed)
8. src/utils/types.ts — from source types.ts (NO changes)
9. src/internal/use-dom-navigation-core.ts — from source (fix "../types" → "../utils/types")

MODIFIED FILES:
10. src/hooks/use-focus-zone.ts — REWRITE using the "Full refactored useFocusZone" from keyscope-final.md (spec lines 401-487). Do NOT copy the source version.
11. src/utils/keyboard-utils.ts — copy source + add isMac detection and mod alias expansion (see plan Phase 2, item 9). Note: space:" " already exists in KEY_ALIASES.

NEW FILES:
12. src/hooks/use-zone-keys.ts — complete implementation in plan Phase 2, item 12 (verbatim)
13. src/utils/keys.ts — implementation in plan Phase 2, item 13
14. src/index.ts — implementation in plan Phase 2, item 14

Source base: /Users/voitz/Projects/diffgazer/packages/keyboard/src/
Target base: /Users/voitz/Projects/keyscope/src/

IMPORT RULES — the plan has a per-directory import resolution table. Key changes:
- "./use-keyboard-context" → "../context/keyboard-context" (file was renamed)
- "./keyboard-utils" → "../utils/keyboard-utils" (from hooks/ or providers/)
- "./types" → "../utils/types" (from hooks/)
- "./internal/use-dom-navigation-core" → "../internal/use-dom-navigation-core" (from hooks/)

Do NOT touch /Users/voitz/Projects/diffgazer/.
```

### Task 3 → Teammate "tester" (general-purpose)

**Prompt:**
```
Read /Users/voitz/Projects/diffgazer/docs/design/keyboard/keyscope-extraction-plan.md — Phase 3.

Copy existing test files and create new ones at /Users/voitz/Projects/keyscope/src/:

1. src/utils/keyboard-utils.test.ts
   - Copy from source keyboard-utils.test.ts
   - Import stays "./keyboard-utils" (same dir)
   - ADD 2 new tests for mod alias (see plan Phase 3, Test 1)

2. src/providers/keyboard-provider.test.tsx
   - Copy from source keyboard-provider.test.tsx
   - Fix: "./use-keyboard-context" → "../context/keyboard-context"
   - Import "./keyboard-provider" stays (same dir)

3. src/hooks/use-focus-zone.test.ts
   - Copy from source use-focus-zone.test.ts
   - Mock paths stay unchanged (same dir)
   - CRITICAL: Replace the "registers only transition keys for the current zone" test with "registers all arrow key handlers when transitions are provided" — see plan Phase 3, Test 3 for exact replacement code

4. src/hooks/use-zone-keys.test.ts — NEW FILE
   - Write 10 test cases listed in plan Phase 3, Test 4
   - Use KeyboardProvider wrapper + window.dispatchEvent pattern
   - See plan for test helper pattern and all 10 test case descriptions

Source base: /Users/voitz/Projects/diffgazer/packages/keyboard/src/
Do NOT touch /Users/voitz/Projects/diffgazer/.
```

### Task 4 → Teammate "verifier" (general-purpose)

**Prompt:**
```
Read /Users/voitz/Projects/diffgazer/docs/design/keyboard/keyscope-extraction-plan.md — Phase 4.

Verify and finalize /Users/voitz/Projects/keyscope/:

1. pnpm install
2. pnpm type-check — MUST pass with 0 errors. If it fails, fix the issues.
3. pnpm test — MUST pass ALL tests. If any fail, fix them.
4. pnpm build — MUST produce dist/ with .js and .d.ts files.
5. Verify /Users/voitz/Projects/diffgazer/ is untouched (git status in that repo should show no changes).
6. Run through the verification checklist in the plan.
7. git add . && git commit with the message from the plan.

If type-check or tests fail, debug and fix before committing. Common issues:
- Wrong relative import paths (check the plan's mapping table)
- Missing type imports (verbatimModuleSyntax requires explicit import type)
- Test assertions expecting old canTransition behavior (should be updated in step 3)
```

## Dispatch Order

```
setup → (wait for completion) → copier → (wait) → tester → (wait) → verifier
```

Each teammate reads the plan file themselves — you don't need to repeat implementation details in your messages. Just tell them which task to start and point them to the plan.

After all teammates complete, verify the final checklist yourself by reading a few key files:
- `src/hooks/use-zone-keys.ts` exists
- `src/hooks/use-focus-zone.ts` has `setZoneValue`, no `canTransition`
- `src/index.ts` exports everything
- git log shows the commit
