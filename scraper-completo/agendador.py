#!/usr/bin/env python3

import time
import subprocess
from datetime import datetime
import os

def executar_extracao_e_git():
    print(f"Iniciando execução em {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Executa o script de extração
    subprocess.run(["python3", "executar_extracao.py"], check=True)
    
    # Configura o git e faz o commit
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    subprocess.run(["git", "add", "."], check=True)
    subprocess.run(["git", "commit", "-m", f"Atualização automática - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"], check=True)
    subprocess.run(["git", "push"], check=True)
    
    print("Execução e upload concluídos com sucesso!")

def main():
    # Executa a cada 24 horas
    while True:
        hora_atual = datetime.now().hour
        if hora_atual == 7:  # Se for 7h da manhã
            executar_extracao_e_git()
        time.sleep(3600)  # Espera 1 hora antes de verificar novamente

if __name__ == "__main__":
    main() 