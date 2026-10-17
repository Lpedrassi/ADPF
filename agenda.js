// agenda.js - Agenda de Cultos e Eventos (Congregação Florianópolis + Setor)
//
// Este arquivo tem duas partes:
//   1) Funções de dados (ler, salvar, excluir, importar) - usadas tanto pela
//      página pública (index.html) quanto pelo painel de admin (portal-ebd.html).
//   2) Lógica de exibição pública (o calendário que aparece no site, dentro
//      da seção "Agenda") - só roda se os elementos dela existirem na página.
//
// Como usar:
//   <script type="module" src="agenda.js"></script>
// (ele já importa o firebase-config.js sozinho, igual o auth.js)

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Reaproveita o app do Firebase se ele já foi criado por outro script (ex.: auth.js)
// nesta mesma página, em vez de tentar criar de novo (o que dá erro).
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const NOME_COLECAO = "agenda";
const DEPARTAMENTOS_PADRAO = ["Infantil", "Adolescentes", "Jovens", "Varões", "Feminino", "Missões", "Culto"];

export async function buscarDepartamentosAgenda() {
  const snap = await getDoc(doc(db, "configAgenda", "departamentos"));
  return snap.exists() && Array.isArray(snap.data().lista) ? snap.data().lista : DEPARTAMENTOS_PADRAO.slice();
}

export async function salvarDepartamentosAgenda(lista) {
  await setDoc(doc(db, "configAgenda", "departamentos"), { lista });
}
const DOC_MARCADOR_IMPORT = "agenda_meta/import_2026"; // evita importar 2x

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const DIAS_SEMANA_PT = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"
];

// =================================================================
// 1) FUNÇÕES DE DADOS (Firestore)
// =================================================================

let _cacheEventos = null;

/** Busca todos os eventos da agenda (usa um cache simples em memória). */
export async function buscarTodosEventos(forcarRecarregar = false) {
  if (_cacheEventos && !forcarRecarregar) return _cacheEventos;
  const snap = await getDocs(collection(db, NOME_COLECAO));
  const lista = [];
  snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
  lista.sort((a, b) => (a.dataInicio || "").localeCompare(b.dataInicio || ""));
  _cacheEventos = lista;
  return lista;
}

/**
 * Cria um evento novo. `dados` deve ter: escopo, dataInicio, dataFim, titulo, hora,
 * categoria, observacao, outrasDatas (opcional).
 *
 * Campos extras usados quando escopo === "setor":
 *   - congregacoesSetor: array com os nomes das congregações envolvidas no evento.
 *   - duplicadoDoSetor: true quando este documento é a cópia automática (gerada
 *     ao confirmar o popup "adicionar também na Agenda da Congregação?") de um
 *     evento originalmente cadastrado como Setor — ajuda a identificar, na lista
 *     do painel, que aquele registro da Congregação não foi digitado à mão.
 */
export async function salvarEvento(dados) {
  const registro = {
    escopo: dados.escopo,
    tipo: dados.tipo || null,
    dataInicio: dados.dataInicio,
    dataFim: dados.dataFim || dados.dataInicio,
    outrasDatas: dados.outrasDatas || [],
    titulo: dados.titulo,
    hora: dados.hora || null,
    categoria: dados.categoria || null,
    observacao: dados.observacao || null,
    congregacoesSetor: dados.congregacoesSetor || [],
    duplicadoDoSetor: dados.duplicadoDoSetor || false,
    atualizadoEm: serverTimestamp()
  };
  if (dados.id) {
    await updateDoc(doc(db, NOME_COLECAO, dados.id), registro);
  } else {
    registro.criadoEm = serverTimestamp();
    await addDoc(collection(db, NOME_COLECAO), registro);
  }
  _cacheEventos = null; // força recarregar na próxima leitura
}

/** Remove um evento pelo id do documento. */
export async function renomearCategoriaEventos(antigo, novo) {
  const snap = await getDocs(collection(db, NOME_COLECAO));
  const lote = writeBatch(db);
  let total = 0;
  snap.forEach((d) => {
    if (d.data().categoria === antigo) {
      lote.update(d.ref, { categoria: novo });
      total++;
    }
  });
  if (total > 0) await lote.commit();
}

