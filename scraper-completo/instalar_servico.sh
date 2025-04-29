#!/bin/bash

# Navega até o diretório do script
cd "$(dirname "$0")"

# Copia o arquivo de serviço para o diretório do systemd
sudo cp consorcio-agendador.service /etc/systemd/system/

# Recarrega a configuração do systemd
sudo systemctl daemon-reload

# Habilita o serviço para iniciar com o sistema
sudo systemctl enable consorcio-agendador.service

# Inicia o serviço
sudo systemctl start consorcio-agendador.service

echo "Serviço instalado e iniciado com sucesso!"
echo "Para verificar o status, use: sudo systemctl status consorcio-agendador.service" 