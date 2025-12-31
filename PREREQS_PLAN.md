# Prereqs Refactoring Plan

## 📋 Podsumowanie Refaktoryzacji

Celem refaktoryzacji jest wprowadzenie klasy `Prereqs` do zarządzania wymaganiami wstępnymi (prerequisite statements) podczas transformacji AST. Zamiast używać `state.prereq()`, `state.pushToVar()` itp., funkcje transformacji używają teraz obiektu `Prereqs` przekazywanego jako parametr.

---

## ✅ Co zostało ZROBIONE

### 1. Klasa Prereqs (100%)
- [x] Utworzono `src/TSTransformer/classes/Prereqs.ts`
- [x] Zaimplementowano metody: `prereq()`, `prereqList()`, `pushToVar()`, `pushToVarIfComplex()`, `pushToVarIfNonId()`

### 2. Makra (100%)
- [x] `callMacros.ts` - wszystkie makra zaktualizowane
- [x] `constructorMacros.ts` - wszystkie makra zaktualizowane
- [x] `propertyCallMacros.ts` - wszystkie makra zaktualizowane
- [x] `types.ts` - typy makr zaktualizowane

### 3. Utility Functions (100%)
- [x] `ensureTransformOrder.ts` - zaktualizowane
- [x] `createTruthinessChecks.ts` - zaktualizowane

### 4. Expression Transforms (100%)
Wszystkie 34 pliki w `src/TSTransformer/nodes/expressions/` zaktualizowane:
- [x] transformArrayLiteralExpression.ts
- [x] transformAwaitExpression.ts
- [x] transformBinaryExpression.ts (częściowo - wewnętrzne wywołania)
- [x] transformBooleanLiteral.ts
- [x] transformCallExpression.ts
- [x] transformClassExpression.ts
- [x] transformConditionalExpression.ts
- [x] transformDeleteExpression.ts
- [x] transformElementAccessExpression.ts
- [x] transformExpression.ts (główny dispatcher)
- [x] transformFunctionExpression.ts
- [x] transformIdentifier.ts
- [x] transformImportExpression.ts
- [x] transformNewExpression.ts
- [x] transformNoSubstitutionTemplateLiteral.ts
- [x] transformNumericLiteral.ts
- [x] transformObjectLiteralExpression.ts
- [x] transformOmittedExpression.ts
- [x] transformParenthesizedExpression.ts
- [x] transformPropertyAccessExpression.ts
- [x] transformRegularExpressionLiteral.ts
- [x] transformSpreadElement.ts
- [x] transformStringLiteral.ts
- [x] transformSuperKeyword.ts
- [x] transformTaggedTemplateExpression.ts
- [x] transformTemplateExpression.ts
- [x] transformThisExpression.ts
- [x] transformTypeExpression.ts
- [x] transformUnaryExpression.ts
- [x] transformVoidExpression.ts
- [x] transformYieldExpression.ts

### 5. Statement Transforms (częściowo)
- [x] transformDoStatement.ts
- [x] transformExpressionStatement.ts
- [x] transformForOfStatement.ts (częściowo)
- [x] transformForStatement.ts (częściowo)
- [x] transformIfStatement.ts
- [x] transformReturnStatement.ts
- [x] transformSwitchStatement.ts
- [x] transformThrowStatement.ts
- [x] transformVariableStatement.ts (częściowo)
- [x] transformWhileStatement.ts

---

## ❌ Co ZOSTAŁO do zrobienia

### 🔴 TRUDNE (Senior) - Wymagają głębokiego zrozumienia architektury

#### 1. Binding Patterns (4 pliki)
```
src/TSTransformer/nodes/binding/
├── transformArrayAssignmentPattern.ts - dodać prereqs do sygnatury
├── transformArrayBindingPattern.ts - dodać prereqs do sygnatury
├── transformBindingName.ts - dodać prereqs do sygnatury
└── transformObjectAssignmentPattern.ts - dodać prereqs do sygnatury
└── transformObjectBindingPattern.ts - dodać prereqs do sygnatury
```

#### 2. transformBinaryExpression.ts - KRYTYCZNE
Plik ma wiele wewnętrznych wywołań do innych funkcji które jeszcze nie mają prereqs:
- `transformArrayAssignmentPattern`
- `transformObjectAssignmentPattern`
- `transformWritableAssignment`
- `transformLogicalOrCoalescingAssignmentExpression`

#### 3. transformWritable.ts
- `transformWritableExpression` - dodać prereqs
- `transformWritableAssignment` - dodać prereqs

#### 4. transformLogical.ts / transformLogicalOrCoalescingAssignmentExpression.ts
Złożona logika z chain building - wymaga starannej refaktoryzacji.

