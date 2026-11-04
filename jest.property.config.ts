import type { Config } from "jest";

const config: Config = {
	rootDir: ".",
	testEnvironment: "node",
	testMatch: ["<rootDir>/tests/property/**/*.test.ts"],
	testTimeout: 120000,
	modulePathIgnorePatterns: ["<rootDir>/out/", "<rootDir>/.stryker-tmp/", "<rootDir>/submodules/"],
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
