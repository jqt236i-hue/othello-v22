# Online / Reconnect / Replay Refactor Plan (Precise)

Created: 2026-01-23  
DoD satisfied as of 2026-01-24 (see Evidence anchors)
Repo: ``  
Sources of truth: `01-rulebook.md`, `AGENTS.md`, `ONLINE_REFACTOR_TODO_20260120.md`

---

## 0) Definition of Done

### 0.1 Single deterministic rule entrypoint
- The only way to mutate rules state is:
  - `TurnPipeline.applyTurnSafe(cardState, gameState, playerKey, action, prng, options) -> Result`
- UI never mutates `gameState` / `cardState` directly.
- UI derives visuals purely from `events[]` and/or `presentationEvents[]` replay.

### 0.2 Determinism + sync guarantees
- Same `seed` + same ordered `action[]` => same `stateHash` every time.
- Duplicate apply is rejected (idempotency by `actionId`).
- Out-of-order actions are rejected (by `turnIndex` / version).
- Version mismatch is rejected (`rulesVersion`, `stateVersion`).
- Turn boundaries are **implicit** (no explicit `turn_start` action):
  - `applyTurnSafe(...)` always runs the full fixed pipeline phases internally.
  - `stateVersion` increments **exactly +1 per accepted action** (`ok:true` only).

### 0.3 Build gates
Must match `package.json` scripts:
- `npm test` (headless smoke) => `node scripts/smoke_headless.js`
- `npm run test:jest` (unit + determinism) => `jest --runInBand`
- `npm run test:jest:coverage` (optional; slower) => `jest --runInBand --coverage`
- `npm run test:e2e` (presentation sequences) => `node scripts/playwright_presentation_sequences.js`
- `npm run check:consistency` (catalog/rulebook consistency) => `node scripts/check_consistency.js`

### 0.4 Evidence anchors (DoD sync) ⚓️
- ✅ `game/ai/level-system.js` added and served — patch `patches/0019-fix-browser-init-empty-board.patch` (repro: `scripts/debug_browser_init.js`)
- ✅ `game/schema/action.js` enforces string `actionId` — patch `patches/0020-actionid-string-unify.patch` (tests updated)
- ✅ `pipeline_ui_adapter` JSON-safety verified — test `tests/unit/pipeline_ui_adapter_jsonsafe.test.js`, patch `patches/0022-adapter-jsonsafe-finalize.patch`
- ✅ Turn-manager test flake fixed — `tests/unit/game/turn-manager.noanim.test.js`, patch `patches/0021-fix-turn-manager-noanim-test-flags.patch`
- ✅ Static gate `npm run check:ui-writers` passes (prevents UI-side rule mutation)
- ✅ CI verification: short CPU fuzz runs and Jest tests tracked in `.github/workflows/cpu-fuzz.yml` and `.github/workflows/ci.yml`

> Minimal anchors for the current DoD. Add further patch/test references here as tasks complete.

### 0.5 Known issues
- Tests pass but the test runner reports remaining open handles and a `ReferenceError: window is not defined` at process exit. Investigation is tracked as a separate task.

---

## 1) Current high-risk problems to eliminate

### 1.1 Multiple state mutation paths (must converge)
UI still directly calls rule logic and mutates state in multiple places, e.g.:
- `game/turn-manager.js` (turn start flow)
- `game/special-effects/bombs.js` (tick bombs)
- `game/special-effects/hyperactive.js` (hyperactive moves + direct charge edits)
- `game/card-effects/destroy.js` (direct destroy apply)
- `game/card-effects/placement.js` (direct placement effects apply)

This is a guaranteed desync source for online/replay.

### 1.2 Turn boundary double-application risk
- Pipeline calls `CardLogic.onTurnEnd` inside `game/turn/turn_pipeline.js`
- UI also calls `CardLogic.onTurnEnd` in `game/move-executor.js`

For online, the rule is "1 action => 1 stateVersion increment". Double boundaries break this.

### 1.3 `pipeline_ui_adapter` is not protocol-safe
- Uses `Map` for `after` (not JSON-serializable).
- Fills `after` from the final snapshot, which cannot represent intermediate states correctly.

Target: UI should replay `presentationEvents[]` as primary truth. Therefore:
- Snapshot-derived `after` is **not** a source-of-truth for online/replay and must be removed.
- `pipeline_ui_adapter` is either:
  - replaced by a thin, JSON-safe translator from deterministic events to UI playback events, **or**
  - deleted once UI consumes `presentationEvents[]` directly.

### 1.4 Action schema is duplicated
- `game/schema/action.js` (numeric counter actionId)
- `game/schema/action_manager.js` (string actionId; Date.now + Math.random)

Online protocol needs one canonical shape.

---

## 2) Target architecture

