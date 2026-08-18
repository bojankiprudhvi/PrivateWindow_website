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

pushd "%~dp0.."
call package-release.bat
set "PACKAGE_RESULT=%ERRORLEVEL%"
popd

if not "%PACKAGE_RESULT%"=="0" exit /b %PACKAGE_RESULT%

set "INSTALLER="
for %%F in ("%RELEASE_DIR%\PrivateWindow-*-windows-x64-Setup.exe") do set "INSTALLER=%%~fF"

if not defined INSTALLER (
    echo ERROR: The release installer was not found in %RELEASE_DIR%.
    exit /b 1
)

if not exist "%DOWNLOAD_DIR%" mkdir "%DOWNLOAD_DIR%"
copy /Y "%INSTALLER%" "%DOWNLOAD_DIR%\" >nul
if errorlevel 1 (
    echo ERROR: Could not stage the installer for the website.
    exit /b 1
)

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
