/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
import path from "node:path";
import process from "node:process";

process.env.RBXTS_TEST_TYPES_ROOT = path.resolve("tests/node_modules/@rbxts");
process.env.RBXTS_TOOL_BIN = path.resolve("../.roblox-env/bin");

export default {
	testRunner: "jest",
	jest: {
		projectType: "custom",
		configFile: "jest.ts-mutation.config.ts",
	},
	mutate: [
		"src/TSTransformer/nodes/expressions/transformYieldExpression.ts",
		"src/Project/functions/createProjectData.ts",
	],
	coverageAnalysis: "perTest",
	disableTypeChecks: false,
	concurrency: 2,
	timeoutMS: 10000,
	timeoutFactor: 2,
	reporters: ["clear-text", "html", "json", "progress"],
	checkers: [],
	htmlReporter: { fileName: "reports/mutation-ts/index.html" },
	jsonReporter: { fileName: "reports/mutation-ts/mutation.json" },
};
