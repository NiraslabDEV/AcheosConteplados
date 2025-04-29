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
    
    log_filename = f'logs/extracao_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
    
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

def formatar_valor_monetario(valor):
    """Formata o valor monetário para o padrão brasileiro sem pontos."""
    try:
        if not valor:
            return ""
        # Remove R$, espaços e outros caracteres, mantendo números e vírgula
        valor_limpo = re.sub(r'[^\d,]', '', valor)
        # Garante que tenha apenas uma vírgula
        partes = valor_limpo.split(',')
        if len(partes) > 1:
            return f"{partes[0]},{partes[1][:2]}"
        return valor_limpo
    except Exception:
        return valor

def formatar_nome_empresa(nome):
    """Formata o nome da empresa com apenas a primeira letra maiúscula."""
    try:
        if not nome:
            return ""
        return nome.strip().title()
    except:
        return nome

def extrair_total_parcelas(parcelas):
    """Extrai apenas o número total de parcelas."""
    try:
        if not parcelas:
            return ""
        
        # Se tiver + soma as parcelas
        if '+' in parcelas:
            total = 0
            partes = parcelas.split('+')
            for parte in partes:
                match = re.search(r'(\d+)\s*[xX]', parte.strip())
                if match:
                    total += int(match.group(1))
            return str(total)
        
        # Caso simples, apenas um número de parcelas
        match = re.search(r'(\d+)\s*[xX]', parcelas)
        if match:
            return match.group(1)
        
        return parcelas.strip()
    except:
        return parcelas

def formatar_fluxo_pagamento(parcelas, valor):
    """Formata o fluxo de pagamento no padrão desejado."""
    try:
        if not parcelas:
            return ""
        
        # Substitui o '+' por quebra de linha e remove espaços extras
        return '\n'.join(parte.strip() for parte in parcelas.split('+'))
    except Exception as e:
        logging.error(f"Erro ao formatar fluxo de pagamento: {str(e)}")
        return parcelas

def gerar_codigo(codigos_existentes):
    """Gera um novo código sequencial no formato VC + número."""
    if not codigos_existentes:
        return "VC1001"
    
    numeros = [int(re.search(r'VC(\d+)', cod).group(1)) 
               for cod in codigos_existentes 
               if re.search(r'VC(\d+)', cod)]
    
    if not numeros:
        return "VC1001"
    
    return f"VC{max(numeros) + 1}"

