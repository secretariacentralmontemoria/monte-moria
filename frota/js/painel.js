(() => {
  "use strict";
  const { $, esc } = F;
  const st = { barco: "todas", ano: "todos" };
  const k = (id, titulo, fonte, medida, cor, filtro = {}) => ({ id, tipo: "kpi", titulo, fonte, medida, agrupar: "nenhum", cor, filtro });
  const g = (id, titulo, fonte, medida, agrupar, grafico, cor, extra = {}) => ({ id, tipo: "chart", titulo, fonte, medida, agrupar, grafico, cor, valores: true, altura: "m", filtro: {}, ...extra });
  const PADRAO = () => [
    k("k1", "Entradas (receita)", "resumo", "soma:receita", "#0E7C86"),
    k("k2", "Em caixa (empresa)", "resumo", "soma:caixa", "#335C81"),
    k("k3", "Manutenção disponível", "resumo", "soma:manut", "#E09F3E"),
    k("k4", "Para os representantes", "resumo", "soma:reps", "#5B8E7D"),
    k("k5", "Contas: valor a distribuir", "contas", "soma:base", "#8B5FBF"),
    k("k6", "Salários por pagar", "pagamentos", "soma:pendente", "#9E2A2B"),
    k("k7", "Alertas de inventário", "viagens", "soma:alertas", "#C05746"),
    k("k8", "Embarcadores a bordo", "embarques", "contagem", "#2E86AB", { estado: "A bordo" }),
    g("g1", "Entradas por embarcação", "entradas", "soma:valor", "barco", "bar", "#0E7C86", { multicor: true }),
    g("g2", "Entradas por mês", "entradas", "soma:valor", "mes", "area", "#335C81"),
    g("g3", "Em caixa por embarcação", "resumo", "soma:caixa", "barco", "barH", "#5B8E7D"),
    g("g4", "Salários pagos por categoria", "pagamentos", "soma:pago", "categoria", "doughnut", "#E09F3E"),
    g("g5", "Contas: valor a distribuir por mês", "contas", "soma:base", "mes", "bar", "#8B5FBF"),
    g("g6", "Alertas de inventário por embarcação", "viagens", "soma:alertas", "barco", "bar", "#C05746"),
    g("g7", "Embarques por estado", "embarques", "contagem", "estado", "pie", "#2E86AB")
  ];
  const conf = () => {
    const P = F.S.painel || (F.S.painel = {});
    const id = F.user.id;
    if (!P[id] || !Array.isArray(P[id].widgets)) P[id] = { widgets: PADRAO() };
    return P[id];
  };
  const render = () => {
    const anos = [...new Set([...F.S.entradas, ...F.S.saidas, ...F.S.pagamentos, ...F.S.contas].map((x) => String(x.data || "").slice(0, 4)).concat(F.hoje().slice(0, 4)))].filter(Boolean).sort().reverse();
    $("#acoes-painel").innerHTML = '<button type="button" class="btn prim" data-p="novo-g">+ Gráfico</button><button type="button" class="btn" data-p="novo-k">+ Indicador</button><button type="button" class="btn" data-p="pers">Personalizar…</button><button type="button" class="btn" data-p="imp">Imprimir / imagem…</button>';
    const aniv = F.pode("colab", "read") && window.Colab ? window.Colab.hoje() : [];
    $("#c-painel").innerHTML = "".concat(aniv.length ? '<div class="alerta info" role="status">🎂 Hoje fazem anos: <b>'.concat(aniv.map((x) => esc(x.nome)).join(", "), "</b></div>") : "", '\n      <div class="filtros"><div class="campo"><label for="fp-b">Embarcação</label><select id="fp-b" data-fp="barco">').concat(window.Barcos.opcoes(true).map(([v, l]) => '<option value="'.concat(esc(v), '"').concat(v === st.barco ? " selected" : "", ">").concat(esc(l), "</option>")).join(""), '</select></div>\n      <div class="campo"><label for="fp-a">Ano</label><select id="fp-a" data-fp="ano"><option value="todos">Todos</option>').concat(anos.map((a) => "<option".concat(a === st.ano ? " selected" : "", ">").concat(a, "</option>")).join(""), '</select></div></div>\n      <p class="dica">Clique numa barra ou fatia para ver os registos. Use ⇄ para mudar o tipo, 123 para mostrar os números, ⬇ para a imagem.</p><div id="painel-w"></div>');
    G.montar($("#painel-w"), { chave: "p", widgets: conf().widgets, filtro: st, editavel: true, guardar: () => F.guardar() });
  };
  const personalizar = () => {
    const c = conf();
    const W = JSON.parse(JSON.stringify(c.widgets));
    const draw = () => W.map((w, i) => {
      var _a;
      return '<li data-i="'.concat(i, '"><label class="check"><input type="checkbox" data-vis').concat(w.oculto ? "" : " checked", '> Mostrar</label><span class="pers-t"><b>').concat(esc(w.titulo), "</b><small>").concat(w.tipo === "kpi" ? "indicador" : "gráfico", " · ").concat(esc(((_a = G.FONTES[w.fonte]) == null ? void 0 : _a.nome) || "?"), '</small></span>\n      <span class="mover"><button type="button" class="btn peq" data-pe="').concat(i, '" aria-label="Editar ').concat(esc(w.titulo), '">✎</button><button type="button" class="btn peq" data-mv="-1" aria-label="Subir"').concat(i ? "" : " disabled", '>↑</button><button type="button" class="btn peq" data-mv="1" aria-label="Descer"').concat(i < W.length - 1 ? "" : " disabled", '>↓</button><button type="button" class="btn peq perigo" data-px="').concat(i, '" aria-label="Remover ').concat(esc(w.titulo), '">✕</button></span></li>');
    }).join("");
    const m = F.modal({ titulo: "Personalizar o painel", largo: true, corpo: '<p class="dica">Mostre ou esconda, ordene, edite ou remova indicadores e gráficos. A configuração é de cada utilizador.</p><ol class="pers" id="pers-l">'.concat(draw(), "</ol>"), botoes: [{ id: "r", label: "Repor o painel padrão", classe: "perigo" }, { id: "c", label: "Cancelar" }, { id: "g", label: "Guardar", classe: "prim" }] });
    const ler = () => m.el.querySelectorAll("#pers-l li").forEach((li) => {
      W[+li.dataset.i].oculto = !li.querySelector("[data-vis]").checked;
    });
    const box = () => m.el.querySelector("#pers-l");
    m.el.addEventListener("click", (e) => {
      var _a;
      const mv = e.target.closest("[data-mv]");
      const pe = e.target.closest("[data-pe]");
      const px = e.target.closest("[data-px]");
      if (mv) {
        ler();
        const i = +mv.closest("li").dataset.i;
        const j = i + +mv.dataset.mv;
        [W[i], W[j]] = [W[j], W[i]];
        box().innerHTML = draw();
        (_a = box().querySelector('li[data-i="'.concat(j, '"] [data-mv="').concat(mv.dataset.mv, '"]'))) == null ? void 0 : _a.focus();
      } else if (pe) {
        ler();
        G.editor(W[+pe.dataset.pe], (n) => {
          W[+pe.dataset.pe] = n;
          box().innerHTML = draw();
        });
      } else if (px) {
        ler();
        W.splice(+px.dataset.px, 1);
        box().innerHTML = draw();
      }
    });
    m.on("c", () => m.fechar());
    m.on("r", async () => {
      if (await F.confirmar("Repor painel", "Voltar ao painel padrão? Os seus gráficos personalizados serão apagados.", "Repor")) {
        c.widgets = PADRAO();
        F.guardar();
        m.fechar();
        render();
      }
    });
    m.on("g", () => {
      ler();
      c.widgets = W;
      F.guardar();
      m.fechar();
      render();
      F.toast("Painel personalizado.");
    });
  };
  const relatorio = () => {
    const el = $("#painel-w");
    return '<h2>Painel estatístico</h2><div class="kpis">'.concat([...el.querySelectorAll(".kpi-w")].map((x) => '<div class="kpi"><b>'.concat(esc(x.querySelector("b").textContent), "</b><span>").concat(esc(x.querySelector("span").textContent), "</span></div>")).join(""), '</div><div class="p-graficos">').concat([...el.querySelectorAll("canvas")].map((cv) => "<figure><figcaption>".concat(esc(cv.getAttribute("aria-label")), '</figcaption><img src="').concat(cv.toDataURL("image/png"), '" alt="').concat(esc(cv.getAttribute("aria-label")), '"></figure>')).join(""), "</div>");
  };
  document.addEventListener("change", (e) => {
    var _a, _b, _c;
    const f = (_b = (_a = e.target).closest) == null ? void 0 : _b.call(_a, "[data-fp]");
    if (f) {
      st[f.dataset.fp] = f.value;
      render();
      (_c = $("#".concat(f.id))) == null ? void 0 : _c.focus();
    }
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-p]");
    if (!b) return;
    const a = b.dataset.p;
    const c = conf();
    if (a === "novo-g" || a === "novo-k") G.editor(a === "novo-k" ? { id: "w".concat(F.uid()), tipo: "kpi", titulo: "Novo indicador", fonte: "entradas", medida: "soma:valor", agrupar: "nenhum", cor: F.PALETA[1], filtro: {} } : null, (w) => {
      c.widgets.push(w);
      F.guardar();
      render();
      F.toast("Acrescentado ao painel.");
    });
    else if (a === "pers") personalizar();
    else if (a === "imp") F.papelDlg("Painel estatístico", relatorio);
  });
  F.reg("painel", { render });
  window.Painel = { PADRAO };
})();
