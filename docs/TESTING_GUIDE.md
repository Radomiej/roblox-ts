# Guide: Testing Custom roblox-ts Compiler in Existing Project

This guide shows how to configure an existing roblox-ts project to test a custom compiler version from npm package (not just dev version).

## 📋 Table of Contents

1. [Publishing Custom Version to npm](#publishing-custom-version-to-npm)
2. [Installation in Project](#installation-in-project)
3. [Upgrade TypeScript to 5.9](#upgrade-typescript-to-59)
4. [Return to Official Version](#return-to-official-version)
5. [Troubleshooting](#troubleshooting)

---

## 1. Publishing Custom Version to npm

### Step 1: Prepare Version

In the `roblox-ts` project:

1. **Change version in `package.json`** to beta version:
   ```json
   {
     "name": "@radomiej/roblox-ts",
     "version": "3.1.0-beta.3"
   }
   ```

2. **Build the project:**
   ```powershell
   npm run build
   ```

3. **Check if build works:**
   ```powershell
   npm test
   ```

### Step 2: Publish to npm

**Option A: Publish under your own scope (recommended for tests)**

```powershell
# Log in to npm (if not already)
npm login

# Publish with beta tag
npm publish --tag beta --access public
```

**Option B: Publish as fork (without access to @roblox-ts)**

If you don't have access to the original scope, change the package name:

```json
{
  "name": "@your-username/roblox-ts",
  "version": "3.1.0-beta.3"
}
```

Then:
```powershell
npm publish --tag beta --access public
```

### Step 3: Verify Publication

```powershell
# Check if package is available
npm view @radomiej/roblox-ts@beta

# Or for specific version
npm view @radomiej/roblox-ts@3.1.0-beta.3
```

---

## 2. Installation in Project

### For Users Testing Your Version

In the target project (e.g., `roblox-flowind-ui`):

#### Step 1: Backup Current Configuration

```powershell
# Copy package.json as backup
cp package.json package.json.backup
```

#### Step 2: Install Custom Compiler

**Option A: Install from npm (recommended)**

```powershell
# Uninstall old version
npm uninstall roblox-ts

# Install custom version with beta tag
npm install @radomiej/roblox-ts@beta --save-dev

# Or specific version
npm install @radomiej/roblox-ts@3.1.0-beta.3 --save-dev
```

**Option B: Alias in package.json (for parallel tests)**

You can have both versions simultaneously using aliases:

```json
{
  "devDependencies": {
    "roblox-ts": "^3.0.0",
    "roblox-ts-beta": "npm:@radomiej/roblox-ts@3.1.0-beta.3"
  }
}
```

Then add new scripts to `package.json`:

```json
{
  "scripts": {
    "build": "rbxtsc",
    "build:beta": "npx roblox-ts-beta",
    "watch:beta": "npx roblox-ts-beta -w"
  }
}
```

#### Step 3: Upgrade TypeScript (if needed)

If custom compiler requires TypeScript 5.9:

```powershell
npm install typescript@5.9.3 --save-dev
```

#### Step 4: Update Compiler Types

```powershell
# Uninstall old types
npm uninstall @rbxts/compiler-types

# Install new types compatible with TS 5.9
npm install @rbxts/compiler-types@latest --save-dev
```

**IMPORTANT:** If custom compiler uses local types, you may need:

```powershell
# If you have access to local build
npm install file:../roblox-ts/submodules/compiler-types --save-dev
```

#### Step 5: Verify Installation

```powershell
# Check compiler version
npx rbxtsc --version

# Should show: 3.1.0-beta.3 (or your version)
```

#### Step 6: Test Compilation

```powershell
# Clean previous builds
rm -r out
rm -r node_modules/.cache

# Try to compile
npm run build
```

---

## 3. Upgrade TypeScript to 5.9

### Full Upgrade Procedure

#### Step 1: Update TypeScript

```powershell
npm install typescript@5.9.3 --save-dev
```

#### Step 2: Update Compiler Types

```powershell
npm install @rbxts/compiler-types@latest --save-dev
```

#### Step 3: Update tsconfig.json (optional)

You can add new TypeScript 5.9 options:

```json
{
  "compilerOptions": {
    // ... existing options ...

    // New TS 5.9 options (optional)
    "moduleDetection": "force",
    "verbatimModuleSyntax": false
  }
}
```

#### Step 4: Check Compatibility

```powershell
# Check if there are type errors
npx tsc --noEmit

# If there are errors, they may be related to:
# - New strict checks in TS 5.9
# - Changes in @rbxts/types
```

#### Step 5: Update ESLint (if using)

```powershell
npm install @typescript-eslint/parser@latest @typescript-eslint/eslint-plugin@latest --save-dev
```

---

## 4. Return to Official Version

### Restore Original Configuration

```powershell
# Uninstall custom version
npm uninstall @radomiej/roblox-ts

# Install official version
npm install roblox-ts@^3.0.0 --save-dev

# Restore TypeScript 5.6 (if it was)
npm install typescript@5.6.3 --save-dev

# Restore old compiler types
npm install @rbxts/compiler-types@^3.0.0-types.0 --save-dev

# Clean cache
rm -r node_modules/.cache
rm -r out

# Test compilation
npm run build
```

### Or Restore from Backup

```powershell
# Restore package.json
cp package.json.backup package.json

# Reinstall dependencies
rm -r node_modules
npm install
```

---

## 5. Troubleshooting

### Problem: Compiler hangs

**Cause:** Incorrect `typeRoots` in `tsconfig.json` pointing to symlinks.

**Solution:**

```json
{
  "compilerOptions": {
    "typeRoots": [
      "node_modules/@rbxts"
    ]
  }
}
```

**DON'T add** directories with symlinks to local packages (e.g., `node_modules/@radomiej`).

### Problem: "Module not found" for @rbxts/compiler-types

**Solution:**

```powershell
# Check if compiler-types are installed
ls node_modules/@rbxts/compiler-types

# If not, install:
npm install @rbxts/compiler-types@latest --save-dev

# Check tsconfig.json:
# "types" should be relative to typeRoots
{
  "compilerOptions": {
    "typeRoots": ["node_modules/@rbxts"],
    "types": ["compiler-types", "types"]  // NOT @rbxts/compiler-types
  }
}
```

### Problem: TypeScript errors after upgrade to 5.9

**Possible causes:**
- New strict checks in TS 5.9
- Incompatible types in dependencies

**Solution:**

```powershell
# Check which packages have issues
npx tsc --noEmit --listFiles | grep error

# Update problematic packages
npm update @rbxts/types @rbxts/react @rbxts/react-roblox

# If that doesn't help, temporarily disable strict mode
# in tsconfig.json (for testing only!)
{
  "compilerOptions": {
    "strict": false
  }
}
```

### Problem: "Invalid tsconfig.json configuration"

**Solution:**

Check if all required options are set:

```json
{
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "downlevelIteration": true,
    "module": "commonjs",
    "moduleResolution": "Node",
    "moduleDetection": "force",
    "noLib": true,
    "resolveJsonModule": true,
    "strict": true,
    "target": "ESNext",
    "typeRoots": ["node_modules/@rbxts"]
  }
}
```

### Problem: Compiler uses old version despite installing new one

**Solution:**

```powershell
# Clean npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -r node_modules
rm package-lock.json

# Reinstall
npm install

# Check version
npx rbxtsc --version
```

---

## 📝 Example: Full Procedure for Tester

### Install Custom Version

```powershell
# 1. Backup
cp package.json package.json.backup

# 2. Install custom compiler
npm uninstall roblox-ts
npm install @radomiej/roblox-ts@3.1.0-beta.3 --save-dev

# 3. Upgrade TypeScript
npm install typescript@5.9.3 --save-dev

# 4. Update compiler types
npm install @rbxts/compiler-types@latest --save-dev

# 5. Clean cache
rm -r out
rm -r node_modules/.cache

# 6. Test
npm run build
```

### Return to Official Version

```powershell
# 1. Restore package.json
cp package.json.backup package.json

# 2. Reinstall
rm -r node_modules
npm install

# 3. Test
npm run build
```

---

## 🎯 Checklist for Testers

- [ ] Backup `package.json`
- [ ] Installed custom compiler
- [ ] Updated TypeScript to 5.9.3
- [ ] Updated `@rbxts/compiler-types`
- [ ] Checked `tsconfig.json` (no symlinked typeRoots)
- [ ] Cleaned cache (`out/`, `node_modules/.cache`)
- [ ] Compilation works without hanging
- [ ] Tested new features (const type params, satisfies, etc.)
- [ ] Reported found bugs

---

## 📚 Additional Resources

- [roblox-ts Documentation](https://roblox-ts.com/docs)
- [TypeScript 5.9 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/)
- [npm Publishing Guide](https://docs.npmjs.com/cli/v10/commands/npm-publish)

---

**Author:** Radomiej
**Guide Version:** 1.0
**Date:** 2026-01-02
