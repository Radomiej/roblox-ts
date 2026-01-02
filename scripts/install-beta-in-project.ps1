# Script: Instalacja Beta Wersji roblox-ts w Projekcie
# Użycie: .\install-beta-in-project.ps1 -ProjectPath "E:\Projekty\roblox-flowind-ui" -Version "3.1.0-beta.3"

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$false)]
    [string]$Version = "beta",

    [Parameter(Mandatory=$false)]
    [string]$PackageName = "@radomiej/roblox-ts",

    [Parameter(Mandatory=$false)]
    [switch]$UpgradeTypeScript = $false
)

Write-Host "=== Instalacja Custom roblox-ts ===" -ForegroundColor Cyan
Write-Host ""

# Sprawdź czy projekt istnieje
if (-not (Test-Path $ProjectPath)) {
    Write-Host "ERROR: Projekt nie istnieje: $ProjectPath" -ForegroundColor Red
    exit 1
}

# Przejdź do projektu
Push-Location $ProjectPath

try {
    # Backup package.json
    Write-Host "1. Tworzenie backupu package.json..." -ForegroundColor Yellow
    Copy-Item "package.json" "package.json.backup" -Force
    Write-Host "   ✓ Backup utworzony: package.json.backup" -ForegroundColor Green

    # Usuń starą wersję roblox-ts
    Write-Host ""
    Write-Host "2. Usuwanie starej wersji roblox-ts..." -ForegroundColor Yellow
    npm uninstall roblox-ts 2>&1 | Out-Null
    Write-Host "   ✓ Stara wersja usunięta" -ForegroundColor Green

    # Instaluj nową wersję
    Write-Host ""
    Write-Host "3. Instalacja $PackageName@$Version..." -ForegroundColor Yellow
    $installCmd = "npm install $PackageName@$Version --save-dev"
    Write-Host "   Wykonuję: $installCmd" -ForegroundColor Gray
    Invoke-Expression $installCmd

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Custom kompilator zainstalowany" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Błąd instalacji kompilatora" -ForegroundColor Red
        exit 1
    }

    # Upgrade TypeScript jeśli wymagane
    if ($UpgradeTypeScript) {
        Write-Host ""
        Write-Host "4. Upgrade TypeScript do 5.9.2..." -ForegroundColor Yellow
        npm install typescript@5.9.2 --save-dev

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ TypeScript zaktualizowany" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Błąd aktualizacji TypeScript" -ForegroundColor Red
        }

        Write-Host ""
        Write-Host "5. Aktualizacja @rbxts/compiler-types..." -ForegroundColor Yellow
        npm install @rbxts/compiler-types@latest --save-dev

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Compiler types zaktualizowane" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Błąd aktualizacji compiler types" -ForegroundColor Red
        }
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
    Write-Host "7. Weryfikacja instalacji..." -ForegroundColor Yellow
    $versionOutput = npx rbxtsc --version 2>&1
    Write-Host "   Zainstalowana wersja: $versionOutput" -ForegroundColor Cyan

    # Podsumowanie
    Write-Host ""
    Write-Host "=== Instalacja zakończona ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Następne kroki:" -ForegroundColor Cyan
    Write-Host "  1. Sprawdź tsconfig.json - upewnij się że typeRoots nie zawiera symlinkowanych katalogów"
    Write-Host "  2. Uruchom: npm run build"
    Write-Host "  3. Jeśli wystąpią problemy, sprawdź TESTING_GUIDE.md"
    Write-Host ""
    Write-Host "Aby przywrócić oryginalną wersję:" -ForegroundColor Yellow
    Write-Host "  .\restore-original-version.ps1 -ProjectPath `"$ProjectPath`""
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
