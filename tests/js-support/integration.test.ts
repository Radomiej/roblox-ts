import { ChildProcess, spawn, spawnSync } from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";

const repositoryRoot = path.resolve(__dirname, "../..");
const cliPath = path.join(repositoryRoot, "out", "CLI", "cli.js");
const robloxTypesPath = path.join(repositoryRoot, "tests", "node_modules", "@rbxts");

let directory: string;

beforeEach(() => {
	directory = fs.mkdtempSync(path.join(os.tmpdir(), "rbxtsc-js-integration-"));
	fs.ensureDirSync(path.join(directory, "src"));
	fs.writeJsonSync(path.join(directory, "package.json"), { name: "@test/js-support" });
});

afterEach(() => fs.removeSync(directory));

function writeProject(files: Record<string, string>, compilerOptions: Record<string, unknown> = {}) {
	for (const [file, contents] of Object.entries(files)) {
		fs.outputFileSync(path.join(directory, "src", file), contents);
	}
	fs.writeJsonSync(path.join(directory, "tsconfig.json"), {
		compilerOptions: {
			allowJs: true,
			allowSyntheticDefaultImports: true,
			baseUrl: "src",
			checkJs: false,
			module: "commonjs",
			moduleResolution: "node",
			moduleDetection: "force",
			noLib: true,
			outDir: "out",
			rootDir: "src",
			strict: true,
			typeRoots: [robloxTypesPath],
			types: ["types"],
			...compilerOptions,
		},
		include: ["src/**/*"],
	});
}

function build() {
	return spawnSync(process.execPath, [cliPath, "build", "--noInclude"], {
		cwd: directory,
		encoding: "utf8",
	});
}

function output(file: string) {
	return fs.readFileSync(path.join(directory, "out", file), "utf8");
}

async function waitForWatchCondition(
	child: ChildProcess,
	condition: () => boolean,
	message: string,
	getLogs: () => string,
) {
	const deadline = Date.now() + 10_000;
	while (Date.now() < deadline) {
		if (condition()) return;
		if (child.exitCode !== null || child.signalCode !== null) {
			throw new Error(`Watch process exited before ${message}.\n${getLogs()}`);
		}
		await new Promise(resolve => setTimeout(resolve, 100));
	}
	throw new Error(`Timed out waiting for ${message}.\n${getLogs()}`);
}

async function stopWatchProcess(child: ChildProcess) {
	if (child.exitCode !== null || child.signalCode !== null) return;
	await new Promise<void>(resolve => {
		const timeout = setTimeout(() => {
			child.kill("SIGKILL");
			resolve();
		}, 2_000);
		child.once("close", () => {
			clearTimeout(timeout);
			resolve();
		});
		child.kill("SIGTERM");
	});
}

it("compiles JS entry points and mixed JS/TS imports to Luau paths", () => {
	writeProject({
		"js/index.js": "export const fromJs = 1;\n",
		"js/helper.js": "export const helper = 2;\n",
		"main.server.js": [
			'import { fromJs } from "./js";',
			'import { fromTs } from "./ts/index";',
			"export const result = fromJs + fromTs;",
		].join("\n"),
		"ts/index.ts": ['import { helper } from "../js/helper";', "export const fromTs = helper + 1;"].join("\n"),
	});

	const result = build();
	expect(result.error).toBeUndefined();
	expect(result.status).toBe(0);
	expect(fs.existsSync(path.join(directory, "out", "main.server.luau"))).toBe(true);
	expect(fs.existsSync(path.join(directory, "out", "js", "init.luau"))).toBe(true);
	expect(fs.existsSync(path.join(directory, "out", "js", "helper.luau"))).toBe(true);
	expect(fs.existsSync(path.join(directory, "out", "ts", "init.luau"))).toBe(true);

	const compiled = [
		output("main.server.luau"),
		output("js/init.luau"),
		output("js/helper.luau"),
		output("ts/init.luau"),
	];
	expect(compiled.join("\n")).not.toMatch(/(?:init|helper|index|main\.server)\.js/);
	// Source JS is compiled into Luau; it must not also be copied as a raw asset.
	expect(fs.existsSync(path.join(directory, "out", "main.server.js"))).toBe(false);
	expect(fs.existsSync(path.join(directory, "out", "js", "index.js"))).toBe(false);
});

it("uses JSDoc types when checkJs is enabled", () => {
	writeProject(
		{
			"typed.js": [
				"/** @param {number} value */",
				"export function increment(value) {",
				"  return value + 1;",
				"}",
			].join("\n"),
			"main.js": ['import { increment } from "./typed";', "export const answer = increment(41);"].join("\n"),
		},
		{ checkJs: true },
	);

	const result = build();
	expect(result.error).toBeUndefined();
	expect(result.status).toBe(0);
	expect(fs.existsSync(path.join(directory, "out", "typed.luau"))).toBe(true);
	expect(fs.existsSync(path.join(directory, "out", "main.luau"))).toBe(true);
});

it("reports checkJs type mismatches and does not emit compiled output", () => {
	writeProject(
		{
			"typed.js": [
				"/** @param {number} value */",
				"export function increment(value) {",
				"  return value + 1;",
				"}",
			].join("\n"),
			"main.js": [
				'import { increment } from "./typed";',
				'export const invalid = increment("not a number");',
			].join("\n"),
		},
		{ checkJs: true },
	);

	const result = build();
	expect(result.error).toBeUndefined();
	expect(result.status).not.toBe(0);
	expect(`${result.stdout}\n${result.stderr}`).toMatch(/string.*number|number.*string/i);
	expect(fs.existsSync(path.join(directory, "out", "typed.luau"))).toBe(false);
	expect(fs.existsSync(path.join(directory, "out", "main.luau"))).toBe(false);
});

it("recompiles added and changed JavaScript and removes output after deletion in watch mode", async () => {
	writeProject({ "main.js": "export const value = 1;\n" });

	const child = spawn(process.execPath, [cliPath, "build", "--watch", "--usePolling", "--noInclude"], {
		cwd: directory,
	});
	let logs = "";
	child.stdout?.on("data", chunk => (logs += chunk.toString()));
	child.stderr?.on("data", chunk => (logs += chunk.toString()));
	child.on("error", error => (logs += `${error.message}\n`));

	try {
		const mainOutput = path.join(directory, "out", "main.luau");
		await waitForWatchCondition(
			child,
			() => fs.existsSync(mainOutput) && /1/.test(fs.readFileSync(mainOutput, "utf8")),
			"initial JavaScript compilation",
			() => logs,
		);

		fs.writeFileSync(path.join(directory, "src", "main.js"), "export const value = 2;\n");
		await waitForWatchCondition(
			child,
			() => fs.existsSync(mainOutput) && /2/.test(fs.readFileSync(mainOutput, "utf8")),
			"JavaScript recompilation after a change",
			() => logs,
		);

		const addedOutput = path.join(directory, "out", "added.luau");
		fs.writeFileSync(path.join(directory, "src", "added.js"), "export const added = true;\n");
		await waitForWatchCondition(
			child,
			() => fs.existsSync(addedOutput),
			"JavaScript compilation after an added file",
			() => logs,
		);

		fs.removeSync(path.join(directory, "src", "added.js"));
		await waitForWatchCondition(
			child,
			() => !fs.existsSync(addedOutput),
			"removal of compiled output after deleting its JavaScript source",
			() => logs,
		);
	} finally {
		await stopWatchProcess(child);
	}
}, 30_000);
