# LibreChat

## Project Overview

LibreChat is a monorepo with the following key workspaces:

| Workspace | Language | Side | Dependency | Purpose |
|---|---|---|---|---|
| `/api` | JS (legacy) | Backend | `packages/api`, `packages/data-schemas`, `packages/data-provider`, `@librechat/agents` | Express server — minimize changes here |
| `/packages/api` | **TypeScript** | Backend | `packages/data-schemas`, `packages/data-provider` | New backend code lives here (TS only, consumed by `/api`) |
| `/packages/data-schemas` | TypeScript | Backend | `packages/data-provider` | Database models/schemas, shareable across backend projects |
| `/packages/data-provider` | TypeScript | Shared | — | Shared API types, endpoints, data-service — used by both frontend and backend |
| `/client` | TypeScript/React | Frontend | `packages/data-provider`, `packages/client` | Frontend SPA |
| `/packages/client` | TypeScript | Frontend | `packages/data-provider` | Shared frontend utilities |

The source code for `@librechat/agents` (major backend dependency, same team) is at `/home/danny/agentus`.

---

## Workspace Boundaries

- **All new backend code must be TypeScript** in `/packages/api`.
- Keep `/api` changes to the absolute minimum (thin JS wrappers calling into `/packages/api`).
- Database-specific shared logic goes in `/packages/data-schemas`.
- Frontend/backend shared API logic (endpoints, types, data-service) goes in `/packages/data-provider`.
- Build data-provider from project root: `npm run build:data-provider`.
- **After any change to `packages/api/src/**/*.ts`** (e.g. `definitions.ts`, tool registrations), rebuild the package before restarting the backend: `cd packages/api && npm run build`. The backend loads `packages/api/dist/index.js` at startup — if the dist is stale, changes are silently ignored and tools will not be available to agents.

---

## Code Style

### Naming and File Organization

- **Single-word file names** whenever possible (e.g., `permissions.ts`, `capabilities.ts`, `service.ts`).
- When multiple words are needed, prefer grouping related modules under a **single-word directory** rather than using multi-word file names (e.g., `admin/capabilities.ts` not `adminCapabilities.ts`).
- The directory already provides context — `app/service.ts` not `app/appConfigService.ts`.

### Structure and Clarity

- **Never-nesting**: early returns, flat code, minimal indentation. Break complex operations into well-named helpers.
- **Functional first**: pure functions, immutable data, `map`/`filter`/`reduce` over imperative loops. Only reach for OOP when it clearly improves domain modeling or state encapsulation.
- **No dynamic imports** unless absolutely necessary.

### DRY

- Extract repeated logic into utility functions.
- Reusable hooks / higher-order components for UI patterns.
- Parameterized helpers instead of near-duplicate functions.
- Constants for repeated values; configuration objects over duplicated init code.
- Shared validators, centralized error handling, single source of truth for business rules.
- Shared typing system with interfaces/types extending common base definitions.
- Abstraction layers for external API interactions.

### Iteration and Performance

- **Minimize looping** — especially over shared data structures like message arrays, which are iterated frequently throughout the codebase. Every additional pass adds up at scale.
- Consolidate sequential O(n) operations into a single pass whenever possible; never loop over the same collection twice if the work can be combined.
- Choose data structures that reduce the need to iterate (e.g., `Map`/`Set` for lookups instead of `Array.find`/`Array.includes`).
- Avoid unnecessary object creation; consider space-time tradeoffs.
- Prevent memory leaks: careful with closures, dispose resources/event listeners, no circular references.

### Type Safety

- **Never use `any`**. Explicit types for all parameters, return values, and variables.
- **Limit `unknown`** — avoid `unknown`, `Record<string, unknown>`, and `as unknown as T` assertions. A `Record<string, unknown>` almost always signals a missing explicit type definition.
- **Don't duplicate types** — before defining a new type, check whether it already exists in the project (especially `packages/data-provider`). Reuse and extend existing types rather than creating redundant definitions.
- Use union types, generics, and interfaces appropriately.
- All TypeScript and ESLint warnings/errors must be addressed — do not leave unresolved diagnostics.

### Comments and Documentation

