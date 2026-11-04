# Integracja 3.2.0-alechemy — lista prac

Integracja na gałęzi release/3.2.0-alechemy. Push autoryzowany przez użytkownika; publikacja npm pozostaje osobnym krokiem.

Baza: aktualny upstream `68648b0c633ef1016009aec7521b528f648ba656`, gałąź
`release/3.2.0-alechemy`. Poprzedni stan alchemy zachowany jako
`backup/alchemy-stabilized-20261104` (`e20d87c1`).

- [x] Oprzeć integrację na upstreamie wraz z kompletną przebudową Prereqs i jego testami.
- [x] Przenieść rozszerzenia alchemy: makra, Symbol, using/await using, native, typegen, sourcemap oraz opt-in JS.
- [x] Zachować TS 5.9.3 i aktualne API/compiler-types; przywrócić upstreamowe indeksowanie stringów.
- [x] Dodać regresje dla kolejności obliczeń, Map z undefined, wywołań LuaTuple, hoistingu funkcji i tożsamości rzucanych obiektów.
- [x] Zweryfikować upstream i runtime po portowaniu: 259 przypadków kompilacji, 933 runtime, 32 JS, pełny lint. Pełny przebieg jednostkowy: 738/746, a wszystkie osiem wykazanych porażek rozstrzygnięte poprawkami i celowanymi powtórzeniami; szczegóły w docs/verification-3.2.0-alechemy.md.
- [x] Uzupełnić protokół zamykania generatorów: finally, zagnieżdżone yield*, dispose i propagacja błędów cleanupu. **933 testy runtime przechodzą**, w tym kolejność cleanupu try/catch. Pozostałe granice opisane poniżej.
- [x] Uruchomić mutacje transformera TS: **74 zabite, 6 ocalałych zmian nazw tymczasowych, 1 bez pokrycia z 81**, bez błędów i timeoutów. Szczegóły w raportach.
- [x] Mutacje planera: **57 zabitych, 42 ocalałe, 2 bez pokrycia ze 101**, bez błędów/timeoutów. Adapter JS: **81/81 zabitych**; 32 testy JS przechodzą. Ocalałe mutacje planera wymagają dalszych testów i analizy.
- [x] Przegląd integracji oraz /workspace/changes-3.2.0-alechemy.tar.gz; patche czterech repozytoriów przechodzą git apply --check w czystych klonach.
- [ ] Włączyć publikację obu pakietów z main po integracji i konfiguracji npm Trusted Publishers; workflow przygotowane lokalnie.
- [ ] Zmierzyć i uzupełnić pełne pokrycie patcha wymagane przez codecov.yml (100%); obecne raporty JS/Stryker obejmują wskazane zakresy, nie cały patch.
- [ ] Rozwiązać migrację zapisanych identyfikatorów leaderboardu shootera; patrz jego docs/user-api-migration.md.
- [ ] Naprawić zależność @rbxts/rodux w roblox-pure-game.
- [ ] Pełny IteratorClose po niejawnych wyjątkach w ciele pętli: obecna poprawka zamyka generator przy break, return i jawnym throw; wyjątek rzucony przez wywołaną funkcję wymaga szerszej przebudowy sterowania.
- [x] Zweryfikować runtime obsługi kluczy undefined w Map: prywatny znacznik, konstruktor, set/get/has/delete oraz odkodowanie iteracji/spreadu/destrukturyzacji. Regresja runtime przechodzi.

### Ograniczenia semantyki zasobów i iteratorów

