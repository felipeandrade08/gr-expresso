@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
title GR EXPRESSO - Encerrando sistema
color 0E

cls
echo.
echo   ============================================================
echo     GR EXPRESSO - Encerrando o sistema
echo   ============================================================
echo.

set ENCONTROU=0

REM Encerra o processo que esta usando a porta 3000 (backend)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo   Encerrando o servidor ^(backend^)...
    taskkill /PID %%p /F >nul 2>nul
    set ENCONTROU=1
)

REM Encerra o processo que esta usando a porta 5500 (frontend)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5500" ^| findstr "LISTENING"') do (
    echo   Encerrando a interface ^(frontend^)...
    taskkill /PID %%p /F >nul 2>nul
    set ENCONTROU=1
)

echo.
if !ENCONTROU! equ 1 (
    echo   OK - Sistema encerrado com sucesso.
) else (
    echo   O sistema ja nao estava em execucao.
)
echo.
pause
