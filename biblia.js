// biblia.js - Bíblia na Sala de Aula: Livro, Capítulo e Versículo.
// Os dados vêm de biblia/acf.json (carregado só quando a tela é usada).

const ARQUIVO_BIBLIA = "biblia/acf.json";
let livros = null;
let carregamento = null;

function carregarBiblia() {
  if (livros) return Promise.resolve(livros);
  if (!carregamento) {
    carregamento = fetch(ARQUIVO_BIBLIA)
      .then((r) => {
        if (!r.ok) throw new Error("Bíblia indisponível");
        return r.json();
      })
      .then((dados) => {
        livros = dados.livros;
        return livros;
      });
  }
  return carregamento;
}

// Preenche um select com as opções e volta para a primeira
function preencher(select, opcoes) {
  select.innerHTML = "";
  opcoes.forEach(([valor, texto]) => {
    const opt = document.createElement("option");
    opt.value = valor;
    opt.textContent = texto;
    select.appendChild(opt);
  });
  select.value = "0";
}

function iniciarBiblia() {
  const selLivro = document.getElementById("biblioLivro");
  const selCapitulo = document.getElementById("biblioCapitulo");
  const selVersiculo = document.getElementById("biblioVersiculo");
  const texto = document.getElementById("biblioTexto");
  const status = document.getElementById("biblioStatus");
  if (!selLivro) return;

  const capitulosDoLivro = () => livros[Number(selLivro.value)].capitulos;
  const versiculosDoCapitulo = () => capitulosDoLivro()[Number(selCapitulo.value)];

  function atualizarVersiculos() {
    preencher(selVersiculo, versiculosDoCapitulo().map((_, i) => [String(i), `Versículo ${i + 1}`]));
  }

  // Mostra o capítulo inteiro, com o versículo escolhido em negrito
  function mostrarCapitulo(rolar) {
    texto.innerHTML = "";
    versiculosDoCapitulo().forEach((v, i) => {
      const p = document.createElement("p");
      p.className = "biblia-versiculo";
      p.dataset.numero = String(i);
      // Clicar em um versículo seleciona ele no combo de Versículo
      p.addEventListener("click", () => {
        selVersiculo.value = p.dataset.numero;
        destacarVersiculo(false);
      });
      const numero = document.createElement("sup");
      numero.textContent = String(i + 1);
      p.append(numero, " " + v);
      texto.appendChild(p);
    });
    destacarVersiculo(rolar);
  }

  function destacarVersiculo(rolar) {
    const escolhido = String(Number(selVersiculo.value));
    texto.querySelectorAll(".biblia-versiculo").forEach((p) => {
      p.classList.toggle("is-destacado", p.dataset.numero === escolhido);
    });
    const alvo = texto.querySelector(".is-destacado");
    if (alvo && rolar) alvo.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  carregarBiblia()
    .then((lista) => {
      preencher(selLivro, lista.map((l, i) => [String(i), l.nome]));
      preencher(selCapitulo, capitulosDoLivro().map((_, i) => [String(i), `Capítulo ${i + 1}`]));
      atualizarVersiculos();
      mostrarCapitulo(false);
      status.textContent = "";
    })
    .catch((err) => {
      console.error(err);
      status.textContent = "Não foi possível carregar a Bíblia agora.";
    });

  selLivro.addEventListener("change", () => {
    if (!livros) return;
    preencher(selCapitulo, capitulosDoLivro().map((_, i) => [String(i), `Capítulo ${i + 1}`]));
    atualizarVersiculos();
    mostrarCapitulo(false);
  });
  selCapitulo.addEventListener("change", () => {
    if (!livros) return;
    atualizarVersiculos();
    mostrarCapitulo(false);
  });
  selVersiculo.addEventListener("change", () => {
    if (!livros) return;
    destacarVersiculo(true);
  });
}

iniciarBiblia();
