# roblox-ts Best Practices & Guidelines

This document contains essential best practices for developing with roblox-ts to maximize compiler efficiency and avoid common pitfalls.

## 🎯 Core Principles

### 1. TypeScript is NOT JavaScript
- roblox-ts compiles to Luau, not JavaScript
- Not all JS features are supported (RegEx, some ES6+ features)
- Always check the [official docs](https://roblox-ts.com/docs/) for supported features

### 2. Understand the Compilation Model
- TypeScript → AST → Luau code generation
- Some TS patterns compile inefficiently to Lua
- Use `--verbose` flag to see generated Lua code

## ⚠️ Common Pitfalls & Solutions

### Array Iteration Performance

**❌ BAD - Inefficient:**
```typescript
// forEach creates unnecessary overhead
array.forEach((item) => {
    // process item
});
```

**✅ GOOD - Efficient:**
```typescript
// Traditional for-of is optimized
for (const item of array) {
    // process item
}

// Or use numeric for loop for best performance
for (let i = 0; i < array.size(); i++) {
    const item = array[i];
}
```

### Map Iteration Order

**⚠️ IMPORTANT:** Map iteration order is NOT guaranteed to be deterministic in Lua!

**❌ BAD - Non-deterministic:**
```typescript
map.forEach((value, key) => {
    // Order may vary between runs!
});
```

**✅ GOOD - Deterministic:**
```typescript
// Sort keys first for consistent order
const keys = [...map.keys()].sort();
for (const key of keys) {
    const value = map.get(key);
    // Process in sorted order
}
```

### Array Size vs Length

**❌ BAD:**
```typescript
const len = array.size(); // .size() is NOT a method in roblox-ts
```

**✅ GOOD:**
```typescript
const len = array.size(); // Use .size() for Luau arrays
// OR
const len = array.length; // TypeScript property (compiles to #array)
```

### Undefined vs Nil Handling

**⚠️ CRITICAL:** `undefined` in TypeScript becomes `nil` in Lua!

**❌ BAD:**
```typescript
map.set(key, undefined); // May not work as expected
```

**✅ GOOD:**
```typescript
// Explicitly delete instead
map.delete(key);

// Or use null for "empty" values
map.set(key, null);
```

### Property Assignment to Roblox Instances

**❌ BAD:**
```typescript
frame.ZIndex = layoutOrder; // Direct assignment may fail
```

**✅ GOOD:**
```typescript
// Ensure property exists and type matches
if (frame.IsA("Frame")) {
    frame.ZIndex = layoutOrder;
}
```

## 🚀 Performance Optimization

### 1. Prefer Luau Native Constructs

**✅ Use:**
- `for i = 1, #array do` (numeric loops)
- `for key, value in pairs(table) do` (table iteration)
- Direct table access over methods

**❌ Avoid:**
- Excessive array methods (`.map()`, `.filter()`, `.reduce()`)
- Deep object spreading
- Unnecessary type conversions

### 2. Symbol.iterator Support (3.1.0+)

**✅ NEW in 3.1.0:**
```typescript
class MyIterable {
    [Symbol.iterator]() {
        // Custom iteration logic
        return {
            next: () => ({ value: any, done: boolean })
        };
    }
}

// Works with for-of!
for (const item of new MyIterable()) {
    // ...
}
```

### 3. Resource Management with `using` (3.1.0+)

**✅ NEW in 3.1.0:**
```typescript
class Connection {
    [Symbol.dispose]() {
        this.disconnect();
    }
}

{
    using conn = new Connection();
    // Automatically disposed at end of scope
}
```

## 📦 Project Structure Best Practices

### Recommended Structure
```
project/
├── src/
│   ├── client/          # Client-side code
│   │   └── *.client.ts
│   ├── server/          # Server-side code
│   │   └── *.server.ts
│   └── shared/          # Shared code
│       └── *.ts
├── out/                 # Compiled Lua (gitignored)
├── include/             # Runtime libraries (gitignored)
├── node_modules/        # Dependencies (gitignored)
├── default.project.json # Rojo configuration
├── package.json         # npm configuration
├── tsconfig.json        # TypeScript configuration
└── .gitignore
```

### File Naming Conventions
- **Client scripts:** `*.client.ts` (compiled to `*.client.luau`)
- **Server scripts:** `*.server.ts` (compiled to `*.server.luau`)
- **Modules:** `*.ts` (compiled to `*.luau`)

## 🔧 Configuration Best Practices

### tsconfig.json (Required Settings)

```jsonc
{
    "compilerOptions": {
        // REQUIRED - Do not change these
        "allowSyntheticDefaultImports": true,
        "downlevelIteration": true,
        "module": "commonjs",
        "moduleResolution": "Node",
        "noLib": true,
        "resolveJsonModule": true,
        "forceConsistentCasingInFileNames": true,
        "moduleDetection": "force",
        "strict": true,
        "target": "ESNext",
        "typeRoots": ["node_modules/@rbxts"],

        // CONFIGURABLE
        "rootDir": "src",
        "outDir": "out",
        "baseUrl": "src",
        "incremental": true,
        "tsBuildInfoFile": "out/tsconfig.tsbuildinfo",

        // RECOMMENDED for React projects
        "jsx": "react",
        "jsxFactory": "React.createElement",
        "jsxFragmentFactory": "React.Fragment",

        // RECOMMENDED for decorators
        "experimentalDecorators": true
    }
}
```

### package.json Scripts

```jsonc
{
    "scripts": {
        "build": "npx rbxtsc --sourcemap",
        "watch": "npx rbxtsc -w --sourcemap",
        "dev": "rojo serve",
        "build:rojo": "rojo build -o game.rbxl"
    }
}
```

**⚠️ IMPORTANT:** Use `npx rbxtsc` to ensure the correct binary is used!

### default.project.json (Rojo)

```jsonc
{
    "name": "your-project",
    "tree": {
        "$className": "DataModel",
        "ReplicatedStorage": {
            "$className": "ReplicatedStorage",
            "rbxts_include": {
                "$path": "include"
            },
            "node_modules": {
                "@rbxts": {
                    "$path": "node_modules/@rbxts"
                }
            },
            "TS": {
                "$path": "out/shared"
            }
        },
        "ServerScriptService": {
            "$className": "ServerScriptService",
            "TS": {
                "$path": "out/server"
            }
        },
        "StarterPlayer": {
            "$className": "StarterPlayer",
            "StarterPlayerScripts": {
                "$className": "StarterPlayerScripts",
                "TS": {
                    "$path": "out/client"
                }
            }
        }
    }
}
```

**⚠️ CRITICAL:** `node_modules/@rbxts` must be at `ReplicatedStorage` level, NOT inside `rbxts_include`!

## 🐛 Debugging & Error Handling

### Runtime Sourcemap (3.1.0+)

**Enable sourcemap for better error messages:**
```bash
npx rbxtsc --sourcemap
```

**Output in Studio:**
```
ServerScriptService.TS.yourfile:123: error message
  → TypeScript: src/yourfile.ts:~120
```

### Common Compilation Errors

**Error: "Imported package Roblox path is missing an npm scope"**
- **Cause:** Incorrect Rojo configuration
- **Fix:** Ensure `node_modules/@rbxts` is correctly mapped in `default.project.json`

**Error: "Cannot find module '@rbxts/services'"**
- **Cause:** Missing dependency or incorrect `typeRoots`
- **Fix:** Run `npm install` and verify `tsconfig.json` has `"typeRoots": ["node_modules/@rbxts"]`

**Error: "RegExp literals are not supported"**
- **Cause:** RegEx is not available in Luau
- **Fix:** Use `string.match()`, `string.gmatch()`, or `string.find()` instead

## 🔒 Type Safety Best Practices

### 1. Use Strict Mode
```jsonc
{
    "compilerOptions": {
        "strict": true,  // Enables all strict checks
        "noImplicitAny": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true
    }
}
```

### 2. Avoid `any` Type
**❌ BAD:**
```typescript
function process(data: any) {
    // No type safety!
}
```

**✅ GOOD:**
```typescript
function process(data: string | number) {
    if (typeIs(data, "string")) {
        // TypeScript knows data is string here
    }
}
```

### 3. Use Type Guards
```typescript
function isPlayer(instance: Instance): instance is Player {
    return instance.IsA("Player");
}

if (isPlayer(obj)) {
    // TypeScript knows obj is Player here
    print(obj.UserId);
}
```

## 📚 Recommended Packages

### Essential
- `@rbxts/services` - Roblox services (Players, Workspace, etc.)
- `@rbxts/types` - Roblox API types

### Utilities
- `@rbxts/t` - Runtime type checking
- `@rbxts/object-utils` - Object manipulation utilities
- `@rbxts/signal` - Type-safe signals

### UI/React
- `@rbxts/react` - React for Roblox
- `@rbxts/react-roblox` - React renderer for Roblox

### Testing
- `@rbxts/testez` - Unit testing framework

## 🚨 Breaking Changes in 3.1.0

### TypeScript 5.9.3 Upgrade
- Some type inference improvements may cause new errors
- Update your code to fix legitimate type issues

### Symbol Support
- `Symbol.iterator` now works with for-of loops
- Custom iterables are now supported

### Resource Management
- `using` declarations now supported
- `await using` shows diagnostic (not yet implemented)

### Runtime Changes
- Deprecated `wait()`, `spawn()`, `delay()` replaced with `task` library
- `unpack()` replaced with `table.unpack()`

## 📖 Additional Resources

- [Official roblox-ts Docs](https://roblox-ts.com/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Roblox Luau Documentation](https://luau-lang.org/)
- [Roblox API Reference](https://create.roblox.com/docs/reference/engine)

## 🎓 Learning Path

1. **Start:** Learn TypeScript basics
2. **Understand:** How roblox-ts compiles to Luau
3. **Practice:** Build small projects
4. **Optimize:** Profile and improve performance
5. **Contribute:** Report bugs and contribute to the compiler

---

**Remember:** When in doubt, check the generated Lua code with `--verbose` flag!
