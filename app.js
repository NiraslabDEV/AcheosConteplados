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
    // Procurar em diferentes diretórios possíveis
    const possiblePaths = [
      "data/consolidado_*.xlsx",
      "scraper lista de excel consorcio a ser carregados todos os dias no sitew e atualizado/DADOS EXTRAIDOS/consolidado_*.xlsx",
      "scraper lista de excel consorcio a ser carregados todos os dias no sitew e atualizado/DADOS EXTRAIDOS/*.xlsx",
    ];

    for (const pattern of possiblePaths) {
      const files = await glob(pattern);
      if (files.length > 0) {
        const stats = await Promise.all(
          files.map(async (file) => ({
            file,
            mtime: (await fs.stat(file)).mtime,
          }))
        );

        const latestFile = stats.reduce((latest, current) =>
          current.mtime > latest.mtime ? current : latest
        );

        console.log("Arquivo Excel encontrado:", latestFile.file);
        return latestFile.file;
      }
    }

    console.log("Nenhum arquivo Excel encontrado nos diretórios padrão");
    return null;
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
      console.log("Nenhum arquivo Excel encontrado, usando dados de exemplo");
      return getDadosExemplo();
    }

    console.log("Carregando dados do arquivo:", excelFile);
    const workbook = XLSX.readFile(excelFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      console.log("Arquivo Excel vazio, usando dados de exemplo");
      return getDadosExemplo();
    }

    console.log(
      `Dados carregados com sucesso: ${data.length} registros encontrados`
    );

    // Processar e formatar os dados
    const processedData = data.map((row) => {
      // Garantir que os campos numéricos sejam tratados corretamente
      const valorCarta = row["Valor da carta"] || row["Valor"] || "0";
      const entrada = row["Entrada"] || "0";

      return {
        Tipo: row["Tipo"] || "Imóveis", // Valor padrão se não especificado
        Consórcio: row["Consórcio"] || row["Administradora"] || "Não informado",
        "Valor da carta": valorCarta.toString(),
        "Valor da carta_num": parseFloat(
          valorCarta
            .toString()
            .replace(/[^\d,.-]/g, "")
            .replace(",", ".")
        ),
        Entrada: entrada.toString(),
        Entrada_num: parseFloat(
          entrada
            .toString()
            .replace(/[^\d,.-]/g, "")
            .replace(",", ".")
        ),
        "Total de Parcelas":
          row["Total de Parcelas"]?.toString() ||
          row["Parcelas"]?.toString() ||
          "0",
        "Fluxo de Pagamento":
          row["Fluxo de Pagamento"] ||
          row["Parcelas Mensais"] ||
          "Não informado",
      };
    });

    // Adicionar mensagem de WhatsApp para cada registro
    return processedData.map((row) => ({
      ...row,
      whatsapp_msg: prepareWhatsappMessage(row),
    }));
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    console.error("Stack trace:", error.stack);
    return getDadosExemplo();
  }
}

// Função para gerar dados de exemplo quando não há arquivo Excel
function getDadosExemplo() {
  return [
    {
      Tipo: "Imóveis",
      Consórcio: "Consórcio Premium",
      "Valor da carta": "250000",
      "Valor da carta_num": 250000,
      Entrada: "25000",
      Entrada_num: 25000,
      "Total de Parcelas": "180",
      "Fluxo de Pagamento": "180 x R$ 1.500,00",
      whatsapp_msg: prepareWhatsappMessage({
        Consórcio: "Consórcio Premium",
        "Valor da carta": "250000",
        Entrada: "25000",
        "Total de Parcelas": "180",
      }),
    },
    {
      Tipo: "Imóveis",
      Consórcio: "Consórcio Fácil",
      "Valor da carta": "150000",
      "Valor da carta_num": 150000,
      Entrada: "15000",
      Entrada_num: 15000,
      "Total de Parcelas": "120",
      "Fluxo de Pagamento": "120 x R$ 1.200,00",
      whatsapp_msg: prepareWhatsappMessage({
        Consórcio: "Consórcio Fácil",
        "Valor da carta": "150000",
        Entrada: "15000",
        "Total de Parcelas": "120",
      }),
    },
    {
      Tipo: "Veículos",
      Consórcio: "Consórcio Auto Premium",
      "Valor da carta": "80000",
      "Valor da carta_num": 80000,
      Entrada: "8000",
      Entrada_num: 8000,
      "Total de Parcelas": "60",
      "Fluxo de Pagamento": "60 x R$ 1.450,00",
      whatsapp_msg: prepareWhatsappMessage({
        Consórcio: "Consórcio Auto Premium",
        "Valor da carta": "80000",
        Entrada: "8000",
        "Total de Parcelas": "60",
      }),
    },
    {
      Tipo: "Veículos",
      Consórcio: "Consórcio Auto Fácil",
      "Valor da carta": "50000",
      "Valor da carta_num": 50000,
      Entrada: "5000",
      Entrada_num: 5000,
      "Total de Parcelas": "48",
      "Fluxo de Pagamento": "48 x R$ 1.150,00",
      whatsapp_msg: prepareWhatsappMessage({
        Consórcio: "Consórcio Auto Fácil",
        "Valor da carta": "50000",
        Entrada: "5000",
        "Total de Parcelas": "48",
      }),
    },
  ];
}

