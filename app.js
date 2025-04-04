const express = require("express");
const path = require("path");
const XLSX = require("xlsx");
const { glob } = require("glob");
const fs = require("fs").promises;
const expressLayouts = require("express-ejs-layouts");

const app = express();
const port = 3000;

// Configurações do Express
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");
app.use(express.static("public"));
app.use(express.static("static"));

// Funções auxiliares
function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

async function getLatestExcel() {
  try {
    const files = await glob("data/consolidado_*.xlsx");
    if (!files.length) return null;

    const stats = await Promise.all(
      files.map(async (file) => ({
        file,
        mtime: (await fs.stat(file)).mtime,
      }))
    );

    const latestFile = stats.reduce((latest, current) =>
      current.mtime > latest.mtime ? current : latest
    );

    return latestFile.file;
  } catch (error) {
    console.error("Erro ao buscar arquivo Excel:", error);
    return null;
  }
}

function prepareWhatsappMessage(row) {
  const message = `Olá! Vi no site uma carta de consórcio contemplado com as seguintes características:
📍 Administradora: ${row.Consórcio}
💰 Valor: ${formatCurrency(parseFloat(row["Valor da carta"].replace(",", ".")))}
💵 Entrada: ${formatCurrency(parseFloat(row.Entrada.replace(",", ".")))}
📋 Parcelas: ${row["Total de Parcelas"]}`;

  return encodeURIComponent(message);
}

async function loadData() {
  try {
    const excelFile = await getLatestExcel();
    if (!excelFile) {
      console.log("Nenhum arquivo Excel encontrado");
      return [];
    }

    console.log("Arquivo Excel encontrado:", excelFile);
    const workbook = XLSX.readFile(excelFile);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log("Dados carregados:", data);

    return data.map((row) => ({
      ...row,
      whatsapp_msg: prepareWhatsappMessage(row),
    }));
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    return [];
  }
}

// Rotas
app.get("/", (req, res) => {
  res.render("index", {
    title: "Consórcios Premium - Realize seu sonho agora!",
  });
});

app.get("/imoveis", async (req, res) => {
  const data = await loadData();
  const imoveis = data.filter((row) => row.Tipo === "Imóveis");
  console.log("Dados de imóveis:", imoveis);
  res.render("imoveis", {
    title: "Consórcios Premium - Imóveis",
    cartas: imoveis,
    formatCurrency: (value) =>
      formatCurrency(parseFloat(value.replace(",", "."))),
  });
});

app.get("/veiculos", async (req, res) => {
  const data = await loadData();
  const veiculos = data.filter((row) => row.Tipo === "Veículos");
  console.log("Dados de veículos:", veiculos);
  res.render("veiculos", {
    title: "Consórcios Premium - Veículos",
    cartas: veiculos,
    formatCurrency: (value) =>
      formatCurrency(parseFloat(value.replace(",", "."))),
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
