import PyInstaller.__main__
import os

# Lista de scripts para criar executáveis
scripts = [
    'CC_Cartas_Contempladas.py',
    'CT_Consorcio_Contemplado.py',
    'SP_Extrator.py',
    'VC_Extrator.py',
    'consolidador.py',
    'executar_extracao.py'
]

# Configurações comuns para todos os executáveis
common_options = [
    '--onefile',
    '--add-data=requirements.txt;.',
    '--hidden-import=selenium',
    '--hidden-import=webdriver_manager',
    '--hidden-import=pandas',
    '--hidden-import=openpyxl',
    '--hidden-import=logging',
    '--hidden-import=beautifulsoup4',
    '--noconsole'
]

# Criar executáveis para cada script
for script in scripts:
    print(f"\nCriando executável para {script}...")
    PyInstaller.__main__.run([
        script,
        f'--name={os.path.splitext(script)[0]}',
        *common_options
    ]) 