function assertEqual(actual: unknown, expected: unknown, description: string) {
	if (actual !== expected) {
		error(`${description}: expected ${tostring(expected)}, got ${tostring(actual)}`);
	}
}

function* noValue(): Generator<undefined, number, number> {
	return yield;
}

function* values(): Generator<number, number, unknown> {
	yield 11;
	yield 22;
	return 33;
}

function* delegated(): Generator<number, void, unknown> {
	const completion = yield* values();
	yield completion;
}

function* delegatedAsStatement(): Generator<number, void, unknown> {
	yield* values();
}

function* inputSource(): Generator<number, number, number> {
	const response = yield 1;
	return response;
}

function* forwarding(): Generator<number, number, number> {
	return yield* inputSource();
}

function* mutableNextSource(): Generator<number, number, number> {
	yield 1;
	return 2;
}

const empty = noValue();
assertEqual(empty.next().value, undefined, "bare yield value");
const resumed = empty.next(41);
assertEqual(resumed.done, true, "bare yield completion");
assertEqual(resumed.value, 41, "bare yield input");

const sequence = delegated();
assertEqual(sequence.next().value, 11, "delegated first value");
assertEqual(sequence.next().value, 22, "delegated second value");
assertEqual(sequence.next().value, 33, "delegated completion value");
assertEqual(sequence.next().done, true, "delegated final state");

const ignoredCompletion = delegatedAsStatement();
assertEqual(ignoredCompletion.next().value, 11, "yield* statement first value");
assertEqual(ignoredCompletion.next().value, 22, "yield* statement second value");
assertEqual(ignoredCompletion.next().done, true, "yield* statement completion");

const forwardedInput = forwarding();
assertEqual(forwardedInput.next().value, 1, "delegated input first value");
const forwardedCompletion = forwardedInput.next(42);
assertEqual(forwardedCompletion.done, true, "delegated input completion");
assertEqual(forwardedCompletion.value, 42, "delegated input forwarding");

const capturedNextSource = mutableNextSource();
function* capturesNext(): Generator<number, number, number> {
	return yield* capturedNextSource;
}
const capturedNext = capturesNext();
assertEqual(capturedNext.next().value, 1, "captured next first value");
capturedNextSource.next = (() => ({ done: true, value: 99 })) as typeof capturedNextSource.next;
const capturedCompletion = capturedNext.next();
assertEqual(capturedCompletion.done, true, "captured next completion");
assertEqual(capturedCompletion.value, 2, "retains delegated next function");

let completionValueReads = 0;
const trackedIterator = mutableNextSource();
trackedIterator.next = (() =>
	setmetatable(
		{ done: true },
		{
			__index: (_target: { done: boolean }, key: unknown) => {
				if (key === "value") {
					completionValueReads++;
					return 123;
				}
			},
		},
	) as unknown as IteratorResult<number, number>) as typeof trackedIterator.next;
function* ignoresTrackedCompletion(): Generator<number, number, number> {
	yield* trackedIterator;
	return 7;
}
const ignoredTracked = ignoresTrackedCompletion().next();
assertEqual(ignoredTracked.done, true, "tracked discarded completion state");
assertEqual(ignoredTracked.value, 7, "tracked discarded completion value");
assertEqual(completionValueReads, 0, "unused delegation avoids completion value read");

const delegatedCloseEvents: Array<string> = [];
function* closeSource(): Generator<number, void, undefined> {
	try {
		yield 1;
		yield 2;
	} finally {
		delegatedCloseEvents.push("inner");
	}
}
function* closeDelegate(): Generator<number, void, undefined> {
	try {
		yield* closeSource();
	} finally {
		delegatedCloseEvents.push("outer");
	}
}
for (const value of closeDelegate()) {
	assertEqual(value, 1, "delegated close first yield");
	break;
}
assertEqual(delegatedCloseEvents.size(), 2, "delegated close runs both finally blocks");
assertEqual(delegatedCloseEvents[0], "inner", "delegated close closes the inner iterator first");
assertEqual(delegatedCloseEvents[1], "outer", "delegated close then exits the outer iterator");

interface CloseableGenerator extends Generator<number, number, number> {
	return(value?: number): IteratorResult<number, number>;
}
const explicitCloseEvents: Array<string> = [];
function* explicitCloseSource(): Generator<number, number, number> {
	try {
		yield 1;
		yield 2;
	} finally {
		explicitCloseEvents.push("inner");
	}
	return 3;
}
function* explicitCloseDelegate(): Generator<number, number, number> {
	try {
		return yield* explicitCloseSource();
	} finally {
		explicitCloseEvents.push("outer");
	}
}
const explicitCloser = explicitCloseDelegate() as CloseableGenerator;
assertEqual(explicitCloser.next().value, 1, "explicit delegated close first yield");
const explicitCloseResult = explicitCloser.return(42);
assertEqual(explicitCloseResult.done, true, "explicit delegated return closes outer generator");
assertEqual(explicitCloseResult.value, 42, "explicit delegated return preserves the return value");
assertEqual(explicitCloseEvents.size(), 2, "explicit close runs both finally blocks");
assertEqual(explicitCloseEvents[0], "inner", "explicit close closes the inner iterator first");
assertEqual(explicitCloseEvents[1], "outer", "explicit close then exits the outer iterator");

interface ReceiverCloseIterator extends Generator<number, void, undefined> {
	closed: boolean;
	return(this: ReceiverCloseIterator): IteratorResult<number, void>;
}
let closeMethodRetainedReceiver = false;
let receiverCloseIterator: ReceiverCloseIterator;
receiverCloseIterator = {
	closed: false,
	next: () => ({ done: false, value: 1 }),
	return(this: ReceiverCloseIterator) {
		closeMethodRetainedReceiver = this === receiverCloseIterator;
		this.closed = true;
		return { done: true, value: undefined };
	},
	[Symbol.iterator]() {
		return this;
	},
};
function* delegateReceiverClose(): Generator<number, void, undefined> {
	yield* receiverCloseIterator;
}
const receiverCloser = delegateReceiverClose() as ReceiverCloseIterator;
assertEqual(receiverCloser.next().value, 1, "receiver close first yield");
receiverCloser.return();
assertEqual(closeMethodRetainedReceiver, true, "delegated return method receives its iterator");
assertEqual(receiverCloseIterator.closed, true, "delegated return method updates its iterator");
