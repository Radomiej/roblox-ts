import { createTestProject } from "./createTestProject";

it("captures the delegated next function once and forwards resume inputs", () => {
	const project = createTestProject();
	const output = project.compileSource(
		`
		declare function getIterator(): Generator<number, number, number>;
		function* delegate(): Generator<number, number, number> {
			return yield* getIterator();
		}
	`,
	);

	expect(output).toMatchSnapshot();
});

it("closes generator iterators on loop breaks and delegated cancellation", () => {
	const output = createTestProject().compileSource(`
		function* inner(): Generator<number, void, undefined> {
			try { yield 1; } finally { print("inner closed"); }
		}
		function* outer(): Generator<number, void, undefined> {
			try { yield* inner(); } finally { print("outer closed"); }
		}
		for (const value of outer()) break;
	`);

	expect(output).toContain('["return"]');
	expect(output).toContain("TS.GENERATOR_RETURN");
	expect(output).toContain("inner closed");
	expect(output).toContain("outer closed");
});
