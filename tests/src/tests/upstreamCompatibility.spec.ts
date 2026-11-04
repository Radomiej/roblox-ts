// Selected runtime regression cases from upstream/master at 68648b0c.
export = () => {
	it("should evaluate each case expression once", () => {
		let evaluations = 0;
		function getCase(value: number) {
			evaluations++;
			return value;
		}

		switch (3) {
			case getCase(1):
			case getCase(2):
			case getCase(3):
				break;
			case getCase(4):
				break;
		}

		expect(evaluations).to.equal(3);
	});

	it("should evaluate the switch expression only once", () => {
		let a = 1;
		let matchedAfterMutation = false;

		function increaseA() {
			a++;
			return 0;
		}

		switch (a) {
			case increaseA():
				break;
			case 2:
				matchedAfterMutation = true;
				break;
		}

		expect(matchedAfterMutation).to.equal(false);
	});

	it("should evaluate conditional case values against the original discriminant", () => {
		let mutable = 1;
		function classify(input: number) {
			switch (input) {
				case true ? 0 : 1:
					return "zero";
				case true ? mutable : 0:
					return "first";
				case false ? 0 : mutable + 1:
					return "second";
				// prettier-ignore
				case (mutable + 2):
					mutable = 10;
					return "third";
				default:
					return "missing";
			}
		}

		expect(classify(0)).to.equal("zero");
		expect(classify(1)).to.equal("first");
		expect(classify(2)).to.equal("second");
		expect(classify(3)).to.equal("third");
		expect(mutable).to.equal(10);
	});

	it("should supply an undefined receiver to direct receiver calls", () => {
		function callback(this: defined | void, value: number) {
			expect(this).to.equal(undefined);
			return value + 1;
		}

		expect(callback(41)).to.equal(42);
		const optional: typeof callback | undefined = (() => callback)();
		expect(optional?.(41)).to.equal(42);

		const adapted: (this: void, value: number) => number = value => callback(value);
		expect(adapted(41)).to.equal(42);
	});

	it("should apply optimized assignment defaults after evaluating the tuple", () => {
		const values = [1, 2, 3];
		const target = { value: 0 };
		const array = [0];
		let nested = 0;
		let property = 0;
		function read(): LuaTuple<[number?, Array<number>?, { value: number }?]> {
			return $tuple(undefined, undefined, undefined);
		}

		[target.value = values.pop()!, [nested] = [values.pop()!], { value: property } = { value: values.pop()! }] =
			read();
		expect(target.value).to.equal(3);
		expect(nested).to.equal(2);
		expect(property).to.equal(1);
		expect(values.size()).to.equal(0);

		[array[0] = 10] = [undefined];
		expect(array[0]).to.equal(10);
	});

	it("should preserve single-value iterator and anonymous tuple iterator prerequisites", () => {
		let calls = 0;
		const iterator = (() => {
			calls += 1;
			return calls <= 2 ? calls : undefined;
		}) as IterableFunction<number>;
		const seen = new Array<number>();
		for (const value of iterator) {
			seen.push(value);
		}
		expect(seen.join(",")).to.equal("1,2");
		expect(calls).to.equal(3);

		let tupleCalls = 0;
		for (const tuple of ((): LuaTuple<Array<number>> => {
			tupleCalls += 1;
			if (tupleCalls === 1) {
				return $tuple(4, 5);
			}
			return $tuple();
		}) as IterableFunction<LuaTuple<Array<number>>>) {
			expect(tuple.join(",")).to.equal("4,5");
		}
		expect(tupleCalls).to.equal(2);
	});

	it("should evaluate tuple return and throw prerequisites before finally", () => {
		const values = [1, 2, 3, 4];
		const failure = { message: "failed" };
		const failures = [failure];
		const remaining = new Array<number>();
		function read(enabled: boolean) {
			try {
				if (enabled) {
					return $tuple(values.pop(), values.pop());
				}
				throw failures.pop();
			} catch (error) {
				expect(error).to.equal(failure);
				return $tuple(0, values.pop());
			} finally {
				remaining.push(values.size());
			}
		}

		const first = read(true);
		expect(first[0]).to.equal(4);
		expect(first[1]).to.equal(3);
		expect(failures.size()).to.equal(1);
		const second = read(false);
		expect(second[0]).to.equal(0);
		expect(second[1]).to.equal(2);
		expect(failures.size()).to.equal(0);
		expect(remaining.join(",")).to.equal("2,1");
		expect(values.join(",")).to.equal("1");
	});

	it("should repeat loop prerequisites in order across continue", () => {
		const values = [1, 2, 3];
		const seen = new Array<number>();
		let checks = 0;
		let increments = 0;
		for (; (checks += 1) < 4 && values.pop() !== undefined; increments += 1) {
			if (checks === 2) {
				continue;
			}
			seen.push(checks);
		}

		expect(checks).to.equal(4);
		expect(increments).to.equal(3);
		expect(values.size()).to.equal(0);
		expect(seen.size()).to.equal(2);
		expect(seen[0]).to.equal(1);
		expect(seen[1]).to.equal(3);
	});

	it("should evaluate nested assignment defaults in source order", () => {
		const values = [1, 2, 3, 4];
		let a = 0;
		let b = 0;
		const array: [Array<number>?, { value: number }?] = [];
		[[a] = [values.pop()!], { value: b } = { value: values.pop()! }] = array;
		expect(a).to.equal(4);
		expect(b).to.equal(3);

		const object: { array?: Array<number>; object?: { value: number } } = {};
		({ array: [a] = [values.pop()!], object: { value: b } = { value: values.pop()! } } = object);
		expect(a).to.equal(2);
		expect(b).to.equal(1);
		expect(values.size()).to.equal(0);
	});

	it("should keep generator assignment prerequisites inside each iteration", () => {
		const values = [1, 2, 3, 4];
		function* arrays(): Generator<[number?]> {
			yield [];
			yield [10];
			yield [];
		}
		function* objects(): Generator<{ value?: number }> {
			yield {};
			yield { value: 20 };
			yield {};
		}
		let value = 0;
		const seen = new Array<number>();
		for ([value = values.pop()!] of arrays()) {
			seen.push(value);
		}
		for ({ value = values.pop()! } of objects()) {
			seen.push(value);
		}

		expect(seen.join(",")).to.equal("4,10,3,2,20,1");
		expect(values.size()).to.equal(0);
	});

	it("should preserve omitted iterable reads and discarded results", () => {
		let calls = 0;
		const iterator = (() => ++calls) as IterableFunction<number>;
		const [, second] = iterator;
		expect(second).to.equal(2);
		expect(calls).to.equal(2);

		const tupleIterator = (() => $tuple(++calls, 10)) as IterableFunction<LuaTuple<[number, number]>>;
		const [, [fourth, value]] = tupleIterator;
		expect(fourth).to.equal(4);
		expect(value).to.equal(10);
		expect(calls).to.equal(4);

		const [, character] = "abc";
		expect(character).to.equal("b");
		const values = [1, 2];
		expect(void values.pop()).to.equal(undefined);
		expect(values.size()).to.equal(1);
	});
};
