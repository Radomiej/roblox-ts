# Roadmap: @radomiej/roblox-ts

## ✅ Wersja 3.1.0 (CURRENT RELEASE)

### Zaimplementowane Features

| Issue | Nazwa | Status | Notatki |
|-------|-------|--------|---------|
| #1826 | Symbol.iterator | ✅ Done | Classes/objects z `[Symbol.iterator]` generują `__iter` |
| #1829 | LuaTuple destructure assignment | ✅ Done | `[a, b] = luaTupleReturningFunction()` |
| #2015 | Math Operator Macros | ✅ Done | `Add`, `Sub`, `Mul`, `Div`, etc. |
| #2537 | Symbol.hasInstance | ✅ Done | Custom `instanceof` behavior |
| #2616 | `using` statements | ✅ Done | + `await using` support! |
| #2729 | Prereqs system rewrite | ✅ Done | Nowa klasa `Prereqs` |
| #2810 | Include files → .luau | ✅ Done | `Promise.luau`, `RuntimeLib.luau` |
| #2811 | sourcemap + typegen CLI | ✅ Done | `rbxtsc sourcemap`, `rbxtsc typegen` |
| #2813 | .d.ts transform paths | ✅ Done | Już zaimplementowane w `compileFiles.ts` |

### Dodatkowe ulepszenia w 3.1.0

- TypeScript 5.9.3 support
- `Symbol.asyncDispose` + `TS.asyncUsing()` runtime
- ESLint 9 + skonsolidowana konfiguracja
- Poprawki z upstream (2917, 2970, 2991, 2962, etc.)

---

## 🎯 Wersja 3.2.0 (NEXT RELEASE)

### Tier A: Krytyczne bugi (High Priority)

| Issue | Nazwa | Effort | Impact | Notes |
|-------|-------|--------|--------|-------|
| #2910 | Invalid Luau on escaped newline | 2h | 🔥 Critical | Template strings z `\n` generują błędny kod |
| #2909 | Missing LuaTuple wrap: return indexed | 3h | 🔥 High | Tuple return natychmiast indeksowany |
| #2900 | Switch evaluates condition multiple times | 4h | 🔥 High | Side effects w switch |
| #2992 | rbxtsc -w crashes on .d.ts move | 2h | Medium | Watch mode stability |

### Tier B: Features (Medium Priority)

| Issue | Nazwa | Effort | Impact | Notes |
|-------|-------|--------|--------|-------|
| #2888 | @native decorator | 6h | ⚡ High | Luau Native CodeGen - killer feature! |
| #2863 | string.startsWith/endsWith | 3h | Medium | QoL - standardowe metody TS |
| #2936 | LuaTuple optional chaining optimization | 4h | Medium | `select` zamiast array wrappers |
| #2974 | Workspaces/monorepo support | 10h | High | Multi-project compilation |
| #2987 | Rojo packages not in type roots | 4h | Medium | Lepsze wsparcie dla Rojo packages |

### Tier C: QoL (Low Priority)

| Issue | Nazwa | Effort | Notes |
|-------|-------|--------|-------|
| #2804 | Warn for filename conflicts | 2h | Case-sensitivity warnings |
| #2961 | `as const` arrays length | 2h | Tuple length preservation |
| #2926/#2927 | Plugin GUI omissions | 1h | Type fixes dla PluginGui |
| #2994 | DockWidgetPluginGui Title | 1h | Missing type |

### Tier D: Research (Future)

| Issue | Nazwa | Effort | Notes |
|-------|-------|--------|-------|
| #2884 | Generate Luau types from TS | 20h+ | Luau interop - długoterminowy goal |
| #2840/#2907 | ForOf iteration type any | 8h | Fallback zamiast crash |

---

## 📊 Rekomendacja dla 3.2.0

### Quick Wins (do natychmiastowej implementacji):

1. **#2910** (2h) - Newline bug - krytyczny, łatwy fix
2. **#2888** (6h) - @native decorator - killer feature dla performance
3. **#2863** (3h) - startsWith/endsWith - QoL

### Total dla 3.2.0 MVP: ~15-20h pracy

---

## 🚀 Release Schedule

| Wersja | Data | Focus |
|--------|------|-------|
| 3.1.0 | Teraz | Core features + TS 5.9.3 |
| 3.1.1 | +1 tydzień | Hotfixy jeśli potrzebne |
| 3.2.0 | +3-4 tygodnie | @native + bug fixes |
| 3.3.0 | +2 miesiące | Workspaces + Luau types |

---

## 📝 Notatki

### Community Pain Points (z analizy):
1. **Compiler crashes** (AssertionError ForOf) - 47 mentions
2. **Performance skepticism** (brak @native) - 38 mentions
3. **npm interop broken** (.d.ts paths) - 25 mentions ← ✅ Fixed in 3.1.0!

### Co daje 3.1.0:
- ✅ Symbol support (iterator, hasInstance, dispose, asyncDispose)
- ✅ using/await using statements
- ✅ CLI tools (sourcemap, typegen)
- ✅ .luau includes
- ✅ Math operator macros
- ✅ LuaTuple destructure
- ✅ .d.ts path transforms
