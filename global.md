# roblox-ts Development Guide

## Project Overview
**roblox-ts** is a TypeScript-to-Luau Compiler for Roblox. It allows developers to write Roblox games using TypeScript, which is then compiled into Luau code optimized for the Roblox engine.

## Core Rules & Modernization
The following rules have been established to modernize the codebase and align with current Roblox API standards:

1.  **Task Library over Globals**:
    *   **Do not use** global `wait()`, `spawn()`, or `delay()`.
    *   **Use** `task.wait()`, `task.spawn()` / `task.defer()`, and `task.delay()` respectively.
    *   The `task` library is more reliable and integrates better with the Roblox engine scheduler.

2.  **Table Library**:
    *   **Do not use** global `unpack()`.
    *   **Use** `table.unpack()`. The global `unpack` is deprecated in Luau.

3.  **Compiler Diagnostics**:
    *   The compiler enforces specific diagnostics compatible with Roblox (e.g., banning `var`, `any` type usage where possible).
    *   New diagnostics should be added to `src/Shared/diagnostics.ts` and checked in `src/TSTransformer/util/addIndexDiagnostics.ts` or similar utility files.

4.  **Testing**:
    *   Run tests using `npm test`.
    *   This workflow builds the project (`npm run build`), compiles tests (`npm run test-compile`), builds the Rojo project (`npm run test-rojo`), and runs them using Lune (`npm run test-run`).
    *   Tests are located in `tests/src`.

## External Resources & Patching
When working with the upstream repository (`roblox-ts/roblox-ts`) to backport fixes or features:

1.  **Retrieving PR Diffs**:
    *   To view the file changes of a specific Pull Request from the main repository, use the following URL format with the `read_url_content` tool:
        `https://patch-diff.githubusercontent.com/raw/roblox-ts/roblox-ts/pull/<PR_NUMBER>.diff`
    *   Example: `https://patch-diff.githubusercontent.com/raw/roblox-ts/roblox-ts/pull/2917.diff`
    *   This provides the raw diff which is easier to parse and apply than the HTML page of the PR.

2.  **Searching Issues/PRs**:
    *   Use the **Web Search** tool to find relevant issues and PRs.
    *   Queries like `"roblox-ts issue #<number>"` or `"roblox-ts PR #<number>"` often yield good results from GitHub or external forums.

3.  **Updating `DEVELOPMENT_PLAN.md`**:
    *   Keep `DEVELOPMENT_PLAN.md` updated with the status of investigations, merges, and new findings.

## Code Style & contribution
*   Follow the existing code style.
*   Ensure all new code is covered by tests where applicable.
*   When fixing bugs, try to verify the fix with a reproduction case in the `tests` directory.

## Git Workflow
*   **CRITICAL**: NEVER create git commits without explicit user request
*   Always ask the user before committing changes
*   Only commit when the user explicitly asks to commit
