from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pandas as pd
import time
import re
import logging
from datetime import datetime
import os
from openpyxl import load_workbook
from openpyxl.styles import Alignment
import platform
from webdriver_manager.chrome import ChromeDriverManager

# Configuração do sistema de logs
def configurar_logging():
    if not os.path.exists('logs'):
        os.makedirs('logs')
    
    log_filename = f'logs/extracao_cartas_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler(log_filename),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def configurar_driver():
    logger = logging.getLogger(__name__)
    logger.info("Iniciando configuração do driver Chrome")
    
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    
    try:
        # Configuração específica para Windows
        if platform.system() == 'Windows':
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
        else:
            driver = webdriver.Chrome(options=chrome_options)
            
        logger.info("Driver Chrome configurado com sucesso")
        return driver
    except Exception as e:
        logger.error(f"Erro ao configurar driver Chrome: {str(e)}")
        raise

def formatar_valor_parcelas(parcelas, valor):
    """Formata o valor das parcelas no formato desejado."""
    try:
        if not parcelas or not valor:
            return ""
            
        # Se houver símbolo +, substitui por quebra de linha
        if '+' in valor:
            partes = valor.split('+')
            valores_formatados = []
            for parte in partes:
                parte = parte.strip()
                match = re.search(r'(\d+)\s*[xX]\s*([\d,.]+)', parte)
                if match:
                    num_parcelas = match.group(1)
                    valor_parcela = match.group(2)
                    # Formata o valor como moeda brasileira
                    valor_formatado = f"R$ {float(valor_parcela.replace('.', '').replace(',', '.')):.2f}".replace('.', ',')
                    valores_formatados.append(f"{num_parcelas} x {valor_formatado}")
                else:
                    # Se não encontrar o padrão de parcelas, tenta formatar o valor
                    try:
                        valor_limpo = re.sub(r'[^\d,.]', '', parte)
                        valor_formatado = f"R$ {float(valor_limpo.replace('.', '').replace(',', '.')):.2f}".replace('.', ',')
                        valores_formatados.append(f"{parcelas} x {valor_formatado}")
                    except:
                        valores_formatados.append(parte)
            return '\n'.join(valores_formatados)
        
        # Tenta encontrar o padrão de parcelas no valor
        match = re.search(r'(\d+)\s*[xX]\s*([\d,.]+)', valor)
        if match:
            num_parcelas = match.group(1)
            valor_parcela = match.group(2)
            # Formata o valor como moeda brasileira
            valor_formatado = f"R$ {float(valor_parcela.replace('.', '').replace(',', '.')):.2f}".replace('.', ',')
            return f"{num_parcelas} x {valor_formatado}"
        
        # Se não encontrar o padrão, formata o valor simples com o número de parcelas
        try:
            valor_limpo = re.sub(r'[^\d,.]', '', valor)
            valor_formatado = f"R$ {float(valor_limpo.replace('.', '').replace(',', '.')):.2f}".replace('.', ',')
            return f"{parcelas} x {valor_formatado}"
        except:
            return f"{parcelas} x {valor.strip()}"
            
    except Exception as e:
        logging.error(f"Erro ao formatar valor das parcelas: {str(e)}")
        return valor

def validar_administradora(nome, tipo):
    """Valida se a administradora deve ser incluída com base no tipo."""
    nome = nome.upper().strip()
    
    if tipo == "Imóveis":
        admins_validas = ["ITAU", "ITAÚ", "PORTO", "PORTO SEGURO", "SANTANDER", "BRADESCO"]
        return any(admin in nome for admin in admins_validas)
    else:  # Veículos
        admins_validas = ["ITAU", "ITAÚ", "PORTO", "PORTO SEGURO"]
        return any(admin in nome for admin in admins_validas)

def padronizar_nome_administradora(nome):
    """Padroniza o nome da administradora."""
    nome = nome.upper().strip()
    
    if "ITAU" in nome or "ITAÚ" in nome:
        return "Itaú"
    elif "PORTO" in nome:
        return "Porto Seguro"
    elif "SANTANDER" in nome:
        return "Santander"
    elif "BRADESCO" in nome:
        return "Bradesco"
    return nome

def gerar_codigo_sequencial(codigos_existentes):
    """Gera um novo código sequencial."""
    if not codigos_existentes:
        return "CC1001"
    
    # Extrai o maior número dos códigos existentes
    numeros = [int(re.search(r'CC(\d+)', cod).group(1)) for cod in codigos_existentes if re.search(r'CC(\d+)', cod)]
    if not numeros:
        return "CC1001"
    
    return f"CC{max(numeros) + 1}"

def formatar_valor_monetario(valor):
    """Formata o valor monetário removendo R$ e espaços."""
    try:
        if not valor:
            return ""
        # Remove R$, espaços e outros caracteres, mantendo números, vírgula e ponto
        valor_limpo = re.sub(r'[^\d,.]', '', valor)
        return valor_limpo
    except Exception:
        return valor

