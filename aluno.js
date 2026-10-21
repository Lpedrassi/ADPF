// aluno.js - Área do Aluno EBD: Sala de Aula (trimestre + aula), Avisos, Recursos

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
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
let uidAluno = null;
// Sala onde o aluno está matriculado (a que vale para o pedido de revista, não a que ele escolhe na Sala de Aula)
let matriculaAluno = null; // { salaId, salaNome, nome }
// Modo da Sala de Aula: false = revista do aluno; true = revista de professor (aberta pela Sala do Professor)
let modoRevistaProfessor = false;

// Quem pede a revista. O pop-up é o mesmo para o aluno (matrícula) e para o professor
// (Sala do Professor); só muda o solicitante e o tipo padrão da revista.
// { uid, nome, salaId, salaNome, tipoPadrao, aoMudar? }
let solicitanteModal = null;
function solicitanteAluno() {
  if (!matriculaAluno) return null;
  return { uid: uidAluno, nome: matriculaAluno.nome || "", salaId: matriculaAluno.salaId, salaNome: matriculaAluno.salaNome || "", tipoPadrao: "aluno" };
}

// Carrega a Área do Aluno quando logado
onAuthStateChanged(auth, async (user) => {
  if (user && document.getElementById("areaAluno")) {
    try {
      uidAluno = user.uid;
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
    matriculaAluno = null;
    return;
  }

  // Lista todas as salas; a matriculada vem selecionada, mas o aluno pode escolher outra
  await preencherSeletorDeSalas();
  // Regra: o aluno só pode estar em 1 Sala (o cadastro já garante isso)
  selecionarSala(salaIds[0]);
  const matriculaDoAluno = matriculasSnap.docs.map((d) => d.data()).find((m) => m.ativo !== false && m.salaId === salaIds[0]);
  matriculaAluno = { salaId: salaIds[0], salaNome: nomeSalaAluno, nome: matriculaDoAluno ? (matriculaDoAluno.nome || "") : "" };

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
    document.getElementById("alunoSala").addEventListener("change", (e) => selecionarSala(e.target.value));
    btnEntrar.addEventListener("click", abrirSalaDeAula);
    document.getElementById("btnAlunoVoltar").addEventListener("click", voltarParaPainel);
    ligarPedidoRevista();
    // Ao entrar de novo na Área do Aluno, volta para o trimestre e a aula atuais
    document.querySelectorAll('[data-area="areaAluno"]').forEach((link) => {
      link.addEventListener("click", () => {
        voltarParaPainel();
        resetarParaAtual();
      });
    });
  }

  await resetarParaAtual();
}

// Preenche o seletor com todas as salas (ordem do cadastro)
async function preencherSeletorDeSalas() {
  const selSala = document.getElementById("alunoSala");
  const salasSnap = await getDocs(collection(db, "salas"));
  const salas = salasSnap.docs.map((d) => ({ id: d.id, nome: d.data().nome || "", ordem: d.data().ordem ?? 9999 }));
  salas.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
  selSala.innerHTML = "";
  salas.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.nome || "Sala sem nome";
    selSala.appendChild(opt);
  });
}

// Troca a sala exibida: recarrega as lições e libera o botão Entrar
function selecionarSala(salaId) {
  const selSala = document.getElementById("alunoSala");
  salaIdAluno = salaId || null;
  selSala.value = salaIdAluno || "";
  const opt = selSala.options[selSala.selectedIndex];
  nomeSalaAluno = salaIdAluno && opt ? opt.textContent : "";
  document.getElementById("btnAlunoEntrar").disabled = !salaIdAluno;
  carregarAulasDoTrimestre();
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
    // Lições e PDFs ficam na revista: a sala aponta para ela (sem revista, usa o documento antigo da sala)
    const salaSnap = await getDoc(doc(db, "salas", salaIdAluno));
    const revistaIdAluno = salaSnap.exists() ? (salaSnap.data().revistaId || "") : "";
    const licaoSnap = await getDoc(doc(db, "licoes", `${revistaIdAluno || salaIdAluno}_${ANO}_${trimestre}`));
    const licoes = licaoSnap.exists() && Array.isArray(licaoSnap.data().licoes) ? licaoSnap.data().licoes : [];
    revistaDriveId = licaoSnap.exists() ? (licaoSnap.data()[modoRevistaProfessor ? "revistaProDriveId" : "revistaPdfDriveId"] || "") : "";

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
      opt.dataset.pagina = String(l.pagina || 1);
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

  // Sala, lição, trimestre e data (um por linha)
  const detalhe = document.getElementById("alunoSalaDetalhe");
  detalhe.innerHTML = "";
  const linhas = [["Sala", nomeSalaAluno || "Sua Sala"]];
  if (modoRevistaProfessor) linhas.unshift(["Revista", "Professor"]);
  if (opcao && aulaData) {
    linhas.push(["Lição", `${opcao.dataset.numero} · ${opcao.dataset.titulo}`]);
  }
  linhas.push(["Trimestre", `${trimestre}º Trimestre ${ANO}`]);
  if (opcao && aulaData) {
    linhas.push(["Data", opcao.dataset.data]);
  }
  linhas.forEach(([rotulo, valor]) => {
    const linha = document.createElement("div");
    const nome = document.createElement("strong");
    nome.textContent = rotulo + ": ";
    linha.append(nome, document.createTextNode(valor));
    detalhe.appendChild(linha);
  });

  document.getElementById("alunoPainelPrincipal").hidden = true;
  document.getElementById("alunoSalaAula").hidden = false;
  document.getElementById("areaAluno").scrollIntoView({ behavior: "smooth", block: "start" });

  // A revista abre na página cadastrada para a lição (1 se a lição não tiver página)
  const paginaDaLicao = opcao && aulaData ? Number(opcao.dataset.pagina) || 1 : 1;
  carregarRevistaDaLicao(paginaDaLicao);
  carregarArquivosAula(trimestre, aulaData);
}

