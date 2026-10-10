(() => {
  "use strict";
  const A = window.CongApp;
  if (!A) return;
  const { esc, clean, $ } = A;
  const SES = "mmCongSessao";
  const PERFIS = {
    admin: { nome: "Administrador", fin: "edit", sec: "edit", enviar: true, def: true },
    tesoureiro: { nome: "Tesoureiro(a)", fin: "edit", sec: "read", enviar: true, def: false },
    secretario: { nome: "Secretário(a)", fin: "read", sec: "edit", enviar: true, def: false },
    consulta: { nome: "Só consulta", fin: "read", sec: "read", enviar: false, def: false }
  };
  const NIVEL = { none: 0, read: 1, edit: 2 };
  const PADRAO = [
    { user: "admin", nome: "Administrador", perfil: "admin", priv: { fin: "edit", sec: "edit", enviar: true, def: true }, salt: "mmA7q2", h2: "s2:90a26944adcf3f4b4ab5b167942e308c3d7d72e1fe614b762ab0b640bf169aeb", h1: "f1:63fcaea1d8911ae5" },
    { user: "secretaria", nome: "Secretaria", perfil: "secretario", priv: { fin: "read", sec: "edit", enviar: true, def: false }, salt: "mmS3k9", h2: "s2:77f31502bcba86a4d411c68c23f0525e5ab8dbbc60156d7fbce4a5d6efeb9563", h1: "f1:3ae3c92b85e3c913" },
    { user: "financas", nome: "Finanças", perfil: "tesoureiro", priv: { fin: "edit", sec: "read", enviar: true, def: false }, salt: "mmF5x1", h2: "s2:aec6116b7d9c31369d58f9c4da9e159a5b60620a79bd52fc9ae58137ddcd42d6", h1: "f1:576760a58b3f1c91" }
  ];
  let cur = null;
  const normU = (t) => clean(t, 40).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "");
  const S = () => A.S;
  const users = () => {
    const s = S();
    s.users = Array.isArray(s.users) ? s.users : [];
    if (!Array.isArray(s.congs)) s.congs = [...A.CONGS];
    return s.users;
  };
  const digest = async (salt, pw) => {
    const txt = "".concat(salt, ":").concat(pw);
    try {
      if (crypto.subtle) {
        const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
        return "s2:".concat([...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""));
      }
    } catch (_) {
    }
    return "f1:".concat(A.hash(txt)).concat(A.hash(txt.split("").reverse().join("")));
  };
  const can = (area, lvl = "edit") => {
    if (!cur) return false;
    if (cur.perfil === "admin") return true;
    const p = cur.priv || PERFIS[cur.perfil] || {};
    if (area === "enviar" || area === "def") return !!p[area];
    return (NIVEL[p[area]] || 0) >= NIVEL[lvl];
  };
  const isAdmin = () => !!cur && cur.perfil === "admin";
  const semear = async () => {
    const L = users();
    let mudou = false;
    for (const d of PADRAO) {
      if (L.some((x) => x.user === d.user)) continue;
      L.push({ id: A.uid(), nome: d.nome, user: d.user, salt: d.salt, hash: d.h2, hashAlt: d.h1, perfil: d.perfil, priv: { ...d.priv }, ativo: true, padrao: true, criado: (/* @__PURE__ */ new Date()).toISOString() });
      mudou = true;
    }
    if (mudou) A.save();
  };
  const renderNomes = () => {
    const P = S().perfil;
    $("#n-cong").value = P.congregacao || "";
    $("#n-lider").value = P.lider || "";
    $("#n-tes").value = P.responsavel || "";
    $("#n-sec").value = P.secretario || "";
    $("#n-tes").disabled = !can("fin");
    $("#n-sec").disabled = !can("sec");
  };
  $("#f-nomes").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $("#n-err");
    try {
      const cong = clean($("#n-cong").value, 80);
      const lider = clean($("#n-lider").value, 80);
      const tes = clean($("#n-tes").value, 80);
      const sec = clean($("#n-sec").value, 80);
      if (cong.length < 3) {
        err.textContent = "Indique o nome da congregação.";
        $("#n-cong").focus();
        return;
      }
      if (lider.length < 3) {
        err.textContent = "Indique o nome do líder.";
        $("#n-lider").focus();
        return;
      }
      const P = S().perfil;
      P.congregacao = cong;
      P.lider = lider;
      if (can("fin")) P.responsavel = tes;
      if (can("sec")) P.secretario = sec;
      if (!S().congs.some((c) => c.toLowerCase() === cong.toLowerCase()) && isAdmin()) S().congs.push(cong);
      err.textContent = "";
      if (A.save()) {
        A.render();
        renderNomes();
        A.toast("Nomes guardados.");
      }
    } catch (x) {
      err.textContent = "Erro: ".concat(x.message);
    }
  });
  const aplicar = () => {
    var _a;
    const vis = { lanc: can("fin", "read"), rel: can("fin", "read"), sec: can("sec", "read"), enviar: can("enviar"), def: true };
    document.querySelectorAll(".tab").forEach((b) => {
      b.hidden = !vis[b.dataset.tab];
    });
    document.body.classList.toggle("ro-fin", !can("fin"));
    document.body.classList.toggle("ro-sec", !can("sec"));
    document.body.classList.toggle("no-def", !can("def"));
    document.body.classList.toggle("is-admin", isAdmin());
    $("#users-card").hidden = !isAdmin();
    $("#congs-card").hidden = !isAdmin();
    document.querySelectorAll("#tab-def .card:not(#users-card):not(#congs-card):not(#f-nomes):not(#inst-card)").forEach((c) => {
      c.hidden = !can("def");
    });
    const first = ["lanc", "rel", "sec", "enviar", "def"].find((k) => vis[k]);
    const atual = (_a = document.querySelector('.tab[aria-current="page"]')) == null ? void 0 : _a.dataset.tab;
    if (!vis[atual]) A.setTab(first);
    $("#logout").title = cur ? "Terminar sessão (".concat(cur.nome, ")") : "Terminar sessão";
    $("#f-nomes").hidden = !cur;
    renderNomes();
    renderAdmin();
  };
  const mostrarLogin = () => {
    const L = users();
    const setup = !L.length;
    $("#login").hidden = false;
    $("#main").setAttribute("inert", "");
    document.querySelector(".app-head").setAttribute("inert", "");
    document.querySelector(".tabs").setAttribute("inert", "");
    $("#login-t").textContent = setup ? "Configuração inicial" : "Entrar";
    $("#login-sub").textContent = setup ? "Escolha a congregação e crie o utilizador administrador." : "".concat(S().perfil.congregacao || "Congregação", " — introduza o utilizador e a palavra-passe.");
    $("#login-fields").innerHTML = setup ? '<div class="field"><label for="lg-cong">Congregação *</label><select id="lg-cong">'.concat(S().congs.map((c) => "<option".concat(c === S().perfil.congregacao ? " selected" : "", ">").concat(esc(c), "</option>")).join(""), '</select></div>\n        <div class="field"><label for="lg-nome">Nome do administrador *</label><input id="lg-nome" maxlength="80" autocomplete="name" value="').concat(esc(S().perfil.responsavel || ""), '"></div>\n        <div class="field"><label for="lg-user">Utilizador *</label><input id="lg-user" maxlength="30" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" value="admin"></div>\n        <div class="field"><label for="lg-pw">Palavra-passe * (mín. 6)</label><input id="lg-pw" type="password" maxlength="60" autocomplete="new-password"></div>\n        <div class="field"><label for="lg-pw2">Repetir a palavra-passe *</label><input id="lg-pw2" type="password" maxlength="60" autocomplete="new-password"></div>') : '<div class="field"><label for="lg-user">Utilizador</label><input id="lg-user" maxlength="30" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false"></div><div class="field"><label for="lg-pw">Palavra-passe</label><input id="lg-pw" type="password" maxlength="60" autocomplete="current-password"></div>';
    $("#login-btn").textContent = setup ? "Criar e entrar" : "Entrar";
    $("#login-err").textContent = "";
    setTimeout(() => $(setup ? "#lg-nome" : "#lg-user").focus(), 50);
  };
  const entrar = (u) => {
    cur = u;
    try {
      sessionStorage.setItem(SES, u.id);
    } catch (_) {
    }
    $("#login").hidden = true;
    ["#main", ".app-head", ".tabs"].forEach((q) => document.querySelector(q).removeAttribute("inert"));
    aplicar();
    A.render();
    A.toast("Bem-vindo(a), ".concat(u.nome, "."));
  };
  $("#f-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#login-err");
    const L = users();
    try {
      const user = normU($("#lg-user").value);
      const pw = $("#lg-pw").value;
      if (!L.length) {
        const nome = clean($("#lg-nome").value, 80);
        if (nome.length < 3) {
          err.textContent = "Indique o nome do administrador.";
          $("#lg-nome").focus();
          return;
        }
        if (!/^[a-z0-9._-]{3,30}$/.test(user)) {
          err.textContent = "Utilizador: 3 a 30 letras minúsculas, números, ponto, hífen ou _.";
          $("#lg-user").focus();
          return;
        }
        if (pw.length < 6) {
          err.textContent = "A palavra-passe precisa de pelo menos 6 caracteres.";
          $("#lg-pw").focus();
          return;
        }
        if (pw !== $("#lg-pw2").value) {
          err.textContent = "As palavras-passe não coincidem.";
          $("#lg-pw2").focus();
          return;
        }
        const salt = A.uid();
        const u2 = { id: A.uid(), nome, user, salt, hash: await digest(salt, pw), perfil: "admin", priv: { ...PERFIS.admin }, ativo: true, criado: (/* @__PURE__ */ new Date()).toISOString() };
        L.push(u2);
        S().perfil.congregacao = $("#lg-cong").value;
        if (!S().perfil.responsavel) S().perfil.responsavel = nome;
        A.save();
        entrar(u2);
        return;
      }
      const u = L.find((x) => x.user === user && x.ativo !== false);
      const hv = u ? await digest(u.salt, pw) : "";
      if (!u || hv !== u.hash && hv !== u.hashAlt) {
        err.textContent = "Utilizador ou palavra-passe incorrectos.";
        $("#lg-pw").value = "";
        $("#lg-pw").focus();
        return;
      }
      entrar(u);
    } catch (x) {
      err.textContent = "Erro ao entrar: ".concat(x.message);
    }
  });
  $("#logout").addEventListener("click", () => {
    cur = null;
    try {
      sessionStorage.removeItem(SES);
    } catch (_) {
    }
    mostrarLogin();
  });
  const renderAdmin = () => {
    if (!isAdmin()) return;
    const L = users();
    const nv = { edit: "editar", read: "ver", none: "sem acesso" };
    $("#users-list").innerHTML = L.map((u) => {
      const p = u.perfil === "admin" ? PERFIS.admin : u.priv || PERFIS[u.perfil];
      return '<li><div class="l-main"><b>'.concat(esc(u.nome), "</b><small>").concat(esc(u.user), " · ").concat(esc((PERFIS[u.perfil] || {}).nome || u.perfil)).concat(u.ativo === false ? " · inactivo" : "", " · Finanças: ").concat(nv[p.fin], " · Secretaria: ").concat(nv[p.sec]).concat(p.enviar ? " · envia" : "").concat(p.def ? " · definições" : "", "</small></div>\n      ").concat(u.padrao && !u.mudouPw ? '<small class="aviso">palavra-passe padrão — altere-a</small>' : "", '<div class="l-acts"><button type="button" class="btn small" data-ue="').concat(esc(u.id), '">Editar</button><button type="button" class="btn small danger" data-ud="').concat(esc(u.id), '"').concat(u.id === cur.id ? " disabled" : "", ">Eliminar</button></div></li>");
    }).join("");
    $("#congs-list").innerHTML = S().congs.map((c, i) => '<li><div class="l-main">'.concat(esc(c)).concat(c === S().perfil.congregacao ? " <small>(esta)</small>" : "", '</div><div class="l-acts"><button type="button" class="btn small danger" data-cd="').concat(i, '"').concat(c === S().perfil.congregacao ? " disabled" : "", ' aria-label="Remover ').concat(esc(c), '">Remover</button></div></li>')).join("");
  };
  const userDlg = (u) => {
    const L = users();
    const p = u ? u.priv || PERFIS[u.perfil] : PERFIS.tesoureiro;
    const sel = (id, v) => '<select id="'.concat(id, '">').concat([["edit", "Editar"], ["read", "Só ver"], ["none", "Sem acesso"]].map(([k, l]) => '<option value="'.concat(k, '"').concat(v === k ? " selected" : "", ">").concat(l, "</option>")).join(""), "</select>");
    const d = document.createElement("dialog");
    d.setAttribute("aria-label", u ? "Editar utilizador" : "Novo utilizador");
    d.innerHTML = '<form method="dialog" class="dlg-box" novalidate><h2>'.concat(u ? "Editar utilizador" : "Novo utilizador", '</h2><div class="grid">\n      <div class="field"><label for="ud-n">Nome *</label><input id="ud-n" maxlength="80" value="').concat(esc(u ? u.nome : ""), '"></div><div class="field"><label for="ud-u">Utilizador *</label><input id="ud-u" maxlength="30" autocapitalize="none" autocorrect="off" spellcheck="false" value="').concat(esc(u ? u.user : ""), '"></div>\n      <div class="field"><label for="ud-p">Palavra-passe ').concat(u ? "(vazio = mantém)" : "* (mín. 6)", '</label><input id="ud-p" type="password" maxlength="60" autocomplete="new-password"></div>\n      <div class="field"><label for="ud-f">Perfil</label><select id="ud-f">').concat(Object.entries(PERFIS).map(([k, v]) => '<option value="'.concat(k, '"').concat((u ? u.perfil : "tesoureiro") === k ? " selected" : "", ">").concat(v.nome, "</option>")).join(""), '</select></div>\n      <div class="field"><label for="ud-fin">Finanças</label>').concat(sel("ud-fin", p.fin), '</div><div class="field"><label for="ud-sec">Secretaria</label>').concat(sel("ud-sec", p.sec), '</div></div>\n      <label class="check"><input type="checkbox" id="ud-env"').concat(p.enviar ? " checked" : "", '> Pode enviar ficheiros à sede</label><label class="check"><input type="checkbox" id="ud-def"').concat(p.def ? " checked" : "", '> Pode alterar definições e fazer cópias</label><label class="check"><input type="checkbox" id="ud-at"').concat(!u || u.ativo !== false ? " checked" : "", '> Activo</label>\n      <p class="err" role="alert"></p><div class="actions"><button value="cancel" class="btn">Cancelar</button><button type="button" class="btn primary" data-ok>Guardar</button></div></form>');
    document.body.appendChild(d);
    d.addEventListener("close", () => d.remove());
    const q = (id) => d.querySelector(id);
    q("#ud-f").addEventListener("change", (e) => {
      const P = PERFIS[e.target.value];
      q("#ud-fin").value = P.fin;
      q("#ud-sec").value = P.sec;
      q("#ud-env").checked = P.enviar;
      q("#ud-def").checked = P.def;
    });
    q("[data-ok]").addEventListener("click", async () => {
      const err = q(".err");
      try {
        const nome = clean(q("#ud-n").value, 80);
        const user = normU(q("#ud-u").value);
        const pw = q("#ud-p").value;
        const perfil = q("#ud-f").value;
        const ativo = q("#ud-at").checked;
        if (nome.length < 3) {
          err.textContent = "Indique o nome.";
          return;
        }
        if (!/^[a-z0-9._-]{3,30}$/.test(user)) {
          err.textContent = "Utilizador: 3 a 30 letras minúsculas, números, ponto, hífen ou _.";
          return;
        }
        if (L.some((x2) => x2.user === user && x2 !== u)) {
          err.textContent = "Esse utilizador já existe.";
          return;
        }
        if ((!u || pw) && pw.length < 6) {
          err.textContent = "A palavra-passe precisa de pelo menos 6 caracteres.";
          return;
        }
        const admins = L.filter((x2) => x2.perfil === "admin" && x2.ativo !== false && x2 !== u);
        if (u && u.perfil === "admin" && (perfil !== "admin" || !ativo) && !admins.length) {
          err.textContent = "Tem de existir pelo menos um administrador activo.";
          return;
        }
        if (u && u.id === cur.id && !ativo) {
          err.textContent = "Não pode desactivar o seu próprio utilizador.";
          return;
        }
        const priv = { fin: q("#ud-fin").value, sec: q("#ud-sec").value, enviar: q("#ud-env").checked, def: q("#ud-def").checked };
        const x = u || { id: A.uid(), salt: A.uid(), criado: (/* @__PURE__ */ new Date()).toISOString() };
        Object.assign(x, { nome, user, perfil, priv, ativo });
        if (pw) {
          x.salt = A.uid();
          x.hash = await digest(x.salt, pw);
          delete x.hashAlt;
          x.mudouPw = true;
        }
        if (!u) L.push(x);
        A.save();
        d.close();
        aplicar();
        A.toast("Utilizador guardado.");
      } catch (e2) {
        err.textContent = "Erro: ".concat(e2.message);
      }
    });
    d.showModal();
  };
  document.addEventListener("click", async (e) => {
    if (e.target.closest("#user-add")) {
      if (isAdmin()) userDlg(null);
      return;
    }
    const ue = e.target.closest("[data-ue]");
    const ud = e.target.closest("[data-ud]");
    const cd = e.target.closest("[data-cd]");
    if (ue && isAdmin()) userDlg(users().find((u) => u.id === ue.dataset.ue));
    if (ud && isAdmin()) {
      const L = users();
      const u = L.find((x) => x.id === ud.dataset.ud);
      if (!u || u.id === cur.id) return;
      if (u.perfil === "admin" && L.filter((x) => x.perfil === "admin").length < 2) {
        A.toast("Não pode eliminar o único administrador.");
        return;
      }
      if (await A.confirmar("Eliminar utilizador", "Eliminar o utilizador «".concat(u.nome, "»?"), "Eliminar")) {
        L.splice(L.indexOf(u), 1);
        A.save();
        renderAdmin();
      }
    }
    if (cd && isAdmin()) {
      const c = S().congs[+cd.dataset.cd];
      if (c && await A.confirmar("Remover congregação", "Remover «".concat(c, "» da lista?"), "Remover")) {
        S().congs.splice(+cd.dataset.cd, 1);
        A.save();
        A.render();
        renderAdmin();
      }
    }
    if (e.target.closest("#cong-add") && isAdmin()) {
      const n = clean($("#cong-new").value, 80);
      if (n.length < 3) {
        A.toast("Escreva o nome da congregação.");
        return;
      }
      if (S().congs.some((x) => x.toLowerCase() === n.toLowerCase())) {
        A.toast("Essa congregação já está na lista.");
        return;
      }
      S().congs.push(n);
      $("#cong-new").value = "";
      A.save();
      A.render();
      renderAdmin();
    }
  });
  window.CongAuth = { can, isAdmin, user: () => cur, aplicar };
  (async () => {
    users();
    $("#login").hidden = false;
    await semear();
    let sid = null;
    try {
      sid = sessionStorage.getItem(SES);
    } catch (_) {
    }
    const u = sid && users().find((x) => x.id === sid && x.ativo !== false);
    if (u) {
      $("#login").hidden = true;
      cur = u;
      aplicar();
    } else mostrarLogin();
    window.APP_OK = true;
  })().catch((e) => {
    console.error("Arranque:", e);
  });
})();
