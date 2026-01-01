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