function voltarParaPainel() {
  document.getElementById("alunoSalaAula").hidden = true;
  document.getElementById("alunoPainelPrincipal").hidden = false;
  if (leitor) leitor.fechar();
  // Saindo da revista de professor: volta ao painel da Sala do Professor e restaura a Sala de Aula do aluno
  if (modoRevistaProfessor) {
    modoRevistaProfessor = false;
    if (uidAluno) iniciarSalaDeAula(uidAluno).catch((err) => console.error(err));
    if (window.__mostrarArea) window.__mostrarArea("areaProfessor");
  }
}

// Revista da lição: abre dentro da Sala de Aula, já na primeira página
async function carregarRevistaDaLicao(paginaInicial = 1) {
  const status = document.getElementById("alunoLeitorStatus");
  if (leitor) leitor.fechar();
  if (!revistaDriveId) {
    status.textContent = "Esta lição ainda não tem revista disponível.";
    return;
  }
  status.textContent = "Carregando revista...";

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
    await leitor.abrir(bytes, paginaInicial);
  } catch (err) {
    console.error("Erro ao abrir revista:", err);
    status.textContent = err.message || "Não foi possível abrir a revista agora.";
  }
}

function extensaoDoArquivo(nome) {
  const partes = (nome || "").split(".");
  return partes.length > 1 ? partes.pop().toUpperCase() : "ARQUIVO";
}

// Código do vídeo do YouTube (watch, youtu.be, shorts, embed, live); vazio se não for YouTube
function idDoYoutube(url) {
  const m = String(url || "").trim().match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  return m ? m[1] : "";
}

function iconeDoArquivo(nome) {
  const ext = extensaoDoArquivo(nome);
  if (ext === "PDF") return "📄";
  if (["PPT", "PPTX"].includes(ext)) return "📊";
  if (["DOC", "DOCX"].includes(ext)) return "📝";
  if (["MP4", "MOV", "AVI", "WEBM"].includes(ext)) return "🎬";
  if (["JPG", "JPEG", "PNG", "WEBP", "GIF"].includes(ext)) return "🖼️";
  return "📎";
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
        arquivos.push({ id: d.id, nome: a.nome, titulo: a.titulo || "", comentario: a.comentario || "", url: a.url, tipo: a.tipo || "", driveFileId: a.driveFileId || "", aula });
      }
    });

    if (!arquivos.length) {
      el.innerHTML = "<p>Nenhum arquivo foi enviado para esta aula ainda.</p>";
      return;
    }

    el.innerHTML = "";
    const grade = document.createElement("div");
    grade.className = "aluno-arquivos-grid";
    arquivos.forEach((a) => {
      const item = document.createElement("div");
      item.className = "aluno-arquivo-item";

      const titulo = document.createElement("div");
      titulo.className = "aluno-arquivo-titulo";
      titulo.textContent = a.titulo || a.nome || "Arquivo";

      const quadrado = document.createElement("a");
      quadrado.className = "aluno-arquivo-canvas";
      quadrado.href = a.url;
      quadrado.target = "_blank";
      quadrado.rel = "noopener";
      quadrado.title = "Abrir arquivo";
      const icone = document.createElement("span");
      icone.className = "aluno-arquivo-icone";
      icone.textContent = a.tipo === "link" ? "🔗" : iconeDoArquivo(a.nome);
      const tipo = document.createElement("span");
      tipo.className = "aluno-arquivo-tipo";
      tipo.textContent = a.tipo === "link" ? "LINK" : extensaoDoArquivo(a.nome);
      // PDF no Drive: a miniatura é a primeira página (a capa); sem imagem, fica o ícone
      let visual = icone;
      const ytId = idDoYoutube(a.url);
      if (ytId && a.tipo === "link") {
        // Link do YouTube: miniatura do próprio vídeo
        const miniatura = document.createElement("img");
        miniatura.className = "aluno-arquivo-miniatura";
        miniatura.alt = "";
        miniatura.loading = "lazy";
        miniatura.decoding = "async";
        miniatura.src = "https://i.ytimg.com/vi/" + ytId + "/mqdefault.jpg";
        miniatura.onerror = () => miniatura.replaceWith(icone);
        visual = miniatura;
      } else if (a.driveFileId && /\.pdf$/i.test(a.nome || "")) {
        const miniatura = document.createElement("img");
        miniatura.className = "aluno-arquivo-miniatura";
        miniatura.alt = "";
        miniatura.loading = "lazy";
        miniatura.decoding = "async";
        miniatura.src = "https://drive.google.com/thumbnail?id=" + encodeURIComponent(a.driveFileId) + "&sz=w240";
        miniatura.onerror = () => miniatura.replaceWith(icone);
        visual = miniatura;
      }
      quadrado.append(visual, tipo);

      item.append(titulo, quadrado);
      if (a.comentario) {
        const comentario = document.createElement("div");
        comentario.className = "aluno-arquivo-comentario";
        comentario.textContent = a.comentario;
        item.appendChild(comentario);
      }
      grade.appendChild(item);
    });
    el.appendChild(grade);
  } catch (err) {
    console.error("Erro ao carregar arquivos da aula:", err);
    el.innerHTML = "<p>Não foi possível carregar os arquivos agora.</p>";
  }
}

