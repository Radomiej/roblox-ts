import { spawnSync } from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { compileFiles } from "Project/functions/compileFiles";
import { copyInclude } from "Project/functions/copyInclude";
import { createPathTranslator } from "Project/functions/createPathTranslator";
import { createProjectData } from "Project/functions/createProjectData";
import { createProjectProgram } from "Project/functions/createProjectProgram";
import { LogService } from "Shared/classes/LogService";
import { DEFAULT_PROJECT_OPTIONS, PACKAGE_ROOT, ProjectType } from "Shared/constants";
import { formatDiagnostics } from "Shared/util/formatDiagnostics";

const fixtureDirectory = path.join(PACKAGE_ROOT, "tests", "ts-mutation", "fixture");
const testTypes = process.env.RBXTS_TEST_TYPES_ROOT ?? path.join(PACKAGE_ROOT, "tests", "node_modules", "@rbxts");

function runCompilerFixture(fixtureName: string, projectName: string) {
	const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), `rbxts-ts-mutation-${projectName}-`));
	try {
		const srcDir = path.join(projectPath, "src");
		const outDir = path.join(projectPath, "out");
		const includePath = path.join(projectPath, "include");
		const mainScriptName = fixtureName.replace(".ts", ".luau");
		fs.ensureDirSync(srcDir);
		fs.copyFileSync(path.join(fixtureDirectory, fixtureName), path.join(srcDir, fixtureName));
		fs.writeJsonSync(path.join(projectPath, "package.json"), { name: `ts-mutation-${projectName}` });
		fs.writeJsonSync(path.join(projectPath, "tsconfig.json"), {
			compilerOptions: {
				allowSyntheticDefaultImports: true,
				downlevelIteration: true,
				module: "commonjs",
				moduleResolution: "Node",
				moduleDetection: "force",
				noLib: true,
				rootDir: srcDir,
				outDir,
				target: "ESNext",
				typeRoots: [testTypes],
				strict: true,
			},
			include: [path.join(srcDir, "**/*.ts")],
		});
		fs.writeJsonSync(path.join(projectPath, "default.project.json"), {
			name: `ts-mutation-${projectName}`,
			tree: {
				$className: "DataModel",
				ReplicatedStorage: {
					$className: "ReplicatedStorage",
					include: { $path: includePath },
				},
				ServerScriptService: {
					$className: "ServerScriptService",
					main: { $path: path.join(outDir, mainScriptName) },
				},
			},
		});

		const data = createProjectData(path.join(projectPath, "tsconfig.json"), {
			...DEFAULT_PROJECT_OPTIONS,
			includePath,
			rojo: path.join(projectPath, "default.project.json"),
			type: ProjectType.Game,
		});
		copyInclude(data);
		const program = createProjectProgram(data);
		const pathTranslator = createPathTranslator(program, data);
		const sourceFile = program.getProgram().getSourceFile(path.join(srcDir, fixtureName));
		expect(sourceFile).toBeDefined();
		const result = compileFiles(program.getProgram(), data, pathTranslator, [sourceFile!]);
		if (result.diagnostics.length > 0) throw new Error(formatDiagnostics(result.diagnostics));

		const env = {
			...process.env,
			PATH: [process.env.RBXTS_TOOL_BIN ?? path.join(PACKAGE_ROOT, "..", ".roblox-env", "bin"), process.env.PATH]
				.filter(Boolean)
				.join(path.delimiter),
		};
		const placePath = path.join(projectPath, "fixture.rbxl");
		const build = spawnSync("rojo", ["build", projectPath, "-o", placePath], {
			cwd: PACKAGE_ROOT,
			env,
			encoding: "utf8",
			timeout: 10000,
		});
		expect(build.status).toBe(0);
		const run = spawnSync("lune", ["run", path.join(PACKAGE_ROOT, "tests", "runTestsWithLune.luau"), placePath], {
			cwd: PACKAGE_ROOT,
			env,
			encoding: "utf8",
			timeout: 15000,
		});
		if (run.status !== 0) {
			throw new Error(run.error?.message ?? `${run.stdout}\n${run.stderr}`);
		}
	} finally {
		fs.removeSync(projectPath);
	}
}

