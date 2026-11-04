function assertEqual(actual: unknown, expected: unknown, description: string) {
	if (actual !== expected) {
		error(`${description}: expected ${tostring(expected)}, got ${tostring(actual)}`);
	}
}

const argumentEvents: Array<string> = [];
let state = 1;
function readState() {
	argumentEvents.push("read");
	return state;
}
function mutateState() {
	argumentEvents.push("mutate");
	state = 2;
	return 0;
}
function firstArgument(value: number, _ignored: number) {
	return value;
}
assertEqual(firstArgument(readState(), mutateState()), 1, "call argument read before later mutation");
assertEqual(argumentEvents.join("|"), "read|mutate", "call argument evaluation order");

let macroRead = 0;
function mutateMacroRead() {
	macroRead = 5;
	return 1;
}
const macroTail = [10, 20];
const macroArguments = new Array<number>();
macroArguments.push(macroRead, mutateMacroRead(), macroTail.pop()!);
assertEqual(macroArguments[0], 0, "macro receiver reads prior binding before later mutation");
assertEqual(macroArguments[1], 1, "macro receives mutating argument");
assertEqual(macroArguments[2], 20, "macro evaluates later argument once");
assertEqual(macroRead, 5, "macro mutation updates outer binding");

const repeatedMacroArray = [10, 20];
repeatedMacroArray.push(repeatedMacroArray[repeatedMacroArray.size() - 1], repeatedMacroArray[repeatedMacroArray.size() - 1]);
assertEqual(repeatedMacroArray[2], 20, "macro arguments keep the original array values");
assertEqual(repeatedMacroArray[3], 20, "macro reads repeated array argument before insertion");

let vector = new Vector2(1, 2);
function replaceVector() {
	vector = new Vector2(0, 0);
	return new Vector2(10, 20);
}
const vectorSum = vector.add(replaceVector());
assertEqual(vectorSum.X, 11, "math macro reads receiver before later argument mutation");
assertEqual(vectorSum.Y, 22, "math macro preserves receiver components");

const stringValue = "abcd";
let stringIndexCalls = 0;
function getStringIndex() {
	stringIndexCalls++;
	return 2;
}
assertEqual(stringValue[getStringIndex()], "c", "dynamic string indexing");
assertEqual(stringIndexCalls, 1, "dynamic string index evaluates once");

const optionalEvents: Array<string> = [];
let optionalReceiver: { run: (value: number) => number } | undefined;
function optionalArgument() {
	optionalEvents.push("argument");
	return 4;
}
assertEqual(optionalReceiver?.run(optionalArgument()), undefined, "absent optional call result");
assertEqual(optionalEvents.size(), 0, "absent optional call skips arguments");
optionalReceiver = { run: value => value + 1 };
assertEqual(optionalReceiver?.run(optionalArgument()), 5, "present optional call result");
assertEqual(optionalEvents.size(), 1, "present optional call evaluates arguments");

let nullishValue: number | undefined = 8;
let nullishCalls = 0;
function nullishRightHandSide() {
	nullishCalls++;
	return 9;
}
nullishValue ??= nullishRightHandSide();
assertEqual(nullishValue, 8, "nullish assignment preserves present value");
assertEqual(nullishCalls, 0, "nullish assignment skips present rhs");
nullishValue = undefined;
nullishValue ??= nullishRightHandSide();
assertEqual(nullishValue, 9, "nullish assignment sets missing value");
assertEqual(nullishCalls, 1, "nullish assignment evaluates missing rhs once");

const indexedBox = { value: 5 };
const targetEvents: Array<string> = [];
function getIndexedBox() {
	targetEvents.push("base");
	return indexedBox;
}
function getIndexedKey(): "value" {
	targetEvents.push("key");
	return "value";
}
function indexedRightHandSide() {
	targetEvents.push("rhs");
	return 3;
}
getIndexedBox()[getIndexedKey()] += indexedRightHandSide();
assertEqual(indexedBox.value, 8, "compound indexed assignment result");
assertEqual(targetEvents.join("|"), "base|key|rhs", "compound indexed target evaluated once");

