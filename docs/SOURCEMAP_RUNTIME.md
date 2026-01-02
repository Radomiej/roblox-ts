# Runtime Sourcemap Support

## 🎯 Overview

Automatic runtime error mapping from Lua to TypeScript - errors in Roblox Studio will show **both** locations:
- Where the error occurred in compiled Lua
- Where the error occurred in original TypeScript source

## 🚀 Usage

### 1. Compile with `--sourcemap` flag

```powershell
rbxtsc --sourcemap
# or
rbxtsc -w --sourcemap
```

### 2. What happens?

The compiler:
1. Generates normal `.luau` files
2. Creates `Sourcemap.luau` file in `include/`
3. Injects sourcemap data into RuntimeLib
4. RuntimeLib intercepts errors and adds TypeScript information

### 3. Error Example

**Without sourcemap:**
```
ServerScriptService.TS.server.main:45: attempt to index nil
Stack Begin
  Script 'ServerScriptService.TS.server.main', Line 45
Stack End
```

**With sourcemap:**
```
ServerScriptService.TS.server.main:45: attempt to index nil
  → TypeScript: src/server/main.server.ts:23
Stack Begin
  Script 'ServerScriptService.TS.server.main', Line 45
    → TypeScript: src/server/main.server.ts:23
Stack End
```

## 📋 Requirements

- roblox-ts 3.1.0+
- `--sourcemap` flag during compilation
- `include/` files must be copied to game (automatic)

## 🔧 Configuration

### package.json

```json
{
  "scripts": {
    "build": "rbxtsc --sourcemap",
    "watch": "rbxtsc -w --sourcemap",
    "build:prod": "rbxtsc",
    "build:debug": "rbxtsc --sourcemap --verbose"
  }
}
```

### tsconfig.json

Sourcemap works automatically - no changes needed in `tsconfig.json`.

## 🎨 How It Works

### 1. Compiler

During compilation with `--sourcemap`:

```typescript
// src/server/main.ts:23
const player = Players.GetPlayerByUserId(123);
player.Character.Humanoid.Health = 0; // ← Error here
```

Compiles to:

```lua
-- out/server/main.luau:45
local player = Players:GetPlayerByUserId(123)
player.Character.Humanoid.Health = 0 -- ← Error in Lua
```

### 2. Sourcemap Data

Compiler generates:

```lua
-- include/Sourcemap.luau
return {
  mappings = {
    ["server/main.luau"] = {
      source = "src/server/main.server.ts",
      lines = {
        ["45"] = 23,  -- Lua line 45 = TS line 23
        ["67"] = 35,
        -- ...
      }
    }
  }
}
```

### 3. RuntimeLib

RuntimeLib automatically:
- Loads sourcemap at game startup
- Intercepts errors through `error()`, `pcall()`, `xpcall()`
- Adds TypeScript information to every error

### 4. Line Mapping Algorithm

The compiler uses **landmark-based interpolation** for ~80% accuracy:

1. **Find landmarks**: Detect functions and classes in both Lua and TypeScript
2. **Match by name**: Connect Lua functions to their TypeScript counterparts
3. **Interpolate**: Calculate line numbers between landmarks
4. **Fallback**: Use ratio-based mapping when no landmarks available

This approach provides good accuracy with minimal implementation complexity.

## 🐛 Debugging

### Check if sourcemap is loaded

In Roblox Studio Output:

```
[roblox-ts] Sourcemap loaded - Enhanced error messages enabled
```