describe("TypeScript compiler mutations", () => {
	it("preserves generator yield and delegation behavior when run by Lune", () => {
		runCompilerFixture("main.server.ts", "yield");
	});

	it("preserves complex expression evaluation order when run by Lune", () => {
		runCompilerFixture("evaluation.server.ts", "evaluation");
	});

	it.each(["@example_/package", "@my.org/package", "@a~b/package"])("classifies scoped package name %s", name => {
		const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "rbxts-ts-mutation-package-"));
		try {
			fs.writeJsonSync(path.join(projectPath, "package.json"), { name });
			const data = createProjectData(path.join(projectPath, "tsconfig.json"), { ...DEFAULT_PROJECT_OPTIONS });
			expect(data.isPackage).toBe(true);
		} finally {
			fs.removeSync(projectPath);
		}
	});

	it.each(["@/package", "@Bad Scope/pkg", "@../pkg", "@.hidden/pkg", "@scope/pkg/extra", "prefix@scope/pkg"])(
		"rejects malformed scoped package name %s",
		name => {
			const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "rbxts-ts-mutation-package-"));
			try {
				fs.writeJsonSync(path.join(projectPath, "package.json"), { name });
				const data = createProjectData(path.join(projectPath, "tsconfig.json"), { ...DEFAULT_PROJECT_OPTIONS });
				expect(data.isPackage).toBe(false);
			} finally {
				fs.removeSync(projectPath);
			}
		},
	);

	it("requires package metadata to exist", () => {
		const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "rbxts-ts-mutation-project-"));
		try {
			expect(() =>
				createProjectData(path.join(projectPath, "tsconfig.json"), { ...DEFAULT_PROJECT_OPTIONS }),
			).toThrow("Unable to find package.json");
		} finally {
			fs.removeSync(projectPath);
		}
	});

	it("uses project defaults when package metadata is invalid or options are empty", () => {
		const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "rbxts-ts-mutation-project-"));
		try {
			fs.writeFileSync(path.join(projectPath, "package.json"), "not valid JSON");
			const options = { ...DEFAULT_PROJECT_OPTIONS, includePath: "" };
			const data = createProjectData(path.join(projectPath, "tsconfig.json"), options);
			expect(data.isPackage).toBe(false);
			expect(data.projectOptions.includePath).toBe(path.join(projectPath, "include"));
			expect(data.nodeModulesPath).toBe(path.join(projectPath, "node_modules"));
			expect(data.rojoConfigPath).toBeUndefined();
		} finally {
			fs.removeSync(projectPath);
		}
	});

	it("resolves explicit include and Rojo paths relative to the process directory", () => {
		const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "rbxts-ts-mutation-project-"));
		try {
			fs.writeJsonSync(path.join(projectPath, "package.json"), { name: "game" });
			const includePath = path.join(projectPath, "custom-include");
			const rojoPath = path.join(projectPath, "custom.project.json");
			const data = createProjectData(path.join(projectPath, "tsconfig.json"), {
				...DEFAULT_PROJECT_OPTIONS,
				includePath,
				rojo: rojoPath,
			});
			expect(data.projectOptions.includePath).toBe(includePath);
			expect(data.rojoConfigPath).toBe(rojoPath);
		} finally {
			fs.removeSync(projectPath);
		}
	});

	it("reports ambiguity while choosing an automatically discovered Rojo project", () => {
		const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "rbxts-ts-mutation-project-"));
		const warn = jest.spyOn(LogService, "warn").mockImplementation(() => {});
		try {
			fs.writeJsonSync(path.join(projectPath, "package.json"), { name: "game" });
			fs.writeJsonSync(path.join(projectPath, "a.project.json"), {});
			fs.writeJsonSync(path.join(projectPath, "b.project.json"), {});
			const data = createProjectData(path.join(projectPath, "tsconfig.json"), { ...DEFAULT_PROJECT_OPTIONS });
			expect(data.rojoConfigPath).toMatch(/\.project\.json$/);
			expect(warn).toHaveBeenCalledWith(expect.stringContaining("Multiple *.project.json files found"));
		} finally {
			warn.mockRestore();
			fs.removeSync(projectPath);
		}
	});
});
