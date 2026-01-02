import { renderAST } from "@roblox-ts/luau-ast";
import { PathTranslator } from "@roblox-ts/path-translator";
import { NetworkType, RbxPath, RojoResolver } from "@roblox-ts/rojo-resolver";
import fs from "fs-extra";
import path from "path";
import { checkFileName } from "Project/functions/checkFileName";
import { checkRojoConfig } from "Project/functions/checkRojoConfig";
import { createNodeModulesPathMapping } from "Project/functions/createNodeModulesPathMapping";
import transformPathsTransformer from "Project/transformers/builtin/transformPaths";
import { transformTypeReferenceDirectives } from "Project/transformers/builtin/transformTypeReferenceDirectives";
import { createTransformerList, flattenIntoTransformers } from "Project/transformers/createTransformerList";
import { createTransformerWatcher } from "Project/transformers/createTransformerWatcher";
import { getPluginConfigs } from "Project/transformers/getPluginConfigs";
import { getCustomPreEmitDiagnostics } from "Project/util/getCustomPreEmitDiagnostics";
import { LogService } from "Shared/classes/LogService";
import { PACKAGE_ROOT, ProjectType } from "Shared/constants";
import { ProjectData } from "Shared/types";
import { assert } from "Shared/util/assert";
import { benchmarkIfVerbose } from "Shared/util/benchmark";
import { createTextDiagnostic } from "Shared/util/createTextDiagnostic";
import { getRootDirs } from "Shared/util/getRootDirs";
import { hasErrors } from "Shared/util/hasErrors";
import { MultiTransformState, transformSourceFile, TransformState } from "TSTransformer";
import { DiagnosticService } from "TSTransformer/classes/DiagnosticService";
import { createTransformServices } from "TSTransformer/util/createTransformServices";
import ts from "typescript";

function inferProjectType(data: ProjectData, rojoResolver: RojoResolver): ProjectType {
	if (data.isPackage) {
		return ProjectType.Package;
	} else if (rojoResolver.isGame) {
		return ProjectType.Game;
	} else {
		return ProjectType.Model;
	}
}

function emitResultFailure(messageText: string): ts.EmitResult {
	return {
		emitSkipped: true,
		diagnostics: [createTextDiagnostic(messageText)],
	};
}

/**
 * 'transpiles' TypeScript project into a logically identical Luau project.
 *
 * writes rendered Luau source to the out directory.
 */
