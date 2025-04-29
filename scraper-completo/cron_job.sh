#!/bin/bash

# Diretório do projeto
PROJECT_DIR="/home/gabriel-balsarin/projetos_consorcio/scraper-completo"

# Criar diretório de logs se não existir
mkdir -p "$PROJECT_DIR/logs"

# Configurar variáveis de ambiente
export HOME=/home/gabriel-balsarin
export PYTHONUNBUFFERED=1

# Executar o script de extração
cd "$PROJECT_DIR"
/usr/bin/python3 executar_extracao.py >> "$PROJECT_DIR/logs/service.log" 2>&1

# Configurar o git e fazer o commit
git add .
git commit -m "Atualização automática - $(date '+%Y-%m-%d %H:%M:%S')"
git push 