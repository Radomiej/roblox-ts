import { spawnSync } from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { compileFiles } from "Project/functions/compileFiles";
import { copyInclude } from "Project/functions/copyInclude";
import { createPathTranslator } from "Project/functions/createPathTranslator";
import { createProjectData } from "Project/functions/createProjectData";
import { createProjectProgram } from "Project/functions/createProjectProgram";
import { DEFAULT_PROJECT_OPTIONS, PACKAGE_ROOT, ProjectType } from "Shared/constants";
import { formatDiagnostics } from "Shared/util/formatDiagnostics";
import vm from "vm";

const testTypes = process.env.RBXTS_TEST_TYPES_ROOT ?? path.join(PACKAGE_ROOT, "tests", "node_modules", "@rbxts");
const toolBin = process.env.RBXTS_TOOL_BIN ?? path.join(PACKAGE_ROOT, "..", ".roblox-env", "bin");
const traceToken = "__RBXTS_PROPERTY_TRACE_7E2048D5__";

type TraceValue = string | number;

function runNode(program: string, index: number): Array<TraceValue> {
	const values: Array<TraceValue> = [];
	const context = {
		print: (...args: Array<unknown>) => {
			if (args.length !== 1 || (typeof args[0] !== "string" && typeof args[0] !== "number")) {
				throw new TypeError("property programs must call print with one string or number");
			}
			values.push(args[0]);
		},
	};
	vm.runInNewContext(`(() => {\n${program}\n})()`, context, {
		filename: `property-program-${index}.js`,
		timeout: 250,
	});
	return values;
}

function makeProject(projectPath: string, programs: ReadonlyArray<string>) {
	const sourcePath = path.join(projectPath, "src", "main.server.js");
	fs.ensureDirSync(path.dirname(sourcePath));
	fs.ensureDirSync(path.join(projectPath, "include"));
	fs.writeJsonSync(path.join(projectPath, "package.json"), { name: "@rbxts/property-harness" });
	fs.writeJsonSync(path.join(projectPath, "tsconfig.json"), {
		compilerOptions: {
			allowJs: true,
			allowSyntheticDefaultImports: true,
			checkJs: true,
			module: "commonjs",
			moduleResolution: "Node",
			moduleDetection: "force",
			noLib: true,
			rootDir: path.join(projectPath, "src"),
			outDir: path.join(projectPath, "out"),
			target: "ESNext",
			typeRoots: [testTypes],
			strict: true,
		},
		include: [path.join(projectPath, "src", "**/*.js")],
	});
	fs.writeFileSync(
		sourcePath,
		[
			"/** @typedef {(...args: (string | number)[]) => void} TracePrint */",
			"const __writeTrace = print;",
			...programs.flatMap((program, index) => [
				`/** @param {TracePrint} print */ const __run${index} = print => {`,
				program,
				"};",
				`__run${index}((...args) => __writeTrace(${JSON.stringify(traceToken)}, ${index}, args[0]));`,
			]),
		].join("\n"),
	);
	fs.writeJsonSync(path.join(projectPath, "default.project.json"), {
		name: "property-harness",
		tree: {
			$className: "DataModel",
			ServerScriptService: {
				$className: "ServerScriptService",
				main: { $path: path.join(projectPath, "out", "main.server.luau") },
			},
			ReplicatedStorage: {
				$className: "ReplicatedStorage",
				include: { $path: path.join(projectPath, "include") },
			},
		},
	});

	return sourcePath;
}

function compile(projectPath: string, sourcePath: string) {
	const includePath = path.join(projectPath, "include");
	const data = createProjectData(path.join(projectPath, "tsconfig.json"), {
		...DEFAULT_PROJECT_OPTIONS,
		includePath,
		rojo: path.join(projectPath, "default.project.json"),
		type: ProjectType.Game,
	});
	copyInclude(data);
	const program = createProjectProgram(data);
	const pathTranslator = createPathTranslator(program, data);
	const sourceFile = program.getProgram().getSourceFile(sourcePath);
	if (!sourceFile) {
		throw new Error(`could not load generated JavaScript source ${sourcePath}`);
	}
	const result = compileFiles(program.getProgram(), data, pathTranslator, [sourceFile]);
	if (result.diagnostics.length > 0) {
		throw new Error(formatDiagnostics(result.diagnostics));
	}
}