- Write self-documenting code; no inline comments narrating what code does.
- JSDoc only for complex/non-obvious logic or intellisense on public APIs.
- Single-line JSDoc for brief docs, multi-line for complex cases.
- Avoid standalone `//` comments unless absolutely necessary.

### Import Order

Imports are organized into three sections:

1. **Package imports** — sorted shortest to longest line length (`react` always first).
2. **`import type` imports** — sorted longest to shortest (package types first, then local types; length resets between sub-groups).
3. **Local/project imports** — sorted longest to shortest.

Multi-line imports count total character length across all lines. Consolidate value imports from the same module. Always use standalone `import type { ... }` — never inline `type` inside value imports.

### JS/TS Loop Preferences

- **Limit looping as much as possible.** Prefer single-pass transformations and avoid re-iterating the same data.
- `for (let i = 0; ...)` for performance-critical or index-dependent operations.
- `for...of` for simple array iteration.
- `for...in` only for object property enumeration.

---

## Frontend Rules (`client/src/**/*`)

### Localization

- All user-facing text must use `useLocalize()`.
- Only update English keys in `client/src/locales/en/translation.json` (other languages are automated externally).
- Semantic key prefixes: `com_ui_`, `com_assistants_`, etc.

### Components

- TypeScript for all React components with proper type imports.
- Semantic HTML with ARIA labels (`role`, `aria-label`) for accessibility.
- Group related components in feature directories (e.g., `SidePanel/Memories/`).
- Use index files for clean exports.

### Data Management

- Feature hooks: `client/src/data-provider/[Feature]/queries.ts` → `[Feature]/index.ts` → `client/src/data-provider/index.ts`.
- React Query (`@tanstack/react-query`) for all API interactions; proper query invalidation on mutations.
- QueryKeys and MutationKeys in `packages/data-provider/src/keys.ts`.

### Data-Provider Integration

- Endpoints: `packages/data-provider/src/api-endpoints.ts`
- Data service: `packages/data-provider/src/data-service.ts`
- Types: `packages/data-provider/src/types/queries.ts`
- Use `encodeURIComponent` for dynamic URL parameters.

### Performance

- Prioritize memory and speed efficiency at scale.
- Cursor pagination for large datasets.
- Proper dependency arrays to avoid unnecessary re-renders.
- Leverage React Query caching and background refetching.

---

## Development Commands

| Command | Purpose |
|---|---|
| `npm run smart-reinstall` | Install deps (if lockfile changed) + build via Turborepo |
| `npm run reinstall` | Clean install — wipe `node_modules` and reinstall from scratch |
| `npm run backend` | Start the backend server |
| `npm run backend:dev` | Start backend with file watching (development) |
| `npm run build` | Build all compiled code via Turborepo (parallel, cached) |
| `npm run frontend` | Build all compiled code sequentially (legacy fallback) |
| `npm run frontend:dev` | Start frontend dev server with HMR (port 3090, requires backend running) |
| `npm run build:data-provider` | Rebuild `packages/data-provider` after changes |

- Node.js: v20.19.0+ or ^22.12.0 or >= 23.0.0
- Database: MongoDB
- Backend runs on `http://localhost:3080/`; frontend dev server on `http://localhost:3090/`
- **Port 3080 already in use (`EADDRINUSE`)** — happens frequently when an old node process is still running. Fix: kill the process holding the port, then restart nodemon with `rs`. PowerShell one-liner: `$p = (Get-NetTCPConnection -LocalPort 3080 -State Listen).OwningProcess; Stop-Process -Id $p -Force`

---

## Testing

- Framework: **Jest**, run per-workspace.
- Run tests from their workspace directory: `cd api && npx jest <pattern>`, `cd packages/api && npx jest <pattern>`, etc.
- Frontend tests: `__tests__` directories alongside components; use `test/layout-test-utils` for rendering.
- Cover loading, success, and error states for UI/data flows.

### Philosophy

