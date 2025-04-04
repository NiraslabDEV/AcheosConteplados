const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const XLSX = require("xlsx");
const app = express();

// Função auxiliar para formatar moeda
const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Função para ler dados do Excel
const lerDadosExcel = () => {
  try {
    const arquivoExcel = path.join(
      __dirname,
      "../data/consolidado_20250403_1640.xlsx"
    );
    const workbook = XLSX.readFile(arquivoExcel);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const dados = XLSX.utils.sheet_to_json(worksheet);

    // Separar dados em imóveis e veículos
    const imoveis = dados.filter(
      (item) => item.Tipo?.toLowerCase() === "imóveis"
    );
    const veiculos = dados.filter(
      (item) => item.Tipo?.toLowerCase() === "veículos"
    );

    // Função para limpar e converter valores monetários
    const limparValor = (valor) => {
      if (!valor) return 0;
      if (typeof valor === "number") return valor;
      return parseFloat(valor.toString().replace(/[^\d,.-]/g, "")) || 0;
    };

    // Função para extrair número do prazo
    const extrairPrazo = (fluxo) => {
      if (!fluxo) return "";
      const match = fluxo.match(/(\d+)/);
      return match ? match[1] + "x" : "";
    };

    // Formatar dados para o formato esperado
    const formatarDados = (items) => {
      return items.map((item) => ({
        Consórcio: item.Tipo || "Não especificado",
        "Valor da Carta": limparValor(item["Valor da carta"]),
        Entrada: limparValor(item["Entrada"]),
        Parcela: limparValor(item["Fluxo de Pagamento"]?.split("R$")[1]) || 0,
        Prazo: extrairPrazo(item["Consórcio"]),
        Administradora:
          item["Administradora"]?.replace(/x$/, "") || "Não especificada",
        Status: item["Status"] || "Não especificado",
      }));
    };

    return {
      imoveis: formatarDados(imoveis),
      veiculos: formatarDados(veiculos),
    };
  } catch (erro) {
    console.error("Erro ao ler arquivo Excel:", erro);
    return { imoveis: [], veiculos: [] };
  }
};

// Configuração do EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Arquivos estáticos
app.use("/static", express.static(path.join(__dirname, "../static")));

// Middleware para processar dados do formulário
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Rotas
const router = express.Router();

router.get("/", (req, res) => {
  const { imoveis, veiculos } = lerDadosExcel();
  res.render("index", {
    cartas: [...veiculos, ...imoveis],
    formatCurrency,
  });
});

router.get("/imoveis", (req, res) => {
  const { imoveis } = lerDadosExcel();
  res.render("imoveis", {
    cartas: imoveis,
    formatCurrency,
  });
});

router.get("/veiculos", (req, res) => {
  const { veiculos } = lerDadosExcel();
  res.render("veiculos", {
    cartas: veiculos,
    formatCurrency,
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