// 2. Avisos (estático, exceto a revista: se o aluno já pediu, a mensagem muda)
// 2. Avisos: dinâmicos. Mostra eventos da Agenda dos próximos 7 dias (ex.: Santa Ceia, congressos)
// e o aviso de revista enquanto houver pedido que ainda não foi entregue pela Secretaria.
async function carregarAvisos() {
  const el = document.getElementById("alunoAvisos");
  const avisos = [];

  try {
    const ate = new Date(HOJE_ISO + "T00:00:00");
    ate.setDate(ate.getDate() + 7);
    const ateISO = `${ate.getFullYear()}-${String(ate.getMonth() + 1).padStart(2, "0")}-${String(ate.getDate()).padStart(2, "0")}`;
    const snap = await getDocs(collection(db, "agenda"));
    const proximos = [];
    snap.forEach((d) => {
      const ev = d.data();
      if (ev.dataInicio && ev.dataInicio >= HOJE_ISO && ev.dataInicio <= ateISO) proximos.push(ev);
    });
    proximos.sort((x, y) => x.dataInicio.localeCompare(y.dataInicio));
    proximos.forEach((ev) => {
      const [, mes, dia] = ev.dataInicio.split("-");
      const diaSemana = new Date(ev.dataInicio + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long" });
      const hora = ev.hora ? " às " + ev.hora : "";
      avisos.push({
        icone: /santa ceia/i.test(ev.titulo || "") ? "🔔" : "📢",
        titulo: ev.titulo || "Evento",
        detalhe: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1) + " " + dia + "/" + mes + hora
      });
    });
  } catch (err) {
    console.error("Erro ao carregar avisos da Agenda:", err);
  }

  // Pedido de revista ainda não entregue (qualquer trimestre)
  try {
    const pendentes = await buscarPedidosEmAbertoAluno(uidAluno);
    if (pendentes.length) {
      avisos.push({ icone: "📚", titulo: "Você já solicitou a sua revista", detalhe: "Em breve será entregue pela secretaria da EBD." });
    }
  } catch (err) {
    console.error("Erro ao verificar pedido de revista:", err);
  }

  el.innerHTML = avisos.length
    ? `<div style="margin-top: 8px;">${avisos.map((aviso) =>
      `<div class="aluno-card-lista-item">
        <div class="aluno-card-lista-icon">${aviso.icone}</div>
        <div class="aluno-aviso-texto">
          <strong>${aviso.titulo}</strong>
          <span>${aviso.detalhe}</span>
        </div>
      </div>`).join("")}</div>`
    : '<p class="admin-agenda-info">Nenhum aviso no momento.</p>';
}

// 3. Recursos (links/materiais)
// Com pedido feito no trimestre, aparece também o cartão "Meu pedido" (somente leitura)
async function carregarRecursos() {
  const el = document.getElementById("alunoRecursos");
  let temPedido = false;
  try {
    temPedido = (await buscarPedidosEmAbertoAluno(uidAluno)).length > 0;
  } catch (err) {
    console.error("Erro ao verificar pedidos:", err);
  }

  el.innerHTML = `
    <div class="professor-canvas-grid aluno-recursos-grid">
      <button type="button" class="professor-canvas-card" id="btnAlunoSolicitarRevista" aria-label="Solicitar Revista">
        <span class="professor-canvas-icone"><img src="icones-secretaria/revistas-coloridas.webp" alt=""></span>
        <span class="professor-canvas-titulo">Solicitar Revista</span>
        <span class="professor-canvas-sub">Revista do próximo trimestre</span>
      </button>
      ${temPedido ? `
      <button type="button" class="professor-canvas-card" id="btnAlunoMeuPedido" aria-label="Meu pedido">
        <span class="professor-canvas-icone"><img src="icones-secretaria/meu-pedido.webp" alt=""></span>
        <span class="professor-canvas-titulo">Meu pedido</span>
        <span class="professor-canvas-sub">Veja o que você pediu</span>
      </button>` : ""}
    </div>`;

  document.getElementById("btnAlunoSolicitarRevista").addEventListener("click", () => abrirSolicitarRevista());
  if (temPedido) document.getElementById("btnAlunoMeuPedido").addEventListener("click", () => abrirMeuPedido());
}

