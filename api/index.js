const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const fs = require("fs");
const app = express();

// Função auxiliar para formatar moeda
const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Função para ler dados dos arquivos JSON
const lerDados = (arquivo) => {
  try {
    const dados = fs.readFileSync(path.join(__dirname, "../data", arquivo));
    return JSON.parse(dados);
  } catch (erro) {
    console.error(`Erro ao ler arquivo ${arquivo}:`, erro);
    return { cartas: [] };
  }
};

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
  const dadosImoveis = lerDados("imoveis.json");
  const dadosVeiculos = lerDados("veiculos.json");
  res.render("index", {
    cartas: [...dadosVeiculos.cartas, ...dadosImoveis.cartas],
    formatCurrency,
  });
});

router.get("/imoveis", (req, res) => {
  const dados = lerDados("imoveis.json");
  res.render("imoveis", {
    cartas: dados.cartas,
    formatCurrency,
  });
});

router.get("/veiculos", (req, res) => {
  const dados = lerDados("veiculos.json");
  res.render("veiculos", {
    cartas: dados.cartas,
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
