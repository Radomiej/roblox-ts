# Development Plan - roblox-ts v3.1.0

## 1. Overview
*   **Current Version:** 3.0.0
*   **Target Version:** 3.1.0
*   **Focus:** TypeScript upgrade (5.6.2), support for new JS features (`using`, `Symbol.iterator`), technical debt reduction (prereq system), and critical bug fixes.

## 2. Milestone 3.1.0 Goals
These items are explicitly assigned to the v3.1.0 milestone on GitHub.

### 🚀 New Features
*   **#2807 Upgrade TypeScript to 5.6.2**
    *   Bring the latest TS features and performance improvements.
*   **#2616 Add support for `using` statements**
    *   Implement TC39 Explicit Resource Management (Disposable pattern).
*   **#1826 Handle `Symbol.iterator`**
    *   Enable standard JS iteration protocols for better compatibility.
*   **#2537 Deal with `Symbol.hasInstance` for `instanceof` operator**
    *   Customize `instanceof` behavior using symbols.
*   **#1829 Allow `LuaTuple` destructure assignment**
    *   Syntactic sugar for handling Lua multi-return values closer to TS destructuring.
*   **#2015 Custom Math Prototype**
    *   Extensions or fixes to the Math object behavior.
*   **#2811 `rbxtsc sourcemap` + `rbxtsc typegen`**
    *   New CLI commands for better tooling integration.

### 🛠 Technical Debt & Refactoring
*   **#2729 Rewrite prereq system**
    *   Overhaul the system handling compilation prerequisites for better stability/performance.
*   **#2810 Convert include files to be `.luau`**
    *   Move internal runtime files to native Luau format.
*   **#2813 Transform `.d.ts` files in src with `typescript-transform-paths`**
    *   Improve resolution of declaration files during build.

## 3. Critical Bugs & Recent Issues (Triage Required)
Issues not strictly in the milestone but critical for stability or recently reported.

*   **🔥 Critical / High Priority**
    *   **#2992 `rbxtsc -w` crashes when a file requires a .d.ts file in wrong location**
        *   **Status:** Open
        *   **Impact:** Crashes the watcher, severely affecting DX. Must be fixed.
    *   **#2982 Map won't set if undefined value**
        *   **Status:** Open
        *   **Impact:** Runtime correctness. Violates JS Map semantics if verified.
    *   **#2994 `.Title` is not a child of `DockWidgetPluginGui`**
        *   **Status:** Open
        *   **Impact:** Incorrect typings for Roblox API, causing false compile errors.

*   **⚠️ Medium Priority / Investigation Needed**
    *   **#2987 Support Rojo packages not in type roots**
        *   **Status:** Open
        *   **Impact:** Path resolution issue for certain project structures.
    *   **#2930 Bun issue**
        *   **Status:** Open
        *   **Impact:** Compatibility with Bun runtime (growing in popularity).

## 4. Proposed Action Plan

### Phase 1: Stability & Critical Fixes (Immediate)
1.  **Investigate & Fix #2992**: Watch mode crash is a blocker for efficient development. - **Fixed**
    *   Added error handling in `setupProjectWatchProgram.ts` to report unexpected errors as diagnostics instead of crashing.
2.  **Verify #2982**: Confirm Map behavior bug and patch if necessary. - **Verified**
    *   Map tests pass, including undefined value handling. Double evaluation bug in Map constructor was fixed.
3.  **Triage #2994**: Update API types if confirmed. - **Investigated**
    *   `Title` property exists on `DockWidgetPluginGui` (inherited from `PluginGui` or `LayerCollector`?). Confirmed definitions present in `@rbxts/types`.

### Phase 1.5: Quick Wins & Fixes (Review & Merge Candidates)
PRs that address specific bugs or correctness issues and appear ready for testing/merge.

*   **#2970 fix: $range adding `or 1` to the step** (AsynchronousAI) - **Merged**
    *   Fixes logic when step is negative in range macro.
*   **#2991 Fix transformer order** (ari-party) - **Merged**
    *   Ensures correct execution order of compiler transformers.
*   **#2917 fix: evaluate case expressions only once** (eiei114) - **Merged**
    *   Corrects switch statement behavior to match JS semantics (avoid re-evaluation).
*   **#2962 fix: ban indexing length in tuples** (wad4444) - **Merged**
    *   Prevents incorrect access to length property on LuaTuples.
*   **#2887 Fix "return nil" generation for complexly named files** (camren-m) - **Merged**
    *   Fixes codegen edge case for file naming.
*   **#2846 Fix transformer diagnostic spans** (Fireboltofdeath) - **Merged**
    *   Improves error reporting locations.
*   **#2975 Update linting configuration** (Cascade) - **Merged**
    *   Updated to ESLint 9, TypeScript 5.9, consolidated tsconfigs, and added caching for CI speed improvements.
*   **Update Runtime & Compiler to use modern Roblox APIs** (Implemented)
    *   Replaced deprecated `wait`, `spawn`, `delay` with `task` library in `Promise.lua` and `RuntimeLib.lua`.
    *   Replaced global `unpack` with `table.unpack` in compiler output and runtime.

### Phase 2: Core Milestone Implementation (In Progress)
1.  **TS Upgrade (#2807)**: Should be prioritized as it may conflict with other changes. Current TS lib its 5.9.3
2.  **Runtime Features**: Implement `using` (#2616) and `Symbol` features (#1826, #2537).
3.  **CLI Tools**: Finalize `sourcemap` and `typegen` commands (#2811).
4.  **Update Runtime & Compiler to use modern Roblox APIs** (Implemented)
    *   Replaced deprecated `wait`, `spawn`, `delay` with `task` library in `Promise.lua` and `RuntimeLib.lua`.
    *   Replaced global `unpack` with `table.unpack` in compiler output and runtime.

### Phase 3: Refactoring & Cleanup
1.  **Prereq System (#2729)**: Execute rewrite after critical features are stable.
2.  **Migration to .luau (#2810)**: Convert internal include files.

### Phase 4: Release Prep
1.  Run full test suite (`npm test`).
2.  Update documentation/CHANGELOG.
3.  Tag v3.1.0.

## 5. Future Considerations (Backlog)
*   **#2974 Proper compiler support for multiple projects (workspaces)**: Major architectural change, likely post-3.1.0.
*   **#2641 Unit test support**: Native testing integration.