// ---------- Pedido de revista (pop-up) ----------
// Um pedido por aluno e por trimestre: documento "pedidosRevistas/{uid}_{ano}_{trimestre}".
// Preço: campo "preco" de cada revista em licoes/_revistas (itens). Sem preço, aparece "Sem preço no momento".
const MSG_SEM_PRECO = "Sem preço no momento";

// O pedido é sempre da revista do próximo trimestre (no 4º, o próximo é o 1º do ano seguinte)
function proximoTrimestre() {
  return TRIMESTRE_ATUAL === 4
    ? { ano: ANO + 1, trimestre: 1 }
    : { ano: ANO, trimestre: TRIMESTRE_ATUAL + 1 };
}

// Pedidos deste aluno no trimestre (pode haver mais de um, se ele pediu de novo). Lista vazia se não pediu.
async function buscarPedidosAluno(ano, trimestre, uid = uidAluno) {
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, "pedidosRevistas"), where("uid", "==", uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.ano === ano && p.trimestre === trimestre);
}

const formatarReal = (n) => "R$ " + n.toFixed(2).replace(".", ",");

// Pop-ups do pedido ficam no fim do <body>: a seção da Área do Aluno tem backdrop-filter, que prende o position: fixed dentro dela
function abrirModalAluno(id) {
  const modal = document.getElementById(id);
  modal.hidden = false;
  modal.classList.add("is-open");
}
function fecharModalAluno(id) {
  const modal = document.getElementById(id);
  modal.classList.remove("is-open");
  modal.hidden = true;
}

function ligarPedidoRevista() {
  ["alunoPedidoModal", "alunoDividirModal", "alunoMaisRevistasModal", "alunoMeuPedidoModal"].forEach((id) => {
    document.body.appendChild(document.getElementById(id));
  });
  document.getElementById("alunoPedidoCancelar").addEventListener("click", fecharPedidoRevista);
  document.getElementById("alunoMeuPedidoFechar").addEventListener("click", () => fecharModalAluno("alunoMeuPedidoModal"));
  document.getElementById("alunoPedidoForm").addEventListener("submit", (e) => {
    e.preventDefault();
    enviarPedidoRevista();
  });
}

// .login-overlay começa invisível (opacity 0): precisa da classe is-open para aparecer
function fecharPedidoRevista() {
  const modal = document.getElementById("alunoPedidoModal");
  modal.classList.remove("is-open");
  modal.hidden = true;
}

// Abre o pop-up: trimestre, sala, revistas (checklist + quantidade), custo e Fazer o Pedido
async function abrirSolicitarRevista(sol = solicitanteAluno()) {
  const status = document.getElementById("alunoPedidoStatus");
  if (!sol || !sol.salaId) {
    alert(sol && sol.tipoPadrao === "professor"
      ? "Escolha uma Sala antes de pedir a revista."
      : "Solicite ao professor ou à Secretaria matricular você antes de pedir a revista.");
    return;
  }
  solicitanteModal = sol;

  const periodo = proximoTrimestre();
  document.getElementById("alunoPedidoTrimestreTexto").textContent = `${periodo.trimestre}º Trimestre ${periodo.ano}`;
  status.textContent = "";
  const modal = document.getElementById("alunoPedidoModal");
  modal.hidden = false;
  modal.classList.add("is-open");

  const lista = document.getElementById("alunoPedidoLista");
  lista.textContent = "Carregando revistas...";
  try {
    const [revSnap, salasSnap, precosSnap] = await Promise.all([
      getDoc(doc(db, "licoes", "_revistas")),
      getDocs(collection(db, "salas")),
      // Se a regra ainda não existir, o pedido segue sem preço (não trava a tela)
      getDoc(doc(db, "configRevistas", `precos_${proximoTrimestre().ano}_${proximoTrimestre().trimestre}`)).catch(() => null)
    ]);
    const itens = revSnap.exists() && Array.isArray(revSnap.data().itens) ? revSnap.data().itens : [];
    const salas = salasSnap.docs.map((d) => d.data());
    // Preços cadastrados pela Secretaria (Valores das revistas); sem preço fica null
    const precos = precosSnap && precosSnap.exists() && precosSnap.data().precos ? precosSnap.data().precos : {};
    // Mostra as salas que usam cada revista (ex.: Juniores: Estrela da Manhã)
    catalogoRevistas = itens.map((r) => ({
      id: r.id,
      nome: r.nome || "",
      precoAluno: precoDe(precos[r.id], "aluno"),
      precoProfessor: precoDe(precos[r.id], "professor"),
      salas: salas.filter((s) => s.revistaId === r.id).map((s) => s.nome || "")
    }));
    desenharListaRevistas();
    atualizarCustoRevista();
  } catch (err) {
    console.error("Erro ao carregar revistas:", err);
    lista.textContent = "";
    status.textContent = "Não foi possível carregar as revistas agora.";
  }
}