- Zwykłe `using` sprząta przy normalnym wyjściu oraz przy jawnych `return` i bezpośrednim `throw` w tym samym zakresie. Niejawny wyjątek z dowolnego wywołania lub wyjątek przechodzący przez wygenerowany `try` w niegeneratorowym zakresie może ominąć cleanup.
- W generatorach aktywne zasoby są sprzątane przy zamknięciu iteratora i wyjątku, a zakresy `try` opróżniają zasoby przed własnym `finally`. Przy błędach wielu metod dispose próbowane są kolejne zasoby, lecz błędy nie są łączone w `SuppressedError`.
- Zamknięcie iteratora jest emitowane dla jawnych `break`, `return` i `throw`. Niejawny wyjątek z wywołania w ciele `for...of` może nadal ominąć `IteratorClose`; pełna obsługa wymaga zabezpieczenia ciała pętli z zachowaniem przepływu `break`/`continue`/`return`.

Poniższy zapis dotyczy poprzedniej stabilizacji 3.1.0, a jego wyniki i decyzja
o selektywnym przenoszeniu zmian nie opisują bieżącej integracji.

## Historia poprzedniego etapu

# Bieżąca lista prac — 2026-11-04

Zmiany są lokalne na tej maszynie; nie zostały wypchnięte ani opublikowane.

- [x] 1. Ustabilizować TypeScript **5.9.3** w alchemy i transformerze Flamework. Poprawiony hook rozpoznaje `@radomiej/roblox-ts`; build i testy transformera przechodzą. Integracja shootera nie zgłasza już różnicy wersji TS.
- [x] 2. Zaktualizować API do `@rbxts/types@1.0.960`, compiler-types do aktualnego upstreamu z zachowaniem rozszerzeń alchemy i zgodności kompilatora. Zastąpić brakujący submoduł i uszkodzone archiwum zależnością z sąsiedniego repozytorium. Przenieść zgodne poprawki nazw pakietów i `yield*`. Pełne scalenie Prereqs odłożone zgodnie z decyzją użytkownika.
- [x] 3. Dodać opt-in JS/JSX przez `allowJs` i opcjonalnie `checkJs`: pliki Luau, importy JS/TS, deklaracje, kopiowanie zasobów, cleanup i watch. Testy obejmują rzeczywiste wywołania CLI.
- [x] 4. Zweryfikować coverage i StrykerJS: **85/85 zabitych mutacji** w `createPathTranslator.ts`, bez survivorów, braku pokrycia i timeoutów. Adapter ma 100% statements/lines i 94.44% branches; zakres nie obejmuje całego kompilatora.
- [x] 5. Przygotować lokalne workflow GitHub Actions dla `@radomiej/roblox-ts` oraz `@radomiej/compiler-types`: push na `main`, testy przed publikacją, npm Trusted Publishing/OIDC, prerelease tag `beta`, pomijanie istniejącej wersji. Obie planowane wersje: beta.6.
- [x] 6. Zapisać wyniki, zakres synchronizacji i instrukcje w dokumentacji. Pełny test kompilatora: **162 Jest + 514 runtime + 32 JS**; transformer ma osobne regresje, shooter standalone **78/78**.

## Rozszerzone testy TypeScript — bieżąca tura

- [ ] 7. Zaimportować wybrane nowsze testy runtime upstreamu z przypisaniem źródeł; oddzielić testy wymagające odłożonych funkcji.
- [ ] 8. Dodać złożone przypadki TS: skutki uboczne i kolejność obliczeń, destrukturyzacja, opcjonalne wywołania, generatory i zwalnianie zasobów.
- [ ] 9. Uruchomić StrykerJS na rzeczywistych transformerach TypeScript z kompilacją w procesie testu i wykonaniem Luau; opisać zakres i ocalałe mutacje.
- [ ] 10. Zbadać wykryte regresje, utrwalić testy i sprawdzić pełny zestaw przed przygotowaniem nowej paczki zmian.

## Pozostałe zadania i kroki zewnętrzne

