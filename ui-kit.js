(() => {
  let notyf = null;
  const obterNotyf = () => {
    if (!notyf) {
      notyf = new Notyf({
        duration: 4000,
        ripple: false,
        position: { x: "right", y: "top" },
        types: [
          { type: "success", background: "rgba(22,163,74,0.92)", icon: false },
          { type: "error", background: "rgba(220,38,38,0.92)", icon: false },
          { type: "info", background: "rgba(37,99,235,0.92)", icon: false }
        ]
      });
    }
    return notyf;
  };

  const tipoPorTexto = (texto) => {
    if (/sucesso|enviamos|atualizado|salvo/i.test(texto)) return "success";
    if (/n[aã]o foi|erro|selecione|digite|ainda tem|tente|n[aã]o pode|confira/i.test(texto)) return "error";
    return "info";
  };

  window.notificar = (mensagem, tipo) => {
    const texto = String(mensagem);
    obterNotyf().open({ type: tipo || tipoPorTexto(texto), message: texto });
  };

  window.alert = (mensagem) => window.notificar(mensagem);

  const iconesPendentes = () => {
    const botoes = document.querySelectorAll(".admin-perfis-item-remover:not([data-icone])");
    if (!botoes.length) return;
    botoes.forEach((botao) => {
      botao.dataset.icone = "1";
      botao.setAttribute("aria-label", "Remover");
      botao.innerHTML = '<i data-lucide="x"></i>';
    });
    if (window.lucide) window.lucide.createIcons();
  };

  const observador = new MutationObserver(iconesPendentes);
  document.addEventListener("DOMContentLoaded", () => {
    iconesPendentes();
    observador.observe(document.body, { childList: true, subtree: true });
  });
})();

const montarComboSelect = (select) => {
  const wrap = document.createElement("div");
  wrap.className = "combo-dep";
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
  select.hidden = true;

  const atual = document.createElement("button");
  atual.type = "button";
  atual.className = "combo-dep-atual";
  atual.setAttribute("aria-haspopup", "listbox");
  atual.setAttribute("aria-expanded", "false");

  const lista = document.createElement("div");
  lista.className = "combo-dep-lista";
  lista.hidden = true;
  wrap.append(atual, lista);

  const sincronizar = () => {
    const op = select.options[select.selectedIndex];
    atual.textContent = op ? op.textContent : "Selecione...";
  };
  const fechar = () => {
    lista.hidden = true;
    atual.setAttribute("aria-expanded", "false");
  };
  const abrir = () => {
    lista.innerHTML = "";
    Array.from(select.options).forEach((op) => {
      if (op.disabled) return;
      const linha = document.createElement("div");
      linha.className = "combo-dep-item";
      const escolher = document.createElement("button");
      escolher.type = "button";
      escolher.className = "combo-dep-escolher";
      escolher.textContent = op.textContent;
      escolher.addEventListener("click", () => {
        select.value = op.value;
        select.dispatchEvent(new Event("change"));
        fechar();
      });
      linha.appendChild(escolher);
      lista.appendChild(linha);
    });
    lista.hidden = false;
    atual.setAttribute("aria-expanded", "true");
  };

  atual.addEventListener("click", () => (lista.hidden ? abrir() : fechar()));
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) fechar();
  });

  const valorOriginal = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  Object.defineProperty(select, "value", {
    configurable: true,
    get() { return valorOriginal.get.call(this); },
    set(v) { valorOriginal.set.call(this, v); sincronizar(); }
  });
  select.addEventListener("change", sincronizar);
  new MutationObserver(sincronizar).observe(select, { childList: true });
  sincronizar();
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#areaAgenda select, #professorSalaSeletor, #arquivoSalaAula, #salaAlunoAvulsoCrianca, #alunoSala, #alunoTrimestre, #alunoAula, #biblioLivro, #biblioCapitulo, #biblioVersiculo").forEach((select) => {
    if (!select.closest(".combo-dep")) montarComboSelect(select);
  });
});
