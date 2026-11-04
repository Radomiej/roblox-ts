# Dodatki alchemy na bazie upstreamu

Baza integracji: upstream 68648b0c, lokalna wersja 3.2.0-alechemy.

| Dodatek | Zastosowanie |
| --- | --- |
| Makra Add/Sub/Mul/Div i pozostałe operatory | Wybrane wywołania metod stają się operatorami Luau. |
| Symbol.hasInstance | Własne sprawdzanie instanceof. |
| using / await using | Automatyczny cleanup zasobów, w odwrotnej kolejności deklaracji. |
| @native | Dyrektywa natywnej kompilacji Luau dla pliku. Nie gwarantuje przyspieszenia każdego kodu. |
| typegen | Generowanie deklaracji TS z obsługiwanych konstrukcji Luau. |
| Sourcemapy | Przybliżone powiązanie linii wygenerowanego kodu z TS. |
| allowJs / checkJs | Kompilacja JS/JSX i mieszanie plików JS z TS w obsługiwanym podzbiorze roblox-ts. |
| startsWith / endsWith | Metody stringów transformowane do Luau. |
| Znacznik undefined w Map | Zachowanie wpisu z wartością lub kluczem undefined mimo ograniczeń tablic Luau. |

Prereqs i planer ewaluacji pochodzą z aktualnego upstreamu. Własne testy
zabezpieczają m.in. kolejność skutków ubocznych, LuaTuple, hoisting i Map.

## Granice

Nie jest to pełny runtime JavaScript. JSX wymaga odpowiedniego runtime'u.
Mapowanie błędów zakłada domyślny układ usług i folder TS, a linie są przybliżone.
Zwykłe using poza generatorem nadal może nie posprzątać po niejawnym wyjątku
z wywołanej funkcji. Pełny IteratorClose po takich wyjątkach w pętli oraz
łańcuchowanie błędów dispose w SuppressedError pozostają w docs/todo.md.
Aktualne wyniki testów i zadania otwarte są w tym samym pliku.
