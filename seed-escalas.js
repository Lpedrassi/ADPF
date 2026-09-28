// Seed Data para Escalas de Professores - EBD
// Execute no console: await importarSeedEscalas()

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SEED_ESCALAS = {
  "infantil-1": {
    nome: "Infantil 1",
    professores: ["Professora Ana", "Professor Carlos"],
    professorEscaladoDomingo: "Professora Ana",
    licoes: [
      { numero: 1, titulo: "Deus criou tudo com amor", data: "05/10/2026", professor: "Professora Ana" },
      { numero: 2, titulo: "Adão e Eva no Jardim", data: "12/10/2026", professor: "Professor Carlos" },
      { numero: 3, titulo: "Noé e a Arca", data: "19/10/2026", professor: "Professora Ana" },
      { numero: 4, titulo: "Abraão, o pai da fé", data: "26/10/2026", professor: "Professor Carlos" },
      { numero: 5, titulo: "Moisés e os 10 Mandamentos", data: "02/11/2026", professor: "Professora Ana" },
      { numero: 6, titulo: "Davi, o pequeno pastor", data: "09/11/2026", professor: "Professor Carlos" },
      { numero: 7, titulo: "Jonas e a baleia", data: "16/11/2026", professor: "Professora Ana" },
      { numero: 8, titulo: "Jesus nasce em Belém", data: "23/11/2026", professor: "Professor Carlos" },
      { numero: 9, titulo: "Jesus acalma a tempestade", data: "30/11/2026", professor: "Professora Ana" },
      { numero: 10, titulo: "Jesus alimenta cinco mil", data: "07/12/2026", professor: "Professor Carlos" },
      { numero: 11, titulo: "Jesus cura os enfermos", data: "14/12/2026", professor: "Professora Ana" },
      { numero: 12, titulo: "Jesus ressuscita", data: "21/12/2026", professor: "Professor Carlos" },
      { numero: 13, titulo: "O Espírito Santo nos guia", data: "28/12/2026", professor: "Professora Ana" }
    ],
    escalas: [
      { mes: 10, professor: "Professora Ana" },
      { mes: 11, professor: "Professor Carlos" },
      { mes: 12, professor: "Professora Ana" },
      { mes: 1, professor: "Professor Carlos" },
      { mes: 2, professor: "Professora Ana" },
      { mes: 3, professor: "Professor Carlos" },
      { mes: 4, professor: "Professora Ana" },
      { mes: 5, professor: "Professor Carlos" },
      { mes: 6, professor: "Professora Ana" },
      { mes: 7, professor: "Professor Carlos" },
      { mes: 8, professor: "Professora Ana" },
      { mes: 9, professor: "Professor Carlos" }
    ]
  },
  "infantil-2": {
    nome: "Infantil 2",
    professores: ["Professor João", "Professora Maria"],
    professorEscaladoDomingo: "Professor João",
    licoes: [
      { numero: 1, titulo: "A criação de Deus", data: "05/10/2026", professor: "Professor João" },
      { numero: 2, titulo: "Abraão e Isaque", data: "12/10/2026", professor: "Professora Maria" },
      { numero: 3, titulo: "Jacó e a escada", data: "19/10/2026", professor: "Professor João" },
      { numero: 4, titulo: "José no Egito", data: "26/10/2026", professor: "Professora Maria" },
      { numero: 5, titulo: "A fuga do Egito", data: "02/11/2026", professor: "Professor João" },
      { numero: 6, titulo: "Os Dez Mandamentos", data: "09/11/2026", professor: "Professora Maria" },
      { numero: 7, titulo: "Sansão, o homem forte", data: "16/11/2026", professor: "Professor João" },
      { numero: 8, titulo: "Rute, lealdade e amor", data: "23/11/2026", professor: "Professora Maria" },
      { numero: 9, titulo: "Samuel, o profeta", data: "30/11/2026", professor: "Professor João" },
      { numero: 10, titulo: "Davi e Golias", data: "07/12/2026", professor: "Professora Maria" },
      { numero: 11, titulo: "Elias e o fogo do céu", data: "14/12/2026", professor: "Professor João" },
      { numero: 12, titulo: "Daniel na cova dos leões", data: "21/12/2026", professor: "Professora Maria" },
      { numero: 13, titulo: "O menino Jesus no templo", data: "28/12/2026", professor: "Professor João" }
    ],
    escalas: [
      { mes: 10, professor: "Professor João" },
      { mes: 11, professor: "Professora Maria" },
      { mes: 12, professor: "Professor João" },
      { mes: 1, professor: "Professora Maria" },
      { mes: 2, professor: "Professor João" },
      { mes: 3, professor: "Professora Maria" },
      { mes: 4, professor: "Professor João" },
      { mes: 5, professor: "Professora Maria" },
      { mes: 6, professor: "Professor João" },
      { mes: 7, professor: "Professora Maria" },
      { mes: 8, professor: "Professor João" },
      { mes: 9, professor: "Professora Maria" }
    ]
  },
  "adolescentes": {
    nome: "Adolescentes",
    professores: ["Professor Lucas", "Professora Tania"],
    professorEscaladoDomingo: "Professor Lucas",
    licoes: [
      { numero: 1, titulo: "Identidade em Cristo", data: "05/10/2026", professor: "Professor Lucas" },
      { numero: 2, titulo: "Amizades verdadeiras", data: "12/10/2026", professor: "Professora Tania" },
      { numero: 3, titulo: "Namoro cristão", data: "19/10/2026", professor: "Professor Lucas" },
      { numero: 4, titulo: "Luta contra o pecado", data: "26/10/2026", professor: "Professora Tania" },
      { numero: 5, titulo: "Comunhão com Deus", data: "02/11/2026", professor: "Professor Lucas" },
      { numero: 6, titulo: "Fruto do Espírito", data: "09/11/2026", professor: "Professora Tania" },
      { numero: 7, titulo: "Perdão e reconciliação", data: "16/11/2026", professor: "Professor Lucas" },
      { numero: 8, titulo: "Chamado missionário", data: "23/11/2026", professor: "Professora Tania" },
      { numero: 9, titulo: "Sexualidade cristã", data: "30/11/2026", professor: "Professor Lucas" },
      { numero: 10, titulo: "Escolhas para o futuro", data: "07/12/2026", professor: "Professora Tania" },
      { numero: 11, titulo: "Fé em tempos de dúvida", data: "14/12/2026", professor: "Professor Lucas" },
      { numero: 12, titulo: "Vida de oração", data: "21/12/2026", professor: "Professora Tania" },
      { numero: 13, titulo: "Compromisso com Jesus", data: "28/12/2026", professor: "Professor Lucas" }
    ],
    escalas: [
      { mes: 10, professor: "Professor Lucas" },
      { mes: 11, professor: "Professora Tania" },
      { mes: 12, professor: "Professor Lucas" },
      { mes: 1, professor: "Professora Tania" },
      { mes: 2, professor: "Professor Lucas" },
      { mes: 3, professor: "Professora Tania" },
      { mes: 4, professor: "Professor Lucas" },
      { mes: 5, professor: "Professora Tania" },
      { mes: 6, professor: "Professor Lucas" },
      { mes: 7, professor: "Professora Tania" },
      { mes: 8, professor: "Professor Lucas" },
      { mes: 9, professor: "Professora Tania" }
    ]
  },
  "jovens": {
    nome: "Jovens",
    professores: ["Pastor Felipe", "Diácono Pedro"],
    professorEscaladoDomingo: "Pastor Felipe",
    licoes: [
      { numero: 1, titulo: "Vocação e chamado divino", data: "05/10/2026", professor: "Pastor Felipe" },
      { numero: 2, titulo: "Carreira e fé", data: "12/10/2026", professor: "Diácono Pedro" },
      { numero: 3, titulo: "Relacionamentos saudáveis", data: "19/10/2026", professor: "Pastor Felipe" },
      { numero: 4, titulo: "Casamento cristão", data: "26/10/2026", professor: "Diácono Pedro" },
      { numero: 5, titulo: "Gestão financeira", data: "02/11/2026", professor: "Pastor Felipe" },
      { numero: 6, titulo: "Educação dos filhos", data: "09/11/2026", professor: "Diácono Pedro" },
      { numero: 7, titulo: "Saúde mental e fé", data: "16/11/2026", professor: "Pastor Felipe" },
      { numero: 8, titulo: "Liderança cristã", data: "23/11/2026", professor: "Diácono Pedro" },
      { numero: 9, titulo: "Missões e evangelismo", data: "30/11/2026", professor: "Pastor Felipe" },
      { numero: 10, titulo: "Integridade profissional", data: "07/12/2026", professor: "Diácono Pedro" },
      { numero: 11, titulo: "Vida de adoração", data: "14/12/2026", professor: "Pastor Felipe" },
      { numero: 12, titulo: "Batalha espiritual", data: "21/12/2026", professor: "Diácono Pedro" },
      { numero: 13, titulo: "Compromisso de vida", data: "28/12/2026", professor: "Pastor Felipe" }
    ],
    escalas: [
      { mes: 10, professor: "Pastor Felipe" },
      { mes: 11, professor: "Diácono Pedro" },
      { mes: 12, professor: "Pastor Felipe" },
      { mes: 1, professor: "Diácono Pedro" },
      { mes: 2, professor: "Pastor Felipe" },
      { mes: 3, professor: "Diácono Pedro" },
      { mes: 4, professor: "Pastor Felipe" },
      { mes: 5, professor: "Diácono Pedro" },
      { mes: 6, professor: "Pastor Felipe" },
      { mes: 7, professor: "Diácono Pedro" },
      { mes: 8, professor: "Pastor Felipe" },
      { mes: 9, professor: "Diácono Pedro" }
    ]
  },
  "adulto-varoes": {
    nome: "Adulto Varões",
    professores: ["Pastor Mário", "Presbítero Douglas"],
    professorEscaladoDomingo: "Pastor Mário",
    licoes: [
      { numero: 1, titulo: "Teologia sistemática - Deus", data: "05/10/2026", professor: "Pastor Mário" },
      { numero: 2, titulo: "Doutrina da criação", data: "12/10/2026", professor: "Presbítero Douglas" },
      { numero: 3, titulo: "Queda e redenção", data: "19/10/2026", professor: "Pastor Mário" },
      { numero: 4, titulo: "Encarnação de Cristo", data: "26/10/2026", professor: "Presbítero Douglas" },
      { numero: 5, titulo: "A obra expiatória", data: "02/11/2026", professor: "Pastor Mário" },
      { numero: 6, titulo: "Ressurreição e ascensão", data: "09/11/2026", professor: "Presbítero Douglas" },
      { numero: 7, titulo: "Batismo no Espírito Santo", data: "16/11/2026", professor: "Pastor Mário" },
      { numero: 8, titulo: "Dons e ministérios", data: "23/11/2026", professor: "Presbítero Douglas" },
      { numero: 9, titulo: "Igreja: corpo de Cristo", data: "30/11/2026", professor: "Pastor Mário" },
      { numero: 10, titulo: "Ética cristã aplicada", data: "07/12/2026", professor: "Presbítero Douglas" },
      { numero: 11, titulo: "Escatologia bíblica", data: "14/12/2026", professor: "Pastor Mário" },
      { numero: 12, titulo: "Cosmovisão cristã", data: "21/12/2026", professor: "Presbítero Douglas" },
      { numero: 13, titulo: "Missão e propósito divino", data: "28/12/2026", professor: "Pastor Mário" }
    ],
    escalas: [
      { mes: 10, professor: "Pastor Mário" },
      { mes: 11, professor: "Presbítero Douglas" },
      { mes: 12, professor: "Pastor Mário" },
      { mes: 1, professor: "Presbítero Douglas" },
      { mes: 2, professor: "Pastor Mário" },
      { mes: 3, professor: "Presbítero Douglas" },
      { mes: 4, professor: "Pastor Mário" },
      { mes: 5, professor: "Presbítero Douglas" },
      { mes: 6, professor: "Pastor Mário" },
      { mes: 7, professor: "Presbítero Douglas" },
      { mes: 8, professor: "Pastor Mário" },
      { mes: 9, professor: "Presbítero Douglas" }
    ]
  },
  "adulto-feminino": {
    nome: "Adulto Feminino",
    professores: ["Pastora Silvia", "Missionária Fabíola"],
    professorEscaladoDomingo: "Pastora Silvia",
    licoes: [
      { numero: 1, titulo: "Mulher segundo o coração de Deus", data: "05/10/2026", professor: "Pastora Silvia" },
      { numero: 2, titulo: "Doutrina e fé", data: "12/10/2026", professor: "Missionária Fabíola" },
      { numero: 3, titulo: "Esposa e mãe cristã", data: "19/10/2026", professor: "Pastora Silvia" },
      { numero: 4, titulo: "Solteira em Cristo", data: "26/10/2026", professor: "Missionária Fabíola" },
      { numero: 5, titulo: "Viúva e seu chamado", data: "02/11/2026", professor: "Pastora Silvia" },
      { numero: 6, titulo: "Fé durante as crises", data: "09/11/2026", professor: "Missionária Fabíola" },
      { numero: 7, titulo: "Vida de oração", data: "16/11/2026", professor: "Pastora Silvia" },
      { numero: 8, titulo: "Ministério feminino", data: "23/11/2026", professor: "Missionária Fabíola" },
      { numero: 9, titulo: "Saúde integral", data: "30/11/2026", professor: "Pastora Silvia" },
      { numero: 10, titulo: "Liderança e serventia", data: "07/12/2026", professor: "Missionária Fabíola" },
      { numero: 11, titulo: "Relacionamentos restaurados", data: "14/12/2026", professor: "Pastora Silvia" },
      { numero: 12, titulo: "Missões e compaixão", data: "21/12/2026", professor: "Missionária Fabíola" },
      { numero: 13, titulo: "Eternidade e legado", data: "28/12/2026", professor: "Pastora Silvia" }
    ],
    escalas: [
      { mes: 10, professor: "Pastora Silvia" },
      { mes: 11, professor: "Missionária Fabíola" },
      { mes: 12, professor: "Pastora Silvia" },
      { mes: 1, professor: "Missionária Fabíola" },
      { mes: 2, professor: "Pastora Silvia" },
      { mes: 3, professor: "Missionária Fabíola" },
      { mes: 4, professor: "Pastora Silvia" },
      { mes: 5, professor: "Missionária Fabíola" },
      { mes: 6, professor: "Pastora Silvia" },
      { mes: 7, professor: "Missionária Fabíola" },
      { mes: 8, professor: "Pastora Silvia" },
      { mes: 9, professor: "Missionária Fabíola" }
    ]
  },
  "novos-convertidos": {
    nome: "Novos Convertidos",
    professores: ["Diácono Paulo", "Irmã Gorete"],
    professorEscaladoDomingo: "Diácono Paulo",
    licoes: [
      { numero: 1, titulo: "Novo nascimento em Cristo", data: "05/10/2026", professor: "Diácono Paulo" },
      { numero: 2, titulo: "Fundamentos da fé", data: "12/10/2026", professor: "Irmã Gorete" },
      { numero: 3, titulo: "Arrependimento e perdão", data: "19/10/2026", professor: "Diácono Paulo" },
      { numero: 4, titulo: "Justificação pela fé", data: "26/10/2026", professor: "Irmã Gorete" },
      { numero: 5, titulo: "Santificação progressiva", data: "02/11/2026", professor: "Diácono Paulo" },
      { numero: 6, titulo: "Batismo nas águas", data: "09/11/2026", professor: "Irmã Gorete" },
      { numero: 7, titulo: "Revestimento de poder", data: "16/11/2026", professor: "Diácono Paulo" },
      { numero: 8, titulo: "Vida de oração", data: "23/11/2026", professor: "Irmã Gorete" },
      { numero: 9, titulo: "Leitura e meditação bíblica", data: "30/11/2026", professor: "Diácono Paulo" },
      { numero: 10, titulo: "Comunhão com a igreja", data: "07/12/2026", professor: "Irmã Gorete" },
      { numero: 11, titulo: "Fruto do Espírito", data: "14/12/2026", professor: "Diácono Paulo" },
      { numero: 12, titulo: "Testemunho e evangelismo", data: "21/12/2026", professor: "Irmã Gorete" },
      { numero: 13, titulo: "Discipulado contínuo", data: "28/12/2026", professor: "Diácono Paulo" }
    ],
    escalas: [
      { mes: 10, professor: "Diácono Paulo" },
      { mes: 11, professor: "Irmã Gorete" },
      { mes: 12, professor: "Diácono Paulo" },
      { mes: 1, professor: "Irmã Gorete" },
      { mes: 2, professor: "Diácono Paulo" },
      { mes: 3, professor: "Irmã Gorete" },
      { mes: 4, professor: "Diácono Paulo" },
      { mes: 5, professor: "Irmã Gorete" },
      { mes: 6, professor: "Diácono Paulo" },
      { mes: 7, professor: "Irmã Gorete" },
      { mes: 8, professor: "Diácono Paulo" },
      { mes: 9, professor: "Irmã Gorete" }
    ]
  }
};

