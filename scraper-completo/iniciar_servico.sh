#!/bin/bash

# Configura o diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configura o log
LOG_FILE="$SCRIPT_DIR/logs/servico.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Função para logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "Iniciando serviço..."

# Verifica se o ambiente virtual existe
if [ ! -d "venv" ]; then
    log "Criando ambiente virtual..."
    /usr/bin/python3 -m venv venv
fi

# Ativa o ambiente virtual
log "Ativando ambiente virtual..."
source venv/bin/activate

# Instala/atualiza as dependências
log "Instalando/atualizando dependências..."
pip install -r requirements.txt

# Inicia o agendador
log "Iniciando o agendador Python..."
python3 agendador.py >> "$LOG_FILE" 2>&1 