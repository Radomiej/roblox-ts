# Local Testing Instructions (Local Development)

This document describes how to test changes to the `roblox-ts` compiler locally and how to use the developer version in other projects.

## Requirements

Make sure you have dependencies installed via `rokit`:

```powershell
rokit install
```

This will install `rojo`, `lune`, and other necessary tools.

## Building and Testing the Compiler

To build the project and run all tests (Unit, Compile, Runtime):

```powershell
npm test
```

You can also run individual stages:

1.  **Build only:**

    ```powershell
    npm run build
    ```

2.  **Unit tests (Jest):**

    ```powershell
    npm run test-compile
    ```

3.  **Build test file `.rbxl` (Rojo):**

    ```powershell
    npm run test-rojo
    ```

4.  **Run tests in Lune environment:**
    ```powershell
    npm run test-run
    ```

## Testing DEV Version in Another Project

To test your changes in a real project (e.g., `roblox-flowind-ui`), you can link the local compiler version.

### 1. Prepare Linking (in `roblox-ts` repository)

Run the command below to build the compiler and register it as a global `roblox-ts-dev` package:

```powershell
npm run devlink
```

_Note: You must run `npm run build` every time you make changes to the source code for them to be reflected in the dev version._

### 2. Link in Target Project

Go to your project directory (e.g., `e:\Projekty\roblox-flowind-ui`) and type:

```powershell
npm link roblox-ts-dev
```

### 3. Using the DEV Compiler

Instead of the standard `rbxtsc` command, use `rbxtsc-dev`.

Examples:

```powershell
# One-time compilation
rbxtsc-dev

# Watch mode
rbxtsc-dev -w

# Run via npx (if direct command doesn't work)
npx rbxtsc-dev
```

### 4. Unlink DEV Version

When you're done testing and want to return to the stable version:

```powershell
npm unlink roblox-ts-dev
```

## Local Testing of @rbxts/compiler-types

If you need to test changes in type definitions (`@rbxts/compiler-types`) together with the compiler:

1.  **Clone the types repository:**
    ```powershell
    git clone https://github.com/roblox-ts/compiler-types
    cd compiler-types
    ```

2.  **Register link:**
    ```powershell
    npm install
    npm link
    ```

3.  **Link in target project:**
    In your project directory (e.g., `roblox-flowind-ui`):
    ```powershell
    npm link @rbxts/compiler-types
    ```

    _Now your project will use local `.d.ts` files from the `compiler-types` directory._

4.  **Verification:**
    If you added new types (e.g., `Add<T>`), they should now be visible to the compiler (if using linked `roblox-ts-dev`) and to your IDE (VS Code).

5.  **Unlink:**
    ```powershell
    npm unlink @rbxts/compiler-types
    # To restore the original version:
    npm install --force
    ```

## Generating TypeScript Internal Types (ts-expose-internals)

The project uses locally generated types for TypeScript's internal APIs because official packages may not be available for the latest versions (e.g., 5.9.3).

### How to generate types:
1. Make sure submodules are initialized:
   ```powershell
   git submodule update --init --recursive
   ```
2. Run the generation script:
   ```powershell
   npm run generate-internals
   ```
   This script automatically:
   - Downloads the appropriate TypeScript version (defined in `scripts/generate-internals.ts`).
   - Builds TypeScript.
   - Generates `.d.ts` files and fixes them for compatibility.
   - Saves the result in `local-types/ts-expose-internals`.

### How to update TypeScript version:
1. Open `scripts/generate-internals.ts`.
2. Change the `TS_VERSION` variable to the new version (e.g., `"5.10.0"`).
3. Run `npm run generate-internals`.
4. Also update the TypeScript version in `submodules/compiler-types/package.json` and `package.json` (if required).

## Publishing Test Version (Beta/Snapshot) to npm

To provide a test version to other users without affecting the main `latest` tag:

### Automatic Publishing (Recommended)

A script has been added that automatically publishes both `@radomiej/compiler-types` and `@radomiej/roblox-ts` in beta version.

1. Make sure you're logged in to npm:
   ```powershell
   npm login
   ```
2. Run the script:
   ```powershell
   npm run publish-beta
   ```

This script:
- Publishes `submodules/compiler-types` as `@radomiej/compiler-types`.
- Builds `roblox-ts`.
- Publishes `roblox-ts` as `@radomiej/roblox-ts`.

### Manual Publishing (Alternative)

To provide a test version to other users without affecting the main `latest` tag:

1.  **Change version in `package.json`** to a prerelease version, e.g., `3.0.9-beta.1`.
2.  **Build the project:**
    ```powershell
    npm run build
    ```
3.  **Publish with `beta` tag:**
    ```powershell
    npm publish --tag beta
    ```
    *Make sure you're logged in (`npm login`).*

### How others can install the test version:
```powershell
npm install @radomiej/roblox-ts@beta
# or specific version
npm install @radomiej/roblox-ts@3.1.0-beta.3
```

---

## 📦 Testing by Other Users

### Quick Start for Testers

If you want others to test your compiler version, share:

1. **Quick Start Guide:** `QUICK_START_TESTING.md` - simple installation guide
2. **Full Documentation:** `TESTING_GUIDE.md` - detailed instructions and troubleshooting

### Automatic Installation (Recommended)

Use the prepared PowerShell scripts:

```powershell
# In roblox-ts project
.\scripts\install-beta-in-project.ps1 `
    -ProjectPath "E:\Projekty\roblox-flowind-ui" `
    -Version "3.1.0-beta.3" `
    -UpgradeTypeScript
```

To restore the original version:

```powershell
.\scripts\restore-original-version.ps1 `
    -ProjectPath "E:\Projekty\roblox-flowind-ui"
```

### Manual Installation

In the target project (e.g., `roblox-flowind-ui`):

```powershell
# 1. Backup
cp package.json package.json.backup

# 2. Install beta
npm uninstall roblox-ts
npm install @radomiej/roblox-ts@3.1.0-beta.3 --save-dev

# 3. Upgrade TypeScript (if needed)
npm install typescript@5.9.3 --save-dev
npm install @rbxts/compiler-types@latest --save-dev

# 4. Clean cache
rm -r out
rm -r node_modules/.cache

# 5. Test
npm run build
```

### ⚠️ Important: Check tsconfig.json

**CRITICAL:** Make sure `typeRoots` doesn't contain symlinked directories:

```json
{
  "compilerOptions": {
    "typeRoots": [
      "node_modules/@rbxts"
    ]
  }
}
```

❌ **DON'T add:** `node_modules/@radomiej` - this will cause compiler to hang!

### Available Resources

- `QUICK_START_TESTING.md` - Quick start for testers
- `TESTING_GUIDE.md` - Full testing documentation
- `scripts/install-beta-in-project.ps1` - Automatic installation
- `scripts/restore-original-version.ps1` - Restore original version

### Reporting Bugs

Ask testers to report bugs with:
- Compiler version (`npx rbxtsc --version`)
- Minimal code example
- Full error logs
- System information (Windows/macOS/Linux)