let catalogoRevistas = [];

// Valor de uma revista para o tipo ("aluno" ou "professor"). Aceita o formato antigo (um número só, vale para os dois).
function precoDe(valor, tipo) {
  const n = typeof valor === "number" ? valor : Number(valor && typeof valor === "object" ? valor[tipo] : undefined);
  return n > 0 ? n : null;
}

function desenharListaRevistas() {
  const lista = document.getElementById("alunoPedidoLista");
  lista.textContent = "";
  if (!catalogoRevistas.length) {
    lista.textContent = "Nenhuma revista cadastrada ainda.";
    return;
  }
  // Cabeçalho da tabela
  const cabecalho = document.createElement("div");
  cabecalho.className = "aluno-pedido-grade aluno-pedido-grade-cab";
  ["Revista", "Qtd.", "Tipo", "Valor total"].forEach((titulo) => {
    const celula = document.createElement("span");
    celula.textContent = titulo;
    cabecalho.appendChild(celula);
  });
  lista.appendChild(cabecalho);

  catalogoRevistas.forEach((r) => {
    const linha = document.createElement("div");
    linha.className = "aluno-pedido-linha aluno-pedido-grade";
    linha.dataset.revistaId = r.id;

    // Revista (com a sala que a usa, em letras menores)
    const rotulo = document.createElement("label");
    rotulo.className = "aluno-pedido-check";
    const marca = document.createElement("input");
    marca.type = "checkbox";
    const texto = document.createElement("span");
    const nome = document.createElement("strong");
    nome.textContent = r.nome;
    texto.appendChild(nome);
    if (r.salas.length) {
      const salas = document.createElement("small");
      salas.textContent = "Sala: " + r.salas.join(", ");
      texto.appendChild(document.createElement("br"));
      texto.appendChild(salas);
    }
    rotulo.append(marca, texto);

    const qtd = document.createElement("input");
    qtd.type = "number";
    qtd.min = "1";
    qtd.max = "50";
    qtd.value = "1";
    qtd.disabled = true;
    qtd.setAttribute("aria-label", "Quantidade de " + r.nome);

    // Tipo: revista de aluno ou de professor. Com mais de 1 revista, a divisão é perguntada ao fazer o pedido
    const tipo = document.createElement("select");
    tipo.setAttribute("aria-label", "Tipo de revista de " + r.nome);
    [["aluno", "Aluno"], ["professor", "Professor"]].forEach(([valor, textoOpcao]) => {
      const opt = document.createElement("option");
      opt.value = valor;
      opt.textContent = textoOpcao;
      tipo.appendChild(opt);
    });
    tipo.value = solicitanteModal && solicitanteModal.tipoPadrao ? solicitanteModal.tipoPadrao : "aluno";
    tipo.disabled = true;

    // Valor total desta revista (preenchido por atualizarCustoRevista)
    const valor = document.createElement("span");
    valor.className = "aluno-pedido-valor";
    valor.textContent = "—";

    // Mudou a escolha: a divisão deixa de valer
    const atualizarLinha = () => {
      delete linha.dataset.qtdAluno;
      delete linha.dataset.qtdProfessor;
      qtd.disabled = !marca.checked;
      tipo.disabled = !marca.checked || Number(qtd.value) > 1;
      atualizarCustoRevista();
    };
    marca.addEventListener("change", atualizarLinha);
    qtd.addEventListener("input", () => {
      delete linha.dataset.qtdAluno;
      delete linha.dataset.qtdProfessor;
      tipo.disabled = !marca.checked || Number(qtd.value) > 1;
      atualizarCustoRevista();
    });
    linha.append(rotulo, qtd, tipo, valor);
    lista.appendChild(linha);
  });
}

// Pergunta quantas revistas de cada pedido são de professor e quantas são de aluno.
// Devolve { revistaId: { qtdProfessor, qtdAluno } } ou null se o aluno cancelar.
function dividirRevistas(pendentes) {
  return new Promise((resolve) => {
    const modal = document.getElementById("alunoDividirModal");
    const lista = document.getElementById("alunoDividirLista");
    const status = document.getElementById("alunoDividirStatus");
    const confirmar = document.getElementById("alunoDividirConfirmar");
    const cancelar = document.getElementById("alunoDividirCancelar");
    lista.textContent = "";
    status.textContent = "";

    const campos = pendentes.map((p) => {
      const linha = document.createElement("div");
      linha.className = "aluno-pedido-linha";
      const nome = document.createElement("div");
      nome.className = "aluno-pedido-nome";
      nome.textContent = "REVISTA: " + p.nome + " (" + p.quantidade + ")";

      const prof = document.createElement("input");
      prof.type = "number";
      prof.min = "0";
      prof.max = String(p.quantidade);
      prof.value = "0";
      const alu = document.createElement("input");
      alu.type = "number";
      alu.min = "0";
      alu.max = String(p.quantidade);
      alu.value = String(p.quantidade);
      const rotProf = document.createElement("label");
      rotProf.className = "aluno-pedido-qtd";
      rotProf.append("Professor ", prof);
      const rotAlu = document.createElement("label");
      rotAlu.className = "aluno-pedido-qtd";
      rotAlu.append("Aluno ", alu);

      linha.append(nome, rotProf, rotAlu);
      lista.appendChild(linha);
      return { p, prof, alu };
    });

    const fechar = (resultado) => {
      modal.classList.remove("is-open");
      modal.hidden = true;
      cancelar.onclick = null;
      confirmar.onclick = null;
      resolve(resultado);
    };
    cancelar.onclick = () => fechar(null);
    confirmar.onclick = () => {
      const resultado = {};
      for (const c of campos) {
        const qProf = parseInt(c.prof.value, 10);
        const qAlu = parseInt(c.alu.value, 10);
        if (!(qProf >= 0) || !(qAlu >= 0) || qProf + qAlu !== c.p.quantidade) {
          status.textContent = "Para " + c.p.nome + ", a soma de professor e aluno deve ser " + c.p.quantidade + ".";
          return;
        }
        resultado[c.p.revistaId] = { qtdProfessor: qProf, qtdAluno: qAlu };
      }
      fechar(resultado);
    };

    modal.hidden = false;
    modal.classList.add("is-open");
  });
}

