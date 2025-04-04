#!/bin/bash

# Nome da pasta de destino
PASTA_DESTINO="Consorcio_Extrator_Windows"

# Criar pasta principal
mkdir -p "$PASTA_DESTINO/DADOS EXTRAIDOS"

# Copiar arquivos principais
cp CC_Cartas_Contempladas.py "$PASTA_DESTINO/"
cp CT_Consorcio_Contemplado.py "$PASTA_DESTINO/"
cp SP_Extrator.py "$PASTA_DESTINO/"
cp VC_Extrator.py "$PASTA_DESTINO/"
cp consolidador.py "$PASTA_DESTINO/"
cp executar_extracao.py "$PASTA_DESTINO/"
cp build_windows.py "$PASTA_DESTINO/"
cp requirements.txt "$PASTA_DESTINO/"
cp INSTRUCOES_WINDOWS.txt "$PASTA_DESTINO/"

# Criar arquivo ZIP
zip -r "${PASTA_DESTINO}.zip" "$PASTA_DESTINO"

echo "Arquivos preparados em ${PASTA_DESTINO}.zip"
echo "Envie este arquivo ZIP para o usuário Windows." 