### 2.1 Layer responsibilities
- Rule/Engine (deterministic):
  - Input: `state + action + prngState`
  - Output: `Result { ok, nextStateVersion, stateHash, events[], presentationEvents[] }`
  - Forbidden: DOM/window, **Date.now/Math.random in rule layer** (use injected PRNG only)
- UI (non-deterministic allowed):
  - Input: `Result.events` and/or `presentationEvents`
  - Output: animations, sound, rendering
  - Forbidden: rule state mutation, "guessing" missing state

### 2.2 Single writer principle
- All board mutations (SPAWN/DESTROY/CHANGE/MOVE) must go through `BoardOps`.
- All user interactions must become an `action` fed into `applyTurnSafe`.

---

## 3) Canonical schemas (Action / Result / Version / Hash)

### 3.1 Action (input) - canonical fields
Required:
- `type`: "place" | "pass" | ...
- `playerKey`: "black" | "white"
- `actionId`: string (protocol stable; server-authoritative)
- `turnIndex`: number

Recommended:
- `clientTimestamp`: number (UI-only; must not affect rules)

Authority + generation policy (fixed):
- Offline: `ActionManager` generates `actionId` as a string.
- Online: server is the final authority for `actionId`.
  - client may send a **provisional** actionId for de-duplication/retry,
  - server may replace it with a server-issued actionId, and the client must accept that mapping.

Unification plan (fixed):
- Keep `ActionManager` as canonical generator/tracker (string ids).
- Make `ActionSchema` purely validation/normalization (no id generation; no numeric counters).

Concrete tasks:
1) Update `normalizeAction` to always output the canonical shape (string `actionId`, canonical fields).
2) Remove numeric-id generation from `ActionSchema` (validation/normalization only).
3) Ensure every UI entry (place/pass/targeted effects) uses the same creation path.

### 3.2 Result (output) - canonical fields
Required:
- `ok: boolean`
- `events: []` (rule log, including action_rejected)
- `presentationEvents: []` (board mutations for visuals)
- `nextStateVersion: number` (increment only on ok)

Recommended:
- `stateHash: string` (hash of extractHashableState **including prngState**)
- `rejectedReason?: string` (stable enum)
- `errorMessage?: string` (debug only)
- `prngState: object` (required for full replay determinism; must be included in the hash input)

Concrete tasks:
1) Make `applyTurnSafe` return `ResultSchema.createResult(...)` compatible objects.
2) Run `StateValidator.validateState(gameState, cardState)` after every ok result.
3) Compute `stateHash` (sync in Node tests; async in browser is fine for UI).
4) Standardize the hash spec:
   - Canonical stringify with sorted keys (no Map/Set/functions in hash input).
   - Fixed algorithm: **SHA-256** (no weak fallback for online protocol).
   - Always include `prngState` in the hash input.
   - Protocol mode MUST fail if SHA-256 is unavailable (remove/disable “simple hash” fallbacks).

---

## 4) presentationEvents as the single visual truth

### 4.1 Goals
- `presentationEvents[]` is JSON-serializable and replayable.
- Every event includes `actionId`, `turnIndex`, `plyIndex` (for dedupe and sequencing).
- UI can fully rebuild visuals by replaying presentation events.

### 4.1.1 Minimal canonical event schema (fixed)
All `presentationEvents[]` entries MUST be JSON-safe objects and include:
- `type`: `"SPAWN" | "DESTROY" | "CHANGE" | "MOVE"`
- `actionId`: string
- `turnIndex`: number
- `plyIndex`: number (0..n within a single action)

Type-specific minimal fields (must be sufficient to map to BoardOps’ 4 ops):
- SPAWN: `{ stoneId, row, col, ownerAfter }`
- DESTROY: `{ stoneId|null, row, col, ownerBefore }`
- CHANGE: `{ stoneId|null, row, col, ownerBefore, ownerAfter }`
- MOVE: `{ stoneId|null, prevRow, prevCol, row, col, ownerBefore, ownerAfter }`

Optional but allowed:
- `cause`, `reason`, `meta` (must not contain non-JSON types)

### 4.2 Concrete tasks
1) Teach `BoardOps` to accept "current action meta" and populate event fields:
   - `actionId`, `turnIndex`, `plyIndex`
2) Remove `Map` usage from `game/turn/pipeline_ui_adapter.js` outputs.
   - Note: Implemented in `patches/0002-presentation-meta-and-adapter.patch` — the adapter now produces JSON-safe per-target `after` objects and no longer relies on a final snapshot `Map`. See `tests/unit/presentation_events_mandatory_meta.test.js` for verification.
3) Make UI prefer `presentationEvents` playback (AnimationEngine) for board updates.
4) Keep fancy per-card animations as optional overlays (never as state writers).

---

