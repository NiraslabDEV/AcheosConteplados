const express = require("express");
const serverless = require("serverless-http");
const path = require("path");
const app = express();

// Configurações do Express
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../../views"));
app.use(express.static(path.join(__dirname, "../../static")));

// Importar rotas
const indexRouter = require("../../routes/index");
const imoveisRouter = require("../../routes/imoveis");
const veiculosRouter = require("../../routes/veiculos");

// Usar rotas
app.use("/", indexRouter);
app.use("/imoveis", imoveisRouter);
app.use("/veiculos", veiculosRouter);

// Exportar handler para o Netlify
module.exports.handler = serverless(app);
