import pandas as pd
import os
from datetime import datetime
import glob
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

def encontrar_arquivos_recentes():
    """Encontra os arquivos mais recentes de cada site na pasta DADOS EXTRAIDOS."""
    pasta_dados = "DADOS EXTRAIDOS"
    if not os.path.exists(pasta_dados):
        print(f"Pasta {pasta_dados} não encontrada!")
        return {}
    
    # Padrões de arquivo para cada site
    padroes = {
        'venderseuconsorcio': 'extracao_venderseuconsorcio.xlsx',
        'cartascontempladas': 'extracao_cartascontempladas.xlsx',
        'consorciocontemplado': 'extracao_consorciocontemplado.xlsx',
        'contempladosp': 'extracao_SP_contemplados.xlsx',
        'consorciocontemplado_sp': 'consorcio_contemplado_base.xlsx'  # Adicionando o arquivo CS
    }
    
    arquivos_recentes = {}
    
    for site, arquivo in padroes.items():
        caminho_arquivo = os.path.join(pasta_dados, arquivo)
        if os.path.exists(caminho_arquivo):
            arquivos_recentes[site] = caminho_arquivo
            print(f"Arquivo encontrado para {site}: {arquivo}")
        else:
            print(f"Nenhum arquivo encontrado para {site}")
    
    return arquivos_recentes

def ler_e_padronizar_dados(arquivo, site):
    """Lê um arquivo Excel e padroniza suas colunas."""
    print(f"\nLendo dados de {site}...")
    try:
        df = pd.read_excel(arquivo)
    except Exception as e:
        print(f"Erro ao ler arquivo {arquivo}: {str(e)}")
        return None
    
    # Adiciona coluna de origem
    df['Origem'] = site
    
    # Garante que todas as colunas necessárias existem
    colunas_padrao = [
        'Código', 'Tipo', 'Valor da carta', 'Entrada', 'Total de Parcelas',
        'Consórcio', 'Status', 'Fluxo de Pagamento', 'Vencimento', 'Observações', 'Origem'
    ]
    
    for coluna in colunas_padrao:
        if coluna not in df.columns:
            df[coluna] = ''
    
    # Seleciona e ordena as colunas
    df = df[colunas_padrao]
    
    # Padroniza tipos de dados
    df['Total de Parcelas'] = pd.to_numeric(df['Total de Parcelas'], errors='coerce').fillna(0).astype(int)
    df['Valor da carta'] = pd.to_numeric(df['Valor da carta'].astype(str).str.replace('R$', '').str.replace('.', '').str.replace(',', '.').str.strip(), errors='coerce').fillna(0)
    df['Entrada'] = pd.to_numeric(df['Entrada'].astype(str).str.replace('R$', '').str.replace('.', '').str.replace(',', '.').str.strip(), errors='coerce').fillna(0)
    df['Fluxo de Pagamento'] = df['Fluxo de Pagamento'].fillna('')
    df['Observações'] = df['Observações'].fillna('')
    
    # Calcula a razão entre valor total e entrada (quanto maior, melhor o investimento)
    df['Razão Investimento'] = df.apply(lambda row: 
        row['Valor da carta'] / row['Entrada'] if row['Entrada'] > 0 else 0, 
        axis=1
    )
    
    # Adiciona coluna de percentual de entrada
    df['Percentual Entrada'] = df.apply(lambda row:
        (row['Entrada'] / row['Valor da carta'] * 100) if row['Valor da carta'] > 0 else 0,
        axis=1
    )
    
    print(f"Total de registros de {site}: {len(df)}")
    return df

