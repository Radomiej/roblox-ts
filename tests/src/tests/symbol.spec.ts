export = () => {
	it("should support generators (Symbol.iterator)", () => {
		function* makeIter() {
			yield 1;
			yield 2;
		}
		const iter = makeIter();
		const result: number[] = [];
		for (const x of iter) {
			result.push(x);
		}
		expect(result[0]).to.equal(1);
		expect(result[1]).to.equal(2);
	});

	it("should support generator spread", () => {
		function* makeIter() {
			yield "a";
			yield "b";
			yield "c";
		}
		const iter = makeIter();
		const arr = [...iter];
		expect(arr[0]).to.equal("a");
		expect(arr[1]).to.equal("b");
		expect(arr[2]).to.equal("c");
	});

	it("should support Symbol.hasInstance", () => {
		class Foo {
			static [Symbol.hasInstance](instance: unknown) {
				return instance === "foo";
			}
		}
		expect(("foo" as unknown) instanceof Foo).to.equal(true);
		expect(("bar" as unknown) instanceof Foo).to.equal(false);
	});
};
