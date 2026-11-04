import fs from "fs-extra";
import os from "os";
import path from "path";
import { cleanup } from "Project/functions/cleanup";
import { copyItem } from "Project/functions/copyItem";
import { createPathTranslator } from "Project/functions/createPathTranslator";
import { createProjectData } from "Project/functions/createProjectData";
import { isCompilableFile } from "Project/util/isCompilableFile";
import { DEFAULT_PROJECT_OPTIONS } from "Shared/constants";
import ts from "typescript";

let directory: string;

beforeEach(() => {
	directory = fs.mkdtempSync(path.join(os.tmpdir(), "rbxtsc-js-"));
	fs.ensureDirSync(path.join(directory, "src"));
	fs.writeJsonSync(path.join(directory, "package.json"), { name: "js-fixture" });
	fs.writeFileSync(path.join(directory, "src", "entry.js"), "export const value = 42;\n");
});
afterEach(() => fs.removeSync(directory));

function fixture(allowJs = true, luau = true, declaration = false, compilerOptions: ts.CompilerOptions = {}) {
	const options: ts.CompilerOptions = {
		rootDir: path.join(directory, "src"),
		outDir: path.join(directory, "out"),
		allowJs,
		declaration,
		noLib: true,
		types: [],
		...compilerOptions,
	};
	const program = ts.createIncrementalProgram({
		rootNames: [path.join(directory, "src", "entry.js")],
		options,
		host: ts.createIncrementalCompilerHost(options),
	});
	const data = createProjectData(path.join(directory, "tsconfig.json"), { ...DEFAULT_PROJECT_OPTIONS, luau });
	return { translator: createPathTranslator(program, data), data };
}

it.each([
	["util.js", "util.luau"],
	["view.jsx", "view.luau"],
	["main.server.js", "main.server.luau"],
	["main.client.js", "main.client.luau"],
	["folder/index.js", "folder/init.luau"],
	["folder/index.jsx", "folder/init.luau"],
	["widget.d.js", "widget.d.luau"],
	["widget.d.jsx", "widget.d.luau"],
	["util.ts", "util.luau"],
	["view.tsx", "view.luau"],
	["types.d.ts", "types.d.ts"],
	["data.json", "data.json"],
	["asset.js.map", "asset.js.map"],
])("maps %s to %s", (input, output) => {
	const { translator } = fixture();
	expect(translator.getOutputPath(path.join(directory, "src", input))).toBe(path.join(directory, "out", output));
});

it.each(["js", "jsx"])("maps %s imports and declarations", extension => {
	const { translator } = fixture(true, false, true);
	const input = path.join(directory, "src", `folder/index.${extension}`);
	expect(translator.getOutputPath(input)).toBe(path.join(directory, "out", "folder/init.lua"));
	expect(translator.getImportPath(input)).toBe(path.join(directory, "out", "folder/init.lua"));
	expect(translator.getImportPath(input, true)).toBe(path.join(directory, "src", "folder/init.lua"));
	expect(translator.getOutputDeclarationPath(input)).toBe(path.join(directory, "out", "folder/index.d.ts"));
	expect(translator.getOutputTransformedPath(input)).toBe(
		path.join(directory, "out", `folder/index.transformed.${extension}`),
	);
});

it("keeps JS as an asset when allowJs is disabled", () => {
	const { translator } = fixture(false);
	const input = path.join(directory, "src", "entry.js");
	expect(translator.getOutputPath(input)).toBe(path.join(directory, "out", "entry.js"));
	expect(translator.getImportPath(input)).toBe(path.join(directory, "out", "entry.js"));
});

it("maps JavaScript imports using the configured output extension", () => {
	const { translator } = fixture();
	const input = path.join(directory, "src", "folder", "index.jsx");
	expect(translator.getImportPath(input)).toBe(path.join(directory, "out", "folder", "init.luau"));
	expect(translator.getImportPath(input, true)).toBe(path.join(directory, "src", "folder", "init.luau"));
});

