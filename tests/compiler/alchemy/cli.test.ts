import typegen from "CLI/commands/typegen";
import fs from "fs-extra";
import os from "os";
import path from "path";

jest.setTimeout(30000);

const cases = [
	{
		name: "function returned by identifier",
		input: [
			"---@param x number",
			"---@return string",
			"local function main(x)",
			"\treturn tostring(x)",
			"end",
			"",
			"return main",
		].join("\n"),
		file: "FuncExportId.d.ts",
		expects: ["declare function FuncExportId(x: number): string;", "export = FuncExportId;"],
	},
	{
		name: "function literal returned from a module",
		input: ["---@param name string", "---@return string", "return function(name)", "\treturn name", "end"].join(
			"\n",
		),
		file: "FuncExportLit.d.ts",
		expects: ["declare function FuncExportLit(name: string): string;", "export = FuncExportLit;"],
	},
	{
		name: "functions exported from a returned table",
		input: [
			"local M = {}",
			"",
			"---@param x number",
			"---@param y string",
			"---@return boolean",
			"function M.foo(x, y)",
			"\treturn true",
			"end",
			"",
			"return M",
		].join("\n"),
		file: "MyLib.d.ts",
		expects: ["function foo(x: number, y: string): boolean;"],
	},
];

it.each(cases)("typegen emits declarations for $name", async ({ input, file, expects }) => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "rbxtsc-typegen-"));
	try {
		const inputFile = path.join(directory, file.replace(/\.d\.ts$/, ".luau"));
		const outputDirectory = path.join(directory, "out");
		fs.writeFileSync(inputFile, input);

		const argv = {
			_: ["typegen"],
			$0: "rbxtsc",
			input: inputFile,
			output: outputDirectory,
		} as Parameters<NonNullable<typeof typegen.handler>>[0];
		await typegen.handler!(argv);

		const declaration = fs.readFileSync(path.join(outputDirectory, file), "utf8");
		for (const expected of expects) {
			expect(declaration).toContain(expected);
		}
	} finally {
		fs.removeSync(directory);
	}
});
