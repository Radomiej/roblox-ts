import { CLIError } from "CLI/errors/CLIError";
import fs from "fs-extra";
import path from "path";
import { LogService } from "Shared/classes/LogService";
import * as luaparse from "luaparse";
import ts from "typescript";
import type yargs from "yargs";

interface TypegenFlags {
	input: string;
	output: string;
	verbose?: boolean;
}

interface LuauExport {
	name: string;
	type: "function" | "value";
	params?: Array<string>;
	paramTypes?: Record<string, string>;
	returnType?: string;
}

interface LuauReturn {
	type: "identifier" | "table" | "unknown";
	name?: string;
	fields?: Array<LuauExport>;
}

interface ParsedLuauModule {
	returnInfo: LuauReturn;
	exports: Array<LuauExport>;
}

type LuaAstNode = { type: string; loc?: { start: { line: number } } };
type LuaIdentifier = LuaAstNode & { type: "Identifier"; name: string };
type LuaMemberExpression = LuaAstNode & { type: "MemberExpression"; base: LuaAstNode; identifier?: LuaAstNode };
type LuaFunctionDeclaration = LuaAstNode & { type: "FunctionDeclaration"; parameters?: Array<LuaIdentifier>; identifier?: LuaAstNode };
type LuaAssignmentStatement = LuaAstNode & { type: "AssignmentStatement"; variables?: Array<LuaAstNode>; init?: Array<LuaAstNode> };
type LuaReturnStatement = LuaAstNode & { type: "ReturnStatement"; arguments?: Array<LuaAstNode> };
type LuaTableKeyString = LuaAstNode & { type: "TableKeyString"; key?: LuaAstNode; value?: LuaAstNode };
type LuaTableKey = LuaAstNode & { type: "TableKey"; key?: LuaAstNode; value?: LuaAstNode };
type LuaTableConstructorExpression = LuaAstNode & {
	type: "TableConstructorExpression";
	fields?: Array<LuaTableKeyString | LuaTableKey>;
};
type LuaStringLiteral = LuaAstNode & { type: "StringLiteral"; value: string };

function isLuaAstNode(value: unknown): value is LuaAstNode {
	return typeof value === "object" && value !== null && "type" in value;
}

function mapLuauTypeToTs(typeText: string): string {
	const t = typeText.trim();
	if (t === "nil") return "undefined";
	if (t === "number" || t === "string" || t === "boolean" || t === "unknown" || t === "any") return t;
	if (t === "table") return "Record<string, unknown>";
	return t;
}

function getAnnotationBlock(lines: Array<string>, functionLine: number) {
	const block: Array<string> = [];
	for (let i = functionLine - 2; i >= 0; i--) {
		const line = lines[i];
		if (/^\s*---@/.test(line)) {
			block.unshift(line);
			continue;
		}
		if (/^\s*--/.test(line) && block.length > 0) {
			block.unshift(line);
			continue;
		}
		break;
	}
	return block;
}

function parseAnnotations(block: Array<string>) {
	const paramTypes: Record<string, string> = {};
	let returnType: string | undefined;
	for (const line of block) {
		const paramMatch = line.match(/^\s*---@param\s+(\w+)\s+([^\s]+)\s*$/);
		if (paramMatch) {
			paramTypes[paramMatch[1]] = mapLuauTypeToTs(paramMatch[2]);
			continue;
		}
		const returnMatch = line.match(/^\s*---@return\s+([^\s]+)\s*$/);
		if (returnMatch) {
			returnType = mapLuauTypeToTs(returnMatch[1]);
			continue;
		}
	}
	return { paramTypes, returnType };
}

function getIdentifierName(node: unknown): string | undefined {
	if (!isLuaAstNode(node)) return undefined;
	return node.type === "Identifier" && "name" in node ? (node as LuaIdentifier).name : undefined;
}


function getMemberExportName(moduleName: string, node: unknown): string | undefined {
	if (!isLuaAstNode(node) || node.type !== "MemberExpression") return undefined;
	const member = node as LuaMemberExpression;
	const base = getIdentifierName(member.base);
	if (base !== moduleName) return undefined;
	if (member.identifier && isLuaAstNode(member.identifier) && member.identifier.type === "Identifier") {
		return (member.identifier as LuaIdentifier).name;
	}
	return undefined;
}

function parseLuauFileRegex(filePath: string): Array<LuauExport> {
	const content = fs.readFileSync(filePath, "utf-8");
	const exports: Array<LuauExport> = [];

	const functionPattern = /(?:local\s+)?function\s+(?:\w+\.)?(\w+)\s*\(([^)]*)\)/g;
	let match;
	while ((match = functionPattern.exec(content)) !== null) {
		const name = match[1];
		const params = match[2]
			.split(",")
			.map(p => p.trim())
			.filter(p => p.length > 0);
		exports.push({ name, type: "function", params });
	}

	return exports;
}

