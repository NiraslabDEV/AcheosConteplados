import subprocess
import time
import os
from datetime import datetime
import logging
from CC_Cartas_Contempladas import extrair_cartas_contempladas
from CT_Consorcio_Contemplado import extrair_consorcio_contemplado
from SP_Extrator import extrair_contempladosp
from VC_Extrator import extrair_venderseuconsorcio
from CS_Consorcio_Contemplado import extrair_consorcio_contemplado_sp
from consolidador import consolidar_dados

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/extracao_{datetime.now().strftime("%Y%m%d_%H%M")}.log'),
        logging.StreamHandler()
    ]
)

def executar_script(nome_script, arquivo_log):
    """
    Executa um script Python e registra o resultado no arquivo de log
    """
    print(f"\nExecutando {nome_script}...")
    
    comando = f"python3 {nome_script}"
    
    try:
        resultado = subprocess.run(comando, shell=True, check=True, capture_output=True, text=True)
        sucesso = True
        mensagem = "Executado com sucesso"
    except subprocess.CalledProcessError as e:
        sucesso = False
        mensagem = f"Falha na execução: {str(e)}"
    
    # Registra no log
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {nome_script}: {mensagem}\n"
    
    if not sucesso:
        log_entry += f"Erro: {mensagem}\n"
        if hasattr(e, 'output'):
            log_entry += f"Saída: {e.output}\n"
        if hasattr(e, 'stderr'):
            log_entry += f"Erro: {e.stderr}\n"
    
    arquivo_log.write(log_entry)
    arquivo_log.flush()
    
    print(mensagem)
    return sucesso

def executar_extracao():
    """Executa a extração de dados de todos os sites."""
    try:
        logging.info("Iniciando processo de extração...")
        
        # Criar diretórios necessários
        os.makedirs("DADOS EXTRAIDOS", exist_ok=True)
        os.makedirs("logs", exist_ok=True)
        
        # Executar extrações
        logging.info("Extraindo dados do Cartas Contempladas...")
        extrair_cartas_contempladas()
        
        logging.info("Extraindo dados do Consórcio Contemplado...")
        extrair_consorcio_contemplado()
        
        logging.info("Extraindo dados do Contemplados SP...")
        extrair_contempladosp()
        
        logging.info("Extraindo dados do Vender Seu Consórcio...")
        extrair_venderseuconsorcio()
        
        logging.info("Extraindo dados do CS Consórcio Contemplado...")
        extrair_consorcio_contemplado_sp()
        
        # Consolidar dados
        logging.info("Consolidando dados...")
        consolidar_dados()
        
        logging.info("Processo de extração concluído com sucesso!")
        
    except Exception as e:
        logging.error(f"Erro durante a extração: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    executar_extracao() 