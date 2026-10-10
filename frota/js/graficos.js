const G = (() => {
  "use strict";
  const { esc, kz } = F;
  if (window.ChartDataLabels && typeof Chart !== "undefined") {
    Chart.register(window.ChartDataLabels);
    Chart.defaults.plugins.datalabels = { display: false };
  }
  if (typeof Chart !== "undefined" && Chart.prototype._resize) {
    const r0 = Chart.prototype._resize;
    Chart.prototype._resize = function(...a) {
      if (!this.canvas || !this.canvas.parentNode) return void 0;
      return r0.apply(this, a);
    };
  }
  const nomeB = (id) => window.Barcos ? window.Barcos.nome(id) : id;
  const estadoPag = (p) => p.pago >= p.devido && p.devido > 0 ? "Pago" : p.pago > 0 ? "Parcial" : "Pendente";
  const resumo = () => {
    if (!window.Fin) return [];
    const meses = [...new Set([...F.S.entradas, ...F.S.saidas].map((x) => x.data.slice(0, 7)))];
    const L = [];
    F.S.barcos.forEach((b) => meses.forEach((m) => {
      const c = window.Fin.contas(b.id, (x) => x.data.startsWith(m));
      if (c.nE || c.nS) L.push({ barco: b.id, data: "".concat(m, "-01"), receita: c.receita, caixa: c.caixa, manut: c.manut, reps: F.r2(c.rep1 + c.rep2), saidas: F.r2(c.saiCaixa + c.saiManut), descricao: F.mesLbl(m) });
    }));
    return L;
  };
  const FONTES = {
    resumo: { nome: "Resumo financeiro (caixa, manutenção, representantes)", area: "fin", regs: resumo, campos: { receita: "Receita", caixa: "Em caixa", manut: "Manutenção disponível", reps: "Representantes", saidas: "Saídas" }, dims: ["barco", "mes", "ano"] },
    entradas: { nome: "Entradas", area: "fin", regs: () => F.S.entradas, campos: { valor: "Valor", manutencao: "Manutenção" }, dims: ["barco", "mes", "ano"] },
    saidas: { nome: "Saídas", area: "fin", regs: () => F.S.saidas, campos: { valor: "Valor" }, dims: ["barco", "mes", "ano", "tipo"] },
    contas: { nome: "Contas de viagem", area: "contas", regs: () => window.Contas ? window.Contas.linhas() : [], campos: { bruto: "Valor bruto", despesas: "Despesas", descontos: "Descontos", base: "Valor a distribuir", manut: "Manutenção da chata", mestre: "Mestre", embarc: "Embarcadores", empresa: "Empresa", tripulacao: "Tripulação" }, dims: ["barco", "mes", "ano"] },
    pagamentos: { nome: "Salários pagos", area: "sal", regs: () => F.S.pagamentos.map((p) => ({ ...p, pendente: Math.max(0, F.r2(p.devido - p.pago)), estado: estadoPag(p) })), campos: { devido: "Devido", pago: "Pago", pendente: "Pendente" }, dims: ["barco", "mes", "ano", "categoria", "estado", "beneficiario"] },
    viagens: { nome: "Viagens (inventário)", area: "inv", regs: () => F.S.viagens.map((v) => {
      const r = window.Inv ? window.Inv.resumo(v) : { alerta: 0, falta: 0, consumo: 0 };
      return { ...v, data: v.partida, alertas: r.alerta + r.falta, consumos: r.consumo };
    }), campos: { alertas: "Alertas", consumos: "Consumos" }, dims: ["barco", "mes", "ano"] },
    embarques: { nome: "Embarques", area: "colab", regs: () => F.S.embarques.map((e) => {
      var _a, _b;
      return { ...e, data: e.embarque, dias: (_b = (_a = F.tempo(e.embarque, e.desembarque || F.hoje())) == null ? void 0 : _a.total) != null ? _b : 0, estado: e.desembarque ? "Desembarcado" : "A bordo" };
    }), campos: { dias: "Dias a bordo" }, dims: ["barco", "mes", "ano", "estado", "funcao"] },
    colab: { nome: "Colaboradores", area: "colab", regs: () => F.S.colab, campos: {}, dims: ["barco", "funcao", "cargo"] }
  };
  const DIMS = { barco: "Embarcação", mes: "Mês", ano: "Ano", tipo: "Tipo de saída", categoria: "Categoria", estado: "Estado", beneficiario: "Beneficiário", funcao: "Função", cargo: "Cargo", nenhum: "— nenhum (indicador) —" };
  const DINHEIRO = /* @__PURE__ */ new Set(["receita", "caixa", "reps", "saidas", "valor", "manutencao", "bruto", "despesas", "descontos", "base", "manut", "mestre", "embarc", "empresa", "tripulacao", "devido", "pago", "pendente"]);
  const TIPOS = [["bar", "Barras"], ["barH", "Barras horizontais"], ["line", "Linha"], ["area", "Área"], ["pie", "Circular"], ["doughnut", "Anel"]];
  const chave = (r, dim) => dim === "barco" ? nomeB(r.barco) || "—" : dim === "mes" ? String(r.data || "").slice(0, 7) : dim === "ano" ? String(r.data || "").slice(0, 4) : String(r[dim] || "—");
  const formato = (w) => w.medida === "contagem" || !DINHEIRO.has(String(w.medida).split(":")[1]) ? "num" : "kz";
  const fmt = (w, v) => formato(w) === "kz" ? "".concat(kz(v), " Kz") : Number(v).toLocaleString("pt-PT", { maximumFractionDigits: 1 });
  const curto = (w, v) => formato(w) === "kz" ? Math.abs(v) >= 1e6 ? "".concat((v / 1e6).toLocaleString("pt-PT", { maximumFractionDigits: 1 }), " M") : Math.abs(v) >= 1e3 ? "".concat((v / 1e3).toLocaleString("pt-PT", { maximumFractionDigits: 1 }), " mil") : kz(v) : Number(v).toLocaleString("pt-PT", { maximumFractionDigits: 1 });
  const calcular = (w, glob = {}) => {
    const fo = FONTES[w.fonte];
    if (!fo) return { labels: [], values: [], regs: [], total: 0 };
    const f = { ...w.filtro || {} };
    const passa = (r) => {
      const d = String(r.data || "");
      const b = glob.barco && glob.barco !== "todas" ? glob.barco : f.barco;
      return (!b || b === "todas" || r.barco === b) && (!glob.ano || glob.ano === "todos" || !d || d.startsWith(glob.ano)) && (!f.ano || f.ano === "todos" || d.startsWith(f.ano)) && (!f.de || !d || d.slice(0, 7) >= f.de) && (!f.ate || !d || d.slice(0, 7) <= f.ate) && (!f.estado || r.estado === f.estado);
    };
    const regs = fo.regs().filter(passa);
    const [op, campo] = String(w.medida || "contagem").split(":");
    const val = (rs) => op === "contagem" ? rs.length : op === "media" ? rs.length ? rs.reduce((t, r) => t + (Number(r[campo]) || 0), 0) / rs.length : 0 : rs.reduce((t, r) => t + (Number(r[campo]) || 0), 0);
    if (!w.agrupar || w.agrupar === "nenhum") {
      const v = F.r2(val(regs));
      return { labels: [w.titulo], values: [v], regs, total: v };
    }
    const grupos = {};
    regs.forEach((r) => {
      const k = chave(r, w.agrupar);
      (grupos[k] = grupos[k] || []).push(r);
    });
    let ent = Object.entries(grupos).map(([k, rs]) => [k, F.r2(val(rs)), rs]);
    if (w.agrupar === "mes" || w.agrupar === "ano") ent.sort((a, b) => a[0].localeCompare(b[0]));
    else if (w.ordem !== "rotulo") ent.sort((a, b) => b[1] - a[1]);
    else ent.sort((a, b) => a[0].localeCompare(b[0], "pt"));
    if (w.limite > 0) ent = ent.slice(0, w.limite);
    return { labels: ent.map((e) => w.agrupar === "mes" ? F.mesLbl(e[0]) : e[0]), values: ent.map((e) => e[1]), grupos: ent.map((e) => e[2]), regs, total: F.r2(ent.reduce((t, e) => t + e[1], 0)) };
  };
  const btn = (a, id, rot, txt, extra = "") => '<button type="button" class="ferr" data-ga="'.concat(a, '" data-id="').concat(esc(id), '" aria-label="').concat(esc(rot), '" title="').concat(esc(rot), '"').concat(extra, ">").concat(txt, "</button>");
  const cartao = (w, opts) => {
    const ed = opts.editavel;
    const t = esc(w.titulo || "Gráfico");
    if (w.tipo === "kpi") {
      const r = calcular(w, opts.filtro);
      return '<div class="kpi kpi-w" data-wid="'.concat(esc(w.id), '" style-cor="').concat(esc(w.cor || ""), '"><b>').concat(esc(fmt(w, r.total)), "</b><span>").concat(t, "</span>").concat(ed ? '<span class="kpi-ferr">'.concat(btn("editar", w.id, "Editar ".concat(w.titulo), "✎")).concat(btn("esconder", w.id, "Esconder ".concat(w.titulo), "👁"), "</span>") : "", "</div>");
    }
    return '<figure class="cartao-g alt-'.concat(esc(w.altura || "m"), '" data-wid="').concat(esc(w.id), '"><div class="g-cab"><figcaption>').concat(t, '</figcaption><div class="g-ferr" role="toolbar" aria-label="Ferramentas de ').concat(t, '">\n      ').concat(btn("tipo", w.id, "Mudar o tipo de gráfico", "⇄")).concat(btn("valores", w.id, w.valores ? "Esconder os números" : "Mostrar os números", "123", ' aria-pressed="'.concat(!!w.valores, '"'))).concat(btn("png", w.id, "Descarregar imagem (PNG)", "⬇")).concat(btn("ampliar", w.id, "Ampliar", "⛶"), "\n      ").concat(ed ? "".concat(btn("editar", w.id, "Editar gráfico", "✎")).concat(btn("subir", w.id, "Mover para trás", "↑")).concat(btn("descer", w.id, "Mover para a frente", "↓")).concat(btn("esconder", w.id, "Esconder", "👁")).concat(btn("remover", w.id, "Remover", "✕")) : "", '</div></div>\n      <div class="g-box"><canvas id="gc-').concat(esc(opts.chave), "-").concat(esc(w.id), '" role="img" aria-label="').concat(t, '"></canvas></div><p class="g-total" id="gt-').concat(esc(opts.chave), "-").concat(esc(w.id), '"></p></figure>');
  };
  const desenhar = (w, canvas, opts, grande = false) => {
    const r = calcular(w, opts.filtro);
    const tipo = w.grafico || "bar";
    const circ = tipo === "pie" || tipo === "doughnut";
    const cor = /^#[0-9a-f]{6}$/i.test(w.cor || "") ? w.cor : F.PALETA[0];
    const cores = circ || w.multicor ? r.labels.map((_, i) => i === 0 ? cor : F.PALETA[i % F.PALETA.length]) : cor;
    const tot = document.getElementById("gt-".concat(opts.chave, "-").concat(w.id));
    if (tot) tot.textContent = r.labels.length ? "Total: ".concat(fmt(w, r.total), " · ").concat(r.labels.length, " ").concat(DIMS[w.agrupar] ? DIMS[w.agrupar].toLowerCase() : "grupos") : "Sem dados para os filtros escolhidos.";
    F.grafico(canvas, {
      type: tipo === "barH" ? "bar" : tipo === "area" ? "line" : tipo,
      data: { labels: r.labels, datasets: [{ label: w.titulo, data: r.values, backgroundColor: tipo === "area" ? "".concat(cor, "55") : cores, borderColor: circ ? "#ffffff" : cor, borderWidth: circ ? 2 : 2, fill: tipo === "area", tension: 0.25, borderRadius: tipo.startsWith("bar") ? 6 : 0, pointRadius: 3 }] },
      options: {
        indexAxis: tipo === "barH" ? "y" : "x",
        onClick: (ev, els) => {
          if (els.length && r.grupos) detalhe(w, r.labels[els[0].index], r.grupos[els[0].index]);
        },
        plugins: {
          legend: { display: circ ? w.legenda !== false : !!w.legenda, position: grande ? "right" : "bottom" },
          tooltip: { callbacks: { label: (c) => " ".concat(fmt(w, c.raw)) } },
          datalabels: { display: !!w.valores, anchor: circ ? "center" : "end", align: circ ? "center" : tipo === "barH" ? "right" : "top", color: circ ? "#fff" : document.documentElement.dataset.tema === "escuro" ? "#E8EDF5" : "#172033", font: { weight: "bold", size: grande ? 13 : 11 }, formatter: (v) => curto(w, v), clamp: true }
        },
        ...circ ? {} : { scales: { [tipo === "barH" ? "x" : "y"]: { beginAtZero: true, ticks: { callback: (v) => curto(w, v) } } } },
        layout: { padding: { top: w.valores && !circ ? 26 : 4, right: w.valores && tipo === "barH" ? 40 : 4 } }
      }
    });
  };
  const detalhe = (w, rotulo, regs = []) => {
    const [op, campo] = String(w.medida).split(":");
    F.modal({ titulo: "".concat(w.titulo, " — ").concat(rotulo), largo: true, corpo: '<p class="dica">'.concat(regs.length, " registo(s).</p>").concat(F.tabela([
      { t: "Data", f: (x) => F.fmtData(String(x.data || "").slice(0, 10)) },
      { t: "Embarcação", f: (x) => esc(nomeB(x.barco) || "—") },
      { t: "Descrição", f: (x) => esc(x.descricao || x.beneficiario || x.nome || x.ref || "—") },
      { t: op === "contagem" ? "Registo" : FONTES[w.fonte].campos[campo] || "Valor", f: (x) => op === "contagem" ? "1" : esc(fmt(w, Number(x[campo]) || 0)), num: true }
    ], regs.slice(0, 300))), botoes: [{ id: "f", label: "Fechar", classe: "prim" }] }).on("f", () => document.querySelector("dialog[open]:last-of-type").close());
  };
  const editor = (w0, onSave) => {
    const w = JSON.parse(JSON.stringify(w0 || { id: "w".concat(F.uid()), tipo: "chart", titulo: "Novo gráfico", fonte: "entradas", medida: "soma:valor", agrupar: "barco", grafico: "bar", cor: F.PALETA[0], valores: true, altura: "m", filtro: {} }));
    const fontes = Object.entries(FONTES).filter(([, f]) => F.pode(f.area, "read"));
    const opMed = (fo) => [["contagem", "Contagem de registos"], ...Object.entries(FONTES[fo].campos).flatMap(([k, l]) => [["soma:".concat(k), "Soma — ".concat(l)], ["media:".concat(k), "Média — ".concat(l)]])];
    const anos = [...new Set([...F.S.entradas, ...F.S.saidas, ...F.S.pagamentos].map((x) => String(x.data || "").slice(0, 4)).concat(F.hoje().slice(0, 4)))].filter(Boolean).sort().reverse();
    const corpo = () => {
      var _a, _b;
      return '<form class="form grelha" novalidate>\n      <div class="campo full"><label for="ge-t">Título *</label><input id="ge-t" name="titulo" maxlength="60" value="'.concat(esc(w.titulo), '"></div>\n      <div class="campo"><label for="ge-k">Tipo</label><select id="ge-k" name="tipo"><option value="chart"').concat(w.tipo !== "kpi" ? " selected" : "", '>Gráfico</option><option value="kpi"').concat(w.tipo === "kpi" ? " selected" : "", '>Indicador (número)</option></select></div>\n      <div class="campo"><label for="ge-f">Dados</label><select id="ge-f" name="fonte">').concat(fontes.map(([k, f]) => '<option value="'.concat(k, '"').concat(k === w.fonte ? " selected" : "", ">").concat(esc(f.nome), "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="ge-m">Medida</label><select id="ge-m" name="medida">').concat(opMed(w.fonte).map(([k, l]) => '<option value="'.concat(k, '"').concat(k === w.medida ? " selected" : "", ">").concat(esc(l), "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="ge-a">Agrupar por</label><select id="ge-a" name="agrupar"').concat(w.tipo === "kpi" ? " disabled" : "", ">").concat(FONTES[w.fonte].dims.map((d) => '<option value="'.concat(d, '"').concat(d === w.agrupar ? " selected" : "", ">").concat(esc(DIMS[d]), "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="ge-g">Tipo de gráfico</label><select id="ge-g" name="grafico"').concat(w.tipo === "kpi" ? " disabled" : "", ">").concat(TIPOS.map(([k, l]) => '<option value="'.concat(k, '"').concat(k === w.grafico ? " selected" : "", ">").concat(l, "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="ge-c">Cor principal</label><input id="ge-c" name="cor" type="color" value="').concat(esc(/^#[0-9a-f]{6}$/i.test(w.cor || "") ? w.cor : F.PALETA[0]), '"></div>\n      <div class="campo"><label for="ge-h">Altura</label><select id="ge-h" name="altura">').concat([["p", "Pequena"], ["m", "Média"], ["g", "Grande"]].map(([k, l]) => '<option value="'.concat(k, '"').concat(k === (w.altura || "m") ? " selected" : "", ">").concat(l, "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="ge-o">Ordenar</label><select id="ge-o" name="ordem"><option value="valor"').concat(w.ordem !== "rotulo" ? " selected" : "", '>Pelo valor (maior primeiro)</option><option value="rotulo"').concat(w.ordem === "rotulo" ? " selected" : "", '>Pelo nome</option></select></div>\n      <div class="campo"><label for="ge-l">Mostrar só os primeiros (0 = todos)</label><input id="ge-l" name="limite" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="').concat(esc(w.limite || 0), '"></div>\n      <fieldset class="grupo full"><legend>Filtros deste gráfico</legend>\n        <div class="campo"><label for="ge-fb">Embarcação</label><select id="ge-fb" name="fb">').concat(window.Barcos.opcoes(true).map(([v, l]) => {
        var _a2;
        return '<option value="'.concat(esc(v), '"').concat(v === (((_a2 = w.filtro) == null ? void 0 : _a2.barco) || "todas") ? " selected" : "", ">").concat(esc(l), "</option>");
      }).join(""), '</select></div>\n        <div class="campo"><label for="ge-fa">Ano</label><select id="ge-fa" name="fa"><option value="todos">Todos</option>').concat(anos.map((a) => {
        var _a2;
        return "<option".concat(a === ((_a2 = w.filtro) == null ? void 0 : _a2.ano) ? " selected" : "", ">").concat(a, "</option>");
      }).join(""), '</select></div>\n        <div class="campo"><label for="ge-fd">De (mês)</label><input id="ge-fd" name="fd" type="month" value="').concat(esc(((_a = w.filtro) == null ? void 0 : _a.de) || ""), '"></div><div class="campo"><label for="ge-ft">Até (mês)</label><input id="ge-ft" name="ft" type="month" value="').concat(esc(((_b = w.filtro) == null ? void 0 : _b.ate) || ""), '"></div></fieldset>\n      <label class="check"><input type="checkbox" name="valores"').concat(w.valores ? " checked" : "", '> Mostrar os números no gráfico</label><label class="check"><input type="checkbox" name="legenda"').concat(w.legenda ? " checked" : "", '> Mostrar legenda</label><label class="check"><input type="checkbox" name="multicor"').concat(w.multicor ? " checked" : "", '> Uma cor por barra</label></form>\n      <div class="pre"><p class="dica">Pré-visualização</p><div class="g-box"><canvas id="ge-prev" role="img" aria-label="Pré-visualização"></canvas></div><p class="kpi-prev" id="ge-kprev"></p></div>');
    };
    const m = F.modal({ titulo: w0 ? "Editar gráfico / indicador" : "Novo gráfico / indicador", largo: true, corpo: '<div id="ge-c0">'.concat(corpo(), "</div>"), botoes: [{ id: "c", label: "Cancelar" }, { id: "g", label: "Guardar", classe: "prim" }] });
    const ler = () => {
      const fm = m.el.querySelector("form");
      const v = (n) => fm.elements[n];
      w.titulo = F.clean(v("titulo").value, 60);
      w.tipo = v("tipo").value;
      const fonte = v("fonte").value;
      if (fonte !== w.fonte) {
        w.fonte = fonte;
        w.medida = opMed(fonte)[1] ? opMed(fonte)[1][0] : "contagem";
        w.agrupar = FONTES[fonte].dims[0];
      } else {
        w.medida = v("medida").value;
        w.agrupar = w.tipo === "kpi" ? "nenhum" : v("agrupar").value || FONTES[fonte].dims[0];
      }
      if (w.tipo !== "kpi" && w.agrupar === "nenhum") w.agrupar = FONTES[fonte].dims[0];
      w.grafico = v("grafico").value;
      w.cor = v("cor").value;
      w.altura = v("altura").value;
      w.ordem = v("ordem").value;
      w.limite = Math.max(0, Math.min(50, parseInt(v("limite").value, 10) || 0));
      w.filtro = { barco: v("fb").value, ano: v("fa").value, de: /^\d{4}-\d{2}$/.test(v("fd").value) ? v("fd").value : "", ate: /^\d{4}-\d{2}$/.test(v("ft").value) ? v("ft").value : "" };
      w.valores = v("valores").checked;
      w.legenda = v("legenda").checked;
      w.multicor = v("multicor").checked;
    };
    const prev = () => {
      const r = calcular(w);
      m.el.querySelector("#ge-kprev").textContent = w.tipo === "kpi" ? "Valor: ".concat(fmt(w, r.total)) : "";
      m.el.querySelector("#ge-prev").closest(".g-box").hidden = w.tipo === "kpi";
      if (w.tipo !== "kpi") desenhar(w, m.el.querySelector("#ge-prev"), { chave: "prev", filtro: {} });
    };
    m.el.addEventListener("change", () => {
      var _a;
      const foco = document.activeElement && document.activeElement.id;
      ler();
      m.el.querySelector("#ge-c0").innerHTML = corpo();
      if (foco) (_a = m.el.querySelector("#".concat(foco))) == null ? void 0 : _a.focus();
      prev();
    });
    m.on("c", () => m.fechar());
    m.on("g", () => {
      ler();
      if (w.titulo.length < 2) {
        m.erro("Indique o título.");
        return;
      }
      if (w.filtro.de && w.filtro.ate && w.filtro.de > w.filtro.ate) {
        m.erro("O mês «De» não pode ser depois de «Até».");
        return;
      }
      m.fechar();
      onSave(w);
    });
    setTimeout(prev, 30);
  };
  const OPTS = /* @__PURE__ */ new WeakMap();
  const montar = (el, opts) => {
    OPTS.set(el, opts);
    el.querySelectorAll("canvas").forEach((cv) => {
      const ch = F.charts.get(cv.id);
      if (ch) {
        ch.destroy();
        F.charts.delete(cv.id);
      }
    });
    const vis = opts.widgets.filter((w) => !w.oculto && FONTES[w.fonte] && F.pode(FONTES[w.fonte].area, "read"));
    el.innerHTML = '<div class="kpis">'.concat(vis.filter((w) => w.tipo === "kpi").map((w) => cartao(w, opts)).join(""), '</div><div class="graficos">').concat(vis.filter((w) => w.tipo !== "kpi").map((w) => cartao(w, opts)).join(""), "</div>");
    el.querySelectorAll(".kpi-w[style-cor]").forEach((k) => {
      const c = k.getAttribute("style-cor");
      if (/^#[0-9a-f]{6}$/i.test(c)) k.style.setProperty("--kpi-cor", c);
      k.removeAttribute("style-cor");
    });
    vis.filter((w) => w.tipo !== "kpi").forEach((w) => desenhar(w, el.querySelector("#gc-".concat(opts.chave, "-").concat(w.id)), opts));
    if (!el.dataset.gMontado) {
      el.dataset.gMontado = "1";
      el.addEventListener("click", (e) => acao(el, e));
    }
  };
  const acao = async (el, e) => {
    var _a;
    const b = e.target.closest("[data-ga]");
    if (!b) return;
    const o = OPTS.get(el);
    const W = o.widgets;
    const w = W.find((x) => x.id === b.dataset.id);
    if (!w) return;
    const a = b.dataset.ga;
    const fim = () => {
      if (o.guardar) o.guardar();
      montar(el, o);
    };
    if (a === "tipo") {
      const L = TIPOS.map((t) => t[0]);
      w.grafico = L[(L.indexOf(w.grafico || "bar") + 1) % L.length];
      fim();
      F.toast("Tipo: ".concat(TIPOS.find((t) => t[0] === w.grafico)[1]));
    } else if (a === "valores") {
      w.valores = !w.valores;
      fim();
    } else if (a === "png") {
      const ch = F.charts.get("gc-".concat(o.chave, "-").concat(w.id));
      if (!ch) return;
      const fundo = getComputedStyle(b.closest(".cartao-g") || document.body).backgroundColor;
      const blob = F.pngCanvas(ch.canvas, fundo && fundo !== "rgba(0, 0, 0, 0)" ? fundo : "#ffffff");
      const r = await F.partilhar(blob, "".concat(F.clean(w.titulo, 50).replace(/[^\p{L}\p{N}]+/gu, "_") || "grafico", ".png"));
      if (r === "partilhado" || r === "descarregado") F.toast("Imagem do gráfico criada.");
    } else if (a === "ampliar") {
      const m = F.modal({ titulo: w.titulo, largo: true, corpo: '<div class="g-box grande"><canvas id="g-ampl" role="img" aria-label="Gráfico ampliado"></canvas></div>', botoes: [{ id: "f", label: "Fechar", classe: "prim" }] });
      m.on("f", () => m.fechar());
      desenhar(w, m.el.querySelector("#g-ampl"), { ...o, chave: "ampl" }, true);
    } else if (!o.editavel) return;
    else if (a === "editar") editor(w, (n) => {
      Object.assign(w, n);
      fim();
      F.toast("Gráfico actualizado.");
    });
    else if (a === "subir" || a === "descer") {
      const i = W.indexOf(w);
      const j = i + (a === "subir" ? -1 : 1);
      if (j < 0 || j >= W.length) return;
      [W[i], W[j]] = [W[j], W[i]];
      fim();
      (_a = el.querySelector('[data-ga="'.concat(a, '"][data-id="').concat(w.id, '"]'))) == null ? void 0 : _a.focus();
    } else if (a === "esconder") {
      w.oculto = true;
      fim();
      F.toast("«".concat(w.titulo, "» escondido. Volte a mostrar em «Personalizar…»."));
    } else if (a === "remover" && await F.confirmar("Remover gráfico", "Remover «".concat(w.titulo, "» deste painel?"), "Remover")) {
      W.splice(W.indexOf(w), 1);
      fim();
    }
  };
  return { FONTES, DIMS, TIPOS, calcular, montar, editor, fmt };
})();