it.each([
	["entry.luau", ["entry.js", "entry.jsx"]],
	["folder/init.luau", ["folder/init.js", "folder/init.jsx", "folder/index.js", "folder/index.jsx"]],
	[
		"folder/init.server.luau",
		["folder/init.server.js", "folder/init.server.jsx", "folder/index.server.js", "folder/index.server.jsx"],
	],
	["folder/index.luau", []],
])("maps generated output %s back to JavaScript inputs", (output, inputs) => {
	const { translator } = fixture();
	const outputPath = path.join(directory, "out", output);
	const expectedInputs = inputs.map(input => path.join(directory, "src", input));
	const actualInputs = translator.getInputPaths(outputPath);
	const actualJavaScriptInputs = actualInputs.filter(input => /\.jsx?$/.test(input));
	expect(actualJavaScriptInputs).toEqual(expectedInputs);
});

it("maps generated Lua output back to JavaScript inputs", () => {
	const { translator } = fixture(true, false);
	const outputPath = path.join(directory, "out", "entry.lua");
	expect(translator.getInputPaths(outputPath)).toEqual(
		expect.arrayContaining([path.join(directory, "src", "entry.js"), path.join(directory, "src", "entry.jsx")]),
	);
});

it("does not treat unrelated output extensions as generated JavaScript", () => {
	const { translator } = fixture(true, true, true);
	const outputPath = path.join(directory, "out", "widget.lua");
	expect(translator.getInputPaths(outputPath).filter(input => /\.jsx?$/.test(input))).toEqual([]);
});

it("adds JavaScript declaration inputs only when declarations are enabled", () => {
	const outputPath = path.join(directory, "out", "widget.d.ts");
	const javascriptInputs = [path.join(directory, "src", "widget.js"), path.join(directory, "src", "widget.jsx")];
	const withDeclarations = fixture(true, true, true).translator.getInputPaths(outputPath);
	const withoutDeclarations = fixture(true, true, false).translator.getInputPaths(outputPath);
	for (const input of javascriptInputs) {
		expect(withDeclarations).toContain(input);
		expect(withoutDeclarations).not.toContain(input);
	}
});

it("normalizes the incremental build info output path", () => {
	const buildInfoPath = "build/../project.tsbuildinfo";
	const { translator } = fixture(true, true, false, { incremental: true, tsBuildInfoFile: buildInfoPath });
	expect(translator.buildInfoOutputPath).toBe(path.normalize(buildInfoPath));
});

it("keeps generated JS outputs during cleanup and removes them when the source is deleted", () => {
	const { translator } = fixture();
	fs.outputFileSync(path.join(directory, "out", "entry.luau"), "return 42");
	cleanup(translator);
	expect(fs.readFileSync(path.join(directory, "out", "entry.luau"), "utf8")).toBe("return 42");
	fs.removeSync(path.join(directory, "src", "entry.js"));
	cleanup(translator);
	expect(fs.existsSync(path.join(directory, "out", "entry.luau"))).toBe(false);
});

it("does not copy JS sources over compiled outputs", () => {
	const { translator, data } = fixture();
	fs.outputFileSync(path.join(directory, "out", "entry.luau"), "return 42");
	copyItem(data, translator, path.join(directory, "src", "entry.js"));
	expect(fs.readFileSync(path.join(directory, "out", "entry.luau"), "utf8")).toBe("return 42");
	expect(fs.existsSync(path.join(directory, "out", "entry.js"))).toBe(false);
});

it("recognizes opted-in JS and JSX for incremental compilation", () => {
	for (const extension of ["js", "jsx"]) {
		const file = path.join(directory, "src", `watch.${extension}`);
		fs.writeFileSync(file, "");
		expect(isCompilableFile(file, true)).toBe(true);
		expect(isCompilableFile(file)).toBe(false);
	}
	expect(isCompilableFile(path.join(directory, "src"), true)).toBe(false);
});