export function compileFiles(
	program: ts.Program,
	data: ProjectData,
	pathTranslator: PathTranslator,
	sourceFiles: Array<ts.SourceFile>,
): ts.EmitResult {
	const compilerOptions = program.getCompilerOptions();

	const multiTransformState = new MultiTransformState();

	const outDir = compilerOptions.outDir!;

	const rojoResolver = data.rojoConfigPath
		? RojoResolver.fromPath(data.rojoConfigPath)
		: RojoResolver.synthetic(outDir);

	for (const warning of rojoResolver.getWarnings()) {
		LogService.warn(warning);
	}

	checkRojoConfig(data, rojoResolver, getRootDirs(compilerOptions), pathTranslator);

	for (const sourceFile of program.getSourceFiles()) {
		if (!path.normalize(sourceFile.fileName).startsWith(data.nodeModulesPath)) {
			checkFileName(sourceFile.fileName);
		}
	}

	const pkgRojoResolvers = compilerOptions.typeRoots!.map(RojoResolver.synthetic);
	const nodeModulesPathMapping = createNodeModulesPathMapping(compilerOptions.typeRoots!);

	const projectType = data.projectOptions.type ?? inferProjectType(data, rojoResolver);

	if (projectType !== ProjectType.Package && data.rojoConfigPath === undefined) {
		return emitResultFailure("Non-package projects must have a Rojo project file!");
	}

	let runtimeLibRbxPath: RbxPath | undefined;
	if (projectType !== ProjectType.Package) {
		runtimeLibRbxPath = rojoResolver.getRbxPathFromFilePath(
			path.join(data.projectOptions.includePath, "RuntimeLib.luau"),
		);
		if (!runtimeLibRbxPath) {
			return emitResultFailure("Rojo project contained no data for include folder!");
		} else if (rojoResolver.getNetworkType(runtimeLibRbxPath) !== NetworkType.Unknown) {
			return emitResultFailure("Runtime library cannot be in a server-only or client-only container!");
		} else if (rojoResolver.isIsolated(runtimeLibRbxPath)) {
			return emitResultFailure("Runtime library cannot be in an isolated container!");
		}
	}

	if (DiagnosticService.hasErrors()) return { emitSkipped: true, diagnostics: DiagnosticService.flush() };

	LogService.writeLineIfVerbose(`compiling as ${projectType}..`);

	const fileWriteQueue = new Array<{ sourceFile: ts.SourceFile; source: string }>();
	const progressMaxLength = `${sourceFiles.length}/${sourceFiles.length}`.length;

	let proxyProgram = program;

	if (compilerOptions.plugins && compilerOptions.plugins.length > 0) {
		benchmarkIfVerbose(`running transformers..`, () => {
			const pluginConfigs = getPluginConfigs(data.tsConfigPath);
			const transformerList = createTransformerList(program, pluginConfigs, data.projectPath);
			const transformers = flattenIntoTransformers(transformerList);
			if (transformers.length > 0) {
				const { service, updateFile } = (data.transformerWatcher ??= createTransformerWatcher(program));
				const transformResult = ts.transformNodes(
					undefined,
					undefined,
					ts.factory,
					compilerOptions,
					sourceFiles,
					transformers,
					false,
				);

				if (transformResult.diagnostics) DiagnosticService.addDiagnostics(transformResult.diagnostics);

				for (const sourceFile of transformResult.transformed) {
					if (ts.isSourceFile(sourceFile)) {
						// transformed nodes don't have symbol or type information (or they have out of date information)
						// there's no way to "rebind" an existing file, so we have to reprint it
						const source = ts.createPrinter().printFile(sourceFile);
						updateFile(sourceFile.fileName, source);
						if (data.projectOptions.writeTransformedFiles) {
							const outPath = pathTranslator.getOutputTransformedPath(sourceFile.fileName);
							fs.outputFileSync(outPath, source);
						}
					}
				}

				proxyProgram = service.getProgram()!;
			}
		});
	}

	if (DiagnosticService.hasErrors()) return { emitSkipped: true, diagnostics: DiagnosticService.flush() };

	const typeChecker = proxyProgram.getTypeChecker();
	const services = createTransformServices(typeChecker);

	for (let i = 0; i < sourceFiles.length; i++) {
		const originalSourceFile = sourceFiles[i];
		const sourceFile = proxyProgram.getSourceFile(sourceFiles[i].fileName);
		assert(sourceFile);
		const progress = `${i + 1}/${sourceFiles.length}`.padStart(progressMaxLength);
		benchmarkIfVerbose(`${progress} compile ${path.relative(process.cwd(), sourceFile.fileName)}`, () => {
			const proxyDiagnostics = ts.getPreEmitDiagnostics(proxyProgram, sourceFile);
			if (sourceFile !== originalSourceFile && hasErrors(proxyDiagnostics)) {
				// The transformed source file has diagnostics, but we want to present the original diagnostic spans.
				// If the original file doesn't have diagnostics, the diagnostics are caused by a transformer and we display them instead.
				const sourceDiagnostics = ts.getPreEmitDiagnostics(program, originalSourceFile);
				DiagnosticService.addDiagnostics(hasErrors(sourceDiagnostics) ? sourceDiagnostics : proxyDiagnostics);
			} else {
				DiagnosticService.addDiagnostics(proxyDiagnostics);
			}

			DiagnosticService.addDiagnostics(getCustomPreEmitDiagnostics(data, sourceFile));
			if (DiagnosticService.hasErrors()) return;

			const transformState = new TransformState(
				proxyProgram,
				data,
				services,
				pathTranslator,
				multiTransformState,
				compilerOptions,
				rojoResolver,
				pkgRojoResolvers,
				nodeModulesPathMapping,
				runtimeLibRbxPath,
				typeChecker,
				projectType,
				sourceFile,
			);

			const luauAST = transformSourceFile(transformState, sourceFile);
			if (DiagnosticService.hasErrors()) return;

			const source = renderAST(luauAST);

			fileWriteQueue.push({ sourceFile, source });
		});
	}

	if (DiagnosticService.hasErrors()) return { emitSkipped: true, diagnostics: DiagnosticService.flush() };

	const emittedFiles = new Array<string>();
	const sourcemapData: Record<string, { source: string; lines: Record<string, number> }> = {};

	if (fileWriteQueue.length > 0) {
		benchmarkIfVerbose("writing compiled files", () => {
			const afterDeclarations = compilerOptions.declaration
				? [transformTypeReferenceDirectives, transformPathsTransformer(program, {})]
				: undefined;
			for (const { sourceFile, source } of fileWriteQueue) {
				const outPath = pathTranslator.getOutputPath(sourceFile.fileName);
				if (
					!data.projectOptions.writeOnlyChanged ||
					!fs.pathExistsSync(outPath) ||
					fs.readFileSync(outPath).toString() !== source
				) {
					fs.outputFileSync(outPath, source);
					emittedFiles.push(outPath);
				}
				if (compilerOptions.declaration) {
					proxyProgram.emit(sourceFile, ts.sys.writeFile, undefined, true, { afterDeclarations });
				}

				// Generate sourcemap data if enabled
				if (data.projectOptions.sourcemap) {
					const relativePath = path.relative(compilerOptions.outDir!, outPath).replace(/\\/g, "/");
					const sourceRelativePath = path.relative(data.projectPath, sourceFile.fileName).replace(/\\/g, "/");

					// Build line mapping using TS source positions
					const lines: Record<string, number> = {};
					const luaLines = source.split("\n");
					const tsLineCount = sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1;
					const luaLineCount = luaLines.length;

					// Calculate ratio for approximate mapping
					const ratio = tsLineCount / luaLineCount;

					// Find key landmarks in Lua source for better accuracy
					const functionMatches: Array<{ luaLine: number; name: string }> = [];
					for (let i = 0; i < luaLines.length; i++) {
						const line = luaLines[i];
						// Match function declarations: "function name(" or "local function name("
						const funcMatch = line.match(/(?:local\s+)?function\s+(\w+(?::\w+)?)\s*\(/);
						if (funcMatch) {
							functionMatches.push({ luaLine: i + 1, name: funcMatch[1] });
						}
					}

					// Try to match Lua functions to TS functions for accurate mapping
					const tsFunctions: Array<{ line: number; name: string }> = [];
					ts.forEachChild(sourceFile, function visit(node) {
						if (ts.isFunctionDeclaration(node) && node.name) {
							const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
							tsFunctions.push({ line: pos.line + 1, name: node.name.text });
						} else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
							const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
							tsFunctions.push({ line: pos.line + 1, name: node.name.text });
						} else if (ts.isClassDeclaration(node) && node.name) {
							const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
							tsFunctions.push({ line: pos.line + 1, name: node.name.text });
						}
						ts.forEachChild(node, visit);
					});

					// Build mapping with landmarks for better accuracy
					const landmarks: Array<{ luaLine: number; tsLine: number }> = [];

					// Match functions by name
					for (const luaFunc of functionMatches) {
						const tsFunc = tsFunctions.find(
							f =>
								luaFunc.name === f.name ||
								luaFunc.name.endsWith(":" + f.name) ||
								luaFunc.name === f.name.replace(/^_+/, ""),
						);
						if (tsFunc) {
							landmarks.push({ luaLine: luaFunc.luaLine, tsLine: tsFunc.line });
						}
					}

					// Sort landmarks by Lua line
					landmarks.sort((a, b) => a.luaLine - b.luaLine);

					// Generate line mapping
					for (let luaLine = 1; luaLine <= luaLineCount; luaLine++) {
						let tsLine: number;

						if (landmarks.length === 0) {
							// No landmarks, use ratio-based mapping
							tsLine = Math.min(Math.max(1, Math.round(luaLine * ratio)), tsLineCount);
						} else {
							// Find surrounding landmarks and interpolate
							const before = landmarks.filter(l => l.luaLine <= luaLine).pop();
							const after = landmarks.find(l => l.luaLine > luaLine);

							if (before && after) {
								// Interpolate between landmarks
								const luaRange = after.luaLine - before.luaLine;
								const tsRange = after.tsLine - before.tsLine;
								const luaOffset = luaLine - before.luaLine;
								tsLine = Math.round(before.tsLine + (luaOffset / luaRange) * tsRange);
							} else if (before) {
								// After last landmark, use ratio from that point
								const luaOffset = luaLine - before.luaLine;
								tsLine = Math.min(before.tsLine + Math.round(luaOffset * ratio), tsLineCount);
							} else if (after) {
								// Before first landmark, use ratio to that point
								const luaRatio = luaLine / after.luaLine;
								tsLine = Math.max(1, Math.round(after.tsLine * luaRatio));
							} else {
								tsLine = Math.min(Math.max(1, Math.round(luaLine * ratio)), tsLineCount);
							}

							// Clamp to valid range
							tsLine = Math.min(Math.max(1, tsLine), tsLineCount);
						}

						lines[String(luaLine)] = tsLine;
					}

					sourcemapData[relativePath] = {
						source: sourceRelativePath,
						lines,
					};
				}
			}
		});
	}

	// Write sourcemap file if enabled
	if (data.projectOptions.sourcemap && Object.keys(sourcemapData).length > 0) {
		benchmarkIfVerbose("writing sourcemap", () => {
			const packageJson = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"));

			// Convert to Lua table format
			let luaTable = "{\n";
			for (const [filePath, mapping] of Object.entries(sourcemapData)) {
				luaTable += `\t["${filePath}"] = {\n`;
				luaTable += `\t\tsource = "${mapping.source}",\n`;
				luaTable += `\t\tlines = {\n`;
				for (const [luaLine, tsLine] of Object.entries(mapping.lines)) {
					luaTable += `\t\t\t["${luaLine}"] = ${tsLine},\n`;
				}
				luaTable += `\t\t},\n`;
				luaTable += `\t},\n`;
			}
			luaTable += "}";

			const sourcemapContent = `-- Generated by roblox-ts v${packageJson.version}
-- Sourcemap for runtime error mapping
return {
	mappings = ${luaTable}
}
`;
			const sourcemapPath = path.join(data.projectOptions.includePath, "Sourcemap.luau");
			fs.outputFileSync(sourcemapPath, sourcemapContent);
			LogService.writeLineIfVerbose(`Sourcemap written to ${sourcemapPath}`);
		});
	}

	program.emitBuildInfo();

	return { emittedFiles, emitSkipped: false, diagnostics: DiagnosticService.flush() };
}