def extrair_dados_tabela(url, codigos_existentes):
    logger = logging.getLogger(__name__)
    logger.info(f"Iniciando extração de dados da URL: {url}")
    
    # Ajusta o tipo para ter inicial maiúscula
    tipo = "Imóveis" if "imoveis" in url.lower() else "Veículos"
    logger.info(f"Tipo de consórcio identificado: {tipo}")
    
    driver = configurar_driver()
    dados = []
    
    try:
        logger.info("Acessando página...")
        driver.get(url)
        time.sleep(5)
        
        logger.info("Procurando tabela na página...")
        # Procurar pelo tbody com id="listaCotas"
        tbody = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "listaCotas"))
        )
        
        linhas = tbody.find_elements(By.TAG_NAME, "tr")
        logger.info(f"Encontradas {len(linhas)} linhas na tabela")
        
        for idx, linha in enumerate(linhas, 1):
            try:
                colunas = linha.find_elements(By.TAG_NAME, "td")
                if not colunas or len(colunas) < 8:
                    continue
                
                # Extrair dados das colunas usando as classes CSS
                try:
                    # Encontrar a coluna da administradora
                    admin_col = linha.find_element(By.CLASS_NAME, "administradora")
                    administradora = admin_col.text.strip()
                    
                    # Validar administradora
                    if not validar_administradora(administradora, tipo):
                        logger.info(f"Administradora {administradora} ignorada para o tipo {tipo}")
                        continue
                    
                    administradora = padronizar_nome_administradora(administradora)
                    
                    # Extrair valor do crédito (valor da carta)
                    valor_credito_element = linha.find_element(By.CLASS_NAME, "removeDecimals")
                    valor_credito = valor_credito_element.text.strip()
                    valor_credito = re.sub(r'[^\d,]', '', valor_credito)  # Remove tudo exceto números e vírgula
                    
                    # Extrair valor da entrada original
                    entrada_element = linha.find_elements(By.CLASS_NAME, "removeDecimals")[1]
                    entrada_original = entrada_element.text.strip()
                    entrada_original = re.sub(r'[^\d,]', '', entrada_original)
                    
                    # Calcular valor da entrada (entrada original + 5% do valor da carta)
                    valor_credito_float = float(valor_credito.replace(',', '.'))
                    entrada_original_float = float(entrada_original.replace(',', '.'))
                    valor_adicional = valor_credito_float * 0.05
                    valor_entrada_total = entrada_original_float + valor_adicional
                    entrada = f"{valor_entrada_total:.2f}".replace('.', ',')
                    
                    parcelas = linha.find_element(By.CLASS_NAME, "colunaQtdParcelas").text.strip()
                    valor_parcela = linha.find_element(By.CLASS_NAME, "valorDasParcelas").text.strip()
                    
                    # Gerar código sequencial
                    codigo = gerar_codigo_sequencial(codigos_existentes)
                    codigos_existentes.add(codigo)
                    
                    # Formatar valor das parcelas
                    valor_parcelas_formatado = formatar_valor_parcelas(parcelas, valor_parcela)
                    
                    dados.append({
                        'Código': codigo,
                        'Tipo': tipo,
                        'Valor da carta': valor_credito,
                        'Entrada': entrada,
                        'Total de Parcelas': parcelas,
                        'Consórcio': administradora,
                        'Status': 'Disponível',  # Status padrão
                        'Fluxo de Pagamento': valor_parcelas_formatado,
                        'Vencimento': '',
                        'Observações': ''
                    })
                    
                    logger.info(f"Linha {idx} processada com sucesso: {codigo}")
                    
                except Exception as e:
                    logger.error(f"Erro ao extrair dados da linha {idx}: {str(e)}")
                    continue
                
            except Exception as e:
                logger.error(f"Erro ao processar linha {idx}: {str(e)}")
                continue
    
    except Exception as e:
        logger.error(f"Erro ao processar página: {str(e)}")
    
    finally:
        logger.info(f"Finalizando extração. Total de registros extraídos: {len(dados)}")
        driver.quit()
    
    return dados

def formatar_excel(arquivo):
    """Formata o arquivo Excel."""
    logger = logging.getLogger(__name__)
    logger.info("Iniciando formatação do arquivo Excel")
    
    try:
        wb = load_workbook(arquivo)
        ws = wb.active
        
        # Ajustar largura das colunas
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            
            adjusted_width = max(max_length + 2, 15)
            ws.column_dimensions[column].width = adjusted_width
        
        # Centralizar conteúdo e permitir quebra de linha
        for row in ws.rows:
            for cell in row:
                cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        
        wb.save(arquivo)
        logger.info("Formatação do arquivo Excel concluída com sucesso")
        
    except Exception as e:
        logger.error(f"Erro ao formatar arquivo Excel: {str(e)}")

def carregar_dados_existentes(arquivo):
    """Carrega os dados do arquivo Excel existente."""
    logger = logging.getLogger(__name__)
    try:
        if os.path.exists(arquivo):
            logger.info(f"Carregando dados existentes do arquivo {arquivo}")
            df_existente = pd.read_excel(arquivo)
            return df_existente
        else:
            logger.info("Arquivo não encontrado. Será criado um novo arquivo.")
            return pd.DataFrame()
    except Exception as e:
        logger.error(f"Erro ao carregar arquivo existente: {str(e)}")
        return pd.DataFrame()

