import { assertEquivalentPrograms } from "./compilerHarness";

const loop = 'for (const value of values) { print(value === undefined ? "undefined" : value); }';
const declaration = "/** @type {(number | undefined)[]} */ const values = ";

it.each([
	["dense control", `${declaration}[1, 2]; ${loop}`],
	["leading undefined", `${declaration}[undefined, 1, 2]; ${loop}`],
	["interior undefined", `${declaration}[1, undefined, 2]; ${loop}`],
	["trailing undefined", `${declaration}[1, 2, undefined]; ${loop}`],
	["all undefined", `${declaration}[undefined, undefined]; ${loop}`],
	["indexed assignment to undefined", `${declaration}[1, 2]; values[1] = undefined; ${loop}`],
	["preallocated empty slots", `${declaration}new Array(3); ${loop}`],
	[
		"growth during iteration control",
		"/** @type {number[]} */ const values = [1]; for (const value of values) { print(value); if (value === 1) values.push(2); }",
	],
])("matches Node for %s", (_name, source) => {
	assertEquivalentPrograms([source]);
});
