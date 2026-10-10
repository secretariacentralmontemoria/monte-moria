(() => {
  "use strict";
  const A = window.CongApp;
  if (!A) return;
  const { esc, clean, $ } = A;
  const NIV = [[1, "Muito alta"], [2, "Alta"], [3, "Média"], [4, "Baixa"], [5, "Informativa"]];
  const MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const CATS0 = [
    ["pena", "PENA DISCIPLINAR", 1, ""],
    ["levant", "LEVANTAMENTO DA PENA DISCIPLINAR", 2, ""],
    ["exon", "EXONERAÇÕES", 2, "Por conveniência de serviço, propõe-se a exoneração dos seguintes membros das respectivas funções:"],
    ["nomea", "NOMEAÇÕES", 3, ""],
    ["transf", "TRANSFERÊNCIA", 3, ""],
    ["casam", "CASAMENTOS", 4, ""]
  ];
  const D = () => {
    const S = A.S;
    if (!S.sec) S.sec = { cats: CATS0.map(([id, nome, crit, intro], i) => ({ id, nome, crit, intro, ordem: i })), modo: "crit", docs: [], cur: null };
    return S.sec;
  };
  const cats = () => {
    const X = D();
    return X.cats.slice().sort((a, b) => (X.modo === "crit" ? a.crit - b.crit : 0) || a.ordem - b.ordem);
  };
  const doc = () => D().docs.find((d) => d.id === D().cur) || null;
  const itens = (d, c) => d.itens.filter((i) => i.cat === c).sort((a, b) => a.ordem - b.ordem);
  const novo = (base) => {
    const X = D();
    const n = /* @__PURE__ */ new Date();
    const S = A.S;
    const cong = S.perfil.congregacao || "Congregação";
    const d = base ? { ...JSON.parse(JSON.stringify(base)), id: A.uid(), assunto: "".concat(base.assunto, " (cópia)"), itens: base.itens.map((i) => ({ ...i, id: A.uid() })) } : {
      id: A.uid(),
      assunto: "Informação Nº ".concat(X.docs.length + 1, "/ ").concat(MES[n.getMonth()], " /").concat(n.getFullYear()),
      destinatario: "À Secretaria do Centro Monte Moriá",
      saudacao: "Saudações em nome do nosso Senhor Jesus Cristo!",
      fecho: "Feito na Secretaria da congregação ".concat(cong, " aos ").concat(String(n.getDate()).padStart(2, "0"), " de ").concat(MES[n.getMonth()], " de ").concat(n.getFullYear(), "."),
      assin: [{ cargo: "O Secretário", nome: "" }, { cargo: "O Líder", nome: "" }],
      mostrarVazias: true,
      itens: []
    };
    X.docs.push(d);
    X.cur = d.id;
    A.save();
    render();
  };
  const folha = (d) => {
    const K = A.cfg();
    return '<header class="v20-cab"><img src="'.concat(esc($(".logo").getAttribute("src")), '" alt="Logótipo da ADP"><p>').concat(esc(K.cab.l1), "</p><p>").concat(esc(K.cab.l2), "</p><p>").concat(esc(A.S.perfil.congregacao || ""), '</p></header><hr class="v20-linha">\n    <p><b>Assunto: ').concat(esc(d.assunto), '</b></p><p class="v20-dest">').concat(esc(d.destinatario), "</p><p>").concat(esc(d.saudacao), "</p>\n    ").concat(cats().map((c) => {
      const L = itens(d, c.id);
      if (!L.length && !d.mostrarVazias) return "";
      return '<h3 class="v20-st">'.concat(esc(c.nome), "</h3>").concat(c.intro && L.length ? "<p>".concat(esc(c.intro), "</p>") : "", '<ul class="v20-ul">').concat(L.map((i) => "<li>".concat(esc(i.texto), "</li>")).join(""), "</ul>");
    }).join(""), '\n    <p class="v20-fecho">').concat(esc(d.fecho), '</p><div class="v20-assin">').concat((d.assin || []).map((a) => "<div><p>".concat(esc(a.cargo), "</p><span></span><p>").concat(esc(nomeAssin(a)), "</p></div>")).join(""), "</div>");
  };
  const nomeAssin = (a) => a.nome || (/secret/i.test(a.cargo) ? A.S.perfil.secretario : /l[ií]der|pastor|dirigente/i.test(a.cargo) ? A.S.perfil.lider : "") || "";
  const render = () => {
    const X = D();
    if (!X.docs.length) {
      novo(null);
      return;
    }
    const d = doc() || X.docs[X.docs.length - 1];
    X.cur = d.id;
    const lbl = (n) => (NIV.find((x) => x[0] === n) || [0, ""])[1];
    $("#sec-doc").innerHTML = X.docs.slice().reverse().map((x) => '<option value="'.concat(esc(x.id), '"').concat(x.id === d.id ? " selected" : "", ">").concat(esc(x.assunto), "</option>")).join("");
    ["assunto", "destinatario", "saudacao", "fecho"].forEach((k) => {
      const el = $('#sec-cab [data-k="'.concat(k, '"]'));
      if (el && document.activeElement !== el) el.value = d[k] || "";
    });
    $("#sc-vazias").checked = !!d.mostrarVazias;
    if (!$("#sec-cats-btn")) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.id = "sec-cats-btn";
      b.textContent = "Categorias… (admin)";
      $(".sec-bar").appendChild(b);
    }
    $("#sec-cats").innerHTML = cats().map((c) => {
      const L = itens(d, c.id);
      return '<section class="card" aria-label="'.concat(esc(c.nome), '"><div class="row-head"><h3>').concat(esc(c.nome), '</h3><span class="crit c').concat(c.crit, '">').concat(esc(lbl(c.crit)), '</span></div>\n      <ul class="lista">').concat(L.map((i, n) => '<li><div class="l-main">'.concat(esc(i.texto), '</div><div class="l-acts"><button type="button" class="btn small" data-si="up" data-id="').concat(esc(i.id), '" aria-label="Subir"').concat(n ? "" : " disabled", '>↑</button><button type="button" class="btn small" data-si="down" data-id="').concat(esc(i.id), '" aria-label="Descer"').concat(n < L.length - 1 ? "" : " disabled", '>↓</button><button type="button" class="btn small" data-si="edit" data-id="').concat(esc(i.id), '">Editar</button><button type="button" class="btn small danger" data-si="del" data-id="').concat(esc(i.id), '">Eliminar</button></div></li>')).join("") || '<li class="vazio">Sem itens.</li>', '</ul>\n      <div class="actions"><button type="button" class="btn small" data-si="add" data-cat="').concat(esc(c.id), '">+ Acrescentar</button></div></section>');
    }).join("") + '<section class="card"><h3>Assinaturas</h3><ul class="lista">'.concat((d.assin || []).map((a, n) => '<li><div class="l-main"><b>'.concat(esc(a.cargo), "</b> — ").concat(esc(nomeAssin(a) || "(nome por preencher)"), '</div><div class="l-acts"><button type="button" class="btn small" data-sa="edit" data-n="').concat(n, '">Editar</button><button type="button" class="btn small danger" data-sa="del" data-n="').concat(n, '">Eliminar</button></div></li>')).join(""), '</ul><div class="actions"><button type="button" class="btn small" data-sa="add">+ Assinatura</button></div></section>');
    $("#sec-folha").innerHTML = folha(d);
  };
  const dlg = (titulo, body, onOk) => {
    const d = document.createElement("dialog");
    d.setAttribute("aria-label", titulo);
    d.innerHTML = '<form method="dialog" class="dlg-box" novalidate><h2>'.concat(esc(titulo), "</h2>").concat(body, '<p class="err" role="alert"></p><div class="actions"><button value="cancel" class="btn">Cancelar</button><button type="button" class="btn primary" data-ok>Guardar</button></div></form>');
    document.body.appendChild(d);
    d.addEventListener("close", () => d.remove());
    d.querySelector("[data-ok]").addEventListener("click", () => {
      const m = onOk(d);
      if (m) d.querySelector(".err").textContent = m;
      else d.close();
    });
    d.showModal();
    return d;
  };
  const itemDlg = (cat, it) => dlg(
    it ? "Editar item" : "Novo item",
    '<div class="field"><label for="si-c">Categoria</label><select id="si-c">'.concat(cats().map((c) => '<option value="'.concat(esc(c.id), '"').concat(c.id === (it ? it.cat : cat) ? " selected" : "", ">").concat(esc(c.nome), "</option>")).join(""), '</select></div><div class="field"><label for="si-t">Texto *</label><textarea id="si-t" rows="4" maxlength="400">').concat(esc(it ? it.texto : ""), "</textarea></div>"),
    (d) => {
      const t = clean(d.querySelector("#si-t").value, 400);
      const c = d.querySelector("#si-c").value;
      if (t.length < 3) return "Escreva o texto do item.";
      const x = doc();
      if (it) {
        if (it.cat !== c) {
          it.cat = c;
          it.ordem = itens(x, c).length;
        }
        it.texto = t;
      } else x.itens.push({ id: A.uid(), cat: c, texto: t, ordem: itens(x, c).length });
      A.save();
      render();
      A.toast("Item guardado.");
      return "";
    }
  );
  const assinDlg = (n) => {
    const x = doc();
    const a = n !== void 0 ? x.assin[n] : null;
    dlg(
      a ? "Editar assinatura" : "Nova assinatura",
      '<div class="field"><label for="sa-c">Cargo *</label><input id="sa-c" maxlength="60" value="'.concat(esc(a ? a.cargo : ""), '"></div><div class="field"><label for="sa-n">Nome</label><input id="sa-n" maxlength="80" value="').concat(esc(a ? a.nome : ""), '"></div>'),
      (d) => {
        const cargo = clean(d.querySelector("#sa-c").value, 60);
        const nome = clean(d.querySelector("#sa-n").value, 80);
        if (cargo.length < 2) return "Indique o cargo.";
        if (a) Object.assign(a, { cargo, nome });
        else (x.assin = x.assin || []).push({ cargo, nome });
        A.save();
        render();
        return "";
      }
    );
  };
  const catsDlg = () => {
    const X = D();
    let L = cats().map((c) => ({ ...c }));
    let modo = X.modo;
    const draw = () => '<label class="check"><input type="radio" name="sm" value="crit"'.concat(modo === "crit" ? " checked" : "", '> Por criticidade</label><label class="check"><input type="radio" name="sm" value="manual"').concat(modo === "manual" ? " checked" : "", '> Ordem manual</label>\n      <ol class="pos">').concat(L.map((c, i) => '<li data-i="'.concat(i, '"><div class="grid"><div class="field"><label for="ck-n').concat(i, '">Nome</label><input id="ck-n').concat(i, '" data-f="nome" maxlength="60" value="').concat(esc(c.nome), '"></div><div class="field"><label for="ck-c').concat(i, '">Criticidade</label><select id="ck-c').concat(i, '" data-f="crit">').concat(NIV.map(([v, l]) => '<option value="'.concat(v, '"').concat(v === c.crit ? " selected" : "", ">").concat(v, " — ").concat(l, "</option>")).join(""), '</select></div>\n        <div class="field full"><label for="ck-i').concat(i, '">Texto introdutório</label><input id="ck-i').concat(i, '" data-f="intro" maxlength="200" value="').concat(esc(c.intro || ""), '"></div></div>\n        <span><button type="button" class="btn small" data-cm="-1"').concat(i ? "" : " disabled", ' aria-label="Subir">↑</button><button type="button" class="btn small" data-cm="1"').concat(i < L.length - 1 ? "" : " disabled", ' aria-label="Descer">↓</button><button type="button" class="btn small danger" data-cr aria-label="Eliminar ').concat(esc(c.nome), '">✕</button></span></li>')).join(""), '</ol><button type="button" class="btn small" data-ca>+ Categoria</button>');
    const read = (d2) => {
      var _a;
      modo = ((_a = d2.querySelector('[name="sm"]:checked')) == null ? void 0 : _a.value) || modo;
      d2.querySelectorAll("li[data-i]").forEach((li) => {
        const c = L[+li.dataset.i];
        c.nome = clean(li.querySelector('[data-f="nome"]').value, 60).toUpperCase();
        c.crit = +li.querySelector('[data-f="crit"]').value;
        c.intro = clean(li.querySelector('[data-f="intro"]').value, 200);
      });
    };
    const d = dlg("Categorias da Secretaria", "<div data-cl>".concat(draw(), "</div>"), (dd) => {
      read(dd);
      if (L.some((c) => c.nome.length < 2)) return "Todas as categorias precisam de nome.";
      X.cats = L.map((c, i) => ({ ...c, ordem: i }));
      X.modo = modo;
      A.save();
      render();
      A.toast("Categorias guardadas.");
      return "";
    });
    d.addEventListener("click", (e) => {
      const box = d.querySelector("[data-cl]");
      const mv = e.target.closest("[data-cm]");
      if (mv) {
        read(d);
        const i = +mv.closest("li").dataset.i, j = i + +mv.dataset.cm;
        [L[i], L[j]] = [L[j], L[i]];
        modo = "manual";
        box.innerHTML = draw();
        return;
      }
      if (e.target.closest("[data-cr]")) {
        read(d);
        L.splice(+e.target.closest("li").dataset.i, 1);
        box.innerHTML = draw();
        return;
      }
      if (e.target.closest("[data-ca]")) {
        read(d);
        L.push({ id: A.uid(), nome: "NOVA CATEGORIA", crit: 3, intro: "" });
        box.innerHTML = draw();
      }
    });
  };
  document.querySelector('.tab[data-tab="sec"]').addEventListener("click", () => {
    render();
    soFolha(!!D().soFolha);
  });
  $("#sec-doc").addEventListener("change", (e) => {
    D().cur = e.target.value;
    A.save();
    render();
  });
  const pode = () => {
    if (A.can("sec")) return true;
    A.toast("Não tem permissão para alterar a Secretaria.");
    return false;
  };
  $("#sec-novo").addEventListener("click", () => {
    if (pode()) novo(null);
  });
  $("#sec-dup").addEventListener("click", () => {
    if (doc() && pode()) novo(doc());
  });
  const soFolha = (on) => {
    D().soFolha = on;
    $("#tab-sec").classList.toggle("so-folha", on);
    $("#sec-toggle").setAttribute("aria-pressed", String(on));
    $("#sec-toggle").textContent = on ? "Mostrar campos" : "Ocultar campos";
  };
  $("#sec-toggle").addEventListener("click", () => {
    soFolha(!D().soFolha);
    A.save();
  });
  $("#sec-cab").addEventListener("change", (e) => {
    const k = e.target.dataset.k;
    const d = doc();
    if (!k || !d) return;
    if (!pode()) {
      render();
      return;
    }
    if (k === "mostrarVazias") d[k] = e.target.checked;
    else {
      const v = clean(e.target.value, 200);
      if (k === "assunto" && v.length < 3) {
        A.toast("O assunto não pode ficar vazio.");
        e.target.value = d.assunto;
        return;
      }
      d[k] = v;
    }
    A.save();
    render();
  });
  document.addEventListener("click", async (e) => {
    if (e.target.closest("#sec-cats-btn")) {
      A.admin(catsDlg);
      return;
    }
    const si = e.target.closest("[data-si]");
    const sa = e.target.closest("[data-sa]");
    const d = doc();
    if (!d) return;
    if ((si || sa) && !pode()) return;
    if (si) {
      const it = d.itens.find((x) => x.id === si.dataset.id);
      const a = si.dataset.si;
      if (a === "add") itemDlg(si.dataset.cat, null);
      else if (a === "edit" && it) itemDlg(it.cat, it);
      else if (a === "del" && it) {
        if (await A.confirmar("Eliminar item", "Eliminar «".concat(it.texto.slice(0, 80), "»?"), "Eliminar")) {
          d.itens.splice(d.itens.indexOf(it), 1);
          A.save();
          render();
        }
      } else if ((a === "up" || a === "down") && it) {
        const L = itens(d, it.cat);
        const i = L.indexOf(it), j = i + (a === "up" ? -1 : 1);
        if (j < 0 || j >= L.length) return;
        L.forEach((x, n) => {
          x.ordem = n;
        });
        [L[i].ordem, L[j].ordem] = [L[j].ordem, L[i].ordem];
        A.save();
        render();
      }
    }
    if (sa) {
      const a = sa.dataset.sa;
      if (a === "add") assinDlg();
      else if (a === "edit") assinDlg(+sa.dataset.n);
      else if (a === "del" && await A.confirmar("Eliminar assinatura", "Eliminar esta assinatura?", "Eliminar")) {
        d.assin.splice(+sa.dataset.n, 1);
        A.save();
        render();
      }
    }
  });
  $("#sec-print").addEventListener("click", () => {
    render();
    A.imprimir("sec");
  });
  $("#sec-word").addEventListener("click", async () => {
    const d = doc();
    if (!d) return;
    const h = '<html><head><meta charset="utf-8"><style>body{font-family:"Times New Roman",serif;font-size:12pt}.v20-cab{text-align:center;font-weight:bold}.v20-cab p{margin:0}.v20-st{text-decoration:underline;font-size:12pt}.v20-dest{margin-left:60%}.v20-fecho{text-align:center}</style></head><body>'.concat(folha(d).replace(/<img[^>]*>/, ""), "</body></html>");
    await A.partilhar(new Blob(["\uFEFF", h], { type: "application/msword" }), "".concat(A.slug(d.assunto), ".doc"), d.assunto);
  });
  $("#sec-enviar").addEventListener("click", async () => {
    const S = A.S;
    if (!S.perfil.congregacao) {
      A.toast("Configure primeiro a congregação em Definições.");
      return;
    }
    const X = D();
    const docs = X.docs.map((d) => ({ id: d.id, assunto: d.assunto, destinatario: d.destinatario, saudacao: d.saudacao, fecho: d.fecho, assin: d.assin, seccoes: cats().map((c) => ({ categoria: c.nome, crit: c.crit, intro: c.intro, itens: itens(d, c.id).map((i) => i.texto) })).filter((s) => s.itens.length) }));
    const p = { formato: "mm-secretaria", versao: 1, gerado: (/* @__PURE__ */ new Date()).toISOString(), congregacao: S.perfil.congregacao, responsavel: S.perfil.responsavel, lider: S.perfil.lider || "", docs };
    const r = await A.partilhar(new Blob([JSON.stringify(p, null, 1)], { type: "application/json" }), "Secretaria_".concat(A.slug(S.perfil.congregacao), "_").concat(A.today(), ".json"), "Secretaria — ".concat(S.perfil.congregacao));
    if (r !== "cancelado") A.toast(r === "partilhado" ? "Documentos partilhados." : "Ficheiro guardado em Transferências.");
  });
})();
