export = () => {
	it("evaluates a computed compound assignment target once before its right side", () => {
		const box = { value: 5 };
		const events: Array<string> = [];
		function getBox() {
			events.push("base");
			return box;
		}
		function getKey(): "value" {
			events.push("key");
			return "value";
		}
		function rightSide() {
			events.push("rhs");
			return 3;
		}

		getBox()[getKey()] += rightSide();

		expect(box.value).to.equal(8);
		expect(events.join("|")).to.equal("base|key|rhs");
	});

	it("evaluates nested destructuring defaults from left to right", () => {
		const source: [number | undefined, [number, number | undefined]] = [undefined, [4, undefined]];
		const events: Array<string> = [];
		function firstDefault() {
			events.push("first");
			return 1;
		}
		function secondDefault() {
			events.push("second");
			return 3;
		}

		const [first = firstDefault(), [second, third = secondDefault()]] = source;

		expect(first + second + third).to.equal(8);
		expect(events.join("|")).to.equal("first|second");
	});

	it("evaluates destructuring assignment values before its computed targets", () => {
		const box = { left: 0, right: 0 };
		const events: Array<string> = [];
		function getValue(value: number) {
			events.push(`value${value}`);
			return value;
		}
		function getBox() {
			events.push("base");
			return box;
		}
		function getKey(key: "left" | "right") {
			events.push(key);
			return key;
		}

		[getBox()[getKey("left")], getBox()[getKey("right")]] = [getValue(1), getValue(2)];

		expect(box.left + box.right).to.equal(3);
		expect(events.join("|")).to.equal("value1|value2|base|left|base|right");
	});

	it("preserves the original values while swapping indexed array elements", () => {
		const values = [10, 20];

		[values[0], values[1]] = [values[1], values[0]];

		expect(values[0]).to.equal(20);
		expect(values[1]).to.equal(10);
	});

	it("does not evaluate optional call arguments when the receiver is undefined", () => {
		const events: Array<string> = [];
		const argument = () => {
			events.push("argument");
			return 2;
		};
		let receiver: { run: (value: number) => number } | undefined;

		const absent = receiver?.run(argument());
		receiver = { run: value => value * 2 };
		const present = receiver?.run(argument());

		expect(absent).to.equal(undefined);
		expect(present).to.equal(4);
		expect(events.join("|")).to.equal("argument");
	});

	it("evaluates logical assignment targets once and skips or runs the right side correctly", () => {
		const box = { value: 1 };
		let events: Array<string> = [];
		function getBox() {
			events.push("base");
			return box;
		}
		function getKey(): "value" {
			events.push("key");
			return "value";
		}
		function rightSide() {
			events.push("rhs");
			return 7;
		}

		getBox()[getKey()] ||= rightSide();
		expect(box.value).to.equal(1);
		expect(events.join("|")).to.equal("base|key");

		box.value = 0;
		events = [];
		getBox()[getKey()] ||= rightSide();
		expect(box.value).to.equal(7);
		expect(events.join("|")).to.equal("base|key|rhs");
	});

	it("nullish assignment preserves false and evaluates a missing value's right side once", () => {
		const box: { value: boolean | undefined } = { value: false };
		let calls = 0;
		function rightSide() {
			calls++;
			return true;
		}

		box.value ??= rightSide();
		expect(box.value).to.equal(false);
		expect(calls).to.equal(0);
		box.value = undefined;
		box.value ??= rightSide();
		expect(box.value).to.equal(true);
		expect(calls).to.equal(1);
	});

	it("evaluates a switch selector once and stops evaluating case expressions after a match", () => {
		const events: Array<string> = [];
		function selector() {
			events.push("selector");
			return 2;
		}
		function testCase(value: number) {
			events.push(`case${value}`);
			return value;
		}
		let result = 0;

		switch (selector()) {
			case testCase(1):
				result = 1;
				break;
			case testCase(2):
				result = 2;
				break;
			case testCase(3):
				result = 3;
				break;
		}

		expect(result).to.equal(2);
		expect(events.join("|")).to.equal("selector|case1|case2");
	});

	it("preserves left-to-right evaluation across call arguments and array spreads", () => {
		const events: Array<string> = [];
		function values(label: string, result: Array<number>) {
			events.push(label);
			return result;
		}
		function total(...items: Array<number>) {
			return items.reduce((sum, value) => sum + value, 0);
		}

		const argumentsInOrder = [...values("first", [1, 2]), ...values("second", [3])];
		const result = total(...argumentsInOrder);

		expect(result).to.equal(6);
		expect(events.join("|")).to.equal("first|second");
	});

	it("short-circuits nested logical expressions without running skipped side effects", () => {
		const events: Array<string> = [];
		function record(value: boolean) {
			events.push(value ? "true" : "false");
			return value;
		}

		const result = (false && record(true)) || (true && record(true));

		expect(result).to.equal(true);
		expect(events.join("|")).to.equal("true");
	});

	it("evaluates computed object keys and spread sources in source order", () => {
		const events: Array<string> = [];
		function key(name: "first" | "second"): "first" | "second" {
			events.push(`key:${name}`);
			return name;
		}
		function value(number: number) {
			events.push(`value:${number}`);
			return number;
		}
		function spread() {
			events.push("spread");
			return { second: 2 };
		}

		const result: Record<string, number> = { [key("first")]: value(1), ...spread(), [key("second")]: value(3) };

		expect(result.first + result.second).to.equal(4);
		expect(events.join("|")).to.equal("key:first|value:1|spread|key:second|value:3");
	});
};
