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

	// clean outDir between test runs
	fs.removeSync(program.getCompilerOptions().outDir!);

	it("should copy include files", () => copyInclude(data));

	it("should copy non-compiled files", () =>
		copyFiles(data, pathTranslator, new Set(getRootDirs(program.getCompilerOptions()))));

	const diagnosticsFolder = path.join(PACKAGE_ROOT, "tests", "src", "diagnostics");

	const sourceFiles = getChangedSourceFiles(program);
	console.log("Files to compile:", sourceFiles.map(sf => path.relative(process.cwd(), sf.fileName)).join(", "));

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
				fs.appendFileSync("debug_log.txt", `Compiling Diagnostic: ${fileName}\n`);
				const emitResult = compileFiles(program.getProgram(), data, pathTranslator, [sourceFile]);
				fs.appendFileSync("debug_log.txt", `Finished Diagnostic: ${fileName}\n`);
				delete process.env.ROBLOX_TS_EXPECTED_DIAGNOSTIC_ID;
				if (
					emitResult.diagnostics.length > 0 &&
					emitResult.diagnostics.every(d => getDiagnosticId(d) === expectedId)
				) {
					done();
				} else if (emitResult.diagnostics.length === 0) {
					const msg = `Expected diagnostic ${diagnosticName} to be reported.`;
					fs.appendFileSync("debug_log.txt", `FAILURE: ${fileName} - ${msg}\n`);
					done(new Error(msg));
				} else {
					const msg = "Unexpected diagnostics:\n" + formatDiagnostics(emitResult.diagnostics);
					fs.appendFileSync("debug_log.txt", `FAILURE: ${fileName} - ${msg}\n`);
					done(new Error(msg));
				}
			});
		} else {
			it(`should compile ${fileName}`, done => {
				fs.appendFileSync("debug_log.txt", `Compiling: ${fileName}\n`);
				const emitResult = compileFiles(program.getProgram(), data, pathTranslator, [sourceFile]);
				fs.appendFileSync("debug_log.txt", `Finished: ${fileName}\n`);
				if (emitResult.diagnostics.length > 0) {
					const msg = "\n" + formatDiagnostics(emitResult.diagnostics);
					fs.appendFileSync("debug_log.txt", `FAILURE: ${fileName} - ${msg}\n`);
					done(new Error(msg));
				} else {
					done();
				}
			});
		}
	}
});
