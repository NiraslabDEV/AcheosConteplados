const express = require("express");
const path = require("path");
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

// Configuração do EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Arquivos estáticos
app.use(express.static(path.join(__dirname, "..")));

// Middleware para processar dados do formulário
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Rotas
const router = express.Router();

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/imoveis", (req, res) => {
  res.render("imoveis");
});

router.get("/veiculos", (req, res) => {
  res.render("veiculos", {
    cartas: cartasVeiculos,
    formatCurrency: formatCurrency,
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
