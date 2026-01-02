# Script: Install Beta Version of roblox-ts in Project
# Usage: .\install-beta-in-project.ps1 -ProjectPath "E:\Projekty\roblox-flowind-ui" -Version "3.1.0-beta.3"

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

Write-Host "=== Installing Custom roblox-ts ===" -ForegroundColor Cyan
Write-Host ""

# Check if project exists
if (-not (Test-Path $ProjectPath)) {
    Write-Host "ERROR: Project does not exist: $ProjectPath" -ForegroundColor Red
    exit 1
}

# Navigate to project
Push-Location $ProjectPath

try {
    # Backup package.json
    Write-Host "1. Creating backup of package.json..." -ForegroundColor Yellow
    Copy-Item "package.json" "package.json.backup" -Force
    Write-Host "   ✓ Backup created: package.json.backup" -ForegroundColor Green

    # Remove old version of roblox-ts
    Write-Host ""
    Write-Host "2. Removing old version of roblox-ts..." -ForegroundColor Yellow
    npm uninstall roblox-ts 2>&1 | Out-Null
    Write-Host "   ✓ Old version removed" -ForegroundColor Green

    # Install new version
    Write-Host ""
    Write-Host "3. Installing $PackageName@$Version..." -ForegroundColor Yellow
    $installCmd = "npm install $PackageName@$Version --save-dev"
    Write-Host "   Running: $installCmd" -ForegroundColor Gray
    Invoke-Expression $installCmd

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Custom compiler installed" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Compiler installation error" -ForegroundColor Red
        exit 1
    }

    # Upgrade TypeScript if required
    if ($UpgradeTypeScript) {
        Write-Host ""
        Write-Host "4. Upgrading TypeScript to 5.9.3..." -ForegroundColor Yellow
        npm install typescript@5.9.3 --save-dev

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ TypeScript updated" -ForegroundColor Green
        } else {
            Write-Host "   ✗ TypeScript update error" -ForegroundColor Red
        }

        Write-Host ""
        Write-Host "5. Updating @rbxts/compiler-types..." -ForegroundColor Yellow
        npm install @rbxts/compiler-types@latest --save-dev

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Compiler types updated" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Compiler types update error" -ForegroundColor Red
        }
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
    Write-Host "7. Verifying installation..." -ForegroundColor Yellow
    $versionOutput = npx rbxtsc --version 2>&1
    Write-Host "   Installed version: $versionOutput" -ForegroundColor Cyan

    # Summary
    Write-Host ""
    Write-Host "=== Installation complete ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Check tsconfig.json - make sure typeRoots doesn't contain symlinked directories"
    Write-Host "  2. Run: npm run build"
    Write-Host "  3. If issues occur, check TESTING_GUIDE.md"
    Write-Host ""
    Write-Host "To restore the original version:" -ForegroundColor Yellow
    Write-Host "  .\restore-original-version.ps1 -ProjectPath `"$ProjectPath`""
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
