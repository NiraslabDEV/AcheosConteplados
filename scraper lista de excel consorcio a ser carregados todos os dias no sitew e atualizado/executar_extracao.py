import subprocess
import time
import os
from datetime import datetime

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

def main():
    # Cria pasta de logs se não existir
    if not os.path.exists("logs"):
        os.makedirs("logs")
    
    # Nome do arquivo de log com timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = f"logs/extracao_{timestamp}.log"
    
    scripts = [
        "CC_Cartas_Contempladas.py",
        "CT_Consorcio_Contemplado.py", 
        "SP_Extrator.py",
        "VC_Extrator.py",
        "consolidador.py"
    ]
    
    sucessos = 0
    falhas = 0
    
    print("Iniciando execução dos scripts...")
    
    with open(log_filename, "w") as log_file:
        # Registra início da execução
        log_file.write(f"=== Início da execução: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n\n")
        
        # Executa cada script
        for script in scripts:
            if executar_script(script, log_file):
                sucessos += 1
            else:
                falhas += 1
            
            # Aguarda 5 segundos entre execuções
            if script != scripts[-1]:  # Não espera após o último script
                time.sleep(5)
        
        # Registra fim da execução
        log_file.write(f"\n=== Fim da execução: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
        log_file.write(f"\nResumo:\n")
        log_file.write(f"Scripts executados com sucesso: {sucessos}\n")
        log_file.write(f"Scripts com falha: {falhas}\n")
    
    print(f"\nResumo da execução:")
    print(f"Scripts executados com sucesso: {sucessos}")
    print(f"Scripts com falha: {falhas}")
    print(f"\nLog completo salvo em: {log_filename}")

if __name__ == "__main__":
    main() 