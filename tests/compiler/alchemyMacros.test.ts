import { createTestProject } from "./createTestProject";

it("compiles operator, string, and undefined Map macros", () => {
	const project = createTestProject();
	const output = project.compileSource(`
		const prefix = "start".startsWith("sta");
		const suffix = "finish".endsWith("ish");
		const values = new Map<string | undefined, number | undefined>([["missing", undefined], [undefined, 1]]);
		const sourceEntries: ReadonlyArray<[string | undefined, number | undefined]> = [["dynamic", undefined], [undefined, 2]];
		const dynamicValues = new Map(sourceEntries);
		values.set("alsoMissing", undefined);
		values.set(undefined, 3);
		const value = values.get("missing");
		const undefinedKeyValue = values.get(undefined);
		const hasUndefinedKey = values.has(undefined);
		const deletedUndefinedKey = values.delete(undefined);
		values.forEach((item, key) => print(key, item));
		for (const [key, item] of values) print(key, item);
		function add(a: Add<number>, b: number) {
			return a.add(b);
		}
		print(prefix, suffix, value);
	`);

	expect(output).toContain("string.sub");
	expect(output).toContain("TS.__undefined");
	expect(output).toContain("values[if nil == nil then TS.__undefined else nil]");
	expect(output).toContain("if _k == TS.__undefined then nil else _k, values");
	expect(output).toContain("return a + b");
	const constructorLoop = output.indexOf("for _, _v in sourceEntries do");
	const valueRead = output.indexOf("local _value = _v[2]");
	expect(constructorLoop).toBeGreaterThanOrEqual(0);
	expect(valueRead).toBeGreaterThan(constructorLoop);
});
