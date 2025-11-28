@echo off
echo ========================================
echo  Recompilacao do Assistente_Tecnico
echo ========================================
echo.

echo [1/4] Finalizando processos antigos...
taskkill /F /IM Assistente_Tecnico.exe /T 2>nul
taskkill /F /IM Assistente_Atualizador.exe /T 2>nul
taskkill /F /IM AtualizaAgenteWeb.exe /T 2>nul
taskkill /F /IM python.exe /T 2>nul
echo.

echo [2/4] Limpando arquivos temporarios...
if exist build rmdir /S /Q build
if exist dist rmdir /S /Q dist
echo.

echo [3/4] Iniciando compilacao com PyInstaller...
echo (Isso pode levar alguns minutos)
pyinstaller --clean Assistente_Tecnico.spec
echo.

if %ERRORLEVEL% EQU 0 (
    echo [4/4] Compilacao concluida com sucesso!
    echo.
    echo ========================================
    echo  Executavel criado em:
    echo  dist\Assistente_Tecnico.exe
    echo ========================================
) else (
    echo [ERRO] Falha na compilacao!
    echo Verifique as mensagens de erro acima.
)

echo.
pause