#### 5. transformOptionalChain.ts
Obsługa optional chaining z prereqs.

### 🟡 ŚREDNIE (Mid-level)

#### 6. Class Transforms (4 pliki)
```
src/TSTransformer/nodes/class/
├── transformClassConstructor.ts
├── transformClassLikeDeclaration.ts
├── transformDecorators.ts
└── transformPropertyDeclaration.ts
```

#### 7. JSX Transforms (5 plików)
```
src/TSTransformer/nodes/jsx/
├── transformJsx.ts
├── transformJsxAttributes.ts
├── transformJsxChildren.ts
├── transformJsxFragment.ts
└── transformJsxTagName.ts
```

### 🟢 ŁATWE (Junior) - Proste aktualizacje wywołań

#### 8. Statement Transforms - pozostałe wywołania
- transformEnumDeclaration.ts - 2 wywołania transformExpression
- transformExportAssignment.ts - 3 wywołania transformExpression
- transformFunctionDeclaration.ts - 1 wywołanie

#### 9. Aktualizacje wywołań w już zmienionych plikach
Szukaj wzorca: `transformExpression(state,` bez `prereqs`

---

## 📝 Wzorce do zastosowania

### Wzorzec 1: Wywołanie z expression transform do expression transform
```typescript
// PRZED:
const exp = transformExpression(state, node);

// PO:
const exp = transformExpression(state, prereqs, node);
```

### Wzorzec 2: Wywołanie ze statement transform
```typescript
// PRZED:
const [exp, prereqs] = state.capture(() => transformExpression(state, node));

// PO:
const prereqs = new Prereqs();
const exp = transformExpression(state, prereqs, node);
// lub jeśli potrzeba listy:
const [exp, stmtPrereqs] = state.capture(() => transformExpression(state, new Prereqs(), node));
```

### Wzorzec 3: Zamiana state.prereq na prereqs.prereq
```typescript
// PRZED:
state.prereq(statement);
state.pushToVar(exp);

// PO:
prereqs.prereq(statement);
prereqs.pushToVar(exp);
```

---

## 🎯 Kolejność wykonania

### Faza 1: Senior (obecnie w toku)
1. ✅ Prereqs class
2. ✅ Macro types i implementacje
3. ✅ Utility functions
4. 🔄 transformBinaryExpression - naprawić wewnętrzne wywołania
5. ⏳ Binding patterns
6. ⏳ transformWritable.ts
7. ⏳ transformLogical.ts
8. ⏳ transformOptionalChain.ts

### Faza 2: Mid-level
9. ⏳ Class transforms
10. ⏳ JSX transforms

### Faza 3: Junior
11. ⏳ Pozostałe statement transforms
12. ⏳ Cleanup i lint fixes

---

## 🔧 Polecenia do weryfikacji

```bash
# Sprawdź błędy TypeScript
npm run build

# Znajdź pozostałe wywołania state.prereq
grep -r "state\.prereq\(" src/TSTransformer/nodes/expressions/

# Znajdź wywołania transformExpression bez prereqs
grep -r "transformExpression(state," src/ | grep -v "prereqs"

# Uruchom linter
npm run eslint
```

---

## 📊 Statystyki postępu

| Kategoria | Zrobione | Pozostało | % |
|-----------|----------|-----------|---|
| Prereqs class | 1/1 | 0 | 100% |
| Macros | 3/3 | 0 | 100% |
| Utilities | 2/2 | 0 | 100% |
| Expression transforms | 34/34 | 0 | 100% |
| transformWritable | 1/1 | 0 | 100% |
| BindingAccessor (getAccessorForBindingType) | 1/1 | 0 | 100% |
| SpreadDestructor (4 files) | 4/4 | 0 | 100% |
| Binding patterns (transformArrayBindingPattern) | 1/5 | 4 | 20% |
| transformVariable | 0/1 | 1 | 0% |
| transformObjectBindingPattern | 0/1 | 1 | 0% |
| Class transforms | 0/4 | 4 | 0% |
| JSX transforms | 0/5 | 5 | 0% |
| Statement transforms (remaining calls) | 10/15 | 5 | 67% |
| transformLogical | 0/2 | 2 | 0% |
| transformOptionalChain | 0/1 | 1 | 0% |
| **TOTAL** | ~57/78 | ~21 | **~73%** |

---

## ⚠️ Uwagi

1. Po każdej zmianie uruchom `npm run build` aby sprawdzić błędy
2. Nie usuwaj `state.capturePrereqs` ani `state.capture` - są nadal potrzebne w statement transforms
3. Niektóre pliki mają mixed usage - część funkcji zaktualizowana, część nie
4. ESLint warnings o nieużywanych parametrach są OK dla interfejsu spójności
