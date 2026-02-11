# diff-ui extraction — Orchestrator Plan

## Orchestrator Prompt

The main agent should NOT execute any steps directly. Instead, create a team and dispatch teammates to do all work. Here's the prompt for the orchestrating agent:

---

```
You are orchestrating the extraction of the UI component library from the diffgazer monorepo into a new standalone diff-ui repository.

RULES:
- You do NOT write any code yourself
- You create a team and dispatch teammates to do all work
- You coordinate, review results, and handle the final verification

SOURCE: /Users/voitz/Projects/diffgazer/packages/ui/
TARGET: /Users/voitz/Projects/diff-ui/
SPEC: /Users/voitz/Projects/diffgazer/docs/design/ui/diff-ui-final.md
PROMPT: /Users/voitz/Projects/diffgazer/docs/design/ui/extract-diff-ui-prompt.md

CRITICAL: Do NOT modify or delete anything in /Users/voitz/Projects/diffgazer/

## Team Structure

Create a team called "diff-ui-extraction" and dispatch these teammates:

### Teammate 1: "scaffolder" (general-purpose)
Task: Create monorepo structure, configs, core package, CLI scaffold, root configs, and registry.json

Read the PROMPT file first. Then execute:
- Step 1: Create directory structure at /Users/voitz/Projects/diff-ui/
- Step 2: Copy tsconfig files from /Users/voitz/Projects/diffgazer/packages/tsconfig/ (base.json, react.json) + create package.json
- Step 3: Create @diff-ui/core package (copy cn.ts, create index.ts, package.json with devDependencies, tsconfig.json)
- Step 7: Scaffold CLI package (index.ts, package.json, tsconfig.json)
- Step 8: Create registry/registry.json with ALL 28 components — use the CORRECTED dependency graph from the prompt (stepper→badge, code-block→scroll-area, checklist→none, search-input→none). Include index.ts in compound component file lists.
- Step 9: Create root package.json, pnpm-workspace.yaml, turbo.json, .gitignore

When done, send a message to the team lead confirming all config files are created.

### Teammate 2: "copier" (general-purpose)
Task: Copy styles, copy ALL components, fix ALL imports

Read the PROMPT file first. Then execute:
- Step 4: Copy 3 style files. Clean theme.css (remove --severity-* and --status-* from both theme sections AND @theme block). Update sources.css paths to "../registry/components".
- Step 5: Copy ALL 22 single-file components (each into its own directory). Copy ALL 6 compound component directories INCLUDING index.ts barrel files. Copy 2 internal utility files.
- Step 6: Fix ALL imports using the 4-category rules:
  A. cn imports: all become "@/lib/utils"
  B. Internal: compound components change "../../internal/" to "../internal/" (single-file stay the same)
  C. Cross-component: "./scroll-area" → "../scroll-area/scroll-area", "./button" → "../button/button", "../badge" → "../badge/badge"
  D. Intra-compound: no change needed

CRITICAL import fixes (these are the ones that differ from the source):
- dialog/dialog-content.tsx: "../../internal/portal" → "../internal/portal"
- stepper/stepper-step.tsx: "../badge" → "../badge/badge"
- stepper/stepper-substep.tsx: "../badge" → "../badge/badge"
- code-block/code-block.tsx: "./scroll-area" → "../scroll-area/scroll-area"
- toggle-group/toggle-group.tsx: "./button" → "../button/button"

When done, send a message to the team lead confirming all components are copied and imports fixed.

### Teammate 3: "verifier" (general-purpose) — BLOCKED BY scaffolder AND copier
Task: Install dependencies, build, type-check, verify, and commit

Wait for both scaffolder and copier to finish. Then:
- cd /Users/voitz/Projects/diff-ui
- git init
- pnpm install
- pnpm build (must succeed — core + cli produce dist/)
- pnpm type-check (must pass)
- If anything fails, fix it and retry

Then verify the checklist from the PROMPT file (verification section). Key checks:
- /Users/voitz/Projects/diffgazer/ is untouched
- styles/theme.css has NO --severity-* or --status-* tokens
- ALL 28 components exist (22 single-file dirs + 6 compound dirs with index.ts)
- registry.json has correct dependencies (code-block→scroll-area, stepper→badge, checklist→none, search-input→none)
- ALL cn imports point to "@/lib/utils"
- Cross-component imports use correct paths (../badge/badge, ../scroll-area/scroll-area, etc.)

If all checks pass, create the initial commit:
git add .
git commit -m "Initial diff-ui extraction from diffgazer

Terminal-inspired React component library with shadcn-style CLI distribution.
Extracted from @diffgazer/ui:
- @diff-ui/core: cn() utility (npm package)
- Component registry: 28 components with dependency manifest
- Theme system: dark/light CSS variables (app-specific tokens removed)
- CLI scaffold for future npx diff-ui add <component>"

## Coordination

1. Dispatch scaffolder and copier IN PARALLEL (they work on independent parts of /Users/voitz/Projects/diff-ui/)
2. Once BOTH are done, dispatch verifier
3. If verifier reports failures, create a "fixer" teammate to address them
4. Once verifier confirms success, shut down all teammates
```
