const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const app = express();

// Função auxiliar para formatar moeda
const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Dados mockados para exemplo
const cartasVeiculos = [
  {
    Consórcio: "Veículos Leves",
    "Valor da carta": 50000,
    Entrada: 25000,
    Parcela: 980,
    Prazo: "48x",
    Administradora: "Porto Seguro",
  },
  {
    Consórcio: "Veículos Pesados",
    "Valor da carta": 150000,
    Entrada: 45000,
    Parcela: 2200,
    Prazo: "60x",
    Administradora: "Volkswagen",
  },
];

const cartasImoveis = [
  {
    Consórcio: "Imóvel Residencial",
    "Valor da carta": 200000,
    Entrada: 60000,
    Parcela: 1800,
    Prazo: "120x",
    Administradora: "Caixa",
  },
  {
    Consórcio: "Imóvel Comercial",
    "Valor da carta": 500000,
    Entrada: 100000,
    Parcela: 4500,
    Prazo: "180x",
    Administradora: "Bradesco",
  },
];

// Configuração do EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Arquivos estáticos
app.use("/static", express.static(path.join(__dirname, "../static")));

// Middleware para processar dados do formulário
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Rotas
const router = express.Router();

router.get("/", (req, res) => {
  res.render("index", {
    cartas: [...cartasVeiculos, ...cartasImoveis],
    formatCurrency,
  });
});

router.get("/imoveis", (req, res) => {
  res.render("imoveis", {
    cartas: cartasImoveis,
    formatCurrency,
  });
});

router.get("/veiculos", (req, res) => {
  res.render("veiculos", {
    cartas: cartasVeiculos,
    formatCurrency,
  });
});

app.use(router);

// Handler para erros 404
app.use((req, res) => {
  res.status(404).send("Página não encontrada");
});

// Handler para erros gerais
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Algo deu errado!");
});

// Exporta a função handler para o Vercel
module.exports = app;
