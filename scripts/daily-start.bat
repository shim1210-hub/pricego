@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM KimPM Daily Start v1.0
REM
REM Purpose:
REM   Prepare a project for daily development.
REM
REM Process:
REM   1. Validate project path
REM   2. Check Git repository
REM   3. Run git fetch
REM   4. Show Git status
REM   5. Run KimPM project checker
REM   6. Open the project in VS Code
REM
REM Usage:
REM   scripts\daily-start.bat C:\dev\project-name
REM
REM Example:
REM   scripts\daily-start.bat C:\dev\pricego
REM ============================================================

set "TARGET_PATH=%~1"
set "SCRIPT_DIR=%~dp0"
set "CHECK_SCRIPT=%SCRIPT_DIR%check-project.bat"

set /a WARN_COUNT=0
set /a FAIL_COUNT=0

if "%TARGET_PATH%"=="" (
    echo.
    echo [ERROR] Target project path is required.
    echo.
    echo Usage:
    echo   daily-start.bat C:\dev\project-name
    echo.
    exit /b 1
)

if not exist "%TARGET_PATH%\" (
    echo.
    echo [ERROR] Target project folder does not exist.
    echo Target: %TARGET_PATH%
    echo.
    exit /b 1
)

if not exist "%CHECK_SCRIPT%" (
    echo.
    echo [ERROR] KimPM project checker was not found.
    echo Expected:
    echo   %CHECK_SCRIPT%
    echo.
    exit /b 1
)

pushd "%TARGET_PATH%" >nul 2>&1

if errorlevel 1 (
    echo.
    echo [ERROR] Cannot access the target project folder.
    echo Target: %TARGET_PATH%
    echo.
    exit /b 1
)

echo.
echo ============================================================
echo KimPM Daily Start v1.0
echo ============================================================
echo Project: %CD%
echo Date   : %DATE% %TIME%
echo ============================================================
echo.

REM ============================================================
REM 1. Git repository check
REM ============================================================

echo [1/6] Checking Git repository
echo ------------------------------------------------------------

where git >nul 2>&1

if errorlevel 1 (
    echo [FAIL] Git is not installed or unavailable in PATH.
    set /a FAIL_COUNT+=1
) else (
    for /f "delims=" %%G in ('git --version 2^>nul') do (
        echo [PASS] %%G
    )

    git rev-parse --is-inside-work-tree >nul 2>&1

    if errorlevel 1 (
        echo [WARN] This folder is not a Git repository.
        set /a WARN_COUNT+=1
    ) else (
        echo [PASS] Git repository detected.
    )
)

echo.

REM ============================================================
REM 2. Git fetch
REM ============================================================

echo [2/6] Fetching remote Git information
echo ------------------------------------------------------------

git rev-parse --is-inside-work-tree >nul 2>&1

if errorlevel 1 (
    echo [SKIP] Git fetch skipped.
) else (
    git remote get-url origin >nul 2>&1

    if errorlevel 1 (
        echo [WARN] Git remote 'origin' is not configured.
        set /a WARN_COUNT+=1
    ) else (
        echo [INFO] Running git fetch origin...
        git fetch origin

        if errorlevel 1 (
            echo [WARN] Git fetch failed.
            echo        Check network access or Git credentials.
            set /a WARN_COUNT+=1
        ) else (
            echo [PASS] Git fetch completed.
        )
    )
)

echo.

REM ============================================================
REM 3. Git branch and synchronization status
REM ============================================================

echo [3/6] Checking Git synchronization
echo ------------------------------------------------------------

git rev-parse --is-inside-work-tree >nul 2>&1

