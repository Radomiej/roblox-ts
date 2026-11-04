import { createTestProject } from "../createTestProject";

it("captures an effectful compound target before taking its old value", () => {
	const output = createTestProject().compileSource(`
		declare function getBox(): { value: number };
		declare function getKey(): "value";
		declare function rhs(): number;
		getBox()[getKey()] += rhs();
	`);
	expect(output.match(/getBox\(\)/g)).toHaveLength(1);
	expect(output.match(/getKey\(\)/g)).toHaveLength(1);
	expect(output.match(/rhs\(\)/g)).toHaveLength(1);
});
