# Upstream jako baza alchemy

Użytkownik zatwierdził aktualny upstream jako bazę kompilatora oraz przeniesienie potrzebnych rozszerzeń alchemy z zabezpieczeniem testami. Wykorzystujemy istniejący checkout, bez worktree i bez push/publikacji.

Zamiast kończyć równoległą przebudowę Prereqs przyjmujemy jednolity mechanizm upstreamu: jawne kolektory i planowanie ewaluacji. Zachowujemy TypeScript 5.9.3, własne pakiety npm, lokalne compiler-types, JS/JSX, Symbol i zasoby using, makra operatorów, @native, CLI sourcemap/typegen i własne testy. Przywrócenie własnego starego stosu capture nie jest rozwiązaniem konfliktów.

Punkt powrotu: lokalny commit pełnego dotychczasowego stanu oraz patch archiwalny. Migracja na osobnej lokalnej gałęzi od upstream/master. Agentom Luna przypisujemy rozłączne pliki; integrację i weryfikację wykonuje agent główny.

Warunek ukończenia: kompilacja, testy upstreamu i własne regresje wykonują się; błędy i odłożone nieobsługiwane funkcje są jawnie opisane. Stryker musi mutować źródło TS kompilatora wykonywane przez test, a nie niezmieniony prekompilowany CLI. Nie włączamy publikacji pakietu przy czerwonych bramkach.
