
import { execSync } from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as readline from "readline";

const ROOT_DIR = path.join(__dirname, "..");
const COMPILER_TYPES_DIR = path.join(ROOT_DIR, "submodules/compiler-types");

function run(command: string, cwd: string, env: NodeJS.ProcessEnv = process.env) {
	console.log(`> ${command}`);
	execSync(command, { cwd, stdio: "inherit", env });
}

function prompt(question: string, hidden: boolean = false): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
		// Simple visual hiding for tokens isn't standard in basic readline,
		// but we can at least not echo if we used a more complex lib.
		// For this simple script, standard input is fine, or we trust the user.
	});
}

async function main() {
	try {
		console.log("=== Publishing @radomiej/roblox-ts ecosystem (Beta) ===");

        console.log("Choose authentication method:");
        console.log("1. Use OTP (2FA code) with currently logged in user");
        console.log("2. Use an Authorization Token (CI/Automation token)");

        const choice = await prompt("Enter 1 or 2: ");
        let authEnv = { ...process.env };
        let otpFlag = "";

        if (choice === "2") {
            const token = await prompt("Enter NPM Token: ");
            if (!token) throw new Error("Token cannot be empty");
            // Set the token in the environment for the command
            // npm/yarn often look for NPM_TOKEN or we can set .npmrc
            // The most reliable way for a single session is often creating a temporary .npmrc
            // But 'npm config set' is persistent.
            // Better: passing the token in the command line auth string is deprecated/tricky.
            // We will use a temporary .npmrc in the CWD of execution or set NODE_AUTH_TOKEN if supported by .npmrc

            // Actually, simply writing a .npmrc with the token is the standard way.
            const npmrcContent = `//registry.npmjs.org/:_authToken=${token}`;
            // We will write this to the target directories temporarily
            await fs.writeFile(path.join(COMPILER_TYPES_DIR, ".npmrc"), npmrcContent);
            await fs.writeFile(path.join(ROOT_DIR, ".npmrc"), npmrcContent);

            console.log("Token configured in temporary .npmrc files.");
        } else {
            const otp = await prompt("Enter NPM OTP code: ");
            if (otp) {
                otpFlag = ` --otp=${otp}`;
            } else {
                console.log("No OTP provided, attempting publish without it (may fail if 2FA is enforced)...");
            }
        }

		// 1. Publish compiler-types
		console.log("\n--- Publishing compiler-types ---");
		try {
            run(`npm publish --tag beta --access public${otpFlag}`, COMPILER_TYPES_DIR, authEnv);
        } catch(e) {
            console.error("Failed to publish compiler-types. Continuing to main package...");
        }

		console.log("\n--- Publishing roblox-ts ---");

		// 2. Build roblox-ts
		console.log("Building roblox-ts...");
		run("npm run build", ROOT_DIR, authEnv);

		// 3. Publish roblox-ts
		console.log("Publishing roblox-ts...");
		run(`npm publish --tag beta --access public${otpFlag}`, ROOT_DIR, authEnv);

		console.log("\nSUCCESS! Packages published.");

        // Cleanup .npmrc if created
        if (choice === "2") {
             await fs.remove(path.join(COMPILER_TYPES_DIR, ".npmrc"));
             await fs.remove(path.join(ROOT_DIR, ".npmrc"));
             console.log("Temporary .npmrc files removed.");
        }

	} catch (error) {
		console.error("\nERROR: Publishing failed.");
		console.error(error);

        // Cleanup on error too
        try {
            await fs.remove(path.join(COMPILER_TYPES_DIR, ".npmrc"));
            await fs.remove(path.join(ROOT_DIR, ".npmrc"));
        } catch {}

		process.exit(1);
	}
}

main();
