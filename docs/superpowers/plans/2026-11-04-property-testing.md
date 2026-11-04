# Differential property testing and planner mutation coverage

User requested Luna agents to expand hidden-case coverage and introduce fast-check.

- [x] Dispatch separate agents for harness, expression generators, collections and planner survivor analysis.
- [x] Add deterministic fast-check tests using structured valid JS program generation and shrinking.
- [x] Compile JavaScript with the source compiler and compare Node versus real Luau output, with bounded runtimes and reproducible seeds.
- [x] Expand TS planner regressions for concrete surviving mutations, without excluding mutants or skipping counterexamples.
- [x] Record the minimized sparse-array counterexample as an open representation limitation; keep this test extension free of an unverified production rewrite.
- [x] Run focused tests, final npm test + lint, and planner Stryker; report unresolved survivors honestly.

Generated domains intentionally avoid unsupported semantics such as observable Map iteration order,
JavaScript prototypes and unbounded numeric operations. Failures are never silently skipped.
No production rewrite is planned unless a failing source-level case demonstrates a bug.
Root owns dependency/configuration/CI integration; agents edit disjoint test modules.
No production fix was applied: the sparse-array gap remains a documented open limitation.
