# 🧪 roblox-ts 3.1.0 beta – testing request (Radomiej fork)

New beta builds are live and ready for community testing.

## ✅ Current beta tags (npm)

- **@radomiej/roblox-ts**: `3.1.0-beta.4`
- **@radomiej/compiler-types**: `3.1.0-types.beta.3`

## ✨ 3.1.0 highlights (from CHANGELOG)

- **TypeScript 5.9.3 support**
- **Explicit Resource Management**: `using` / `await using`
  - Runtime: `Symbol.dispose`, `Symbol.asyncDispose`, `TS.using()`, `TS.asyncUsing()`, `TS.disposableStack()`
- **Symbol.iterator support**
  - `[Symbol.iterator]` auto-generates `__iter` and works with `for...of` and spreads
- **Symbol.hasInstance support**
  - Custom `instanceof` via `[Symbol.hasInstance]` (integrated into `TS.instanceof`)
- **Math operator macros**
  - Generic operator types: `Add`, `Sub`, `Mul`, `Div`, `IDiv`, `Mod`, `Pow`, `Concat`, `Eq`, `Lt`, `Le`, `Unm`, `Len`
- **LuaTuple destructure assignment**
  - Full support for `[a, b] = luaTupleReturningFunction()`
- **New CLI commands**
  - `rbxtsc sourcemap` (TS→Luau mapping)
  - `rbxtsc typegen` (Luau→TypeScript declarations)
- **`@native` JSDoc decorator**
  - Emits `--!native` for Luau Native Code Generation
- **String methods macros**
  - `startsWith` / `endsWith`
- **Runtime sourcemap support**: `--sourcemap`
  - Generates `Sourcemap.luau` and enhances runtime errors with TS location (best-effort mapping)

## 🔧 How to migrate from official roblox-ts

### Step 1: Replace compiler package

```bash
npm uninstall roblox-ts
npm install --save-dev @radomiej/roblox-ts@3.1.0-beta.4
```

### Step 2: Update compiler-types (keeps @rbxts compatibility)

Use npm alias to install `@radomiej/compiler-types` as `@rbxts/compiler-types`:

```jsonc
{
  "devDependencies": {
    "@radomiej/roblox-ts": "3.1.0-beta.4",
    "@rbxts/compiler-types": "npm:@radomiej/compiler-types@^3.1.0-types.beta.3",
    "@rbxts/types": "^1.0.880"  // Keep official @rbxts/types
  }
}
```

```bash
npm install
```

### Step 3: Update build scripts (recommended)

```jsonc
{
  "scripts": {
    "build": "npx rbxtsc --sourcemap",
    "watch": "npx rbxtsc -w --sourcemap"
  }
}
```

**Why `npx`?** Ensures npm runs the binary from `@radomiej/roblox-ts`, not the package's build script.

### Step 4: Build and test

```bash
npm run build
```

**That's it!** Your project now uses beta.4 with sourcemap support.

---

### Why this works (npm alias magic)

- The dependency name stays `@rbxts/compiler-types`, so all existing code/templates work
- npm installs `@radomiej/compiler-types` **under the `@rbxts/compiler-types` name**
- No code changes needed - drop-in replacement

Docs: https://docs.npmjs.com/cli/v8/using-npm/package-spec/#aliases

## 🔧 Install / update

```bash
npm i -D @radomiej/roblox-ts@3.1.0-beta.4
npm i
```

(Optional) verify the alias resolved:

```bash
npm ls @rbxts/compiler-types
```

## 🧭 Runtime sourcemap (beta feature)

The `--sourcemap` flag is included in the migration steps above. When enabled:

- Generates `include/Sourcemap.luau` with TS→Lua line mappings
- Runtime errors show both Lua and TypeScript locations
- Appears as orange/red `warn()` output in Studio

Example output:
```
ServerScriptService.TS.yourfile:123: error message
  → TypeScript: src/yourfile.ts:~120
```

## ⚠️ IMPORTANT: beta safety

Please:

1. **Make a backup** before testing.
2. Test on a **new experience** or a **separate project** first.
3. Avoid using in production until you validate it.

## ✅ What to test / report

- Does your project compile and run?
- Any regressions vs official roblox-ts?
- Runtime sourcemap usefulness/accuracy
- Any Rojo/include duplication or missing modules issues

Thanks for testing!