// Função para importar seed data no Firestore
async function importarSeedEscalas() {
  if (!auth.currentUser) {
    alert("Você precisa estar logado como administrador!");
    return;
  }

  console.log("Importando seed data...");
  let importados = 0;
  let erros = 0;

  for (const [turmaId, dados] of Object.entries(SEED_ESCALAS)) {
    try {
      // Salvar dados principais da turma
      await setDoc(doc(db, "turmas", turmaId), {
        nome: dados.nome,
        professores: dados.professores,
        professorEscaladoDomingo: dados.professorEscaladoDomingo
      }, { merge: true });

      // Salvar lições
      for (const licao of dados.licoes) {
        await setDoc(
          doc(db, "turmas", turmaId, "licoes", String(licao.numero)),
          licao
        );
      }

      // Salvar escalas mensais
      for (const escala of dados.escalas) {
        await setDoc(
          doc(db, "turmas", turmaId, "escalas", String(escala.mes)),
          escala
        );
      }

      importados++;
      console.log(`✅ ${dados.nome} importado com sucesso`);
    } catch (err) {
      erros++;
      console.error(`❌ Erro ao importar ${dados.nome}:`, err);
    }
  }

  alert(`Importação concluída!\n✅ Sucesso: ${importados}\n❌ Erros: ${erros}`);
  console.log("Seed data importação completa!");
}

// Expor função globalmente para acesso no console
window.importarSeedEscalas = importarSeedEscalas;
