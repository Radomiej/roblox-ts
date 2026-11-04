# Differential compiler testing with fast-check

The property suite generates structured, bounded JavaScript programs, compiles
those programs using the compiler's TypeScript source, executes the resulting
Luau with Rojo/Lune, and compares its ordered traces with Node's `vm` execution.
It does not use a replacement transpiler or mock the tested compiler operations.

```sh
source /workspace/.roblox-env/activate.sh
npm run test:property
FC_RUNS=100 FC_SEED=123456 npm run test:property
```

There are seven generated property families: short-circuit/nullish/optional
calls and conditionals; compound assignments with mutable reads and indexed
targets; indexed updates; destructuring/defaults/rest; computed object keys and
spreads; tuple-spread array macro arguments; and Map undefined keys/values.
Each family defaults to ten fast-check runs, with batches of one to eight
programs per run. A fixed seed makes the default corpus reproducible. Runs are
bounded to 100 per family. Normal `npm test` includes this suite.

On failure, fast-check reports a seed and a shrink path. Replay only that property:

```sh
FC_SEED=123456 FC_PATH='0:1:2' FC_RUNS=10 npm run test:property -- -t 'exact property name'
```

Shrinking operates on structured inputs, preserving valid syntax. Compiler
errors, runtime exceptions and output differences fail the property. They are
not filtered out or converted to skips. Oracle tests verify output type, order,
length and numeric edge values; Infinity and NaN spellings are decoded to numbers
and compared with Object.is, rather than mistaken for compiler defects.
Node execution has a 250 ms limit and Rojo/Lune subprocesses have 15 s limits.
Temporary projects are removed even on failure.

## Mutation sensitivity

```sh
npm run test:planner:mutation    # targeted TS runtime regressions
npm run test:property:mutation   # TS regressions plus a small generated JS corpus
```

The second configuration mutates plan.ts and includes seven fast-check
properties. It defaults to one deterministic batch per family per mutant to keep
runtime practical; increase FC_RUNS explicitly for a larger experiment. Shrinking is disabled only during mutation runs: the first counterexample
already kills the artificial mutant. Ordinary property runs still minimize real
failures. The broader default property search remains separate. Reports are written to
reports/mutation-property/. Surviving mutations are retained for investigation;
we do not exclude mutants to increase the score.

## Domain and known limitations

The generated programs are synchronous, use bounded integers and simple strings,
and avoid null, prototypes, platform-specific APIs, and sparse/undefined array
elements during iteration. Array iteration order is significant. Map enumeration
order is not asserted because the upstream representation is table-backed; Map
contents are compared per key or sorted, while source expression effects retain
strict ordering. Node receives no Array.size polyfill or Roblox macro shims.

During development this real compatibility gap was reproduced:

```js
for (const key of [undefined, "a", "b"]) {
  print(key === undefined ? "undefined" : key);
}
```

Node prints three entries including "undefined"; the current Luau representation
skips the nil entry. Source is saved as docs/repros/js-undefined-array.js. This is
an open array-representation limitation, not a harness defect or a fixed bug.
The Map generator uses three direct lookups so it can test Map keys independently.
Generating valid programs does not establish complete JavaScript compatibility.

## Verification snapshot

Full npm test passes: 1005 compiler tests, 238 snapshots, 933 runtime tests,
32 JS support tests, sourcemap runtime check, and 12 property/oracle tests.
The seven fast-check families each run ten seeded batches by default.
Full ESLint and strict property-test type checking pass. The property typings
use Node16 resolution because fast-check 4 exports its type declarations through
package export maps; the compiler itself still targets its existing module mode.

Final combined Stryker run: 64 killed, 37 surviving, zero uncovered/error/timeout
mutants (63.37%), compared with the earlier 57/101. No exclusions were added.
