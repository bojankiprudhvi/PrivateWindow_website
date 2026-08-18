@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Builds the current Windows installer, stages it in the static site, then
REM deploys the existing Vite website to the Firebase project passed as %1.

if "%~1"=="" (
    echo Usage: deploy-firebase.bat FIREBASE_PROJECT_ID
    echo Example: deploy-firebase.bat private-window-12345
    exit /b 1
)

set "FIREBASE_PROJECT_ID=%~1"
set "SITE_DIR=%~dp0"
set "RELEASE_DIR=%~dp0..\build-release"
set "DOWNLOAD_DIR=%~dp0public\downloads"

REM If the site already contains installer metadata, use that and skip packaging.
if exist "%SITE_DIR%public\downloads\installer.json" (
    for /f "usebackq delims=" %%U in (`powershell -NoProfile -Command "(Get-Content '%SITE_DIR%public\\downloads\\installer.json' -Raw | ConvertFrom-Json).url"`) do set "DOWNLOAD_URL=%%~U"
    if defined DOWNLOAD_URL (
        echo Using existing installer URL from public/downloads/installer.json
        if not exist "%DOWNLOAD_DIR%" mkdir "%DOWNLOAD_DIR%"
        echo { "url": "%DOWNLOAD_URL%" } > "%DOWNLOAD_DIR%\installer.json"
        goto BUILD_ONLY
    )
)

REM Prefer an already-built installer in ../build-release or in dist; otherwise run package-release.
set "INSTALLER="
for %%F in ("%RELEASE_DIR%\PrivateWindow-*-windows-x64-Setup.exe") do set "INSTALLER=%%~fF"
if not defined INSTALLER (
    if exist "%~dp0dist\downloads\PrivateWindow-*-windows-x64-Setup.exe" (
        if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"
        copy /Y "%~dp0dist\downloads\PrivateWindow-*-windows-x64-Setup.exe" "%RELEASE_DIR%\" >nul 2>&1
        for %%F in ("%RELEASE_DIR%\PrivateWindow-*-windows-x64-Setup.exe") do set "INSTALLER=%%~fF"
    )
)

if not defined INSTALLER (
    pushd "%~dp0.."
    call package-release.bat
    set "PACKAGE_RESULT=%ERRORLEVEL%"
    popd
    if not "%PACKAGE_RESULT%"=="0" exit /b %PACKAGE_RESULT%
)

set "INSTALLER="
for %%F in ("%RELEASE_DIR%\PrivateWindow-*-windows-x64-Setup.exe") do set "INSTALLER=%%~fF"

if not defined INSTALLER (
    echo ERROR: The release installer was not found in %RELEASE_DIR%.
    exit /b 1
)

REM Determine repository owner/name (requires gh CLI) and create/upload release asset
for /f "usebackq delims=" %%R in (`gh repo view --json nameWithOwner --jq ".nameWithOwner"`) do set "REPO=%%~R"
for %%F in ("%INSTALLER%") do set "INSTALLER_NAME=%%~nxF"

REM Use short commit as release tag to avoid collisions
for /f "delims=" %%H in ('git rev-parse --short HEAD') do set "SHORT=%%H"
set "RELEASE_TAG=v%SHORT%"

REM Create release if it doesn't exist, otherwise upload/replace the asset
gh release view "%RELEASE_TAG%" --repo "%REPO%" >nul 2>&1 || gh release create "%RELEASE_TAG%" "%INSTALLER%" --repo "%REPO%" --title "%RELEASE_TAG%" --notes "Automated release %RELEASE_TAG%"
gh release upload "%RELEASE_TAG%" "%INSTALLER%" --repo "%REPO%" --clobber >nul 2>&1

REM Extract browser_download_url for the uploaded asset
for /f "usebackq delims=" %%U in (`gh release view "%RELEASE_TAG%" --repo "%REPO%" --json assets --jq ".assets[] | select(.name==\"%INSTALLER_NAME%\") | .browser_download_url"`) do set "DOWNLOAD_URL=%%~U"

if not defined DOWNLOAD_URL (
    echo ERROR: Could not determine download URL for the installer asset.
    exit /b 1
)

if not exist "%DOWNLOAD_DIR%" mkdir "%DOWNLOAD_DIR%"
echo { "url": "%DOWNLOAD_URL%" } > "%DOWNLOAD_DIR%\installer.json"
git add "%DOWNLOAD_DIR%\installer.json" >nul 2>&1
git commit -m "Add installer metadata for %RELEASE_TAG%" >nul 2>&1 || echo "No changes to commit"

pushd "%SITE_DIR%"
call npm run build
if errorlevel 1 (
    popd
    exit /b 1
)

call npx firebase-tools deploy --only hosting --project "%FIREBASE_PROJECT_ID%"
set "DEPLOY_RESULT=%ERRORLEVEL%"
popd

if not "%DEPLOY_RESULT%"=="0" exit /b %DEPLOY_RESULT%

echo.
echo Firebase Hosting deployment completed.
endlocal
