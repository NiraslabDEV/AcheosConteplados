const express = require("express");
const path = require("path");
const app = express();

// Configuração do EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Arquivos estáticos
app.use("/static", express.static(path.join(__dirname, "static")));

// Middleware para processar dados do formulário
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Rotas
app.get("/", (req, res) => {
  try {
    res.render("index");
  } catch (error) {
    console.error("Erro ao renderizar index:", error);
    res.status(500).send("Erro interno do servidor");
  }
});

app.get("/imoveis", (req, res) => {
  try {
    res.render("imoveis");
  } catch (error) {
    console.error("Erro ao renderizar imoveis:", error);
    res.status(500).send("Erro interno do servidor");
  }
});

app.get("/veiculos", (req, res) => {
  try {
    res.render("veiculos");
  } catch (error) {
    console.error("Erro ao renderizar veiculos:", error);
    res.status(500).send("Erro interno do servidor");
  }
});

// Handler para erros 404
app.use((req, res) => {
  res.status(404).render("404");
});

// Handler para erros gerais
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Algo deu errado!");
});

// Vercel requer que exportemos o app
module.exports = app;

// Se estivermos rodando localmente
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
}
