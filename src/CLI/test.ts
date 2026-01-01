/// <reference types="jest" />

import fs from "fs-extra";
import path from "path";
import { compileFiles } from "Project/functions/compileFiles";
import { copyFiles } from "Project/functions/copyFiles";
import { copyInclude } from "Project/functions/copyInclude";
import { createPathTranslator } from "Project/functions/createPathTranslator";
import { createProjectData } from "Project/functions/createProjectData";
import { createProjectProgram } from "Project/functions/createProjectProgram";
import { getChangedSourceFiles } from "Project/functions/getChangedSourceFiles";
import { DEFAULT_PROJECT_OPTIONS, PACKAGE_ROOT, TS_EXT, TSX_EXT } from "Shared/constants";
import { DiagnosticFactory, errors, getDiagnosticId } from "Shared/diagnostics";
import { assert } from "Shared/util/assert";
import { formatDiagnostics } from "Shared/util/formatDiagnostics";
import { getRootDirs } from "Shared/util/getRootDirs";
import { isPathDescendantOf } from "Shared/util/isPathDescendantOf";

const DIAGNOSTIC_TEST_NAME_REGEX = /^(\w+)(?:\.\d+)?$/;

describe("should compile tests project", () => {
	const data = createProjectData(
		path.join(PACKAGE_ROOT, "tests", "tsconfig.json"),
		Object.assign({}, DEFAULT_PROJECT_OPTIONS, {
			project: "",
			allowCommentDirectives: true,
			optimizedLoops: true,
		}),
	);
	const program = createProjectProgram(data);
	const pathTranslator = createPathTranslator(program, data);
	const outDir = program.getCompilerOptions().outDir!;

	// clean outDir between test runs
	fs.removeSync(outDir);

	it("should copy include files", () => copyInclude(data));

	it("should copy non-compiled files", () =>
		copyFiles(data, pathTranslator, new Set(getRootDirs(program.getCompilerOptions()))));

	const diagnosticsFolder = path.join(PACKAGE_ROOT, "tests", "src", "diagnostics");

	const sourceFiles = getChangedSourceFiles(program);

	for (const sourceFile of sourceFiles) {
		const fileName = path.relative(process.cwd(), sourceFile.fileName);
		if (isPathDescendantOf(path.normalize(sourceFile.fileName), diagnosticsFolder)) {
			let fileBaseName = path.basename(sourceFile.fileName);
			const ext = path.extname(fileBaseName);
			if (ext === TS_EXT || ext === TSX_EXT) {
				fileBaseName = path.basename(sourceFile.fileName, ext);
			}
			const diagnosticName = fileBaseName.match(DIAGNOSTIC_TEST_NAME_REGEX)?.[1] as keyof typeof errors;
			assert(diagnosticName && errors[diagnosticName], `Diagnostic test for unknown diagnostic ${fileBaseName}`);
			const expectedId = (errors[diagnosticName] as DiagnosticFactory).id;
			it(`should compile ${fileName} and report diagnostic ${diagnosticName}`, done => {
				process.env.ROBLOX_TS_EXPECTED_DIAGNOSTIC_ID = String(expectedId);
				const emitResult = compileFiles(program.getProgram(), data, pathTranslator, [sourceFile]);
				delete process.env.ROBLOX_TS_EXPECTED_DIAGNOSTIC_ID;
				if (
					emitResult.diagnostics.length > 0 &&
					emitResult.diagnostics.every(d => getDiagnosticId(d) === expectedId)
				) {
					done();
				} else if (emitResult.diagnostics.length === 0) {
					done(new Error(`Expected diagnostic ${diagnosticName} to be reported.`));
				} else {
					done(new Error("Unexpected diagnostics:\n" + formatDiagnostics(emitResult.diagnostics)));
				}
			});
		} else {
			it(`should compile ${fileName}`, done => {
				const emitResult = compileFiles(program.getProgram(), data, pathTranslator, [sourceFile]);
				if (emitResult.diagnostics.length > 0) {
					done(new Error("\n" + formatDiagnostics(emitResult.diagnostics)));
				} else {
					done();
				}
			});
		}
	}

	it("should preserve prereq ordering in generated Luau (regression tests)", () => {
		const readLuau = (...segments: Array<string>) => fs.readFileSync(path.join(outDir, ...segments)).toString();
		const expectSequence = (source: string, sequence: Array<string>) => {
			let pos = 0;
			for (const needle of sequence) {
				const idx = source.indexOf(needle, pos);
				expect(idx).toBeGreaterThanOrEqual(0);
				pos = idx + needle.length;
			}
		};
		const sliceBetween = (source: string, startNeedle: string, endNeedle?: string) => {
			const start = source.indexOf(startNeedle);
			expect(start).toBeGreaterThanOrEqual(0);
			if (endNeedle !== undefined) {
				const end = source.indexOf(endNeedle, start + startNeedle.length);
				expect(end).toBeGreaterThanOrEqual(0);
				return source.slice(start, end);
			}
			return source.slice(start);
		};

		{
			const luau = readLuau("tests", "binary.spec.luau");
			const section = sliceBetween(luau, 'it("should support comma operator"', "end)\nend\n");
			expectSequence(section, [
				"local x = 0",
				"local _exp = expect(x).to.equal(0)",
				"x = 1",
				"local _to = expect(x).to",
				"_to.equal(1)",
				"local _exp_1 = expect(x).to.equal(1)",
				"x = 3",
				"local _to_1 = expect(x).to",
				"_to_1.equal(3)",
			]);
		}

		{
			const luau = readLuau("tests", "object.spec.luau");
			const section = sliceBetween(luau, 'it("should support computed members"', "end)\nend\n");
			expectSequence(section, ["local _left = a", "a = 9", "_object[_left] ="]);
		}

		{
			const luau = readLuau("tests", "class.spec.luau");
			const nested = sliceBetween(
				luau,
				'it("should support nested classes which refer to the outer class"',
				'it("should support methods keys that emit prereqs"',
			);
			expectSequence(nested, ["local _class", "_class = B", "A.member = _class"]);

			const computedKeys = sliceBetween(luau, 'it("should support methods keys that emit prereqs"');
			expectSequence(computedKeys, ["local i = 0", "i += 1", "A[i] = function", "i += 1", "A[i] = function"]);
		}

		{
			const luau = readLuau("tests", "switch.spec.luau");
			const context = sliceBetween(
				luau,
				'it("should support switch statements with context"',
				'it("should support switch statements with fallthrough and context"',
			);
			expectSequence(context, [
				"local _original = x",
				"x += 1",
				"if n == _original then",
				"local _original_1 = x",
				"x += 1",
				"if n == _original_1 then",
			]);

			const fallthroughContext = sliceBetween(
				luau,
				'it("should support switch statements with fallthrough and context"',
				'it("should support switch statements with preceding statements"',
			);
			expectSequence(fallthroughContext, [
				"local _fallthrough = false",
				"local _original = x",
				"x += 1",
				"if n == _original then",
				"_fallthrough = true",
				"local _original_1 = x",
				"x += 1",
				"_fallthrough = n == _original_1",
			]);
		}

		{
			const luau = readLuau("tests", "assignment.spec.luau");

			const nullishStatement = sliceBetween(
				luau,
				'it("should support logical null coalescing assignment statement"',
				'it("should support logical or assignment statement"',
			);
			expectSequence(nullishStatement, ["local x", "if x == nil then", "x = true", "expect(x).to.equal(true)"]);

			const orStatement = sliceBetween(
				luau,
				'it("should support logical or assignment statement"',
				'it("should support logical and assignment statement"',
			);
			expectSequence(orStatement, ["local _condition = x", "if not x then", "_condition = true", "x = _condition"]);

			const andStatement = sliceBetween(
				luau,
				'it("should support logical and assignment statement"',
				'it("should support logical null coalescing assignment expression"',
			);
			expectSequence(andStatement, ["local _condition = x", "if x then", "_condition = false", "x = _condition"]);

			const nullishExpr = sliceBetween(
				luau,
				'it("should support logical null coalescing assignment expression"',
				'it("should support logical or assignment expression"',
			);
			expectSequence(nullishExpr, ["if x == nil then", "x = true", "local _to = expect(x).to", "_to.equal(true)"]);

			const orExpr = sliceBetween(
				luau,
				'it("should support logical or assignment expression"',
				'it("should support logical and assignment expression"',
			);
			expectSequence(orExpr, ["local _condition = x", "if not x then", "_condition = true", "x = _condition"]);

			const andExpr = sliceBetween(luau, 'it("should support logical and assignment expression"');
			expectSequence(andExpr, ["local _condition = x", "if x then", "_condition = false", "x = _condition"]);
		}
	});
});