export async function excluirEvento(id) {
  await deleteDoc(doc(db, NOME_COLECAO, id));
  _cacheEventos = null;
}

// =================================================================
// 2) EXIBIÇÃO PÚBLICA (seção "Agenda" do site) — só roda se existir na página
// =================================================================

function formatarDataCurta(dataISO) {
  // "2026-09-27" -> "27/09"
  const [, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}`;
}

/**
 * Período compacto para exibição em uma única linha na lista da Agenda:
 * "27/09" (dia único), "04 a 05/09" (período no mesmo mês) ou
 * "28/08 a 02/09" (período que atravessa o mês). Não trata datas alternadas
 * (outrasDatas) - para isso use datasIndividuais().
 */
function formatarPeriodoCompacto(evento) {
  if (!evento.dataFim || evento.dataFim === evento.dataInicio) {
    return formatarDataCurta(evento.dataInicio);
  }
  const [anoI, mesI, diaI] = evento.dataInicio.split("-");
  const [anoF, mesF, diaF] = evento.dataFim.split("-");
  if (anoI === anoF && mesI === mesF) {
    return `${diaI} a ${diaF}/${mesF}`;
  }
  return `${formatarDataCurta(evento.dataInicio)} a ${formatarDataCurta(evento.dataFim)}`;
}

/**
 * Lista de datas avulsas (dataInicio + outrasDatas) já formatadas como "dd/mm",
 * em ordem - para eventos com datas alternadas, mostradas uma embaixo da outra.
 */
function datasIndividuais(evento) {
  const todas = [evento.dataInicio, ...(evento.outrasDatas || [])].sort();
  return todas.map(formatarDataCurta);
}

/** Data de hoje no formato "AAAA-MM-DD" (fuso local do navegador de quem visita o site). */
function hojeISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function nomeDiaDaSemana(dataISO) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return DIAS_SEMANA_PT[new Date(ano, mes - 1, dia).getDay()];
}

/** Última data "relevante" do evento (fim, ou a maior das datas alternadas, ou o início). */
function ultimaDataEvento(evento) {
  const datas = [evento.dataInicio];
  if (evento.dataFim) datas.push(evento.dataFim);
  if (evento.outrasDatas && evento.outrasDatas.length) datas.push(...evento.outrasDatas);
  return datas.filter(Boolean).sort().pop();
}

function eventoJaConcluido(evento, hojeISOStr) {
  return ultimaDataEvento(evento) < hojeISOStr;
}

/** Filtra só os eventos que ainda não terminaram, ordenados do mais próximo para o mais distante. */
function ordenarProximos(lista, hojeISOStr) {
  return lista
    .filter((ev) => !eventoJaConcluido(ev, hojeISOStr))
    .sort((a, b) => (a.dataInicio || "").localeCompare(b.dataInicio || ""));
}

function eventoEsteMes(evento, ano, mesIndex) {
  // Considera o evento "deste mês" se o início, o fim OU alguma das outras datas cair dentro do mês
  // (cobre eventos que atravessam a virada do mês e eventos com datas alternadas).
  const dentro = (dataISO) => {
    const [y, m] = dataISO.split("-").map(Number);
    return y === ano && (m - 1) === mesIndex;
  };
  if (dentro(evento.dataInicio)) return true;
  if (evento.dataFim && dentro(evento.dataFim)) return true;
  if (evento.outrasDatas && evento.outrasDatas.some(dentro)) return true;
  return false;
}

function montarItemLista(evento, destaque) {
  const li = document.createElement("li");
  li.className = "agenda-item" + (destaque ? " agenda-item-proximo" : "");

  const data = document.createElement("div");
  data.className = "agenda-item-data";
  if (evento.outrasDatas && evento.outrasDatas.length > 0) {
    datasIndividuais(evento).forEach((texto) => {
      const linha = document.createElement("span");
      linha.className = "agenda-item-data-linha";
      linha.textContent = texto;
      data.appendChild(linha);
    });
  } else {
    const linha = document.createElement("span");
    linha.className = "agenda-item-data-linha";
    linha.textContent = formatarPeriodoCompacto(evento);
    data.appendChild(linha);
  }

  const corpo = document.createElement("div");
  corpo.className = "agenda-item-corpo";

  // Título e horário na mesma linha (data | título .......... horário)
  const linha = document.createElement("div");
  linha.className = "agenda-item-linha";

  const titulo = document.createElement("span");
  titulo.className = "agenda-item-titulo";
  titulo.textContent = evento.titulo;
  linha.appendChild(titulo);

  if (evento.hora) {
    const hora = document.createElement("span");
    hora.className = "agenda-item-hora";
    hora.textContent = evento.hora;
    linha.appendChild(hora);
  }

  corpo.appendChild(linha);

  if (evento.observacao) {
    const obs = document.createElement("span");
    obs.className = "agenda-item-obs";
    obs.textContent = evento.observacao;
    corpo.appendChild(obs);
  }

  li.appendChild(data);
  li.appendChild(corpo);
  return li;
}

async function iniciarAgendaPublica() {
  const elMesAtual = document.getElementById("agendaMesAtual");
  const elListaCongregacao = document.getElementById("agendaCongregacaoLista");
  const elListaSetor = document.getElementById("agendaSetorLista");
  const btnAnterior = document.getElementById("agendaMesAnterior");
  const btnProximo = document.getElementById("agendaMesProximo");

  if (!elMesAtual || !elListaCongregacao || !elListaSetor) return; // não está nesta página

  const hoje = new Date();
  let ano = 2026;
  let mesIndex = hoje.getFullYear() === 2026 ? hoje.getMonth() : 8; // cai em Setembro (índice 8) se não for 2026

  async function renderizarMesAtual() {
    elMesAtual.textContent = `${MESES_PT[mesIndex]} de ${ano}`;
    elListaCongregacao.innerHTML = '<li class="agenda-vazio">Carregando...</li>';
    elListaSetor.innerHTML = '<li class="agenda-vazio">Carregando...</li>';

    let todos;
    try {
      todos = await buscarTodosEventos();
    } catch (err) {
      elListaCongregacao.innerHTML = '<li class="agenda-vazio">Não foi possível carregar a agenda agora.</li>';
      elListaSetor.innerHTML = "";
      console.error(err);
      return;
    }

    const doMes = todos.filter((ev) => eventoEsteMes(ev, ano, mesIndex));
    const congregacao = doMes.filter((ev) => ev.escopo === "congregacao");
    const setor = doMes.filter((ev) => ev.escopo === "setor");

    // O "próximo evento" de cada agenda é calculado sobre TODOS os eventos (não só os
    // deste mês) - só recebe a borda dourada se, além de ser o próximo, ele aparecer
    // no mês que está sendo exibido agora.
    const hojeStr = hojeISO();
    const proximoCongregacao = ordenarProximos(
      todos.filter((ev) => ev.escopo === "congregacao"),
      hojeStr
    )[0];
    const proximoSetor = ordenarProximos(
      todos.filter((ev) => ev.escopo === "setor"),
      hojeStr
    )[0];

    elListaCongregacao.innerHTML = "";
    if (congregacao.length === 0) {
      elListaCongregacao.innerHTML = '<li class="agenda-vazio">Nenhum evento cadastrado para este mês.</li>';
    } else {
      congregacao.forEach((ev) =>
        elListaCongregacao.appendChild(montarItemLista(ev, proximoCongregacao && ev.id === proximoCongregacao.id))
      );
    }

    elListaSetor.innerHTML = "";
    if (setor.length === 0) {
      elListaSetor.innerHTML = '<li class="agenda-vazio">Nenhum evento cadastrado para este mês.</li>';
    } else {
      setor.forEach((ev) =>
        elListaSetor.appendChild(montarItemLista(ev, proximoSetor && ev.id === proximoSetor.id))
      );
    }
  }

  btnAnterior?.addEventListener("click", () => {
    mesIndex -= 1;
    if (mesIndex < 0) { mesIndex = 11; ano -= 1; }
    renderizarMesAtual();
  });

  btnProximo?.addEventListener("click", () => {
    mesIndex += 1;
    if (mesIndex > 11) { mesIndex = 0; ano += 1; }
    renderizarMesAtual();
  });

  // Se o próximo evento está no próximo mês, já carrega o calendário do próximo mês
  async function inicializarComMesCorreto() {
    try {
      const todos = await buscarTodosEventos();
      const hojeStr = hojeISO();
      const proximoEvento = ordenarProximos(todos, hojeStr)[0];
      
      if (proximoEvento) {
        const [anoEvento, mesEvento, diaEvento] = proximoEvento.dataInicio.split("-");
        const mesEventoIndex = parseInt(mesEvento) - 1; // converter para índice (0-11)
        
        // Se o próximo evento está em um mês diferente do mês atual, pula para esse mês
        if (mesEventoIndex !== mesIndex || parseInt(anoEvento) !== ano) {
          mesIndex = mesEventoIndex;
          ano = parseInt(anoEvento);
        }
      }
    } catch (err) {
      console.error("Erro ao inicializar com mês correto:", err);
    }
    renderizarMesAtual();
  }

  inicializarComMesCorreto();
}

// =================================================================
// 3) CARDS "PRÓXIMOS CULTOS E EVENTOS" (seção "Cultos e encontros")
// =================================================================

/**
 * Preenche os três cards da seção "Cultos, Encontros e Eventos" com a Agenda:
 *   - Card azul: próximo culto da Congregação (tipo "culto").
 *   - Card dourado: próximo evento ou encontro da Congregação (tipo "evento").
 *   - Card laranja: próximo evento do Setor (escopo "setor").
 * Eventos antigos sem tipo usam "culto" se o título começar com "Culto".
 */
async function preencherProximosCultos() {
  const el = (id) => document.getElementById(id);
  const cards = [
    { tag: el("cultoCardCultoTag"), titulo: el("cultoCardCultoTitulo"), desc: el("cultoCardCultoDesc") },
    { tag: el("cultoCardEventoTag"), titulo: el("cultoCardEventoTitulo"), desc: el("cultoCardEventoDesc") },
    { tag: el("cultoCardSetorTag"), titulo: el("cultoCardSetorTitulo"), desc: el("cultoCardSetorDesc") }
  ];
  if (cards.some((c) => !c.tag)) return; // não está nesta página

  let todos;
  try {
    todos = await buscarTodosEventos();
  } catch (err) {
    console.error(err);
    return; // mantém o texto padrão que já está no HTML
  }

  const hoje = hojeISO();
  const tipoDe = (ev) => ev.tipo || (/^culto/i.test((ev.titulo || "").trim()) ? "culto" : "evento");
  const daCongregacao = todos.filter((ev) => ev.escopo !== "setor");
  const doSetor = todos.filter((ev) => ev.escopo === "setor");

  const proximos = [
    ordenarProximos(daCongregacao.filter((ev) => tipoDe(ev) === "culto"), hoje)[0] || null,
    ordenarProximos(daCongregacao.filter((ev) => tipoDe(ev) === "evento"), hoje)[0] || null,
    ordenarProximos(doSetor, hoje)[0] || null
  ];

  const rotuloData = (ev) => {
    const [, mes, dia] = ev.dataInicio.split("-");
    const data = `${nomeDiaDaSemana(ev.dataInicio)} ${dia}/${mes}`;
    return ev.hora ? `${data} · ${ev.hora}` : data;
  };

  const descricao = (ev) => {
    const partes = [];
    if (ev.categoria) partes.push(`Departamento: ${ev.categoria}`);
    if (ev.observacao) partes.push(ev.observacao);
    return partes.length ? partes.join(" — ") : "Confira os detalhes na Agenda.";
  };

  cards.forEach((card, idx) => {
    const ev = proximos[idx];
    if (ev) {
      card.tag.textContent = rotuloData(ev);
      card.titulo.textContent = ev.titulo;
      card.desc.textContent = descricao(ev);
    } else {
      card.tag.textContent = "Em breve";
      card.titulo.textContent = "Nenhum agendamento";
      card.desc.textContent = "Confira a Agenda em breve.";
    }
  });
}

iniciarAgendaPublica();
preencherProximosCultos();
