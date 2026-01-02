# Instrukcja Testowania Lokalnego (Local Development)

Ten dokument opisuje, jak testować zmiany w kompilatorze `roblox-ts` lokalnie oraz jak używać wersji deweloperskiej w innych projektach.

## Wymagania

Upewnij się, że masz zainstalowane zależności za pomocą `rokit`:

```powershell
rokit install
```

Zainstaluje to `rojo`, `lune` i inne potrzebne narzędzia.

## Budowanie i Testowanie Kompilatora

Aby zbudować projekt i uruchomić wszystkie testy (Unit, Compile, Runtime):

```powershell
npm test
```

Możesz też uruchamiać poszczególne etapy:

1.  **Tylko kompilacja projektu:**

    ```powershell
    npm run build
    ```

2.  **Testy jednostkowe (Jest):**

    ```powershell
    npm run test-compile
    ```

3.  **Budowanie pliku testowego `.rbxl` (Rojo):**

    ```powershell
    npm run test-rojo
    ```

4.  **Uruchamianie testów w środowisku Lune:**
    ```powershell
    npm run test-run
    ```

## Testowanie wersji DEV w innym projekcie

Aby przetestować swoje zmiany w realnym projekcie (np. `roblox-flowind-ui`), możesz podlinkować lokalną wersję kompilatora.

### 1. Przygotowanie linkowania (w repozytorium `roblox-ts`)

Uruchom poniższą komendę, aby zbudować kompilator i zarejestrować go jako pakiet globalny `roblox-ts-dev`:

```powershell
npm run devlink
```

_Uwaga: Musisz uruchomić `npm run build` za każdym razem, gdy wprowadzasz zmiany w kodzie źródłowym, aby zostały one odzwierciedlone w wersji dev._

### 2. Podpięcie w projekcie docelowym

Przejdź do katalogu swojego projektu (np. `e:\Projekty\roblox-flowind-ui`) i wpisz:

```powershell
npm link roblox-ts-dev
```

### 3. Używanie kompilatora DEV

Zamiast standardowej komendy `rbxtsc`, używaj `rbxtsc-dev`.

Przykłady:

```powershell
# Kompilacja jednorazowa
rbxtsc-dev

# Tryb śledzenia zmian (Watch Mode)
rbxtsc-dev -w

# Uruchomienie przez npx (jeśli nie działa bezpośrednio)
npx rbxtsc-dev
```

### 4. Odpięcie wersji DEV

Gdy skończysz testy i chcesz wrócić do stabilnej wersji:

```powershell
npm unlink roblox-ts-dev
```

## Testowanie lokalne @rbxts/compiler-types

Jeśli musisz przetestować zmiany w definicjach typów (`@rbxts/compiler-types`) razem z kompilatorem:

1.  **Sklonuj repozytorium types:**
    ```powershell
    git clone https://github.com/roblox-ts/compiler-types
    cd compiler-types
    ```

2.  **Zarejestruj link:**
    ```powershell
    npm install
    npm link
    ```

3.  **Podepnij w projekcie docelowym:**
    W katalogu swojego projektu (np. `roblox-flowind-ui`):
    ```powershell
    npm link @rbxts/compiler-types
    ```

    _Teraz Twój projekt będzie używał lokalnych plików `.d.ts` z katalogu `compiler-types`._

4.  **Weryfikacja:**
    Jeśli dodałeś nowe typy (np. `Add<T>`), powinny być teraz widoczne dla kompilatora (jeśli używasz zlinkowanego `roblox-ts-dev`) oraz dla IDE (VS Code).

5.  **Odpięcie:**
    ```powershell
    npm unlink @rbxts/compiler-types
    # Aby przywrócić oryginalną wersję:
    npm install --force
    ```

## Generowanie typów wewnętrznych TypeScript (ts-expose-internals)

Projekt używa lokalnie generowanych typów dla wewnętrznych API TypeScripta, ponieważ oficjalne paczki mogą nie być dostępne dla najnowszych wersji (np. 5.9.3).

### Jak wygenerować typy:
1. Upewnij się, że submoduły są zainicjalizowane:
   ```powershell
   git submodule update --init --recursive
   ```
2. Uruchom skrypt generujący:
   ```powershell
   npm run generate-internals
   ```
   Skrypt ten automatycznie:
   - Pobierze odpowiednią wersję TypeScript (zdefiniowaną w `scripts/generate-internals.ts`).
   - Zbuduje TypeScripta.
   - Wygeneruje pliki `.d.ts` i naprawi je pod kątem kompatybilności.
   - Zapisze wynik w `local-types/ts-expose-internals`.

### Jak zaktualizować wersję TypeScript:
1. Otwórz plik `scripts/generate-internals.ts`.
2. Zmień wartość zmiennej `TS_VERSION` na nową wersję (np. `"5.10.0"`).
3. Uruchom `npm run generate-internals`.
4. Zaktualizuj również wersję TypeScript w `submodules/compiler-types/package.json` i `package.json` (jeśli wymagane).

## Publikowanie wersji testowej (Beta/Snapshot) na npm

Aby udostępnić wersję do testów dla innych użytkowników bez wpływania na główny tag `latest`:

### Automatyczna publikacja (Zalecane)

Dodano skrypt, który automatycznie publikuje zarówno `@radomiej/compiler-types`, jak i `@radomiej/roblox-ts` w wersji beta.

1. Upewnij się, że jesteś zalogowany w npm:
   ```powershell
   npm login
   ```
2. Uruchom skrypt:
   ```powershell
   npm run publish-beta
   ```

Skrypt ten:
- Opublikuje `submodules/compiler-types` jako `@radomiej/compiler-types`.
- Zbuduje `roblox-ts`.
- Opublikuje `roblox-ts` jako `@radomiej/roblox-ts`.

### Ręczna publikacja (Alternatywa)

Aby udostępnić wersję do testów dla innych użytkowników bez wpływania na główny tag `latest`:

1.  **Zmień wersję w `package.json`** na wersję prerelease, np. `3.0.9-beta.1`.
2.  **Zbuduj projekt:**
    ```powershell
    npm run build
    ```
3.  **Opublikuj z tagiem `beta`:**
    ```powershell
    npm publish --tag beta
    ```
    *Upewnij się, że jesteś zalogowany (`npm login`).*

### Jak inni mogą zainstalować wersję testową:
```powershell
npm install roblox-ts@beta
# lub konkretną wersję
npm install roblox-ts@3.0.9-beta.1
```
