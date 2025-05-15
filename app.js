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

// Funções auxiliares
function formatCurrency(value) {
  try {
    if (value === null || value === undefined || isNaN(value)) {
      console.error("Valor inválido para formatação de moeda:", value);
      return "R$ 0,00";
    }

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  } catch (error) {
    console.error("Erro ao formatar moeda:", error);
    return "R$ 0,00";
  }
}

// Função para formatar razão de investimento
function formatRatio(value) {
  try {
    if (value === null || value === undefined || isNaN(value)) {
      console.error("Valor inválido para formatação de razão:", value);
      return "0.00";
    }

    return parseFloat(value).toFixed(2);
  } catch (error) {
    console.error("Erro ao formatar razão:", error);
    return "0.00";
  }
}

// Função para formatar percentual
function formatPercentage(value) {
  try {
    if (value === null || value === undefined || isNaN(value)) {
      console.error("Valor inválido para formatação de percentual:", value);
      return "0.0%";
    }

    return parseFloat(value).toFixed(1) + "%";
  } catch (error) {
    console.error("Erro ao formatar percentual:", error);
    return "0.0%";
  }
}

async function getLatestExcel() {
  try {
    const dataDir = path.join(__dirname, "data");

    // Lista todos os arquivos que começam com 'consolidado' e terminam com '.xlsx'
    const files = await glob("consolidado*.xlsx", {
      cwd: dataDir,
      absolute: true,
    });

    if (files.length === 0) {
      console.log("Nenhum arquivo consolidado*.xlsx encontrado na pasta data");
      return null;
    }

    // Ordena os arquivos por data de modificação (mais recente primeiro)
    const sortedFiles = await Promise.all(
      files.map(async (file) => {
        const stats = await fs.stat(file);
        return { file, mtime: stats.mtime };
      })
    );
    sortedFiles.sort((a, b) => b.mtime - a.mtime);

    // Retorna o caminho do arquivo mais recente
    const latestFile = sortedFiles[0].file;
    console.log("Arquivo Excel mais recente encontrado:", latestFile);
    return latestFile;
  } catch (error) {
    console.error("Erro ao buscar arquivo Excel:", error);
    return null;
  }
}

function prepareWhatsappMessage(row) {
  try {
    if (!row) return "";

    const message = `Olá! Vi no site uma carta de consórcio contemplado com as seguintes características:
🔢 Código: ${row.Codigo || row.CODIGO || row.código || "Não informado"}
📍 Administradora: ${row.Consórcio || "Não informado"}
💰 Valor: ${formatCurrency(row["Valor da carta"] || "0")}
💵 Entrada: ${formatCurrency(row.Entrada || "0")}
📋 Parcelas: ${row["Total de Parcelas"] || "Não informado"}
🔄 Status: ${row.Status || "Não informado"}`;

    return encodeURIComponent(message);
  } catch (error) {
    console.error("Erro ao preparar mensagem WhatsApp:", error);
    return "";
  }
}

