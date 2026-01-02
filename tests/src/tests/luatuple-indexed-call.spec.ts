// #2909: LuaTuple wrap missing when indexed result is immediately called
declare function getTupleFn(): LuaTuple<[() => number]>;

export = () => {
	it("should wrap LuaTuple when indexed result is called", () => {
		// This test verifies that a()[0]() correctly wraps the LuaTuple
		// Before fix: print(a()[1]()) - wrong index
		// After fix: print(({ a() })[1]()) - wrapped correctly
		function mockGetTupleFn(): LuaTuple<[() => number]> {
			return $tuple(() => 42);
		}
		const result = mockGetTupleFn()[0]();
		expect(result).to.equal(42);
	});
};
