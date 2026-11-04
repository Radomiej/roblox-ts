# Mutation testing

Run from the repository root after installing the locked dependencies:

```sh
source /workspace/.roblox-env/activate.sh
npm run test:mutation          # JavaScript path adapter
npm run test:ts:mutation       # TypeScript yield and project metadata
npx stryker run stryker.prereqs.config.mjs  # evaluation planner
```

StrykerJS and its Jest runner are pinned to 10.1.1 in package-lock.json.
The TypeScript harness imports compiler source, compiles fixtures, and executes
the generated Luau through Rojo/Lune. See tests/ts-mutation/README.md for its
scenarios and survivor analysis. Tool paths and external type definitions are
passed explicitly so sandboxed mutants still compile against the intended types.

## Current integration results

- JavaScript adapter: **81/81 killed**, no survivors, missing coverage, errors or
  timeouts. Target: src/Project/functions/createPathTranslator.ts. The 28 focused
  tests use jest.mutation.config.ts; the separate JS suite passes 32 tests.
  Reports: reports/mutation/mutation.json and mutation.html.
- TypeScript yield/project metadata: **74 killed, 6 survived, 1 no coverage**
  of 81, no timeouts or errors. Reports: reports/mutation-ts/. Surviving yield
  mutations rename temporaries; the metadata fallback mutation has no coverage.
- Evaluation planner after additional TS regressions: **61 killed, 40 survived,
  0 no coverage** of 101. Reports: reports/mutation-prereqs/.
- Final planner run including the generated JS corpus: **64 killed, 37 survived,
  0 no coverage** of 101 (63.37%), no errors/timeouts. Reports:
  reports/mutation-property/. This improves the earlier 57/101 baseline.
  Seven survivors have runtime-equivalence evidence (temporary naming and a
  construction-invariant guard); the other thirty remain unresolved. See
  planner-survivors.md and property-testing.md. No mutants were excluded.

The planner runtime fixture already exposed duplicated evaluation of a computed
compound-assignment target. A source regression and a runtime assertion now
protect the fix in transformWritable.ts.

These measurements apply only to the named files and fixtures. Coverage and
mutation sensitivity do not establish correctness of the complete compiler.
The earlier 85/85 JavaScript result belonged to the previous 3.1.0 base; the
current adapter delegates declaration handling to upstream and has 81 mutants.

Full repository `npm run eslint` now passes on the upstream-based integration.

Full compiler-suite coverage in the completed npm test run is 97.28% lines,
93.08% branches for the configured source scope. This is distinct from mutation score.