// Rotas
app.get("/", (req, res) => {
  try {
    const data = getDadosExemplo();
    res.render("index", {
      title: "Sonhos à Vista - Realize seu sonho agora!",
      cartas: data,
      colunas:
        data.length > 0
          ? Object.keys(data[0]).filter(
              (col) =>
                col !== "whatsapp_msg" &&
                col !== "Tipo" &&
                !col.endsWith("_num")
            )
          : [],
      formatCurrency,
    });
  } catch (error) {
    console.error("Erro na rota /:", error);
    res.status(500).send("Erro ao carregar a página inicial");
  }
});

app.get("/imoveis", async (req, res) => {
  try {
    const data = await loadData();
    console.log("Dados carregados:", data);

    const imoveis = data.filter((row) => row.Tipo === "Imóveis");
    console.log("Dados de imóveis filtrados:", imoveis);

    const colunas =
      imoveis.length > 0
        ? Object.keys(imoveis[0]).filter(
            (col) =>
              col !== "whatsapp_msg" && col !== "Tipo" && !col.endsWith("_num")
          )
        : [];

    console.log("Colunas para exibição:", colunas);

    res.render("imoveis", {
      title: "Sonhos à Vista - Imóveis",
      cartas: imoveis,
      colunas: colunas,
      formatCurrency: formatCurrency,
    });
  } catch (error) {
    console.error("Erro na rota /imoveis:", error);
    const dadosExemplo = getDadosExemplo();
    const imoveisExemplo = dadosExemplo.filter((row) => row.Tipo === "Imóveis");
    const colunasExemplo =
      imoveisExemplo.length > 0
        ? Object.keys(imoveisExemplo[0]).filter(
            (col) =>
              col !== "whatsapp_msg" && col !== "Tipo" && !col.endsWith("_num")
          )
        : [];

    res.render("imoveis", {
      title: "Sonhos à Vista - Imóveis",
      cartas: imoveisExemplo,
      colunas: colunasExemplo,
      formatCurrency: formatCurrency,
    });
  }
});

app.get("/veiculos", async (req, res) => {
  try {
    const data = await loadData();
    console.log("Dados carregados:", data);

    const veiculos = data.filter((row) => row.Tipo === "Veículos");
    console.log("Dados de veículos filtrados:", veiculos);

    const colunas =
      veiculos.length > 0
        ? Object.keys(veiculos[0]).filter(
            (col) =>
              col !== "whatsapp_msg" && col !== "Tipo" && !col.endsWith("_num")
          )
        : [];

    console.log("Colunas para exibição:", colunas);

    res.render("veiculos", {
      title: "Sonhos à Vista - Veículos",
      cartas: veiculos,
      colunas: colunas,
      formatCurrency: formatCurrency,
    });
  } catch (error) {
    console.error("Erro na rota /veiculos:", error);
    const dadosExemplo = getDadosExemplo();
    const veiculosExemplo = dadosExemplo.filter(
      (row) => row.Tipo === "Veículos"
    );
    const colunasExemplo =
      veiculosExemplo.length > 0
        ? Object.keys(veiculosExemplo[0]).filter(
            (col) =>
              col !== "whatsapp_msg" && col !== "Tipo" && !col.endsWith("_num")
          )
        : [];

    res.render("veiculos", {
      title: "Sonhos à Vista - Veículos",
      cartas: veiculosExemplo,
      colunas: colunasExemplo,
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
