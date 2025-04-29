import pandas as pd
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import os
import time
import random
import glob

class ConsorcioCrawler:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.base_url_imoveis = "https://contempladas.soconsorcio.com.br/?segmento=imovel"
        self.base_url_veiculos = "https://contempladas.soconsorcio.com.br/?segmento=veiculo"
        self.diretorio = "DADOS EXTRAIDOS"
        self.arquivo_base = "consorcio_contemplado_base.xlsx"
        self.contador_codigo = 0  # Contador para gerar códigos sequenciais
        # Lista de consórcios que devem ser excluídos
        self.consorcios_excluidos = [
            'Embracon',
            'BR Consórcios',
            'Multimarcas',
            'Mercabenco'
        ]
    
    def gerar_proximo_codigo(self):
        """Gera o próximo código sequencial"""
        self.contador_codigo += 1
        return f"CS{self.contador_codigo:03d}"  # Formato: CS001, CS002, etc.

    def carregar_ultimo_codigo(self):
        """Carrega o último código usado do arquivo base"""
        try:
            df = self.ler_dados_anteriores()
            if not df.empty and 'Código' in df.columns:
                # Extrai os números dos códigos existentes
                codigos = df['Código'].str.extract(r'CS(\d+)')
                if not codigos.empty:
                    # Converte para numérico, ignorando NaN
                    codigos_num = pd.to_numeric(codigos[0], errors='coerce')
                    if not codigos_num.isna().all():
                        self.contador_codigo = int(codigos_num.max())
                    else:
                        self.contador_codigo = 0
                else:
                    self.contador_codigo = 0
            else:
                self.contador_codigo = 0
        except Exception as e:
            print(f"Erro ao carregar último código: {str(e)}")
            self.contador_codigo = 0

    def obter_arquivo_base(self):
        """Retorna o caminho do arquivo base"""
        return os.path.join(self.diretorio, self.arquivo_base)

    def ler_dados_anteriores(self):
        """Lê os dados do arquivo base"""
        arquivo_base = self.obter_arquivo_base()
        if not os.path.exists(arquivo_base):
            return pd.DataFrame()
            
        try:
            return pd.read_excel(arquivo_base)
        except Exception as e:
            print(f"Erro ao ler arquivo base: {str(e)}")
            return pd.DataFrame()

    def mesclar_dados(self, dados_novos, dados_antigos):
        """Mescla dados novos com antigos, sempre usando a versão mais recente"""
        if dados_antigos.empty:
            return dados_novos
            
        # Converte para DataFrame
        df_novos = pd.DataFrame(dados_novos)
        
        # Retorna os dados novos diretamente
        # Isso fará com que sempre use os dados mais recentes da página
        return df_novos.to_dict('records')

    def extrair_dados_pagina(self, url, tipo):
        """Extrai dados de uma página específica"""
        tentativas = 3
        
        while tentativas > 0:
            try:
                print(f"Tentativa {4-tentativas} de acessar {url}")
                
                # Faz a requisição HTTP
                response = requests.get(url, headers=self.headers)
                response.raise_for_status()
                
                # Parseia o HTML
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Encontra todos os cards
                cards = soup.find_all('div', class_='card-contempladas')
                
                if not cards:
                    raise Exception("Nenhum card encontrado")
                
                # Lista para armazenar os dados
                dados = []
                cards_excluidos = 0
                
                for card in cards:
                    try:
                        # Extrai o consórcio primeiro para verificar se deve ser incluído
                        consorcio = card.select_one('.text-start.text-secondary')
                        consorcio = consorcio.text.strip() if consorcio else ""
                        
                        # Verifica se o consórcio está na lista de excluídos
                        if any(excluido.lower() in consorcio.lower() for excluido in self.consorcios_excluidos):
                            cards_excluidos += 1
                            continue
                        
                        # Gera um novo código sequencial ao invés de usar o código do site
                        codigo = self.gerar_proximo_codigo()
                        
                        # Se não estiver excluído, extrai os demais dados
                        valor = card.select_one('.text-success.text-bold').text.strip()
                        
                        # Encontra os elementos de entrada e parcelas
                        entrada_div = card.find('span', string='Entrada:')
                        parcelas_div = card.find('span', string='Parcelas:')
                        
                        entrada = ""
                        parcelas = ""
                        valor_parcela = ""
                        
                        # Extrai entrada e adiciona 5% do valor da carta
                        if entrada_div:
                            entrada_valor = entrada_div.find_next('span', class_='text-bold')
                            if entrada_valor:
                                entrada = entrada_valor.text.strip()
                                # Converte valor da carta e entrada para float
                                valor_carta = float(self.limpar_valor(valor))
                                valor_entrada = float(self.limpar_valor(entrada))
                                # Calcula 5% do valor da carta
                                adicional = valor_carta * 0.05
                                # Soma ao valor da entrada
                                entrada_total = valor_entrada + adicional
                                # Converte de volta para string formatada
                                entrada = self.formatar_valor_moeda(entrada_total)
                        
                        # Extrai parcelas e valor da parcela
                        if parcelas_div:
                            # Primeiro span text-bold após "Parcelas:" contém o número
                            parcelas_span = parcelas_div.find_next('span', class_='text-bold')
                            if parcelas_span:
                                parcelas = parcelas_span.text.strip()
                            
                            # Próximo span text-bold contém o valor da parcela
                            valor_parcela_span = parcelas_span.find_next('span', class_='text-bold')
                            if valor_parcela_span:
                                valor_parcela = valor_parcela_span.text.strip()
                        
                        # Extrai outros dados disponíveis
                        status = "Disponível"  # Valor padrão, ajuste conforme necessário
                        
                        # Monta o fluxo de pagamento
                        fluxo = ""
                        if parcelas and valor_parcela:
                            valor_parcela_limpo = self.formatar_valor_moeda(self.limpar_valor(valor_parcela))
                            fluxo = f"{parcelas}x {valor_parcela_limpo}"
                        
                        # Cria o dicionário de dados na ordem correta
                        dado = {
                            'Código': codigo,
                            'Tipo': tipo,
                            'Valor da carta': self.formatar_valor_moeda(self.limpar_valor(valor)),
                            'Entrada': self.formatar_valor_moeda(self.limpar_valor(entrada)),
                            'Total de Parcelas': parcelas,
                            'Consórcio': consorcio,
                            'Status': status,
                            'Fluxo de Pagamento': fluxo,
                            'Vencimento': '',  # Preencher se disponível
                            'Observações': ''  # Preencher se disponível
                        }
                        dados.append(dado)
                        
                    except Exception as e:
                        print(f"Erro ao extrair dados do card: {str(e)}")
                        continue
                
                if dados:
                    print(f"Extraídos {len(dados)} registros de {tipo}")
                    if cards_excluidos > 0:
                        print(f"Ignorados {cards_excluidos} registros de consórcios excluídos")
                    return dados
                else:
                    raise Exception("Nenhum dado extraído")
                
            except requests.exceptions.RequestException as e:
                print(f"Erro na requisição HTTP para {url}: {str(e)}")
                tentativas -= 1
                time.sleep(5)
                
            except Exception as e:
                print(f"Erro ao extrair dados da página {url}: {str(e)}")
                tentativas -= 1
                time.sleep(5)
        
        print(f"Todas as tentativas falharam para {url}")
        return []
    
    def limpar_valor(self, valor):
        """Limpa e formata valores monetários"""
        if isinstance(valor, str):
            # Remove 'R$' e espaços
            valor = valor.replace('R$', '').strip()
            
            # Remove pontos dos milhares e substitui vírgula por ponto
            partes = valor.split(',')
            if len(partes) == 2:
                inteiro = partes[0].replace('.', '')
                decimal = partes[1]
                return f"{inteiro}.{decimal}"
            
            return valor
        return valor

    def formatar_valor_moeda(self, valor):
        """Formata um valor numérico para o formato R$ X.XXX,XX"""
        try:
            # Converte para float se for string
            if isinstance(valor, str):
                valor = float(self.limpar_valor(valor))
                
            # Formata o valor
            valor_formatado = f"R$ {valor:,.2f}".replace(',', '_').replace('.', ',').replace('_', '.')
            return valor_formatado
        except:
            return valor
    
    def ajustar_largura_colunas(self, writer, sheet_name):
        """Ajusta a largura das colunas do Excel"""
        worksheet = writer.sheets[sheet_name]
        for idx, col in enumerate(worksheet.columns, 1):
            max_length = 0
            column = col[0].column_letter  # Obtém a letra da coluna
            
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            
            adjusted_width = (max_length + 2)
            worksheet.column_dimensions[column].width = adjusted_width
    
    def salvar_dados(self, dados, nome_arquivo=None):
        """Salva os dados no arquivo base"""
        try:
            # Cria o diretório se não existir
            if not os.path.exists(self.diretorio):
                os.makedirs(self.diretorio)
            
            if not dados:
                print("Nenhum dado para salvar!")
                return
            
            # Cria o DataFrame e salva em Excel
            df = pd.DataFrame(dados)
            
            # Garante a ordem correta das colunas
            colunas_ordem = [
                'Código', 'Tipo', 'Valor da carta', 'Entrada', 
                'Total de Parcelas', 'Consórcio', 'Status',
                'Fluxo de Pagamento', 'Vencimento', 'Observações'
            ]
            df = df[colunas_ordem]
            
            # Usa o arquivo base
            caminho_arquivo = self.obter_arquivo_base()
            
            # Salva com o pandas ExcelWriter para poder ajustar as colunas
            with pd.ExcelWriter(caminho_arquivo, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Dados')
                self.ajustar_largura_colunas(writer, 'Dados')
            
            print(f"Dados salvos com sucesso em {caminho_arquivo}")
            print(f"Total de registros: {len(dados)}")
            
        except Exception as e:
            print(f"Erro ao salvar os dados: {str(e)}")
    
    def executar_extracao(self):
        """Executa a extração completa dos dados"""
        print("Iniciando extração de dados...")
        
        # Carrega o último código usado
        self.carregar_ultimo_codigo()
        
        # Lê dados anteriores
        dados_anteriores = self.ler_dados_anteriores()
        
        # Extrai dados de imóveis
        print("\nExtraindo dados de imóveis...")
        dados_imoveis = self.extrair_dados_pagina(self.base_url_imoveis, "Imóveis")
        
        # Pequena pausa entre as extrações
        time.sleep(3)
        
        # Extrai dados de veículos
        print("\nExtraindo dados de veículos...")
        dados_veiculos = self.extrair_dados_pagina(self.base_url_veiculos, "Veículos")
        
        # Combina os dados novos
        todos_dados_novos = dados_imoveis + dados_veiculos
        
        # Mescla com dados anteriores
        dados_mesclados = self.mesclar_dados(todos_dados_novos, dados_anteriores)
        
        # Salva os dados no arquivo base
        self.salvar_dados(dados_mesclados)
        
        print("\nExtração concluída!")

if __name__ == "__main__":
    crawler = ConsorcioCrawler()
    crawler.executar_extracao() 