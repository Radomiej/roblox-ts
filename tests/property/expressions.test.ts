import fc from "fast-check";

import { assertEquivalentPrograms } from "./compilerHarness";
import {
	compoundAssignmentCases,
	renderCompoundAssignmentProgram,
	renderShortCircuitProgram,
	renderUpdateProgram,
	shortCircuitCases,
	updateCases,
} from "./expressionPrograms";

const seed = process.env.FC_SEED === undefined ? 0x5eedc011 : Number.parseInt(process.env.FC_SEED, 10);
const path = process.env.FC_PATH;
const configuredRuns = process.env.FC_RUNS === undefined ? 10 : Number.parseInt(process.env.FC_RUNS, 10);
const numRuns = Math.min(100, Math.max(1, configuredRuns));

const propertyOptions = { seed, path, numRuns, endOnFailure: process.env.FC_MUTATION_MODE === "1" };

it("matches Node for short-circuit, nullish, optional call, and conditional expressions", () => {
	fc.assert(
		fc.property(fc.array(shortCircuitCases, { minLength: 1, maxLength: 8 }), cases => {
			assertEquivalentPrograms(cases.map(renderShortCircuitProgram));
		}),
		propertyOptions,
	);
});

it("matches Node for mutable reads and indexed compound assignment targets", () => {
	fc.assert(
		fc.property(fc.array(compoundAssignmentCases, { minLength: 1, maxLength: 8 }), cases => {
			assertEquivalentPrograms(cases.map(renderCompoundAssignmentProgram));
		}),
		propertyOptions,
	);
});

it("matches Node for indexed postfix and prefix updates", () => {
	fc.assert(
		fc.property(fc.array(updateCases, { minLength: 1, maxLength: 8 }), cases => {
			assertEquivalentPrograms(cases.map(renderUpdateProgram));
		}),
		propertyOptions,
	);
});
