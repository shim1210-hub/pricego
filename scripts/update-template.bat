@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM KimPM Template Updater v1.0
REM
REM Purpose:
REM   Update KimPM standard files in an existing project.
REM   Existing KimPM files are backed up before replacement.
REM
REM Usage:
REM   scripts\update-template.bat C:\dev\project-name
REM
REM Example:
REM   scripts\update-template.bat C:\dev\pricego
REM ============================================================

set "TARGET_PATH=%~1"
set "SCRIPT_DIR=%~dp0"
set "TEMPLATE_ROOT=%SCRIPT_DIR%.."

set /a UPDATED_COUNT=0
set /a CREATED_COUNT=0
set /a BACKUP_COUNT=0
set /a FAIL_COUNT=0

if "%TARGET_PATH%"=="" (
    echo.
    echo [ERROR] Target project path is required.
    echo.
    echo Usage:
    echo   update-template.bat C:\dev\project-name
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

for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss" 2^>nul') do (
    set "BACKUP_TIME=%%T"
)

if not defined BACKUP_TIME (
    set "BACKUP_TIME=%DATE%_%TIME%"
    set "BACKUP_TIME=!BACKUP_TIME:/=!"
    set "BACKUP_TIME=!BACKUP_TIME:-=!"
    set "BACKUP_TIME=!BACKUP_TIME::=!"
    set "BACKUP_TIME=!BACKUP_TIME:.=!"
    set "BACKUP_TIME=!BACKUP_TIME: =0!"
)

set "BACKUP_ROOT=%TARGET_PATH%\.kimpm-backup"
set "BACKUP_PATH=%BACKUP_ROOT%\%BACKUP_TIME%"

echo.
echo ============================================================
echo KimPM Template Updater v1.0
echo ============================================================
echo Template: %TEMPLATE_ROOT%
echo Target  : %TARGET_PATH%
echo Backup  : %BACKUP_PATH%
echo ============================================================
echo.
echo KimPM standard files will be updated.
echo Existing files will be backed up before replacement.
echo Project source code will not be modified.
echo.

call :validate_template

if errorlevel 1 (
    echo.
    echo [ERROR] KimPM template validation failed.
    echo Update was cancelled.
    echo.
    exit /b 1
)

call :prepare_backup

if errorlevel 1 (
    echo.
    echo [ERROR] Backup folder could not be created.
    echo Update was cancelled.
    echo.
    exit /b 1
)

echo [1/4] Updating AGENTS.md
echo ------------------------------------------------------------

call :update_file "AGENTS.md"

echo.
echo [2/4] Updating KIMPM.md
echo ------------------------------------------------------------

call :update_file "KIMPM.md"

echo.
echo [3/4] Updating docs
echo ------------------------------------------------------------

call :update_directory "docs"

echo.
echo [4/4] Updating prompts
echo ------------------------------------------------------------

call :update_directory "prompts"

echo.
echo ============================================================
echo KimPM Template Update Summary
echo ============================================================
echo Created : !CREATED_COUNT!
echo Updated : !UPDATED_COUNT!
echo Backed up: !BACKUP_COUNT!
echo Failed  : !FAIL_COUNT!
echo ============================================================

if !FAIL_COUNT! GTR 0 (
    echo.
    echo [RESULT] UPDATE COMPLETED WITH ERRORS
    echo Review the failed items above.
    echo Backup: %BACKUP_PATH%
    echo.
    exit /b 2
)

echo.
echo [RESULT] SUCCESS
echo KimPM Development OS was updated successfully.
echo.
echo Target:
echo   %TARGET_PATH%
echo.
echo Backup:
echo   %BACKUP_PATH%
echo.
exit /b 0

REM ============================================================
REM Template validation
REM ============================================================

:validate_template

if not exist "%TEMPLATE_ROOT%\AGENTS.md" (
    echo [FAIL] Template file missing: AGENTS.md
    exit /b 1
)

if not exist "%TEMPLATE_ROOT%\KIMPM.md" (
    echo [FAIL] Template file missing: KIMPM.md
    exit /b 1
)

