// celular-login.js: login por celular + senha.
// O Firebase Auth só entra com e-mail. Para aceitar o celular, guardamos um índice
// público em "loginCelular/{hash}", onde o hash é o SHA-256 do celular (só dígitos).
// Cada índice tem { uid, email }. A regra do Firestore deixa ler por hash exato, sem listar.

import { getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const bancoDeDados = () => getFirestore(getApp());

// "(19)  9 9999-9999" -> "19999999999". Aceita fixo (10 dígitos) e celular (11).
// Com DDI 55 na frente, remove o 55. Devolve "" se não for um telefone válido.
export function normalizarCelular(texto) {
  let digitos = String(texto || "").replace(/\D/g, "");
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }
  return digitos.length === 10 || digitos.length === 11 ? digitos : "";
}

// SHA-256 em hexadecimal (crypto.subtle só existe em página segura: https ou localhost)
export async function hashCelular(celularDigitos) {
  const bytes = new TextEncoder().encode(celularDigitos);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Nome de usuário: sem espaços nem barras (vira o id do índice "loginUsuario/{nome}")
export function normalizarNomeUsuario(texto) {
  const nome = String(texto || "").trim().toLowerCase();
  return /^[a-z0-9._-]{3,30}$/.test(nome) ? nome : "";
}

// Validação ao salvar: o celular/usuário já pertence a OUTRA conta? (true = em uso)
export async function celularEmUsoPorOutro(texto, uid) {
  const celular = normalizarCelular(texto);
  if (!celular) return false;
  const snap = await getDoc(doc(bancoDeDados(), "loginCelular", await hashCelular(celular)));
  return snap.exists() && snap.data().uid !== uid;
}

export async function nomeUsuarioEmUsoPorOutro(texto, uid) {
  const nome = normalizarNomeUsuario(texto);
  if (!nome) return false;
  const snap = await getDoc(doc(bancoDeDados(), "loginUsuario", nome));
  return snap.exists() && snap.data().uid !== uid;
}

// Validação de e-mail: outro cadastro (em usuarios) já usa esse e-mail? Só admin lê a lista toda.
export async function emailEmUsoPorOutro(email, uid) {
  const limpo = String(email || "").trim().toLowerCase();
  if (!limpo) return false;
  try {
    const snap = await getDocs(query(collection(bancoDeDados(), "usuarios"), where("email", "==", limpo)));
    return snap.docs.some((d) => d.id !== uid);
  } catch (err) {
    // Quem não é admin não pode listar usuarios: nesse caso o próprio Firebase Auth já recusa e-mail repetido
    return false;
  }
}

// Quando o e-mail muda, os índices de celular e de nome de usuário passam a apontar para o novo e-mail
export async function atualizarEmailNosIndices({ uid, email, celularHash, usuario }) {
  const banco = bancoDeDados();
  if (celularHash) {
    await setDoc(doc(banco, "loginCelular", celularHash), { uid: uid, email: email });
  }
  const nome = normalizarNomeUsuario(usuario);
  if (nome) {
    await setDoc(doc(banco, "loginUsuario", nome), { uid: uid, email: email });
  }
}

// Valida tudo antes de salvar. Devolve a mensagem de erro ("" se estiver tudo certo).
// Checa no banco: nome de usuário (formato e duplicidade), celular (duplicidade) e,
// se informado, e-mail (duplicidade).
export async function validarDadosUnicos({ uid, usuario, telefone, email }) {
  if (usuario && !normalizarNomeUsuario(usuario)) {
    return "Nome de usuário: use de 3 a 30 letras, números, ponto, traço ou underline (sem espaços).";
  }
  if (await nomeUsuarioEmUsoPorOutro(usuario, uid)) return "Esse nome de usuário já está em uso.";
  if (await celularEmUsoPorOutro(telefone, uid)) return "Esse celular já está cadastrado em outra conta.";
  if (email !== undefined && (await emailEmUsoPorOutro(email, uid))) return "Esse e-mail já está cadastrado em outra conta.";
  return "";
}

// Mantém o índice do nome de usuário (apaga o antigo se trocou)
export async function sincronizarNomeUsuario({ uid, usuario, usuarioAnterior, email }) {
  const nome = normalizarNomeUsuario(usuario);
  const anterior = normalizarNomeUsuario(usuarioAnterior);
  const banco = bancoDeDados();
  if (nome && email) {
    try {
      await setDoc(doc(banco, "loginUsuario", nome), { uid: uid, email: email });
    } catch (err) {
      if (err.code === "permission-denied") throw new Error("Esse nome de usuário já está em uso.");
      throw err;
    }
  }
  if (anterior && anterior !== nome) {
    try {
      await deleteDoc(doc(banco, "loginUsuario", anterior));
    } catch (err) {
      console.error("Não foi possível apagar o nome de usuário antigo.", err);
    }
  }
}

// Mantém o índice do celular de um usuário.
// - uid, email: a conta (o e-mail é o que o login usa)
// - telefone: o que está digitado no perfil (qualquer formato)
// - hashAnterior: o hash guardado no próprio usuário (campo "celularHash"), para apagar o índice antigo
// Devolve o novo hash ("" se o usuário ficou sem celular). Lança erro se o celular já é de outra conta.
export async function sincronizarCelularLogin({ uid, email, telefone, hashAnterior }) {
  const celular = normalizarCelular(telefone);
  const novoHash = celular ? await hashCelular(celular) : "";
  const banco = bancoDeDados();

  // Sem e-mail não há como fazer login: não grava o índice (evita índice com e-mail vazio)
  if (novoHash && email) {
    // Se o hash já existe e é de outra conta, a regra recusa a gravação
    try {
      await setDoc(doc(banco, "loginCelular", novoHash), { uid: uid, email: email });
    } catch (err) {
      if (err.code === "permission-denied") {
        throw new Error("Esse celular já está cadastrado em outra conta.");
      }
      throw err;
    }
  }
  if (hashAnterior && hashAnterior !== novoHash) {
    try {
      await deleteDoc(doc(banco, "loginCelular", hashAnterior));
    } catch (err) {
      console.error("Não foi possível apagar o índice antigo do celular.", err);
    }
  }
  return novoHash;
}
