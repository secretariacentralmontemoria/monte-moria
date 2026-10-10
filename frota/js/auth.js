(() => {
  "use strict";
  const { $, esc, clean, norm } = F;
  const SES = "ebenezerSessao";
  const AREAS = [["fin", "Finanças"], ["contas", "Contas"], ["sal", "Salários"], ["inv", "Inventário"], ["barcos", "Embarcações"], ["colab", "Colaboradores"]];
  const PADRAO = [
    { user: "admin", nome: "Administrador", perfil: "admin", priv: { fin: "edit", contas: "edit", sal: "edit", inv: "edit", barcos: "edit", colab: "edit", dados: true }, salt: "fbA9k2", h2: "s2:b283c07b5d721f0463b1293d3c5683f1706387e8a705e87763db26a02c1488ba", h1: "f1:699ab543f5e5f583" },
    { user: "financas", nome: "Finanças", perfil: "utilizador", priv: { fin: "edit", contas: "edit", sal: "edit", inv: "read", barcos: "read", colab: "read", dados: true }, salt: "fbF4m7", h2: "s2:584791b21bb0db481a76f37fe57b7eefe428f3d574694d43ca56f315e5648437", h1: "f1:167819efc582f7ff" },
    { user: "inventario", nome: "Inventário", perfil: "utilizador", priv: { fin: "none", contas: "none", sal: "none", inv: "edit", barcos: "read", colab: "read", dados: true }, salt: "fbI8q3", h2: "s2:066580ff8f4e1e7a4a383df8729481f2b7a18d4ebbc2545437898f610fd29cf3", h1: "f1:49a9f7cc13f15eca" }
  ];
  const digest = async (salt, pw) => {
    const t = "".concat(salt, ":").concat(pw);
    try {
      if (crypto.subtle) {
        const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
        return "s2:".concat([...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""));
      }
    } catch (_) {
    }
    return "f1:".concat(F.hash(t)).concat(F.hash(t.split("").reverse().join("")));
  };
  const semear = () => {
    const L = F.S.users;
    let mudou = false;
    PADRAO.forEach((d) => {
      if (L.some((x) => x.user === d.user)) return;
      L.push({ id: F.uid(), nome: d.nome, user: d.user, perfil: d.perfil, priv: { ...d.priv }, salt: d.salt, hash: d.h2, hashAlt: d.h1, ativo: true, padrao: true });
      mudou = true;
    });
    if (mudou) F.guardar();
  };
  const bloquear = (on) => {
    [".app"].forEach((q) => {
      const el = document.querySelector(q);
      if (!el) return;
      if (on) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
    $("#login").hidden = !on;
  };
  const entrar = (u) => {
    F.user = u;
    try {
      sessionStorage.setItem(SES, u.id);
    } catch (_) {
    }
    bloquear(false);
    $("#quem").textContent = u.nome;
    $("#quem-perfil").textContent = u.perfil === "admin" ? "Administrador" : "Utilizador";
    if (window.Marca) window.Marca.aplicarUser();
    F.ir(F.aba || "painel");
    const aniv = window.Colab ? window.Colab.hoje() : [];
    if (aniv.length) F.toast("🎂 Hoje fazem anos: ".concat(aniv.map((c) => c.nome).join(", "), "."));
    else F.toast("Bem-vindo(a), ".concat(u.nome, "."));
  };
  const sair = () => {
    F.user = null;
    try {
      sessionStorage.removeItem(SES);
    } catch (_) {
    }
    $("#f-login").reset();
    $("#lg-err").textContent = "";
    bloquear(true);
    setTimeout(() => $("#lg-user").focus(), 50);
  };
  $("#f-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#lg-err");
    try {
      const user = norm($("#lg-user").value).replace(/[^a-z0-9._-]/g, "");
      const pw = $("#lg-pw").value;
      if (!user || !pw) {
        err.textContent = "Indique o utilizador e a palavra-passe.";
        return;
      }
      const u = F.S.users.find((x) => x.user === user && x.ativo !== false);
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
  $("#sair").addEventListener("click", sair);
  const nv = { edit: "editar", read: "ver", none: "—" };
  const render = () => {
    $("#acoes-users").innerHTML = '<button type="button" class="btn prim" data-u="novo">+ Utilizador</button>';
    $("#c-users").innerHTML = '<p class="dica">Perfis: <b>Administrador</b> (tudo, regras, compilar, restaurar) ou <b>Utilizador</b> com privilégios por área.</p>' + F.tabela([
      { t: "Nome", f: (u) => '<span class="u-cel"><img class="foto mini" src="'.concat(esc(window.Marca ? window.Marca.foto(u) : ""), '" alt=""><b>').concat(esc(u.nome), "</b></span>").concat(u.padrao && !u.mudouPw ? '<br><small class="aviso">palavra-passe padrão — altere-a</small>' : "") },
      { t: "Utilizador", f: (u) => esc(u.user) },
      { t: "Perfil", f: (u) => u.perfil === "admin" ? "Administrador" : "Utilizador" },
      ...AREAS.map(([k, l]) => ({ t: l, f: (u) => {
        var _a;
        return u.perfil === "admin" ? "editar" : nv[((_a = u.priv) == null ? void 0 : _a[k]) || "none"];
      } })),
      { t: "Exportar/enviar", f: (u) => {
        var _a;
        return u.perfil === "admin" || ((_a = u.priv) == null ? void 0 : _a.dados) ? "sim" : "não";
      } },
      { t: "Estado", f: (u) => u.ativo === false ? "inactivo" : "activo" },
      { t: "Acções", f: (u) => '<button type="button" class="btn peq" data-u="ed" data-id="'.concat(esc(u.id), '">Editar</button> <button type="button" class="btn peq perigo" data-u="del" data-id="').concat(esc(u.id), '"').concat(u.id === F.user.id ? " disabled" : "", ">Eliminar</button>") }
    ], F.S.users, "Sem utilizadores.", "Utilizadores");
  };
  const editar = (u) => {
    const L = F.S.users;
    const sel = [["edit", "Editar"], ["read", "Só ver"], ["none", "Sem acesso"]];
    const campos = [
      { k: "nome", label: "Nome", obrig: true, min2: 3, max: 80 },
      { k: "user", label: "Utilizador", obrig: true, max: 30, dica: "Letras, números, ponto, hífen ou _ (sem espaços)." },
      { k: "pw", label: u ? "Nova palavra-passe (vazio = mantém)" : "Palavra-passe", tipo: "password", obrig: !u, max: 60 },
      { k: "perfil", label: "Perfil", tipo: "select", opcoes: [["utilizador", "Utilizador"], ["admin", "Administrador"]] },
      ...AREAS.map(([k, l]) => ({ k, label: l, tipo: "select", opcoes: sel })),
      { k: "dados", label: "Pode exportar e enviar dados", tipo: "checkbox" },
      { k: "ativo", label: "Activo", tipo: "checkbox" }
    ];
    const val = u ? { nome: u.nome, user: u.user, perfil: u.perfil, ...u.priv, ativo: u.ativo !== false } : { perfil: "utilizador", fin: "read", contas: "read", sal: "read", inv: "read", barcos: "read", colab: "read", dados: false, ativo: true };
    F.formModal({ titulo: u ? "Editar utilizador" : "Novo utilizador", campos, valores: val, largo: true, guardar: async (v) => {
      const user = norm(v.user).replace(/[^a-z0-9._-]/g, "");
      if (user.length < 3) return "Utilizador: pelo menos 3 letras ou números.";
      if (L.some((x2) => x2.user === user && x2 !== u)) return "Esse utilizador já existe.";
      const pw = F.$('[name="pw"]', document.querySelector("dialog[open]")).value;
      if ((!u || pw) && pw.length < 8) return "A palavra-passe precisa de pelo menos 8 caracteres.";
      const admins = L.filter((x2) => x2.perfil === "admin" && x2.ativo !== false && x2 !== u);
      if (u && u.perfil === "admin" && (v.perfil !== "admin" || !v.ativo) && !admins.length) return "Tem de existir pelo menos um administrador activo.";
      if (u && u.id === F.user.id && !v.ativo) return "Não pode desactivar o seu próprio utilizador.";
      const x = u || { id: F.uid() };
      Object.assign(x, { nome: v.nome, user, perfil: v.perfil, ativo: v.ativo, priv: { fin: v.fin, contas: v.contas, sal: v.sal, inv: v.inv, barcos: v.barcos, colab: v.colab, dados: v.dados } });
      if (pw) {
        x.salt = F.uid();
        x.hash = await digest(x.salt, pw);
        delete x.hashAlt;
        x.mudouPw = true;
      }
      if (!u) L.push(x);
      F.guardar();
      render();
      F.toast("Utilizador guardado.");
      return "";
    } });
  };
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-u]");
    if (!b || b.disabled || !F.isAdmin()) return;
    const L = F.S.users;
    const u = L.find((x) => x.id === b.dataset.id);
    if (b.dataset.u === "novo") editar(null);
    else if (b.dataset.u === "ed" && u) editar(u);
    else if (b.dataset.u === "del" && u) {
      if (u.perfil === "admin" && L.filter((x) => x.perfil === "admin").length < 2) {
        F.toast("Não pode eliminar o único administrador.", "erro");
        return;
      }
      if (await F.confirmar("Eliminar utilizador", "Eliminar «".concat(u.nome, "»?"), "Eliminar")) {
        L.splice(L.indexOf(u), 1);
        F.guardar();
        render();
      }
    }
  });
  F.reg("users", { render });
  window.Auth = { iniciar: () => {
    semear();
    let sid = null;
    try {
      sid = sessionStorage.getItem(SES);
    } catch (_) {
    }
    const u = sid && F.S.users.find((x) => x.id === sid && x.ativo !== false);
    if (u) entrar(u);
    else sair();
  }, digest };
})();
