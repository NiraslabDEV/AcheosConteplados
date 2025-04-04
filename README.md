# Consórcios Premium

Sistema web para gerenciamento e exibição de cartas de consórcio contempladas.

## 🚀 Tecnologias

- Node.js
- Express
- EJS
- JavaScript
- CSS3
- HTML5

## 📋 Pré-requisitos

- Node.js 14.x ou superior
- NPM ou Yarn

## 🔧 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/NiraslabDEV/consorcios-balsa.git
cd consorcios-balsa
```

2. Instale as dependências:

```bash
npm install
```

3. Inicie o servidor:

```bash
npm run dev
```

O sistema estará disponível em `http://localhost:3000`

## 📦 Estrutura do Projeto

```
├── app.js              # Arquivo principal do servidor Express
├── data/              # Arquivos Excel com os dados das cartas
├── static/            # Arquivos estáticos (CSS, JS, imagens)
├── views/             # Templates EJS
│   ├── layouts/      # Layout principal
│   ├── index.ejs     # Página inicial
│   ├── imoveis.ejs   # Página de imóveis
│   └── veiculos.ejs  # Página de veículos
└── package.json
```

## 🛠️ Funcionalidades

- Exibição de cartas de consórcio para imóveis e veículos
- Formulário de contato integrado com WhatsApp
- Layout responsivo
- Carregamento dinâmico de dados via Excel

## ✒️ Autor

- **Gabriel Balsarin** - [NiraslabDEV](https://github.com/NiraslabDEV)

## 📄 Licença

Este projeto está sob a licença MIT - veja o arquivo [LICENSE.md](LICENSE.md) para detalhes
