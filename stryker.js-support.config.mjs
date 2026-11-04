/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
	testRunner: "jest",
	jest: {
		projectType: "custom",
		configFile: "jest.mutation.config.ts",
	},
	mutate: ["src/Project/functions/createPathTranslator.ts"],
	coverageAnalysis: "perTest",
	disableTypeChecks: false,
	concurrency: 3,
	timeoutMS: 10000,
	timeoutFactor: 2,
	reporters: ["clear-text", "html", "json", "progress"],
	checkers: [],
};
