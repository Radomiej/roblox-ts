# Quick Start: Testing Custom Compiler

Quick guide for testers - how to install and test a custom version of roblox-ts.

## 🚀 For Testers (Simplest Way)

### 1. Install Beta Version

In your roblox-ts project:

```powershell
# Backup package.json
cp package.json package.json.backup

# Install beta version
npm uninstall roblox-ts
npm install @radomiej/roblox-ts@beta --save-dev

# Upgrade TypeScript to 5.9
npm install typescript@5.9.3 --save-dev
npm install @rbxts/compiler-types@latest --save-dev

# Clean cache
rm -r out
rm -r node_modules/.cache

# Test
npm run build
```

### 2. Check tsconfig.json

**IMPORTANT:** Make sure `typeRoots` doesn't contain symlinked directories:

```json
{
  "compilerOptions": {
    "typeRoots": [
      "node_modules/@rbxts"
    ]
  }
}
```

❌ **DON'T add:** `node_modules/@radomiej` or other symlinked directories!

### 3. Test New Features

Test new TypeScript 5.9 features:

```typescript
// Const type parameters (TS 5.0+)
function getNames<const T extends readonly string[]>(names: T) {
    return names;
}
const names = getNames(["Alice", "Bob"]); // type: readonly ["Alice", "Bob"]

// Satisfies operator (TS 4.9+)
const config = {
    host: "localhost",
    port: 8080,
} satisfies { host: string; port: number };

// Decorators
@LogMethod
greet(name: string) {
    return `Hello, ${name}!`;
}
```

### 4. Report Bugs

If you find issues:
1. Check if it's a known issue in `TESTING_GUIDE.md` (Troubleshooting section)
2. Report on GitHub with:
   - Compiler version (`npx rbxtsc --version`)
   - Minimal code example
   - Error/logs

### 5. Return to Official Version

```powershell
# Restore from backup
cp package.json.backup package.json

# Reinstall
rm -r node_modules
npm install

# Test
npm run build
```

---

## 🛠️ For Developers (Using Scripts)

### Installation with Automatic Script

```powershell
# From roblox-ts root directory
.\scripts\install-beta-in-project.ps1 `
    -ProjectPath "E:\Projekty\roblox-flowind-ui" `
    -Version "3.1.0-beta.3" `
    -UpgradeTypeScript
```

### Restoring Original Version

```powershell
.\scripts\restore-original-version.ps1 `
    -ProjectPath "E:\Projekty\roblox-flowind-ui"
```

---

## 📋 Example package.json Configurations

### Option 1: Beta Only (replaces official version)

```json
{
  "devDependencies": {
    "@radomiej/roblox-ts": "3.1.0-beta.3",
    "typescript": "5.9.3",
    "@rbxts/compiler-types": "^3.0.0-types.0",
    "@rbxts/types": "^1.0.880"
  },
  "scripts": {
    "build": "rbxtsc",
    "watch": "rbxtsc -w"
  }
}
```

### Option 2: Parallel Versions (test alongside official)

```json
{
  "devDependencies": {
    "roblox-ts": "^3.0.0",
    "roblox-ts-beta": "npm:@radomiej/roblox-ts@3.1.0-beta.3",
    "typescript": "5.9.3",
    "@rbxts/compiler-types": "^3.0.0-types.0",
    "@rbxts/types": "^1.0.880"
  },
  "scripts": {
    "build": "rbxtsc",
    "build:beta": "npx roblox-ts-beta",
    "watch": "rbxtsc -w",
    "watch:beta": "npx roblox-ts-beta -w"
  }
}
```

Usage:
```powershell
# Official version
npm run build

# Beta version
npm run build:beta
```

---

## ⚠️ Common Issues

### Compiler hangs
- **Cause:** Symlinks in `typeRoots`
- **Solution:** Remove `node_modules/@radomiej` from `typeRoots` in `tsconfig.json`

### "Module not found: @rbxts/compiler-types"
- **Solution:** `npm install @rbxts/compiler-types@latest --save-dev`

### TypeScript errors after upgrade
- **Solution:** Update `@rbxts/types` and other packages: `npm update`

---

## 📚 More Information

Full documentation: `TESTING_GUIDE.md`

---

**Questions?** Check the Troubleshooting section in `TESTING_GUIDE.md` or report an issue on GitHub.
