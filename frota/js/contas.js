(() => {
  "use strict";
  const { $, esc, kz, r2 } = F;
  const st = { barco: "todas", ano: "todos" };
  const val = (x) => {
    const n = F.num(x);
    return Number.isFinite(n) ? n : 0;
  };
  const txt = (x) => typeof x === "number" ? F.numTxt(x) : String(x != null ? x : "");
  const soma = (L) => r2((L || []).reduce((t, x) => t + val(x.v), 0));
  const calc = (c, regra = F.S.regraContas) => {
    const R = regra && regra.ativa !== false ? regra : { partes: [], divisao: [{ chave: "empresa", nome: "Empresa", pct: 100, salario: false }] };
    const bruto = r2(val(c.bruto));
    const desp = soma(c.despesas);
    const desc = soma(c.descontos);
    const apos = r2(bruto - desp);
    const base = r2(apos - desc);
    const partes = (R.partes || []).map((p) => ({ ...p, valor: r2(base * p.pct / 100) }));
    const somaP = r2(partes.reduce((t, p) => t + p.valor, 0));
    const rem = r2(base - somaP);
    const divisao = (R.divisao || []).map((d) => ({ ...d, valor: r2(rem * d.pct / 100) }));
    return { bruto, desp, desc, apos, base, partes, somaP, rem, divisao };
  };
  const Contas = { calc, linhas: () => F.S.contas.map((c) => {
    const k = calc(c, c.regra);
    const o = { id: c.id, barco: c.barco, data: c.data, descricao: c.ref, ref: c.ref, bruto: k.bruto, despesas: k.desp, descontos: k.desc, base: k.base };
    [...k.partes, ...k.divisao].forEach((p) => {
      o[p.chave] = (o[p.chave] || 0) + p.valor;
    });
    return o;
  }) };
  const passa = (c) => (st.barco === "todas" || c.barco === st.barco) && (st.ano === "todos" || c.data.startsWith(st.ano));
  const quadro = (k) => '<table class="quadro"><caption class="sr-only">Cálculo da conta</caption><tbody>\n    <tr><th scope="row">Valor bruto</th><td class="num">'.concat(kz(k.bruto), '</td></tr><tr><th scope="row">− Despesas</th><td class="num neg">').concat(kz(k.desp), '</td></tr><tr class="sub"><th scope="row">= Após despesas</th><td class="num">').concat(kz(k.apos), '</td></tr>\n    <tr><th scope="row">− Descontos</th><td class="num neg">').concat(kz(k.desc), '</td></tr><tr class="total"><th scope="row">= Valor a distribuir</th><td class="num">').concat(kz(k.base), "</td></tr>\n    ").concat(k.partes.map((p) => '<tr><th scope="row">'.concat(esc(p.nome), " (").concat(p.pct, '%)</th><td class="num">').concat(kz(p.valor), "</td></tr>")).join(""), "\n    ").concat(k.partes.length ? '<tr class="sub"><th scope="row">Remanescente ('.concat(r2(100 - k.partes.reduce((t, p) => t + p.pct, 0)), '%)</th><td class="num">').concat(kz(k.rem), "</td></tr>") : "", "\n    ").concat(k.divisao.map((d) => '<tr class="destaque"><th scope="row">'.concat(esc(d.nome), " (").concat(d.pct, '% do remanescente)</th><td class="num"><b>').concat(kz(d.valor), "</b></td></tr>")).join(""), "</tbody></table>");
  const linhaD = (d, i) => '<div class="linha-v" data-ld="'.concat(i, '"><label class="sr-only" for="cd-d').concat(i, '">Despesa</label><input id="cd-d').concat(i, '" data-k="d" placeholder="Descrição (ex.: combustível)" maxlength="80" value="').concat(esc(d.d || ""), '"><label class="sr-only" for="cd-v').concat(i, '">Valor da despesa</label><input id="cd-v').concat(i, '" data-k="v" type="text" inputmode="decimal" autocomplete="off" placeholder="Valor" value="').concat(esc(txt(d.v)), '"><button type="button" class="btn peq perigo" data-rm="d').concat(i, '" aria-label="Remover despesa">✕</button></div>');
  const linhaX = (d, i) => '<div class="linha-v" data-lx="'.concat(i, '"><label class="sr-only" for="cx-t').concat(i, '">Tipo de desconto</label><select id="cx-t').concat(i, '" data-k="tipo">').concat(F.S.tiposDesconto.map((t) => "<option".concat(t === d.tipo ? " selected" : "", ">").concat(esc(t), "</option>")).join(""), '</select><label class="sr-only" for="cx-d').concat(i, '">Descrição do desconto</label><input id="cx-d').concat(i, '" data-k="d" placeholder="Descrição" maxlength="80" value="').concat(esc(d.d || ""), '"><label class="sr-only" for="cx-v').concat(i, '">Valor do desconto</label><input id="cx-v').concat(i, '" data-k="v" type="text" inputmode="decimal" autocomplete="off" placeholder="Valor" value="').concat(esc(txt(d.v)), '"><button type="button" class="btn peq perigo" data-rm="x').concat(i, '" aria-label="Remover desconto">✕</button></div>');
  const editar = (c0) => {
    const c = JSON.parse(JSON.stringify(c0 || { barco: st.barco !== "todas" ? st.barco : (window.Barcos.ativos()[0] || {}).id, data: F.hoje(), ref: "", bruto: "", despesas: [{ d: "", v: "" }], descontos: [], obs: "" }));
    const regra = c0 && c0.regra ? c0.regra : F.S.regraContas;
    const corpo = () => '<div class="conta-grid"><form class="form grelha" novalidate id="f-conta">\n        <div class="campo"><label for="c-b">Embarcação *</label><select id="c-b" name="barco">'.concat(window.Barcos.opcoes().map(([v, l]) => '<option value="'.concat(esc(v), '"').concat(v === c.barco ? " selected" : "", ">").concat(esc(l), "</option>")).join(""), '</select></div>\n        <div class="campo"><label for="c-dt">Data *</label><input id="c-dt" name="data" type="date" value="').concat(esc(c.data), '"></div>\n        <div class="campo full"><label for="c-r">Referência (viagem ou período) *</label><input id="c-r" name="ref" maxlength="100" placeholder="ex.: Viagem 11/08 a 22/08/2026" value="').concat(esc(c.ref), '"></div>\n        <div class="campo full"><label for="c-v">Valor bruto (Kz) *</label><input id="c-v" name="bruto" type="text" inputmode="decimal" autocomplete="off" value="').concat(esc(txt(c.bruto)), '" placeholder="ex.: 3.000.000"></div>\n        <fieldset class="grupo full"><legend>Despesas</legend><div id="c-desp">').concat(c.despesas.map(linhaD).join(""), '</div><button type="button" class="btn peq" data-add="d">+ Despesa</button></fieldset>\n        <fieldset class="grupo full"><legend>Descontos (dívida, adiantamento, outros)</legend><div id="c-desc">').concat(c.descontos.map(linhaX).join("") || '<p class="dica">Sem descontos.</p>', '</div><button type="button" class="btn peq" data-add="x">+ Desconto</button></fieldset>\n        <div class="campo full"><label for="c-o">Observações</label><textarea id="c-o" name="obs" maxlength="400" rows="2">').concat(esc(c.obs || ""), '</textarea></div></form>\n      <aside class="conta-calc" aria-live="polite" aria-label="Cálculo automático"><h3>Cálculo automático</h3><div id="c-quadro">').concat(quadro(calc(c, regra)), "</div>").concat(regra.ativa === false ? '<p class="aviso">Regra desactivada: tudo vai para a empresa.</p>' : "", "</aside></div>");
    const m = F.modal({ titulo: c0 ? "Editar conta" : "Nova conta de viagem", largo: true, corpo: '<div id="c-wrap">'.concat(corpo(), "</div>"), botoes: [{ id: "c", label: "Cancelar" }, { id: "g", label: "Guardar conta", classe: "prim" }] });
    const ler = () => {
      const fm = m.el.querySelector("#f-conta");
      c.barco = fm.barco.value;
      c.data = fm.data.value;
      c.ref = F.clean(fm.ref.value, 100);
      c.bruto = fm.bruto.value;
      c.obs = F.clean(fm.obs.value, 400);
      c.despesas = [...m.el.querySelectorAll("[data-ld]")].map((r) => ({ d: F.clean(r.querySelector('[data-k="d"]').value, 80), v: r.querySelector('[data-k="v"]').value }));
      c.descontos = [...m.el.querySelectorAll("[data-lx]")].map((r) => ({ tipo: r.querySelector('[data-k="tipo"]').value, d: F.clean(r.querySelector('[data-k="d"]').value, 80), v: r.querySelector('[data-k="v"]').value }));
    };
    const redesenhar = () => {
      var _a;
      const f = document.activeElement && document.activeElement.id;
      m.el.querySelector("#c-wrap").innerHTML = corpo();
      if (f) (_a = m.el.querySelector("#".concat(f))) == null ? void 0 : _a.focus();
    };
    m.el.addEventListener("input", () => {
      ler();
      m.el.querySelector("#c-quadro").innerHTML = quadro(calc(c, regra));
    });
    m.el.addEventListener("click", (e) => {
      const a = e.target.closest("[data-add]");
      const r = e.target.closest("[data-rm]");
      if (!a && !r) return;
      ler();
      if (a) (a.dataset.add === "d" ? c.despesas : c.descontos).push(a.dataset.add === "d" ? { d: "", v: "" } : { tipo: F.S.tiposDesconto[0], d: "", v: "" });
      else {
        const t = r.dataset.rm[0];
        const i = +r.dataset.rm.slice(1);
        (t === "d" ? c.despesas : c.descontos).splice(i, 1);
      }
      redesenhar();
      m.el.querySelector("#c-quadro").innerHTML = quadro(calc(c, regra));
    });
    m.on("c", () => m.fechar());
    m.on("g", () => {
      try {
        ler();
        const fm = m.el.querySelector("#f-conta");
        const bad = (el, msg) => {
          el.setAttribute("aria-invalid", "true");
          el.focus();
          m.erro(msg);
        };
        if (!c.barco) return bad(fm.barco, "Escolha a embarcação.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(c.data)) return bad(fm.data, "Indique a data.");
        if (c.data > F.hoje()) return bad(fm.data, "A data não pode ser futura.");
        if (c.ref.length < 3) return bad(fm.ref, "Indique a referência da viagem ou do período.");
        const nb = F.num(c.bruto);
        if (!(nb > 0)) return bad(fm.bruto, Number.isNaN(nb) ? "Valor bruto inválido: escreva por exemplo 3.000.000 ou 1500,50 (no máximo 2 casas decimais)." : "O valor bruto tem de ser maior que zero.");
        const linhas = [...c.despesas, ...c.descontos];
        if (linhas.some((x) => {
          const n = F.num(x.v);
          return n !== null && (!Number.isFinite(n) || n < 0);
        })) {
          m.erro("Há valores de despesa ou desconto inválidos (exemplos válidos: 250.000 ou 1500,50).");
          return;
        }
        if (linhas.some((x) => val(x.v) > 0 && !x.d && !x.tipo)) {
          m.erro("Descreva cada despesa.");
          return;
        }
        c.despesas = c.despesas.filter((x) => val(x.v) > 0).map((x) => ({ d: x.d || "Despesa", v: r2(val(x.v)) }));
        c.descontos = c.descontos.filter((x) => val(x.v) > 0).map((x) => ({ tipo: x.tipo, d: x.d, v: r2(val(x.v)) }));
        c.bruto = r2(nb);
        const k = calc(c, regra);
        if (k.base < 0) {
          m.erro("As despesas e os descontos (".concat(kz(k.desp + k.desc), " Kz) passam o valor bruto."));
          return;
        }
        if (c0) Object.assign(c0, c, { alterado: (/* @__PURE__ */ new Date()).toISOString() });
        else F.S.contas.push({ id: F.uid(), ...c, regra: JSON.parse(JSON.stringify(F.S.regraContas)), criado: (/* @__PURE__ */ new Date()).toISOString(), por: F.user.user });
        F.guardar();
        m.fechar();
        render();
        F.toast("Conta guardada: ".concat(kz(k.base), " Kz a distribuir."));
      } catch (err) {
        m.erro("Erro: ".concat(err.message));
      }
    });
  };
  const editarRegra = () => {
    const R = JSON.parse(JSON.stringify(F.S.regraContas));
    const lin = (x, g, i) => '<div class="linha-v" data-g="'.concat(g, '" data-i="').concat(i, '"><label class="sr-only" for="r').concat(g, "n").concat(i, '">Nome</label><input id="r').concat(g, "n").concat(i, '" data-k="nome" value="').concat(esc(x.nome), '" maxlength="40"><label class="sr-only" for="r').concat(g, "p").concat(i, '">Percentagem</label><input id="r').concat(g, "p").concat(i, '" data-k="pct" type="text" inputmode="decimal" autocomplete="off" value="').concat(esc(txt(x.pct)), '"><span>%</span><label class="check"><input type="checkbox" data-k="salario"').concat(x.salario !== false && ["mestre", "embarc", "tripulacao"].includes(x.chave) || x.salario ? " checked" : "", '> salário</label><button type="button" class="btn peq perigo" data-rx="').concat(g).concat(i, '" aria-label="Remover">✕</button></div>');
    const draw = () => '<label class="check"><input type="checkbox" id="r-on"'.concat(R.ativa !== false ? " checked" : "", '> Aplicar a regra (desmarcado: tudo vai para a empresa)</label>\n      <fieldset class="grupo"><legend>Partes (% do valor a distribuir)</legend><div>').concat(R.partes.map((x, i) => lin(x, "p", i)).join(""), '</div><button type="button" class="btn peq" data-ra="p">+ Parte</button></fieldset>\n      <fieldset class="grupo"><legend>Divisão do remanescente (deve somar 100 %)</legend><div>').concat(R.divisao.map((x, i) => lin(x, "d", i)).join(""), '</div><button type="button" class="btn peq" data-ra="d">+ Parte</button></fieldset><p class="dica">«salário» = gera um valor a pagar em «Salários pagos».</p>');
    const m = F.modal({ titulo: "Regra de distribuição das contas", largo: true, corpo: '<div id="r-c">'.concat(draw(), "</div>"), botoes: [{ id: "r", label: "Repor regra padrão", classe: "perigo" }, { id: "c", label: "Cancelar" }, { id: "g", label: "Guardar", classe: "prim" }] });
    const ler = () => {
      R.ativa = m.el.querySelector("#r-on").checked;
      m.el.querySelectorAll("[data-g]").forEach((li) => {
        const L = li.dataset.g === "p" ? R.partes : R.divisao;
        const x = L[+li.dataset.i];
        x.nome = F.clean(li.querySelector('[data-k="nome"]').value, 40);
        const t = li.querySelector('[data-k="pct"]').value;
        const n = F.num(t);
        x.pct = Number.isFinite(n) ? n : t;
        x.salario = li.querySelector('[data-k="salario"]').checked;
      });
    };
    m.el.addEventListener("click", (e) => {
      const a = e.target.closest("[data-ra]");
      const x = e.target.closest("[data-rx]");
      if (!a && !x) return;
      ler();
      if (a) (a.dataset.ra === "p" ? R.partes : R.divisao).push({ chave: "x".concat(F.uid().slice(-5)), nome: "Nova parte", pct: 0, salario: false });
      else (x.dataset.rx[0] === "p" ? R.partes : R.divisao).splice(+x.dataset.rx.slice(1), 1);
      m.el.querySelector("#r-c").innerHTML = draw();
    });
    m.on("c", () => m.fechar());
    m.on("r", () => {
      F.S.regraContas = JSON.parse(JSON.stringify(F.REGRA_CONTAS0));
      F.guardar();
      m.fechar();
      render();
      F.toast("Regra padrão reposta.");
    });
    m.on("g", () => {
      ler();
      if ([...R.partes, ...R.divisao].some((x) => !x.nome || typeof x.pct !== "number" || !Number.isFinite(x.pct) || x.pct < 0 || x.pct > 100)) {
        m.erro("Cada parte precisa de nome e de uma percentagem entre 0 e 100 (ex.: 10 ou 12,5).");
        return;
      }
      const sp = R.partes.reduce((t, x) => t + x.pct, 0);
      const sd = R.divisao.reduce((t, x) => t + x.pct, 0);
      if (sp > 100) {
        m.erro("As partes somam ".concat(r2(sp), " %: não podem passar de 100 %."));
        return;
      }
      if (R.divisao.length && Math.abs(sd - 100) > 1e-3) {
        m.erro("A divisão do remanescente soma ".concat(r2(sd), " %: tem de somar 100 %."));
        return;
      }
      F.S.regraContas = R;
      F.guardar();
      m.fechar();
      render();
      F.toast("Regra guardada. Aplica-se às contas novas.");
    });
  };
  const editarTipos = () => F.formModal({ titulo: "Tipos de desconto", valores: { t: F.S.tiposDesconto.join("\n") }, campos: [{ k: "t", label: "Um tipo por linha", tipo: "textarea", full: true, max: 600 }], guardar: () => {
    const v = document.querySelector("dialog[open] textarea").value.split("\n").map((x) => F.clean(x, 40)).filter(Boolean);
    if (!v.length) return "Deixe pelo menos um tipo.";
    F.S.tiposDesconto = [...new Set(v)];
    F.guardar();
    F.toast("Tipos de desconto guardados.");
    return "";
  } });
  const gerarSalarios = (c) => {
    if (F.S.pagamentos.some((p) => p.conta === c.id)) {
      F.toast("Os salários desta conta já foram gerados.", "erro");
      return;
    }
    const k = calc(c, c.regra);
    const P = [...k.partes, ...k.divisao].filter((p) => (p.salario !== void 0 ? p.salario : ["mestre", "embarc", "tripulacao"].includes(p.chave)) && p.valor > 0);
    if (!P.length) {
      F.toast("A regra desta conta não tem partes marcadas como salário.", "erro");
      return;
    }
    P.forEach((p) => F.S.pagamentos.push({ id: F.uid(), beneficiario: p.nome, categoria: p.nome, barco: c.barco, periodo: c.data.slice(0, 7), data: c.data, devido: p.valor, pago: 0, movs: [], conta: c.id, obs: "Conta: ".concat(c.ref), criado: (/* @__PURE__ */ new Date()).toISOString(), por: F.user.user }));
    F.guardar();
    render();
    F.toast("".concat(P.length, " valor(es) a pagar criados em «Salários pagos»."));
  };
  const render = () => {
    const ed = F.pode("contas");
    const L = F.S.contas.filter(passa).sort((a, b) => b.data.localeCompare(a.data));
    const K = L.map((c) => ({ c, k: calc(c, c.regra) }));
    const t = (f) => r2(K.reduce((s, x) => s + f(x.k), 0));
    const parte = (k, ch) => r2([...k.partes, ...k.divisao].filter((p) => p.chave === ch).reduce((s, p) => s + p.valor, 0));
    $("#acoes-contas").innerHTML = "".concat(ed ? '<button type="button" class="btn prim" data-ct="nova">+ Nova conta</button>' : "").concat(F.isAdmin() ? '<button type="button" class="btn" data-ct="regra">Regra de distribuição…</button><button type="button" class="btn" data-ct="tipos">Tipos de desconto…</button>' : "", '<button type="button" class="btn" data-ct="imp">Imprimir / imagem…</button>');
    const R = F.S.regraContas;
    const regraTxt = R.ativa === false ? '<p class="aviso">Regra desactivada: o valor a distribuir vai todo para a empresa.</p>' : "<p><b>Regra em vigor:</b> ".concat(R.partes.map((p) => "".concat(esc(p.nome), " ").concat(p.pct, "%")).join(" · "), " do valor a distribuir; o remanescente: ").concat(R.divisao.map((d) => "".concat(esc(d.nome), " ").concat(d.pct, "%")).join(" · "), '.</p><p class="dica">Exemplo: 3 000 000 − 500 000 de despesas − 100 000 de dívida = 2 400 000 a distribuir → 240 000 para cada parte de 10 % → remanescente 1 680 000 → 840 000 empresa e 840 000 tripulação.</p>');
    $("#c-contas").innerHTML = '<div class="caixa-regra">'.concat(regraTxt, '</div>\n      <div class="filtros"><div class="campo"><label for="fc-b">Embarcação</label><select id="fc-b" data-fc="barco">').concat(window.Barcos.opcoes(true).map(([v, l]) => '<option value="'.concat(esc(v), '"').concat(v === st.barco ? " selected" : "", ">").concat(esc(l), "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="fc-a">Ano</label><select id="fc-a" data-fc="ano"><option value="todos">Todos</option>').concat([...new Set(F.S.contas.map((c) => c.data.slice(0, 4)).concat(F.hoje().slice(0, 4)))].sort().reverse().map((a) => "<option".concat(a === st.ano ? " selected" : "", ">").concat(a, "</option>")).join(""), '</select></div></div>\n      <div class="kpis">').concat(F.kpi("".concat(kz(t((k) => k.bruto)), " Kz"), "Valor bruto (".concat(L.length, " conta").concat(L.length === 1 ? "" : "s", ")"))).concat(F.kpi("".concat(kz(t((k) => k.desp + k.desc)), " Kz"), "Despesas e descontos")).concat(F.kpi("".concat(kz(t((k) => k.base)), " Kz"), "Valor a distribuir")).concat(F.kpi("".concat(kz(K.reduce((s, x) => s + parte(x.k, "empresa"), 0)), " Kz"), "Para a empresa")).concat(F.kpi("".concat(kz(K.reduce((s, x) => s + parte(x.k, "tripulacao"), 0)), " Kz"), "Para a tripulação"), "</div>\n      ").concat(F.tabela(
      [
        { t: "Data", f: (x) => F.fmtData(x.c.data) },
        { t: "Embarcação", f: (x) => esc(window.Barcos.nome(x.c.barco)) },
        { t: "Referência", f: (x) => esc(x.c.ref) },
        { t: "Bruto", f: (x) => kz(x.k.bruto), num: true },
        { t: "Despesas + descontos", f: (x) => kz(x.k.desp + x.k.desc), num: true },
        { t: "A distribuir", f: (x) => "<b>".concat(kz(x.k.base), "</b>"), num: true },
        { t: "Manut. chata", f: (x) => kz(parte(x.k, "manut")), num: true },
        { t: "Mestre", f: (x) => kz(parte(x.k, "mestre")), num: true },
        { t: "Embarcadores", f: (x) => kz(parte(x.k, "embarc")), num: true },
        { t: "Empresa", f: (x) => kz(parte(x.k, "empresa")), num: true },
        { t: "Tripulação", f: (x) => kz(parte(x.k, "tripulacao")), num: true },
        { t: "Acções", f: (x) => '<button type="button" class="btn peq" data-ct="ver" data-id="'.concat(esc(x.c.id), '">Ver</button>').concat(ed ? ' <button type="button" class="btn peq" data-ct="ed" data-id="'.concat(esc(x.c.id), '">Editar</button> <button type="button" class="btn peq" data-ct="sal" data-id="').concat(esc(x.c.id), '"').concat(F.S.pagamentos.some((p) => p.conta === x.c.id) ? " disabled" : "", '>Gerar salários</button> <button type="button" class="btn peq perigo" data-ct="del" data-id="').concat(esc(x.c.id), '">Eliminar</button>') : "") }
      ],
      K,
      "Sem contas. Use «+ Nova conta» e escreva o valor bruto: o resto é calculado.",
      "Contas de viagem"
    ));
  };
  const folha = (c) => "<h2>Conta — ".concat(esc(window.Barcos.nome(c.barco)), "</h2><p>").concat(esc(c.ref), " · ").concat(F.fmtData(c.data), "</p>").concat(quadro(calc(c, c.regra))).concat(c.despesas.length ? "<h3>Despesas</h3>".concat(F.tabela([{ t: "Descrição", f: (x) => esc(x.d) }, { t: "Valor", f: (x) => kz(x.v), num: true }], c.despesas)) : "").concat(c.descontos.length ? "<h3>Descontos</h3>".concat(F.tabela([{ t: "Tipo", f: (x) => esc(x.tipo) }, { t: "Descrição", f: (x) => esc(x.d) }, { t: "Valor", f: (x) => kz(x.v), num: true }], c.descontos)) : "").concat(c.obs ? "<p><b>Observações:</b> ".concat(esc(c.obs), "</p>") : "");
  document.addEventListener("change", (e) => {
    var _a, _b, _c;
    const f = (_b = (_a = e.target).closest) == null ? void 0 : _b.call(_a, "[data-fc]");
    if (f) {
      st[f.dataset.fc] = f.value;
      render();
      (_c = $("#".concat(f.id))) == null ? void 0 : _c.focus();
    }
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-ct]");
    if (!b || b.disabled) return;
    const a = b.dataset.ct;
    const c = F.S.contas.find((x) => x.id === b.dataset.id);
    if (a === "ver" && c) {
      const m = F.modal({ titulo: "Conta de viagem", largo: true, corpo: folha(c), botoes: [{ id: "i", label: "Imprimir / imagem…" }, { id: "f", label: "Fechar", classe: "prim" }] });
      m.on("f", () => m.fechar());
      m.on("i", () => {
        m.fechar();
        F.papelDlg("Conta ".concat(c.ref), () => folha(c));
      });
      return;
    }
    if (a === "imp") {
      F.papelDlg("Contas de viagem", () => "<h2>Contas de viagem</h2>".concat($("#c-contas").innerHTML.replace(/<div class="filtros">[\s\S]*?<\/div><\/div>/, "").replace(/<button[^>]*>[^<]*<\/button>/g, "")));
      return;
    }
    if ((a === "regra" || a === "tipos") && F.isAdmin()) {
      if (a === "regra") editarRegra();
      else editarTipos();
      return;
    }
    if (!F.pode("contas")) return;
    if (a === "nova") editar(null);
    else if (a === "ed" && c) editar(c);
    else if (a === "sal" && c) gerarSalarios(c);
    else if (a === "del" && c && await F.confirmar("Eliminar conta", "Eliminar a conta «".concat(c.ref, "»?"), "Eliminar")) {
      F.S.contas.splice(F.S.contas.indexOf(c), 1);
      F.guardar();
      render();
    }
  });
  F.reg("contas", { render });
  window.Contas = Contas;
})();