// Soma (preço × quantidade) das revistas marcadas. Se alguma marcada não tem preço, ou não há nada marcado, mostra "Sem preço no momento"
function atualizarCustoRevista() {
  const campo = document.getElementById("alunoPedidoCusto");
  let total = 0;
  let semPreco = false;
  let divisaoPendente = false;
  let marcadas = 0;
  document.querySelectorAll("#alunoPedidoLista .aluno-pedido-linha").forEach((linha) => {
    const marca = linha.querySelector("input[type=checkbox]");
    const celula = linha.querySelector(".aluno-pedido-valor");
    if (!marca.checked) {
      celula.textContent = "—";
      return;
    }
    marcadas++;
    const valorLinha = valorDaLinhaAluno(linha);
    if (valorLinha === null) {
      semPreco = true;
      celula.textContent = MSG_SEM_PRECO;
    } else if (valorLinha === "divisao") {
      divisaoPendente = true;
      celula.textContent = "Após a divisão";
    } else {
      total += valorLinha;
      celula.textContent = formatarReal(valorLinha);
    }
  });
  if (marcadas === 0 || semPreco) {
    campo.value = MSG_SEM_PRECO;
  } else if (divisaoPendente) {
    campo.value = "Valor após informar a divisão";
  } else {
    campo.value = formatarReal(total);
  }
}

// Valor de uma linha: número; "divisao" (mais de 1 revista, divisão ainda não informada); ou null (falta preço)
function valorDaLinhaAluno(linha) {
  const r = catalogoRevistas.find((x) => x.id === linha.dataset.revistaId);
  const qtd = parseInt(linha.querySelector("input[type=number]").value, 10);
  if (!r || !(qtd >= 1)) return null;
  // Quantas são de aluno e quantas de professor: do pedido já feito, ou pelo tipo (quando é 1 revista)
  let deAluno;
  let deProfessor;
  if (linha.dataset.qtdAluno !== undefined) {
    deAluno = Number(linha.dataset.qtdAluno);
    deProfessor = Number(linha.dataset.qtdProfessor);
  } else if (qtd === 1) {
    const ehProfessor = linha.querySelector("select").value === "professor";
    deAluno = ehProfessor ? 0 : 1;
    deProfessor = ehProfessor ? 1 : 0;
  } else {
    return "divisao";
  }
  if ((deAluno > 0 && r.precoAluno === null) || (deProfessor > 0 && r.precoProfessor === null)) return null;
  return deAluno * (r.precoAluno || 0) + deProfessor * (r.precoProfessor || 0);
}

// Volta a tela de solicitação para o estado inicial (nada marcado)
function limparListaPedido() {
  document.querySelectorAll("#alunoPedidoLista .aluno-pedido-linha").forEach((linha) => {
    linha.querySelector("input[type=checkbox]").checked = false;
    const qtd = linha.querySelector("input[type=number]");
    qtd.value = "1";
    qtd.disabled = true;
    const tipo = linha.querySelector("select");
    tipo.value = "aluno";
    tipo.disabled = true;
    delete linha.dataset.qtdAluno;
    delete linha.dataset.qtdProfessor;
  });
  document.getElementById("alunoPedidoStatus").textContent = "";
  atualizarCustoRevista();
}

// Já há pedido neste trimestre: pergunta se o aluno quer solicitar mais revistas (true = sim)
function confirmarMaisRevistas() {
  return new Promise((resolve) => {
    const nao = document.getElementById("alunoMaisNao");
    const sim = document.getElementById("alunoMaisSim");
    const fechar = (resposta) => {
      fecharModalAluno("alunoMaisRevistasModal");
      nao.onclick = null;
      sim.onclick = null;
      resolve(resposta);
    };
    nao.onclick = () => fechar(false);
    sim.onclick = () => fechar(true);
    abrirModalAluno("alunoMaisRevistasModal");
  });
}

