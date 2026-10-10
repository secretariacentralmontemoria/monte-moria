(() => {
  "use strict";
  const { $, esc } = F;
  const MENU = "ebenezerMenu";
  const ICONE = $("#logo").getAttribute("src");
  const iniciais = (nome) => {
    const t = String(nome || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase().replace(/[^A-ZÀ-Ý0-9]/g, "") || "?";
    return "data:image/svg+xml;charset=utf-8,".concat(encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0E7C86"/><text x="32" y="41" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#fff" text-anchor="middle">'.concat(t, "</text></svg>")));
  };
  const valida = (u) => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(u || "");
  const foto = (u) => u && valida(u.foto) ? u.foto : iniciais(u ? u.nome : "?");
  const lerImagem = (file, max, tipo = "image/png") => new Promise((res, rej) => {
    if (!file) {
      rej(new Error("nenhum ficheiro"));
      return;
    }
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
      rej(new Error("use PNG, JPG, WEBP ou SVG"));
      return;
    }
    if (file.size > 5e6) {
      rej(new Error("imagem demasiado grande (máx. 5 MB)"));
      return;
    }
    const r = new FileReader();
    r.onerror = () => rej(new Error("não foi possível ler"));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error("imagem inválida"));
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL(tipo, 0.9));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
  const aplicar = () => {
    const c = F.S.cfg;
    const root = document.documentElement;
    const logo = valida(c.logo) ? c.logo : ICONE;
    $("#marca-nome").textContent = c.nome;
    $("#marca-sub").textContent = c.sub;
    $("#logo").src = logo;
    $("#login-logo").src = logo;
    $("#login-t").textContent = "Entrar — ".concat(c.nome);
    document.title = "".concat(c.nome, " — ").concat(c.sub);
    [["--azul", c.cor1], ["--mar", c.cor2], ["--ambar", c.cor3]].forEach(([v, k]) => {
      if (/^#[0-9a-f]{6}$/i.test(k || "")) root.style.setProperty(v, k);
    });
    root.style.setProperty("--fs", "".concat(Math.min(20, Math.max(14, Number(c.fs) || 16)), "px"));
  };
  const aplicarUser = () => {
    const u = F.user;
    const src = foto(u);
    $("#foto").src = src;
    $("#foto-topo").src = src;
    $("#foto").alt = u ? "Fotografia de ".concat(u.nome) : "";
  };
  const recolher = (on) => {
    document.body.classList.toggle("menu-recolhido", on);
    const b = $("#recolher");
    b.textContent = on ? "»" : "«";
    b.setAttribute("aria-expanded", String(!on));
    b.setAttribute("aria-label", on ? "Expandir o menu" : "Recolher o menu");
    b.title = b.getAttribute("aria-label");
    try {
      localStorage.setItem(MENU, on ? "1" : "0");
    } catch (_) {
    }
  };
  const gaveta = (on) => {
    var _a;
    document.body.classList.toggle("menu-aberto", on);
    $("#veu").hidden = !on;
    $("#abrir-menu").setAttribute("aria-expanded", String(on));
    if (on) (_a = $("#menu .aba-btn:not([hidden])")) == null ? void 0 : _a.focus();
  };
  $("#recolher").addEventListener("click", () => recolher(!document.body.classList.contains("menu-recolhido")));
  $("#abrir-menu").addEventListener("click", () => gaveta(!document.body.classList.contains("menu-aberto")));
  $("#veu").addEventListener("click", () => gaveta(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-aberto")) {
      gaveta(false);
      $("#abrir-menu").focus();
    }
  });
  try {
    recolher(localStorage.getItem(MENU) === "1");
  } catch (_) {
    recolher(false);
  }
  const perfil = () => {
    const u = F.user;
    if (!u) return;
    let nova = null;
    const m = F.modal({
      titulo: "O meu perfil",
      largo: true,
      corpo: '<div class="perfil-grid"><img class="foto grande" id="pf-img" src="'.concat(esc(foto(u)), '" alt="A sua fotografia"><div>\n      <p><b>').concat(esc(u.nome), "</b> · ").concat(esc(u.user), " · ").concat(u.perfil === "admin" ? "Administrador" : "Utilizador", '</p>\n      <div class="campo"><label for="pf-f">Nova fotografia (PNG, JPG ou WEBP)</label><input id="pf-f" type="file" accept="image/png,image/jpeg,image/webp"></div>\n      <button type="button" class="btn peq perigo" id="pf-rm"').concat(valida(u.foto) ? "" : " disabled", '>Remover fotografia</button></div></div>\n      <fieldset class="grupo"><legend>Mudar a palavra-passe</legend><div class="grelha"><div class="campo"><label for="pf-a">Palavra-passe actual</label><input id="pf-a" type="password" autocomplete="current-password" maxlength="60"></div>\n      <div class="campo"><label for="pf-n">Nova (mín. 8)</label><input id="pf-n" type="password" autocomplete="new-password" maxlength="60"></div><div class="campo"><label for="pf-n2">Repetir a nova</label><input id="pf-n2" type="password" autocomplete="new-password" maxlength="60"></div></div></fieldset>'),
      botoes: [{ id: "c", label: "Cancelar" }, { id: "g", label: "Guardar", classe: "prim" }]
    });
    m.el.querySelector("#pf-f").addEventListener("change", async (e) => {
      try {
        nova = await lerImagem(e.target.files[0], 160, "image/jpeg");
        m.el.querySelector("#pf-img").src = nova;
        m.erro("");
      } catch (x) {
        m.erro("Fotografia: ".concat(x.message, "."));
      }
    });
    m.el.querySelector("#pf-rm").addEventListener("click", () => {
      nova = "";
      m.el.querySelector("#pf-img").src = iniciais(u.nome);
    });
    m.on("c", () => m.fechar());
    m.on("g", async () => {
      try {
        const a = m.el.querySelector("#pf-a").value;
        const n = m.el.querySelector("#pf-n").value;
        const n2 = m.el.querySelector("#pf-n2").value;
        if (n || a || n2) {
          const hv = await window.Auth.digest(u.salt, a);
          if (hv !== u.hash && hv !== u.hashAlt) {
            m.erro("A palavra-passe actual está errada.");
            return;
          }
          if (n.length < 8) {
            m.erro("A nova palavra-passe precisa de pelo menos 8 caracteres.");
            return;
          }
          if (n !== n2) {
            m.erro("As novas palavras-passe não coincidem.");
            return;
          }
          u.salt = F.uid();
          u.hash = await window.Auth.digest(u.salt, n);
          delete u.hashAlt;
          u.mudouPw = true;
        }
        if (nova !== null) u.foto = nova;
        F.guardar();
        aplicarUser();
        m.fechar();
        F.toast("Perfil actualizado.");
      } catch (x) {
        m.erro("Erro: ".concat(x.message));
      }
    });
  };
  $("#perfil-btn").addEventListener("click", perfil);
  let logoNovo = null;
  const render = () => {
    const c = F.S.cfg;
    $("#acoes-aparencia").innerHTML = "";
    $("#c-aparencia").innerHTML = '<section class="cartao" aria-labelledby="h-ap1"><h3 id="h-ap1">Marca e cores</h3><form class="form grelha" id="f-ap" novalidate>\n      <div class="campo"><label for="ap-n">Nome do sistema *</label><input id="ap-n" name="nome" maxlength="40" value="'.concat(esc(c.nome), '"></div><div class="campo"><label for="ap-s">Subtítulo</label><input id="ap-s" name="sub" maxlength="60" value="').concat(esc(c.sub), '"></div>\n      <div class="campo"><label for="ap-l">Logótipo (PNG, JPG, WEBP ou SVG)</label><input id="ap-l" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div><div class="campo"><span class="lbl">Pré-visualização</span><img class="logo-prev" id="ap-prev" src="').concat(esc(valida(c.logo) ? c.logo : ICONE), '" alt="Logótipo actual"></div>\n      <div class="campo"><label for="ap-c1">Cor do menu</label><input id="ap-c1" name="cor1" type="color" value="').concat(esc(c.cor1), '"></div><div class="campo"><label for="ap-c2">Cor de destaque</label><input id="ap-c2" name="cor2" type="color" value="').concat(esc(c.cor2), '"></div>\n      <div class="campo"><label for="ap-c3">Cor secundária</label><input id="ap-c3" name="cor3" type="color" value="').concat(esc(c.cor3), '"></div><div class="campo"><label for="ap-fs">Tamanho da letra (').concat(esc(c.fs), ' px)</label><input id="ap-fs" name="fs" type="range" min="14" max="20" step="1" value="').concat(esc(c.fs), '"></div></form>\n      <p class="erro" id="ap-err" role="alert"></p><div class="acoes"><button type="button" class="btn prim" data-ap="g">Guardar</button><button type="button" class="btn" data-ap="sem-logo">Usar o logótipo padrão</button><button type="button" class="btn perigo" data-ap="repor">Repor tudo</button></div></section>\n      <section class="cartao"><h3>Também personalizável</h3><ul class="lista"><li>Painel: «+ Gráfico», «+ Indicador» e «Personalizar…» (cada utilizador tem o seu painel).</li><li>Fotografia de cada utilizador: clique no seu nome no menu.</li><li>Regras: salário (Finanças › Avançado) e distribuição das contas (Contas › Regra).</li><li>Itens do inventário e tipos de desconto.</li></ul></section>');
    logoNovo = null;
  };
  document.addEventListener("change", async (e) => {
    if (e.target.id === "ap-l") {
      try {
        const f = e.target.files[0];
        logoNovo = f.type === "image/svg+xml" ? await lerImagem(f, 256, "image/png") : await lerImagem(f, 256, "image/png");
        $("#ap-prev").src = logoNovo;
        $("#ap-err").textContent = "";
      } catch (x) {
        $("#ap-err").textContent = "Logótipo: ".concat(x.message, ".");
      }
    }
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-ap]");
    if (!b || !F.isAdmin()) return;
    const c = F.S.cfg;
    if (b.dataset.ap === "g") {
      const fm = $("#f-ap");
      const nome = F.clean(fm.nome.value, 40);
      if (nome.length < 2) {
        $("#ap-err").textContent = "Indique o nome do sistema.";
        fm.nome.focus();
        return;
      }
      Object.assign(c, { nome, sub: F.clean(fm.sub.value, 60), cor1: fm.cor1.value, cor2: fm.cor2.value, cor3: fm.cor3.value, fs: Number(fm.fs.value) });
      if (logoNovo) c.logo = logoNovo;
      F.guardar();
      aplicar();
      render();
      F.render();
      F.toast("Personalização guardada.");
    } else if (b.dataset.ap === "sem-logo") {
      c.logo = "";
      F.guardar();
      aplicar();
      render();
    } else if (b.dataset.ap === "repor" && await F.confirmar("Repor personalização", "Voltar ao nome, logótipo, cores e letra de origem?", "Repor")) {
      F.S.cfg = { ...F.CFG0 };
      document.documentElement.removeAttribute("style");
      F.guardar();
      aplicar();
      render();
    }
  });
  F.reg("aparencia", { render });
  aplicar();
  window.Marca = { aplicar, aplicarUser, foto, lerImagem };
})();
