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
