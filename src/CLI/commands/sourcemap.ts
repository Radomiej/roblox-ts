import { CLIError } from "CLI/errors/CLIError";
import fs from "fs-extra";
import path from "path";
import { createPathTranslator } from "Project/functions/createPathTranslator";
import { createProjectData } from "Project/functions/createProjectData";
import { createProjectProgram } from "Project/functions/createProjectProgram";
import { LogService } from "Shared/classes/LogService";
import ts from "typescript";
import type yargs from "yargs";

interface SourcemapEntry {
	/** Original TypeScript source file path */
	source: string;
	/** Compiled Luau output file path */
	output: string;
	/** Line mappings: output line -> source line */
	lines?: Record<number, number>;
}

interface SourcemapOutput {
	version: 1;
	compiler: string;
	generated: string;
	mappings: Array<SourcemapEntry>;
}

interface SourcemapFlags {
	project: string;
	output?: string;
	verbose?: boolean;
}

function findTsConfigPath(projectPath: string) {
	let tsConfigPath: string | undefined = path.resolve(projectPath);
	if (!fs.existsSync(tsConfigPath) || !fs.statSync(tsConfigPath).isFile()) {
		tsConfigPath = ts.findConfigFile(tsConfigPath, ts.sys.fileExists);
		if (tsConfigPath === undefined) {
			throw new CLIError("Unable to find tsconfig.json!");
		}
	}
	return path.resolve(process.cwd(), tsConfigPath);
}

/**
 * Defines the behavior for the `rbxtsc sourcemap` command.
 */
export = ts.identity<yargs.CommandModule<object, SourcemapFlags>>({
	command: "sourcemap",

	describe: "Generate a sourcemap JSON file mapping compiled Luau files back to TypeScript sources",

	builder: (parser: yargs.Argv) =>
		parser
			.option("project", {
				alias: "p",
				string: true,
				default: ".",
				describe: "project path",
			})
			.option("output", {
				alias: "o",
				string: true,
				describe: "output file path (defaults to stdout)",
			})
			.option("verbose", {
				boolean: true,
				describe: "enable verbose logs",
			}),

	handler: async argv => {
		try {
			const tsConfigPath = findTsConfigPath(argv.project);

			LogService.verbose = argv.verbose === true;

			const data = createProjectData(tsConfigPath, {
				includePath: "",
				rojo: undefined,
				type: undefined,
				watch: false,
				usePolling: false,
				verbose: argv.verbose ?? false,
				noInclude: false,
				logTruthyChanges: false,
				writeOnlyChanged: false,
				writeTransformedFiles: false,
				optimizedLoops: true,
				allowCommentDirectives: false,
				luau: true,
			});

			const program = createProjectProgram(data);
			const pathTranslator = createPathTranslator(program, data);

			const mappings: Array<SourcemapEntry> = [];

			for (const sourceFile of program.getProgram().getSourceFiles()) {
				if (sourceFile.isDeclarationFile) continue;
				if (sourceFile.fileName.includes("node_modules")) continue;

				const outputPath = pathTranslator.getOutputPath(sourceFile.fileName);
				if (outputPath) {
					mappings.push({
						source: path.relative(data.projectPath, sourceFile.fileName).replace(/\\/g, "/"),
						output: path.relative(data.projectPath, outputPath).replace(/\\/g, "/"),
					});
				}
			}

			const sourcemap: SourcemapOutput = {
				version: 1,
				compiler: "roblox-ts",
				generated: new Date().toISOString(),
				mappings,
			};

			const jsonOutput = JSON.stringify(sourcemap, null, "\t");

			if (argv.output) {
				await fs.writeFile(argv.output, jsonOutput);
				LogService.writeLine(`Sourcemap written to ${argv.output}`);
			} else {
				process.stdout.write(jsonOutput + "\n");
			}
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
