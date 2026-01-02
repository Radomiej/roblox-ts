# Script: Przywrócenie Oryginalnej Wersji roblox-ts
# Użycie: .\restore-original-version.ps1 -ProjectPath "E:\Projekty\roblox-flowind-ui"

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath
)

Write-Host "=== Przywracanie Oryginalnej Wersji roblox-ts ===" -ForegroundColor Cyan
Write-Host ""

# Sprawdź czy projekt istnieje
if (-not (Test-Path $ProjectPath)) {
    Write-Host "ERROR: Projekt nie istnieje: $ProjectPath" -ForegroundColor Red
    exit 1
}

# Przejdź do projektu
Push-Location $ProjectPath

try {
    # Sprawdź czy jest backup
    if (Test-Path "package.json.backup") {
        Write-Host "1. Znaleziono backup package.json" -ForegroundColor Yellow
        Write-Host "   Przywracanie z backupu..." -ForegroundColor Gray

        Copy-Item "package.json.backup" "package.json" -Force
        Write-Host "   ✓ package.json przywrócony" -ForegroundColor Green

        Write-Host ""
        Write-Host "2. Reinstalacja zależności..." -ForegroundColor Yellow

        # Usuń node_modules i package-lock.json
        if (Test-Path "node_modules") {
            Write-Host "   Usuwanie node_modules..." -ForegroundColor Gray
            Remove-Item -Recurse -Force "node_modules"
        }
        if (Test-Path "package-lock.json") {
            Remove-Item -Force "package-lock.json"
        }

        # Reinstaluj
        Write-Host "   Instalacja zależności (to może chwilę potrwać)..." -ForegroundColor Gray
        npm install

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Zależności zainstalowane" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Błąd instalacji zależności" -ForegroundColor Red
            exit 1
        }

    } else {
        Write-Host "1. Brak backupu - instalacja ręczna" -ForegroundColor Yellow
        Write-Host ""

        # Usuń custom wersję
        Write-Host "2. Usuwanie custom wersji..." -ForegroundColor Yellow
        npm uninstall @radomiej/roblox-ts 2>&1 | Out-Null
        npm uninstall roblox-ts 2>&1 | Out-Null

        # Instaluj oficjalną wersję
        Write-Host ""
        Write-Host "3. Instalacja oficjalnej wersji roblox-ts..." -ForegroundColor Yellow
        npm install roblox-ts@^3.0.0 --save-dev

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Oficjalna wersja zainstalowana" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Błąd instalacji" -ForegroundColor Red
            exit 1
        }

        # Przywróć TypeScript 5.6
        Write-Host ""
        Write-Host "4. Przywracanie TypeScript 5.6..." -ForegroundColor Yellow
        npm install typescript@5.6.3 --save-dev

        # Przywróć compiler types
        Write-Host ""
        Write-Host "5. Przywracanie @rbxts/compiler-types..." -ForegroundColor Yellow
        npm install @rbxts/compiler-types@^3.0.0-types.0 --save-dev
    }

    # Wyczyść cache
    Write-Host ""
    Write-Host "6. Czyszczenie cache..." -ForegroundColor Yellow
    if (Test-Path "out") {
        Remove-Item -Recurse -Force "out"
        Write-Host "   ✓ Usunięto out/" -ForegroundColor Green
    }
    if (Test-Path "node_modules\.cache") {
        Remove-Item -Recurse -Force "node_modules\.cache"
        Write-Host "   ✓ Usunięto node_modules/.cache" -ForegroundColor Green
    }

    # Sprawdź wersję
    Write-Host ""
    Write-Host "7. Weryfikacja..." -ForegroundColor Yellow
    $versionOutput = npx rbxtsc --version 2>&1
    Write-Host "   Zainstalowana wersja: $versionOutput" -ForegroundColor Cyan

    # Test kompilacji
    Write-Host ""
    Write-Host "8. Test kompilacji..." -ForegroundColor Yellow
    npm run build

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Kompilacja działa" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Błąd kompilacji - sprawdź logi" -ForegroundColor Red
    }

    # Podsumowanie
    Write-Host ""
    Write-Host "=== Przywracanie zakończone ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Oryginalna wersja roblox-ts została przywrócona." -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