def extrair_dados_tabela(url, codigos_existentes):
    logger = logging.getLogger(__name__)
    logger.info(f"Iniciando extração de dados da URL: {url}")
    
    tipo = "Imóveis" if "imoveis" in url.lower() else "Veículos"
    logger.info(f"Tipo de consórcio identificado: {tipo}")
    
    driver = configurar_driver()
    dados = []
    
    try:
        logger.info("Acessando página...")
        driver.get(url)
        time.sleep(10)  # Aumentado o tempo de espera inicial
        
        # Tenta localizar a tabela por diferentes seletores
        try:
            tabela = WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "table"))
            )
        except:
            logger.info("Tentando localizar tabela por XPath...")
            tabela = WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.XPATH, "//table"))
            )
        
        linhas = tabela.find_elements(By.TAG_NAME, "tr")
        logger.info(f"Encontradas {len(linhas)} linhas na tabela")
        
        for idx, linha in enumerate(linhas[1:], 1):  # Pula o cabeçalho
            try:
                # Extrai dados das colunas
                colunas = linha.find_elements(By.TAG_NAME, "td")
                if len(colunas) < 5:  # Ajustado o número mínimo de colunas
                    continue
                
                # Extrai e verifica o status primeiro
                status_text = colunas[4].text.strip().lower()
                if "vendida" in status_text:
                    continue  # Pula cotas vendidas
                elif "reservada" in status_text:
                    status = "Indisponível"
                else:
                    status = "Disponível"
                    
                # Extrai informações básicas com tratamento de erro para cada coluna
                try:
                    consorcio = formatar_nome_empresa(colunas[0].text)
                except:
                    consorcio = ""
                    
                try:
                    valor_carta = formatar_valor_monetario(colunas[1].text)
                except:
                    valor_carta = ""
                    
                try:
                    entrada_original = formatar_valor_monetario(colunas[2].text)
                except:
                    entrada_original = ""
                
                # Calcula entrada com 5% adicional do valor da carta
                try:
                    if valor_carta and entrada_original:
                        valor_carta_float = float(valor_carta.replace(',', '.'))
                        entrada_float = float(entrada_original.replace(',', '.'))
                        entrada_final = entrada_float + (valor_carta_float * 0.05)
                        entrada = f"{entrada_final:.2f}".replace('.', ',')
                    else:
                        entrada = entrada_original
                except:
                    entrada = entrada_original
                
                # Extrai informações de parcelas
                try:
                    parcelas = colunas[3].text.strip()  # Campo PARCELAS RESTANTES
                    fluxo_pagamento = formatar_fluxo_pagamento(parcelas, "")  # Passamos apenas as parcelas, pois o valor já está incluído
                    total_parcelas = extrair_total_parcelas(parcelas)
                except:
                    parcelas = ""
                    fluxo_pagamento = ""
                    total_parcelas = ""
                
                # Gera código único
                codigo = gerar_codigo(codigos_existentes)
                codigos_existentes.add(codigo)
                
                # Adiciona o registro apenas se tiver informações mínimas
                if consorcio and valor_carta:
                    dados.append({
                        'Código': codigo,
                        'Tipo': tipo,
                        'Valor da carta': valor_carta,
                        'Entrada': entrada,
                        'Total de Parcelas': total_parcelas,
                        'Consórcio': consorcio,
                        'Status': status,
                        'Fluxo de Pagamento': fluxo_pagamento,
                        'Vencimento': '',
                        'Observações': ''
                    })
                    
                    logger.info(f"Linha {idx} processada com sucesso: {codigo}")
                
            except Exception as e:
                logger.error(f"Erro ao processar linha {idx}: {str(e)}")
                continue
        
    except Exception as e:
        logger.error(f"Erro ao processar página: {str(e)}")
    
    finally:
        try:
            driver.quit()
        except:
            pass
        logger.info(f"Finalizando extração. Total de registros extraídos: {len(dados)}")
    
    return dados

def formatar_excel(arquivo):
    """Formata o arquivo Excel conforme especificações."""
    logger = logging.getLogger(__name__)
    logger.info("Iniciando formatação do arquivo Excel")
    
    try:
        wb = load_workbook(arquivo)
        ws = wb.active
        
        # Ajusta largura das colunas
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
        
        # Centraliza conteúdo e permite quebra de linha
        for row in ws.rows:
            for cell in row:
                cell.alignment = Alignment(horizontal='center', 
                                        vertical='center', 
                                        wrap_text=True)
        
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
        # Ordenar por código
        df_novos = df_novos.sort_values('Código')
        # Definir ordem das colunas
        colunas = [
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
        return df_novos[colunas]
    
    df_novos = pd.DataFrame(dados_novos)
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
        # Definir ordem das colunas
        colunas = [
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
        df_atualizado = df_atualizado[colunas]
    
    return df_atualizado

def main():
    logger = configurar_logging()
    logger.info("Iniciando processo de extração de dados")
    
    # Cria pasta para os arquivos se não existir
    pasta_dados = "DADOS EXTRAIDOS"
    if not os.path.exists(pasta_dados):
        os.makedirs(pasta_dados)
    
    # Nome do arquivo base
    site_nome = "venderseuconsorcio"
    arquivo_base = os.path.join(pasta_dados, f'extracao_{site_nome}.xlsx')
    
    # Carregar dados existentes
    dados_existentes = carregar_dados_existentes(arquivo_base)
    
    codigos_existentes = set()
    
    # URLs para extração
    urls = [
        "https://venderseuconsorcio.com.br/cotasdeautomoveis.php",
        "https://venderseuconsorcio.com.br/cotasdeimoveis.php"
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