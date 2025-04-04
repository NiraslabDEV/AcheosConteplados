const express = require("express");
const path = require("path");
const app = express();

// Configuração do EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Arquivos estáticos
app.use("/static", express.static(path.join(__dirname, "static")));

// Rotas
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/imoveis", (req, res) => {
  res.render("imoveis");
});

app.get("/veiculos", (req, res) => {
  res.render("veiculos");
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
