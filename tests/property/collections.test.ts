import fc from "fast-check";

import { assertEquivalentPrograms } from "./compilerHarness";

const seed = process.env.FC_SEED === undefined ? 0x5eedc011 : Number.parseInt(process.env.FC_SEED, 10);
const configuredRuns = process.env.FC_RUNS === undefined ? 10 : Number.parseInt(process.env.FC_RUNS, 10);
const numRuns = Math.min(100, Math.max(1, configuredRuns));
const path = process.env.FC_PATH;

const propertyOptions = { seed, path, numRuns, endOnFailure: process.env.FC_MUTATION_MODE === "1" };

function runCollectionProperty<T>(arb: fc.Arbitrary<T>, render: (value: T) => string) {
	fc.assert(
		fc.property(fc.array(arb, { minLength: 1, maxLength: 8 }), cases => {
			assertEquivalentPrograms(cases.map(render));
		}),
		propertyOptions,
	);
}

const scalar = fc.integer({ min: -3, max: 3 });

describe("differential collection programs", () => {
	it("preserves array and object destructuring defaults, rest, and assignment effects", () => {
		const input = fc.record({
			first: fc.option(scalar, { nil: undefined }),
			second: scalar,
			third: scalar,
			fallback: scalar,
			property: fc.option(scalar, { nil: undefined }),
			other: scalar,
		});

		runCollectionProperty(
			input,
			values => `
/** @template T @param {string} label @param {T} value @returns {T} */
function mark(label, value) { print(label); return value; }

/** @type {(number | undefined)[]} */
const source = [${values.first === undefined ? "undefined" : values.first}, ${values.second}, ${values.third}];
let first = -99;
/** @type {(number | undefined)[]} */
let rest = [];
[first = mark("array-default", ${values.fallback}), ...rest] = source;
print("array|" + first + "|" + (rest[0] === undefined ? "undefined" : rest[0]) + "|" + (rest[1] === undefined ? "undefined" : rest[1]));

/** @type {{ selected: number | undefined, other: number, extra: number }} */
const object = { selected: ${values.property === undefined ? "undefined" : values.property}, other: ${values.other}, extra: ${values.third} };
let selected = -99;
/** @type {{ other?: number, extra?: number }} */
let objectRest = {};
({ selected = mark("object-default", ${values.fallback}), ...objectRest } = object);
print("object|" + selected + "|" + objectRest.other + "|" + objectRest.extra);
`,
		);
	});

	it("evaluates computed object keys, values, and spreads in source order", () => {
		const objectParts = fc.record({
			base: scalar,
			computedKey: fc.constantFrom("base", "computed", "tail"),
			computedValue: scalar,
			tail: scalar,
			final: scalar,
		});

		runCollectionProperty(
			objectParts,
			values => `
/** @template T @param {string} label @param {T} value @returns {T} */
function mark(label, value) { print(label); return value; }

/** @type {{ base: number, computed: number }} */
const base = { base: ${values.base}, computed: 2 };
/** @type {{ tail: number, computed: number }} */
const tail = { tail: ${values.tail}, computed: 3 };
/** @type {string} */
const computedKey = ${JSON.stringify(values.computedKey)};
const result = {
  ...mark("spread-base", base),
  [mark("computed-key", computedKey)]: mark("computed-value", ${values.computedValue}),
  ...mark("spread-tail", tail),
  final: mark("final-value", ${values.final}),
};
print("fields|" + result.base + "|" + result.computed + "|" + result.tail + "|" + result.final);
`,
		);
	});

	it("evaluates tuple spread arguments to an array macro once and in order", () => {
		const arguments_ = fc.record({
			values: fc.array(scalar, { minLength: 1, maxLength: 4 }),
			initialValue: scalar,
		});

		runCollectionProperty(
			arguments_,
			values => `
/** @type {number[]} */
const array = [${values.values.join(", ")}];
/** @type {[number]} */
const initial = [${values.initialValue}];
/** @returns {(accumulator: number, value: number) => number} */
function getCallback() { print("callback-operand"); return (accumulator, value) => accumulator + value; }
/** @returns {[number]} */
function getInitial() { print("initial-spread"); return initial; }
const result = array.reduce(getCallback(), ...getInitial());
print("sum|" + result);
`,
		);
	});

	it("preserves undefined Map keys and values across generated mutations", () => {
		const key = fc.constantFrom(undefined, "a", "b");
		const value = fc.option(scalar, { nil: undefined });
		const operation = fc.oneof(
			fc.record({ kind: fc.constant("set"), key, value }),
			fc.record({ kind: fc.constant("delete"), key }),
		);
		const operations = fc.array(operation, { minLength: 0, maxLength: 8 });

		runCollectionProperty(operations, changes => {
			const statements = changes.map(change =>
				change.kind === "set"
					? `map.set(${JSON.stringify(change.key)}, ${change.value === undefined ? "undefined" : change.value});`
					: `map.delete(${JSON.stringify(change.key)});`,
			);

			return `
/** @type {Map<string | undefined, number | undefined>} */
const map = new Map();
${statements.join("\n")}
let count = 0;
map.forEach(() => { count++; });
print("size|" + count);
/** @param {string | undefined} key @param {string} label */
function reportLookup(key, label) {
  const current = map.get(key);
  print("lookup|" + label + "|" + (map.has(key) ? "true" : "false") + "|" + (current === undefined ? "undefined" : current));
}
reportLookup(undefined, "undefined");
reportLookup("a", "a");
reportLookup("b", "b");
/** @type {string[]} */
const entries = [];
map.forEach((value, key) => {
  entries.push((key === undefined ? "undefined" : key) + ":" + (value === undefined ? "undefined" : value));
});
entries.sort();
for (const entry of entries) { print("entry|" + entry); }
`;
		});
	});
});
