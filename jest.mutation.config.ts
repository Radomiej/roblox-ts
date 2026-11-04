import type { Config } from "jest";

const config: Config = {
	rootDir: ".",
	testEnvironment: "node",
	modulePathIgnorePatterns: ["<rootDir>/.stryker-tmp/", "<rootDir>/submodules/"],
	testMatch: ["<rootDir>/tests/js-support/pathTranslator.test.ts"],
	collectCoverageFrom: [
		"src/Project/functions/createPathTranslator.ts",
		"src/Project/util/isCompilableFile.ts",
		"src/Project/functions/copyItem.ts",
	],
	coverageDirectory: "coverage/js-support",
	coverageReporters: ["lcov", "text"],
	moduleNameMapper: {
		"^(Project|Shared|CLI|TSTransformer)/(.*)$": "<rootDir>/src/$1/$2",
		"^(Project|Shared|CLI|TSTransformer)$": "<rootDir>/src/$1",
	},
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				tsconfig: {
					esModuleInterop: true,
					isolatedModules: true,
					module: "commonjs",
					target: "ES2020",
				},
			},
		],
	},
};

export default config;
