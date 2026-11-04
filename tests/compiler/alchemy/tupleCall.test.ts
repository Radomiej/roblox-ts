import { createTestProject } from "../createTestProject";

it("wraps a LuaTuple return before calling an indexed function result", () => {
	const output = createTestProject().compileSource(`
		function getTupleFn(): LuaTuple<[() => number]> {
			return $tuple(() => 42);
		}
		const result = getTupleFn()[0]();
	`);

	expect(output).toContain("local result = ({ getTupleFn() })[1]()");
});