async function loadData() {
  try {
    const excelPath = await getLatestExcel();
    console.log("Carregando dados do arquivo:", excelPath);

    if (!excelPath) {
      console.log("Arquivo Excel não encontrado, usando dados de exemplo");
      return getDadosExemplo();
    }

    const workbook = XLSX.readFile(excelPath);
    console.log("Planilhas disponíveis:", workbook.SheetNames);

    // Use a primeira aba por padrão
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log("Dados brutos carregados:", JSON.stringify(rawData, null, 2));

    if (rawData.length === 0) {
      console.log("Nenhum dado encontrado no Excel, usando dados de exemplo");
      return getDadosExemplo();
    }

    // Processar os dados para garantir que todos os campos numéricos sejam tratados corretamente
    const processedData = rawData.map((row) => {
      const newRow = { ...row };

      // Tentar diferentes variações do nome das colunas
      const valorCartaField =
        row["Valor da carta"] !== undefined
          ? "Valor da carta"
          : row["Valor da Carta"] !== undefined
          ? "Valor da Carta"
          : "";

      const entradaField = row["Entrada"] !== undefined ? "Entrada" : "";

      const parcelasField =
        row["Total de Parcelas"] !== undefined
          ? "Total de Parcelas"
          : row["Total de parcelas"] !== undefined
          ? "Total de parcelas"
          : "";

      const fluxoField =
        row["Fluxo de Pagamento"] !== undefined
          ? "Fluxo de Pagamento"
          : row["Fluxo de pagamento"] !== undefined
          ? "Fluxo de pagamento"
          : "";

      const razaoField =
        row["Razão Investimento"] !== undefined
          ? "Razão Investimento"
          : row["Razao Investimento"] !== undefined
          ? "Razao Investimento"
          : "";

      // Garantir que temos o campo Tipo
      if (!newRow.Tipo) {
        newRow.Tipo = row.tipo || "";
      }

      // Processar o valor da carta
      if (valorCartaField) {
        newRow["Valor da carta"] = row[valorCartaField];
        try {
          // Nova versão corrigida para tratar valores monetários corretamente
          const valorStr = String(row[valorCartaField]).trim();
          if (valorStr.match(/^\d+(\.\d{3})+(,\d+)?$/)) {
            // Formato brasileiro: 12.345,67
            newRow["Valor da carta_num"] = parseFloat(
              valorStr.replace(/\./g, "").replace(/,/g, ".")
            );
          } else if (valorStr.match(/^\d+(,\d{3})+(.\d+)?$/)) {
            // Formato internacional: 12,345.67
            newRow["Valor da carta_num"] = parseFloat(
              valorStr.replace(/,/g, "")
            );
          } else {
            // Formato simples sem separadores de milhares
            newRow["Valor da carta_num"] = parseFloat(
              valorStr.replace(/,/g, ".")
            );
          }

          console.log(
            `Valor da carta processado: Original=${row[valorCartaField]}, Processado=${newRow["Valor da carta_num"]}`
          );
        } catch (e) {
          console.error("Erro ao processar valor da carta:", e);
          newRow["Valor da carta_num"] = 0;
        }
      } else {
        newRow["Valor da carta"] = "";
        newRow["Valor da carta_num"] = 0;
      }

      // Processar o valor da entrada
      if (entradaField) {
        newRow["Entrada"] = row[entradaField];
        try {
          // Nova versão corrigida para tratar valores monetários corretamente
          const valorStr = String(row[entradaField]).trim();
          if (valorStr.match(/^\d+(\.\d{3})+(,\d+)?$/)) {
            // Formato brasileiro: 12.345,67
            newRow["Entrada_num"] = parseFloat(
              valorStr.replace(/\./g, "").replace(/,/g, ".")
            );
          } else if (valorStr.match(/^\d+(,\d{3})+(.\d+)?$/)) {
            // Formato internacional: 12,345.67
            newRow["Entrada_num"] = parseFloat(valorStr.replace(/,/g, ""));
          } else {
            // Formato simples sem separadores de milhares
            newRow["Entrada_num"] = parseFloat(valorStr.replace(/,/g, "."));
          }

          console.log(
            `Entrada processada: Original=${row[entradaField]}, Processado=${newRow["Entrada_num"]}`
          );
        } catch (e) {
          console.error("Erro ao processar valor da entrada:", e);
          newRow["Entrada_num"] = 0;
        }
      } else {
        newRow["Entrada"] = "";
        newRow["Entrada_num"] = 0;
      }

      // Incluir campo Razão Investimento se existir
      if (razaoField) {
        newRow["Razão Investimento"] = row[razaoField];
      }

      // Processar campos adicionais
      if (fluxoField) {
        newRow["Fluxo de Pagamento"] = row[fluxoField];
      }

      if (parcelasField) {
        newRow["Total de Parcelas"] = row[parcelasField];
      }

      // Verificar e incluir campo Status
      if (row.Status === undefined) {
        newRow.Status = "Disponível";
      } else {
        newRow.Status = row.Status;
      }

      // Adicionar mensagem do WhatsApp
      newRow.whatsapp_msg = prepareWhatsappMessage(newRow);

      return newRow;
    });

    // Validar dados processados
    console.log("Dados processados:", JSON.stringify(processedData, null, 2));
    return processedData;
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
      Codigo: "IM001",
      Tipo: "Imóveis",
      Consórcio: "Consórcio Premium",
      "Valor da carta": "250000",
      "Valor da carta_num": 250000,
      Entrada: "25000",
      Entrada_num: 25000,
      "Total de Parcelas": "180",
      "Fluxo de Pagamento": "180 x R$ 1.500,00",
      Status: "Disponível",
      "Razão Investimento": "10.00",
      whatsapp_msg: prepareWhatsappMessage({
        Codigo: "IM001",
        Consórcio: "Consórcio Premium",
        "Valor da carta": "250000",
        Entrada: "25000",
        "Total de Parcelas": "180",
        Status: "Disponível",
      }),
    },
    {
      Codigo: "IM002",
      Tipo: "Imóveis",
      Consórcio: "Consórcio Fácil",
      "Valor da carta": "150000",
      "Valor da carta_num": 150000,
      Entrada: "15000",
      Entrada_num: 15000,
      "Total de Parcelas": "120",
      "Fluxo de Pagamento": "120 x R$ 1.200,00",
      Status: "Indisponível",
      "Razão Investimento": "9.80",
      whatsapp_msg: prepareWhatsappMessage({
        Codigo: "IM002",
        Consórcio: "Consórcio Fácil",
        "Valor da carta": "150000",
        Entrada: "15000",
        "Total de Parcelas": "120",
        Status: "Indisponível",
      }),
    },
    {
      Codigo: "VE001",
      Tipo: "Veículos",
      Consórcio: "Consórcio Auto Premium",
      "Valor da carta": "80000",
      "Valor da carta_num": 80000,
      Entrada: "8000",
      Entrada_num: 8000,
      "Total de Parcelas": "60",
      "Fluxo de Pagamento": "60 x R$ 1.450,00",
      Status: "Disponível",
      "Razão Investimento": "5.12",
      whatsapp_msg: prepareWhatsappMessage({
        Codigo: "VE001",
        Consórcio: "Consórcio Auto Premium",
        "Valor da carta": "80000",
        Entrada: "8000",
        "Total de Parcelas": "60",
        Status: "Disponível",
      }),
    },
    {
      Codigo: "VE002",
      Tipo: "Veículos",
      Consórcio: "Consórcio Auto Fácil",
      "Valor da carta": "50000",
      "Valor da carta_num": 50000,
      Entrada: "5000",
      Entrada_num: 5000,
      "Total de Parcelas": "48",
      "Fluxo de Pagamento": "48 x R$ 1.150,00",
      Status: "Indisponível",
      "Razão Investimento": "4.82",
      whatsapp_msg: prepareWhatsappMessage({
        Codigo: "VE002",
        Consórcio: "Consórcio Auto Fácil",
        "Valor da carta": "50000",
        Entrada: "5000",
        "Total de Parcelas": "48",
        Status: "Indisponível",
      }),
    },
  ];
}

