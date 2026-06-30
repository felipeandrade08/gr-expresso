@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
title GR EXPRESSO - Instalacao
color 0A

cls
echo.
echo   ============================================================
echo     GR EXPRESSO - Instalacao Automatica
echo     Sistema de Gestao para Transportadora Virtual ETS2
echo   ============================================================
echo.
echo   Este assistente vai preparar tudo para voce usar o sistema.
echo   Isso so precisa ser feito UMA VEZ.
echo.
pause

REM =====================================================================
REM PASSO 1 - Verificar se o Node.js esta instalado
REM =====================================================================
cls
echo.
echo   [1/5] Verificando se o Node.js esta instalado...
echo.

set NODE_OK=1
where node >nul 2>nul
if %errorlevel% neq 0 set NODE_OK=0

if !NODE_OK! equ 0 (
    color 0E
    cls
    echo.
    echo   ============================================================
    echo     NODE.JS NAO ENCONTRADO NO "PATH" DO WINDOWS
    echo   ============================================================
    echo.
    echo   Isso normalmente acontece quando o Node.js foi baixado como
    echo   um arquivo .zip e extraido numa pasta qualquer ^(em vez de
    echo   instalado pelo instalador oficial .msi^). Os arquivos existem,
    echo   mas o Windows nao sabe onde encontra-los.
    echo.
    echo   Voce tem duas opcoes:
    echo.
    echo   [1] RECOMENDADO - Instalar o Node.js oficialmente
    echo       ^(resolve de vez, funciona para qualquer programa^)
    echo.
    echo   [2] Informar manualmente a pasta onde o Node esta
    echo       ^(rapido agora, mas tera que repetir se mudar de pasta^)
    echo.
    set /p OPCAO_NODE="  Digite 1 ou 2 e aperte ENTER: "
)

if !NODE_OK! equ 0 if not "!OPCAO_NODE!"=="2" (
    color 0C
    cls
    echo.
    echo   COMO INSTALAR O NODE.JS CORRETAMENTE:
    echo   1. Acesse: https://nodejs.org
    echo   2. Baixe a versao "LTS" ^(recomendada^) - e um arquivo
    echo      chamado algo como "node-v22.x.x-x64.msi"
    echo   3. Abra esse arquivo .msi baixado e instale normalmente
    echo      ^(proximo, proximo, concluir - pode deixar tudo padrao^)
    echo   4. Feche TODAS as janelas pretas ^(terminal/cmd^) abertas
    echo   5. Execute este arquivo INSTALAR.bat novamente
    echo.
    start https://nodejs.org
    echo   Abrindo o site de download para voce...
    echo.
    pause
    exit /b 1
)

if !NODE_OK! equ 0 if "!OPCAO_NODE!"=="2" (
    cls
    echo.
    echo   Informe o caminho COMPLETO da pasta onde estao os arquivos
    echo   do Node ^(a pasta que contem o arquivo "node.exe"^).
    echo.
    echo   Exemplo: C:\Users\SeuNome\Downloads\node-v24.17.0-win-x64
    echo.
    set /p NODE_PASTA_INFORMADA="  Caminho da pasta: "

    REM Remove aspas que o usuario possa ter colado junto
    set "NODE_PASTA_INFORMADA=!NODE_PASTA_INFORMADA:"=!"
)

