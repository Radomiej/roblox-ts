# Undefined array support: attempted and reverted

Status: no production fix retained. The user authorized a bounded attempt and
reversion if complete support required a larger architectural change.
Baseline: release/3.2.0-alechemy at 6714832f.

## Executed experiment

The differential probe executes real JavaScript in Node and emitted Luau through
Rojo/Lune. The original compiler passes two controls and fails six cases.
The candidate replaced native table iteration with an indexed while loop,
reading the element before incrementing the index and rechecking `#array` on
each iteration. It evaluated the array expression once and preserved growth
during iteration. The candidate built successfully, then passed four of eight
cases. It was reverted byte-for-byte and the normal compiler was rebuilt.

| Case | Original | Indexed-loop candidate |
| --- | --- | --- |
| Dense `[1, 2]` | Pass | Pass |
| Leading undefined | Fail | Pass |
| Interior undefined | Fail | Pass |
| Trailing undefined | Fail | Fail |
| All undefined | Fail | Fail |
| Assignment of undefined to the last element | Fail | Fail |
| `new Array(3)` empty slots | Fail | Fail |
| Append during iteration | Pass | Pass |

The original source code is restored. The probe remains opt-in and intentionally
reports these known failures; it is not part of the passing default test suite:

```sh
source /workspace/.roblox-env/activate.sh
npm run test:undefined-array:probe
```

This command should exit nonzero until the limitation is genuinely fixed.
It contains ordinary differential assertions, no expected-failure wrappers,
skips, or altered expected values. The initial minimized source is also in
`docs/repros/js-undefined-array.js`.

## Root cause and scope of a future fix

`transformArrayLiteralExpression` emits bare Luau tables. Undefined becomes nil,
which removes an entry; trailing undefined values and logical array length
cannot be recovered by scanning that table. Array for-of currently uses table
iteration. Array size, push/pop, spreads and several callback methods also rely
on raw table operations, `#`, or direct element access. Some mutable methods are
explicitly restricted to arrays of defined elements in compiler-types.

Sentinel boxing would require coordinated encoding/decoding in constructors,
index reads and writes, callbacks, spread/destructuring and mutable methods.
Explicit length/presence metadata would require updates along the same paths.
Neither is a loop-only change. Roblox APIs and external Luau exchange ordinary
tables, so an alternative representation also needs defined conversion rules at
those boundaries. Merely special-casing direct literals would leave the general
problem unresolved.

A future migration needs a general array representation, explicit logical length
and element presence, updated operations, and native-table interop tests. This
attempt does not establish one-to-one compatibility with the JavaScript standard
library. TypeScript itself has no runtime API; roblox-ts uses its own Roblox/Luau
library contracts, including `.size()` rather than standard JS `.length`.
