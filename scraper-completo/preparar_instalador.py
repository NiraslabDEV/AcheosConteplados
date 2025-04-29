import os
import shutil
import PyInstaller.__main__
from datetime import datetime

def criar_pastas():
    """Cria as pastas necessárias"""
    pastas = ['dist', 'dist/DADOS EXTRAIDOS', 'build']
    for pasta in pastas:
        if not os.path.exists(pasta):
            os.makedirs(pasta)
            print(f"Pasta criada: {pasta}")

def compilar_executaveis():
    """Compila todos os scripts em executáveis"""
    scripts = [
        'CC_Cartas_Contempladas.py',
        'CT_Consorcio_Contemplado.py',
        'SP_Extrator.py',
        'VC_Extrator.py',
        'consolidador.py',
        'executar_extracao.py'
    ]

    common_options = [
        '--onefile',
        '--noconsole',
        '--hidden-import=selenium',
        '--hidden-import=webdriver_manager',
        '--hidden-import=pandas',
        '--hidden-import=openpyxl',
        '--hidden-import=logging',
        '--hidden-import=beautifulsoup4'
    ]

    print("\nCompilando executáveis...")
    for script in scripts:
        print(f"\nCompilando {script}...")
        PyInstaller.__main__.run([
            script,
            f'--name={os.path.splitext(script)[0]}',
            *common_options
        ])

def criar_pasta_final():
    """Cria a pasta final com a estrutura correta"""
    nome_pasta = f"Consorcio_Windows_{datetime.now().strftime('%Y%m%d_%H%M')}"
    
    # Cria a pasta principal
    if os.path.exists(nome_pasta):
        shutil.rmtree(nome_pasta)
    os.makedirs(nome_pasta)
    os.makedirs(os.path.join(nome_pasta, "DADOS EXTRAIDOS"))

    # Move os executáveis
    for arquivo in os.listdir('dist'):
        if arquivo.endswith('.exe'):
            shutil.move(
                os.path.join('dist', arquivo),
                os.path.join(nome_pasta, arquivo)
            )

    print(f"\nPasta final criada: {nome_pasta}")
    return nome_pasta

def criar_readme(pasta_destino):
    """Cria o arquivo README com instruções"""
    conteudo = """# Sistema de Extração de Dados de Consórcios

## Requisitos
- Windows 10 ou superior
- Google Chrome instalado

## Como Usar

1. **Primeira Vez**:
   - Instale o Google Chrome se ainda não tiver
   - Execute `executar_extracao.exe`
   - Aguarde a configuração automática

2. **Uso Normal**:
   - Execute `executar_extracao.exe`
   - Os dados serão salvos na pasta "DADOS EXTRAIDOS"

3. **Execução Individual** (se necessário):
   1. CC_Cartas_Contempladas.exe
   2. CT_Consorcio_Contemplado.exe
   3. SP_Extrator.exe
   4. VC_Extrator.exe
   5. consolidador.exe

## Solução de Problemas

1. **Antivírus bloqueando**:
   - Adicione a pasta como exceção no antivírus
   - Ou execute como administrador

2. **Chrome não abre**:
   - Verifique se o Google Chrome está instalado
   - Reinstale o Google Chrome se necessário

3. **Erro de permissão**:
   - Clique com botão direito -> Executar como administrador"""
    
    with open(os.path.join(pasta_destino, 'README.txt'), 'w', encoding='utf-8') as f:
        f.write(conteudo)

def limpar_arquivos_temp():
    """Limpa arquivos temporários"""
    pastas = ['build', 'dist']
    for pasta in pastas:
        if os.path.exists(pasta):
            shutil.rmtree(pasta)
    
    # Remove arquivos .spec
    for arquivo in os.listdir('.'):
        if arquivo.endswith('.spec'):
            os.remove(arquivo)

def main():
    print("Iniciando preparação do instalador...")
    
    # Limpa arquivos temporários anteriores
    limpar_arquivos_temp()
    
    # Cria estrutura de pastas
    criar_pastas()
    
    # Compila os executáveis
    compilar_executaveis()
    
    # Cria pasta final
    pasta_final = criar_pasta_final()
    
    # Cria README
    criar_readme(pasta_final)
    
    # Limpa arquivos temporários
    limpar_arquivos_temp()
    
    print("\nProcesso concluído!")
    print(f"A pasta '{pasta_final}' está pronta para ser enviada.")
    print("Lembre-se de testar os executáveis antes de enviar.")

if __name__ == "__main__":
    main() 