if !NODE_OK! equ 0 if "!OPCAO_NODE!"=="2" (
    if not exist "!NODE_PASTA_INFORMADA!\node.exe" (
        color 0C
        echo.
        echo   X Nao foi encontrado um arquivo "node.exe" dentro dessa
        echo     pasta. Confira o caminho e execute o INSTALAR.bat
        echo     novamente.
        echo.
        pause
        exit /b 1
    )

    REM Adiciona a pasta ao PATH apenas para esta janela/execucao
    set "PATH=!NODE_PASTA_INFORMADA!;!PATH!"

    where node >nul 2>nul
    if !errorlevel! neq 0 (
        color 0C
        echo.
        echo   X Ainda assim nao foi possivel usar o Node dessa pasta.
        echo     Recomendamos instalar pelo site oficial: nodejs.org
        echo.
        pause
        exit /b 1
    )

    echo.
    echo   OK - Node.js localizado e configurado para esta sessao.
    echo.

    REM Salva o caminho para o INICIAR.bat tambem conseguir usa-lo depois
    echo !NODE_PASTA_INFORMADA! > .node_path.txt
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VERSION=%%v
echo   OK - Node.js encontrado: !NODE_VERSION!
echo.
timeout /t 1 >nul

REM =====================================================================
REM PASSO 2 - Verificar se o MySQL esta instalado e acessivel
REM =====================================================================
echo   [2/5] Verificando se o MySQL esta instalado...
echo.

set MYSQL_CMD=mysql
where mysql >nul 2>nul
if %errorlevel% neq 0 (
    REM mysql.exe pode nao estar no PATH mesmo com o MySQL instalado.
    REM Procuramos nos locais de instalacao mais comuns no Windows.
    set MYSQL_ENCONTRADO=0
    for %%d in (
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
        "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe"
        "C:\xampp\mysql\bin\mysql.exe"
        "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"
    ) do (
        if exist %%d (
            set MYSQL_CMD=%%~d
            set MYSQL_ENCONTRADO=1
        )
    )

    if !MYSQL_ENCONTRADO! equ 0 (
        color 0C
        echo   ============================================================
        echo     X MYSQL NAO ENCONTRADO NO SEU COMPUTADOR
        echo   ============================================================
        echo.
        echo   O GR EXPRESSO precisa do MySQL para guardar os dados.
        echo.
        echo   COMO RESOLVER ^(escolha uma opcao^):
        echo.
        echo   OPCAO RECOMENDADA - MySQL Installer ^(mais facil^):
        echo   1. Acesse: https://dev.mysql.com/downloads/installer/
        echo   2. Baixe o "mysql-installer-community"
        echo   3. Durante a instalacao, defina uma senha para o usuario "root"
        echo      e ANOTE essa senha - voce vai precisar dela daqui a pouco
        echo   4. Conclua a instalacao e reinicie o computador
        echo   5. Execute este arquivo INSTALAR.bat novamente
        echo.
        echo   SE VOCE JA TEM O MYSQL INSTALADO e esta vendo esta mensagem
        echo   mesmo assim, pode ser que ele nao esteja no "PATH" do
        echo   Windows. Neste caso, fale com quem te passou este sistema.
        echo.
        start https://dev.mysql.com/downloads/installer/
        echo   Abrindo o site de download para voce...
        echo.
        pause
        exit /b 1
    )
)

echo   OK - MySQL encontrado no sistema.
echo.
timeout /t 1 >nul

REM =====================================================================
REM PASSO 3 - Coletar dados de acesso ao MySQL
REM =====================================================================
echo   [3/5] Configuracao de acesso ao banco de dados
echo.
echo   Precisamos da senha do usuario "root" do MySQL que voce
echo   definiu quando instalou o MySQL no seu computador.
echo.
echo   Se voce nao definiu nenhuma senha ^(deixou em branco na
echo   instalacao^), so aperte ENTER sem digitar nada.
echo.

set /p DB_HOST="  Endereco do MySQL [ENTER = localhost]: "
if "!DB_HOST!"=="" set DB_HOST=localhost

set /p DB_PORT="  Porta do MySQL [ENTER = 3306]: "
if "!DB_PORT!"=="" set DB_PORT=3306

set /p DB_USER="  Usuario do MySQL [ENTER = root]: "
if "!DB_USER!"=="" set DB_USER=root

set /p DB_PASSWORD="  Senha do MySQL: "

echo.
echo   Testando a conexao com o MySQL...

REM Usamos um arquivo de opcoes temporario para passar a senha ao MySQL.
REM Isso evita problemas quando a senha contem caracteres especiais
REM do Windows (como &, %%, ^, |, espacos), que quebrariam o comando
REM se a senha fosse passada diretamente na linha de comando.
set MYSQL_OPT_FILE=%TEMP%\gr_expresso_mysql_opt.cnf
(
echo [client]
echo host=!DB_HOST!
echo port=!DB_PORT!
echo user=!DB_USER!
echo password=!DB_PASSWORD!
) > "!MYSQL_OPT_FILE!"

"!MYSQL_CMD!" --defaults-extra-file="!MYSQL_OPT_FILE!" -e "SELECT 1;" >nul 2>nul
set MYSQL_TESTE_RESULTADO=%errorlevel%

del /f /q "!MYSQL_OPT_FILE!" >nul 2>nul

if !MYSQL_TESTE_RESULTADO! neq 0 (
    color 0C
    echo.
    echo   ============================================================
    echo     X NAO FOI POSSIVEL CONECTAR AO MYSQL
    echo   ============================================================
    echo.
    echo   Possiveis causas:
    echo   - A senha digitada esta incorreta
    echo   - O servico do MySQL nao esta rodando
    echo   - O usuario ou porta informados estao errados
    echo.
    echo   DICA: No Windows, abra "Servicos" ^(pesquise na barra do
    echo   menu Iniciar^) e veja se algum servico "MySQL" esta com
    echo   status "Em execucao". Se nao estiver, clique com o botao
    echo   direito nele e escolha "Iniciar".
    echo.
    echo   Depois, execute este arquivo INSTALAR.bat novamente.
    echo.
    pause
    exit /b 1
)

echo   OK - Conexao com o MySQL bem-sucedida!
echo.
timeout /t 1 >nul

REM =====================================================================
REM PASSO 4 - Gerar o arquivo .env automaticamente
REM =====================================================================
echo   [4/5] Gerando arquivo de configuracao (.env)...
echo.

set ENV_FILE=backend\.env

REM Gera um segredo aleatorio para autenticacao (JWT), combinando varios
REM valores aleatorios do Windows para reduzir a chance de repeticao.
set JWT_RANDOM=%RANDOM%%RANDOM%%RANDOM%%RANDOM%%DATE:~-4%%TIME:~-5%

(
echo NODE_ENV=development
echo PORT=3000
echo.
echo DB_HOST=!DB_HOST!
echo DB_PORT=!DB_PORT!
echo DB_USER=!DB_USER!
echo DB_PASSWORD=!DB_PASSWORD!
echo DB_NAME=gr_expresso
echo DB_CONNECTION_LIMIT=10
echo.
echo JWT_SECRET=gr-expresso-!JWT_RANDOM!
echo.
echo FRONTEND_URL=*
echo.
echo TELEMETRIA_ETS2_ENDPOINT=
echo TRUCKSBOOK_API_KEY=
echo TRUCKY_API_KEY=
) > !ENV_FILE!

echo   OK - Arquivo backend\.env criado com sucesso.
echo.
timeout /t 1 >nul

REM =====================================================================
REM PASSO 5 - Instalar dependencias e criar o banco de dados
REM =====================================================================
echo   [5/5] Instalando dependencias e preparando o banco de dados...
echo   ^(isso pode levar alguns minutos na primeira vez^)
echo.

cd backend

echo   Instalando pacotes do sistema...
call npm install --no-fund --no-audit
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo   X Falha ao instalar dependencias. Verifique sua conexao
    echo     com a internet e tente novamente.
    cd ..
    pause
    exit /b 1
)