function parseLuauFileAst(filePath: string): ParsedLuauModule | undefined {
	const content = fs.readFileSync(filePath, "utf-8");
	const lines = content.split(/\r?\n/);
	let ast: unknown;
	try {
		ast = luaparse.parse(content, {
			luaVersion: "5.1",
			locations: true,
			ranges: false,
			comments: false,
		});
	} catch {
		return undefined;
	}

	if (!isLuaAstNode(ast) || !("body" in ast) || !Array.isArray((ast as { body: unknown }).body)) {
		return undefined;
	}

	const body = (ast as { body: Array<unknown> }).body.filter(isLuaAstNode);
	const returnStatements = body.filter((n): n is LuaReturnStatement => n.type === "ReturnStatement");
	const lastReturn = returnStatements.length > 0 ? returnStatements[returnStatements.length - 1] : undefined;
	const returnArg = lastReturn?.arguments?.[0];

	const returnInfo: LuauReturn = { type: "unknown" };
	if (isLuaAstNode(returnArg) && returnArg.type === "Identifier") {
		returnInfo.type = "identifier";
		returnInfo.name = (returnArg as LuaIdentifier).name;
	} else if (isLuaAstNode(returnArg) && returnArg.type === "TableConstructorExpression") {
		returnInfo.type = "table";
		returnInfo.fields = [];
		const tableArg = returnArg as LuaTableConstructorExpression;
		for (const field of tableArg.fields ?? []) {
			let keyName: string | undefined;
			if (field.type === "TableKeyString" && isLuaAstNode(field.key) && field.key.type === "Identifier") {
				keyName = (field.key as LuaIdentifier).name;
			} else if (field.type === "TableKey" && isLuaAstNode(field.key) && field.key.type === "StringLiteral") {
				keyName = (field.key as LuaStringLiteral).value;
			}
			if (!keyName) continue;
			if (isLuaAstNode(field.value) && field.value.type === "FunctionDeclaration") {
				const fn = field.value as LuaFunctionDeclaration;
				const params = (fn.parameters ?? []).map(p => p.name);
				const functionLine = fn.loc?.start?.line;
				const annotations =
					typeof functionLine === "number"
						? parseAnnotations(getAnnotationBlock(lines, functionLine))
						: undefined;
				returnInfo.fields.push({
					name: keyName,
					type: "function",
					params,
					paramTypes: annotations?.paramTypes,
					returnType: annotations?.returnType,
				});
			} else {
				returnInfo.fields.push({ name: keyName, type: "value" });
			}
		}
	}

	const exports: Array<LuauExport> = [];
	if (returnInfo.type === "identifier" && returnInfo.name) {
		const moduleName = returnInfo.name;
		for (const node of body) {
			if (node.type === "FunctionDeclaration") {
				const fn = node as LuaFunctionDeclaration;
				const exportName = getMemberExportName(moduleName, fn.identifier);
				if (exportName) {
					const params = (fn.parameters ?? []).map(p => p.name);
					const functionLine = fn.loc?.start?.line;
					const annotations =
						typeof functionLine === "number"
							? parseAnnotations(getAnnotationBlock(lines, functionLine))
							: undefined;
					exports.push({
						name: exportName,
						type: "function",
						params,
						paramTypes: annotations?.paramTypes,
						returnType: annotations?.returnType,
					});
				}
			} else if (node.type === "AssignmentStatement") {
				const assign = node as LuaAssignmentStatement;
				for (let i = 0; i < (assign.variables?.length ?? 0); i++) {
					const v = assign.variables?.[i];
					const init = assign.init?.[i];
					const exportName = getMemberExportName(moduleName, v);
					if (!exportName) continue;
					if (isLuaAstNode(init) && init.type === "FunctionDeclaration") {
						const fn = init as LuaFunctionDeclaration;
						const params = (fn.parameters ?? []).map(p => p.name);
						const functionLine = fn.loc?.start?.line;
						const annotations =
							typeof functionLine === "number"
								? parseAnnotations(getAnnotationBlock(lines, functionLine))
								: undefined;
						exports.push({
							name: exportName,
							type: "function",
							params,
							paramTypes: annotations?.paramTypes,
							returnType: annotations?.returnType,
						});
					} else {
						exports.push({ name: exportName, type: "value" });
					}
				}
			}
		}
	}

	return { returnInfo, exports };
}

