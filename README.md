# Sonhos à Vista - Site de Consórcios Contemplados

Este é o repositório do site Sonhos à Vista, uma plataforma para venda de consórcios contemplados de imóveis e veículos.

## Tecnologias Utilizadas

- Node.js
- Express
- EJS (Embedded JavaScript Templates)
- Bootstrap 5
- jQuery
- Vercel Analytics

## Características

- Páginas responsivas para imóveis e veículos
- Carrossel de imagens
- Seções de FAQ
- Design moderno e atraente
- Integração com WhatsApp para contato
- Analytics para acompanhamento de visitantes

## Como Implantar na Vercel e Ativar o Analytics

### 1. Implantação na Vercel

1. Certifique-se de ter uma conta na [Vercel](https://vercel.com/)
2. Conecte seu repositório GitHub à Vercel
3. Clique em "Import" para importar o projeto
4. Mantenha as configurações padrão e clique em "Deploy"

### 2. Ativação do Analytics

O Vercel Analytics já está configurado neste projeto. Uma vez que o site esteja implantado na Vercel:

1. Acesse o dashboard do seu projeto na Vercel
2. Navegue até a aba "Analytics"
3. Clique em "Enable Analytics"
4. O rastreamento de visitantes começará automaticamente

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
node app.js
```

Acesse `http://localhost:3000` para ver o site em funcionamento.

## Estrutura do Projeto

- `app.js` - Arquivo principal do servidor Express
- `views/` - Templates EJS
  - `layouts/` - Layout principal
  - `partials/` - Componentes reutilizáveis
  - `index.ejs` - Página inicial
  - `imoveis.ejs` - Página de imóveis
  - `veiculos.ejs` - Página de veículos
- `public/` e `static/` - Arquivos estáticos (CSS, JS, imagens)
- `data/` - Dados dos consórcios em formato Excel

## Manutenção

Para atualizar os consórcios disponíveis, substitua o arquivo Excel na pasta `data/` mantendo o formato compatível com o existente.

---

© 2024 Sonhos à Vista - Todos os direitos reservados
