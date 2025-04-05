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

// Configuração dos diretórios estáticos
app.use("/static", express.static(path.join(__dirname, "static")));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "static")));

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error("Erro no servidor:", err);
  res.status(500).send("Erro interno do servidor");
});

// Função para formatar moeda
function formatCurrency(value) {
  if (!value || isNaN(value)) return "R$ 0,00";

  // Se o valor for uma string, tenta converter para número
  if (typeof value === "string") {
    // Remove R$, pontos e substitui vírgula por ponto
    value = value
      .replace(/R\$\s*/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .trim();
    value = parseFloat(value);
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Função para preparar os dados das cartas
function prepararDadosCartas(cartas) {
  return cartas.map((carta) => {
    // Trata o valor da carta
    if (carta["Valor da carta"]) {
      const valorCarta = carta["Valor da carta"]
        .toString()
        .replace(/R\$\s*/g, "")
        .replace(/\./g, "")
        .replace(/,/g, ".")
        .trim();
      carta["Valor da carta"] = parseFloat(valorCarta) || 0;
    }

    // Trata o valor da entrada
    if (carta["Entrada"]) {
      const valorEntrada = carta["Entrada"]
        .toString()
        .replace(/R\$\s*/g, "")
        .replace(/\./g, "")
        .replace(/,/g, ".")
        .trim();
      carta["Entrada"] = parseFloat(valorEntrada) || 0;
    }

    return carta;
  });
}

async function getLatestExcel() {
  try {
    // Caminho direto para o arquivo Excel na pasta data
    const excelPath = path.join(
      __dirname,
      "data",
      "consolidado_20250403_1640.xlsx"
    );

    // Verifica se o arquivo existe
    try {
      await fs.access(excelPath);
      console.log("Arquivo Excel encontrado:", excelPath);
      return excelPath;
    } catch (error) {
      console.error("Erro ao acessar arquivo Excel:", error);
      return null;
    }
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
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log("Dados brutos do Excel:", rawData);

    if (!rawData || rawData.length === 0) {
      console.log("Arquivo Excel vazio, usando dados de exemplo");
      return getDadosExemplo();
    }

    // Processar e formatar os dados
    const processedData = rawData.map((row) => {
      // Garantir que os campos numéricos sejam tratados corretamente
      const valorCarta =
        row["Valor da carta"] || row["Valor"] || row["valor"] || "0";
      const entrada = row["Entrada"] || row["entrada"] || "0";
      const parcelas =
        row["Total de Parcelas"] || row["Parcelas"] || row["parcelas"] || "0";
      const fluxo =
        row["Fluxo de Pagamento"] ||
        row["Parcelas Mensais"] ||
        row["parcelas_mensais"] ||
        "";
      const tipo = row["Tipo"] || row["tipo"] || "Imóveis";
      const consorcio =
        row["Consórcio"] ||
        row["Administradora"] ||
        row["administradora"] ||
        "Não informado";

      return {
        Tipo: tipo,
        Consórcio: consorcio,
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
        "Total de Parcelas": parcelas.toString(),
        "Fluxo de Pagamento": fluxo,
      };
    });

    console.log("Dados processados:", processedData);

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
    const dados = await loadData();
    const cartasImoveis = dados.filter(
      (carta) =>
        carta.Tipo?.toLowerCase() === "imóveis" ||
        carta.Tipo?.toLowerCase() === "imovel" ||
        carta.Tipo?.toLowerCase() === "imóvel"
    );

    const cartasTratadas = prepararDadosCartas(cartasImoveis);

    res.render("imoveis", {
      cartas: cartasTratadas,
      colunas: [
        "Consórcio",
        "Valor da carta",
        "Entrada",
        "Total de Parcelas",
        "Fluxo de Pagamento",
      ],
      formatCurrency,
    });
  } catch (error) {
    console.error("Erro ao carregar dados de imóveis:", error);
    res.render("imoveis", {
      cartas: [],
      colunas: [
        "Consórcio",
        "Valor da carta",
        "Entrada",
        "Total de Parcelas",
        "Fluxo de Pagamento",
      ],
      formatCurrency,
    });
  }
});

app.get("/veiculos", async (req, res) => {
  try {
    const dados = await loadData();
    const cartasVeiculos = dados.filter(
      (carta) =>
        carta.Tipo?.toLowerCase() === "veículos" ||
        carta.Tipo?.toLowerCase() === "veiculo" ||
        carta.Tipo?.toLowerCase() === "veículo"
    );

    const cartasTratadas = prepararDadosCartas(cartasVeiculos);

    res.render("veiculos", {
      cartas: cartasTratadas,
      colunas: [
        "Consórcio",
        "Valor da carta",
        "Entrada",
        "Total de Parcelas",
        "Fluxo de Pagamento",
      ],
      formatCurrency,
    });
  } catch (error) {
    console.error("Erro ao carregar dados de veículos:", error);
    res.render("veiculos", {
      cartas: [],
      colunas: [
        "Consórcio",
        "Valor da carta",
        "Entrada",
        "Total de Parcelas",
        "Fluxo de Pagamento",
      ],
      formatCurrency,
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
