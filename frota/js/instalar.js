(() => {
  "use strict";
  const C = window.Compat || {};
  const ua = navigator.userAgent || "";
  const ios = !!C.ios || /iP(hone|od|ad)/.test(ua);
  const android = /Android/i.test(ua);
  const movel = ios || android || /Mobi/i.test(ua);
  const ficheiro = location.protocol === "file:";
  const emApp = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|Twitter|MicroMessenger|Snapchat|; wv\)/i.test(ua);
  const iosOutro = ios && (/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|YaBrowser|DuckDuckGo/.test(ua) || emApp);
  const samsung = /SamsungBrowser/i.test(ua);
  const DIA = 864e5;
  const esc = (s) => String(s != null ? s : "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  let op = { nome: document.title, chave: "appInstalar", toast: (m) => window.alert(m), icone: "", aoMudar: null };
  let pedido = window.__pedidoInstalar || null;
  let caixa = null;
  let faixa = null;
  let iniciado = false;
  const ler = (k) => {
    try {
      return localStorage.getItem("".concat(op.chave, ":").concat(k));
    } catch (_) {
      return null;
    }
  };
  const gravar = (k, v) => {
    try {
      localStorage.setItem("".concat(op.chave, ":").concat(k), v);
    } catch (_) {
    }
  };
  const instalada = () => navigator.standalone === true || ["standalone", "fullscreen", "minimal-ui"].some((m) => !!(window.matchMedia && window.matchMedia("(display-mode: ".concat(m, ")")).matches));
  const endereco = () => {
    if (!ficheiro) return new URL("./", location.href).href;
    const m = document.querySelector('meta[name="endereco-instalacao"]');
    const u = m ? String(m.getAttribute("content") || "").trim() : "";
    return /^https:\/\/[^\s"<>]+$/.test(u) ? u : "";
  };
  const estado = () => ({ instalada: instalada(), ficheiro, ios, android, movel, botao: !!pedido, endereco: endereco() });
  const avisar = () => {
    if (typeof op.aoMudar === "function") {
      try {
        op.aoMudar(estado());
      } catch (e) {
        console.warn(e);
      }
    }
  };
  const qrSVG = (texto) => {
    if (typeof window.qrcode !== "function" || !texto) return "";
    const qr = window.qrcode(0, "M");
    if (window.qrcode.stringToBytesFuncs && window.qrcode.stringToBytesFuncs["UTF-8"]) window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs["UTF-8"];
    qr.addData(texto);
    qr.make();
    const n = qr.getModuleCount();
    const m = 4;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += "M".concat(c + m, " ").concat(r + m, "h1v1h-1z");
    return '<svg class="ins-qr" viewBox="0 0 '.concat(n + 2 * m, " ").concat(n + 2 * m, '" role="img" aria-label="Código QR do endereço da aplicação" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="').concat(d, '" fill="#000"/></svg>');
  };
  const IC = {
    partilhar: '<svg class="ins-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l4.5 4.5-1.4 1.4L13 5.8V15h-2V5.8L8.9 7.9 7.5 6.5zM5 10h4v2H7v8h10v-8h-2v-2h4v12H5z"/></svg>',
    mais: '<svg class="ins-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm0 2v14h14V5zm6 3h2v3h3v2h-3v3h-2v-3H8v-2h3z"/></svg>',
    pontos: '<svg class="ins-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    menu: '<svg class="ins-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    instalar: '<svg class="ins-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3h2v9.2l3.3-3.3 1.4 1.4L12 16l-5.7-5.7 1.4-1.4 3.3 3.3zM5 18h14v2H5z"/></svg>'
  };
  const passos = () => {
    const e = estado();
    const link = e.endereco;
    if (e.instalada) return '<p class="ins-ok">✔ A aplicação já está instalada neste aparelho e funciona sem internet.</p><p>Para a instalar noutro telemóvel, partilhe o link ou mostre o código QR.</p>';
    if (ficheiro) {
      return '<p class="ins-alerta"><b>Este ficheiro não se instala.</b> O Chrome e o Safari só instalam aplicações abertas a partir do <b>site</b> (endereço https). Esta versão em ficheiro funciona no Android e no computador, mas não no iPhone.</p>\n        '.concat(link ? '<a class="ins-btn ins-prim ins-grande" href="'.concat(esc(link), '" target="_blank" rel="noopener">').concat(IC.instalar, ' Abrir o site para instalar</a>\n        <p class="ins-nota">No site: toque em <b>«Instalar aplicação»</b> (Android) ou siga os passos do <b>Safari</b> (iPhone). Endereço: ').concat(esc(link), "</p>") : "<p>Peça ao administrador o <b>endereço (link) da aplicação</b> e abra-o no Chrome (Android) ou no Safari (iPhone).</p>", '\n        <p class="ins-nota">Os dados escritos neste ficheiro não passam sozinhos para a aplicação instalada: faça aqui uma <b>cópia de segurança</b> e, na aplicação instalada, use <b>«Restaurar cópia»</b>.</p>');
    }
    if (ios && !iosOutro) {
      return '<ol class="ins-passos">\n        <li>Toque em <b>Partilhar</b> '.concat(IC.partilhar, ' na barra do Safari. <span class="ins-nota">No iOS 26: toque primeiro nos <b>três pontos</b> ').concat(IC.pontos, " ao lado do endereço e depois em <b>Partilhar</b>.</span></li>\n        <li>Deslize e toque em <b>«Adicionar ao ecrã principal»</b> ").concat(IC.mais, '. <span class="ins-nota">No iOS 26, deixe ligada a opção «Abrir como app web».</span></li>\n        <li>Toque em <b>Adicionar</b> (em cima, à direita).</li>\n        <li>Abra a aplicação pelo <b>novo ícone</b> no ecrã principal — a primeira vez com internet.</li></ol>\n        <p class="ins-alerta"><b>Instale antes de escrever dados.</b> No iPhone, o que se escreve no Safari não passa para a aplicação instalada. Se já tem dados aqui, faça antes uma cópia de segurança e restaure-a na aplicação instalada.</p>');
    }
    if (ios) {
      return '<p>No iPhone, a instalação faz-se no <b>Safari</b>.</p><ol class="ins-passos">\n        <li>Toque em <b>«Copiar o link»</b> (em baixo).</li>\n        <li>Abra o <b>Safari</b>, toque na barra de endereço, cole o link e abra-o.</li>\n        <li>Siga os passos que aparecem: <b>Partilhar</b> '.concat(IC.partilhar, ' › <b>«Adicionar ao ecrã principal»</b>.</li></ol>\n        <p class="ins-nota">Dentro do WhatsApp ou do Facebook: toque em ').concat(IC.pontos, " ou no ícone da bússola › <b>«Abrir no Safari»</b>. No Chrome do iPhone (iOS 16.4 ou mais recente) também pode usar Partilhar › «Adicionar ao ecrã principal».</p>");
    }
    const botao = pedido ? '<button type="button" class="ins-btn ins-prim ins-grande" data-ins="instalar">'.concat(IC.instalar, ' Instalar aplicação</button><p class="ins-nota">Fica no ecrã principal e na lista de aplicações, abre em ecrã inteiro e funciona sem internet.</p>') : "";
    if (android) {
      return "".concat(botao).concat(pedido ? '<p class="ins-sub">Se o botão não funcionar:</p>' : "", '<ol class="ins-passos').concat(pedido ? " ins-manual" : "", '">\n        <li>Toque no menu ').concat(IC.menu, " do Chrome (em cima, à direita).</li>\n        <li>Escolha <b>«Instalar aplicação»</b> ou <b>«Adicionar ao ecrã principal»</b> e confirme em <b>Instalar</b>.</li>\n        <li>Abra a aplicação pelo <b>novo ícone</b>.</li></ol>\n        ").concat(emApp ? '<p class="ins-alerta">Abriu o link dentro de outra aplicação: toque em ⋮ › <b>«Abrir no Chrome»</b> e instale a partir daí.</p>' : '<p class="ins-nota">Abriu o link no WhatsApp? Toque em ⋮ › «Abrir no Chrome» se não vir a opção de instalar.</p>', "\n        ").concat(samsung ? '<p class="ins-nota">Samsung Internet: menu ≡ › «Adicionar página a» › «Ecrã inicial».</p>' : "");
    }
    return "".concat(botao, '<ol class="ins-passos').concat(pedido ? " ins-manual" : "", '"><li>No <b>Chrome</b> ou no <b>Edge</b>: ícone de instalar ').concat(IC.instalar, " na barra de endereço, ou menu › <b>«Instalar…»</b>.</li>\n      <li>No telemóvel: abra este endereço no Chrome (Android) ou no Safari (iPhone) — ou aponte a câmara para o código QR.</li></ol>");
  };
  const fechar = () => {
    if (!caixa) return;
    caixa.remove();
    caixa = null;
    gravar("visto", "1");
    mostrarFaixa();
  };
  const abrir = (auto = false) => {
    if (caixa) return;
    const e = estado();
    const link = e.endereco;
    caixa = document.createElement("div");
    caixa.className = "ins";
    caixa.setAttribute("role", "dialog");
    caixa.setAttribute("aria-modal", "true");
    caixa.setAttribute("aria-labelledby", "ins-t");
    caixa.innerHTML = '<div class="ins-caixa">\n      <div class="ins-cab">'.concat(op.icone ? '<img src="'.concat(esc(op.icone), '" alt="" width="56" height="56">') : "", '<div><h2 id="ins-t" tabindex="-1">').concat(e.instalada ? "Partilhar a aplicação" : "".concat(ficheiro ? "Como instalar" : "Instalar", " «").concat(esc(op.nome), "»"), "</h2>\n        <p>").concat(e.instalada ? "Instale noutros telemóveis com o link ou o código QR." : "Fica com ícone no ecrã principal, abre em ecrã inteiro e funciona <b>sem internet</b>.", '</p></div></div>\n      <div class="ins-corpo">').concat(passos(), '</div>\n      <div class="ins-qr-caixa" hidden>').concat(link ? "".concat(qrSVG(link), '<p>Aponte a câmara de outro telemóvel para este código: abre a aplicação no Safari (iPhone) ou no Chrome (Android).</p><p class="ins-url">').concat(esc(link), "</p>") : "", '</div>\n      <div class="ins-acoes">').concat(link ? '<button type="button" class="ins-btn" data-ins="partilhar">Partilhar o link</button><button type="button" class="ins-btn" data-ins="copiar">Copiar o link</button><button type="button" class="ins-btn" data-ins="qr" aria-expanded="false">Mostrar código QR</button>' : "", '\n        <button type="button" class="ins-btn ins-prim" data-ins="fechar">').concat(auto && !e.instalada ? "Continuar no navegador" : "Fechar", "</button></div></div>");
    document.body.appendChild(caixa);
    caixa.addEventListener("click", acao);
    caixa.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") fechar();
    });
    const alvo = caixa.querySelector('[data-ins="instalar"]') || caixa.querySelector("#ins-t");
    try {
      alvo.focus({ preventScroll: true });
    } catch (_) {
      alvo.focus();
    }
    caixa.querySelector(".ins-caixa").scrollTop = 0;
  };
  const copiar = (t) => {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(() => true).catch(() => copiarAntigo(t));
    return Promise.resolve(copiarAntigo(t));
  };
  const copiarAntigo = (t) => {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.className = "copia-oculta";
    document.body.appendChild(ta);
    try {
      if (ios) {
        ta.contentEditable = "true";
        const r = document.createRange();
        r.selectNodeContents(ta);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        ta.setSelectionRange(0, t.length);
      } else ta.select();
      return document.execCommand("copy");
    } catch (_) {
      return false;
    } finally {
      ta.remove();
    }
  };
  const instalarAgora = async () => {
    if (!pedido) {
      abrir();
      return;
    }
    const p = pedido;
    pedido = null;
    window.__pedidoInstalar = null;
    try {
      p.prompt();
      const r = await p.userChoice;
      if (r && r.outcome === "accepted") {
        op.toast("A instalar… Depois abra a aplicação pelo ícone no ecrã principal.");
        if (caixa) fechar();
      } else {
        pedido = p;
        op.toast("Instalação cancelada. Pode instalar mais tarde em «Instalar aplicação».");
      }
    } catch (e) {
      console.warn("Instalação:", e);
      op.toast("O navegador não deixou instalar agora. Use o menu do navegador › «Instalar aplicação».");
    }
    avisar();
  };
  const acao = (ev) => {
    const b = ev.target.closest("[data-ins]");
    if (!b) return;
    const a = b.dataset.ins;
    const link = endereco();
    if (a === "fechar") fechar();
    else if (a === "instalar") instalarAgora();
    else if (a === "qr") {
      const q = caixa.querySelector(".ins-qr-caixa");
      q.hidden = !q.hidden;
      b.setAttribute("aria-expanded", String(!q.hidden));
      b.textContent = q.hidden ? "Mostrar código QR" : "Esconder código QR";
    } else if (a === "copiar") copiar(link).then((ok) => op.toast(ok ? "Link copiado: cole-o no Safari (iPhone) ou no Chrome (Android), ou numa mensagem." : "Não foi possível copiar. O link é: ".concat(link)));
    else if (a === "partilhar") {
      const texto = "Instale a aplicação «".concat(op.nome, "»: abra este link no Safari (iPhone) ou no Chrome (Android) e siga os passos.");
      if (navigator.share) navigator.share({ title: op.nome, text: texto, url: link }).catch((e) => {
        if (!e || e.name !== "AbortError") copiar(link).then(() => op.toast("Link copiado."));
      });
      else copiar(link).then((ok) => op.toast(ok ? "Link copiado: cole-o numa mensagem (WhatsApp, SMS, e-mail)." : "O link é: ".concat(link)));
    }
  };
  const instalar = () => {
    if (pedido && !ios) instalarAgora();
    else abrir();
  };
  const mostrarFaixa = () => {
    const e = estado();
    const ate = Number(ler("faixaAte") || 0);
    const quer = !e.instalada && Date.now() > ate && (movel || pedido) && (!ficheiro || movel);
    if (!quer) {
      if (faixa) {
        faixa.remove();
        faixa = null;
      }
      return;
    }
    if (faixa) return;
    faixa = document.createElement("div");
    faixa.className = "ins-faixa";
    faixa.setAttribute("role", "region");
    faixa.setAttribute("aria-label", "Instalar a aplicação");
    faixa.innerHTML = ficheiro ? '<p><b>Versão em ficheiro:</b> para instalar como aplicação, use o endereço (link) da aplicação.</p><button type="button" class="ins-btn" data-faixa="ver">Saber mais</button><button type="button" class="ins-x" data-faixa="x" aria-label="Fechar o aviso">✕</button>' : "<p>".concat(IC.instalar, '<span><b>Instale a aplicação</b>: ícone no ecrã principal e funciona sem internet.</span></p><button type="button" class="ins-btn ins-prim" data-faixa="ver">Instalar</button><button type="button" class="ins-x" data-faixa="x" aria-label="Fechar o aviso">✕</button>');
    faixa.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-faixa]");
      if (!b) return;
      if (b.dataset.faixa === "x") {
        gravar("faixaAte", String(Date.now() + 7 * DIA));
        faixa.remove();
        faixa = null;
      } else instalar();
    });
    document.body.insertBefore(faixa, document.body.firstChild);
  };
  const vigiarVersao = () => {
    if (ficheiro || !("serviceWorker" in navigator)) return;
    const tinha = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!tinha || document.querySelector(".ins-versao")) return;
      const v = document.createElement("div");
      v.className = "ins-faixa ins-versao";
      v.setAttribute("role", "status");
      v.innerHTML = '<p><b>Há uma versão nova da aplicação.</b> Os seus dados ficam guardados.</p><button type="button" class="ins-btn ins-prim">Actualizar agora</button>';
      v.querySelector("button").addEventListener("click", () => window.location.reload());
      document.body.insertBefore(v, document.body.firstChild);
    });
  };
  const iniciar = (opcoes = {}) => {
    op = { ...op, ...opcoes };
    if (iniciado) {
      avisar();
      return;
    }
    iniciado = true;
    window.addEventListener("appinstalled", () => {
      pedido = null;
      window.__pedidoInstalar = null;
      gravar("visto", "1");
      if (caixa) fechar();
      if (faixa) {
        faixa.remove();
        faixa = null;
      }
      op.toast("Aplicação instalada. Abra-a pelo ícone no ecrã principal.");
      avisar();
    });
    vigiarVersao();
    if (!ficheiro && movel && !instalada() && !ler("visto")) abrir(true);
    else mostrarFaixa();
    avisar();
  };
  const aoPedido = (e) => {
    pedido = e;
    if (caixa && !caixa.querySelector('[data-ins="instalar"]') && !ios) {
      const corpo = caixa.querySelector(".ins-corpo");
      if (corpo) corpo.innerHTML = passos();
    }
    if (iniciado) mostrarFaixa();
    avisar();
  };
  window.Instalar = { iniciar, abrir: () => abrir(false), instalar, estado, aoPedido, qrSVG };
})();