function makeRunner(projectPath: string) {
	const runnerPath = path.join(projectPath, "traceRunner.luau");
	fs.writeFileSync(
		runnerPath,
		`local roblox = require("@lune/roblox")
local fs = require("@lune/fs")
local luau = require("@lune/luau")
local process = require("@lune/process")
local stdio = require("@lune/stdio")
local task = require("@lune/task")

local token = "${traceToken}"
local place = roblox.deserializePlace(fs.readFile(process.args[1]))
local records = {}

local function tableJoin(...)
	local result = {}
	for i = 1, select("#", ...) do
		for k, v in select(i, ...) do
			result[k] = v
		end
	end
	return result
end

local function capturePrint(...)
	local values = table.pack(...)
	if values[1] == token then
		table.insert(records, { index = values[2], value = values[3] })
	end
end

local game = place
game:GetService("Workspace")
roblox.implementMethod("Instance", "WaitForChild", function(self, ...)
	return self:FindFirstChild(...)
end)
roblox.implementProperty("RunService", "Heartbeat", function()
	return {}
end, function() end)

local SharedTable = {}
function SharedTable.new()
	return setmetatable({ items = {} }, {
		__index = function(self, key) return self.items[key] end,
		__newindex = function(self, key, value) self.items[key] = value end,
		__iter = function(self) return next, self.items end,
	})
end

local robloxRequire
local function runRobloxScript(script)
	local callable = luau.load(luau.compile(script.Source), {
		debugName = script:GetFullName(),
		environment = tableJoin(roblox, {
			game = game,
			script = script,
			require = robloxRequire,
			tick = os.clock,
			task = task,
			SharedTable = SharedTable,
			vector = { create = vector },
			print = capturePrint,
		}),
	})
	return callable()
end

local requireCache = {}
function robloxRequire(moduleScript)
	local scriptPath = moduleScript:GetFullName()
	local cached = requireCache[scriptPath]
	if cached then
		return table.unpack(cached)
	end
	local result = table.pack(runRobloxScript(moduleScript))
	requireCache[scriptPath] = result
	return table.unpack(result)
end

runRobloxScript(game:GetService("ServerScriptService"):FindFirstChild("main"))

for _, record in records do
	local value = record.value
	local kind = typeof(value)
	local encoded
	if kind == "string" then
		local bytes = {}
		for i = 1, #value do
			table.insert(bytes, string.format("%02x", string.byte(value, i)))
		end
		encoded = table.concat(bytes)
	elseif kind == "number" then
		if value ~= value then
			encoded = "nan"
		elseif value == math.huge then
			encoded = "+inf"
		elseif value == -math.huge then
			encoded = "-inf"
		elseif value == 0 and 1 / value == -math.huge then
			encoded = "-0"
		else
			encoded = string.format("%.17g", value)
		end
	else
		error("property print received unsupported value type " .. kind)
	end
	stdio.write(token .. "\\t" .. tostring(record.index) .. "\\t" .. kind .. "\\t" .. encoded .. "\\n")
end
`,
	);
	return runnerPath;
}

function runLuau(projectPath: string, programs: ReadonlyArray<string>): Array<Array<TraceValue>> {
	const env = {
		...process.env,
		PATH: [toolBin, process.env.PATH].filter(Boolean).join(path.delimiter),
	};
	const placePath = path.join(projectPath, "property.rbxl");
	const build = spawnSync("rojo", ["build", projectPath, "-o", placePath], {
		cwd: PACKAGE_ROOT,
		env,
		encoding: "utf8",
		timeout: 15000,
	});
	if (build.error || build.status !== 0) {
		throw new Error(`Rojo failed: ${build.error?.message ?? `${build.stdout}\n${build.stderr}`}`);
	}

	const runner = makeRunner(projectPath);
	const run = spawnSync("lune", ["run", runner, placePath], {
		cwd: PACKAGE_ROOT,
		env,
		encoding: "utf8",
		timeout: 15000,
	});
	if (run.error || run.status !== 0) {
		throw new Error(`Lune failed: ${run.error?.message ?? `${run.stdout}\n${run.stderr}`}`);
	}

	const traces: Array<Array<TraceValue>> = programs.map(() => []);
	for (const line of run.stdout.split(/\r?\n/).filter(Boolean)) {
		const match = line.match(/^__RBXTS_PROPERTY_TRACE_7E2048D5__\t(\d+)\t(string|number)\t(.*)$/);
		if (!match) {
			throw new Error(`unexpected Lune output: ${line}`);
		}
		const index = Number(match[1]);
		if (!Number.isInteger(index) || index < 0 || index >= traces.length) {
			throw new Error(`invalid property trace index ${match[1]}`);
		}
		if (match[2] === "string") {
			if (match[3].length % 2 !== 0 || !/^[0-9a-f]*$/.test(match[3])) {
				throw new Error(`invalid encoded string trace for program ${index}`);
			}
			traces[index].push(Buffer.from(match[3], "hex").toString("utf8"));
		} else {
			const encoded = match[3];
			if (encoded === "nan") {
				traces[index].push(Number.NaN);
			} else if (encoded === "+inf") {
				traces[index].push(Number.POSITIVE_INFINITY);
			} else if (encoded === "-inf") {
				traces[index].push(Number.NEGATIVE_INFINITY);
			} else {
				const value = Number(encoded);
				if (!Number.isFinite(value)) {
					throw new Error(`invalid numeric trace for program ${index}: ${encoded}`);
				}
				traces[index].push(value);
			}
		}
	}
	return traces;
}

export function assertEquivalentPrograms(programs: ReadonlyArray<string>): void {
	const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "rbxts-property-"));
	try {
		const sourcePath = makeProject(projectPath, programs);
		compile(projectPath, sourcePath);
		const actual = runLuau(projectPath, programs);
		const expected = programs.map(runNode);
		for (let index = 0; index < programs.length; index++) {
			try {
				assertEquivalentTraces(expected[index], actual[index]);
			} catch {
				throw new Error(
					`program ${index} produced different traces\nJavaScript: ${JSON.stringify(expected[index])}\nLuau: ${JSON.stringify(actual[index])}\nSource:\n${programs[index]}`,
				);
			}
		}
	} finally {
		fs.removeSync(projectPath);
	}
}

export function assertEquivalentTraces(expected: ReadonlyArray<TraceValue>, actual: ReadonlyArray<TraceValue>): void {
	if (expected.length !== actual.length || expected.some((value, index) => !Object.is(value, actual[index]))) {
		throw new Error("traces differ");
	}
}
