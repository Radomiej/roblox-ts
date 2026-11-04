# Final combined result

The final reports/mutation-property/mutation.json run uses both the TS fixture
and seven generated JS properties: **64 killed, 37 survived, 0 uncovered** out of
101 (63.37%), zero timeout/error results. Literal type-selection mutants 4, 5
and 6 are now killed. The table below is a historical review of candidate mutations, including
ones subsequently killed. The final surviving-ID list above/below is authoritative.

Final surviving IDs: 7, 8, 20, 21, 30, 31, 32, 39, 41, 42, 44, 45, 46,
48, 49, 53, 60, 63–70, 72, 73, 74, 81, 85, 90, 93–97, 99.
Runtime-equivalent cases with the evidence below: naming IDs 7, 90, 93–95;
construction guard IDs 97, 99. The remaining thirty require more investigation.
Equivalent runtime behavior does not imply identical emitted-source spelling.

# Evaluation planner survivor review

The updated `reports/mutation-prereqs/mutation.json` reports 61 killed, 40
surviving, and 0 uncovered mutants for `plan.ts` (60.40% score). The added
negative-index case killed mutant 59 and brought the two prior no-coverage
mutants, 87 and 88 at `plan.ts:84-85`, under coverage; both are now killed. The
other cases are source-level probes for literal visibility, optional arguments,
interleaved argument effects, and repeated callback use. A surviving mutation is
not called equivalent unless the construction invariant makes the replacement
observationally irrelevant.

| Mutants | Location and changed decision | Assessment |
| --- | --- | --- |
| 4, 5, 6 | `plan.ts:32-34`, whether simple primitives and `none` stay visible to macro expansion | Behaviorally distinguishable: `typeIs` uses a literal type name to select `type` for primitive Luau types. The fixture checks `typeIs(new Vector2(1, 2), "userdata")`; `typeof` returns `Vector2`, so losing the literal should fail the assertion. |
| 7, 8 | `plan.ts:35-36`, temporary name and copying value facts onto the opaque reference | Name change is equivalent for runtime behavior because temporary spelling carries no value. Removing `copyValueFacts` is not classified equivalent: facts can affect later macro lowering and effect summaries, and the baseline report alone does not show a distinguishing case. |
| 20, 21 | `plan.ts:50`, initial capture state | Potentially behavior-changing: forcing captures can move an argument before an optional guard. The fixture now checks an optional `Vector2.add` call with an effectful argument for absent and present receivers. |
| 30-32 | `plan.ts:57-58`, the no-use last-position sentinel and conditional-use detection | Potentially behavior-changing when an operand is unused or has multiple uses with mixed conditionality. The baseline suite does not establish equivalence; retain as unresolved pending the updated mutation run. |
| 39, 41-48 | `plan.ts:61`, excluding operand-use events and already-hoisted captures from intervening effects | Potentially behavior-changing for interactions among multiple operands, event ordering, and later captures. These are not equivalent by inspection; the exact runtime predicate depends on macro expansions and effects. |
| 49, 53 | `plan.ts:64`, whether events before the last use contribute effects | Potentially behavior-changing when an earlier-emitted event conflicts with the operand and a later event does not. No equivalence claim. |
| 57, 60, 63-70 | `plan.ts:69-72`, zero-use, repeat, and commute capture rules | Potentially behavior-changing. `getDiscardedString()[-1]` exercises zero-use preservation: the literal negative index expands to `nil`, but its effectful string base still runs once. Mutant 59 and the two former no-coverage mutants 87 and 88 are now killed. The remaining predicate replacements need further distinguishing inputs. |
| 72-74 | `plan.ts:73-76`, adding captured operand and prerequisite effects to the hoisted summary | Potentially behavior-changing for earlier operands whose values can be changed or whose evaluation can be blocked by later prerequisite work. No equivalence claim. |
| 81, 85 | `plan.ts:83-85`, whether to emit a capture and whether an unused capture is an expression statement | Potentially behavior-changing. The negative-index test covers the unused effectful operand path; only the updated mutation run can confirm which replacement it kills. |
| 90, 93-95 | `plan.ts:87`, generated temporary-name selection | Equivalent for runtime behavior: these replacements change only the names passed to `pushToVar`; they do not change the expression, order, or number of evaluations. They may change emitted Luau spelling. |
| 96 | `plan.ts:89`, copying value facts to the captured temporary | Not classified equivalent. It can preserve immutable facts for subsequent transforms; the report gives no counterexample or proof of irrelevance. Add a case that demonstrates this if a public source construct exposes the lost fact. |
| 97, 99 | `plan.ts:94`, deciding whether a temporary reference gets a substitution | Equivalent under the construction immediately above at `plan.ts:30-38`: a non-primitive operand is replaced by a fresh temporary and inserted into `slots`, while primitive/`none` references are not temporaries and have no slot ID. Thus `isTemporaryIdentifier(reference)` implies `slots.has(reference.id)`, and a non-temporary cannot satisfy the map lookup. The `&&` and `||` forms agree for every reference this function constructs. |

The fixture cases are source-level runtime checks through the public compiler
path; they do not construct planner ASTs or assume planner internals. The build
and focused fixture pass with the corrected `userdata` assertion. The survivor
count above is from before the latest cases; rerun Stryker to refresh it. Run
`npm run test:ts:regression -- --testNamePattern='preserves complex expression evaluation order'`
for the focused fixture. Re-run Stryker after the shared harness and production
changes are stable, then update this review from that report rather than treating
the original survivor count as current.
