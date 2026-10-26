// calendario-br.js: datas no padrão dd/mm/aaaa com máscara e calendário.
// Vale para todo <input data-data-br> da página, inclusive os criados depois.
// Os valores ficam como texto "dd/mm/aaaa"; o banco continua em "aaaa-mm-dd".
(() => {
  const MESES_CAL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const pad2 = (n) => String(n).padStart(2, "0");

  // "16/10/2026" -> "2026-10-16" ("" se incompleta ou inexistente)
  window.dataBrParaIso = (br) => {
    const m = String(br || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return "";
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (d.getFullYear() !== Number(m[3]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[1])) return "";
    return m[3] + "-" + m[2] + "-" + m[1];
  };

  // "2026-10-16" -> "16/10/2026" ("" se vazia)
  window.isoParaDataBr = (iso) => {
    const p = String(iso || "").split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : "";
  };

  // Máscara: só números, com barras em dd/mm/aaaa
  document.addEventListener("input", (e) => {
    const campo = e.target.closest ? e.target.closest("input[data-data-br]") : null;
    if (!campo) return;
    const d = campo.value.replace(/\D/g, "").slice(0, 8);
    campo.value = d.length > 4 ? d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4) : d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  });

  // ----- Calendário -----
  const picker = document.createElement("div");
  picker.className = "cal-picker";
  picker.hidden = true;
  document.body.appendChild(picker);
  let alvo = null, ano = 0, mes = 0;

  const campoDoEvento = (e) => (e.target.closest ? e.target.closest("input[data-data-br]") : null);

  function desenhar() {
    const selecionado = alvo ? window.dataBrParaIso(alvo.value) : "";
    const hoje = new Date();
    const hojeIso = hoje.getFullYear() + "-" + pad2(hoje.getMonth() + 1) + "-" + pad2(hoje.getDate());
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    let html = '<div class="cal-cab"><button type="button" data-cal="ant" aria-label="Mês anterior">‹</button>' +
      "<strong>" + MESES_CAL[mes] + " " + ano + "</strong>" +
      '<button type="button" data-cal="prox" aria-label="Próximo mês">›</button></div>' +
      '<div class="cal-semana">' + ["D", "S", "T", "Q", "Q", "S", "S"].map((d) => "<span>" + d + "</span>").join("") + "</div>" +
      '<div class="cal-dias">';
    for (let i = 0; i < primeiroDia; i++) html += "<span></span>";
    for (let d = 1; d <= diasNoMes; d++) {
      const iso = ano + "-" + pad2(mes + 1) + "-" + pad2(d);
      const classes = ["cal-dia"];
      if (iso === selecionado) classes.push("is-sel");
      if (iso === hojeIso) classes.push("is-hoje");
      html += '<button type="button" class="' + classes.join(" ") + '" data-iso="' + iso + '">' + d + "</button>";
    }
    html += '</div><div class="cal-rodape"><button type="button" data-cal="limpar">Limpar</button><button type="button" data-cal="hoje">Hoje</button></div>';
    picker.innerHTML = html;
  }

  function fechar() {
    picker.hidden = true;
    alvo = null;
  }

  function abrir(campo) {
    alvo = campo;
    const iso = window.dataBrParaIso(campo.value);
    const base = iso ? new Date(iso + "T00:00:00") : new Date();
    ano = base.getFullYear();
    mes = base.getMonth();
    desenhar();
    picker.hidden = false;
    const r = campo.getBoundingClientRect();
    const esquerda = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - picker.offsetWidth - 8));
    picker.style.top = (window.scrollY + r.bottom + 6) + "px";
    picker.style.left = esquerda + "px";
  }

  // Escolhe o dia: grava dd/mm/aaaa e avisa a página (evento change)
  function escolher(iso) {
    if (!alvo) return;
    alvo.value = window.isoParaDataBr(iso);
    alvo.dispatchEvent(new Event("change", { bubbles: true }));
    fechar();
  }

  picker.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !alvo) return;
    if (b.dataset.iso) return escolher(b.dataset.iso);
    if (b.dataset.cal === "ant") { mes--; if (mes < 0) { mes = 11; ano--; } desenhar(); }
    if (b.dataset.cal === "prox") { mes++; if (mes > 11) { mes = 0; ano++; } desenhar(); }
    if (b.dataset.cal === "limpar") { alvo.value = ""; alvo.dispatchEvent(new Event("change", { bubbles: true })); fechar(); }
    if (b.dataset.cal === "hoje") {
      const h = new Date();
      escolher(h.getFullYear() + "-" + pad2(h.getMonth() + 1) + "-" + pad2(h.getDate()));
    }
  });

  document.addEventListener("click", (e) => {
    const campo = campoDoEvento(e);
    if (campo && !campo.disabled && !campo.readOnly) abrir(campo);
  });
  document.addEventListener("focusin", (e) => {
    const campo = campoDoEvento(e);
    if (campo && !campo.disabled && !campo.readOnly && alvo !== campo) abrir(campo);
  });
  document.addEventListener("mousedown", (e) => {
    if (!picker.hidden && !picker.contains(e.target) && !campoDoEvento(e)) fechar();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });
})();