cd ..

color 0E
echo.
echo   ------------------------------------------------------------
echo   ATENCAO: se voce ja tinha um banco de dados "gr_expresso"
echo   criado anteriormente neste computador ^(com dados reais
echo   cadastrados^), ele sera APAGADO e recriado do zero agora,
echo   com os dados de demonstracao do sistema.
echo.
echo   Se for a primeira vez instalando, pode seguir sem problemas.
echo   ------------------------------------------------------------
echo.
set /p CONFIRMA_RESET="  Pode continuar? (S para sim, qualquer tecla para cancelar): "
if /i not "!CONFIRMA_RESET!"=="S" (
    echo.
    echo   Instalacao cancelada pelo usuario.
    echo.
    pause
    exit /b 1
)

color 0A
cd backend

echo.
echo   Criando o banco de dados e as tabelas...
call npm run db:init -- --seed
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo   X Falha ao criar o banco de dados. Revise a mensagem de
    echo     erro acima.
    cd ..
    pause
    exit /b 1
)

cd ..

REM =====================================================================
REM Instalar dependencia "serve" globalmente para o frontend (silencioso)
REM =====================================================================
call npm install -g serve --no-fund --no-audit >nul 2>nul

color 0A
cls
echo.
echo   ============================================================
echo     INSTALACAO CONCLUIDA COM SUCESSO!
echo   ============================================================
echo.
echo   O GR EXPRESSO esta pronto para uso.
echo.
echo   A partir de agora, sempre que quiser abrir o sistema,
echo   basta clicar duas vezes no arquivo:
echo.
echo            INICIAR.bat
echo.
echo   Vamos abrir o sistema agora pela primeira vez...
echo.
pause

start "" cmd /c INICIAR.bat
exit /b 0
