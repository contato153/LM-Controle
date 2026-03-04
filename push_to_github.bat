@echo off
:: Script para subir atualizações para o GitHub (Windows)
:: Uso: push_to_github.bat "Mensagem do Commit"

set MESSAGE=%~1
if "%MESSAGE%"=="" set MESSAGE=Update: Filtros de relatorio e melhorias

echo --- Iniciando processo de atualizacao ---

:: Verifica se o git esta inicializado
if not exist .git (
    echo Inicializando Git...
    git init
)

:: Verifica se o remote origin existe
git remote | findstr "origin" >nul
if %errorlevel% neq 0 (
    echo Adicionando remote origin...
    git remote add origin https://github.com/contato153/LM-Controle.git
)

:: Adiciona todos os arquivos
echo Adicionando arquivos...
git add .

:: Garante que a branch local se chama main
git branch -M main

:: Commit
echo Realizando commit: %MESSAGE%
git commit -m "%MESSAGE%"

:: Tenta sincronizar com o remote antes de enviar
echo Sincronizando com o repositorio remoto...
git pull origin main --rebase --allow-unrelated-histories

:: Push
echo Enviando para o GitHub (main)...
git push -u origin main

echo --- Processo concluido! ---
pause
