import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SEED_NOTICIAS = [
  {
    id: "n1",
    tag: "Homenagem",
    title: "Feliz Dia do Pastor",
    desc: "14 de junho — homenagem da congregação do Florianópolis ao Pr. Pedro Nascimento.",
    link: "",
    image: "noticia-dia-do-pastor.webp",
    criadoEm: new Date("2026-06-14")
  },
  {
    id: "n2",
    tag: "Evento",
    title: "Pré-Congresso Renascer em Cristo 2026",
    desc: "01 e 02 de agosto, às 18h — Pecado, Justiça e Juízo.",
    link: "",
    image: "noticia-pre-congresso-renascer.webp",
    criadoEm: new Date("2026-08-01")
  },
  {
    id: "n3",
    tag: "Adolescentes",
    title: "Cristo em Mim",
    desc: "Pré-congresso de adolescentes do Grupo Manancial — 11 e 12 de abril, às 18h.",
    link: "",
    image: "noticia-cristo-em-mim.webp",
    criadoEm: new Date("2026-04-11")
  },
  {
    id: "n4",
    tag: "Culto especial",
    title: "Culto da Gratidão",
    desc: "28 de dezembro, às 18h.",
    link: "",
    image: "noticia-culto-gratidao.webp",
    criadoEm: new Date("2026-12-28")
  }
];

async function importarSeedNoticias() {
  try {
    let sucesso = 0;
    let erros = 0;

    for (const noticia of SEED_NOTICIAS) {
      try {
        const docRef = doc(db, "noticias", noticia.id);
        await setDoc(docRef, noticia);
        console.log(`✅ Notícia importada: ${noticia.title}`);
        sucesso++;
      } catch (erro) {
        console.error(`❌ Erro ao importar "${noticia.title}":`, erro);
        erros++;
      }
    }

    console.log(`\n📊 Resumo: ${sucesso} notícias importadas com sucesso, ${erros} erros.`);
    alert(`✅ ${sucesso}/${SEED_NOTICIAS.length} notícias importadas!\n\nAtualize a página para ver as mudanças.`);
  } catch (erro) {
    console.error("Erro geral ao importar notícias:", erro);
    alert("❌ Erro ao importar notícias. Verifique o console.");
  }
}

window.importarSeedNoticias = importarSeedNoticias;
console.log("✅ Script de seed de notícias carregado. Use: importarSeedNoticias()");