def atualizar_dados(dados_novos, dados_existentes):
    """Atualiza os dados existentes com os novos dados."""
    logger = logging.getLogger(__name__)
    
    if dados_existentes.empty:
        logger.info("Não há dados existentes. Retornando dados novos.")
        df_novos = pd.DataFrame(dados_novos)
        # Renomear colunas
        df_novos = df_novos.rename(columns={
            'Parcelas': 'Total de Parcelas',
            'Administradora': 'Consórcio'
        })
        # Reordenar colunas
        ordem_colunas = [
            'Código',
            'Tipo',
            'Valor da carta',
            'Entrada',
            'Total de Parcelas',
            'Consórcio',
            'Status',
            'Fluxo de Pagamento',
            'Vencimento',
            'Observações'
        ]
        return df_novos[ordem_colunas]
    
    df_novos = pd.DataFrame(dados_novos)
    # Renomear colunas no DataFrame novo
    df_novos = df_novos.rename(columns={
        'Parcelas': 'Total de Parcelas',
        'Administradora': 'Consórcio'
    })
    
    ids_existentes = set(dados_existentes['Código'].values)
    registros_atualizados = []
    
    # Processar novos dados
    for _, row_novo in df_novos.iterrows():
        codigo = row_novo['Código']
        status = row_novo['Status']
        
        # Se o registro existe
        if codigo in ids_existentes:
            registro_existente = dados_existentes[dados_existentes['Código'] == codigo].iloc[0]
            
            # Se foi vendido, não incluir
            if status.upper() == 'VENDIDO':
                logger.info(f"Registro {codigo} foi vendido e será removido")
                continue
            
            # Verificar alterações
            campos_comparacao = ['Valor da carta', 'Entrada', 'Total de Parcelas', 'Fluxo de Pagamento', 
                               'Status']
            houve_alteracao = False
            
            for campo in campos_comparacao:
                if str(registro_existente[campo]) != str(row_novo[campo]):
                    logger.info(f"Campo {campo} do registro {codigo} foi alterado")
                    houve_alteracao = True
            
            if houve_alteracao:
                logger.info(f"Registro {codigo} foi atualizado")
                registros_atualizados.append(row_novo.to_dict())
            else:
                registros_atualizados.append(registro_existente.to_dict())
        else:
            # Novo registro
            if status.upper() != 'VENDIDO':
                logger.info(f"Novo registro adicionado: {codigo}")
                registros_atualizados.append(row_novo.to_dict())
    
    df_atualizado = pd.DataFrame(registros_atualizados)
    
    if not df_atualizado.empty:
        df_atualizado = df_atualizado.sort_values('Código')
        # Reordenar colunas
        ordem_colunas = [
            'Código',
            'Tipo',
            'Valor da carta',
            'Entrada',
            'Total de Parcelas',
            'Consórcio',
            'Status',
            'Fluxo de Pagamento',
            'Vencimento',
            'Observações'
        ]
        df_atualizado = df_atualizado[ordem_colunas]
    
    return df_atualizado

def main():
    logger = configurar_logging()
    logger.info("Iniciando processo de extração de dados")
    
    # Cria pasta para os arquivos se não existir
    pasta_dados = "DADOS EXTRAIDOS"
    if not os.path.exists(pasta_dados):
        os.makedirs(pasta_dados)
    
    # Nome do arquivo base
    site_nome = "cartascontempladas"
    arquivo_base = os.path.join(pasta_dados, f'extracao_{site_nome}.xlsx')
    
    # Carregar dados existentes
    dados_existentes = carregar_dados_existentes(arquivo_base)
    
    codigos_existentes = set()
    
    # URLs para extração
    urls = [
        "https://cartascontempladas.com.br/cartas-contempladas-de-veiculos/",
        "https://cartascontempladas.com.br/consorcios-contemplados-de-imoveis/"
    ]
    
    todos_dados = []
    
    # Extrai dados de cada URL
    for url in urls:
        logger.info(f"Processando URL: {url}")
        dados = extrair_dados_tabela(url, codigos_existentes)
        todos_dados.extend(dados)
        logger.info(f"Dados extraídos da URL: {len(dados)} registros")
        time.sleep(2)
    
    if todos_dados:
        logger.info(f"Total de registros coletados: {len(todos_dados)}")
        
        # Atualizar dados existentes com os novos dados
        df_atualizado = atualizar_dados(todos_dados, dados_existentes)
        
        # Salvar arquivo
        df_atualizado.to_excel(arquivo_base, index=False)
        logger.info(f"Dados atualizados exportados com sucesso para {arquivo_base}")
        
        # Formatar o arquivo Excel
        formatar_excel(arquivo_base)
    else:
        logger.error("Nenhum dado foi extraído")

if __name__ == "__main__":
    main() 