// Função para carregar as melhores oportunidades
async function loadBestOpportunities() {
  try {
    const excelPath = await getLatestExcel();
    console.log("Carregando melhores oportunidades do arquivo:", excelPath);

    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets["Melhores Oportunidades"];

    if (!sheet) {
      console.log("Aba 'Melhores Oportunidades' não encontrada");
      return [];
    }

    const rawData = XLSX.utils.sheet_to_json(sheet);
    console.log(
      "Dados brutos das melhores oportunidades:",
      JSON.stringify(rawData, null, 2)
    );

    const processedData = rawData.map((row) => ({
      tipo: row.Tipo || "",
      valorCarta: formatCurrency(
        row["Valor da carta"] || row["Valor da Carta"] || 0
      ),
      entrada: formatCurrency(row.Entrada || 0),
      totalParcelas: row["Total de Parcelas"] || row["Total de parcelas"] || 0,
      fluxoPagamento:
        row["Fluxo de Pagamento"] || row["Fluxo de pagamento"] || "",
      consorcio: row.Consórcio || row.Consorcio || "",
      codigo: row.Código || row.Codigo || "",
      status: row.Status || "Disponível",
    }));

    console.log(
      "Dados processados das melhores oportunidades:",
      JSON.stringify(processedData, null, 2)
    );
    return processedData;
  } catch (error) {
    console.error("Erro ao carregar melhores oportunidades:", error);
    return [];
  }
}

// Rotas
app.get("/", async (req, res) => {
  try {
    const bestOpportunities = await loadBestOpportunities();
    console.log(
      "Enviando melhores oportunidades para a página inicial:",
      JSON.stringify(bestOpportunities, null, 2)
    );
    res.render("index", { bestOpportunities });
  } catch (error) {
    console.error("Erro na rota principal:", error);
    res.render("index", { bestOpportunities: [] });
  }
});