- **Real logic over mocks.** Exercise actual code paths with real dependencies. Mocking is a last resort.
- **Spies over mocks.** Assert that real functions are called with expected arguments and frequency without replacing underlying logic.
- **MongoDB**: use `mongodb-memory-server` for a real in-memory MongoDB instance. Test actual queries and schema validation, not mocked DB calls.
- **MCP**: use real `@modelcontextprotocol/sdk` exports for servers, transports, and tool definitions. Mirror real scenarios, don't stub SDK internals.
- Only mock what you cannot control: external HTTP APIs, rate-limited services, non-deterministic system calls.
- Heavy mocking is a code smell, not a testing strategy.

---

## Formatting

Fix all formatting lint errors (trailing spaces, tabs, newlines, indentation) using auto-fix when available. All TypeScript/ESLint warnings and errors **must** be resolved.

---

## Règles de collaboration — répartition des rôles

**Utilisateur** : remonte les problèmes terrain + modifie le system prompt dans l'UI LibreChat.

**Claude** : tout le reste — diagnostic, code, commit, push, déploiement Railway. Sans demander de confirmation.

- Quand un bug est signalé → diagnostiquer, corriger, committer, pusher sur `main` → Railway auto-déploie
- Ne jamais demander à l'utilisateur de merger ou de pousser
- Railway écoute la branche `main` du repo `omarou15/LibreChat` — un push suffit à déclencher le build
- Si le déploiement ne se lance pas → fallback : `cd C:\Users\omaro\LibreChat-deploy && railway up --service LibreChat --detach`
- Le system prompt (`data/visite-technique-system-prompt.md`) est dans `.gitignore` — non commité, copié manuellement dans l'UI après modification

---

## Fork EnergyCo — Maintenabilité upstream

Ce projet est un fork de LibreChat avec des features métier (audit énergétique). L'objectif est de pouvoir merger les mises à jour upstream sans conflits majeurs.

**Audit complet :** [`.claude/UPSTREAM_AUDIT.md`](.claude/UPSTREAM_AUDIT.md)

### Règle d'or

> **Toujours créer de nouveaux fichiers plutôt que modifier des fichiers core LibreChat.**

Quand une modification d'un fichier core est inévitable, la garder à **une seule ligne** (un import, un export, un spread) pour que le conflit de merge soit trivial.

### Fichiers core sensibles (à toucher le moins possible)

| Fichier | Sensibilité |
|---------|-------------|
| `client/src/components/Chat/Input/ChatForm.tsx` | Élevée — change souvent upstream |
| `client/src/components/Nav/NewChat.tsx` | Moyenne |
| `client/src/components/UnifiedSidebar/ExpandedPanel.tsx` | Moyenne |
| `packages/data-schemas/src/methods/conversation.ts` | Modification intentionnelle — voir audit |

### Modifications intentionnelles (à re-appliquer après chaque merge upstream)

Trois fichiers ont des suppressions de vérifications multi-tenant, **volontaires** pour un déploiement interne mono-organisation. Ils sont documentés dans l'audit avec la procédure exacte de re-application.

---

## Agent Visite Technique — Notes d'architecture

### Hook anti-boucle `visit_file` (`api/server/controllers/agents/client.js`)

Un hook `PostToolUse` est enregistré dans `runAgents()` à chaque tour. Il autorise le premier appel `visit_file` réussi (`ok: true`), puis bloque tout appel suivant avec `preventContinuation: true`.

C'est une correction anti-boucle pragmatique, pas une architecture finale. La solution idéale serait de permettre une réponse finale texte après le premier tool call, tout en empêchant tout nouveau tool call `visit_file` dans cette réponse finale — via un hook `PreToolUse` retournant `decision: 'deny'` quand `visitFileSucceeded === true`.

### Paramètre `hooks` dans `createRun` (`packages/api/src/agents/run.ts`)

Un paramètre optionnel `hooks?: HookRegistry` a été ajouté à `createRun()` et passé à `Run.create()`. Ce paramètre n'existait pas dans le code upstream. À re-vérifier lors des merges upstream de `packages/api`.

### Schéma JSON de l'agent

Le schéma JSON de référence de la visite est embarqué dans la description du tool `visit_file` (`api/app/clients/tools/structured/VisitFile.js`), pas dans le system prompt. Le system prompt est dans `data/visite-technique-system-prompt.md` — à copier-coller dans la config UI de l'agent après chaque modification.
