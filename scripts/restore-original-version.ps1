# Script: Restore Original Version of roblox-ts
# Usage: .\restore-original-version.ps1 -ProjectPath "E:\Projekty\roblox-flowind-ui"

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath
)

Write-Host "=== Restoring Original Version of roblox-ts ===" -ForegroundColor Cyan
Write-Host ""

# Check if project exists
if (-not (Test-Path $ProjectPath)) {
    Write-Host "ERROR: Project does not exist: $ProjectPath" -ForegroundColor Red
    exit 1
}

# Navigate to project
Push-Location $ProjectPath

try {
    # Check if backup exists
    if (Test-Path "package.json.backup") {
        Write-Host "1. Found package.json backup" -ForegroundColor Yellow
        Write-Host "   Restoring from backup..." -ForegroundColor Gray

        Copy-Item "package.json.backup" "package.json" -Force
        Write-Host "   ✓ package.json restored" -ForegroundColor Green

        Write-Host ""
        Write-Host "2. Reinstalling dependencies..." -ForegroundColor Yellow

        # Remove node_modules and package-lock.json
        if (Test-Path "node_modules") {
            Write-Host "   Removing node_modules..." -ForegroundColor Gray
            Remove-Item -Recurse -Force "node_modules"
        }
        if (Test-Path "package-lock.json") {
            Remove-Item -Force "package-lock.json"
        }

        # Reinstall
        Write-Host "   Installing dependencies (this may take a moment)..." -ForegroundColor Gray
        npm install

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Dependencies installed" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Dependency installation error" -ForegroundColor Red
            exit 1
        }

    } else {
        Write-Host "1. No backup found - manual installation" -ForegroundColor Yellow
        Write-Host ""

        # Remove custom version
        Write-Host "2. Removing custom version..." -ForegroundColor Yellow
        npm uninstall @radomiej/roblox-ts 2>&1 | Out-Null
        npm uninstall roblox-ts 2>&1 | Out-Null

        # Install official version
        Write-Host ""
        Write-Host "3. Installing official roblox-ts version..." -ForegroundColor Yellow
        npm install roblox-ts@^3.0.0 --save-dev

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Official version installed" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Installation error" -ForegroundColor Red
            exit 1
        }

        # Restore TypeScript 5.6
        Write-Host ""
        Write-Host "4. Restoring TypeScript 5.6..." -ForegroundColor Yellow
        npm install typescript@5.6.3 --save-dev

        # Restore compiler types
        Write-Host ""
        Write-Host "5. Restoring @rbxts/compiler-types..." -ForegroundColor Yellow
        npm install @rbxts/compiler-types@^3.0.0-types.0 --save-dev
    }

    # Clean cache
    Write-Host ""
    Write-Host "6. Cleaning cache..." -ForegroundColor Yellow
    if (Test-Path "out") {
        Remove-Item -Recurse -Force "out"
        Write-Host "   ✓ Removed out/" -ForegroundColor Green
    }
    if (Test-Path "node_modules\.cache") {
        Remove-Item -Recurse -Force "node_modules\.cache"
        Write-Host "   ✓ Removed node_modules/.cache" -ForegroundColor Green
    }

    # Check version
    Write-Host ""
    Write-Host "7. Verifying..." -ForegroundColor Yellow
    $versionOutput = npx rbxtsc --version 2>&1
    Write-Host "   Installed version: $versionOutput" -ForegroundColor Cyan

    # Test compilation
    Write-Host ""
    Write-Host "8. Testing compilation..." -ForegroundColor Yellow
    npm run build

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Compilation works" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Compilation error - check logs" -ForegroundColor Red
    }

    # Summary
    Write-Host ""
    Write-Host "=== Restoration complete ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Original version of roblox-ts has been restored." -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