## 5) Migration plan (phased, small diffs)

### Phase A (highest priority): eliminate desync sources
Goal: only the pipeline mutates rule state; UI becomes "action in -> result replay".

Tasks:
- A1) Remove UI-side `CardLogic.onTurnEnd` call from `game/move-executor.js`.
- A2) Remove UI-side turn-start rule mutations from `game/turn-manager.js`:
  - No more `CardLogic.onTurnStart`, `processBombs`, `processHyperactiveMovesAtTurnStart` as rule writers.
  - Replace with the pipeline-driven implicit phases inside `applyTurnSafe(...)` (no explicit `turn_start` action).
- A3) Convert pass handling to pipeline result replay only (no extra state writes):
  - `game/pass-handler.js`
- A4) Convert targeted card flows (destroy/tempt/inherit/swap):
  - UI selection builds an action payload and calls `applyTurnSafe`.
  - Remove direct `CardLogic.applyDestroyEffect` from `game/card-effects/destroy.js`.

Acceptance checks:
- No rule-state mutation remains in UI modules (except action creation / replay).
- Same action sequence yields same hash in unit tests.

### Phase B: make presentationEvents primary
Goal: deterministic board mutation log drives visuals everywhere.

Tasks:
- B1) Ensure all board mutations go through `BoardOps` (already mostly done; verify no direct board writes remain).
- B2) Add action meta to every `presentationEvents` record.
- B3) Make AnimationEngine consume `presentationEvents` (or convert them 1:1).
- B4) Demote `pipeline_ui_adapter` to a thin translator or delete it once unused.

### Phase C: online operational hardening
Goal: server-authoritative ready, reconnect and replay robust.

Tasks:
- C1) Implement/enable strict `ActionTracker` checks:
  - DUPLICATE_ACTION, OUT_OF_ORDER, VERSION_MISMATCH, INVALID_ACTION
- C2) Add `rulesVersion` and `stateVersion` policy:
  - mismatch => action_rejected
- C3) Serialization invariants:
  - `deserialize(serialize(state))` equals (or hash-equals)

---

## 6) Tests to add (minimum set)

### Determinism
- Same seed + same actions => same `stateHash` across runs.
- Including PRNG state in the hash is stable.

### Protocol behavior
- Duplicate actionId rejected.
- Out-of-order turnIndex rejected.
- Version mismatch rejected.

### State invariants
- `StateValidator.validateState` always valid after ok results.

### Serialization (reconnect)
- `deserialize(serialize(state))` is semantically equal (at least `stateHash`-equal with identical `prngState`).

---

## 7) Prioritized implementation tasks (explicit)

### S (must-do first)
1) Add a static check that fails CI if UI calls rule writers directly (CardLogic.* / direct board mutation outside pipeline).
   - Target detection scope (initial): `game/**/*.js`, `ui.js`, `ui/**/*.js`
   - Pattern examples (from current repo reality):
     - `CardLogic.onTurnEnd` in `game/move-executor.js:75`
     - `CardLogic.onTurnStart` + `processBombs` + `processHyperactiveMovesAtTurnStart` in `game/turn-manager.js:238`, `:289`, `:301`
     - `CardLogic.tickBombs` in `game/special-effects/bombs.js:24`
     - `CardLogic.processHyperactiveMoves` in `game/special-effects/hyperactive.js:16`
     - `CardLogic.applyDestroyEffect` in `game/card-effects/destroy.js:26`
     - `CardLogic.applyPlacementEffects` in `game/card-effects/placement.js:72`
2) Replace `applyTurnSafe` JSON clone with `structuredClone` or a safe deepClone utility.
   - Current implementation uses JSON clone: `game/turn/turn_pipeline.js:68`

### A (next)
3) Make `BoardOps` accept action meta and populate `presentationEvents` required fields.
   - Current `presentationEvents` fields are placeholders: `game/logic/board_ops.js:46` (`actionId: null`, `plyIndex: null`)
4) Enforce `stateHash` protocol requirements (no fallback simple hash in online mode).
   - Fallback exists today: `game/schema/result.js:157`, `:185`

### B (later, but planned now)
5) Deprecate `game/schema/action.js` numeric id generation via a staged migration:
   - Step 1: stop generating ids there; accept string ids from ActionManager/server and only validate/normalize.
   - Step 2: update all call sites to use ActionManager-generated `actionId` strings.
   - Step 3: remove `actionIdCounter` / `generateActionId` once no longer referenced.
   - Numeric id generation exists today: `game/schema/action.js:16`, `:22`

---

## 8) Implementation notes (guardrails)
- One change = one intent; keep diffs small.
- Rule changes follow: rulebook -> tests -> implementation.
- Never add new per-card copy-paste state writers; always reuse BoardOps and pipeline phases.

