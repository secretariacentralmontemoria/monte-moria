(() => {
  "use strict";
  const { $, esc } = F;
  const Barcos = {
    todos: () => F.S.barcos,
    ativos: () => F.S.barcos.filter((b) => b.ativo !== false),
    nome: (id) => (F.S.barcos.find((b) => b.id === id) || { nome: "(embarcação removida)" }).nome,
    opcoes: (todas = false) => [...todas ? [["todas", "Todas as embarcações"]] : [], ...F.S.barcos.filter((b) => b.ativo !== false).map((b) => [b.id, b.nome])]
  };
  const camposBarco = [
    { k: "nome", label: "Nome da embarcação", obrig: true, min2: 2, max: 60 },
    { k: "implantacao", label: "Data de implementação", tipo: "date", dica: "Data em que a embarcação entrou em actividade." },
    { k: "rep1", label: "1.º representante (nome)", max: 80 },
    { k: "rep2", label: "2.º representante (nome)", max: 80 },
    { k: "ativo", label: "Activa", tipo: "checkbox" },
    { k: "obs", label: "Observações", tipo: "textarea", full: true, max: 600 }
  ];
  const renderBarcos = () => {
    const ed = F.pode("barcos");
    const ad = F.isAdmin();
    $("#acoes-barcos").innerHTML = "".concat(ad ? '<button type="button" class="btn prim" data-b="novo">+ Embarcação</button>' : "", '<button type="button" class="btn" data-b="imp">Imprimir…</button>');
    const L = F.S.barcos.map((b) => ({ ...b, t: F.tempo(b.implantacao) }));
    $("#c-barcos").innerHTML = '<p class="dica">O tempo de actividade é contado automaticamente a partir da data de implementação.</p>' + F.tabela([
      { t: "Embarcação", f: (b) => "<b>".concat(esc(b.nome), "</b>").concat(b.ativo === false ? " <small>(inactiva)</small>" : "") },
      { t: "Implementação", f: (b) => b.implantacao ? F.fmtData(b.implantacao) : '<span class="aviso">por definir</span>' },
      { t: "Tempo de actividade", f: (b) => esc(F.tempoTxt(b.t)) },
      { t: "Representantes", f: (b) => esc([b.rep1, b.rep2].filter(Boolean).join(" · ") || "—") },
      { t: "Observações", f: (b) => esc(b.obs || "—") },
      { t: "Acções", f: (b) => '<button type="button" class="btn peq" data-b="ed" data-id="'.concat(esc(b.id), '"').concat(ed ? "" : " disabled", ">Editar</button>").concat(ad ? ' <button type="button" class="btn peq perigo" data-b="del" data-id="'.concat(esc(b.id), '">Eliminar</button>') : "") }
    ], L, "Sem embarcações.", "Embarcações");
  };
  const editarBarco = (b) => F.formModal({ titulo: b ? "Editar ".concat(b.nome) : "Nova embarcação", campos: camposBarco, valores: b || { ativo: true }, largo: true, guardar: (v) => {
    v.nome = v.nome.toUpperCase();
    if (F.S.barcos.some((x) => F.norm(x.nome) === F.norm(v.nome) && x !== b)) return "Já existe uma embarcação com esse nome.";
    if (v.implantacao && v.implantacao > F.hoje()) return "A data de implementação não pode ser futura.";
    if (b) Object.assign(b, v, { alterado: (/* @__PURE__ */ new Date()).toISOString() });
    else F.S.barcos.push({ id: F.uid(), ...v, criado: (/* @__PURE__ */ new Date()).toISOString() });
    F.guardar();
    F.render();
    F.toast("Embarcação guardada.");
    return "";
  } });
  const camposColab = [
    { k: "nome", label: "Nome", obrig: true, min2: 3, max: 80 },
    { k: "nasc", label: "Data de nascimento", tipo: "date", obrig: true },
    { k: "contacto", label: "Contacto", tipo: "tel", max: 30 },
    { k: "funcao", label: "Função", max: 60, lista: () => ["Marinheiro", "Mestre", "Motorista", "Cozinheiro", "Pescador", "Mecânico"] },
    { k: "cargo", label: "Cargo", max: 60, lista: () => ["Comandante", "Imediato", "Tripulante", "Representante", "Administrativo"] },
    { k: "barco", label: "Embarcação", tipo: "select", opcoes: () => [["", "— nenhuma —"], ...Barcos.opcoes()] },
    { k: "morada", label: "Morada", max: 160, full: true },
    { k: "obs", label: "Observações", tipo: "textarea", full: true, max: 600 }
  ];
  const ateAniv = (nasc) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nasc || "")) return null;
    const h = new Date(F.hoje());
    let p = new Date(h.getFullYear(), +nasc.slice(5, 7) - 1, +nasc.slice(8, 10));
    if (p < h) p = new Date(h.getFullYear() + 1, p.getMonth(), p.getDate());
    return Math.round((p - h) / 864e5);
  };
  const Colab = { hoje: () => F.S.colab.filter((c) => ateAniv(c.nasc) === 0), proximos: (dias = 30) => F.S.colab.map((c) => ({ ...c, d: ateAniv(c.nasc) })).filter((c) => c.d !== null && c.d <= dias).sort((a, b) => a.d - b.d) };
  let subC = "lista";
  const renderColab = () => {
    const ed = F.pode("colab");
    const sub = F.subabas("colab", [["lista", "Colaboradores"], ["embarc", "Embarcadores"]], subC);
    if (subC === "embarc") {
      $("#acoes-colab").innerHTML = "";
      $("#c-colab").innerHTML = sub + window.Embarc.render(ed);
      return;
    }
    $("#acoes-colab").innerHTML = "".concat(ed ? '<button type="button" class="btn prim" data-c="novo">+ Colaborador</button>' : "", '<button type="button" class="btn" data-c="imp">Imprimir / imagem…</button>');
    const P = Colab.proximos(30);
    const alerta = P.length ? '<div class="alerta info" role="status"><b>🎂 Aniversários nos próximos 30 dias</b><ul>'.concat(P.map((c) => {
      var _a, _b;
      return "<li>".concat(c.d === 0 ? "<b>Hoje</b>" : c.d === 1 ? "Amanhã" : "Daqui a ".concat(c.d, " dias"), " — ").concat(esc(c.nome), " (").concat(F.fmtData(c.nasc).slice(0, 5), ", faz ").concat(((_b = (_a = F.tempo(c.nasc)) == null ? void 0 : _a.anos) != null ? _b : 0) + (c.d === 0 ? 0 : 1), " anos)</li>");
    }).join(""), "</ul></div>") : '<p class="dica">Sem aniversários nos próximos 30 dias.</p>';
    const L = F.S.colab.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt")).map((c) => ({ ...c, _cls: ateAniv(c.nasc) === 0 ? "destaque" : "" }));
    $("#c-colab").innerHTML = sub + alerta + F.tabela([
      { t: "Nome", f: (c) => "<b>".concat(esc(c.nome), "</b>") },
      { t: "Idade", f: (c) => {
        var _a, _b;
        return esc((_b = (_a = F.tempo(c.nasc)) == null ? void 0 : _a.anos) != null ? _b : "—");
      }, num: true },
      { t: "Nascimento", f: (c) => F.fmtData(c.nasc) },
      { t: "Função", f: (c) => esc(c.funcao || "—") },
      { t: "Cargo", f: (c) => esc(c.cargo || "—") },
      { t: "Embarcação", f: (c) => esc(c.barco ? Barcos.nome(c.barco) : "—") },
      { t: "Contacto", f: (c) => esc(c.contacto || "—") },
      { t: "Morada", f: (c) => esc(c.morada || "—") },
      { t: "Acções", f: (c) => ed ? '<button type="button" class="btn peq" data-c="ed" data-id="'.concat(esc(c.id), '">Editar</button> <button type="button" class="btn peq perigo" data-c="del" data-id="').concat(esc(c.id), '">Eliminar</button>') : "—" }
    ], L, "Ainda não há colaboradores registados.", "Colaboradores");
  };
  const editarColab = (c) => F.formModal({ titulo: c ? "Editar colaborador" : "Novo colaborador", campos: camposColab, valores: c || {}, largo: true, guardar: (v) => {
    var _a, _b;
    if (v.nasc > F.hoje()) return "A data de nascimento não pode ser futura.";
    if (((_b = (_a = F.tempo(v.nasc)) == null ? void 0 : _a.anos) != null ? _b : 0) > 100) return "Verifique a data de nascimento.";
    if (c) Object.assign(c, v, { alterado: (/* @__PURE__ */ new Date()).toISOString() });
    else F.S.colab.push({ id: F.uid(), ...v, criado: (/* @__PURE__ */ new Date()).toISOString() });
    F.guardar();
    F.render();
    F.toast("Colaborador guardado.");
    return "";
  } });
  const badge = () => {
    const n = Colab.proximos(7).length;
    const b = $("#badge-colab");
    b.hidden = !n;
    b.textContent = n;
    b.setAttribute("aria-label", "".concat(n, " aniversário(s) nos próximos 7 dias"));
  };
  document.addEventListener("click", async (e) => {
    var _a;
    const sb = e.target.closest('[data-sub^="colab:"]');
    if (sb) {
      subC = sb.dataset.sub.split(":")[1];
      renderColab();
      (_a = $('[data-sub="'.concat(sb.dataset.sub, '"]'))) == null ? void 0 : _a.focus();
      return;
    }
    const b = e.target.closest("[data-b]");
    const c = e.target.closest("[data-c]");
    if (b && !b.disabled) {
      const x = F.S.barcos.find((y) => y.id === b.dataset.id);
      if (b.dataset.b === "novo" && F.isAdmin()) editarBarco(null);
      else if (b.dataset.b === "ed" && x && F.pode("barcos")) editarBarco(x);
      else if (b.dataset.b === "imp") F.papelDlg("Imprimir — embarcações", () => "<h2>Embarcações</h2>".concat(F.tabela([{ t: "Embarcação", f: (y) => esc(y.nome) }, { t: "Implementação", f: (y) => F.fmtData(y.implantacao) }, { t: "Tempo de actividade", f: (y) => esc(F.tempoTxt(F.tempo(y.implantacao))) }, { t: "Representantes", f: (y) => esc([y.rep1, y.rep2].filter(Boolean).join(" · ")) }, { t: "Observações", f: (y) => esc(y.obs) }], F.S.barcos)));
      else if (b.dataset.b === "del" && x && F.isAdmin()) {
        const usado = F.S.entradas.some((y) => y.barco === x.id) || F.S.saidas.some((y) => y.barco === x.id) || F.S.viagens.some((y) => y.barco === x.id);
        if (usado) {
          if (await F.confirmar("Embarcação com registos", "".concat(x.nome, " tem registos financeiros ou de inventário. Desactivar em vez de eliminar? Os registos mantêm-se."), "Desactivar")) {
            x.ativo = false;
            F.guardar();
            F.render();
          }
          return;
        }
        if (await F.confirmar("Eliminar embarcação", "Eliminar ".concat(x.nome, "?"), "Eliminar")) {
          F.S.barcos.splice(F.S.barcos.indexOf(x), 1);
          F.guardar();
          F.render();
        }
      }
    }
    if (c && !c.disabled) {
      const x = F.S.colab.find((y) => y.id === c.dataset.id);
      if (c.dataset.c === "imp") {
        F.papelDlg("Imprimir — colaboradores", () => "<h2>Colaboradores</h2>".concat(F.tabela([{ t: "Nome", f: (y) => esc(y.nome) }, { t: "Nascimento", f: (y) => F.fmtData(y.nasc) }, { t: "Função", f: (y) => esc(y.funcao) }, { t: "Cargo", f: (y) => esc(y.cargo) }, { t: "Contacto", f: (y) => esc(y.contacto) }, { t: "Morada", f: (y) => esc(y.morada) }], F.S.colab)));
        return;
      }
      if (!F.pode("colab")) return;
      if (c.dataset.c === "novo") editarColab(null);
      else if (c.dataset.c === "ed" && x) editarColab(x);
      else if (c.dataset.c === "del" && x && await F.confirmar("Eliminar colaborador", "Eliminar ".concat(x.nome, "?"), "Eliminar")) {
        F.S.colab.splice(F.S.colab.indexOf(x), 1);
        F.guardar();
        F.render();
      }
    }
  });
  F.reg("barcos", { render: renderBarcos });
  F.reg("colab", { render: renderColab, badge });
  window.Barcos = Barcos;
  window.Colab = Colab;
})();
