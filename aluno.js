// aluno.js - Sala do Aluno: Próxima Aula, Boletim, Avisos, Recursos

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// Reaproveita app do Firebase se já foi criado
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Carrega dados da Sala do Aluno quando logado
onAuthStateChanged(auth, async (user) => {
  if (user && document.getElementById("areaAluno")) {
    try {
      await carregarProximaAula(user.uid);
      await carregarBoletim(user.uid);
      carregarAvisos();
      carregarRecursos();
    } catch (err) {
      console.error("Erro ao carregar Sala do Aluno:", err);
    }
  }
});

// 1. Próxima Aula
async function carregarProximaAula(uid) {
  const el = document.getElementById("alunoProximaAula");

  try {
    // Buscar dados do aluno
    const userRef = collection(db, "users");
    const q = query(userRef, where("uid", "==", uid));
    const userSnap = await getDocs(q);

    if (userSnap.empty) {
      el.innerHTML = "<p>Aluno não encontrado</p>";
      return;
    }

    const userData = userSnap.docs[0].data();
    const turmaId = userData.turmaId;

    if (!turmaId) {
      el.innerHTML = "<p>Você ainda não está registrado em nenhuma turma</p>";
      return;
    }

    // Buscar turma
    const turmasRef = collection(db, "turmas");
    const turmaQuery = query(turmasRef, where("id", "==", turmaId));
    const turmaSnap = await getDocs(turmaQuery);

    if (turmaSnap.empty) {
      el.innerHTML = "<p>Turma não encontrada</p>";
      return;
    }

    const turmaData = turmaSnap.docs[0].data();
    const nomeTurma = turmaData.nome || "Turma desconhecida";
    const professor = turmaData.professores ? turmaData.professores[0] : "A definir";

    // Próxima aula é sempre domingo (EBD)
    const hoje = new Date();
    const proximoDomingo = new Date(hoje);
    const diasAteProximoDomingo = (7 - hoje.getDay()) % 7 || 7;
    proximoDomingo.setDate(hoje.getDate() + diasAteProximoDomingo);

    const dataFormatada = proximoDomingo.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });

    el.innerHTML = `
      <div style="font-size: 13px; color: var(--ink);">
        <strong>EBD - Domingo</strong><br>
        ${dataFormatada} às 10h<br><br>
        <span style="color: var(--muted);">Turma:</span> ${nomeTurma}<br>
        <span style="color: var(--muted);">Professor:</span> ${professor}
      </div>
    `;
  } catch (err) {
    console.error("Erro ao carregar próxima aula:", err);
    el.innerHTML = "<p>Erro ao carregar informações</p>";
  }
}

// 2. Boletim de Presenças
async function carregarBoletim(uid) {
  const el = document.getElementById("alunoBoletim");

  try {
    // Buscar relatórios do aluno
    const relatoriosRef = collection(db, "relatorios");
    const q = query(relatoriosRef, where("alunoId", "==", uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      el.innerHTML = `
        <div class="aluno-card-stats">
          <div class="stat"><span class="stat-valor">0</span><span class="stat-label">Presenças</span></div>
          <div class="stat"><span class="stat-valor">0</span><span class="stat-label">Faltas</span></div>
          <div class="stat"><span class="stat-valor">--%</span><span class="stat-label">Assiduidade</span></div>
        </div>
        <p style="font-size: 12px; color: var(--muted); margin-top: 8px;">Nenhum registro de presenças ainda</p>
      `;
      return;
    }

    // Contar presenças
    let presenças = 0;
    let faltas = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.presente) presenças++;
      else faltas++;
    });

    const total = presenças + faltas;
    const assiduidade = total > 0 ? Math.round((presenças / total) * 100) : 0;

    el.innerHTML = `
      <div class="aluno-card-stats">
        <div class="stat"><span class="stat-valor">${presenças}</span><span class="stat-label">Presenças</span></div>
        <div class="stat"><span class="stat-valor">${faltas}</span><span class="stat-label">Faltas</span></div>
        <div class="stat"><span class="stat-valor">${assiduidade}%</span><span class="stat-label">Assiduidade</span></div>
      </div>
    `;
  } catch (err) {
    console.error("Erro ao carregar boletim:", err);
    el.innerHTML = "<p>Erro ao carregar boletim</p>";
  }
}

// 3. Avisos (estático por enquanto)
function carregarAvisos() {
  const el = document.getElementById("alunoAvisos");

  const avisos = [
    "🔔 Santa Ceia — Próximo domingo (29/09)",
    "📢 Congresso UFADEJ — 28 a 30 de Setembro",
    "📚 Revista da EBD disponível — Pegue com seu professor"
  ];

  const html = avisos.map(aviso =>
    `<div class="aluno-card-lista-item">
      <div class="aluno-card-lista-icon">${aviso.split("—")[0]}</div>
      <div>${aviso.split("—")[1]?.trim() || aviso}</div>
    </div>`
  ).join("");

  el.innerHTML = `<div style="margin-top: 8px;">${html}</div>`;
}

// 4. Recursos (links/materiais)
function carregarRecursos() {
  const el = document.getElementById("alunoRecursos");

  const recursos = [
    { icon: "📖", nome: "Revista da EBD", descricao: "Pegue com seu professor" },
    { icon: "🎥", nome: "Vídeos de Lições", descricao: "Em breve disponível" },
    { icon: "🙏", nome: "Versículos da Semana", descricao: "Acompanhe as lições" }
  ];

  const html = recursos.map(r =>
    `<div class="aluno-card-lista-item">
      <div class="aluno-card-lista-icon">${r.icon}</div>
      <div>
        <strong style="color: var(--ink);">${r.nome}</strong><br>
        <span style="font-size: 12px;">${r.descricao}</span>
      </div>
    </div>`
  ).join("");

  el.innerHTML = `<div style="margin-top: 8px;">${html}</div>`;
}
