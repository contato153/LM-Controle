#!/bin/bash

# Script para subir atualizações para o GitHub (Linux/Mac)
# Uso: ./push_to_github.sh "Mensagem do Commit"

MESSAGE=${1:-"Update: Filtros de relatório e melhorias"}

echo "--- Iniciando processo de atualização ---"

# Verifica se o git está inicializado
if [ ! -d .git ]; then
    echo "Inicializando Git..."
    git init
fi

# Verifica se o remote origin existe, se não, adiciona
if ! git remote | grep -q 'origin'; then
    echo "Adicionando remote origin..."
    git remote add origin https://github.com/contato153/LM-Controle.git
fi

# Adiciona todos os arquivos
echo "Adicionando arquivos..."
git add .

# Garante que a branch local se chama main
git branch -M main

# Commit
echo "Realizando commit: $MESSAGE"
git commit -m "$MESSAGE"

# Tenta sincronizar com o remote antes de enviar (caso existam arquivos como README no GitHub)
echo "Sincronizando com o repositório remoto..."
git pull origin main --rebase --allow-unrelated-histories

# Push
echo "Enviando para o GitHub (main)..."
git push -u origin main

echo "--- Processo concluído! ---"
