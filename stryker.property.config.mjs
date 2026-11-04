import process from "node:process";

import base from "./stryker.prereqs.config.mjs";

// use a reproducible small corpus per mutant; broader searches run via test:property
process.env.FC_MUTATION_MODE = "1";
process.env.FC_RUNS ??= "1";
process.env.FC_SEED ??= "1592639505";

export default {
	...base,
	jest: { projectType: "custom", configFile: "jest.planner-mutation.config.ts" },
	htmlReporter: { fileName: "reports/mutation-property/index.html" },
	jsonReporter: { fileName: "reports/mutation-property/mutation.json" },
};