If you don't see this message:
1. Check if `ReplicatedStorage.rbxts_include.Sourcemap` exists
2. Verify you're compiling with `--sourcemap` flag
3. Check that `include/` was copied (don't use `--noInclude`)

### Manual Test

```lua
-- In Roblox Studio Command Bar
local TS = require(game.ReplicatedStorage.rbxts_include.RuntimeLib)
error("Test error") -- Should show TypeScript location
```

## ⚠️ Limitations

### 1. Runtime Errors Only

Sourcemap works **only** for runtime errors:
- ✅ `error()` calls
- ✅ `nil` index errors
- ✅ Type errors at runtime
- ❌ Compile-time errors (already in TS)
- ❌ Syntax errors (shouldn't happen)

### 2. Line Accuracy

- **~80% accurate** for most code
- **Exact** for function/class declarations
- **Approximate** for code between landmarks
- May be off by ±2-3 lines in complex expressions

### 3. Performance

- **Minimal** overhead - sourcemap loaded once at startup
- Error mapping is **fast** (hash table lookup)
- **No** impact on performance when no errors occur

### 4. File Size

- Sourcemap adds ~10-50KB to `include/`
- Depends on project size
- For production, can disable: `rbxtsc` (without `--sourcemap`)

## 📊 Comparison

| Feature | Without Sourcemap | With Sourcemap |
|---------|------------------|----------------|
| Error shows | Lua only | Lua + TypeScript |
| Setup | Automatic | `--sourcemap` flag |
| Performance | Baseline | +0.1% overhead |
| File size | Baseline | +10-50KB |
| Debugging | Harder | Easier |
| Line accuracy | N/A | ~80% |

## 🎯 When to Use

### ✅ Use sourcemap when:
- Developing project (development)
- Debugging runtime errors
- Working in a team
- Project has >1000 lines of code
- Frequently get bug reports from Roblox

### ❌ Don't use sourcemap when:
- Deploying to production (optional)
- Project is very small (<100 lines)
- File size is critical
- Not debugging runtime errors

## 💡 Best Practices

### Development Workflow

```powershell
# Terminal 1 - Watch mode with sourcemap
npm run watch  # rbxtsc -w --sourcemap

# Terminal 2 - Rojo sync
npm run dev    # rojo serve
```

### Production Build

```powershell
# Without sourcemap for smaller size
npm run build  # rbxtsc (no --sourcemap)
```

### CI/CD

```yaml
# .github/workflows/build.yml
- name: Build (Development)
  run: npm run build -- --sourcemap

- name: Build (Production)
  run: npm run build
```

## 🔮 Future Enhancements

Potential features:
- [ ] Source maps for stack traces (full call stack)
- [ ] VS Code integration (click error → open TS)
- [ ] Sourcemap compression (smaller size)
- [ ] Conditional sourcemap (only for specific scripts)
- [ ] Sourcemap viewer tool (GUI for browsing mappings)
- [ ] Full Source Map V3 support with VLQ encoding

## 📚 Examples

### Example 1: Nil Index Error

**TypeScript:**
```typescript
// src/server/combat.ts:15
function dealDamage(player: Player) {
  const character = player.Character; // Character can be nil!
  character.Humanoid.Health -= 10;
}
```

**Error in Studio (without sourcemap):**
```
ServerScriptService.TS.server.combat:28: attempt to index nil
```

**Error in Studio (with sourcemap):**
```
ServerScriptService.TS.server.combat:28: attempt to index nil
  → TypeScript: src/server/combat.ts:15
```

### Example 2: Custom Error

**TypeScript:**
```typescript
// src/server/validation.ts:42
if (!isValidInput(input)) {
  error("Invalid input provided");
}
```

**Error in Studio (with sourcemap):**
```
Invalid input provided
  → TypeScript: src/server/validation.ts:42
```

### Example 3: Try-Catch Block

**TypeScript:**
```typescript
// src/server/api.ts:67
try {
  const data = fetchData();
  processData(data);
} catch (e) {
  print(`Error: ${e}`);
  // Error message includes TS location automatically
}
```

**Output in Studio:**
```
Error: ServerScriptService.TS.server.api:89: HTTP 404
  → TypeScript: src/server/api.ts:68
```

## 🆘 Troubleshooting

### Problem: Sourcemap doesn't load

**Solution:**
1. Check Output in Studio: `[roblox-ts] Sourcemap loaded`
2. Verify: `game.ReplicatedStorage.rbxts_include.Sourcemap` exists
3. Rebuild: `rbxtsc --sourcemap`

### Problem: Errors don't show TypeScript location

**Solution:**
1. Sourcemap may not have mapping for that line
2. Check if file is in `mappings`
3. Rebuild with `--sourcemap --verbose`
4. Line might be in generated code (e.g., class boilerplate)

### Problem: TypeScript line is inaccurate

**Solution:**
1. This is expected for ~20% of cases
2. Line should be within ±2-3 lines of actual error
3. Use as a starting point for debugging
4. Check surrounding lines in TypeScript file

### Problem: Performance issues

**Solution:**
1. Sourcemap has minimal overhead
2. If problem persists, disable: `rbxtsc` (no flags)
3. Report issue on GitHub

### Problem: Works without --sourcemap flag

**Answer:**
Yes! The runtime works normally without `--sourcemap`:
- No `Sourcemap.luau` generated
- No TS location in errors
- Slightly smaller file size
- Same performance
- RuntimeLib.Sourcemap.luau is not loaded

---

**Author:** Radomiej
**Version:** 3.1.0-beta.3
**Date:** 2026-01-02
