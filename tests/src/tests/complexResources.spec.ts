/// <reference path="../using.d.ts" />

export = () => {
	it("should dispose nested using scopes in reverse declaration order", () => {
		const events: number[] = [];

		function resource(id: number): Disposable {
			return {
				[Symbol.dispose]() {
					events.push(id);
				},
			};
		}

		{
			using outer = resource(1);
			{
				using inner1 = resource(2);
				using inner2 = resource(3);
				events.push(4);
			}
			events.push(5);
		}

		expect(events.size()).to.equal(5);
		expect(events[0]).to.equal(4);
		expect(events[1]).to.equal(3);
		expect(events[2]).to.equal(2);
		expect(events[3]).to.equal(5);
		expect(events[4]).to.equal(1);
	});

	it("should evaluate a return value before disposing its resource", () => {
		let state = 10;

		function getValue() {
			return state;
		}

		function read(): number {
			using resource: Disposable = {
				[Symbol.dispose]() {
					state = 20;
				},
			};
			return getValue();
		}

		expect(read()).to.equal(10);
		expect(state).to.equal(20);
	});

	it("should dispose all nested resources when a function returns early", () => {
		const events: number[] = [];

		function resource(id: number): Disposable {
			return {
				[Symbol.dispose]() {
					events.push(id);
				},
			};
		}

		function run(): number {
			using first = resource(1);
			{
				using second = resource(2);
				return 7;
			}
		}

		expect(run()).to.equal(7);
		expect(events.size()).to.equal(2);
		expect(events[0]).to.equal(2);
		expect(events[1]).to.equal(1);
	});

	it("should dispose resources in LIFO order while an exception unwinds nested scopes", () => {
		const events: number[] = [];

		function resource(id: number): Disposable {
			return {
				[Symbol.dispose]() {
					events.push(id);
				},
			};
		}

		expect(() => {
			using first = resource(1);
			{
				using second = resource(2);
				using third = resource(3);
				throw "failure";
			}
		}).to.throw();

		expect(events.size()).to.equal(3);
		expect(events[0]).to.equal(3);
		expect(events[1]).to.equal(2);
		expect(events[2]).to.equal(1);
	});

	it("should dispose a generator resource when iteration stops early", () => {
		const events: number[] = [];

		function* values(): Generator<number, void, undefined> {
			using resource: Disposable = {
				[Symbol.dispose]() {
					events.push(2);
				},
			};
			try {
				yield 1;
				yield 3;
			} finally {
				events.push(4);
			}
		}

		for (const value of values()) {
			events.push(value);
			break;
		}

		expect(events.size()).to.equal(3);
		expect(events[0]).to.equal(1);
		expect(events[1]).to.equal(4);
		expect(events[2]).to.equal(2);
	});

	it("should dispose generator resources inside a try before its finally block", () => {
		const events: string[] = [];

		function* values(): Generator<number, void, undefined> {
			try {
				using resource: Disposable = {
					[Symbol.dispose]() {
						events.push("dispose");
					},
				};
				yield 1;
			} finally {
				events.push("finally");
			}
		}

		for (const value of values()) {
			expect(value).to.equal(1);
			break;
		}

		expect(events.size()).to.equal(2);
		expect(events[0]).to.equal("dispose");
		expect(events[1]).to.equal("finally");
	});

	it("should dispose resources from a failing catch before finally", () => {
		const events: string[] = [];

		function fail(): never {
			throw "catch failed";
		}

		function* values(): Generator<number, void, undefined> {
			try {
				throw "initial failure";
			} catch (error) {
				using resource: Disposable = {
					[Symbol.dispose]() {
						events.push("dispose");
					},
				};
				fail();
			} finally {
				events.push("finally");
			}
		}

		const iterator = values();
		expect(() => iterator.next()).to.throw();
		expect(events.size()).to.equal(2);
		expect(events[0]).to.equal("dispose");
		expect(events[1]).to.equal("finally");
	});
};