// Pedidos ainda não entregues (a Secretaria dá baixa com status "entregue"), de qualquer trimestre
async function buscarPedidosEmAbertoAluno(uid) {
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, "pedidosRevistas"), where("uid", "==", uid)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.status !== "entregue")
    .sort((a, b) => (a.ano - b.ano) || (a.trimestre - b.trimestre));
}

// Preços das revistas de um trimestre (vazio se ainda não cadastrados)
async function precosDoTrimestre(ano, trimestre) {
  const snap = await getDoc(doc(db, "configRevistas", `precos_${ano}_${trimestre}`)).catch(() => null);
  return snap && snap.exists() && snap.data().precos ? snap.data().precos : {};
}

// Meu pedido (somente leitura): tudo o que o aluno pediu e ainda não foi entregue, de qualquer trimestre, com o valor total
async function abrirMeuPedido(sol = solicitanteAluno()) {
  if (!sol) return;
  const lista = document.getElementById("alunoMeuPedidoLista");
  const total = document.getElementById("alunoMeuPedidoTotal");
  lista.textContent = "Carregando...";
  total.textContent = "";
  abrirModalAluno("alunoMeuPedidoModal");
  try {
    const pedidos = await buscarPedidosEmAbertoAluno(sol.uid);
    lista.textContent = "";
    // Sem pedido pendente: o botão Meu pedido some (a baixa da Secretaria já aconteceu)
    if (!pedidos.length) {
      document.getElementById("btnAlunoMeuPedido")?.remove();
      document.getElementById("btnProfMeuPedido")?.remove();
    }

    const cabecalho = document.createElement("div");
    cabecalho.className = "aluno-pedido-grade aluno-pedido-grade-cab";
    ["Revista", "Qtd.", "Tipo", "Valor total"].forEach((titulo) => {
      const celula = document.createElement("span");
      celula.textContent = titulo;
      cabecalho.appendChild(celula);
    });
    lista.appendChild(cabecalho);

    if (!pedidos.length) {
      const vazio = document.createElement("div");
      vazio.className = "aluno-pedido-vazio";
      vazio.textContent = "Nenhum pedido em aberto.";
      lista.appendChild(vazio);
    }

    let soma = 0;
    let semPreco = false;
    const precosPorTrimestre = {};
    for (const p of pedidos) {
      const chave = p.ano + "_" + p.trimestre;
      if (!precosPorTrimestre[chave]) precosPorTrimestre[chave] = await precosDoTrimestre(p.ano, p.trimestre);
      const precos = precosPorTrimestre[chave];

      // Cabeçalho do trimestre do pedido (cada pedido tem o seu preço)
      const trimestre = document.createElement("div");
      trimestre.className = "aluno-pedido-trim";
      trimestre.textContent = p.trimestre + "º trimestre de " + p.ano;
      lista.appendChild(trimestre);

      (p.itens || []).forEach((i) => {
        const qAluno = i.qtdAluno !== undefined ? Number(i.qtdAluno) : Number(i.quantidade) || 0;
        const qProfessor = Number(i.qtdProfessor) || 0;
        [["Aluno", qAluno, precoDe(precos[i.revistaId], "aluno")], ["Professor", qProfessor, precoDe(precos[i.revistaId], "professor")]].forEach(([tipoTexto, q, preco]) => {
          if (!(q > 0)) return;
          let valorTexto = MSG_SEM_PRECO;
          if (preco === null) {
            semPreco = true;
          } else {
            soma += preco * q;
            valorTexto = formatarReal(preco * q);
          }
          const linha = document.createElement("div");
          linha.className = "aluno-pedido-grade aluno-pedido-linha";
          [i.nome || "", String(q), tipoTexto, valorTexto].forEach((texto) => {
            const celula = document.createElement("span");
            celula.textContent = texto;
            linha.appendChild(celula);
          });
          lista.appendChild(linha);
        });
      });
    }
    total.textContent = formatarReal(soma) + (semPreco ? " (alguns sem preço)" : "");
  } catch (err) {
    console.error("Erro ao carregar seu pedido:", err);
    lista.textContent = "Não foi possível carregar seu pedido agora.";
  }
}

