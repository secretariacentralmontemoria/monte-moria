(() => {
  "use strict";
  const { $, esc } = F;
  const st = { barco: "todas", aberta: null };
  const estado = (it) => {
    const p = it.p;
    const c = it.c;
    if (p === null && c === null) return "vazio";
    if (p === null || c === null) return p || c ? "falta" : "vazio";
    if (p === c) return "ok";
    return it.consumivel ? "consumo" : "alerta";
  };
  const resumo = (v) => {
    const r = { alerta: 0, consumo: 0, falta: 0 };
    v.itens.forEach((it) => {
      const e = estado(it);
      if (r[e] !== void 0) r[e]++;
    });
    return r;
  };
  const Inv = { estado, resumo, comAlertas: () => F.S.viagens.filter((v) => {
    const r = resumo(v);
    return r.alerta + r.falta > 0;
  }) };
  const novaViagem = () => F.formModal({
    titulo: "Nova viagem",
    largo: true,
    valores: { barco: st.barco !== "todas" ? st.barco : "", partida: F.hoje() },
    campos: [{ k: "barco", label: "Embarcação", tipo: "select", obrig: true, opcoes: () => window.Barcos.opcoes() }, { k: "partida", label: "Data de partida", tipo: "date", obrig: true }, { k: "regresso", label: "Data de regresso (pode ficar para depois)", tipo: "date" }],
    guardar: (v) => {
      if (v.regresso && v.regresso < v.partida) return "O regresso não pode ser antes da partida.";
      const x = { id: F.uid(), ...v, obs: "", criado: (/* @__PURE__ */ new Date()).toISOString(), por: F.user.user, itens: F.S.modelo.flatMap((g) => g.itens.map((it) => ({ cat: g.cat, nome: it.nome, consumivel: !!it.consumivel, p: null, c: null, obs: "" }))) };
      F.S.viagens.push(x);
      st.aberta = x.id;
      F.guardar();
      render();
      F.toast("Viagem criada: registe as quantidades da partida.");
      return "";
    }
  });
  const render = () => {
    const ed = F.pode("inv");
    $("#acoes-inventario").innerHTML = "".concat(ed ? '<button type="button" class="btn prim" data-i="nova">+ Nova viagem</button><button type="button" class="btn" data-i="modelo">Itens do inventário…</button>' : "");
    if (st.aberta && F.S.viagens.some((v) => v.id === st.aberta)) {
      detalhe(F.S.viagens.find((v) => v.id === st.aberta), ed);
      return;
    }
    st.aberta = null;
    const L = F.S.viagens.filter((v) => st.barco === "todas" || v.barco === st.barco).sort((a, b) => b.partida.localeCompare(a.partida)).map((v) => ({ ...v, r: resumo(v), _cls: resumo(v).alerta + resumo(v).falta ? "linha-alerta" : "" }));
    $("#c-inventario").innerHTML = '<div class="filtros"><div class="campo"><label for="fi-b">Embarcação</label><select id="fi-b" data-fi="barco">'.concat(window.Barcos.opcoes(true).map(([v, l]) => '<option value="'.concat(esc(v), '"').concat(v === st.barco ? " selected" : "", ">").concat(esc(l), "</option>")).join(""), "</select></div></div>") + F.tabela(
      [
        { t: "Embarcação", f: (v) => "<b>".concat(esc(window.Barcos.nome(v.barco)), "</b>") },
        { t: "Partida", f: (v) => F.fmtData(v.partida) },
        { t: "Regresso", f: (v) => v.regresso ? F.fmtData(v.regresso) : '<span class="tag">em viagem</span>' },
        { t: "Dias", f: (v) => {
          var _a, _b;
          return v.regresso ? (_b = (_a = F.tempo(v.partida, v.regresso)) == null ? void 0 : _a.total) != null ? _b : "—" : "—";
        }, num: true },
        { t: "Alertas", f: (v) => v.r.alerta + v.r.falta ? '<span class="tag alerta">⚠ '.concat(v.r.alerta + v.r.falta, "</span>") : '<span class="tag ok">sem diferenças</span>' },
        { t: "Consumos", f: (v) => v.r.consumo ? '<span class="tag consumo">'.concat(v.r.consumo, "</span>") : "—" },
        { t: "Acções", f: (v) => '<button type="button" class="btn peq" data-i="abrir" data-id="'.concat(esc(v.id), '">Abrir</button>').concat(ed ? ' <button type="button" class="btn peq perigo" data-i="del" data-id="'.concat(esc(v.id), '">Eliminar</button>') : "") }
      ],
      L,
      "Sem viagens registadas.",
      "Viagens"
    );
  };
  const detalhe = (v, ed) => {
    const r = resumo(v);
    const dis = ed ? "" : " disabled";
    const cats = [...new Set(v.itens.map((i) => i.cat))];
    const lista = v.itens.map((it, i) => ({ it, i, e: estado(it) })).filter((x) => ["alerta", "falta"].includes(x.e));
    const alerta = lista.length ? '<div class="alerta perigo" role="alert"><b>⚠ '.concat(lista.length, " diferença(s) entre a partida e a chegada</b><ul>").concat(lista.map((x) => {
      var _a, _b;
      return "<li>".concat(esc(x.it.nome), ": ").concat((_a = x.it.p) != null ? _a : "—", " → ").concat((_b = x.it.c) != null ? _b : "—").concat(x.e === "falta" ? " (contagem em falta)" : "", "</li>");
    }).join(""), "</ul></div>") : '<div class="alerta ok" role="status">✔ Sem diferenças nos itens não consumíveis.</div>';
    const linha = ({ it, i, e }) => {
      var _a, _b;
      return '<tr class="est-'.concat(e, '"><th scope="row">').concat(esc(it.nome)).concat(it.consumivel ? " <small>(consumível)</small>" : "", '</th>\n      <td><label class="sr-only" for="ip').concat(i, '">Partida: ').concat(esc(it.nome), '</label><input id="ip').concat(i, '" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-q="p" data-n="').concat(i, '" value="').concat((_a = it.p) != null ? _a : "", '"').concat(dis, '></td>\n      <td><label class="sr-only" for="ic').concat(i, '">Chegada: ').concat(esc(it.nome), '</label><input id="ic').concat(i, '" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-q="c" data-n="').concat(i, '" value="').concat((_b = it.c) != null ? _b : "", '"').concat(dis, '></td>\n      <td class="num">').concat(e === "vazio" ? "—" : e === "falta" ? "⚠ falta" : it.c - it.p === 0 ? "0" : "".concat(e === "consumo" ? "" : "⚠ ").concat(it.c - it.p > 0 ? "+" : "").concat(it.c - it.p), '</td>\n      <td><label class="sr-only" for="io').concat(i, '">Observação: ').concat(esc(it.nome), '</label><input id="io').concat(i, '" data-q="obs" data-n="').concat(i, '" maxlength="120" value="').concat(esc(it.obs || ""), '"').concat(dis, "></td></tr>");
    };
    $("#c-inventario").innerHTML = '<div class="acoes"><button type="button" class="btn" data-i="voltar">← Voltar à lista</button><button type="button" class="btn" data-i="imp">Imprimir…</button></div>\n      <div class="cartao viagem-cab"><h3>'.concat(esc(window.Barcos.nome(v.barco)), '</h3><div class="grelha"><div class="campo"><label for="vp">Partida</label><input type="date" id="vp" data-v="partida" value="').concat(esc(v.partida), '"').concat(dis, '></div><div class="campo"><label for="vr">Regresso</label><input type="date" id="vr" data-v="regresso" value="').concat(esc(v.regresso || ""), '"').concat(dis, '></div></div>\n      <p class="dica">Alertas: ').concat(r.alerta, " · contagens em falta: ").concat(r.falta, " · consumos: ").concat(r.consumo, ". Deixe vazio o que não foi contado.</p></div>").concat(alerta, "\n      ").concat(cats.map((cat) => '<section class="cartao" aria-labelledby="cat-'.concat(esc(F.norm(cat).replace(/\W+/g, "-")), '"><h3 id="cat-').concat(esc(F.norm(cat).replace(/\W+/g, "-")), '">').concat(esc(cat), '</h3><div class="tbl"><table class="inv"><thead><tr><th scope="col">Item</th><th scope="col">Partida</th><th scope="col">Chegada</th><th scope="col" class="num">Diferença</th><th scope="col">Observação</th></tr></thead><tbody>').concat(v.itens.map((it, i) => ({ it, i, e: estado(it) })).filter((x) => x.it.cat === cat).map(linha).join(""), "</tbody></table></div></section>")).join(""), '\n      <div class="cartao"><div class="campo"><label for="vobs">Observações gerais da viagem</label><textarea id="vobs" data-v="obs" maxlength="600" rows="3"').concat(dis, ">").concat(esc(v.obs || ""), "</textarea></div></div>");
  };
  const modelo = () => {
    let M = JSON.parse(JSON.stringify(F.S.modelo));
    const draw = () => M.map((g, gi) => '<fieldset class="grupo"><legend><label class="sr-only" for="mc'.concat(gi, '">Categoria</label><input id="mc').concat(gi, '" data-mc="').concat(gi, '" value="').concat(esc(g.cat), '" maxlength="60"></legend>').concat(g.itens.map((it, ii) => '<div class="mod-item"><label class="sr-only" for="mi'.concat(gi, "-").concat(ii, '">Item</label><input id="mi').concat(gi, "-").concat(ii, '" data-mi="').concat(gi, ".").concat(ii, '" value="').concat(esc(it.nome), '" maxlength="60"><label class="check"><input type="checkbox" data-mk="').concat(gi, ".").concat(ii, '"').concat(it.consumivel ? " checked" : "", '> consumível</label><button type="button" class="btn peq perigo" data-mx="').concat(gi, ".").concat(ii, '" aria-label="Remover ').concat(esc(it.nome), '">✕</button></div>')).join(""), '<button type="button" class="btn peq" data-ma="').concat(gi, '">+ Item</button> <button type="button" class="btn peq perigo" data-mg="').concat(gi, '">Remover categoria</button></fieldset>')).join("") + '<button type="button" class="btn" data-mn>+ Categoria</button>';
    const m = F.modal({ titulo: "Itens do inventário", largo: true, corpo: '<p class="dica">Usados nas viagens novas. Itens consumíveis (combustível, água) mostram a diferença como consumo, sem alerta.</p><div id="mod-l">'.concat(draw(), "</div>"), botoes: [{ id: "c", label: "Cancelar" }, { id: "g", label: "Guardar", classe: "prim" }] });
    const ler = () => {
      m.el.querySelectorAll("[data-mc]").forEach((i) => {
        M[+i.dataset.mc].cat = F.clean(i.value, 60);
      });
      m.el.querySelectorAll("[data-mi]").forEach((i) => {
        const [g, k] = i.dataset.mi.split(".").map(Number);
        M[g].itens[k].nome = F.clean(i.value, 60);
      });
      m.el.querySelectorAll("[data-mk]").forEach((i) => {
        const [g, k] = i.dataset.mk.split(".").map(Number);
        M[g].itens[k].consumivel = i.checked;
      });
    };
    m.el.addEventListener("click", (e) => {
      const t = e.target;
      const box = m.el.querySelector("#mod-l");
      if (t.closest("[data-mx]")) {
        ler();
        const [g, k] = t.closest("[data-mx]").dataset.mx.split(".").map(Number);
        M[g].itens.splice(k, 1);
        box.innerHTML = draw();
      } else if (t.closest("[data-ma]")) {
        ler();
        M[+t.closest("[data-ma]").dataset.ma].itens.push({ nome: "Novo item", consumivel: false });
        box.innerHTML = draw();
      } else if (t.closest("[data-mg]")) {
        ler();
        M.splice(+t.closest("[data-mg]").dataset.mg, 1);
        box.innerHTML = draw();
      } else if (t.closest("[data-mn]")) {
        ler();
        M.push({ cat: "Nova categoria", itens: [] });
        box.innerHTML = draw();
      }
    });
    m.on("c", () => m.fechar());
    m.on("g", () => {
      ler();
      if (M.some((g) => !g.cat || g.itens.some((i) => !i.nome))) {
        m.erro("Todas as categorias e itens precisam de nome.");
        return;
      }
      F.S.modelo = M;
      F.guardar();
      m.fechar();
      F.toast("Itens do inventário guardados (aplicam-se às viagens novas).");
    });
  };
  document.addEventListener("change", (e) => {
    var _a, _b, _c, _d, _e, _f;
    const t = e.target;
    if ((_a = t.closest) == null ? void 0 : _a.call(t, "[data-fi]")) {
      st.barco = t.value;
      render();
      (_b = $("#fi-b")) == null ? void 0 : _b.focus();
      return;
    }
    const v = F.S.viagens.find((x) => x.id === st.aberta);
    if (!v || !F.pode("inv")) return;
    if (t.dataset.q) {
      const it = v.itens[+t.dataset.n];
      if (!it) return;
      if (t.dataset.q === "obs") it.obs = F.clean(t.value, 120);
      else {
        const s = String(t.value).trim();
        const n = s === "" ? null : Number(s);
        if (n !== null && (!Number.isInteger(n) || n < 0)) {
          F.toast("Quantidade inválida: use números inteiros iguais ou maiores que zero.", "erro");
          t.value = (_c = it[t.dataset.q]) != null ? _c : "";
          t.setAttribute("aria-invalid", "true");
          return;
        }
        it[t.dataset.q] = n;
      }
      const antes = estado(it);
      v.alterado = (/* @__PURE__ */ new Date()).toISOString();
      F.guardar();
      const id = t.id;
      detalhe(v, true);
      (_d = document.getElementById(id)) == null ? void 0 : _d.focus();
      if (["alerta", "falta"].includes(antes) && t.dataset.q !== "obs") {
        F.toast("⚠ Alerta: ".concat(it.nome, " — partida ").concat((_e = it.p) != null ? _e : "—", ", chegada ").concat((_f = it.c) != null ? _f : "—", ". Registe a observação."), "erro");
        if (navigator.vibrate) navigator.vibrate(200);
      }
      return;
    }
    if (t.dataset.v) {
      const k = t.dataset.v;
      const val = k === "obs" ? F.clean(t.value, 600) : t.value;
      if (k !== "obs" && val && !/^\d{4}-\d{2}-\d{2}$/.test(val)) return;
      if (k === "partida" && !val) {
        F.toast("A data de partida é obrigatória.", "erro");
        t.value = v.partida;
        return;
      }
      if (k === "regresso" && val && val < v.partida || k === "partida" && v.regresso && val > v.regresso) {
        F.toast("O regresso não pode ser antes da partida.", "erro");
        t.value = v[k] || "";
        return;
      }
      v[k] = val;
      v.alterado = (/* @__PURE__ */ new Date()).toISOString();
      F.guardar();
    }
  });
  document.addEventListener("click", async (e) => {
    var _a;
    const b = e.target.closest("[data-i]");
    if (!b || b.disabled) return;
    const a = b.dataset.i;
    const v = F.S.viagens.find((x) => x.id === (b.dataset.id || st.aberta));
    if (a === "abrir" && v) {
      st.aberta = v.id;
      render();
      (_a = $("#c-inventario h3")) == null ? void 0 : _a.focus();
    } else if (a === "voltar") {
      st.aberta = null;
      render();
    } else if (a === "imp" && v) F.papelDlg("Imprimir — inventário da viagem", () => "<h2>Inventário — ".concat(esc(window.Barcos.nome(v.barco)), "</h2><p>Partida: ").concat(F.fmtData(v.partida), " · Regresso: ").concat(F.fmtData(v.regresso), "</p>").concat(F.tabela([{ t: "Categoria", f: (it) => esc(it.cat) }, { t: "Item", f: (it) => esc(it.nome) }, { t: "Partida", f: (it) => {
      var _a2;
      return esc((_a2 = it.p) != null ? _a2 : "—");
    }, num: true }, { t: "Chegada", f: (it) => {
      var _a2;
      return esc((_a2 = it.c) != null ? _a2 : "—");
    }, num: true }, { t: "Estado", f: (it) => ({ ok: "OK", alerta: "⚠ diferença", consumo: "consumo", falta: "⚠ contagem em falta", vazio: "—" })[estado(it)] }, { t: "Observação", f: (it) => esc(it.obs) }], v.itens)).concat(v.obs ? "<p><b>Observações:</b> ".concat(esc(v.obs), "</p>") : ""));
    else if (!F.pode("inv")) return;
    else if (a === "nova") novaViagem();
    else if (a === "modelo") modelo();
    else if (a === "del" && v && await F.confirmar("Eliminar viagem", "Eliminar a viagem de ".concat(window.Barcos.nome(v.barco), " (").concat(F.fmtData(v.partida), ")?"), "Eliminar")) {
      F.S.viagens.splice(F.S.viagens.indexOf(v), 1);
      F.guardar();
      render();
    }
  });
  F.reg("inventario", { render });
  window.Inv = Inv;
})();
