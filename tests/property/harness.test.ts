import { assertEquivalentPrograms, assertEquivalentTraces } from "./compilerHarness";

describe("compiler property harness", () => {
	it("runs the real compiler and compares ordered traces from isolated programs", () => {
		assertEquivalentPrograms([
			'print("first"); print("first"); print(42);',
			'let value = "before"; print(value); value = "after"; print(value);',
			"print(1 / 0); print(-1 / 0); print(0 / 0); print(-0);",
			"",
		]);
	});

	it("compares trace types, order, and length", () => {
		expect(() => assertEquivalentTraces([42], ["42"])).toThrow("traces differ");
		expect(() => assertEquivalentTraces(["first", "second"], ["second", "first"])).toThrow("traces differ");
		expect(() => assertEquivalentTraces([42], [])).toThrow("traces differ");
		expect(() => assertEquivalentTraces([Number.NaN, -0], [Number.NaN, -0])).not.toThrow();
	});

	it("surfaces JavaScript runtime exceptions", () => {
		expect(() => assertEquivalentPrograms(['print("before"); throw new Error("runtime failure");'])).toThrow(
			/runtime failure/,
		);
	});

	it("surfaces Luau runtime errors", () => {
		expect(() =>
			assertEquivalentPrograms(["/** @type {Array<() => string>} */ const values = []; values[0]();"]),
		).toThrow(/Lune failed/);
	});

	it("surfaces compiler diagnostics", () => {
		expect(() => assertEquivalentPrograms(["print(unknownProperty); "])).toThrow(
			/unknownProperty|Cannot find name/i,
		);
	});
});
