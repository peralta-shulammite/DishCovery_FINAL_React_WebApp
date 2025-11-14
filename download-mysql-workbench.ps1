# PowerShell script to download and install MySQL Workbench to D drive
# Run this script as Administrator for best results

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MySQL Workbench Download & Install Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create download directory on D drive
$downloadPath = "D:\Downloads"
$installerPath = "$downloadPath\mysql-workbench-installer.msi"
$installPath = "D:\MySQL\MySQL Workbench"

# Create directories if they don't exist
if (-not (Test-Path $downloadPath)) {
    New-Item -ItemType Directory -Path $downloadPath -Force | Out-Null
    Write-Host "✅ Created directory: $downloadPath" -ForegroundColor Green
}

Write-Host "📥 Step 1: Downloading MySQL Workbench..." -ForegroundColor Yellow
Write-Host ""

# Try to download from MySQL website
$downloadUrl = "https://dev.mysql.com/get/Downloads/MySQLWorkbench/mysql-workbench-community-8.0.40-winx64.msi"

try {
    Write-Host "Attempting to download from MySQL website..." -ForegroundColor Gray
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -ErrorAction Stop
    Write-Host "✅ Download successful!" -ForegroundColor Green
    Write-Host "   Location: $installerPath" -ForegroundColor Gray
} catch {
    Write-Host "❌ Direct download failed. Opening download page in browser..." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please follow these steps:" -ForegroundColor Yellow
    Write-Host "1. The MySQL download page will open in your browser" -ForegroundColor White
    Write-Host "2. Click 'No thanks, just start my download'" -ForegroundColor White
    Write-Host "3. Save the file to: $downloadPath" -ForegroundColor White
    Write-Host "4. Name it: mysql-workbench-installer.msi" -ForegroundColor White
    Write-Host ""
    
    # Open the download page
    Start-Process "https://dev.mysql.com/downloads/workbench/"
    
    # Wait for user to download
    Write-Host "Press any key after you've downloaded the installer..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    # Check if file exists
    if (-not (Test-Path $installerPath)) {
        Write-Host "❌ Installer not found at: $installerPath" -ForegroundColor Red
        Write-Host "Please check if the file was downloaded correctly." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "📦 Step 2: Installing MySQL Workbench to D drive..." -ForegroundColor Yellow
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Not running as Administrator. Installation may require admin rights." -ForegroundColor Yellow
    Write-Host "   Right-click PowerShell and select 'Run as Administrator' for best results." -ForegroundColor Yellow
    Write-Host ""
}

# Install to D drive
Write-Host "Installing to: $installPath" -ForegroundColor Gray
Write-Host ""

# MSI installation with custom path
$msiArgs = @(
    "/i",
    "`"$installerPath`"",
    "/qn",  # Quiet mode
    "INSTALLDIR=`"$installPath`"",
    "/L*v",
    "$downloadPath\mysql-workbench-install.log"
)

try {
    Start-Process "msiexec.exe" -ArgumentList $msiArgs -Wait -NoNewWindow
    Write-Host "✅ Installation completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "MySQL Workbench has been installed to: $installPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now:" -ForegroundColor Yellow
    Write-Host "1. Launch MySQL Workbench from Start Menu" -ForegroundColor White
    Write-Host "2. Or run: $installPath\MySQLWorkbench.exe" -ForegroundColor White
} catch {
    Write-Host "❌ Installation failed. Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Run the installer manually and choose 'Custom' installation" -ForegroundColor Yellow
    Write-Host "Then set the installation path to: $installPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


