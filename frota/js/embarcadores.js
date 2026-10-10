(() => {
  "use strict";
  const { $, esc } = F;
  const st = { barco: "todas", estado: "", q: "" };
  const dias = (e) => {
    var _a, _b;
    return (_b = (_a = F.tempo(e.embarque, e.desembarque || F.hoje())) == null ? void 0 : _a.total) != null ? _b : 0;
  };
  const estado = (e) => e.desembarque ? "Desembarcado" : "A bordo";
  const sobrepoe = (a, b) => {
    const fa = a.desembarque || "9999-12-31";
    const fb = b.desembarque || "9999-12-31";
    return a.embarque <= fb && b.embarque <= fa;
  };
  const campos = [
    { k: "nome", label: "Embarcador", obrig: true, min2: 3, max: 80, lista: () => F.S.colab.map((c) => c.nome) },
    { k: "barco", label: "Embarcação", tipo: "select", obrig: true, opcoes: () => window.Barcos.opcoes() },
    { k: "funcao", label: "Função a bordo", max: 40, lista: () => ["Embarcador", "Mestre", "Marinheiro", "Motorista", "Cozinheiro", "Pescador"] },
    { k: "embarque", label: "Data de embarque", tipo: "date", obrig: true, def: F.hoje() },
    { k: "desembarque", label: "Data de desembarque (vazio = a bordo)", tipo: "date" },
    { k: "obs", label: "Observações", tipo: "textarea", full: true, max: 300 }
  ];
  const validar = (v, atual) => {
    if (v.embarque > F.hoje()) return "A data de embarque não pode ser futura.";
    if (v.desembarque && v.desembarque < v.embarque) return "O desembarque não pode ser antes do embarque.";
    const choque = F.S.embarques.find((x) => x !== atual && F.norm(x.nome) === F.norm(v.nome) && sobrepoe(x, v));
    if (choque) return "".concat(v.nome, " já está registado em ").concat(window.Barcos.nome(choque.barco), " nessas datas (embarque ").concat(F.fmtData(choque.embarque), ").");
    return "";
  };
  const editar = (x) => F.formModal({ titulo: x ? "Editar embarque" : "Registar embarque", campos, largo: true, valores: x || { barco: st.barco !== "todas" ? st.barco : "", funcao: "Embarcador" }, guardar: (v) => {
    const e = validar(v, x);
    if (e) return e;
    const col = F.S.colab.find((c) => F.norm(c.nome) === F.norm(v.nome));
    v.colab = col ? col.id : "";
    if (x) Object.assign(x, v, { alterado: (/* @__PURE__ */ new Date()).toISOString() });
    else F.S.embarques.push({ id: F.uid(), ...v, criado: (/* @__PURE__ */ new Date()).toISOString(), por: F.user.user });
    F.guardar();
    F.render();
    F.toast("Embarque guardado.");
    return "";
  } });
  const render = (ed) => {
    const L = F.S.embarques.filter((e) => (st.barco === "todas" || e.barco === st.barco) && (!st.estado || estado(e) === st.estado) && (!st.q || F.norm(e.nome).includes(F.norm(st.q)))).sort((a, b) => b.embarque.localeCompare(a.embarque));
    const bordo = F.S.embarques.filter((e) => !e.desembarque);
    const fechados = F.S.embarques.filter((e) => e.desembarque);
    const media = fechados.length ? Math.round(fechados.reduce((t, e) => t + dias(e), 0) / fechados.length) : 0;
    const porBarco = window.Barcos.ativos().map((b) => ({ b, L: bordo.filter((e) => e.barco === b.id) }));
    return "".concat(ed ? '<div class="acoes"><button type="button" class="btn prim" data-em="novo">+ Registar embarque</button></div>' : "", '\n      <div class="kpis">').concat(F.kpi(bordo.length, "A bordo agora")).concat(F.kpi(F.S.embarques.filter((e) => e.embarque.startsWith(F.hoje().slice(0, 4))).length, "Embarques em ".concat(F.hoje().slice(0, 4)))).concat(F.kpi("".concat(media, " dias"), "Média de dias a bordo")).concat(F.kpi(new Set(F.S.embarques.map((e) => F.norm(e.nome))).size, "Embarcadores diferentes"), '</div>\n      <section class="cartao" aria-labelledby="h-bordo"><h3 id="h-bordo">Quem está a bordo</h3><div class="bordo">').concat(porBarco.map((x) => '<div class="bordo-b"><b>'.concat(esc(x.b.nome), "</b>").concat(x.L.length ? "<ul>".concat(x.L.map((e) => "<li>".concat(esc(e.nome), " <small>(").concat(esc(e.funcao || "Embarcador"), ", ").concat(dias(e), " dias)</small></li>")).join(""), "</ul>") : '<p class="dica">Ninguém a bordo.</p>', "</div>")).join(""), '</div></section>\n      <div class="filtros"><div class="campo"><label for="fe-b">Embarcação</label><select id="fe-b" data-fe="barco">').concat(window.Barcos.opcoes(true).map(([v, l]) => '<option value="'.concat(esc(v), '"').concat(v === st.barco ? " selected" : "", ">").concat(esc(l), "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="fe-e">Estado</label><select id="fe-e" data-fe="estado"><option value="">Todos</option>').concat(["A bordo", "Desembarcado"].map((e) => "<option".concat(e === st.estado ? " selected" : "", ">").concat(e, "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="fe-q">Nome</label><input id="fe-q" type="search" data-fe="q" value="').concat(esc(st.q), '" placeholder="Procurar…"></div></div>\n      ').concat(F.tabela([
      { t: "Embarcador", f: (e) => "<b>".concat(esc(e.nome), "</b>") },
      { t: "Embarcação", f: (e) => esc(window.Barcos.nome(e.barco)) },
      { t: "Função", f: (e) => esc(e.funcao || "—") },
      { t: "Embarque", f: (e) => F.fmtData(e.embarque) },
      { t: "Desembarque", f: (e) => e.desembarque ? F.fmtData(e.desembarque) : "—" },
      { t: "Dias a bordo", f: (e) => dias(e), num: true },
      { t: "Estado", f: (e) => '<span class="tag '.concat(e.desembarque ? "ok" : "consumo", '">').concat(estado(e), "</span>") },
      { t: "Observações", f: (e) => esc(e.obs || "—") },
      { t: "Acções", f: (e) => ed ? "".concat(e.desembarque ? "" : '<button type="button" class="btn peq prim" data-em="desemb" data-id="'.concat(esc(e.id), '">Desembarcar</button> '), '<button type="button" class="btn peq" data-em="ed" data-id="').concat(esc(e.id), '">Editar</button> <button type="button" class="btn peq perigo" data-em="del" data-id="').concat(esc(e.id), '">Eliminar</button>') : "—" }
    ], L, "Sem embarques registados.", "Embarques"));
  };
  document.addEventListener("change", (e) => {
    var _a, _b, _c;
    const f = (_b = (_a = e.target).closest) == null ? void 0 : _b.call(_a, "[data-fe]");
    if (f && f.dataset.fe !== "q") {
      st[f.dataset.fe] = f.value;
      F.render();
      (_c = $("#".concat(f.id))) == null ? void 0 : _c.focus();
    }
  });
  document.addEventListener("input", (e) => {
    var _a, _b;
    const f = (_b = (_a = e.target).closest) == null ? void 0 : _b.call(_a, '[data-fe="q"]');
    if (f) {
      st.q = F.clean(f.value, 60);
      F.render();
      const x = $("#fe-q");
      x.focus();
      x.setSelectionRange(x.value.length, x.value.length);
    }
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-em]");
    if (!b || b.disabled || !F.pode("colab")) return;
    const x = F.S.embarques.find((y) => y.id === b.dataset.id);
    const a = b.dataset.em;
    if (a === "novo") editar(null);
    else if (a === "ed" && x) editar(x);
    else if (a === "desemb" && x) F.formModal({ titulo: "Desembarcar — ".concat(x.nome), valores: { desembarque: F.hoje() }, campos: [{ k: "desembarque", label: "Data de desembarque", tipo: "date", obrig: true }], guardar: (v) => {
      if (v.desembarque < x.embarque) return "O desembarque não pode ser antes do embarque.";
      if (v.desembarque > F.hoje()) return "A data não pode ser futura.";
      x.desembarque = v.desembarque;
      x.alterado = (/* @__PURE__ */ new Date()).toISOString();
      F.guardar();
      F.render();
      F.toast("".concat(x.nome, " desembarcou após ").concat(dias(x), " dias."));
      return "";
    } });
    else if (a === "del" && x && await F.confirmar("Eliminar embarque", "Eliminar o embarque de ".concat(x.nome, " (").concat(F.fmtData(x.embarque), ")?"), "Eliminar")) {
      F.S.embarques.splice(F.S.embarques.indexOf(x), 1);
      F.guardar();
      F.render();
    }
  });
  window.Embarc = { render, dias, estado };
})();
