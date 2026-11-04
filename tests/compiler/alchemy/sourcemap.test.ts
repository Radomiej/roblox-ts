import { createRuntimeSourcemap } from "Project/functions/createRuntimeSourcemap";
import ts from "typescript";

it("keeps approximate line mappings within the original TypeScript file", () => {
	const file = ts.createSourceFile(
		"example.ts",
		"function answer() {\n return 42;\n}\nanswer();",
		ts.ScriptTarget.Latest,
	);
	const map = createRuntimeSourcemap(
		file,
		"-- header\nlocal function answer()\n return 42\nend\nanswer()",
		"src/example.ts",
	);
	expect(map.source).toBe("src/example.ts");
	expect(Object.keys(map.lines)).toHaveLength(5);
	for (const line of Object.values(map.lines)) {
		expect(Number.isInteger(line)).toBe(true);
		expect(line).toBeGreaterThanOrEqual(1);
		expect(line).toBeLessThanOrEqual(4);
	}
});

it("maps empty input safely", () => {
	const file = ts.createSourceFile("empty.ts", "", ts.ScriptTarget.Latest);
	expect(createRuntimeSourcemap(file, "", "empty.ts")).toEqual({ source: "empty.ts", lines: { "1": 1 } });
});
