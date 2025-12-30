interface SymbolConstructor {
	readonly iterator: symbol;
	readonly hasInstance: symbol;
}
declare const Symbol: SymbolConstructor;

// Force change
export = () => {
	it("should support Symbol.iterator", () => {
		const iter = {
			// @ts-ignore
			[Symbol.iterator]: function* () {
				yield 1;
				yield 2;
			},
		};
		const result = new Array<number>();
		// @ts-ignore
		for (const x of iter) {
			result.push(x);
		}
		expect(result[0]).to.equal(1);
		expect(result[1]).to.equal(2);
	});

	it("should support Symbol.hasInstance", () => {
		class Foo {
			// @ts-ignore
			static [Symbol.hasInstance](instance: unknown) {
				return instance === "foo";
			}
		}
		// @ts-ignore
		expect("foo" instanceof Foo).to.equal(true);
		// @ts-ignore
		expect("bar" instanceof Foo).to.equal(false);
	});
};
