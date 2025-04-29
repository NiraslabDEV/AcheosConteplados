import os
import requests
import json
from datetime import datetime
import hashlib
import sys

# Configurações
VERSAO_ATUAL = "1.0.0"
ARQUIVOS_MONITORADOS = [
    'CC_Cartas_Contempladas.py',
    'CT_Consorcio_Contemplado.py',
    'SP_Extrator.py',
    'VC_Extrator.py',
    'consolidador.py',
    'executar_extracao.py'
]

def calcular_hash_arquivo(arquivo):
    """Calcula o hash SHA256 de um arquivo"""
    if not os.path.exists(arquivo):
        return None
    
    sha256 = hashlib.sha256()
    with open(arquivo, 'rb') as f:
        for bloco in iter(lambda: f.read(4096), b''):
            sha256.update(bloco)
    return sha256.hexdigest()

def verificar_atualizacoes():
    """Verifica se há atualizações necessárias"""
    print("Verificando atualizações...")
    
    # Aqui você implementaria a lógica para verificar atualizações
    # Por exemplo, comparando com uma API ou servidor
    
    # Por enquanto, vamos apenas recompilar
    if os.path.exists('build_windows.py'):
        print("\nAtualizando executáveis...")
        os.system('python build_windows.py')
        print("\nAtualização concluída!")
    else:
        print("Erro: arquivo build_windows.py não encontrado!")

def main():
    print(f"Sistema de Atualização - v{VERSAO_ATUAL}")
    print("=====================================")
    
    try:
        verificar_atualizacoes()
    except Exception as e:
        print(f"\nErro durante a atualização: {str(e)}")
        input("\nPressione ENTER para sair...")
        sys.exit(1)
    
    input("\nPressione ENTER para sair...")

if __name__ == "__main__":
    main() 