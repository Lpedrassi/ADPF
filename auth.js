// auth.js - liga o formulario de login que ja existe no site (index.html) ao Firebase.
// Como usar: adicionar no fim do index.html, antes de </html>:
//   <script type="module" src="auth.js"></script>
// (o auth.js ja importa o firebase-config.js sozinho)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const PERFIL_PADRAO = "aluno";

// Depois do login/cadastro, o usuario continua na mesma pagina (index.html):
// o menu lateral e a saudacao aparecem sozinhos (ver o <script type="module">
// no fim do index.html, que escuta onAuthStateChanged). Aqui so fechamos o modal.
function fecharModalLogin() {
  if (window.__fecharLoginModal) window.__fecharLoginModal();
}

const form = document.querySelector(".login-form");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      fecharModalLogin();
    } catch (err) {
      alert("Nao foi possivel entrar. Confira seu e-mail e senha.");
      console.error(err);
    }
  });

  const criarContaBtn = form.querySelector(".btn-ghost");
  if (criarContaBtn) {
    criarContaBtn.addEventListener("click", async () => {
      const email = document.getElementById("loginEmail").value.trim();
      const senha = document.getElementById("loginSenha").value;

      if (!email || !senha) {
        alert("Preencha e-mail e senha para criar a conta.");
        return;
      }

      try {
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          email: email,
          perfil: PERFIL_PADRAO,
          criadoEm: serverTimestamp()
        });
        fecharModalLogin();
      } catch (err) {
        alert("Nao foi possivel criar a conta. " + (err.message || ""));
        console.error(err);
      }
    });
  }
}

window.recuperarSenha = async function () {
  const email = document.getElementById("loginEmail").value.trim();
  if (!email) {
    alert("Digite seu e-mail no campo acima e clique em \"Esqueceu a senha?\" novamente.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Enviamos um link de redefinicao de senha para " + email + ".");
  } catch (err) {
    alert("Nao foi possivel enviar o e-mail de redefinicao. Confira o e-mail digitado.");
    console.error(err);
  }
};

const googleProvider = new GoogleAuthProvider();
window.entrarComGoogle = async function () {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const ref = doc(db, "usuarios", cred.user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        email: cred.user.email,
        nome: cred.user.displayName || "",
        perfil: PERFIL_PADRAO,
        criadoEm: serverTimestamp()
      });
    }
    fecharModalLogin();
  } catch (err) {
    alert("Nao foi possivel entrar com Google.");
    console.error(err);
  }
};