async function enviarPedidoRevista() {
  const status = document.getElementById("alunoPedidoStatus");
  const enviar = document.getElementById("alunoPedidoEnviar");
  const periodo = proximoTrimestre();

  const escolhidas = [];
  document.querySelectorAll("#alunoPedidoLista .aluno-pedido-linha").forEach((linha) => {
    const marca = linha.querySelector("input[type=checkbox]");
    if (!marca.checked) return;
    const qtd = parseInt(linha.querySelector("input[type=number]").value, 10);
    const revista = catalogoRevistas.find((r) => r.id === linha.dataset.revistaId);
    escolhidas.push({
      revistaId: linha.dataset.revistaId,
      nome: revista ? revista.nome : "",
      quantidade: qtd,
      tipo: linha.querySelector("select").value
    });
  });

  if (!escolhidas.length) {
    status.textContent = "Marque pelo menos uma revista.";
    return;
  }
  if (escolhidas.some((i) => !(i.quantidade >= 1))) {
    status.textContent = "Informe uma quantidade válida (1 ou mais) para cada revista marcada.";
    return;
  }

  // Mais de 1 revista da mesma escolha: pergunta quantas são de professor e quantas de aluno
  const pendentes = escolhidas.filter((i) => i.quantidade > 1);
  let divisao = {};
  if (pendentes.length) {
    divisao = await dividirRevistas(pendentes);
    if (!divisao) return; // cancelado: nada é gravado
  }

  const itens = escolhidas.map((i) => {
    if (divisao[i.revistaId]) {
      return { revistaId: i.revistaId, nome: i.nome, quantidade: i.quantidade, ...divisao[i.revistaId] };
    }
    return {
      revistaId: i.revistaId,
      nome: i.nome,
      quantidade: i.quantidade,
      qtdAluno: i.tipo === "aluno" ? i.quantidade : 0,
      qtdProfessor: i.tipo === "professor" ? i.quantidade : 0
    };
  });

  // Já fez pedido neste trimestre: pergunta antes de pedir mais (a secretaria cancela, se precisar)
  const sol = solicitanteModal;
  if (!sol) return;
  const anteriores = await buscarPedidosAluno(periodo.ano, periodo.trimestre, sol.uid);
  if (anteriores.length && !(await confirmarMaisRevistas())) return;

  enviar.disabled = true;
  try {
    // Pedido novo do trimestre: o id é único (o primeiro usa o id padrão do trimestre)
    const base = `${sol.uid}_${periodo.ano}_${periodo.trimestre}`;
    const idPedido = anteriores.length ? `${base}_${Date.now()}` : base;
    await setDoc(doc(db, "pedidosRevistas", idPedido), {
      uid: sol.uid,
      alunoNome: sol.nome || "",
      salaId: sol.salaId,
      salaNome: sol.salaNome || "",
      ano: periodo.ano,
      trimestre: periodo.trimestre,
      itens: itens,
      status: "pendente",
      criadoEm: serverTimestamp()
    });
    limparListaPedido();
    fecharPedidoRevista();
    if (sol.aoMudar) {
      sol.aoMudar();
    } else {
      carregarAvisos();
      carregarRecursos();
    }
    window.notificar("Confirmado! Seu pedido de revista foi enviado à Secretaria da EBD.", "success");
  } catch (err) {
    console.error("Erro ao fazer o pedido de revista:", err);
    status.textContent = "Não foi possível fazer o pedido agora. Tente de novo.";
    window.notificar("Não foi possível fazer o pedido. Tente de novo.", "error");
    enviar.disabled = false;
  }
}

// ---------- Sala do Professor: mesmo pop-up de pedido, com o professor como solicitante ----------
// sol = { uid, nome, salaId, salaNome, tipoPadrao: "professor", aoMudar }
export function abrirSolicitarRevistaComo(sol) {
  return abrirSolicitarRevista(sol);
}
export function abrirMeuPedidoComo(sol) {
  return abrirMeuPedido(sol);
}
export async function temPedidoRevistaComo(sol) {
  return (await buscarPedidosEmAbertoAluno(sol.uid)).length > 0;
}

// Área do Aluno reaberta: recalcula o botão Meu pedido (index.html chama em mostrarArea)
window.__recarregarRecursosAluno = () => carregarRecursos();

// Revista de professor: abre a Sala de Aula (leitor, lições, Bíblia e anexos) com a revista do professor
// Chamada pelo botão "Acessar Revista de Professor" da Sala do Professor
async function abrirRevistaProfessor(salaId, nomeSala) {
  if (!salaId) return;
  modoRevistaProfessor = true;
  await preencherSeletorDeSalas();
  const selTrimestre = document.getElementById("alunoTrimestre");
  selTrimestre.innerHTML = "";
  for (let k = 1; k <= 4; k++) {
    const opt = document.createElement("option");
    opt.value = String(k);
    opt.textContent = `${k}º Trimestre ${ANO}`;
    selTrimestre.appendChild(opt);
  }
  if (!controlesLigados) {
    controlesLigados = true;
    selTrimestre.addEventListener("change", carregarAulasDoTrimestre);
    document.getElementById("alunoSala").addEventListener("change", (e) => selecionarSala(e.target.value));
    document.getElementById("btnAlunoEntrar").addEventListener("click", abrirSalaDeAula);
    document.getElementById("btnAlunoVoltar").addEventListener("click", voltarParaPainel);
  }
  salaIdAluno = salaId;
  nomeSalaAluno = nomeSala || "";
  document.getElementById("alunoSala").value = salaId;
  document.getElementById("btnAlunoEntrar").disabled = false;
  selTrimestre.value = String(TRIMESTRE_ATUAL);
  await carregarAulasDoTrimestre();
  if (window.__mostrarArea) window.__mostrarArea("areaAluno");
  abrirSalaDeAula();
}
window.__abrirRevistaProfessor = abrirRevistaProfessor;
