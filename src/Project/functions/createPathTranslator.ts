import { PathTranslator } from "@roblox-ts/path-translator";
import path from "path";
import { ProjectData } from "Shared/types";
import { findAncestorDir } from "Shared/util/findAncestorDir";
import { getRootDirs } from "Shared/util/getRootDirs";
import ts from "typescript";

/** Adapts the TS-only path translator when JavaScript compilation is enabled. */
export class JavaScriptPathTranslator extends PathTranslator {
	private getJavaScriptPath(filePath: string, extension: string, renameIndex: boolean, isNodeModule = false) {
		if (!/\.jsx?$/.test(filePath)) {
			return undefined;
		}
		const parsed = path.parse(filePath);
		const parts = parsed.name.split(".");
		if (renameIndex && parts[0] === "index") {
			parts[0] = "init";
		}
		const translated = path.join(parsed.dir, parts.join(".") + extension);
		return isNodeModule ? translated : path.join(this.outDir, path.relative(this.rootDir, translated));
	}

	public override getOutputPath(filePath: string) {
		return (
			this.getJavaScriptPath(filePath, this.useLuauExtension ? ".luau" : ".lua", true) ??
			super.getOutputPath(filePath)
		);
	}

	public override getOutputDeclarationPath(filePath: string) {
		return this.getJavaScriptPath(filePath, ".d.ts", false) ?? super.getOutputDeclarationPath(filePath);
	}

	public override getImportPath(filePath: string, isNodeModule = false) {
		return (
			this.getJavaScriptPath(filePath, this.useLuauExtension ? ".luau" : ".lua", true, isNodeModule) ??
			super.getImportPath(filePath, isNodeModule)
		);
	}

	public override getInputPaths(filePath: string) {
		const inputs = super.getInputPaths(filePath);
		const extension = this.useLuauExtension ? ".luau" : ".lua";
		let names: Array<string> = [];
		if (filePath.endsWith(extension)) {
			const stem = filePath.slice(0, -extension.length);
			const parsed = path.parse(stem);
			const parts = parsed.base.split(".");
			if (parts[0] !== "index") {
				names = [stem];
				if (parts[0] === "init") {
					parts[0] = "index";
					names.push(path.join(parsed.dir, parts.join(".")));
				}
			}
		} else if (this.declaration && filePath.endsWith(".d.ts")) {
			names = [filePath.slice(0, -".d.ts".length)];
		}
		for (const name of names) {
			const input = path.join(this.rootDir, path.relative(this.outDir, name));
			inputs.push(input + ".js", input + ".jsx");
		}
		return inputs;
	}
}

export function createPathTranslator(program: ts.BuilderProgram, data: ProjectData) {
	const compilerOptions = program.getCompilerOptions();
	const rootDir = findAncestorDir([program.getProgram().getCommonSourceDirectory(), ...getRootDirs(compilerOptions)]);
	const outDir = compilerOptions.outDir!;
	let buildInfoPath = ts.getTsBuildInfoEmitOutputFilePath(compilerOptions);
	if (buildInfoPath !== undefined) {
		buildInfoPath = path.normalize(buildInfoPath);
	}
	const declaration = ts.getEmitDeclarations(compilerOptions);
	const Translator = compilerOptions.allowJs === true ? JavaScriptPathTranslator : PathTranslator;
	return new Translator(rootDir, outDir, buildInfoPath, declaration, data.projectOptions.luau);
}