const destructured: { first: number; second: number } = { first: 0, second: 0 };
const destructuringEvents: Array<string> = [];
function getDestructureValue(value: number) {
	destructuringEvents.push(`value${value}`);
	return value;
}
function getDestructureTarget() {
	destructuringEvents.push("target");
	return destructured;
}
([getDestructureTarget().first, getDestructureTarget().second] = [
	getDestructureValue(1),
	getDestructureValue(2),
]);
assertEqual(destructured.first + destructured.second, 3, "destructuring assignment values");
assertEqual(
	destructuringEvents.join("|"),
	"value1|value2|target|target",
	"destructuring evaluates rhs before computed targets",
);

const defaultEvents: Array<string> = [];
function firstDefault() {
	defaultEvents.push("first");
	return 1;
}
function secondDefault() {
	defaultEvents.push("second");
	return 3;
}
const [first = firstDefault(), [second, third = secondDefault()]]: [
	number | undefined,
	[number, number | undefined],
] = [undefined, [4, undefined]];
assertEqual(first + second + third, 8, "nested destructuring defaults");
assertEqual(defaultEvents.join("|"), "first|second", "destructuring defaults run in order");

const logicalBox = { value: 0 };
let logicalCalls = 0;
function logicalRightHandSide() {
	logicalCalls++;
	return 7;
}
logicalBox.value ||= logicalRightHandSide();
assertEqual(logicalBox.value, 7, "logical assignment updates a falsey value");
assertEqual(logicalCalls, 1, "logical assignment evaluates a required rhs once");
logicalBox.value ||= logicalRightHandSide();
assertEqual(logicalCalls, 1, "logical assignment skips an unnecessary rhs");

const switchEvents: Array<string> = [];
function switchSelector() {
	switchEvents.push("selector");
	return 2;
}
function switchCase(value: number) {
	switchEvents.push(`case${value}`);
	return value;
}
let switchResult = 0;
switch (switchSelector()) {
	case switchCase(1):
		switchResult = 1;
		break;
	case switchCase(2):
		switchResult = 2;
		break;
	case switchCase(3):
		switchResult = 3;
		break;
}
assertEqual(switchResult, 2, "switch selects the matching case");
assertEqual(switchEvents.join("|"), "selector|case1|case2", "switch selector and cases are lazy");

const shortCircuitEvents: Array<string> = [];
function logicalCall(label: string, value: boolean) {
	shortCircuitEvents.push(label);
	return value;
}
const shortCircuitResult =
	(false && logicalCall("skipped-first", true)) || (true && logicalCall("selected", true));
assertEqual(shortCircuitResult, true, "short circuit result");
assertEqual(shortCircuitEvents.join("|"), "selected", "short circuit skips unreachable operands");

const objectEvents: Array<string> = [];
function objectKey(name: "first" | "second"): "first" | "second" {
	objectEvents.push(`key:${name}`);
	return name;
}
function objectValue(value: number) {
	objectEvents.push(`value:${value}`);
	return value;
}
function objectSpread() {
	objectEvents.push("spread");
	return { second: 2 };
}
const objectResult: Record<string, number> = {
	[objectKey("first")]: objectValue(1),
	...objectSpread(),
	[objectKey("second")]: objectValue(3),
};
assertEqual(objectResult.first + objectResult.second, 4, "object literal values");
assertEqual(
	objectEvents.join("|"),
	"key:first|value:1|spread|key:second|value:3",
	"computed keys and spread values keep source order",
);

const conditionalEvents: Array<string> = [];
function conditionalValue(label: string, value: number) {
	conditionalEvents.push(label);
	return value;
}
const conditionalResult = true
	? conditionalValue("chosen", 1)
	: conditionalValue("skipped", 2);
assertEqual(conditionalResult, 1, "conditional expression chosen value");
assertEqual(conditionalEvents.join("|"), "chosen", "conditional expression evaluates one branch");
