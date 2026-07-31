@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM KimPM Git Helper v1.0
REM
REM Purpose:
REM   Provide a safe menu for common Git operations.
REM
REM Usage:
REM   scripts\git-helper.bat C:\dev\project-name
REM
REM Example:
REM   scripts\git-helper.bat C:\dev\pricego
REM
REM Safety principles:
REM   - No force push
REM   - No hard reset
REM   - No automatic conflict resolution
REM   - Pull is blocked when local changes exist
REM ============================================================

set "TARGET_PATH=%~1"

if "%TARGET_PATH%"=="" (
    echo.
    echo [ERROR] Target project path is required.
    echo.
    echo Usage:
    echo   git-helper.bat C:\dev\project-name
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

where git >nul 2>&1

if errorlevel 1 (
    echo.
    echo [ERROR] Git is not installed or unavailable in PATH.
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

git rev-parse --is-inside-work-tree >nul 2>&1

if errorlevel 1 (
    echo.
    echo [ERROR] This folder is not a Git repository.
    echo Target: %TARGET_PATH%
    echo.
    popd
    exit /b 1
)

:MENU
cls

set "CURRENT_BRANCH="
set "UPSTREAM_BRANCH="

for /f "delims=" %%B in ('git branch --show-current 2^>nul') do (
    set "CURRENT_BRANCH=%%B"
)

for /f "delims=" %%U in ('git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2^>nul') do (
    set "UPSTREAM_BRANCH=%%U"
)

echo ============================================================
echo KimPM Git Helper v1.0
echo ============================================================
echo Project : %CD%
echo Branch  : !CURRENT_BRANCH!

if defined UPSTREAM_BRANCH (
    echo Upstream: !UPSTREAM_BRANCH!
) else (
    echo Upstream: Not configured
)

echo ============================================================
echo.
echo   1. Git status
echo   2. Git fetch
echo   3. Pull readiness check
echo   4. Git pull
echo   5. Stage all changes
echo   6. Commit staged changes
echo   7. Git push
echo   8. Recent commit log
echo   9. Show changed files
echo   0. Exit
echo.
echo ============================================================

set "MENU_CHOICE="
set /p "MENU_CHOICE=Select an option: "

if "%MENU_CHOICE%"=="1" goto STATUS
if "%MENU_CHOICE%"=="2" goto FETCH
if "%MENU_CHOICE%"=="3" goto PULL_READINESS
if "%MENU_CHOICE%"=="4" goto PULL
if "%MENU_CHOICE%"=="5" goto STAGE
if "%MENU_CHOICE%"=="6" goto COMMIT
if "%MENU_CHOICE%"=="7" goto PUSH
if "%MENU_CHOICE%"=="8" goto LOG
if "%MENU_CHOICE%"=="9" goto CHANGED_FILES
if "%MENU_CHOICE%"=="0" goto EXIT

echo.
echo [WARN] Invalid menu option.
call :PAUSE_RETURN
goto MENU

:STATUS
cls
echo ============================================================
echo Git Status
echo ============================================================
echo.

git status

echo.
call :SHOW_SYNC_STATUS
call :PAUSE_RETURN
goto MENU

:FETCH
cls
echo ============================================================
echo Git Fetch
echo ============================================================
echo.

git remote get-url origin >nul 2>&1

if errorlevel 1 (
    echo [ERROR] Git remote 'origin' is not configured.
    call :PAUSE_RETURN
    goto MENU
)

echo [INFO] Running git fetch origin...
echo.

git fetch origin

if errorlevel 1 (
    echo.
    echo [ERROR] Git fetch failed.
    echo Check the network connection and Git credentials.
) else (
    echo.
    echo [SUCCESS] Git fetch completed.
    call :SHOW_SYNC_STATUS
)

call :PAUSE_RETURN
goto MENU

:PULL_READINESS
cls
echo ============================================================
echo Pull Readiness Check
echo ============================================================
echo.

call :CHECK_PULL_READINESS

call :PAUSE_RETURN
goto MENU

:PULL
cls
echo ============================================================
echo Git Pull
echo ============================================================
echo.

call :CHECK_PULL_READINESS

if not "!PULL_READY!"=="Y" (
    echo.
    echo [BLOCKED] Git pull was not executed.
    echo Resolve the issues shown above first.
    call :PAUSE_RETURN
    goto MENU
)

echo.
echo [INFO] Running safe fast-forward-only pull...
echo.

git pull --ff-only

if errorlevel 1 (
    echo.
    echo [ERROR] Git pull failed.
    echo No automatic merge was performed.
) else (
    echo.
    echo [SUCCESS] Git pull completed.
)

call :PAUSE_RETURN
goto MENU

:STAGE
cls
echo ============================================================
echo Stage All Changes
echo ============================================================
echo.

git status --short

echo.
set "CONFIRM_STAGE="
set /p "CONFIRM_STAGE=Stage all listed changes? (Y/N): "

if /I not "%CONFIRM_STAGE%"=="Y" (
    echo.
    echo [CANCELLED] No files were staged.
    call :PAUSE_RETURN
    goto MENU
)

git add -A

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to stage changes.
) else (
    echo.
    echo [SUCCESS] All changes were staged.
    echo.
    git status --short
)

call :PAUSE_RETURN
goto MENU

:COMMIT
cls
echo ============================================================
echo Commit Staged Changes
echo ============================================================
echo.

git diff --cached --quiet

if not errorlevel 1 (
    echo [WARN] There are no staged changes to commit.
    echo Run menu option 5 first.
    call :PAUSE_RETURN
    goto MENU
)

echo Staged files:
echo ------------------------------------------------------------
git diff --cached --name-status
echo ------------------------------------------------------------
echo.

set "COMMIT_MESSAGE="
set /p "COMMIT_MESSAGE=Enter commit message: "

if not defined COMMIT_MESSAGE (
    echo.
    echo [CANCELLED] Commit message cannot be empty.
    call :PAUSE_RETURN
    goto MENU
)

echo.
set "CONFIRM_COMMIT="
set /p "CONFIRM_COMMIT=Create this commit? (Y/N): "

if /I not "%CONFIRM_COMMIT%"=="Y" (
    echo.
    echo [CANCELLED] Commit was not created.
    call :PAUSE_RETURN
    goto MENU
)

git commit -m "%COMMIT_MESSAGE%"

if errorlevel 1 (
    echo.
    echo [ERROR] Git commit failed.
) else (
    echo.
    echo [SUCCESS] Commit created.
)

call :PAUSE_RETURN
goto MENU

:PUSH
cls
echo ============================================================
echo Git Push
echo ============================================================
echo.

git remote get-url origin >nul 2>&1

if errorlevel 1 (
    echo [ERROR] Git remote 'origin' is not configured.
    call :PAUSE_RETURN
    goto MENU
)

call :SHOW_SYNC_STATUS

echo.
set "CONFIRM_PUSH="
set /p "CONFIRM_PUSH=Push local commits to origin? (Y/N): "

if /I not "%CONFIRM_PUSH%"=="Y" (
    echo.
    echo [CANCELLED] Git push was not executed.
    call :PAUSE_RETURN
    goto MENU
)

if defined UPSTREAM_BRANCH (
    git push
) else (
    if not defined CURRENT_BRANCH (
        echo.
        echo [ERROR] Current branch could not be identified.
        call :PAUSE_RETURN
        goto MENU
    )

    echo.
    echo [INFO] Upstream is not configured.
    echo [INFO] Running git push -u origin !CURRENT_BRANCH!...
    echo.

    git push -u origin "!CURRENT_BRANCH!"
)

if errorlevel 1 (
    echo.
    echo [ERROR] Git push failed.
) else (
    echo.
    echo [SUCCESS] Git push completed.
)

call :PAUSE_RETURN
goto MENU

:LOG
cls
echo ============================================================
echo Recent Commit Log
echo ============================================================
echo.

git log -10 --oneline --decorate --graph

echo.
call :PAUSE_RETURN
goto MENU

:CHANGED_FILES
cls
echo ============================================================
echo Changed Files
echo ============================================================
echo.

echo Working tree and staged changes:
echo ------------------------------------------------------------
git status --short
echo.

echo Unstaged differences:
echo ------------------------------------------------------------
git diff --stat
echo.

echo Staged differences:
echo ------------------------------------------------------------
git diff --cached --stat
echo.

call :PAUSE_RETURN
goto MENU

:CHECK_PULL_READINESS
set "PULL_READY=Y"
set "HAS_LOCAL_CHANGES=N"
set "CHECK_UPSTREAM="
set "AHEAD_COUNT=0"
set "BEHIND_COUNT=0"

for /f "delims=" %%S in ('git status --porcelain 2^>nul') do (
    set "HAS_LOCAL_CHANGES=Y"
)

if "!HAS_LOCAL_CHANGES!"=="Y" (
    echo [BLOCK] Local working tree contains changes.
    echo         Commit or stash the changes before pulling.
    echo.
    git status --short
    set "PULL_READY=N"
) else (
    echo [PASS] Working tree is clean.
)

for /f "delims=" %%U in ('git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2^>nul') do (
    set "CHECK_UPSTREAM=%%U"
)

if not defined CHECK_UPSTREAM (
    echo [BLOCK] Upstream branch is not configured.
    set "PULL_READY=N"
) else (
    echo [PASS] Upstream branch: !CHECK_UPSTREAM!

    git fetch origin >nul 2>&1

    if errorlevel 1 (
        echo [BLOCK] Remote information could not be refreshed.
        echo         Check the network connection and credentials.
        set "PULL_READY=N"
    ) else (
        for /f "tokens=1,2" %%A in ('git rev-list --left-right --count HEAD...@{u} 2^>nul') do (
            set "AHEAD_COUNT=%%A"
            set "BEHIND_COUNT=%%B"
        )

        echo [INFO] Ahead : !AHEAD_COUNT!
        echo [INFO] Behind: !BEHIND_COUNT!

        if !AHEAD_COUNT! GTR 0 if !BEHIND_COUNT! GTR 0 (
            echo [BLOCK] Local and remote branches have diverged.
            echo         Manual review is required.
            set "PULL_READY=N"
        )

        if !AHEAD_COUNT! GTR 0 if !BEHIND_COUNT! EQU 0 (
            echo [PASS] Local branch is ahead only.
            echo        Pull is unnecessary; push may be required.
        )

        if !BEHIND_COUNT! GTR 0 if !AHEAD_COUNT! EQU 0 (
            echo [PASS] Remote commits can be pulled safely.
        )

        if !AHEAD_COUNT! EQU 0 if !BEHIND_COUNT! EQU 0 (
            echo [PASS] Local and remote branches are synchronized.
        )
    )
)

echo.

if "!PULL_READY!"=="Y" (
    echo [RESULT] PULL READY
) else (
    echo [RESULT] PULL NOT READY
)

exit /b 0

:SHOW_SYNC_STATUS
set "STATUS_UPSTREAM="
set "STATUS_AHEAD=0"
set "STATUS_BEHIND=0"

for /f "delims=" %%U in ('git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2^>nul') do (
    set "STATUS_UPSTREAM=%%U"
)

if not defined STATUS_UPSTREAM (
    echo.
    echo [WARN] Upstream branch is not configured.
    exit /b 0
)

for /f "tokens=1,2" %%A in ('git rev-list --left-right --count HEAD...@{u} 2^>nul') do (
    set "STATUS_AHEAD=%%A"
    set "STATUS_BEHIND=%%B"
)

echo.
echo Upstream: !STATUS_UPSTREAM!
echo Ahead   : !STATUS_AHEAD!
echo Behind  : !STATUS_BEHIND!

if !STATUS_AHEAD! GTR 0 if !STATUS_BEHIND! GTR 0 (
    echo State   : DIVERGED
    exit /b 0
)

if !STATUS_AHEAD! GTR 0 (
    echo State   : PUSH REQUIRED
    exit /b 0
)

if !STATUS_BEHIND! GTR 0 (
    echo State   : PULL REQUIRED
    exit /b 0
)

echo State   : SYNCHRONIZED
exit /b 0

:PAUSE_RETURN
echo.
pause
exit /b 0

:EXIT
echo.
echo KimPM Git Helper closed.
echo.

popd
exit /b 0