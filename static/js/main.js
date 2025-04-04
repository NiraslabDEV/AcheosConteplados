// Menu Mobile
const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
const navMenu = document.querySelector(".nav-menu");

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", () => {
    mobileMenuBtn.classList.toggle("active");
    navMenu.classList.toggle("active");
  });
}

// Navbar Scroll
let lastScroll = 0;
const header = document.querySelector(".header");

window.addEventListener("scroll", () => {
  const currentScroll = window.pageYOffset;

  if (currentScroll <= 0) {
    header.classList.remove("scroll-up");
    header.classList.remove("scroll-down");
    return;
  }

  if (currentScroll > lastScroll && !header.classList.contains("scroll-down")) {
    // Scroll Down
    header.classList.remove("scroll-up");
    header.classList.add("scroll-down");
  } else if (
    currentScroll < lastScroll &&
    header.classList.contains("scroll-down")
  ) {
    // Scroll Up
    header.classList.remove("scroll-down");
    header.classList.add("scroll-up");
  }

  lastScroll = currentScroll;
});

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();

    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      const headerOffset = 80;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      // Fecha o menu mobile se estiver aberto
      if (mobileMenuBtn && mobileMenuBtn.classList.contains("active")) {
        mobileMenuBtn.click();
      }
    }
  });
});

// Animações de Entrada
const animateOnScroll = () => {
  const elements = document.querySelectorAll(".animate");

  elements.forEach((element) => {
    const elementTop = element.getBoundingClientRect().top;
    const elementBottom = element.getBoundingClientRect().bottom;

    if (elementTop < window.innerHeight && elementBottom > 0) {
      element.classList.add("animated");
    }
  });
};

window.addEventListener("scroll", animateOnScroll);
window.addEventListener("load", animateOnScroll);

// Inicialização dos tooltips do Bootstrap
var tooltipTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
);
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl);
});

// Inicialização dos popovers do Bootstrap
var popoverTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="popover"]')
);
var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
  return new bootstrap.Popover(popoverTriggerEl);
});

// Função para abrir o modal com os dados da carta
function openModal(carta) {
  const modal = new bootstrap.Modal(document.getElementById("saibaMaisModal"));
  modal.show();
}

// Função para formatar valores monetários
function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Função para enviar mensagem no WhatsApp
function sendWhatsAppMessage(carta) {
  const message = `Olá! Vi no site uma carta de consórcio contemplado com as seguintes características:
📍 Administradora: ${carta.Consórcio}
💰 Valor: ${formatCurrency(
    parseFloat(carta["Valor da carta"].replace(",", "."))
  )}
💵 Entrada: ${formatCurrency(parseFloat(carta.Entrada.replace(",", ".")))}
📋 Parcelas: ${carta["Total de Parcelas"]}`;

  const url = `https://wa.me/5511952283170?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// Formatação de valores monetários
const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Tooltips
const tooltips = document.querySelectorAll("[data-tooltip]");

tooltips.forEach((tooltip) => {
  tooltip.addEventListener("mouseenter", (e) => {
    const tooltipText = e.target.dataset.tooltip;
    const tooltipEl = document.createElement("div");
    tooltipEl.className = "tooltip";
    tooltipEl.textContent = tooltipText;
    document.body.appendChild(tooltipEl);

    const rect = e.target.getBoundingClientRect();
    tooltipEl.style.top = rect.bottom + 10 + "px";
    tooltipEl.style.left =
      rect.left + rect.width / 2 - tooltipEl.offsetWidth / 2 + "px";
  });

  tooltip.addEventListener("mouseleave", () => {
    const tooltip = document.querySelector(".tooltip");
    if (tooltip) tooltip.remove();
  });
});

// Lazy Loading para imagens
document.addEventListener("DOMContentLoaded", () => {
  const lazyImages = document.querySelectorAll("img[data-src]");

  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
          imageObserver.unobserve(img);
        }
      });
    });

    lazyImages.forEach((img) => imageObserver.observe(img));
  }
});

// Filtros da tabela
document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("searchInput");
  const adminFilter = document.getElementById("adminFilter");
  const minValue = document.getElementById("minValue");
  const maxValue = document.getElementById("maxValue");
  const tableRows = document.querySelectorAll(".data-table tbody tr");

  function filterTable() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedAdmin = adminFilter.value;
    const min = minValue.value ? parseFloat(minValue.value) : 0;
    const max = maxValue.value ? parseFloat(maxValue.value) : Infinity;

    tableRows.forEach((row) => {
      const admin = row.cells[0].textContent;
      const credit = parseFloat(
        row.cells[1].textContent
          .replace("R$", "")
          .replace(".", "")
          .replace(",", ".")
      );
      const rowText = row.textContent.toLowerCase();

      const matchesSearch = rowText.includes(searchTerm);
      const matchesAdmin = !selectedAdmin || admin === selectedAdmin;
      const matchesValue = credit >= min && credit <= max;

      row.style.display =
        matchesSearch && matchesAdmin && matchesValue ? "" : "none";
    });
  }

  if (searchInput) searchInput.addEventListener("input", filterTable);
  if (adminFilter) adminFilter.addEventListener("change", filterTable);
  if (minValue) minValue.addEventListener("input", filterTable);
  if (maxValue) maxValue.addEventListener("input", filterTable);
});

// Modal
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("contatoModal");
  const closeBtn = document.querySelector(".close-modal");
  const contatoForm = document.getElementById("contatoForm");
  const contatoBtns = document.querySelectorAll(".btn-whatsapp");

  // Função para abrir o modal com os dados da carta
  function openModal(carta) {
    document.getElementById("modalTipo").textContent = carta.dataset.tipo;
    document.getElementById("modalCredito").textContent = carta.dataset.credito;
    document.getElementById("modalEntrada").textContent = carta.dataset.entrada;
    document.getElementById("modalParcelas").textContent =
      carta.dataset.parcelas;
    document.getElementById("modalAdmin").textContent = carta.dataset.admin;
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  // Função para fechar o modal
  function closeModal() {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }

  // Event listeners
  contatoBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal(this);
    });
  });

  closeBtn.addEventListener("click", closeModal);

  window.addEventListener("click", function (e) {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Envio do formulário
  contatoForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Aqui você pode adicionar o código para enviar os dados do formulário
    const formData = new FormData(this);
    console.log("Dados do formulário:", Object.fromEntries(formData));

    // Após enviar, fecha o modal e redireciona para o WhatsApp
    const whatsappLink = document.querySelector(".btn-whatsapp").href;
    closeModal();
    window.open(whatsappLink, "_blank");
  });
});
