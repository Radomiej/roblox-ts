export = () => {
	it("should read captured variables when a generator resumes", () => {
		let captured = 1;

		function* values(): Generator<number, number, number> {
			const input = yield captured;
			captured += input;
			return captured;
		}

		const iterator = values();
		captured = 4;
		expect(iterator.next().value).to.equal(4);

		const completed = iterator.next(3);
		expect(completed.done).to.equal(true);
		expect(completed.value).to.equal(7);
		expect(captured).to.equal(7);
	});

	it("should complete nested yield star delegation and run finally blocks", () => {
		const events: string[] = [];

		function* inner(): Generator<number, number, number> {
			try {
				const received = yield 1;
				return received + 2;
			} finally {
				events.push("inner finally");
			}
		}

		function* middle(): Generator<number, number, number> {
			try {
				return yield* inner();
			} finally {
				events.push("middle finally");
			}
		}

		function* outer(): Generator<number, number, number> {
			try {
				return yield* middle();
			} finally {
				events.push("outer finally");
			}
		}

		const iterator = outer();
		expect(iterator.next().value).to.equal(1);
		const completed = iterator.next(7);

		expect(completed.done).to.equal(true);
		expect(completed.value).to.equal(9);
		expect(events.size()).to.equal(3);
		expect(events[0]).to.equal("inner finally");
		expect(events[1]).to.equal("middle finally");
		expect(events[2]).to.equal("outer finally");
	});

	it("should close a generator and run finally when a for of loop breaks", () => {
		const events: number[] = [];

		function* values(): Generator<number, void, undefined> {
			try {
				yield 1;
				yield 2;
			} finally {
				events.push(3);
			}
		}

		for (const value of values()) {
			events.push(value);
			break;
		}

		expect(events.size()).to.equal(2);
		expect(events[0]).to.equal(1);
		expect(events[1]).to.equal(3);
	});

	it("should close nested delegated generators when a consumer breaks", () => {
		const events: string[] = [];

		function* inner(): Generator<number, void, undefined> {
			try {
				yield 1;
				yield 2;
			} finally {
				events.push("inner");
			}
		}

		function* outer(): Generator<number, void, undefined> {
			try {
				yield* inner();
			} finally {
				events.push("outer");
			}
		}

		for (const value of outer()) {
			expect(value).to.equal(1);
			break;
		}

		expect(events.size()).to.equal(2);
		expect(events[0]).to.equal("inner");
		expect(events[1]).to.equal("outer");
	});

	it("should read a delegated return method when the generator is closed", () => {
		const events: string[] = [];

		interface CloseableGenerator extends Generator<number, void, undefined> {
			return(value?: void): IteratorResult<number, void>;
		}

		function* inner(): Generator<number, void, undefined> {
			try {
				yield 1;
			} finally {
				events.push("inner finally");
			}
		}

		const delegated = inner() as CloseableGenerator;
		function* outer(): Generator<number, void, undefined> {
			try {
				yield* delegated;
			} finally {
				events.push("outer finally");
			}
		}

		for (const value of outer()) {
			expect(value).to.equal(1);
			delegated.return = () => {
				events.push("replacement return");
				return { done: true, value: undefined };
			};
			break;
		}

		expect(events.size()).to.equal(2);
		expect(events[0]).to.equal("replacement return");
		expect(events[1]).to.equal("outer finally");
	});

	it("should stop at a yield inside finally when the iterator is closed", () => {
		const events: number[] = [];

		function* values(): Generator<number, void, undefined> {
			try {
				yield 1;
			} finally {
				events.push(2);
				yield 3;
				events.push(4);
			}
		}

		for (const value of values()) {
			events.push(value);
			break;
		}

		expect(events.size()).to.equal(2);
		expect(events[0]).to.equal(1);
		expect(events[1]).to.equal(2);
	});

	it("should allow a return in finally to override iterator close", () => {
		interface GeneratorWithReturn<Yields, Returns, Next> extends Generator<Yields, Returns, Next> {
			return(value?: Returns): IteratorResult<Yields, Returns>;
		}

		function* values(): Generator<number, number, undefined> {
			try {
				yield 1;
			} finally {
				return 5;
			}
		}

		const iterator = values() as GeneratorWithReturn<number, number, undefined>;
		expect(iterator.next().value).to.equal(1);
		const completed = iterator.return(99);
		expect(completed.done).to.equal(true);
		expect(completed.value).to.equal(5);
	});

	it("should propagate a cleanup error raised while closing an iterator", () => {
		interface GeneratorWithReturn<Yields, Returns, Next> extends Generator<Yields, Returns, Next> {
			return(value?: Returns): IteratorResult<Yields, Returns>;
		}

		let disposed = false;

		function* values(): Generator<number, void, undefined> {
			using resource: Disposable = {
				[Symbol.dispose]() {
					disposed = true;
				},
			};
			try {
				yield 1;
			} finally {
				throw "cleanup failed";
			}
		}

		const iterator = values() as GeneratorWithReturn<number, void, undefined>;
		expect(iterator.next().value).to.equal(1);
		expect(() => iterator.return()).to.throw();
		expect(disposed).to.equal(true);
	});

	it("should preserve the delegated final return value and side effects", () => {
		const events: number[] = [];
		let iteratorCalls = 0;

		function* inner(): Generator<number, number, number> {
			const received = yield 5;
			events.push(received);
			return received * 2;
		}

		function getInner() {
			iteratorCalls++;
			return inner();
		}

		function* outer(): Generator<number, number, number> {
			return yield* getInner();
		}

		const iterator = outer();
		expect(iterator.next().value).to.equal(5);
		const completed = iterator.next(8);

		expect(completed.done).to.equal(true);
		expect(completed.value).to.equal(16);
		expect(iteratorCalls).to.equal(1);
		expect(events.size()).to.equal(1);
		expect(events[0]).to.equal(8);
	});
};