app.get("/imoveis", async (req, res) => {
  try {
    const data = await loadData();
    console.log("Dados carregados:", JSON.stringify(data, null, 2));

    const imoveis = data.filter((row) => {
      console.log("Verificando linha:", row);
      return (
        row.Tipo?.toLowerCase() === "imóveis" ||
        row.Tipo?.toLowerCase() === "imoveis"
      );
    });

    console.log(
      "Dados de imóveis filtrados:",
      JSON.stringify(imoveis, null, 2)
    );

    if (!imoveis || imoveis.length === 0) {
      console.log("Nenhum imóvel encontrado, usando dados de exemplo");
      const dadosExemplo = getDadosExemplo();
      const imoveisExemplo = dadosExemplo.filter(
        (row) => row.Tipo === "Imóveis"
      );

      const colunasExemplo =
        imoveisExemplo.length > 0
          ? Object.keys(imoveisExemplo[0]).filter(
              (col) =>
                col !== "whatsapp_msg" &&
                col !== "Tipo" &&
                !col.endsWith("_num")
            )
          : [];

      return res.render("imoveis", {
        title: "Sonhos à Vista - Imóveis",
        cartas: imoveisExemplo,
        colunas: colunasExemplo,
        formatCurrency: formatCurrency,
        formatRatio: formatRatio,
        formatPercentage: formatPercentage,
      });
    }

    const colunas = Object.keys(imoveis[0]).filter(
      (col) => col !== "whatsapp_msg" && col !== "Tipo" && !col.endsWith("_num")
    );

    console.log("Colunas para exibição:", colunas);

    res.render("imoveis", {
      title: "Sonhos à Vista - Imóveis",
      cartas: imoveis,
      colunas: colunas,
      formatCurrency: formatCurrency,
      formatRatio: formatRatio,
      formatPercentage: formatPercentage,
    });
  } catch (error) {
    console.error("Erro na rota /imoveis:", error);
    console.error("Stack trace:", error.stack);

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
      formatRatio: formatRatio,
      formatPercentage: formatPercentage,
    });
  }
});

app.get("/veiculos", async (req, res) => {
  try {
    const data = await loadData();
    console.log("Dados carregados:", JSON.stringify(data, null, 2));

    const veiculos = data.filter((row) => {
      console.log("Verificando linha:", row);
      return (
        row.Tipo?.toLowerCase() === "veículos" ||
        row.Tipo?.toLowerCase() === "veiculos"
      );
    });

    console.log(
      "Dados de veículos filtrados:",
      JSON.stringify(veiculos, null, 2)
    );

    if (!veiculos || veiculos.length === 0) {
      console.log("Nenhum veículo encontrado, usando dados de exemplo");
      const dadosExemplo = getDadosExemplo();
      const veiculosExemplo = dadosExemplo.filter(
        (row) => row.Tipo === "Veículos"
      );

      const colunasExemplo =
        veiculosExemplo.length > 0
          ? Object.keys(veiculosExemplo[0]).filter(
              (col) =>
                col !== "whatsapp_msg" &&
                col !== "Tipo" &&
                !col.endsWith("_num")
            )
          : [];

      return res.render("veiculos", {
        title: "Sonhos à Vista - Veículos",
        cartas: veiculosExemplo,
        colunas: colunasExemplo,
        formatCurrency: formatCurrency,
        formatRatio: formatRatio,
        formatPercentage: formatPercentage,
      });
    }

    const colunas = Object.keys(veiculos[0]).filter(
      (col) => col !== "whatsapp_msg" && col !== "Tipo" && !col.endsWith("_num")
    );

    console.log("Colunas para exibição:", colunas);

    res.render("veiculos", {
      title: "Sonhos à Vista - Veículos",
      cartas: veiculos,
      colunas: colunas,
      formatCurrency: formatCurrency,
      formatRatio: formatRatio,
      formatPercentage: formatPercentage,
    });
  } catch (error) {
    console.error("Erro na rota /veiculos:", error);
    console.error("Stack trace:", error.stack);

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
      formatRatio: formatRatio,
      formatPercentage: formatPercentage,
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
