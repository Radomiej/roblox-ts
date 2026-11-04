# Follow-up with property testing

The complete npm test pipeline was rerun after adding fast-check and passed:
72 compiler suites / 1005 tests / 238 snapshots; 933 runtime tests; 32 JS tests;
sourcemap runtime check; and 3 property suites / 12 tests. Full compiler source
coverage in its configured scope is 97.28% lines and 93.08% branches. Full ESLint
passes. Final combined planner mutations: 64 killed, 37 survived, no uncovered,
error or timeout mutants (63.37%). See property-testing.md for reproduction.

The record below describes the earlier integration checkpoint, before that full
rerun, and is preserved as history.

# Verification of local 3.2.0-alechemy integration

Base: upstream 68648b0c633ef1016009aec7521b528f648ba656.
The integration remains local and unpublished.

## Passing checks

- npm run build.
- tests/compiler/compile.test.ts: 259/259, including expected diagnostics.
- Rojo/Lune runtime: 933/933, zero failures/skips. The final run refreshed
  alchemyMacros, complexResources and complexGenerators through a fresh source
  compiler program, then copied include modules, rebuilt the place and ran Lune.
- npm run test:js: 32/32; npm run lint:js and full npm run eslint pass.
- npm run test:sourcemap: real Lune test covers .lua fallback and exact priority.
- Focused mutation harness: 15/15; Stryker results are in mutation-testing.md.
- compiler-types npm run eslint passes.
- npm pack --dry-run succeeds; this does not publish anything.
- git diff --check; four repository patches pass git apply --check in fresh clones.

## Upstream suite and targeted reruns

The activated, escalated full unit run executed 71 suites / 746 tests:
738 passed and eight failed. The failures were intentional output changes
(Map sentinel/TS.yield snapshots), the new sourcemap CLI flag expectation, and
an output comparison racing an in-progress RuntimeLib edit. Those were resolved:

- CLI build: 13/13 passes after adding the new option to its expected list.
- Rest/macro evaluation: 71 tests passed during the reviewed snapshot update.
- Final stable rerun: 60 selected tests and 58 snapshots pass across rest,
  macro evaluation and both watch-recovery variants; 17 unrelated cases were
  skipped by that focused filter. The other four representative cases had
  already passed the previous run. No remaining watch/clean output divergence.

There was no additional whole-suite run after these targeted reruns. Early
sandboxed runs with EPERM or missing Rojo are environment failures, not passing
validation. Test type loading now excludes development node_modules from the
locally linked compiler-types checkout.

## Remaining limits

See todo.md for non-generator using cleanup on implicit exceptions, full
IteratorClose on implicit loop-body exceptions, SuppressedError chaining,
mutation planner survivors and the full patch-coverage requirement. These
results establish a tested integration base, not complete JavaScript semantics
or a claim that every changed line meets the Codecov threshold.
