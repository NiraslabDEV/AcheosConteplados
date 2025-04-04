const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const XLSX = require("xlsx");
const app = express();

// Função auxiliar para formatar moeda
const formatCurrency = (value) => {
  if (value === undefined || value === null) return "";
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
    const dados = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    // Obter os nomes das colunas
    const ref = worksheet["!ref"];
    const range = XLSX.utils.decode_range(ref);
    const colunas = [];

    // Extrair cabeçalhos
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      if (worksheet[cellAddress] && worksheet[cellAddress].v) {
        colunas.push(worksheet[cellAddress].v);
      }
    }

    console.log("Colunas encontradas:", colunas);

    // Separar dados em imóveis e veículos
    const imoveis = dados.filter(
      (item) => item.Tipo?.toLowerCase() === "imóveis"
    );
    const veiculos = dados.filter(
      (item) => item.Tipo?.toLowerCase() === "veículos"
    );

    // Função para converter valores monetários
    const converterValorMonetario = (valor) => {
      if (!valor) return 0;
      if (typeof valor === "number") return valor;

      // Remove R$, espaços e converte vírgula para ponto
      const valorLimpo = valor
        .toString()
        .replace(/R\$\s*/g, "")
        .replace(/\./g, "")
        .replace(/,/g, ".")
        .trim();

      return parseFloat(valorLimpo) || 0;
    };

    // Processa e preserva todas as colunas
    const processarItens = (items) => {
      return items.map((item) => {
        const resultado = {};

        // Preservar todas as colunas originais
        Object.keys(item).forEach((chave) => {
          resultado[chave] = item[chave];
        });

        // Converter colunas numéricas para valores que podem ser formatados
        if (item["Valor da carta"]) {
          resultado["Valor da carta_num"] = converterValorMonetario(
            item["Valor da carta"]
          );
        }

        if (item["Entrada"]) {
          resultado["Entrada_num"] = converterValorMonetario(item["Entrada"]);
        }

        // Extrair valor da parcela do fluxo de pagamento
        if (item["Fluxo de Pagamento"]) {
          const match = item["Fluxo de Pagamento"].match(/R\$\s*([\d,.]+)/);
          if (match) {
            resultado["Parcela_num"] = converterValorMonetario(match[0]);
          }
        }

        return resultado;
      });
    };

    return {
      imoveis: processarItens(imoveis),
      veiculos: processarItens(veiculos),
      colunas: colunas,
    };
  } catch (erro) {
    console.error("Erro ao ler arquivo Excel:", erro);
    return { imoveis: [], veiculos: [], colunas: [] };
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
  const { imoveis, veiculos, colunas } = lerDadosExcel();
  res.render("index", {
    cartas: [...veiculos, ...imoveis],
    colunas: colunas,
    formatCurrency,
  });
});

router.get("/imoveis", (req, res) => {
  const { imoveis, colunas } = lerDadosExcel();
  res.render("imoveis", {
    cartas: imoveis,
    colunas: colunas,
    formatCurrency,
  });
});

router.get("/veiculos", (req, res) => {
  const { veiculos, colunas } = lerDadosExcel();
  res.render("veiculos", {
    cartas: veiculos,
    colunas: colunas,
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
