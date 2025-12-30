export = () => {
	it("should support omitted elements in string destructuring", () => {
		const [, b] = "abc";
		expect(b).to.equal("b");
	});

	it("should support omitted elements in Set destructuring", () => {
		const set = new Set(["a", "b", "c"]);
		const [, y] = set;
		expect(y).to.equal("b");
	});

	it("should support omitted elements in generator destructuring", () => {
		function* gen() {
			yield 1;
			yield 2;
			yield 3;
		}
		const [, z] = gen();
		expect(z).to.equal(2);
	});

	it("should support destructuring IterableFunction", () => {
		let count = 0;
		const iter = (() => {
			count++;
			if (count === 1) return "a";
			if (count === 2) return "b";
		}) as IterableFunction<string>;

		const [a, b] = iter;
		expect(a).to.equal("a");
		expect(b).to.equal("b");
	});

	it("should support omitted elements in IterableFunction destructuring", () => {
		let count = 0;
		const iter = (() => {
			count++;
			if (count === 1) return "a";
			if (count === 2) return "b";
			if (count === 3) return "c";
		}) as IterableFunction<string>;

		const [, b, ,] = iter;
		expect(b).to.equal("b");
		expect(count).to.equal(3); // Should have iterated 3 times
	});
};
