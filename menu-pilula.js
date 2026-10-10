(() => {
  const menu = document.getElementById("navLinks");
  if (!menu) return;
  const fundo = menu.querySelector(".fundo-movel");
  const itens = () => menu.querySelectorAll("a, .nav-admin-toggle");

  const mover = (item) => {
    if (item.offsetParent === null) return;
    const alvo = item.getBoundingClientRect();
    const base = menu.getBoundingClientRect();
    fundo.style.transform = `translateX(${alvo.left - base.left}px)`;
    fundo.style.width = `${alvo.width}px`;
    fundo.style.top = `${alvo.top - base.top}px`;
    fundo.style.height = `${alvo.height}px`;
    fundo.style.opacity = "1";
    menu.classList.add("com-pilula");
    itens().forEach((el) => el.classList.toggle("is-sobre-fundo", el === item));
  };

  const esconder = () => {
    fundo.style.opacity = "0";
    menu.classList.remove("com-pilula");
    itens().forEach((el) => el.classList.remove("is-sobre-fundo"));
  };

  itens().forEach((item) => item.addEventListener("mouseenter", () => mover(item)));
  menu.addEventListener("mouseleave", esconder);
})();

(() => {
  document.querySelectorAll(".nav-admin-dropdown").forEach((dropdown) => {
    const itens = dropdown.querySelectorAll(".nav-admin-dropdown-item");
    const fundo = document.createElement("div");
    fundo.className = "fundo-movel-lista";
    fundo.setAttribute("aria-hidden", "true");
    dropdown.insertBefore(fundo, dropdown.firstChild);

    itens.forEach((item) => {
      item.addEventListener("mouseenter", () => {
        const base = dropdown.getBoundingClientRect();
        const alvo = item.getBoundingClientRect();
        fundo.style.transform = `translateY(${alvo.top - base.top}px)`;
        fundo.style.height = `${alvo.height}px`;
        fundo.style.opacity = "1";
        itens.forEach((el) => el.classList.toggle("is-sobre-fundo", el === item));
      });
    });

    dropdown.addEventListener("mouseleave", () => {
      fundo.style.opacity = "0";
      itens.forEach((el) => el.classList.remove("is-sobre-fundo"));
    });
  });
})();

(() => {
  const botao = document.getElementById("navMenuToggle");
  const menu = document.getElementById("navLinks");
  if (!botao || !menu) return;
  const fechar = () => {
    menu.classList.remove("aberto");
    botao.setAttribute("aria-expanded", "false");
  };
  botao.addEventListener("click", () => {
    const aberto = menu.classList.toggle("aberto");
    botao.setAttribute("aria-expanded", String(aberto));
  });
  // Qualquer página escolhida (link ou item de submenu) fecha o menu; abrir Site/Administração/Portal EBD não fecha
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a, .nav-admin-dropdown-item")) fechar();
  });
})();
