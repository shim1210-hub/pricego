@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM KimPM Project Checker v1.0
REM
REM Usage:
REM   scripts\check-project.bat C:\dev\project-name
REM
REM Example:
REM   scripts\check-project.bat C:\dev\pricego
REM ============================================================

set "TARGET_PATH=%~1"

set /a PASS_COUNT=0
set /a WARN_COUNT=0
set /a FAIL_COUNT=0

if "%TARGET_PATH%"=="" (
    echo.
    echo [ERROR] Target project path is required.
    echo.
    echo Usage:
    echo   check-project.bat C:\dev\project-name
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

pushd "%TARGET_PATH%" >nul 2>&1

if errorlevel 1 (
    echo.
    echo [ERROR] Cannot access target project folder.
    echo Target: %TARGET_PATH%
    echo.
    exit /b 1
)

echo.
echo ============================================================
echo KimPM Project Checker v1.0
echo ============================================================
echo Target: %CD%
echo Date  : %DATE% %TIME%
echo ============================================================
echo.

REM ============================================================
REM 1. KimPM standard files
REM ============================================================

echo [1/7] KimPM standard files
echo ------------------------------------------------------------

call :check_file "AGENTS.md" "KimPM agent rules"
call :check_file "KIMPM.md" "KimPM project definition"
call :check_directory "docs" "KimPM documentation"
call :check_directory "prompts" "KimPM prompt library"

echo.

REM ============================================================
REM 2. Git environment
REM ============================================================

echo [2/7] Git environment
echo ------------------------------------------------------------

where git >nul 2>&1

if errorlevel 1 (
    call :fail "Git is not installed or not available in PATH."
) else (
    for /f "delims=" %%G in ('git --version 2^>nul') do (
        call :pass "%%G"
    )

    git rev-parse --is-inside-work-tree >nul 2>&1

    if errorlevel 1 (
        call :warn "This folder is not a Git repository."
    ) else (
        call :pass "Git repository detected."
    )
)

echo.

REM ============================================================
REM 3. Git status
REM ============================================================

echo [3/7] Git status
echo ------------------------------------------------------------

git rev-parse --is-inside-work-tree >nul 2>&1

if errorlevel 1 (
    call :warn "Git status check skipped."
) else (
    set "CURRENT_BRANCH="

    for /f "delims=" %%B in ('git branch --show-current 2^>nul') do (
        set "CURRENT_BRANCH=%%B"
    )

    if defined CURRENT_BRANCH (
        call :pass "Current branch: !CURRENT_BRANCH!"
    ) else (
        call :warn "Current Git branch could not be identified."
    )

    git diff --quiet >nul 2>&1

    if errorlevel 1 (
        call :warn "Unstaged modifications exist."
    ) else (
        call :pass "No unstaged modifications."
    )

    git diff --cached --quiet >nul 2>&1

    if errorlevel 1 (
        call :warn "Staged but uncommitted changes exist."
    ) else (
        call :pass "No staged but uncommitted changes."
    )

    set "UNTRACKED_FOUND=N"

    for /f "delims=" %%U in ('git ls-files --others --exclude-standard 2^>nul') do (
        set "UNTRACKED_FOUND=Y"
    )

    if "!UNTRACKED_FOUND!"=="Y" (
        call :warn "Untracked files exist."
    ) else (
        call :pass "No untracked files."
    )

    set "REMOTE_URL="

    for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do (
        set "REMOTE_URL=%%R"
    )

    if defined REMOTE_URL (
        call :pass "Remote origin: !REMOTE_URL!"
    ) else (
        call :warn "Git remote 'origin' is not configured."
    )
)

echo.

REM ============================================================
REM 4. Node.js environment
REM ============================================================

echo [4/7] Node.js environment
echo ------------------------------------------------------------

where node >nul 2>&1

if errorlevel 1 (
    call :warn "Node.js is not installed or not available in PATH."
) else (
    for /f "delims=" %%N in ('node --version 2^>nul') do (
        call :pass "Node.js %%N"
    )
)

where npm >nul 2>&1

if errorlevel 1 (
    call :warn "npm is not installed or not available in PATH."
) else (
    for /f "delims=" %%M in ('npm --version 2^>nul') do (
        call :pass "npm %%M"
    )
)

echo.

REM ============================================================
REM 5. Project structure
REM ============================================================

echo [5/7] Project structure
echo ------------------------------------------------------------

if exist "package.json" (
    call :pass "package.json found."

    if exist "node_modules\" (
        call :pass "node_modules folder found."
    ) else (
        call :warn "node_modules folder not found. npm install may be required."
    )

    if exist "package-lock.json" (
        call :pass "package-lock.json found."
    ) else if exist "yarn.lock" (
        call :pass "yarn.lock found."
    ) else if exist "pnpm-lock.yaml" (
        call :pass "pnpm-lock.yaml found."
    ) else (
        call :warn "No package lock file found."
    )
) else (
    call :warn "package.json not found. This may not be a Node.js project."
)

