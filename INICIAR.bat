@echo off
chcp 65001 >nul
title GR EXPRESSO — Inicializador

color 0A
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║          GR EXPRESSO — ETS2 LOGISTICA               ║
echo  ║          Inicializando todos os serviços...          ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: ════════════════════════════════════════════════════════════════════
::  CONFIGURAÇÃO — edite os caminhos conforme onde você salvou as pastas
:: ════════════════════════════════════════════════════════════════════
set BACKEND_PORT=3000
set FRONTEND_PORT=5500

:: Caminho desta pasta (gr-expresso-final) — detectado automaticamente
set GR_DIR=%~dp0

:: Caminho da pasta do telemetry — EDITE SE NECESSÁRIO
:: Por padrão assume que está ao lado do gr-expresso-final
set TELEMETRY_DIR=%GR_DIR%..\telemetry_final

:: Se o telemetry estiver em outro lugar, descomente e ajuste:
:: set TELEMETRY_DIR=C:\GR_EXPRESSO\telemetry_final

:: ════════════════════════════════════════════════════════════════════

set BACKEND_DIR=%GR_DIR%backend
set FRONTEND_DIR=%GR_DIR%frontend\public

:: ─── Verificar Node.js ────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Node.js nao encontrado. Baixe em: https://nodejs.org
    pause & exit /b 1
)

:: ─── Verificar Python ─────────────────────────────────────────────────────────
where python >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Python nao encontrado. Baixe em: https://python.org
    pause & exit /b 1
)

:: ─── Verificar pasta do telemetry ─────────────────────────────────────────────
if not exist "%TELEMETRY_DIR%\main.py" (
    echo  [AVISO] Telemetry nao encontrado em: %TELEMETRY_DIR%
    echo  Edite a variavel TELEMETRY_DIR neste .bat e tente novamente.
    echo  O backend e frontend ainda serao iniciados.
    set SKIP_TELEMETRY=1
) else (
    set SKIP_TELEMETRY=0
)

:: ─── Instalar dependências do backend ─────────────────────────────────────────
if not exist "%BACKEND_DIR%\node_modules" (
    echo  [1/3] Instalando dependencias do backend (primeira vez)...
    cd /d "%BACKEND_DIR%"
    call npm install --silent
    if errorlevel 1 ( echo  [ERRO] npm install falhou. & pause & exit /b 1 )
) else (
    echo  [1/3] Dependencias do backend OK.
)

:: ─── Instalar http-server ─────────────────────────────────────────────────────
where http-server >nul 2>&1
if errorlevel 1 (
    echo  [2/3] Instalando http-server (primeira vez)...
    call npm install -g http-server --silent
)
echo  [2/3] http-server OK.

:: ─── Instalar dependencias Python ────────────────────────────────────────────
if "%SKIP_TELEMETRY%"=="0" (
    echo  [3/3] Verificando dependencias Python...
    python -m pip install -r "%TELEMETRY_DIR%\requirements.txt" --quiet --disable-pip-version-check 2>nul
    echo  [3/3] Python OK.
) else (
    echo  [3/3] Telemetry pulado.
)

echo.
echo  Iniciando servicos...
echo.

:: ─── Backend ──────────────────────────────────────────────────────────────────
start "GR-BACKEND" cmd /k "color 0B && title GR EXPRESSO - Backend && cd /d "%BACKEND_DIR%" && node src/server.js"
echo  Backend iniciado (porta %BACKEND_PORT%)
timeout /t 3 /nobreak >nul

:: ─── Frontend ─────────────────────────────────────────────────────────────────
start "GR-FRONTEND" cmd /k "color 0E && title GR EXPRESSO - Frontend && http-server "%FRONTEND_DIR%" -p %FRONTEND_PORT% -c-1 --cors -o"
echo  Frontend iniciado (porta %FRONTEND_PORT%)
timeout /t 2 /nobreak >nul

:: ─── Telemetry ────────────────────────────────────────────────────────────────
if "%SKIP_TELEMETRY%"=="0" (
    start "GR-TELEMETRY" cmd /k "color 0D && title GR EXPRESSO - Telemetry ETS2 && cd /d "%TELEMETRY_DIR%" && python main.py"
    echo  Telemetry iniciado
) else (
    echo  [!] Telemetry NAO iniciado - verifique o caminho TELEMETRY_DIR no .bat
)

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║  Tudo rodando!                                       ║
echo  ║                                                      ║
echo  ║  Site:  http://localhost:%FRONTEND_PORT%                    ║
echo  ║  API:   http://localhost:%BACKEND_PORT%/api                 ║
echo  ║                                                      ║
echo  ║  Pressione qualquer tecla para PARAR tudo.           ║
echo  ╚══════════════════════════════════════════════════════╝
pause >nul

:: ─── Encerrar ─────────────────────────────────────────────────────────────────
echo  Encerrando...
taskkill /FI "WINDOWTITLE eq GR EXPRESSO - Backend" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq GR EXPRESSO - Frontend" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq GR EXPRESSO - Telemetry ETS2" /T /F >nul 2>&1
echo  Encerrado. Ate mais!
timeout /t 2 /nobreak >nul
