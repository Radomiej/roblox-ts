import { createTestProject } from "./createTestProject";

function createResourceProject() {
	const project = createTestProject();
	project.vfs.writeFile(
		"/src/using.d.ts",
		`interface SymbolConstructor {
			readonly dispose: unique symbol;
			readonly asyncDispose: unique symbol;
		}
		interface Disposable { [Symbol.dispose](): void; }
		interface AsyncDisposable { [Symbol.asyncDispose](): Promise<void>; }`,
	);
	return project;
}

it("compiles synchronous using with cleanup before return", () => {
	const output = createResourceProject().compileSource(`
		let state = 1;
		function read(): number {
			using resource: Disposable = {
				[Symbol.dispose]() { state = 2; },
			};
			return state;
		}
	`);

	expect(output).toContain("TS.disposeResource(resource, false)");
	expect(output).toContain("table.pack");
	expect(output).toContain("table.unpack");
	expect(output).toContain("state = 2");
});

it("compiles await using through the runtime disposal helper", () => {
	const output = createResourceProject().compileSource(`
		async function run(resource: AsyncDisposable) {
			await using held = resource;
		}
	`);

	expect(output).toContain("TS.registerUsing(held, true)");
	expect(output).toContain("TS.disposeResource(held, true)");
});

it("emits thrown table values without string conversion", () => {
	const output = createTestProject().compileSource(`
		const reason = {};
		try {
			throw reason;
		} catch (caught) {
			print(caught === reason);
		}
	`);

	expect(output).toContain("error(reason)");
	expect(output).not.toContain("tostring(reason)");
});

it("hoists function declarations after a terminal return", () => {
	const output = createTestProject().compileSource(`
		function outer() {
			return inner();
			function inner() { return "ready"; }
		}
	`);
	const declarationIndex = output.indexOf("function inner()");
	const callIndex = output.indexOf("return inner()");

	expect(declarationIndex).toBeGreaterThanOrEqual(0);
	expect(callIndex).toBeGreaterThan(declarationIndex);
});
