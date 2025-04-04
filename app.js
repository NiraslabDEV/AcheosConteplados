const express = require("express");
const path = require("path");
const XLSX = require("xlsx");
const { glob } = require("glob");
const fs = require("fs").promises;
const expressLayouts = require("express-ejs-layouts");

const app = express();
const port = process.env.PORT || 3000;

// Configurações do Express
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "static")));
app.use("/static", express.static(path.join(__dirname, "static")));

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error("Erro no servidor:", err);
  res.status(500).send("Erro interno do servidor");
});

// Funções auxiliares
function formatCurrency(value) {
  try {
    if (!value || isNaN(parseFloat(value.toString().replace(",", ".")))) {
      return "R$ 0,00";
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(value.toString().replace(",", ".")));
  } catch (error) {
    console.error("Erro ao formatar moeda:", error);
    return "R$ 0,00";
  }
}

async function getLatestExcel() {
  try {
    // Na Vercel, os arquivos podem não estar disponíveis
    // Retornar dados de exemplo se estivermos em produção
    if (process.env.NODE_ENV === "production") {
      console.log("Ambiente de produção: usando dados de exemplo");
      return null;
    }

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
  try {
    if (!row) return "";

    const message = `Olá! Vi no site uma carta de consórcio contemplado com as seguintes características:
📍 Administradora: ${row.Consórcio || "Não informado"}
💰 Valor: ${formatCurrency(row["Valor da carta"] || "0")}
💵 Entrada: ${formatCurrency(row.Entrada || "0")}
📋 Parcelas: ${row["Total de Parcelas"] || "Não informado"}`;

    return encodeURIComponent(message);
  } catch (error) {
    console.error("Erro ao preparar mensagem WhatsApp:", error);
    return "";
  }
}

async function loadData() {
  try {
    const excelFile = await getLatestExcel();
    if (!excelFile) {
      console.log("Nenhum arquivo Excel encontrado ou ambiente de produção");
      // Dados de exemplo para produção
      return getDadosExemplo();
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
    return getDadosExemplo();
  }
}

// Função para gerar dados de exemplo quando não há arquivo Excel
function getDadosExemplo() {
  return [
    {
      Tipo: "Imóveis",
      Consórcio: "Consórcio Exemplo",
      "Valor da carta": "150000",
      "Valor da carta_num": 150000,
      Entrada: "15000",
      Entrada_num: 15000,
      "Total de Parcelas": "120",
      "Fluxo de Pagamento": "120 x R$ 1.200,00",
      whatsapp_msg: prepareWhatsappMessage({
        Consórcio: "Consórcio Exemplo",
        "Valor da carta": "150000",
        Entrada: "15000",
        "Total de Parcelas": "120",
      }),
    },
    {
      Tipo: "Veículos",
      Consórcio: "Consórcio Exemplo",
      "Valor da carta": "50000",
      "Valor da carta_num": 50000,
      Entrada: "5000",
      Entrada_num: 5000,
      "Total de Parcelas": "60",
      "Fluxo de Pagamento": "60 x R$ 850,00",
      whatsapp_msg: prepareWhatsappMessage({
        Consórcio: "Consórcio Exemplo",
        "Valor da carta": "50000",
        Entrada: "5000",
        "Total de Parcelas": "60",
      }),
    },
  ];
}

// Rotas
app.get("/", (req, res) => {
  try {
    res.render("index", {
      title: "Sonhos à Vista - Realize seu sonho agora!",
      colunas: [],
    });
  } catch (error) {
    console.error("Erro na rota /:", error);
    res.status(500).send("Erro ao carregar a página inicial");
  }
});

app.get("/imoveis", async (req, res) => {
  try {
    const data = await loadData();
    const imoveis = data.filter((row) => row.Tipo === "Imóveis");
    console.log("Dados de imóveis:", imoveis);
    res.render("imoveis", {
      title: "Sonhos à Vista - Imóveis",
      cartas: imoveis,
      colunas:
        imoveis.length > 0
          ? Object.keys(imoveis[0]).filter(
              (col) =>
                col !== "whatsapp_msg" &&
                col !== "Tipo" &&
                !col.endsWith("_num")
            )
          : [],
      formatCurrency: formatCurrency,
    });
  } catch (error) {
    console.error("Erro na rota /imoveis:", error);
    res.render("imoveis", {
      title: "Sonhos à Vista - Imóveis",
      cartas: [],
      colunas: [],
      formatCurrency: formatCurrency,
    });
  }
});

app.get("/veiculos", async (req, res) => {
  try {
    const data = await loadData();
    const veiculos = data.filter((row) => row.Tipo === "Veículos");
    console.log("Dados de veículos:", veiculos);
    res.render("veiculos", {
      title: "Sonhos à Vista - Veículos",
      cartas: veiculos,
      colunas:
        veiculos.length > 0
          ? Object.keys(veiculos[0]).filter(
              (col) =>
                col !== "whatsapp_msg" &&
                col !== "Tipo" &&
                !col.endsWith("_num")
            )
          : [],
      formatCurrency: formatCurrency,
    });
  } catch (error) {
    console.error("Erro na rota /veiculos:", error);
    res.render("veiculos", {
      title: "Sonhos à Vista - Veículos",
      cartas: [],
      colunas: [],
      formatCurrency: formatCurrency,
    });
  }
});

// Rota para manipular erros 404
app.use((req, res) => {
  res.status(404).render("index", {
    title: "Página não encontrada - Sonhos à Vista",
    colunas: [],
  });
});

// Iniciar servidor
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
}

module.exports = app;
