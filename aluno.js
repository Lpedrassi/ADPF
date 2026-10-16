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

  // Lista todas as salas; a matriculada vem selecionada, mas o aluno pode escolher outra
  await preencherSeletorDeSalas();
  // Regra: o aluno só pode estar em 1 Sala (o cadastro já garante isso)
  selecionarSala(salaIds[0]);

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
    document.getElementById("btnAlunoVoltarRevista").addEventListener("click", voltarDaSolicitacaoRevista);
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
