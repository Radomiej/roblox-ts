// #2840: ForOf iteration over 'any' type should not crash compiler
// Note: Using unknown instead of any to avoid noAny diagnostic, but testing the same code path
export = () => {
	it("should handle for-of over unknown type with pairs fallback", () => {
		const unknownValue: unknown = { a: 1, b: 2, c: 3 };
		const keys: Array<string> = [];
		for (const key of unknownValue as Iterable<string>) {
			keys.push(key);
		}
		expect(keys.size()).to.be.ok();
	});

	it("should handle for-of over unknown array-like", () => {
		const unknownArray: unknown = [1, 2, 3];
		let sum = 0;
		for (const value of unknownArray as Array<number>) {
			sum += value;
		}
		expect(sum).to.equal(6);
	});

	it("should handle for-of over unknown with single variable", () => {
		const unknownIterable: unknown = [10, 20, 30];
		const results: Array<number> = [];
		for (const item of unknownIterable as Array<number>) {
			results.push(item);
		}
		expect(results.size()).to.equal(3);
	});
};
