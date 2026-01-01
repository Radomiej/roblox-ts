
import { execSync } from "child_process";
import * as fs from "fs-extra";
import * as path from "path";

const ROOT_DIR = path.join(__dirname, "..");
const COMPILER_TYPES_DIR = path.join(ROOT_DIR, "submodules/compiler-types");

function run(command: string, cwd: string) {
	console.log(`> ${command}`);
	execSync(command, { cwd, stdio: "inherit" });
}

async function main() {
	try {
		console.log("=== Publishing @radomiej/compiler-types (Beta) ===");

		// 1. Publish compiler-types
		// Ensure package.json is correct (we already updated it via edit tool, but let's be safe or just publish)
		// We assume the user is logged in to npm
		console.log("Publishing compiler-types...");
		run("npm publish --tag beta --access public", COMPILER_TYPES_DIR);

		console.log("\n=== Publishing roblox-ts (Beta) ===");

		// 2. Build roblox-ts
		console.log("Building roblox-ts...");
		run("npm run build", ROOT_DIR);

		// 3. Publish roblox-ts
		// Ensure version is correct in package.json (already updated to 3.0.9-beta.1)
		console.log("Publishing roblox-ts...");
		run("npm publish --tag beta --access public", ROOT_DIR);

		console.log("\nSUCCESS! Packages published:");
		console.log("- @radomiej/compiler-types@beta");
		console.log("- roblox-ts@beta");

	} catch (error) {
		console.error("\nERROR: Publishing failed.");
		console.error("Make sure you are logged in to npm using 'npm login'.");
		console.error(error);
		process.exit(1);
	}
}

main();
