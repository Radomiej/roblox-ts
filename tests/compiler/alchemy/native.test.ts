import { createTestProject } from "../createTestProject";

it.each([
	"/** @native */ function fast(value: number) { return value + 1; } fast(1);",
	"/** @native */ class Fast { value() { return 1; } } new Fast().value();",
	"class Fast { /** @native */ value() { return 1; } } new Fast().value();",
])("retains the alchemy native directive for %s", source => {
	const output = createTestProject().compileSource(source);
	expect(output.split("--!native")).toHaveLength(2);
});

it("does not enable native code for ordinary comment text", () => {
	const output = createTestProject().compileSource("// native is just prose\nprint(1);");
	expect(output).not.toContain("--!native");
});
