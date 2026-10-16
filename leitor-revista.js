// leitor-revista.js - leitor de revistas em PDF (PDF.js), página a página, sem download.
// O PDF é carregado em memória e desenhado em canvas: o aluno não recebe um link do arquivo.

import { googleApiKey } from "./google-config.js";

const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174";
let pdfjsCarregado = null;

// Carrega a biblioteca PDF.js só quando o aluno abre uma revista
function carregarPdfJs() {
  if (pdfjsCarregado) return pdfjsCarregado;
  pdfjsCarregado = new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = `${PDFJS_CDN}/pdf.min.js`;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => {
      pdfjsCarregado = null;
      reject(new Error("Não foi possível carregar o leitor de PDF."));
    };
    document.head.appendChild(script);
  });
  return pdfjsCarregado;
}

// Baixa os bytes do PDF da Google Drive (arquivo com acesso por link)
export async function baixarRevistaDoDrive(driveFileId) {
  if (!googleApiKey) throw new Error("O leitor de revistas ainda não está configurado.");
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}?alt=media&key=${encodeURIComponent(googleApiKey)}`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Não foi possível abrir a revista agora.");
  return resposta.arrayBuffer();
}

// Cria um leitor ligado aos elementos da tela
export function criarLeitor({ area, canvas, status, paginaInfo, btnAnterior, btnProxima }) {
  let pdf = null;
  let pagina = 1;

  async function mostrarPagina(numero) {
    if (!pdf) return;
    pagina = Math.min(Math.max(1, numero), pdf.numPages);
    const page = await pdf.getPage(pagina);

    // Ajusta a página à largura da área de leitura
    const densidade = window.devicePixelRatio || 1;
    const vistaBase = page.getViewport({ scale: 1 });
    const largura = Math.max(200, area.clientWidth - 16);
    const escala = largura / vistaBase.width;
    const vista = page.getViewport({ scale: escala * densidade });

    canvas.width = Math.floor(vista.width);
    canvas.height = Math.floor(vista.height);
    canvas.style.width = `${Math.floor(vista.width / densidade)}px`;
    canvas.style.height = `${Math.floor(vista.height / densidade)}px`;

    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vista }).promise;

    paginaInfo.textContent = `Página ${pagina} de ${pdf.numPages}`;
    btnAnterior.disabled = pagina <= 1;
    btnProxima.disabled = pagina >= pdf.numPages;
  }

  // paginaInicial: página cadastrada para a lição (Gerenciar Lições); padrão, a primeira
  async function abrir(bytes, paginaInicial = 1) {
    status.textContent = "Carregando revista...";
    const lib = await carregarPdfJs();
    pdf = await lib.getDocument({ data: bytes }).promise;
    status.textContent = "";
    await mostrarPagina(paginaInicial);
  }

  function fechar() {
    if (pdf) pdf.destroy();
    pdf = null;
    pagina = 1;
    canvas.width = 0;
    canvas.height = 0;
    status.textContent = "";
    paginaInfo.textContent = "";
  }

  btnAnterior.addEventListener("click", () => mostrarPagina(pagina - 1));
  btnProxima.addEventListener("click", () => mostrarPagina(pagina + 1));

  let redimensionando = null;
  window.addEventListener("resize", () => {
    clearTimeout(redimensionando);
    redimensionando = setTimeout(() => mostrarPagina(pagina), 200);
  });

  return { abrir, fechar };
}
