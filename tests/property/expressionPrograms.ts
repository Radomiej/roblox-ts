import fc from "fast-check";

export type ShortCircuitCase = {
	andLeft: boolean;
	orLeft: boolean;
	rhs: number;
	nullish: "undefined" | number;
	callable: boolean;
	argument: number;
	increment: number;
	condition: boolean;
	thenValue: number;
	elseValue: number;
};

export type CompoundAssignmentCase = {
	initial: number;
	rhsValue: number;
	returnValue: number;
	firstElement: number;
	secondElement: number;
	index: 0 | 1;
	updatedIndex: 0 | 1;
	indexedRhs: number;
	indexedReplacement: number;
};

export type UpdateCase = {
	firstElement: number;
	secondElement: number;
	initialIndex: 0 | 1;
};

const smallInteger = fc.integer({ min: -5, max: 5 });
const smallIndex = fc.integer({ min: 0, max: 1 }) as fc.Arbitrary<0 | 1>;

export const shortCircuitCases: fc.Arbitrary<ShortCircuitCase> = fc.record({
	andLeft: fc.boolean(),
	orLeft: fc.boolean(),
	rhs: smallInteger,
	nullish: fc.oneof(fc.constant("undefined" as const), smallInteger),
	callable: fc.boolean(),
	argument: smallInteger,
	increment: smallInteger,
	condition: fc.boolean(),
	thenValue: smallInteger,
	elseValue: smallInteger,
});

export const compoundAssignmentCases: fc.Arbitrary<CompoundAssignmentCase> = fc.record({
	initial: smallInteger,
	rhsValue: smallInteger,
	returnValue: smallInteger,
	firstElement: smallInteger,
	secondElement: smallInteger,
	index: smallIndex,
	updatedIndex: smallIndex,
	indexedRhs: smallInteger,
	indexedReplacement: smallInteger,
});

export const updateCases: fc.Arbitrary<UpdateCase> = fc.record({
	firstElement: smallInteger,
	secondElement: smallInteger,
	initialIndex: smallIndex,
});

export function renderShortCircuitProgram(testCase: ShortCircuitCase): string {
	const nullish = typeof testCase.nullish === "number" ? `${testCase.nullish}` : testCase.nullish;

	return [
		"/** @type {string[]} */",
		"const trace = [];",
		"/** @param {string} label @param {number} value @returns {number} */",
		"function mark(label, value) { trace.push(label); return value; }",
		"/** @returns {number | undefined} */",
		`function getNullishValue() { return ${nullish}; }`,
		`const andValue = ${testCase.andLeft} && mark("and", ${testCase.rhs});`,
		`const orValue = ${testCase.orLeft} || mark("or", ${testCase.rhs});`,
		`const nullishValue = getNullishValue() ?? mark("coalesce", ${testCase.rhs});`,
		"/** @type {((value: number) => number) | undefined} */",
		`let optionalFunction = ${testCase.callable} ? value => { trace.push("call"); return value + ${testCase.increment}; } : undefined;`,
		`const callValue = optionalFunction?.(mark("argument", ${testCase.argument}));`,
		`const conditionalValue = ${testCase.condition} ? mark("then", ${testCase.thenValue}) : mark("else", ${testCase.elseValue});`,
		'print(trace.join("|"));',
		"print(andValue ? 1 : 0);",
		"print(orValue ? 1 : 0);",
		"print(nullishValue);",
		"print(callValue ?? -1);",
		"print(conditionalValue);",
	].join("\n");
}

export function renderCompoundAssignmentProgram(testCase: CompoundAssignmentCase): string {
	return [
		"/** @type {string[]} */",
		"const trace = [];",
		"let current = " + testCase.initial + ";",
		"/** @returns {number} */",
		`function currentRhs() { trace.push("current-rhs"); current = ${testCase.rhsValue}; return ${testCase.returnValue}; }`,
		"/** @type {number[]} */",
		`const values = [${testCase.firstElement}, ${testCase.secondElement}];`,
		`let selectedIndex = ${testCase.index};`,
		"/** @returns {number} */",
		`function targetIndex() { trace.push("index"); return selectedIndex; }`,
		"/** @returns {number} */",
		`function indexedRhs() { trace.push("indexed-rhs"); selectedIndex = ${testCase.updatedIndex}; values[selectedIndex] = ${testCase.indexedReplacement}; return ${testCase.indexedRhs}; }`,
		"current += currentRhs();",
		"values[targetIndex()] += indexedRhs();",
		'print(trace.join("|"));',
		"print(current);",
		"print(values[0]);",
		"print(values[1]);",
		"print(selectedIndex);",
	].join("\n");
}

export function renderUpdateProgram(testCase: UpdateCase): string {
	return [
		"/** @type {string[]} */",
		"const trace = [];",
		"/** @type {number[]} */",
		`const values = [${testCase.firstElement}, ${testCase.secondElement}];`,
		`let index = ${testCase.initialIndex};`,
		"/** @returns {number} */",
		'function nextIndex() { trace.push("index"); const target = index; index = (index + 1) % 2; return target; }',
		"const postResult = values[nextIndex()]++;",
		"const preResult = ++values[nextIndex()];",
		'print(trace.join("|"));',
		"print(postResult);",
		"print(preResult);",
		"print(values[0]);",
		"print(values[1]);",
		"print(index);",
	].join("\n");
}
