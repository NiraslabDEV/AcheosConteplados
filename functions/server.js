const express = require("express");
const serverless = require("serverless-http");
const path = require("path");
const app = express();

// Configurações do Express
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../public/views"));
app.use(express.static(path.join(__dirname, "../public/static")));

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

// Exportar handler para o Netlify
module.exports.handler = serverless(app);
