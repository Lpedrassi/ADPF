// aluno.js - Área do Aluno EBD: Sala de Aula (trimestre + aula), Avisos, Recursos

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
import { baixarRevistaDoDrive, criarLeitor } from "./leitor-revista.js";

// Reaproveita app do Firebase se já foi criado
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const hoje = new Date();
const ANO = hoje.getFullYear();
const TRIMESTRE_ATUAL = Math.floor(hoje.getMonth() / 3) + 1;
const HOJE_ISO = `${ANO}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

let salaIdAluno = null;
let nomeSalaAluno = "";
let revistaDriveId = "";
let leitor = null;
let controlesLigados = false;

// Carrega a Área do Aluno quando logado
onAuthStateChanged(auth, async (user) => {
  if (user && document.getElementById("areaAluno")) {
    try {
      await iniciarSalaDeAula(user.uid);
      carregarAvisos();
      carregarRecursos();
    } catch (err) {
      console.error("Erro ao carregar Área do Aluno:", err);
    }
  }
});

// 1. Sala de Aula: trimestre + aula (13 lições) + botão Entrar
async function iniciarSalaDeAula(uid) {
  const status = document.getElementById("alunoSalaStatus");
  const selTrimestre = document.getElementById("alunoTrimestre");
  const selAula = document.getElementById("alunoAula");
  const btnEntrar = document.getElementById("btnAlunoEntrar");

  const matriculasSnap = await getDocs(query(collection(db, "matriculas"), where("uid", "==", uid)));
  const salaIds = [...new Set(
    matriculasSnap.docs.map((d) => d.data()).filter((m) => m.ativo !== false && m.salaId).map((m) => m.salaId)
  )];

  if (!salaIds.length) {
    status.textContent = "Solicite ao professor ou a Secretaria matricular você.";
    selTrimestre.innerHTML = "";
    selAula.innerHTML = "";
    btnEntrar.disabled = true;
    salaIdAluno = null;
    nomeSalaAluno = "";
    return;
  }

  // Regra: o aluno só pode estar em 1 Sala (o cadastro já garante isso)
  salaIdAluno = salaIds[0];
  btnEntrar.disabled = false;
  const salaSnap = await getDoc(doc(db, "salas", salaIdAluno));
  nomeSalaAluno = salaSnap.exists() ? (salaSnap.data().nome || "") : "";

  selTrimestre.innerHTML = "";
  for (let t = 1; t <= 4; t++) {
    const opt = document.createElement("option");
    opt.value = String(t);
    opt.textContent = `${t}º Trimestre ${ANO}`;
    selTrimestre.appendChild(opt);
  }
  selTrimestre.value = String(TRIMESTRE_ATUAL);

  if (!controlesLigados) {
    controlesLigados = true;
    selTrimestre.addEventListener("change", carregarAulasDoTrimestre);
    btnEntrar.addEventListener("click", abrirSalaDeAula);
    document.getElementById("btnAlunoVoltar").addEventListener("click", voltarParaPainel);
    document.getElementById("btnAlunoVoltarRevista").addEventListener("click", voltarDaSolicitacaoRevista);
    document.getElementById("btnAlunoLerRevista").addEventListener("click", abrirLeitorRevista);
    document.getElementById("btnAlunoFecharLeitor").addEventListener("click", fecharLeitorRevista);
    // Ao entrar de novo na Área do Aluno, volta para o trimestre e a aula atuais
    document.querySelectorAll('[data-area="areaAluno"]').forEach((link) => {
      link.addEventListener("click", () => {
        voltarParaPainel();
        voltarDaSolicitacaoRevista();
        resetarParaAtual();
      });
    });
  }

  await resetarParaAtual();
}

// Seleciona o trimestre atual e a aula de hoje
async function resetarParaAtual() {
  document.getElementById("alunoTrimestre").value = String(TRIMESTRE_ATUAL);
  await carregarAulasDoTrimestre();
}

// Lê as lições do trimestre escolhido e preenche o combo de aulas
async function carregarAulasDoTrimestre() {
  const status = document.getElementById("alunoSalaStatus");
  const selAula = document.getElementById("alunoAula");
  const trimestre = Number(document.getElementById("alunoTrimestre").value);
  selAula.innerHTML = "";
  if (!salaIdAluno) return; // sem turma: a mensagem já está na tela

  try {
    const licaoSnap = await getDoc(doc(db, "licoes", `${salaIdAluno}_${ANO}_${trimestre}`));
    const licoes = licaoSnap.exists() && Array.isArray(licaoSnap.data().licoes) ? licaoSnap.data().licoes : [];
    revistaDriveId = licaoSnap.exists() ? (licaoSnap.data().revistaPdfDriveId || "") : "";

    if (!licoes.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Nenhuma lição cadastrada";
      selAula.appendChild(opt);
      status.textContent = "As lições deste trimestre ainda não foram cadastradas. Você pode abrir os arquivos do trimestre.";
      return;
    }

    licoes.forEach((l, i) => {
      const opt = document.createElement("option");
      opt.value = l.data || "";
      const dataBr = l.data ? l.data.split("-").reverse().join("/") : "";
      opt.textContent = `Lição ${i + 1} · ${dataBr.slice(0, 5)} · ${l.titulo || ""}`;
      opt.dataset.numero = String(i + 1);
      opt.dataset.titulo = l.titulo || "";
      opt.dataset.data = dataBr;
      selAula.appendChild(opt);
    });

    // Seleciona a aula de hoje (ou a próxima) apenas no trimestre atual
    if (trimestre === TRIMESTRE_ATUAL) {
      const atual = licoes.find((l) => l.data >= HOJE_ISO) || licoes[licoes.length - 1];
      if (atual && atual.data) selAula.value = atual.data;
    }
    status.textContent = "";
  } catch (err) {
    console.error("Erro ao carregar lições:", err);
    status.textContent = "Não foi possível carregar as aulas agora.";
  }
}

// Botão Entrar: abre a tela Sala de Aula com os arquivos do trimestre e da aula
function abrirSalaDeAula() {
  const trimestre = Number(document.getElementById("alunoTrimestre").value);
  const selAula = document.getElementById("alunoAula");
  const aulaData = selAula.value || "";
  const opcao = selAula.selectedIndex >= 0 ? selAula.options[selAula.selectedIndex] : null;

  // Turma, título da lição e data (nesta ordem, centralizados)
  const detalhe = document.getElementById("alunoSalaDetalhe");
  detalhe.innerHTML = "";
  const linhaTurma = document.createElement("strong");
  linhaTurma.textContent = nomeSalaAluno || "Sua Sala";
  detalhe.appendChild(linhaTurma);
  if (opcao && aulaData) {
    const linhaLicao = document.createElement("div");
    linhaLicao.textContent = `Lição ${opcao.dataset.numero} · ${opcao.dataset.titulo}`;
    const linhaData = document.createElement("div");
    linhaData.textContent = `Data: ${opcao.dataset.data}`;
    detalhe.append(linhaLicao, linhaData);
  } else {
    const linha = document.createElement("div");
    linha.textContent = `${trimestre}º Trimestre`;
    detalhe.appendChild(linha);
  }

  document.getElementById("btnAlunoLerRevista").hidden = !revistaDriveId;

  document.getElementById("alunoPainelPrincipal").hidden = true;
  document.getElementById("alunoSalaAula").hidden = false;
  document.getElementById("areaAluno").scrollIntoView({ behavior: "smooth", block: "start" });

  carregarArquivosAula(trimestre, aulaData);
}

function voltarParaPainel() {
  document.getElementById("alunoSalaAula").hidden = true;
  document.getElementById("alunoLeitorRevista").hidden = true;
  document.getElementById("alunoPainelPrincipal").hidden = false;
  if (leitor) leitor.fechar();
}

// Leitor da revista: abre o PDF (carregado em memória) página a página
async function abrirLeitorRevista() {
  const status = document.getElementById("alunoLeitorStatus");
  document.getElementById("alunoSalaAula").hidden = true;
  document.getElementById("alunoLeitorRevista").hidden = false;
  document.getElementById("areaAluno").scrollIntoView({ behavior: "smooth", block: "start" });

  if (!leitor) {
    leitor = criarLeitor({
      area: document.getElementById("alunoLeitorArea"),
      canvas: document.getElementById("alunoLeitorCanvas"),
      status,
      paginaInfo: document.getElementById("alunoPaginaInfo"),
      btnAnterior: document.getElementById("btnPaginaAnterior"),
      btnProxima: document.getElementById("btnPaginaProxima")
    });
  }

  try {
    const bytes = await baixarRevistaDoDrive(revistaDriveId);
    await leitor.abrir(bytes);
  } catch (err) {
    console.error("Erro ao abrir revista:", err);
    status.textContent = err.message || "Não foi possível abrir a revista agora.";
  }
}

function fecharLeitorRevista() {
  if (leitor) leitor.fechar();
  document.getElementById("alunoLeitorRevista").hidden = true;
  document.getElementById("alunoSalaAula").hidden = false;
}

// Arquivos da Sala de Aula: trimestre inteiro + a aula escolhida
async function carregarArquivosAula(trimestre, aulaData) {
  const el = document.getElementById("alunoArquivos");
  if (!el) return;
  el.textContent = "Carregando...";

  try {
    const periodo = `${ANO}_${trimestre}`;
    const arquivosSnap = await getDocs(query(collection(db, "arquivosSala"), where("salaId", "==", salaIdAluno)));

    const arquivos = [];
    arquivosSnap.forEach((d) => {
      const a = d.data();
      if (a.ativo === false) return;
      if (a.periodo && a.periodo !== periodo) return;
      const aula = a.aula || "trimestre";
      if (aula === "trimestre" || (aulaData && aula === aulaData)) {
        arquivos.push({ id: d.id, nome: a.nome, url: a.url, aula });
      }
    });

    if (!arquivos.length) {
      el.innerHTML = "<p>Nenhum arquivo foi enviado para esta aula ainda.</p>";
      return;
    }

    el.innerHTML = "";
    arquivos.forEach((a) => {
      const linha = document.createElement("div");
      linha.style.marginTop = "6px";
      const link = document.createElement("a");
      link.href = a.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = a.nome || "arquivo";
      link.style.color = "var(--ink)";
      link.style.textDecoration = "underline";
      const tipo = document.createElement("span");
      tipo.style.display = "block";
      tipo.style.fontSize = "12px";
      tipo.style.color = "var(--muted)";
      tipo.textContent = a.aula === "trimestre" ? "Material do trimestre" : "Material desta aula";
      linha.append(link, tipo);
      el.appendChild(linha);
    });
  } catch (err) {
    console.error("Erro ao carregar arquivos da aula:", err);
    el.innerHTML = "<p>Não foi possível carregar os arquivos agora.</p>";
  }
}

// 2. Avisos (estático por enquanto)
function carregarAvisos() {
  const el = document.getElementById("alunoAvisos");

  const avisos = [
    { icone: "🔔", titulo: "Santa Ceia", detalhe: "Próximo domingo (29/09)" },
    { icone: "📢", titulo: "Congresso UFADEJ", detalhe: "28 a 30 de Setembro" },
    { icone: "📚", titulo: "Revista da EBD disponível", detalhe: "Pegue com seu professor" }
  ];

  const html = avisos.map(aviso =>
    `<div class="aluno-card-lista-item">
      <div class="aluno-card-lista-icon">${aviso.icone}</div>
      <div class="aluno-aviso-texto">
        <strong>${aviso.titulo}</strong>
        <span>${aviso.detalhe}</span>
      </div>
    </div>`
  ).join("");

  el.innerHTML = `<div style="margin-top: 8px;">${html}</div>`;
}

// 3. Recursos (links/materiais)
function carregarRecursos() {
  const el = document.getElementById("alunoRecursos");

  el.innerHTML = `
    <div style="margin-top: 8px;">
      <button type="button" class="aluno-card-lista-item aluno-recurso-botao" id="btnAlunoSolicitarRevista">
        <div class="aluno-card-lista-icon">🛒</div>
        <div>
          <strong style="color: var(--ink);">Solicitar Revista</strong><br>
          <span style="font-size: 12px;">Clique aqui para solicitar a revista do próximo trimestre.</span>
        </div>
      </button>
      <div class="aluno-card-lista-item">
        <div class="aluno-card-lista-icon">🙏</div>
        <div>
          <strong style="color: var(--ink);">Versículos da Semana</strong><br>
          <span style="font-size: 12px;">Acompanhe as lições</span>
        </div>
      </div>
    </div>`;

  document.getElementById("btnAlunoSolicitarRevista").addEventListener("click", abrirSolicitarRevista);
}

// Tela de solicitação de revista (formulário será implementado depois)
function abrirSolicitarRevista() {
  document.getElementById("alunoPainelPrincipal").hidden = true;
  document.getElementById("alunoSalaAula").hidden = true;
  document.getElementById("alunoSolicitarRevista").hidden = false;
  document.getElementById("areaAluno").scrollIntoView({ behavior: "smooth", block: "start" });
}

function voltarDaSolicitacaoRevista() {
  document.getElementById("alunoSolicitarRevista").hidden = true;
  document.getElementById("alunoPainelPrincipal").hidden = false;
}
