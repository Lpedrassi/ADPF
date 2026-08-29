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
  signInWithPopup
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

async function irParaPortal(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  const perfil = snap.exists() ? snap.data().perfil : PERFIL_PADRAO;
  sessionStorage.setItem("perfil", perfil);
  window.location.href = "portal-ebd.html";
}

const form = document.querySelector(".login-form");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      irParaPortal(cred.user.uid);
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
        irParaPortal(cred.user.uid);
      } catch (err) {
        alert("Nao foi possivel criar a conta. " + (err.message || ""));
        console.error(err);
      }
    });
  }
}

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
    irParaPortal(cred.user.uid);
  } catch (err) {
    alert("Nao foi possivel entrar com Google.");
    console.error(err);
  }
};

