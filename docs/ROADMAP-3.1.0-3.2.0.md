# Roadmap: @radomiej/roblox-ts

## ✅ Version 3.1.0 (CURRENT RELEASE)

### Implemented Features

| Issue | Name | Status | Notes |
|-------|------|--------|-------|
| #1826 | Symbol.iterator | ✅ Done | Classes/objects with `[Symbol.iterator]` generate `__iter` |
| #1829 | LuaTuple destructure assignment | ✅ Done | `[a, b] = luaTupleReturningFunction()` |
| #2015 | Math Operator Macros | ✅ Done | `Add`, `Sub`, `Mul`, `Div`, etc. |
| #2537 | Symbol.hasInstance | ✅ Done | Custom `instanceof` behavior |
| #2616 | `using` statements | ✅ Done | + `await using` support! |
| #2729 | Prereqs system rewrite | ✅ Done | New `Prereqs` class |
| #2810 | Include files → .luau | ✅ Done | `Promise.luau`, `RuntimeLib.luau` |
| #2811 | sourcemap + typegen CLI | ✅ Done | `rbxtsc sourcemap`, `rbxtsc typegen` |
| #2813 | .d.ts transform paths | ✅ Done | Already implemented in `compileFiles.ts` |
| #2840 | ForOf iteration over `any` type | ✅ Done | Uses `pairs()` fallback instead of crash |
| #2847 | Functions declared after return | ⚠️ Partial | Hoisted, but closures over locals have limitations |
| #2863 | string.startsWith/endsWith | ✅ Done | New string macros |
| #2888 | @native decorator | ✅ Done | Luau Native CodeGen support |
| N/A | Runtime Sourcemap (MVP) | ⚠️ Partial | `--sourcemap` flag, 1:1 line mapping only |

### Additional Improvements in 3.1.0

- TypeScript 5.9.3 support
- `Symbol.asyncDispose` + `TS.asyncUsing()` runtime
- ESLint 9 + consolidated configuration
- Upstream fixes (2917, 2970, 2991, 2962, etc.)
- Runtime sourcemap support (MVP) - file mappings with 1:1 line mapping

---

## 🎯 Version 3.2.0 (NEXT RELEASE)

### Tier A: Critical Bugs (High Priority)

| Issue | Name | Effort | Impact | Notes |
|-------|------|--------|--------|-------|
| #2910 | Invalid Luau on escaped newline | 2h | 🔥 Critical | Template strings with `\n` generate invalid code |
| #2992 | rbxtsc -w crashes on .d.ts move | 2h | Medium | Watch mode stability |

### Tier B: Features (Medium Priority)

| Issue | Name | Effort | Impact | Notes |
|-------|------|--------|--------|-------|
| N/A | Full Sourcemap Line Mapping | 8h | Medium | Real TS→Lua line mapping (currently 1:1) |
| #2936 | LuaTuple optional chaining optimization | 4h | Medium | `select` instead of array wrappers |
| #2974 | Workspaces/monorepo support | 10h | High | Multi-project compilation |
| #2987 | Rojo packages not in type roots | 4h | Medium | Better support for Rojo packages |

### Tier C: QoL (Low Priority)

| Issue | Name | Effort | Notes |
|-------|------|--------|-------|
| #2804 | Warn for filename conflicts | 2h | Case-sensitivity warnings |
| #2961 | `as const` arrays length | 2h | Tuple length preservation |
| #2926/#2927 | Plugin GUI omissions | 1h | Type fixes for PluginGui |
| #2994 | DockWidgetPluginGui Title | 1h | Missing type |

### Tier D: Research (Future)

| Issue | Name | Effort | Notes |
|-------|------|--------|-------|
| #2884 | Generate Luau types from TS | 20h+ | Luau interop - long-term goal |
| #2840/#2907 | ForOf iteration type any | 8h | Fallback instead of crash |

---

## 📊 Recommendation for 3.2.0

### Quick Wins (for immediate implementation):

1. **#2910** (2h) - Newline bug - critical, easy fix
2. **#2992** (2h) - Watch mode crash on .d.ts move - stability fix

### Total for 3.2.0 MVP: ~4-10h of work (reduced from 3.1.0 MVP)

---

## 🚀 Release Schedule

| Version | Date | Focus |
|---------|------|-------|
| 3.1.0 | Now | Core features + TS 5.9.3 |
| 3.1.1 | +1 week | Hotfixes if needed |
| 3.2.0 | +3-4 weeks | @native + bug fixes |
| 3.3.0 | +2 months | Workspaces + Luau types |

---

## 📝 Notes

### Community Pain Points (from analysis):
1. **Compiler crashes** (AssertionError ForOf) - 47 mentions ← ✅ Fixed in 3.1.0! (#2840)
2. **Performance skepticism** (no @native) - 38 mentions ← ✅ Fixed in 3.1.0! (#2888)
3. **npm interop broken** (.d.ts paths) - 25 mentions ← ✅ Fixed in 3.1.0!

### What 3.1.0 provides:
- ✅ Symbol support (iterator, hasInstance, dispose, asyncDispose)
- ✅ using/await using statements
- ✅ CLI tools (sourcemap, typegen)
- ✅ .luau includes
- ✅ Math operator macros
- ✅ LuaTuple destructure
- ✅ .d.ts path transforms
- ✅ @native decorator for Luau Native CodeGen
- ✅ string.startsWith/endsWith methods
- ✅ ForOf iteration over `any` type (fallback to pairs)
- ✅ Functions declared after return statements