if not exist "%TEMPLATE_ROOT%\docs\" (
    echo [FAIL] Template directory missing: docs\
    exit /b 1
)

if not exist "%TEMPLATE_ROOT%\prompts\" (
    echo [FAIL] Template directory missing: prompts\
    exit /b 1
)

echo [PASS] KimPM template files validated.
exit /b 0

REM ============================================================
REM Backup preparation
REM ============================================================

:prepare_backup

if not exist "%BACKUP_ROOT%\" (
    mkdir "%BACKUP_ROOT%" >nul 2>&1

    if errorlevel 1 (
        exit /b 1
    )
)

mkdir "%BACKUP_PATH%" >nul 2>&1

if errorlevel 1 (
    exit /b 1
)

exit /b 0

REM ============================================================
REM File update
REM ============================================================

:update_file

set "ITEM_NAME=%~1"
set "SOURCE_FILE=%TEMPLATE_ROOT%\%ITEM_NAME%"
set "TARGET_FILE=%TARGET_PATH%\%ITEM_NAME%"
set "BACKUP_FILE=%BACKUP_PATH%\%ITEM_NAME%"

if exist "%TARGET_FILE%" (
    copy /Y "%TARGET_FILE%" "%BACKUP_FILE%" >nul 2>&1

    if errorlevel 1 (
        echo [FAIL] Backup failed: %ITEM_NAME%
        set /a FAIL_COUNT+=1
        exit /b 1
    )

    echo [BACKUP] %ITEM_NAME%
    set /a BACKUP_COUNT+=1

    copy /Y "%SOURCE_FILE%" "%TARGET_FILE%" >nul 2>&1

    if errorlevel 1 (
        echo [FAIL] Update failed: %ITEM_NAME%
        set /a FAIL_COUNT+=1
        exit /b 1
    )

    echo [UPDATE] %ITEM_NAME%
    set /a UPDATED_COUNT+=1
) else (
    copy /Y "%SOURCE_FILE%" "%TARGET_FILE%" >nul 2>&1

    if errorlevel 1 (
        echo [FAIL] Creation failed: %ITEM_NAME%
        set /a FAIL_COUNT+=1
        exit /b 1
    )

    echo [CREATE] %ITEM_NAME%
    set /a CREATED_COUNT+=1
)

exit /b 0

REM ============================================================
REM Directory update
REM ============================================================

:update_directory

set "ITEM_NAME=%~1"
set "SOURCE_DIR=%TEMPLATE_ROOT%\%ITEM_NAME%"
set "TARGET_DIR=%TARGET_PATH%\%ITEM_NAME%"
set "BACKUP_DIR=%BACKUP_PATH%\%ITEM_NAME%"

if exist "%TARGET_DIR%\" (
    xcopy "%TARGET_DIR%\*" "%BACKUP_DIR%\" /E /I /Y /Q >nul 2>&1

    if errorlevel 1 (
        echo [FAIL] Backup failed: %ITEM_NAME%\
        set /a FAIL_COUNT+=1
        exit /b 1
    )

    echo [BACKUP] %ITEM_NAME%\
    set /a BACKUP_COUNT+=1

    xcopy "%SOURCE_DIR%\*" "%TARGET_DIR%\" /E /I /Y /Q >nul 2>&1

    if errorlevel 1 (
        echo [FAIL] Update failed: %ITEM_NAME%\
        set /a FAIL_COUNT+=1
        exit /b 1
    )

    echo [UPDATE] %ITEM_NAME%\
    set /a UPDATED_COUNT+=1
) else (
    mkdir "%TARGET_DIR%" >nul 2>&1

    if errorlevel 1 (
        echo [FAIL] Directory creation failed: %ITEM_NAME%\
        set /a FAIL_COUNT+=1
        exit /b 1
    )

    xcopy "%SOURCE_DIR%\*" "%TARGET_DIR%\" /E /I /Y /Q >nul 2>&1

    if errorlevel 1 (
        echo [FAIL] Copy failed: %ITEM_NAME%\
        set /a FAIL_COUNT+=1
        exit /b 1
    )

    echo [CREATE] %ITEM_NAME%\
    set /a CREATED_COUNT+=1
)

exit /b 0