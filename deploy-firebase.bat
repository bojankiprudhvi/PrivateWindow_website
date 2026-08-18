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
set "DOWNLOAD_DIR=%~dp0public\downloads"

REM Deploy-only mode: do not build or package the application installer.
REM The deploy script will use public/downloads/installer.json if present.
if exist "%SITE_DIR%public\downloads\installer.json" (
    if not exist "%DOWNLOAD_DIR%" mkdir "%DOWNLOAD_DIR%"
    copy /Y "%SITE_DIR%public\downloads\installer.json" "%DOWNLOAD_DIR%\" >nul 2>&1
    echo Using installer metadata from public/downloads/installer.json
) else (
    echo No installer metadata found at public/downloads/installer.json. Proceeding to deploy site only.
)

:DEPLOY
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
