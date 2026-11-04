import type { Config } from "jest";

const config: Config = {
	rootDir: ".",
	testEnvironment: "node",
	testMatch: ["<rootDir>/tests/ts-mutation/**/*.test.ts"],
	modulePathIgnorePatterns: ["<rootDir>/out/", "<rootDir>/.stryker-tmp/"],
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
