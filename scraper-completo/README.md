# Sistema Inteligente de Scraping para Consórcios

Sistema profissional para monitoramento e coleta de dados de consórcios contemplados, desenvolvido em Python com interface gráfica moderna.

## 🚀 Funcionalidades

- Interface gráfica intuitiva com Tkinter
- Coleta automática de dados de múltiplos sites
- Processamento inteligente de dados
- Geração de relatórios em Excel
- Monitoramento em tempo real
- Sistema de retry automático
- Tratamento de erros robusto

## 🛠️ Tecnologias Utilizadas

- Python 3.x
- Selenium WebDriver
- BeautifulSoup4
- Pandas
- Tkinter
- OpenPyXL

## 📋 Pré-requisitos

- Python 3.x instalado
- Chrome WebDriver
- Bibliotecas Python listadas em `requirements.txt`

## 🔧 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/NiraslabDEV/scrip-consorcio.git
cd scrip-consorcio
```

2. Crie um ambiente virtual:

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. Instale as dependências:

```bash
pip install -r requirements.txt
```

## 🎯 Como Usar

1. Execute o script principal:

```bash
python interface.py
```

2. Use a interface gráfica para:
   - Iniciar/parar o scraping
   - Visualizar logs
   - Monitorar estatísticas
   - Atualizar dados

## 📁 Estrutura do Projeto

```
scrip-consorcio/
├── interface.py          # Interface gráfica
├── scraper_contemplados.py  # Script principal de scraping
├── proposta.html        # Página de proposta
├── proposta.css         # Estilos da página
├── proposta.js          # Scripts da página
├── requirements.txt     # Dependências
└── README.md           # Documentação
```

## 📊 Funcionalidades Detalhadas

### Coleta de Dados

- Acesso a múltiplos sites de consórcios
- Modo headless para melhor performance
- Sistema de retry automático
- Timeout configurável

### Processamento

- Normalização de valores monetários
- Cálculos automáticos
- Tratamento de status
- Geração de códigos únicos

### Relatórios

- Formatação profissional em Excel
- Atualização automática
- Histórico de dados
- Unificação de relatórios

### Interface

- Design moderno e responsivo
- Logs em tempo real
- Estatísticas dinâmicas
- Controles intuitivos

## 🤝 Contribuindo

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Autores

- **NiraslabDEV** - _Desenvolvimento inicial_

## 🙏 Agradecimentos

- Font Awesome para os ícones
- Comunidade Python
- Contribuidores do projeto

# Sistema de Extração de Dados de Consórcios

## Requisitos do Sistema (Windows)

- Windows 10 ou superior
- Google Chrome instalado
- Mínimo 4GB de RAM
- Espaço em disco: ~500MB

## Instalação

1. **Instalar o Google Chrome**

   - Baixe e instale o Google Chrome do site oficial: https://www.google.com/chrome/

2. **Instalar os Executáveis**
   - Extraia todos os arquivos .exe para uma pasta de sua preferência
   - Crie uma pasta chamada "DADOS EXTRAIDOS" no mesmo diretório dos executáveis

## Estrutura de Arquivos

```
📁 Pasta Principal
├── 📁 DADOS EXTRAIDOS
├── CC_Cartas_Contempladas.exe
├── CT_Consorcio_Contemplado.exe
├── SP_Extrator.exe
├── VC_Extrator.exe
├── consolidador.exe
└── executar_extracao.exe
```

## Como Usar

1. **Execução Automática (Recomendado)**

   - Execute o arquivo `executar_extracao.exe`
   - Este executável irá rodar todos os scripts na ordem correta

2. **Execução Individual**
   - Execute cada .exe separadamente na seguinte ordem:
     1. CC_Cartas_Contempladas.exe
     2. CT_Consorcio_Contemplado.exe
     3. SP_Extrator.exe
     4. VC_Extrator.exe
     5. consolidador.exe

## Solução de Problemas

1. **Antivírus bloqueando os executáveis**

   - Adicione uma exceção no seu antivírus para a pasta dos executáveis
   - Ou desative temporariamente o antivírus durante a execução

2. **Erro ao iniciar o Chrome**

   - Verifique se o Google Chrome está instalado corretamente
   - Tente reinstalar o Google Chrome

3. **Erro de permissão**
   - Execute os executáveis como administrador
   - Clique com o botão direito -> Executar como administrador

## Suporte

Em caso de problemas, verifique:

1. Se todos os requisitos do sistema estão atendidos
2. Se o Google Chrome está instalado e atualizado
3. Se a pasta "DADOS EXTRAIDOS" existe no mesmo diretório dos executáveis
