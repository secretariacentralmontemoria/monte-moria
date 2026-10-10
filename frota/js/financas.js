(() => {
  "use strict";
  const { $, esc, kz, r2 } = F;
  const st = { barco: "todas", ano: "todos", mes: "", sub: "entradas", a: "", b: "" };
  const passa = (r) => (st.barco === "todas" || r.barco === st.barco) && (st.ano === "todos" || r.data.slice(0, 4) === st.ano) && (!st.mes || r.data.slice(5, 7) === st.mes);
  const contas = (barco = null, filtro = passa) => {
    const E = F.S.entradas.filter((x) => (!barco || x.barco === barco) && filtro(x));
    const D = F.S.saidas.filter((x) => (!barco || x.barco === barco) && filtro(x));
    const g = F.S.regra;
    const on = g.ativa !== false;
    const receita = E.reduce((t, x) => t + x.valor, 0);
    const manutEnt = E.reduce((t, x) => t + (x.manutencao || 0), 0);
    const empresa = on ? receita * g.empresa / 100 : receita;
    const restante = receita - empresa;
    const rep1 = on ? restante * g.rep1 / 100 : 0;
    const rep2 = on ? restante * g.rep2 / 100 : 0;
    const sobra = restante - rep1 - rep2;
    const saiCaixa = D.filter((x) => x.tipo !== "Manutenção").reduce((t, x) => t + x.valor, 0);
    const saiManut = D.filter((x) => x.tipo === "Manutenção").reduce((t, x) => t + x.valor, 0);
    return {
      receita: r2(receita),
      manutEnt: r2(manutEnt),
      empresa: r2(empresa),
      restante: r2(restante),
      rep1: r2(rep1),
      rep2: r2(rep2),
      sobra: r2(sobra),
      saiCaixa: r2(saiCaixa),
      saiManut: r2(saiManut),
      caixa: r2(empresa + sobra - saiCaixa),
      manut: r2(manutEnt - saiManut),
      nE: E.length,
      nS: D.length
    };
  };
  const tudo = () => true;
  const anos = () => [...new Set([...F.S.entradas, ...F.S.saidas].map((x) => x.data.slice(0, 4)).concat(F.hoje().slice(0, 4)))].sort().reverse();
  const camposE = () => [
    { k: "barco", label: "Embarcação", tipo: "select", obrig: true, opcoes: () => window.Barcos.opcoes() },
    { k: "data", label: "Data", tipo: "date", obrig: true, def: F.hoje() },
    { k: "descricao", label: "Descrição", obrig: true, min2: 3, max: 160, full: true },
    { k: "valor", label: "Valor (Kz)", tipo: "number", obrig: true, dica: "Receita da embarcação (entra na regra de salário)." },
    { k: "manutencao", label: "Manutenção (Kz)", tipo: "number", dica: "Fundo de manutenção (só desce com saídas de manutenção)." },
    { k: "obs", label: "Observação", tipo: "textarea", full: true, max: 300 }
  ];
  const camposS = () => [
    { k: "barco", label: "Embarcação", tipo: "select", obrig: true, opcoes: () => window.Barcos.opcoes() },
    { k: "data", label: "Data", tipo: "date", obrig: true, def: F.hoje() },
    { k: "tipo", label: "Descontar em", tipo: "select", opcoes: [["Caixa", "Caixa (parte da empresa)"], ["Manutenção", "Fundo de manutenção"]] },
    { k: "valor", label: "Valor (Kz)", tipo: "number", obrig: true, min: 0.01 },
    { k: "descricao", label: "Descrição", obrig: true, min2: 3, max: 160, full: true },
    { k: "obs", label: "Observação", tipo: "textarea", full: true, max: 300 }
  ];
  const editarE = (x) => F.formModal({ titulo: x ? "Editar entrada" : "Nova entrada", campos: camposE(), valores: x || { barco: st.barco !== "todas" ? st.barco : "" }, largo: true, guardar: (v) => {
    if (!(v.valor > 0) && !(v.manutencao > 0)) return "Indique o valor ou o valor de manutenção (pelo menos um maior que zero).";
    if (v.data > F.hoje()) return "A data não pode ser futura.";
    if (x) Object.assign(x, v, { alterado: (/* @__PURE__ */ new Date()).toISOString() });
    else F.S.entradas.push({ id: F.uid(), ...v, criado: (/* @__PURE__ */ new Date()).toISOString(), por: F.user.user });
    F.guardar();
    F.render();
    F.toast("Entrada guardada.");
    return "";
  } });
  const editarS = (x) => F.formModal({ titulo: x ? "Editar saída" : "Nova saída", campos: camposS(), valores: x || { barco: st.barco !== "todas" ? st.barco : "", tipo: "Caixa" }, largo: true, guardar: async (v) => {
    if (v.data > F.hoje()) return "A data não pode ser futura.";
    const c = contas(v.barco, tudo);
    const disp = (v.tipo === "Manutenção" ? c.manut : c.caixa) + (x && x.barco === v.barco && x.tipo === v.tipo ? x.valor : 0);
    if (v.valor > disp && !await F.confirmar("Saldo insuficiente", "".concat(window.Barcos.nome(v.barco), ": ").concat(v.tipo === "Manutenção" ? "fundo de manutenção" : "caixa", " disponível ").concat(kz(disp), " Kz. Registar mesmo assim (fica negativo)?"), "Registar")) return "Saída não registada.";
    if (x) Object.assign(x, v, { alterado: (/* @__PURE__ */ new Date()).toISOString() });
    else F.S.saidas.push({ id: F.uid(), ...v, criado: (/* @__PURE__ */ new Date()).toISOString(), por: F.user.user });
    F.guardar();
    F.render();
    F.toast("Saída guardada.");
    return "";
  } });
  const editarRegra = () => {
    const g = F.S.regra;
    F.formModal({
      titulo: "Regra de salário",
      valores: g,
      campos: [
        { k: "ativa", label: "Aplicar a regra", tipo: "checkbox" },
        { k: "empresa", label: "Retido pela empresa (% da receita)", tipo: "number", obrig: true, maxN: 100 },
        { k: "rep1", label: "1.º representante (% do restante)", tipo: "number", obrig: true, maxN: 100 },
        { k: "rep2", label: "2.º representante (% do restante)", tipo: "number", obrig: true, maxN: 100 },
        { k: "nome1", label: "Designação do 1.º", obrig: true, max: 40 },
        { k: "nome2", label: "Designação do 2.º", obrig: true, max: 40 }
      ],
      guardar: (v) => {
        if (v.rep1 + v.rep2 > 100) return "A soma das percentagens dos representantes não pode passar de 100%.";
        Object.assign(F.S.regra, v);
        F.guardar();
        F.render();
        F.toast("Regra de salário actualizada.");
        return "";
      }
    });
  };
  const filtros = () => '<div class="filtros" role="group" aria-label="Filtros">\n      <div class="campo"><label for="ff-b">Embarcação</label><select id="ff-b" data-ff="barco">'.concat(window.Barcos.opcoes(true).map(([v, l]) => '<option value="'.concat(esc(v), '"').concat(v === st.barco ? " selected" : "", ">").concat(esc(l), "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="ff-a">Ano</label><select id="ff-a" data-ff="ano"><option value="todos">Todos</option>').concat(anos().map((a) => "<option".concat(a === st.ano ? " selected" : "", ">").concat(a, "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="ff-m">Mês</label><select id="ff-m" data-ff="mes"><option value="">Todos</option>').concat(F.MESES.map((m, i) => '<option value="'.concat(F.pad(i + 1), '"').concat(F.pad(i + 1) === st.mes ? " selected" : "", ">").concat(m, "</option>")).join(""), "</select></div></div>");
  const subs = [["entradas", "Entradas"], ["saidas", "Saídas"], ["salario", "Avançado — salário"], ["graficos", "Gráficos e comparação"]];
  const render = () => {
    const ed = F.pode("fin");
    const c = contas(st.barco === "todas" ? null : st.barco);
    $("#acoes-financas").innerHTML = "".concat(ed ? '<button type="button" class="btn prim" data-f="e+">+ Entrada</button><button type="button" class="btn" data-f="s+">+ Saída</button>' : "", '<button type="button" class="btn" data-f="imp">Imprimir / imagem…</button>');
    let corpo = "";
    if (st.sub === "entradas") {
      let ac = 0;
      const L = F.S.entradas.filter(passa).sort((a, b) => a.data.localeCompare(b.data)).map((x) => {
        ac += x.valor;
        return { ...x, ac };
      }).reverse();
      corpo = F.tabela([
        { t: "Data", f: (x) => F.fmtData(x.data) },
        { t: "Embarcação", f: (x) => esc(window.Barcos.nome(x.barco)) },
        { t: "Descrição", f: (x) => esc(x.descricao) },
        { t: "Valor (Kz)", f: (x) => kz(x.valor), num: true },
        { t: "Manutenção (Kz)", f: (x) => kz(x.manutencao), num: true },
        { t: "Acumulado (Kz)", f: (x) => kz(x.ac), num: true },
        { t: "Acções", f: (x) => ed ? '<button type="button" class="btn peq" data-f="e" data-id="'.concat(esc(x.id), '">Editar</button> <button type="button" class="btn peq perigo" data-f="ed" data-id="').concat(esc(x.id), '">Eliminar</button>') : "—" }
      ], L, "Sem entradas no período escolhido.", "Entradas");
    } else if (st.sub === "saidas") {
      const L = F.S.saidas.filter(passa).sort((a, b) => b.data.localeCompare(a.data));
      corpo = F.tabela([
        { t: "Data", f: (x) => F.fmtData(x.data) },
        { t: "Embarcação", f: (x) => esc(window.Barcos.nome(x.barco)) },
        { t: "Descontado em", f: (x) => x.tipo === "Manutenção" ? '<span class="tag manut">Manutenção</span>' : '<span class="tag caixa">Caixa</span>' },
        { t: "Descrição", f: (x) => esc(x.descricao) },
        { t: "Valor (Kz)", f: (x) => kz(x.valor), num: true },
        { t: "Acções", f: (x) => ed ? '<button type="button" class="btn peq" data-f="s" data-id="'.concat(esc(x.id), '">Editar</button> <button type="button" class="btn peq perigo" data-f="sd" data-id="').concat(esc(x.id), '">Eliminar</button>') : "—" }
      ], L, "Sem saídas no período escolhido.", "Saídas");
    } else if (st.sub === "salario") corpo = salario();
    else corpo = graficosHTML();
    $("#c-financas").innerHTML = "".concat(filtros(), '<div class="kpis">').concat(F.kpi("".concat(kz(c.receita), " Kz"), "Entradas (receita)")).concat(F.kpi("".concat(kz(c.caixa), " Kz"), "Em caixa (empresa)", c.caixa < 0 ? "neg" : "")).concat(F.kpi("".concat(kz(c.manut), " Kz"), "Manutenção disponível", c.manut < 0 ? "neg" : "")).concat(F.kpi("".concat(kz(c.rep1 + c.rep2), " Kz"), "Para os representantes")).concat(F.kpi("".concat(kz(c.saiCaixa + c.saiManut), " Kz"), "Saídas"), '</div>\n      <div class="subabas" role="tablist" aria-label="Finanças">').concat(subs.map(([k, l]) => '<button type="button" role="tab" class="sub-btn" aria-selected="'.concat(st.sub === k, '" data-fs="').concat(k, '">').concat(l, "</button>")).join(""), '</div><div class="sub-corpo" role="tabpanel">').concat(corpo, "</div>");
    if (st.sub === "graficos") desenhar();
  };
  const salario = () => {
    const g = F.S.regra;
    const on = g.ativa !== false;
    const B = st.barco === "todas" ? window.Barcos.todos() : window.Barcos.todos().filter((b) => b.id === st.barco);
    const T = contas(st.barco === "todas" ? null : st.barco);
    const linha = (nome, c, b) => ({ nome, c, b });
    const L = B.map((b) => linha(b.nome, contas(b.id), b)).filter((x) => x.c.nE || x.c.nS);
    const regra = on ? "<p><b>Regra em vigor:</b> a empresa retém <b>".concat(g.empresa, "%</b> das entradas; do restante, <b>").concat(g.rep1, "%</b> para o ").concat(esc(g.nome1), " e <b>").concat(g.rep2, "%</b> para o ").concat(esc(g.nome2)).concat(g.rep1 + g.rep2 < 100 ? "; os outros ".concat(r2(100 - g.rep1 - g.rep2), "% ficam em caixa") : "", ". O que é pago aos representantes sai das contas; o resto fica em caixa. As saídas de caixa descontam só na parte da empresa.</p>") : '<p class="aviso"><b>Regra de salário eliminada:</b> todas as entradas ficam em caixa.</p>';
    const cols = [
      { t: "Embarcação", f: (x) => "<b>".concat(esc(x.nome), "</b>") },
      { t: "Entradas", f: (x) => kz(x.c.receita), num: true },
      { t: "Empresa (".concat(on ? g.empresa : 100, "%)"), f: (x) => kz(x.c.empresa), num: true },
      { t: "Restante", f: (x) => kz(x.c.restante), num: true },
      { t: "".concat(g.nome1, " (").concat(on ? g.rep1 : 0, "%)"), f: (x) => "".concat(kz(x.c.rep1)).concat(x.b && x.b.rep1 ? "<br><small>".concat(esc(x.b.rep1), "</small>") : ""), num: true },
      { t: "".concat(g.nome2, " (").concat(on ? g.rep2 : 0, "%)"), f: (x) => "".concat(kz(x.c.rep2)).concat(x.b && x.b.rep2 ? "<br><small>".concat(esc(x.b.rep2), "</small>") : ""), num: true },
      { t: "Saídas de caixa", f: (x) => kz(x.c.saiCaixa), num: true },
      { t: "Em caixa", f: (x) => "<b>".concat(kz(x.c.caixa), "</b>"), num: true },
      { t: "Manutenção (entradas − saídas)", f: (x) => "".concat(kz(x.c.manutEnt), " − ").concat(kz(x.c.saiManut), " = <b>").concat(kz(x.c.manut), "</b>"), num: true }
    ];
    const tot = { nome: "TOTAL", c: T, b: null, _cls: "total" };
    return '<div class="caixa-regra">'.concat(regra).concat(F.isAdmin() ? '<div class="acoes"><button type="button" class="btn" data-f="regra">Editar regra</button>' + (on ? '<button type="button" class="btn perigo" data-f="regra-off">Eliminar regra</button>' : '<button type="button" class="btn" data-f="regra-on">Repor regra padrão</button>') + "</div>" : "", "</div>") + F.tabela(cols, L.length ? [...L, tot] : [], "Sem movimentos no período escolhido.", "Divisão das entradas");
  };
  const confG = () => {
    const k = "fin-".concat(F.user.id);
    const P = F.S.painel;
    if (!P[k]) P[k] = { widgets: [
      { id: "f1", tipo: "chart", titulo: "Acumulado financeiro: entradas por mês", fonte: "entradas", medida: "soma:valor", agrupar: "mes", grafico: "area", cor: "#0E7C86", valores: true, altura: "m", filtro: {} },
      { id: "f2", tipo: "chart", titulo: "Entradas por embarcação", fonte: "entradas", medida: "soma:valor", agrupar: "barco", grafico: "bar", cor: "#335C81", valores: true, multicor: true, altura: "m", filtro: {} },
      { id: "f3", tipo: "chart", titulo: "Em caixa por embarcação", fonte: "resumo", medida: "soma:caixa", agrupar: "barco", grafico: "barH", cor: "#5B8E7D", valores: true, altura: "m", filtro: {} },
      { id: "f4", tipo: "chart", titulo: "Saídas por tipo", fonte: "saidas", medida: "soma:valor", agrupar: "tipo", grafico: "doughnut", cor: "#E09F3E", valores: true, altura: "m", filtro: {} }
    ] };
    return P[k];
  };
  const graficosHTML = () => {
    const meses = [...new Set(F.S.entradas.map((x) => x.data.slice(0, 7)))].sort();
    if (!st.a) st.a = meses[meses.length - 2] || meses[0] || F.hoje().slice(0, 7);
    if (!st.b) st.b = meses[meses.length - 1] || F.hoje().slice(0, 7);
    const ac = [];
    let t = 0;
    meses.filter((m) => st.ano === "todos" || m.startsWith(st.ano)).forEach((m) => {
      t += F.S.entradas.filter((x) => (st.barco === "todas" || x.barco === st.barco) && x.data.startsWith(m)).reduce((s, x) => s + x.valor, 0);
      ac.push([m, t]);
    });
    return '<div class="acoes"><button type="button" class="btn" data-f="g+">+ Gráfico</button></div><div id="fin-g"></div>\n      <section class="cartao" aria-labelledby="h-acum"><h3 id="h-acum">Acumulado financeiro (entradas)</h3>'.concat(F.tabela([{ t: "Mês", f: (x) => F.mesLbl(x[0]) }, { t: "Acumulado (Kz)", f: (x) => kz(x[1]), num: true }], ac.slice(-12).reverse(), "Sem entradas."), '</section>\n      <section class="cartao" aria-labelledby="h-per"><h3 id="h-per">Comparar entradas entre dois meses</h3><div class="filtros"><div class="campo"><label for="per-a">Mês A</label><input type="month" id="per-a" data-per="a" value="').concat(esc(st.a), '"></div><div class="campo"><label for="per-b">Mês B</label><input type="month" id="per-b" data-per="b" value="').concat(esc(st.b), '"></div></div>\n      ').concat(F.tabela(
      [{ t: "Embarcação", f: (x) => esc(x.nome) }, { t: F.mesLbl(st.a), f: (x) => kz(x.a), num: true }, { t: F.mesLbl(st.b), f: (x) => kz(x.b), num: true }, { t: "Variação", f: (x) => x.a ? "".concat(x.b >= x.a ? "▲" : "▼", " ").concat(Math.abs(r2((x.b - x.a) / x.a * 100)), "%") : x.b ? "novo" : "—", num: true }],
      window.Barcos.todos().map((b) => ({ nome: b.nome, a: F.S.entradas.filter((x) => x.barco === b.id && x.data.startsWith(st.a)).reduce((t2, x) => t2 + x.valor, 0), b: F.S.entradas.filter((x) => x.barco === b.id && x.data.startsWith(st.b)).reduce((t2, x) => t2 + x.valor, 0) })),
      "",
      "Comparação entre meses"
    ), "</section>");
  };
  const desenhar = () => G.montar($("#fin-g"), { chave: "fin", widgets: confG().widgets, filtro: { barco: st.barco, ano: st.ano }, editavel: true, guardar: () => F.guardar() });
  const relatorio = () => {
    const c = contas(st.barco === "todas" ? null : st.barco);
    const filtroTxt = "".concat(st.barco === "todas" ? "Todas as embarcações" : window.Barcos.nome(st.barco), " · ").concat(st.ano === "todos" ? "todos os anos" : st.ano).concat(st.mes ? " · ".concat(F.MESES[+st.mes - 1]) : "");
    return "<h2>Relatório financeiro</h2><p>".concat(esc(filtroTxt), '</p><div class="kpis">').concat(F.kpi("".concat(kz(c.receita), " Kz"), "Entradas")).concat(F.kpi("".concat(kz(c.caixa), " Kz"), "Em caixa")).concat(F.kpi("".concat(kz(c.manut), " Kz"), "Manutenção disponível")).concat(F.kpi("".concat(kz(c.rep1 + c.rep2), " Kz"), "Representantes"), "</div>").concat(salario().replace(/<div class="acoes">[\s\S]*?<\/div>/, ""));
  };
  document.addEventListener("change", (e) => {
    var _a, _b, _c, _d, _e, _f;
    const f = (_b = (_a = e.target).closest) == null ? void 0 : _b.call(_a, "[data-ff]");
    const p = (_d = (_c = e.target).closest) == null ? void 0 : _d.call(_c, "[data-per]");
    if (f) {
      st[f.dataset.ff] = f.value;
      render();
      (_e = $("#".concat(f.id))) == null ? void 0 : _e.focus();
    }
    if (p && /^\d{4}-\d{2}$/.test(p.value)) {
      st[p.dataset.per] = p.value;
      render();
      (_f = $("#".concat(p.id))) == null ? void 0 : _f.focus();
    }
  });
  document.addEventListener("click", async (e) => {
    var _a;
    const s = e.target.closest("[data-fs]");
    if (s) {
      st.sub = s.dataset.fs;
      render();
      (_a = $('[data-fs="'.concat(st.sub, '"]'))) == null ? void 0 : _a.focus();
      return;
    }
    const b = e.target.closest("[data-f]");
    if (!b || b.disabled) return;
    const a = b.dataset.f;
    if (a === "imp") {
      F.papelDlg("Relatório financeiro", relatorio);
      return;
    }
    if (a === "g+") {
      G.editor(null, (w) => {
        confG().widgets.push(w);
        F.guardar();
        render();
        F.toast("Gráfico acrescentado.");
      });
      return;
    }
    if (a.startsWith("regra")) {
      if (!F.isAdmin()) return;
      if (a === "regra") editarRegra();
      else if (a === "regra-off" && await F.confirmar("Eliminar regra de salário", "Sem regra, todas as entradas ficam em caixa e não há valores para os representantes. Pode repor depois.", "Eliminar")) {
        F.S.regra.ativa = false;
        F.guardar();
        render();
      } else if (a === "regra-on") {
        F.S.regra = { ...F.REGRA0 };
        F.guardar();
        render();
      }
      return;
    }
    if (!F.pode("fin")) {
      F.toast("Não tem permissão para alterar as finanças.", "erro");
      return;
    }
    const E = F.S.entradas.find((x) => x.id === b.dataset.id);
    const D = F.S.saidas.find((x) => x.id === b.dataset.id);
    if (a === "e+") editarE(null);
    else if (a === "s+") editarS(null);
    else if (a === "e" && E) editarE(E);
    else if (a === "s" && D) editarS(D);
    else if (a === "ed" && E && await F.confirmar("Eliminar entrada", "Eliminar «".concat(E.descricao, "» (").concat(kz(E.valor), " Kz)?"), "Eliminar")) {
      F.S.entradas.splice(F.S.entradas.indexOf(E), 1);
      F.guardar();
      render();
    } else if (a === "sd" && D && await F.confirmar("Eliminar saída", "Eliminar «".concat(D.descricao, "» (").concat(kz(D.valor), " Kz)?"), "Eliminar")) {
      F.S.saidas.splice(F.S.saidas.indexOf(D), 1);
      F.guardar();
      render();
    }
  });
  F.reg("financas", { render });
  window.Fin = { contas, tudo };
})();