if errorlevel 1 (
    echo [SKIP] Git synchronization check skipped.
) else (
    set "CURRENT_BRANCH="
    set "UPSTREAM_BRANCH="
    set "AHEAD_COUNT=0"
    set "BEHIND_COUNT=0"

    for /f "delims=" %%B in ('git branch --show-current 2^>nul') do (
        set "CURRENT_BRANCH=%%B"
    )

    if defined CURRENT_BRANCH (
        echo [PASS] Current branch: !CURRENT_BRANCH!
    ) else (
        echo [WARN] Current branch could not be identified.
        set /a WARN_COUNT+=1
    )

    for /f "delims=" %%U in ('git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2^>nul') do (
        set "UPSTREAM_BRANCH=%%U"
    )

    if not defined UPSTREAM_BRANCH (
        echo [WARN] Upstream branch is not configured.
        set /a WARN_COUNT+=1
    ) else (
        echo [PASS] Upstream branch: !UPSTREAM_BRANCH!

        for /f "tokens=1,2" %%A in ('git rev-list --left-right --count HEAD...@{u} 2^>nul') do (
            set "AHEAD_COUNT=%%A"
            set "BEHIND_COUNT=%%B"
        )

        echo [INFO] Ahead : !AHEAD_COUNT!
        echo [INFO] Behind: !BEHIND_COUNT!

        if !BEHIND_COUNT! GTR 0 (
            echo [WARN] Remote commits are available.
            echo        Review local changes before running git pull.
            set /a WARN_COUNT+=1
        ) else (
            echo [PASS] No remote commits are waiting to be pulled.
        )

        if !AHEAD_COUNT! GTR 0 (
            echo [WARN] Local commits are waiting to be pushed.
            set /a WARN_COUNT+=1
        ) else (
            echo [PASS] No local commits are waiting to be pushed.
        )
    )
)

echo.

REM ============================================================
REM 4. Working tree status
REM ============================================================

echo [4/6] Checking working tree
echo ------------------------------------------------------------

git rev-parse --is-inside-work-tree >nul 2>&1

if errorlevel 1 (
    echo [SKIP] Working tree check skipped.
) else (
    set "GIT_CHANGES_FOUND=N"

    for /f "delims=" %%S in ('git status --porcelain 2^>nul') do (
        set "GIT_CHANGES_FOUND=Y"
    )

    if "!GIT_CHANGES_FOUND!"=="Y" (
        echo [WARN] Working tree contains changes.
        echo.
        git status --short
        echo.
        set /a WARN_COUNT+=1
    ) else (
        echo [PASS] Working tree is clean.
    )
)

echo.

REM ============================================================
REM 5. KimPM project readiness check
REM ============================================================

echo [5/6] Running KimPM project checker
echo ------------------------------------------------------------

call "%CHECK_SCRIPT%" "%TARGET_PATH%"
set "CHECK_RESULT=%ERRORLEVEL%"

if "!CHECK_RESULT!"=="0" (
    echo [PASS] KimPM project check completed.
) else if "!CHECK_RESULT!"=="2" (
    echo [FAIL] KimPM project check found critical issues.
    set /a FAIL_COUNT+=1
) else (
    echo [WARN] KimPM project check did not complete normally.
    set /a WARN_COUNT+=1
)

echo.

REM ============================================================
REM 6. Open VS Code
REM ============================================================

echo [6/6] Opening VS Code
echo ------------------------------------------------------------

where code >nul 2>&1

if errorlevel 1 (
    echo [WARN] VS Code command 'code' is unavailable in PATH.
    echo        Open the project manually in VS Code.
    set /a WARN_COUNT+=1
) else (
    code "%TARGET_PATH%"

    if errorlevel 1 (
        echo [WARN] VS Code could not be opened.
        set /a WARN_COUNT+=1
    ) else (
        echo [PASS] VS Code opened successfully.
    )
)

echo.
echo ============================================================
echo KimPM Daily Start Summary
echo ============================================================
echo Warnings: !WARN_COUNT!
echo Failures: !FAIL_COUNT!
echo ============================================================

if !FAIL_COUNT! GTR 0 (
    echo.
    echo [RESULT] DEVELOPMENT NOT READY
    echo Critical issues were detected.
    echo Review the messages above before starting development.
    echo.
    popd
    exit /b 2
)

if !WARN_COUNT! GTR 0 (
    echo.
    echo [RESULT] DEVELOPMENT READY WITH WARNINGS
    echo Development can begin after reviewing the warnings.
    echo.
    popd
    exit /b 0
)

echo.
echo [RESULT] DEVELOPMENT READY
echo The project is ready for development.
echo.

popd
exit /b 0