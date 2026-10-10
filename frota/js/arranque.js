(() => {
  "use strict";
  document.querySelectorAll(".aba-btn[data-aba]").forEach((b) => b.addEventListener("click", () => {
    F.ir(b.dataset.aba);
    const h = document.getElementById("h-".concat(b.dataset.aba));
    if (h) h.focus();
  }));
  document.querySelectorAll(".aba h2").forEach((h) => h.setAttribute("tabindex", "-1"));
  document.getElementById("tema").addEventListener("click", () => F.tema(document.documentElement.dataset.tema === "escuro" ? "claro" : "escuro"));
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch((e) => console.warn("Offline indisponível:", e));
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {
  });
  window.addEventListener("error", (e) => {
    if (!e.message) return;
    console.error(e.error || e.message);
    F.toast("Ocorreu um erro inesperado. Os dados guardados não foram afectados.", "erro");
  });
  const instMenu = document.getElementById("instalar-menu");
  if (window.Instalar) {
    window.Instalar.iniciar({
      nome: F.S.cfg.nome || "Frota Ebenézer",
      chave: "ebenezerInstalar",
      toast: F.toast,
      icone: document.getElementById("logo").getAttribute("src"),
      aoMudar: (e) => {
        const t = e.instalada ? "Partilhar a aplicação" : "Instalar aplicação";
        document.getElementById("instalar-menu-txt").textContent = t;
        instMenu.title = t;
        document.getElementById("lg-instalar").hidden = e.instalada || !(e.movel || e.botao);
      }
    });
    instMenu.addEventListener("click", () => {
      document.body.classList.remove("menu-aberto");
      document.getElementById("veu").hidden = true;
      window.Instalar.abrir();
    });
    document.getElementById("lg-instalar").addEventListener("click", () => window.Instalar.instalar());
  } else instMenu.hidden = true;
  window.Auth.iniciar();
  window.APP_OK = true;
})();
