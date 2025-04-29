#!/bin/bash

# Diretório do projeto
PROJECT_DIR="/home/gabriel-balsarin/projetos_consorcio/scraper-completo"

# Criar diretório de logs se não existir
mkdir -p "$PROJECT_DIR/logs"

# Executar o agendador
cd "$PROJECT_DIR"
/usr/bin/python3 agendador.py 