def formatar_excel(writer, df):
    """Aplica formatação ao arquivo Excel."""
    # Obter a planilha ativa
    workbook = writer.book
    worksheet = writer.sheets['Consolidado']
    
    # Configurar cabeçalho
    header_fill = PatternFill(start_color='1F4E78', end_color='1F4E78', fill_type='solid')
    header_font = Font(color='FFFFFF', bold=True)
    
    for idx, col in enumerate(df.columns):
        cell = worksheet.cell(row=1, column=idx+1)
        cell.fill = header_fill
        cell.font = header_font
        
        # Configurar largura e alinhamento para cada coluna
        if col in ['Observações', 'Fluxo de Pagamento']:
            worksheet.column_dimensions[chr(65 + idx)].width = 50
            # Configurar quebra de linha para todas as células da coluna
            for cell in worksheet[chr(65 + idx)][1:]:
                cell.alignment = Alignment(wrap_text=True, vertical='top')
        elif col in ['Valor da carta', 'Entrada', 'Razão Investimento']:
            worksheet.column_dimensions[chr(65 + idx)].width = 20
            # Formatar células numéricas
            for cell in worksheet[chr(65 + idx)][1:]:
                cell.number_format = '#,##0.00'
        elif col == 'Percentual Entrada':
            worksheet.column_dimensions[chr(65 + idx)].width = 20
            # Formatar células de percentual
            for cell in worksheet[chr(65 + idx)][1:]:
                cell.number_format = '0.00%'
        else:
            max_length = max(
                df[col].astype(str).apply(len).max(),
                len(col)
            )
            worksheet.column_dimensions[chr(65 + idx)].width = max_length + 2

def consolidar_dados():
    """Função principal que consolida os dados de todos os extratores."""
    print("\n" + "="*50)
    print("Iniciando consolidação dos dados...")
    print("="*50)
    
    # Encontrar arquivos mais recentes
    arquivos = encontrar_arquivos_recentes()
    if not arquivos:
        print("\nNenhum arquivo encontrado para consolidar!")
        return
    
    # Lista para armazenar os DataFrames
    dfs = []
    
    # Ler e padronizar cada arquivo
    for site, arquivo in arquivos.items():
        try:
            df = ler_e_padronizar_dados(arquivo, site)
            if df is not None and not df.empty:
                dfs.append(df)
        except Exception as e:
            print(f"Erro ao processar arquivo de {site}: {str(e)}")
    
    if not dfs:
        print("\nNenhum dado foi carregado!")
        return
    
    # Concatenar todos os DataFrames
    print("\nConcatenando dados...")
    df_final = pd.concat(dfs, ignore_index=True)
    
    # Ordenar por Razão Investimento (decrescente)
    df_final = df_final.sort_values('Razão Investimento', ascending=False)
    
    # Criar pasta de relatórios se não existir
    pasta_relatorios = "DADOS EXTRAIDOS"
    if not os.path.exists(pasta_relatorios):
        os.makedirs(pasta_relatorios)
    
    # Salvar arquivo consolidado
    data_hora = datetime.now().strftime("%Y%m%d_%H%M")
    arquivo_saida = os.path.join(pasta_relatorios, f'consolidado_{data_hora}.xlsx')
    
    print(f"\nSalvando arquivo consolidado: {arquivo_saida}")
    writer = pd.ExcelWriter(arquivo_saida, engine='openpyxl')
    df_final.to_excel(writer, index=False, sheet_name='Consolidado')
    
    # Aplicar formatação
    formatar_excel(writer, df_final)
    
    # Salvar e fechar
    writer.close()
    
    # Gerar estatísticas
    print("\n" + "="*50)
    print("ESTATÍSTICAS DO ARQUIVO CONSOLIDADO")
    print("="*50)
    print(f"\nTotal de registros: {len(df_final)}")
    
    print("\nRegistros por origem:")
    for origem in df_final['Origem'].unique():
        total = len(df_final[df_final['Origem'] == origem])
        print(f"- {origem}: {total} registros")
    
    print("\nRegistros por tipo:")
    for tipo in df_final['Tipo'].unique():
        total = len(df_final[df_final['Tipo'] == tipo])
        print(f"- {tipo}: {total} registros")
    
    print("\nRegistros por status:")
    for status in df_final['Status'].unique():
        total = len(df_final[df_final['Status'] == status])
        print(f"- {status}: {total} registros")
    
    print("\nMelhores oportunidades (Top 5):")
    top_5 = df_final.head(5)
    for _, row in top_5.iterrows():
        print(f"- {row['Tipo']} - Valor: R$ {row['Valor da carta']:,.2f} - Entrada: R$ {row['Entrada']:,.2f} ({row['Percentual Entrada']:.1f}%) - {row['Total de Parcelas']} parcelas")
    
    print(f"\nArquivo consolidado salvo com sucesso em: {arquivo_saida}")

if __name__ == "__main__":
    consolidar_dados() 