- [ ] Wysłać zreviewowane zmiany do właściwych repozytoriów i włączyć workflow na gałęziach `main`. Skonfigurować Trusted Publisher w npm dla każdego pakietu; szczegóły w `docs/npm-publishing.md`. Niczego nie opublikowano w tej sesji.
- [ ] Zaplanować migrację tożsamości leaderboardu shootera: stare numeryczne globalne user ID nie są identyczne z nowym domenowym `User`. Nie stosować rzutowań ani `User.fromId` do starych ID. Pozostaje **jeden błąd kompilacji shootera**, opisany w jego `docs/user-api-migration.md`.
- [ ] Przenieść pozostałe poprawki upstreamu wymagające integracji Prereqs oraz transformację indeksowania stringów; sama nowa deklaracja indeksowa została celowo pominięta w compiler-types.
- [ ] Osobno uporządkować historyczny pełny ESLint (pierwszy pomiar: 81 błędów i 1222 ostrzeżenia). Nowy `lint:js` przechodzi i jest bramką nowych zmian w pipeline; nie oznacza to czystego pełnego repozytorium.
- [ ] Naprawić zależność `@rbxts/rodux@^3.0.0` w `roblox-pure-game` — poza aktualnym zakresem.

Dokumentacja: `javascript-support.md`, `upstream-sync-2026-11-04.md`, `mutation-testing.md`, `npm-publishing.md`.


## Poprzednie ustalenia (historyczne)

# TODO — środowisko alchemy

Ustalenia z konfiguracji środowiska 2026-11-03, gałąź
`release/3.1.0-alchemy`, commit `829f9b4d15e6225f6340be78f2e5a08cdcb4d846`.

- [ ] Przywrócić lub opublikować commit `compiler-types`
      `2bc6483bc7bc5708a874def0b3b060d2a0b59e8a`, wskazany przez submoduł
      `submodules/compiler-types`. Pobranie tego SHA z `Radomiej/compiler-types`
      i `roblox-ts/compiler-types` kończy się `not our ref`.
- [ ] Ustalić właściwe źródło typów dla alchemy. Osobny fork
      `Radomiej/compiler-types` istnieje, lecz jego `master` wskazuje
      `5a6bc3d0664c938d4a94479c67d0b23f991606b2` (pakiet
      `@rbxts/compiler-types@3.0.0-types.0`). Nie utożsamiać go z brakującym SHA.
      Na npm jest dostępny `@radomiej/compiler-types@3.1.0-types.beta.3`,
      używany przez shooter; zgodność z tą gałęzią wymaga sprawdzenia.
- [ ] Odtworzyć poprawne `compiler-types-3.1.0.tgz` i zaktualizować zależności
      w kontrolowanym zadaniu kodowym. Śledzone archiwum nie przechodzi
      `gzip -t compiler-types-3.1.0.tgz`; `npm ci` w `tests/` zgłasza
      `Z_DATA_ERROR: invalid distance too far back`. Zachować weryfikację integralności.
- [ ] Po naprawie typów uruchomić `npm ci` w katalogu głównym i `tests/`,
      następnie `npm test` z Rojo 7.4.4 i Lune. Obecne testy alchemy nie potwierdzają
      gotowości: instalacja typów testowych jest zablokowana uszkodzonym archiwum.
- [ ] Uzgodnić wersje TypeScript dla `Radomiej/transformer` i kompilatora.
      Lockfile transformera instaluje 5.5.3, alchemy i shooter używają 5.9.3.
      Kompilacja shootera z lokalnym transformerem zgłasza
      `Flamework: TS version mismatch detected`.
- [ ] Osobno poprawić manifest `roblox-pure-game`: `@rbxts/rodux@^3.0.0`
      nie jest dostępny; npm publikuje wersje `3.0.0-ts.*`. Instalacja Yarn
      z `--frozen-lockfile` jest przez to zablokowana.

Potwierdzone narzędzia: Node 24.19.0, npm 11.9.0, Luau CLI 0.699,
Lune 0.8.9, Rojo 7.4.4, Zap 0.6.24. Niezależne testy Luau shootera:
78 zaliczonych, 0 błędów. Samodzielny runtime Lune nie zastępuje pełnego
silnika Roblox ani testów integracyjnych w Roblox Studio.
