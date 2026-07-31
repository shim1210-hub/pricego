@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ============================================================
rem KimPM Project Information v1.0
rem Usage:
rem   project-info.bat C:\dev\project-name
rem ============================================================

set "PROJECT_PATH=%~1"

cls
echo ============================================================
echo KimPM Project Information v1.0
echo ============================================================
echo.

if not defined PROJECT_PATH (
    echo [ERROR] Project path was not provided.
    echo.
    echo Usage:
    echo   project-info.bat C:\dev\project-name
    echo.
    exit /b 1
)

if not exist "%PROJECT_PATH%" (
    echo [ERROR] Project path does not exist.
    echo Path: %PROJECT_PATH%
    echo.
    exit /b 1
)

for %%I in ("%PROJECT_PATH%") do set "PROJECT_NAME=%%~nxI"

echo Project Name   : !PROJECT_NAME!
echo Local Path     : %PROJECT_PATH%
echo.

echo ------------------------------------------------------------
echo Git Information
echo ------------------------------------------------------------

git -C "%PROJECT_PATH%" rev-parse --is-inside-work-tree >nul 2>&1

if errorlevel 1 (
    echo Git Repository : NO
    echo Branch         : -
    echo Upstream       : -
    echo Git Status     : -
) else (
    echo Git Repository : YES

    for /f "delims=" %%A in ('git -C "%PROJECT_PATH%" branch --show-current 2^>nul') do (
        set "GIT_BRANCH=%%A"
    )

    if not defined GIT_BRANCH set "GIT_BRANCH=UNKNOWN"

    for /f "delims=" %%A in ('git -C "%PROJECT_PATH%" rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2^>nul') do (
        set "GIT_UPSTREAM=%%A"
    )

    if not defined GIT_UPSTREAM set "GIT_UPSTREAM=NOT SET"

    git -C "%PROJECT_PATH%" diff --quiet >nul 2>&1
    set "WORKTREE_CHANGED=!errorlevel!"

    git -C "%PROJECT_PATH%" diff --cached --quiet >nul 2>&1
    set "STAGED_CHANGED=!errorlevel!"

    for /f "delims=" %%A in ('git -C "%PROJECT_PATH%" ls-files --others --exclude-standard 2^>nul') do (
        set "UNTRACKED_CHANGED=1"
    )

    if "!WORKTREE_CHANGED!"=="0" if "!STAGED_CHANGED!"=="0" if not defined UNTRACKED_CHANGED (
        set "GIT_STATUS=CLEAN"
    ) else (
        set "GIT_STATUS=CHANGED"
    )

    echo Branch         : !GIT_BRANCH!
    echo Upstream       : !GIT_UPSTREAM!
    echo Git Status     : !GIT_STATUS!
)

echo.
echo ------------------------------------------------------------
echo Development Environment
echo ------------------------------------------------------------

where node >nul 2>&1

if errorlevel 1 (
    echo Node.js        : NOT INSTALLED
) else (
    for /f "delims=" %%A in ('node --version 2^>nul') do set "NODE_VERSION=%%A"
    echo Node.js        : !NODE_VERSION!
)

where npm >nul 2>&1

if errorlevel 1 (
    echo npm            : NOT INSTALLED
) else (
    for /f "delims=" %%A in ('npm --version 2^>nul') do set "NPM_VERSION=%%A"
    echo npm            : !NPM_VERSION!
)

if exist "%PROJECT_PATH%\package.json" (
    echo package.json   : OK
) else (
    echo package.json   : NOT FOUND
)

if exist "%PROJECT_PATH%\next.config.js" (
    echo Framework      : Next.js
) else if exist "%PROJECT_PATH%\next.config.mjs" (
    echo Framework      : Next.js
) else if exist "%PROJECT_PATH%\next.config.ts" (
    echo Framework      : Next.js
) else if exist "%PROJECT_PATH%\app.json" (
    echo Framework      : Expo / React Native
) else (
    echo Framework      : UNKNOWN
)

echo.
echo ------------------------------------------------------------
echo KimPM Standard Files
echo ------------------------------------------------------------

call :CHECK_FILE "AGENTS.md" "%PROJECT_PATH%\AGENTS.md"
call :CHECK_FILE "KIMPM.md" "%PROJECT_PATH%\KIMPM.md"
call :CHECK_FILE "README.md" "%PROJECT_PATH%\README.md"
call :CHECK_DIR  "docs" "%PROJECT_PATH%\docs"
call :CHECK_DIR  "prompts" "%PROJECT_PATH%\prompts"

echo.
echo ------------------------------------------------------------
echo KimPM Version
echo ------------------------------------------------------------

if exist "%PROJECT_PATH%\VERSION" (
    set /p KIMPM_VERSION=<"%PROJECT_PATH%\VERSION"
    echo Version        : !KIMPM_VERSION!
) else (
    echo Version        : VERSION FILE NOT FOUND
)

echo.
echo ============================================================
echo Project information completed.
echo ============================================================
echo.

exit /b 0


:CHECK_FILE
if exist "%~2" (
    echo %~1 : OK
) else (
    echo %~1 : NOT FOUND
)
exit /b 0


:CHECK_DIR
if exist "%~2\" (
    echo %~1 : OK
) else (
    echo %~1 : NOT FOUND
)
exit /b 0