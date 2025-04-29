#!/bin/bash

# Configura o diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configura o log
LOG_FILE="$SCRIPT_DIR/logs/agendador.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Função para logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "Iniciando agendador..."

# Remove o ambiente virtual antigo se existir
if [ -d "venv" ]; then
    log "Removendo ambiente virtual antigo..."
    rm -rf venv
fi

# Cria um novo ambiente virtual
log "Criando novo ambiente virtual..."
python3 -m venv venv

# Ativa o ambiente virtual
log "Ativando ambiente virtual..."
source venv/bin/activate

# Atualiza pip
log "Atualizando pip..."
python3 -m pip install --upgrade pip

# Instala/atualiza as dependências
log "Instalando/atualizando dependências..."
python3 -m pip install -r requirements.txt

# Inicia o agendador
log "Iniciando o agendador Python..."
python3 agendador.py >> "$LOG_FILE" 2>&1 