function generateDts(
	parsed: ParsedLuauModule | undefined,
	fallbackExports: Array<LuauExport>,
	moduleName: string,
): string {
	const lines: Array<string> = [];

	lines.push(`// Auto-generated by rbxtsc typegen`);
	lines.push(`// Do not edit manually`);
	lines.push(``);
	if (parsed?.returnInfo.type === "table" && parsed.returnInfo.fields) {
		lines.push(`declare const ${moduleName}: {`);
		for (const exp of parsed.returnInfo.fields) {
			if (exp.type === "function") {
				const params = exp.params ?? [];
				const paramList = params
					.map(p => `${p}: ${exp.paramTypes?.[p] ?? "unknown"}`)
					.join(", ");
				lines.push(`\t${exp.name}: (${paramList}) => ${exp.returnType ?? "unknown"};`);
			} else {
				lines.push(`\t${exp.name}: unknown;`);
			}
		}
		lines.push(`};`);
		lines.push(``);
		lines.push(`export = ${moduleName};`);
	} else {
		lines.push(`declare namespace ${moduleName} {`);
		const exports = parsed?.exports ?? fallbackExports;
		for (const exp of exports) {
			if (exp.type === "function") {
				const params = exp.params ?? [];
				const paramList = params
					.map(p => `${p}: ${exp.paramTypes?.[p] ?? "unknown"}`)
					.join(", ");
				lines.push(`\tfunction ${exp.name}(${paramList}): ${exp.returnType ?? "unknown"};`);
			} else {
				lines.push(`\tconst ${exp.name}: unknown;`);
			}
		}
		lines.push(`}`);
		lines.push(``);
		lines.push(`export = ${moduleName};`);
	}
	lines.push(``);

	return lines.join("\n");
}

/**
 * Defines the behavior for the `rbxtsc typegen` command.
 */
export = ts.identity<yargs.CommandModule<object, TypegenFlags>>({
	command: "typegen",

	describe: "Generate TypeScript declaration files (.d.ts) from Luau source files",

	builder: (parser: yargs.Argv) =>
		parser
			.option("input", {
				alias: "i",
				string: true,
				demandOption: true,
				describe: "input Luau file or directory",
			})
			.option("output", {
				alias: "o",
				string: true,
				demandOption: true,
				describe: "output directory for .d.ts files",
			})
			.option("verbose", {
				boolean: true,
				describe: "enable verbose logs",
			}),

	handler: async argv => {
		try {
			LogService.verbose = argv.verbose === true;

			const inputPath = path.resolve(argv.input);
			const outputPath = path.resolve(argv.output);

			if (!fs.existsSync(inputPath)) {
				throw new CLIError(`Input path does not exist: ${inputPath}`);
			}

			await fs.ensureDir(outputPath);

			const files: Array<string> = [];
			const stat = fs.statSync(inputPath);

			if (stat.isDirectory()) {
				const entries = fs.readdirSync(inputPath, { recursive: true }) as Array<string>;
				for (const entry of entries) {
					const fullPath = path.join(inputPath, entry);
					if (fs.statSync(fullPath).isFile() && (entry.endsWith(".lua") || entry.endsWith(".luau"))) {
						files.push(fullPath);
					}
				}
			} else {
				files.push(inputPath);
			}

			let generated = 0;
			for (const file of files) {
				const relativePath = stat.isDirectory() ? path.relative(inputPath, file) : path.basename(file);
				const baseName = path.basename(file, path.extname(file));
				const moduleName = baseName.replace(/[^a-zA-Z0-9_]/g, "_");

				LogService.writeLineIfVerbose(`Processing: ${relativePath}`);

				const parsed = parseLuauFileAst(file);
				const exports = parsed?.exports ?? parseLuauFileRegex(file);
				const hasAny = exports.length > 0 || parsed?.returnInfo.type === "table";
				if (!hasAny) {
					LogService.writeLineIfVerbose(`  No exports found, skipping`);
					continue;
				}

				const dtsContent = generateDts(parsed, exports, moduleName);
				const outputFile = path.join(outputPath, relativePath.replace(/\.(lua|luau)$/, ".d.ts"));

				await fs.ensureDir(path.dirname(outputFile));
				await fs.writeFile(outputFile, dtsContent);

				LogService.writeLineIfVerbose(`  Generated: ${outputFile}`);
				generated++;
			}

			LogService.writeLine(`Generated ${generated} declaration file(s)`);
		} catch (e) {
			process.exitCode = 1;
			if (e instanceof CLIError) {
				e.log();
			} else {
				throw e;
			}
		}
	},
});
