(() => {
  "use strict";
  const { $, esc, kz, r2 } = F;
  const st = { sub: "pag", barco: "todas", ano: "todos", mes: "", cat: "", estado: "", q: "" };
  const METODOS = ["Numerário", "Transferência", "Multicaixa", "Outro"];
  const estado = (p) => {
    if (p.devido > 0 && p.pago >= p.devido) return "Pago";
    const atraso = p.periodo && p.periodo < F.hoje().slice(0, 7);
    if (p.pago > 0) return atraso ? "Parcial em atraso" : "Parcial";
    return atraso ? "Em atraso" : "Pendente";
  };
  const pend = (p) => r2(Math.max(0, p.devido - p.pago));
  const cats = () => [...new Set(["Mestre", "Embarcadores", "Tripulação", "Representante", ...F.S.regraContas.partes.map((x) => x.nome), ...F.S.regraContas.divisao.map((x) => x.nome), ...F.S.pagamentos.map((p) => p.categoria)].filter(Boolean))];
  const nomes = () => [...new Set([...F.S.colab.map((c) => c.nome), ...F.S.embarques.map((e) => e.nome), ...F.S.barcos.flatMap((b) => [b.rep1, b.rep2]), ...F.S.pagamentos.map((p) => p.beneficiario)].filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt"));
  const passa = (p) => (st.barco === "todas" || p.barco === st.barco) && (st.ano === "todos" || (p.periodo || "").startsWith(st.ano)) && (!st.mes || (p.periodo || "").slice(5, 7) === st.mes) && (!st.cat || p.categoria === st.cat) && (!st.estado || estado(p).startsWith(st.estado) || st.estado === "Em atraso" && estado(p).includes("atraso")) && (!st.q || F.norm(p.beneficiario).includes(F.norm(st.q)));
  const recibo = () => "R".concat((/* @__PURE__ */ new Date()).getFullYear(), "-").concat(String(F.S.pagamentos.reduce((t, p) => t + (p.movs || []).length, 0) + 1).padStart(4, "0"));
  const editar = (p) => F.formModal({
    titulo: p ? "Editar valor a pagar" : "Novo valor a pagar",
    largo: true,
    valores: p || { periodo: F.hoje().slice(0, 7), barco: st.barco !== "todas" ? st.barco : "" },
    campos: [
      { k: "beneficiario", label: "Beneficiário", obrig: true, min2: 3, max: 80, lista: nomes },
      { k: "categoria", label: "Categoria", obrig: true, max: 40, lista: cats },
      { k: "barco", label: "Embarcação", tipo: "select", opcoes: () => [["", "— nenhuma —"], ...window.Barcos.opcoes()] },
      { k: "periodo", label: "Período (mês)", tipo: "month", obrig: true },
      { k: "devido", label: "Valor devido (Kz)", tipo: "number", obrig: true, min: 0.01 },
      { k: "conta", label: "Conta de viagem associada", tipo: "select", opcoes: () => [["", "— nenhuma —"], ...F.S.contas.map((c) => [c.id, "".concat(window.Barcos.nome(c.barco), " · ").concat(c.ref)])] },
      { k: "obs", label: "Observações", tipo: "textarea", full: true, max: 300 }
    ],
    guardar: (v) => {
      if (!/^\d{4}-\d{2}$/.test(v.periodo)) return "Indique o período (mês).";
      if (p && v.devido < p.pago) return "Já foram pagos ".concat(kz(p.pago), " Kz: o valor devido não pode ser menor.");
      if (p) Object.assign(p, v, { alterado: (/* @__PURE__ */ new Date()).toISOString() });
      else F.S.pagamentos.push({ id: F.uid(), ...v, pago: 0, movs: [], data: "".concat(v.periodo, "-01"), criado: (/* @__PURE__ */ new Date()).toISOString(), por: F.user.user });
      F.guardar();
      render();
      F.toast("Valor a pagar guardado.");
      return "";
    }
  });
  const pagar = (p) => F.formModal({
    titulo: "Pagar — ".concat(p.beneficiario),
    valores: { valor: pend(p), data: F.hoje(), metodo: "Numerário", recibo: recibo() },
    extra: '<p class="dica">Devido '.concat(kz(p.devido), " Kz · já pago ").concat(kz(p.pago), " Kz · por pagar <b>").concat(kz(pend(p)), " Kz</b>.</p>"),
    campos: [
      { k: "valor", label: "Valor pago agora (Kz)", tipo: "number", obrig: true, min: 0.01 },
      { k: "data", label: "Data do pagamento", tipo: "date", obrig: true },
      { k: "metodo", label: "Método", tipo: "select", opcoes: METODOS },
      { k: "recibo", label: "N.º do recibo", obrig: true, max: 30 },
      { k: "obs", label: "Observação", max: 160, full: true }
    ],
    guardar: async (v) => {
      if (v.data > F.hoje()) return "A data do pagamento não pode ser futura.";
      if (F.S.pagamentos.some((x) => (x.movs || []).some((mv) => mv.recibo === v.recibo))) return "Esse n.º de recibo já foi usado.";
      if (v.valor > pend(p) && !await F.confirmar("Pagamento acima do devido", "O valor (".concat(kz(v.valor), " Kz) é maior do que o que falta pagar (").concat(kz(pend(p)), " Kz). Registar mesmo assim?"), "Registar")) return "Pagamento não registado.";
      p.movs = p.movs || [];
      p.movs.push({ id: F.uid(), ...v, por: F.user.user });
      p.pago = r2(p.movs.reduce((t, mv) => t + mv.valor, 0));
      p.alterado = (/* @__PURE__ */ new Date()).toISOString();
      F.guardar();
      render();
      F.toast("Pagamento registado (recibo ".concat(v.recibo, ")."));
      return "";
    }
  });
  const reciboHTML = (p, mv) => '<div class="recibo"><h2>Recibo n.º '.concat(esc(mv.recibo), "</h2><p>").concat(esc(F.S.cfg.nome), " — ").concat(esc(F.S.cfg.sub), "</p>\n    ").concat(F.tabela([{ t: "Campo", f: (x) => esc(x[0]) }, { t: "Detalhe", f: (x) => esc(x[1]) }], [
    ["Beneficiário", p.beneficiario],
    ["Categoria", p.categoria],
    ["Embarcação", p.barco ? window.Barcos.nome(p.barco) : "—"],
    ["Período", p.periodo ? F.mesLbl(p.periodo) : "—"],
    ["Valor pago", "".concat(kz(mv.valor), " Kz")],
    ["Data", F.fmtData(mv.data)],
    ["Método", mv.metodo],
    ["Total devido / pago", "".concat(kz(p.devido), " / ").concat(kz(p.pago), " Kz")],
    ["Por pagar", "".concat(kz(pend(p)), " Kz")]
  ]), '\n    <div class="assin"><div><span></span>Quem pagou</div><div><span></span>').concat(esc(p.beneficiario), "</div></div></div>");
  const historico = (p) => {
    const m = F.modal({ titulo: "Pagamentos — ".concat(p.beneficiario), largo: true, corpo: '<p class="dica">'.concat(esc(p.categoria), " · ").concat(p.periodo ? F.mesLbl(p.periodo) : "", " · devido ").concat(kz(p.devido), " Kz · pago ").concat(kz(p.pago), " Kz · estado: <b>").concat(esc(estado(p)), "</b></p>").concat(F.tabela([
      { t: "Data", f: (x) => F.fmtData(x.data) },
      { t: "Recibo", f: (x) => esc(x.recibo) },
      { t: "Método", f: (x) => esc(x.metodo) },
      { t: "Valor", f: (x) => kz(x.valor), num: true },
      { t: "Acções", f: (x) => '<button type="button" class="btn peq" data-rc="'.concat(esc(x.id), '">Recibo</button>').concat(F.pode("sal") ? ' <button type="button" class="btn peq perigo" data-ra="'.concat(esc(x.id), '">Anular</button>') : "") }
    ], p.movs || [], "Ainda sem pagamentos.")), botoes: [{ id: "f", label: "Fechar", classe: "prim" }] });
    m.on("f", () => m.fechar());
    m.el.addEventListener("click", async (e) => {
      const rc = e.target.closest("[data-rc]");
      const ra = e.target.closest("[data-ra]");
      const mv = (p.movs || []).find((x) => {
        var _a;
        return x.id === ((_a = rc || ra) == null ? void 0 : _a.dataset[rc ? "rc" : "ra"]);
      });
      if (!mv) return;
      if (rc) {
        m.fechar();
        F.papelDlg("Recibo ".concat(mv.recibo), () => reciboHTML(p, mv));
      } else if (await F.confirmar("Anular pagamento", "Anular o recibo ".concat(mv.recibo, " (").concat(kz(mv.valor), " Kz)?"), "Anular")) {
        p.movs.splice(p.movs.indexOf(mv), 1);
        p.pago = r2(p.movs.reduce((t, x) => t + x.valor, 0));
        p.alterado = (/* @__PURE__ */ new Date()).toISOString();
        F.guardar();
        m.fechar();
        render();
      }
    });
  };
  const chip = (e) => '<span class="tag '.concat(e === "Pago" ? "ok" : e.includes("atraso") ? "alerta" : "consumo", '">').concat(esc(e), "</span>");
  const render = () => {
    const ed = F.pode("sal");
    const L = F.S.pagamentos.filter(passa).sort((a, b) => (b.periodo || "").localeCompare(a.periodo || ""));
    const dev = r2(L.reduce((t, p) => t + p.devido, 0));
    const pag = r2(L.reduce((t, p) => t + p.pago, 0));
    $("#acoes-salarios").innerHTML = "".concat(ed ? '<button type="button" class="btn prim" data-sl="novo">+ Valor a pagar</button>' : "", '<button type="button" class="btn" data-sl="imp">Imprimir / imagem…</button>');
    const anos = [...new Set(F.S.pagamentos.map((p) => (p.periodo || "").slice(0, 4)).concat(F.hoje().slice(0, 4)))].filter(Boolean).sort().reverse();
    const filtros = '<div class="filtros"><div class="campo"><label for="fs-b">Embarcação</label><select id="fs-b" data-fsl="barco">'.concat(window.Barcos.opcoes(true).map(([v, l]) => '<option value="'.concat(esc(v), '"').concat(v === st.barco ? " selected" : "", ">").concat(esc(l), "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="fs-a">Ano</label><select id="fs-a" data-fsl="ano"><option value="todos">Todos</option>').concat(anos.map((a) => "<option".concat(a === st.ano ? " selected" : "", ">").concat(a, "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="fs-m">Mês</label><select id="fs-m" data-fsl="mes"><option value="">Todos</option>').concat(F.MESES.map((m, i) => '<option value="'.concat(F.pad(i + 1), '"').concat(F.pad(i + 1) === st.mes ? " selected" : "", ">").concat(m, "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="fs-c">Categoria</label><select id="fs-c" data-fsl="cat"><option value="">Todas</option>').concat(cats().map((c) => "<option".concat(c === st.cat ? " selected" : "", ">").concat(esc(c), "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="fs-e">Estado</label><select id="fs-e" data-fsl="estado"><option value="">Todos</option>').concat(["Pendente", "Parcial", "Pago", "Em atraso"].map((e) => "<option".concat(e === st.estado ? " selected" : "", ">").concat(e, "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="fs-q">Beneficiário</label><input id="fs-q" type="search" data-fsl="q" value="').concat(esc(st.q), '" placeholder="Procurar…"></div></div>');
    const kpis = '<div class="kpis">'.concat(F.kpi("".concat(kz(dev), " Kz"), "Total devido")).concat(F.kpi("".concat(kz(pag), " Kz"), "Total pago")).concat(F.kpi("".concat(kz(dev - pag), " Kz"), "Por pagar", dev - pag > 0 ? "neg" : "")).concat(F.kpi(dev ? "".concat(Math.round(pag / dev * 100), "%") : "—", "Percentagem paga")).concat(F.kpi(L.filter((p) => estado(p).includes("atraso")).length, "Em atraso", L.some((p) => estado(p).includes("atraso")) ? "neg" : ""), "</div>");
    let corpo = "";
    if (st.sub === "pag") corpo = F.tabela([
      { t: "Período", f: (p) => p.periodo ? F.mesLbl(p.periodo) : "—" },
      { t: "Beneficiário", f: (p) => "<b>".concat(esc(p.beneficiario), "</b>").concat(p.conta ? "<br><small>da conta de viagem</small>" : "") },
      { t: "Categoria", f: (p) => esc(p.categoria) },
      { t: "Embarcação", f: (p) => esc(p.barco ? window.Barcos.nome(p.barco) : "—") },
      { t: "Devido", f: (p) => kz(p.devido), num: true },
      { t: "Pago", f: (p) => kz(p.pago), num: true },
      { t: "Por pagar", f: (p) => "<b>".concat(kz(pend(p)), "</b>"), num: true },
      { t: "Estado", f: (p) => chip(estado(p)) },
      { t: "Acções", f: (p) => "".concat(ed && pend(p) > 0 ? '<button type="button" class="btn peq prim" data-sl="pagar" data-id="'.concat(esc(p.id), '">Pagar</button> ') : "", '<button type="button" class="btn peq" data-sl="hist" data-id="').concat(esc(p.id), '">Pagamentos (').concat((p.movs || []).length, ")</button>").concat(ed ? ' <button type="button" class="btn peq" data-sl="ed" data-id="'.concat(esc(p.id), '">Editar</button> <button type="button" class="btn peq perigo" data-sl="del" data-id="').concat(esc(p.id), '">Eliminar</button>') : "") }
    ].map((c) => c), L.map((p) => ({ ...p, _cls: estado(p).includes("atraso") ? "linha-alerta" : "" })), "Sem valores a pagar. Crie um com «+ Valor a pagar» ou em Contas › «Gerar salários».", "Salários");
    else if (st.sub === "ben") {
      const A = {};
      L.forEach((p) => {
        const k = p.beneficiario;
        const a = A[k] || (A[k] = { nome: k, cats: /* @__PURE__ */ new Set(), devido: 0, pago: 0, ult: "" });
        a.cats.add(p.categoria);
        a.devido += p.devido;
        a.pago += p.pago;
        (p.movs || []).forEach((mv) => {
          if (mv.data > a.ult) a.ult = mv.data;
        });
      });
      corpo = F.tabela(
        [{ t: "Beneficiário", f: (a) => "<b>".concat(esc(a.nome), "</b>") }, { t: "Categorias", f: (a) => esc([...a.cats].join(", ")) }, { t: "Devido", f: (a) => kz(a.devido), num: true }, { t: "Pago", f: (a) => kz(a.pago), num: true }, { t: "Saldo por pagar", f: (a) => "<b>".concat(kz(a.devido - a.pago), "</b>"), num: true }, { t: "Último pagamento", f: (a) => F.fmtData(a.ult) }],
        Object.values(A).sort((x, y) => y.devido - y.pago - (x.devido - x.pago)),
        "Sem dados.",
        "Por beneficiário"
      );
    } else {
      const A = {};
      L.forEach((p) => {
        const k = p.periodo || "—";
        const a = A[k] || (A[k] = { k, devido: 0, pago: 0, n: 0 });
        a.devido += p.devido;
        a.pago += p.pago;
        a.n++;
      });
      corpo = '<div id="sal-g"></div>'.concat(F.tabela([{ t: "Período", f: (a) => a.k === "—" ? "—" : F.mesLbl(a.k) }, { t: "Valores", f: (a) => a.n, num: true }, { t: "Devido", f: (a) => kz(a.devido), num: true }, { t: "Pago", f: (a) => kz(a.pago), num: true }, { t: "Por pagar", f: (a) => kz(a.devido - a.pago), num: true }], Object.values(A).sort((x, y) => y.k.localeCompare(x.k)), "Sem dados.", "Por mês"));
    }
    $("#c-salarios").innerHTML = filtros + kpis + F.subabas("sal", [["pag", "Pagamentos"], ["ben", "Por beneficiário"], ["mes", "Por mês"]], st.sub) + '<div class="sub-corpo" role="tabpanel">'.concat(corpo, "</div>");
    if (st.sub === "mes") {
      const conf = F.S.painel["sal-".concat(F.user.id)] || (F.S.painel["sal-".concat(F.user.id)] = { widgets: [{ id: "sm1", tipo: "chart", titulo: "Pago por mês", fonte: "pagamentos", medida: "soma:pago", agrupar: "mes", grafico: "bar", cor: "#0E7C86", valores: true, altura: "m", filtro: {} }, { id: "sm2", tipo: "chart", titulo: "Por pagar por categoria", fonte: "pagamentos", medida: "soma:pendente", agrupar: "categoria", grafico: "doughnut", cor: "#9E2A2B", valores: true, altura: "m", filtro: {} }] });
      G.montar($("#sal-g"), { chave: "sal", widgets: conf.widgets, filtro: { barco: st.barco, ano: st.ano }, editavel: true, guardar: () => F.guardar() });
    }
  };
  const badge = () => {
    const n = F.S.pagamentos.filter((p) => estado(p).includes("atraso")).length;
    const b = $("#badge-sal");
    if (!b) return;
    b.hidden = !n || !F.pode("sal", "read");
    b.textContent = n;
    b.setAttribute("aria-label", "".concat(n, " pagamento(s) em atraso"));
  };
  document.addEventListener("change", (e) => {
    var _a, _b, _c;
    const f = (_b = (_a = e.target).closest) == null ? void 0 : _b.call(_a, "[data-fsl]");
    if (f && f.dataset.fsl !== "q") {
      st[f.dataset.fsl] = f.value;
      render();
      (_c = $("#".concat(f.id))) == null ? void 0 : _c.focus();
    }
  });
  document.addEventListener("input", (e) => {
    var _a, _b;
    const f = (_b = (_a = e.target).closest) == null ? void 0 : _b.call(_a, '[data-fsl="q"]');
    if (f) {
      st.q = F.clean(f.value, 60);
      render();
      const x = $("#fs-q");
      x.focus();
      x.setSelectionRange(x.value.length, x.value.length);
    }
  });
  document.addEventListener("click", async (e) => {
    var _a;
    const s = e.target.closest('[data-sub^="sal:"]');
    if (s) {
      st.sub = s.dataset.sub.split(":")[1];
      render();
      (_a = $('[data-sub="'.concat(s.dataset.sub, '"]'))) == null ? void 0 : _a.focus();
      return;
    }
    const b = e.target.closest("[data-sl]");
    if (!b || b.disabled) return;
    const a = b.dataset.sl;
    const p = F.S.pagamentos.find((x) => x.id === b.dataset.id);
    if (a === "hist" && p) {
      historico(p);
      return;
    }
    if (a === "imp") {
      F.papelDlg("Salários pagos", () => "<h2>Controlo de salários pagos</h2>".concat($("#c-salarios .kpis").outerHTML).concat($("#c-salarios .sub-corpo").innerHTML.replace(/<button[^>]*>[^<]*<\/button>/g, "")));
      return;
    }
    if (!F.pode("sal")) return;
    if (a === "novo") editar(null);
    else if (a === "ed" && p) editar(p);
    else if (a === "pagar" && p) pagar(p);
    else if (a === "del" && p && await F.confirmar("Eliminar", "Eliminar o valor a pagar a ".concat(p.beneficiario).concat(p.movs && p.movs.length ? " e os seus pagamentos" : "", "?"), "Eliminar")) {
      F.S.pagamentos.splice(F.S.pagamentos.indexOf(p), 1);
      F.guardar();
      render();
    }
  });
  F.reg("salarios", { render, badge });
  window.Salarios = { estado, pend };
})();
