# Upstream alchemy Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement independent feature ports, coordinated by root. Steps use checkbox syntax.

**Goal:** Oprzeć alchemy na upstream 68648b0c i zachować sprawdzone rozszerzenia.
**Architecture:** Jeden jawny mechanizm Prereqs i planner upstreamu; własne funkcje jako odrębne porty, bez przywracania stosu capture.
**Tech Stack:** TypeScript 5.9.3, Luau, Jest, Rojo, Lune, StrykerJS.
**Spec:** docs/superpowers/specs/2026-11-04-upstream-alchemy-design.md

## Global Constraints
- Zachować wszystkie lokalne zmiany w punkcie powrotu przed zmianą bazy.
- Nie resetować ani nie pushować repozytoriów; nie publikować npm.
- Zachować TS 5.9.3 i publiczne nazwy pakietów @radomiej.
- Nie osłabiać oczekiwań semantycznych w testach w celu uzyskania zielonego wyniku.

## Review Focus
- Kolejność skutków ubocznych w destrukturyzacji i przypisaniach.
- Prereqs wewnątrz warunków, iteratorów i pętli.
- Symbol i using: wartości zwracane przed dispose, LIFO i wyjątki.
- JS importy, deklaracje i cleanup przy zmianach plików.
- Czysty checkout, lokalne typy i workflow publikacji.

## Tasks
- [x] 1. Zapisać checkpoint, przełączyć lokalną gałąź na upstream i zachować pełne testy upstreamu.
- [x] 2. Przywrócić metadane pakietów, JS, workflow i własne konfiguracje testowe; zbudować bazę.
- [x] 3. Przenieść runtime Symbol/using i makra, dostosowując je do jawnych Prereqs; zweryfikować własne regresje.
- [x] 4. Przenieść CLI, @native i sourcemapy bez cofania aktualnych rozwiązań projektowych upstreamu.
- [x] 5. Uruchomić pełne testy upstreamu, złożone przypadki TS i JS; zbadać rzeczywiste błędy.
- [x] 6. Uruchomić Stryker na transformacjach TS, sklasyfikować wyniki i poprawić testy/źródło tam, gdzie wykryto problem.
- [x] 7. Niezależny przegląd, pełna końcowa weryfikacja i odtwarzalne archiwum zmian.