if exist "src\" (
    call :pass "src folder found."
) else if exist "app\" (
    call :pass "app folder found."
) else (
    call :warn "Neither src nor app folder was found."
)

echo.

REM ============================================================
REM 6. Environment and security
REM ============================================================

echo [6/7] Environment and security
echo ------------------------------------------------------------

set "ENV_FOUND=N"

if exist ".env" (
    set "ENV_FOUND=Y"
    call :pass ".env found."
)

if exist ".env.local" (
    set "ENV_FOUND=Y"
    call :pass ".env.local found."
)

if exist ".env.development" (
    set "ENV_FOUND=Y"
    call :pass ".env.development found."
)

if exist ".env.production" (
    set "ENV_FOUND=Y"
    call :pass ".env.production found."
)

if exist ".env.example" (
    call :pass ".env.example found."
) else (
    call :warn ".env.example not found."
)

if "!ENV_FOUND!"=="N" (
    call :warn "No local environment file found."
)

if exist ".gitignore" (
    call :pass ".gitignore found."

    findstr /I /C:".env" ".gitignore" >nul 2>&1

    if errorlevel 1 (
        call :warn ".gitignore may not exclude environment files."
    ) else (
        call :pass ".gitignore contains an environment-file rule."
    )
) else (
    call :fail ".gitignore not found."
)

git rev-parse --is-inside-work-tree >nul 2>&1

if not errorlevel 1 (
    set "TRACKED_ENV_FOUND=N"

    for /f "delims=" %%E in ('git ls-files ".env" ".env.local" ".env.development" ".env.production" 2^>nul') do (
        set "TRACKED_ENV_FOUND=Y"
        echo [TRACKED] %%E
    )

    if "!TRACKED_ENV_FOUND!"=="Y" (
        call :fail "A sensitive environment file is tracked by Git."
    ) else (
        call :pass "No local environment file is tracked by Git."
    )
)

echo.

REM ============================================================
REM 7. Common configuration
REM ============================================================

echo [7/7] Common configuration
echo ------------------------------------------------------------

if exist "tsconfig.json" (
    call :pass "TypeScript configuration found."
) else (
    call :warn "tsconfig.json not found."
)

if exist "eslint.config.js" (
    call :pass "ESLint configuration found."
) else if exist "eslint.config.mjs" (
    call :pass "ESLint configuration found."
) else if exist "eslint.config.cjs" (
    call :pass "ESLint configuration found."
) else if exist ".eslintrc.json" (
    call :pass "ESLint configuration found."
) else if exist ".eslintrc.js" (
    call :pass "ESLint configuration found."
) else if exist ".eslintrc.cjs" (
    call :pass "ESLint configuration found."
) else (
    call :warn "ESLint configuration not found."
)

if exist "next.config.js" (
    call :pass "Next.js configuration found."
) else if exist "next.config.mjs" (
    call :pass "Next.js configuration found."
) else if exist "next.config.ts" (
    call :pass "Next.js configuration found."
) else if exist "app.json" (
    call :pass "Expo or application configuration found."
) else if exist "app.config.js" (
    call :pass "Expo application configuration found."
) else if exist "app.config.ts" (
    call :pass "Expo application configuration found."
) else (
    call :warn "Next.js or Expo configuration was not detected."
)

echo.
echo ============================================================
echo KimPM Project Check Summary
echo ============================================================
echo PASS : !PASS_COUNT!
echo WARN : !WARN_COUNT!
echo FAIL : !FAIL_COUNT!
echo ============================================================

if !FAIL_COUNT! GTR 0 (
    echo.
    echo [RESULT] NOT READY
    echo Critical issues must be resolved before development.
    echo.
    popd
    exit /b 2
)

if !WARN_COUNT! GTR 0 (
    echo.
    echo [RESULT] READY WITH WARNINGS
    echo Development is possible, but review the warnings above.
    echo.
    popd
    exit /b 0
)

echo.
echo [RESULT] READY
echo The project passed all KimPM checks.
echo.

popd
exit /b 0

REM ============================================================
REM Functions
REM ============================================================

:check_file
if exist "%~1" (
    call :pass "%~2 found: %~1"
) else (
    call :warn "%~2 missing: %~1"
)
exit /b 0

:check_directory
if exist "%~1\" (
    call :pass "%~2 found: %~1\"
) else (
    call :warn "%~2 missing: %~1\"
)
exit /b 0

:pass
echo [PASS] %~1
set /a PASS_COUNT+=1
exit /b 0

:warn
echo [WARN] %~1
set /a WARN_COUNT+=1
exit /b 0

:fail
echo [FAIL] %~1
set /a FAIL_COUNT+=1
exit /b 0