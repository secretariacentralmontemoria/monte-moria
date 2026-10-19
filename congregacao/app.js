(() => {
  "use strict";
  const KEY = "mmCongregacao_v1";
  const THEME = "mmCongTema";
  const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const CONGS = ["Monte Moriá", "Monte Sinai", "Cenáculo da Fé", "Tabernáculo de Davi"];
  const CATS = {
    Entrada: ["Dízimos", "Ofertas", "Missões", "Beneficência", "Outras entradas"],
    Despesa: ["50% para o Centro", "Missões (envio ao Centro)", "Manutenção", "Apoio social", "Alimentação", "Serviços de telecomunicação", "Transporte", "Outras despesas"]
  };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s != null ? s : "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const clean = (s, max = 200) => String(s != null ? s : "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const kz = (n) => Number(n || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (v, casas = 2) => {
    if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
    let t = String(v != null ? v : "").replace(/[\s\u00a0\u202f]/g, "").replace(/kz|aoa/gi, "");
    if (!t) return null;
    let neg = false;
    if (/^[-−]/.test(t)) {
      neg = true;
      t = t.slice(1);
    }
    const p = t.lastIndexOf(".");
    const v2 = t.lastIndexOf(",");
    if (p >= 0 && v2 >= 0) {
      const dec = p > v2 ? "." : ",";
      t = t.split(dec === "." ? "," : ".").join("").replace(dec, ".");
    } else if (v2 >= 0) {
      const partes = t.split(",");
      t = partes.length > 2 ? partes.join("") : partes.join(".");
    } else if (p >= 0) {
      const partes = t.split(".");
      if (partes.length > 2 || partes[1].length === 3 && /^[1-9]\d{0,2}$/.test(partes[0])) t = partes.join("");
    }
    if (!/^\d+(\.\d+)?$/.test(t) || (t.split(".")[1] || "").length > casas) return NaN;
    const n = Number(t);
    return neg ? -n : n;
  };
  const numTxt = (n) => {
    if (n === "" || n === null || n === void 0 || !Number.isFinite(Number(n))) return "";
    const r = Math.round(Math.abs(Number(n)) * 100) / 100;
    const [i, d] = r.toFixed(2).split(".");
    const dec = d.replace(/0+$/, "");
    return "".concat(Number(n) < 0 ? "-" : "").concat(i.replace(/\B(?=(\d{3})+(?!\d))/g, " ")).concat(dec ? ",".concat(dec) : "");
  };
  const ymNow = () => {
    const d = /* @__PURE__ */ new Date();
    return "".concat(d.getFullYear(), "-").concat(String(d.getMonth() + 1).padStart(2, "0"));
  };
  const today = () => {
    const d = /* @__PURE__ */ new Date();
    return "".concat(ymNow(), "-").concat(String(d.getDate()).padStart(2, "0"));
  };
  const mesLbl = (ym) => {
    const [a, m] = String(ym).split("-");
    return "".concat(MESES[+m - 1] || "?", " de ").concat(a);
  };
  const prevYm = (ym) => {
    const [a, m] = ym.split("-").map(Number);
    const d = new Date(a, m - 2, 1);
    return "".concat(d.getFullYear(), "-").concat(String(d.getMonth() + 1).padStart(2, "0"));
  };
  const uid = () => "c".concat(Date.now().toString(36)).concat(Math.random().toString(36).slice(2, 6));
  const fmtData = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso) ? "".concat(iso.slice(8), "/").concat(iso.slice(5, 7), "/").concat(iso.slice(0, 4)) : iso;
  const slug = (s) => String(s || "Congregacao").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const hash = (txt) => {
    let h = 2166136261;
    for (let i = 0; i < txt.length; i++) {
      h ^= txt.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  };
  let toastT = null;
  const toast = (msg) => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 3800);
  };
  const confirmar = (titulo, msg, ok = "Confirmar") => new Promise((res) => {
    const d = $("#dlg");
    $("#dlg-t").textContent = titulo;
    $("#dlg-m").textContent = msg;
    $("#dlg-ok").textContent = ok;
    if (typeof d.showModal !== "function") {
      res(window.confirm("".concat(titulo, "\n\n").concat(msg)));
      return;
    }
    d.returnValue = "";
    d.showModal();
    d.addEventListener("close", () => res(d.returnValue === "ok"), { once: true });
  });
  const CFG0 = () => ({
    pin: "",
    labels: { "l-data": "Data *", "l-tipo": "Tipo *", "l-cat": "Categoria *", "l-sub": "Subcategoria", "l-desc": "Descrição *", "l-val": "Valor (Kz) *", "l-obs": "Observação" },
    abas: { lanc: "Lançamentos", rel: "Relatório", sec: "Secretaria", enviar: "Enviar", def: "Definições" },
    cab: { l1: "ASSEMBLEIA DE DEUS PENTECOSTAL", l2: "Ministério Betel Luanda · Centro Monte Moriá" },
    titulos: { ent: "ENTRADAS", des: "DESPESAS", rel: "relatório de {MES}" },
    assin: [{ cargo: "O(A) Tesoureiro(a)", nome: "" }, { cargo: "O Líder", nome: "" }],
    cor: "#b8892b",
    corCab: "#13233d",
    fonte: "sistema",
    tamanho: "normal",
    ordemCampos: ["l-data", "l-tipo", "l-cat", "l-sub", "l-desc", "l-val", "l-obs"],
    ordemRel: ["saldo", "ent", "des", "final", "obs", "assin"],
    cats: { Entrada: [...CATS.Entrada], Despesa: [...CATS.Despesa] }
  });
  const REL = { saldo: "Saldo anterior", ent: "Entradas", des: "Despesas", final: "Saldo a transitar", obs: "Observações", assin: "Assinaturas" };
  const cfg = () => {
    const d = CFG0();
    const c = S && S.cfg || {};
    return {
      ...d,
      ...c,
      labels: { ...d.labels, ...c.labels || {} },
      abas: { ...d.abas, ...c.abas || {} },
      cab: { ...d.cab, ...c.cab || {} },
      titulos: { ...d.titulos, ...c.titulos || {} },
      assin: [0, 1].map((i) => ({ ...d.assin[i], ...(c.assin || [])[i] || {} })),
      cats: { ...d.cats, ...c.cats || {} },
      ordemCampos: (c.ordemCampos || d.ordemCampos).filter((x) => d.ordemCampos.includes(x)),
      ordemRel: (c.ordemRel || d.ordemRel).filter((x) => REL[x])
    };
  };
  const applyCfg = () => {
    const c = cfg();
    const root = document.documentElement;
    Object.entries(c.labels).forEach(([id, t]) => {
      const l = document.querySelector('label[for="'.concat(id, '"]'));
      if (l) l.textContent = t;
    });
    Object.entries(c.abas).forEach(([k, t]) => {
      const b = document.querySelector('.tab[data-tab="'.concat(k, '"]'));
      if (b) b.textContent = t;
    });
    if (/^#[0-9a-f]{6}$/i.test(c.cor)) root.style.setProperty("--gold", c.cor);
    if (/^#[0-9a-f]{6}$/i.test(c.corCab)) root.style.setProperty("--navy", c.corCab);
    document.body.dataset.fonte = c.fonte;
    root.style.setProperty("--fs", c.tamanho === "grande" ? "19px" : "17px");
    const grid = $("#f-lanc .grid");
    c.ordemCampos.forEach((id) => {
      var _a;
      const f = (_a = document.getElementById(id)) == null ? void 0 : _a.closest(".field");
      if (f) grid.appendChild(f);
    });
  };
  let adminOn = false;
  const can = (area, lvl = "edit") => window.CongAuth ? window.CongAuth.can(area, lvl) : true;
  const isAdm = () => window.CongAuth ? window.CongAuth.isAdmin() : adminOn;
  const blank = () => ({ v: 1, perfil: { congregacao: "", responsavel: "", telefone: "", lider: "" }, meses: { [ymNow()]: { saldo: 0, notas: "" } }, lanc: [], cur: ymNow(), envios: [], ultBackup: "" });
  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const d = JSON.parse(raw);
      if (!d || d.v !== 1 || typeof d.meses !== "object" || !Array.isArray(d.lanc)) throw new Error("formato");
      d.perfil = d.perfil || blank().perfil;
      d.envios = Array.isArray(d.envios) ? d.envios : [];
      if (!d.meses[d.cur]) d.cur = Object.keys(d.meses).sort().pop() || ymNow();
      if (!d.meses[d.cur]) d.meses[d.cur] = { saldo: 0, notas: "" };
      return d;
    } catch (e) {
      console.error("Dados ilegíveis:", e);
      toast("Não foi possível ler os dados guardados. Restaure uma cópia de segurança.");
      return blank();
    }
  };
  let S = load();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
      return true;
    } catch (e) {
      toast("Sem espaço para guardar! Faça uma cópia de segurança e apague meses antigos.");
      return false;
    }
  };
  const ofMonth = (ym) => S.lanc.filter((l) => l.mes === ym);
  const calc = (ym) => {
    var _a;
    const L = ofMonth(ym);
    const saldo = Number((_a = S.meses[ym]) == null ? void 0 : _a.saldo) || 0;
    const by = { Entrada: {}, Despesa: {} };
    L.forEach((l) => {
      by[l.tipo][l.categoria] = (by[l.tipo][l.categoria] || 0) + Number(l.valor);
    });
    const ent = L.filter((l) => l.tipo === "Entrada").reduce((t, l) => t + Number(l.valor), 0);
    const des = L.filter((l) => l.tipo === "Despesa").reduce((t, l) => t + Number(l.valor), 0);
    return { saldo, entradas: ent, despesas: des, transitar: saldo + ent - des, by, n: L.length };
  };
  let tab = "lanc";
  let editId = null;
  const setTab = (t) => {
    tab = t;
    document.querySelectorAll(".tab").forEach((b) => {
      if (b.dataset.tab === t) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    document.querySelectorAll(".panel").forEach((p) => {
      p.hidden = p.id !== "tab-".concat(t);
    });
    render();
  };
  const render = () => {
    var _a;
    const ym = S.cur;
    const c = calc(ym);
    const cong = S.perfil.congregacao || "Congregação (configure em Definições)";
    $("#cong-name").textContent = cong;
    document.title = "Finanças — ".concat(cong);
    $("#mes").innerHTML = Object.keys(S.meses).sort().reverse().map((m) => '<option value="'.concat(esc(m), '"').concat(m === ym ? " selected" : "", ">").concat(esc(mesLbl(m)), "</option>")).join("");
    const k = (v, l, cls = "") => '<div class="kpi '.concat(cls, '"><b>').concat(esc(v), "</b><span>").concat(esc(l), "</span></div>");
    $("#kpis").innerHTML = k("".concat(kz(c.saldo), " Kz"), "Saldo anterior") + k("".concat(kz(c.entradas), " Kz"), "Entradas") + k("".concat(kz(c.despesas), " Kz"), "Despesas") + k("".concat(kz(c.transitar), " Kz"), "Saldo a transitar", c.transitar < 0 ? "neg" : "");
    const tipo = $("#l-tipo").value || "Entrada";
    const known = [.../* @__PURE__ */ new Set([...cfg().cats[tipo] || [], ...S.lanc.filter((l) => l.tipo === tipo).map((l) => l.categoria)])];
    $("#dl-cat").innerHTML = known.map((x) => '<option value="'.concat(esc(x), '">')).join("");
    const q = clean($("#q").value, 60).toLowerCase();
    const L = ofMonth(ym).filter((l) => !q || "".concat(l.categoria, " ").concat(l.subcategoria, " ").concat(l.descricao, " ").concat(l.obs).toLowerCase().includes(q)).sort((a, b) => b.data.localeCompare(a.data));
    $("#lista").innerHTML = L.map((l) => '<li><div class="l-main"><b>'.concat(esc(l.descricao), "</b><small>").concat(esc(fmtData(l.data)), " · ").concat(esc(l.tipo), " · ").concat(esc(l.categoria)).concat(l.subcategoria ? " › ".concat(esc(l.subcategoria)) : "", '</small></div>\n      <div class="l-val ').concat(l.tipo === "Entrada" ? "in" : "out", '">').concat(l.tipo === "Entrada" ? "+" : "−", " ").concat(kz(l.valor), '</div>\n      <div class="l-acts"><button type="button" class="btn small" data-edit="').concat(esc(l.id), '" aria-label="Editar ').concat(esc(l.descricao), '">Editar</button><button type="button" class="btn small danger" data-del="').concat(esc(l.id), '" aria-label="Eliminar ').concat(esc(l.descricao), '">Eliminar</button></div></li>')).join("") || '<li class="vazio">Ainda não há lançamentos neste mês.</li>';
    $("#m-saldo").value = numTxt((_a = S.meses[ym].saldo) != null ? _a : 0);
    $("#m-notas").value = S.meses[ym].notas || "";
    $("#m-auto").textContent = "Usar saldo de ".concat(mesLbl(prevYm(ym)));
    $("#sheet").innerHTML = sheet(ym, c);
    $("#envios").innerHTML = S.envios.slice(-8).reverse().map((x) => "<li>".concat(esc(new Date(x.ts).toLocaleString("pt-PT")), " · ").concat(esc(x.formato.toUpperCase()), " · ").concat(esc(x.meses.map(mesLbl).join(", ")), "</li>")).join("") || '<li class="vazio">Ainda não enviou nenhum ficheiro.</li>';
    $("#p-cong").value = S.perfil.congregacao;
    $("#p-resp").value = S.perfil.responsavel;
    $("#p-tel").value = S.perfil.telefone;
    $("#p-lider").value = S.perfil.lider || "";
    $("#adv-lock").hidden = !adminOn;
    $("#dl-cong").innerHTML = (S.congs || CONGS).map((x) => '<option value="'.concat(esc(x), '">')).join("");
    $("#ult-backup").textContent = S.ultBackup ? "Última cópia: ".concat(new Date(S.ultBackup).toLocaleString("pt-PT")) : "Ainda não fez nenhuma cópia de segurança.";
    if (!$("#novo-mes").value) {
      const [y, m] = Object.keys(S.meses).sort().pop().split("-").map(Number);
      const d = new Date(y, m, 1);
      $("#novo-mes").value = "".concat(d.getFullYear(), "-").concat(String(d.getMonth() + 1).padStart(2, "0"));
    }
  };
  const STRUCT0 = [
    ["Entrada", "Dízimos", "sub", ""],
    ["Entrada", "Ofertas", "sub", ""],
    ["Entrada", "Missões", "sub", ""],
    ["Entrada", "Beneficência", "sub", ""],
    ["Entrada", "Outras entradas", "sub", ""],
    ["Despesa", "50% para o Centro", "sub", ""],
    ["Despesa", "Missões (envio ao Centro)", "sub", ""],
    ["Despesa", "Apoio social", "sub", ""],
    ["Despesa", "Manutenção", "seccao", "MANUTENÇÃO DO TEMPLO"],
    ["Despesa", "Alimentação", "seccao", "ALIMENTAÇÃO"],
    ["Despesa", "Serviços de telecomunicação", "seccao", "SERVIÇOS DE TELECOMUNICAÇÃO"],
    ["Despesa", "Transporte", "seccao", "TRANSPORTE"],
    ["Despesa", "Outras despesas", "sub", ""]
  ];
  const LB0 = { saldo: "Valor em caixa disponível (saldo anterior)", ent: "ENTRADA DO MÊS", parcial: "Total parcial", totEnt: "Total de entradas do mês", entSaldo: "Total de entradas mais saldo anterior", des: "DESPESAS", sub: "Subtotal", totDes: "Total de despesas", final: "Saldo a transitar" };
  const relCfg = () => {
    const r = S.rel || {};
    const st = (r.struct || STRUCT0.map(([tipo, categoria, modo, titulo]) => ({ tipo, categoria, modo, titulo, mostrar: true }))).map((x) => ({ ...x }));
    S.lanc.forEach((l) => {
      if (!st.some((x) => x.tipo === l.tipo && x.categoria === l.categoria)) st.push({ tipo: l.tipo, categoria: l.categoria, modo: l.tipo === "Entrada" ? "sub" : "seccao", titulo: l.tipo === "Entrada" ? "" : String(l.categoria).toUpperCase(), mostrar: true });
    });
    return { struct: st, lb: { ...LB0, ...r.lb || {} } };
  };
  const bloco = (ym, tipo) => {
    const { struct } = relCfg();
    const L = ofMonth(ym);
    const main = [];
    const secs = [];
    struct.filter((x) => x.tipo === tipo && x.mostrar !== false).forEach((x) => {
      const rows = L.filter((l) => l.tipo === tipo && l.categoria === x.categoria);
      if (!rows.length) return;
      if (x.modo === "seccao") secs.push({ titulo: x.titulo || x.categoria.toUpperCase(), linhas: rows.map((l) => [l.descricao, Number(l.valor)]), total: rows.reduce((t, l) => t + Number(l.valor), 0) });
      else {
        const by = {};
        rows.forEach((l) => {
          const k = l.subcategoria || l.categoria;
          by[k] = (by[k] || 0) + Number(l.valor);
        });
        Object.entries(by).forEach(([k, v]) => main.push([k, v]));
      }
    });
    return { main, secs, mainTotal: main.reduce((t, x) => t + x[1], 0) };
  };
  const assinaturas = () => {
    const c = cfg();
    return [{ cargo: c.assin[0].cargo, nome: c.assin[0].nome || S.perfil.responsavel }, { cargo: c.assin[1].cargo, nome: c.assin[1].nome || S.perfil.lider }];
  };
  const sheet = (ym, c) => {
    const K = cfg();
    const { lb } = relCfg();
    const E1 = bloco(ym, "Entrada");
    const D1 = bloco(ym, "Despesa");
    const row = (t, v, cls = "") => '<tr class="'.concat(cls, '"><th scope="row">').concat(esc(t), "</th><td>").concat(kz(v), "</td></tr>");
    const head = (t) => '<tr class="sec"><th colspan="2" scope="colgroup">'.concat(esc(t), "</th></tr>");
    const secRows = (x) => head(x.titulo) + x.linhas.map(([t, v]) => row(t, v)).join("") + row(lb.sub, x.total, "tot");
    const rows = row(lb.saldo, c.saldo, "big") + head(lb.ent) + E1.main.map(([t, v]) => row(t, v)).join("") + row(lb.parcial, E1.mainTotal, "tot") + E1.secs.map(secRows).join("") + row(lb.totEnt, c.entradas, "big") + row(lb.entSaldo, c.entradas + c.saldo, "big") + head(lb.des) + D1.main.map(([t, v]) => row(t, v)).join("") + row(lb.sub, D1.mainTotal, "tot") + D1.secs.map(secRows).join("") + row(lb.totDes, c.despesas, "big neg") + row(lb.final, c.transitar, "big ".concat(c.transitar < 0 ? "neg" : "pos"));
    return '<div class="s-head"><img src="'.concat(esc($(".logo").getAttribute("src")), '" alt="Logótipo da ADP"><div><p class="s-l1">').concat(esc(K.cab.l1), "</p><p>").concat(esc(K.cab.l2), "</p><p><b>").concat(esc(S.perfil.congregacao || "Congregação"), "</b> — ").concat(esc(K.titulos.rel.replace("{MES}", mesLbl(ym))), '</p></div></div>\n      <table><caption class="sr-only">Relatório de ').concat(esc(mesLbl(ym)), '</caption><colgroup><col><col class="c-v"></colgroup><tbody>').concat(rows, "</tbody></table>").concat(S.meses[ym].notas ? '<p class="s-obs"><b>Observações:</b> '.concat(esc(S.meses[ym].notas), "</p>") : "", '\n      <div class="s-assin">').concat(assinaturas().map((a) => "<div><p>".concat(esc(a.cargo), "</p><span></span><p>").concat(esc(a.nome || ""), "</p></div>")).join(""), "</div>");
  };
  const relAdv = () => {
    if (!isAdm()) {
      toast("Só o administrador pode alterar a folha.");
      return;
    }
    const R0 = relCfg();
    let st = R0.struct;
    const lb = { ...R0.lb };
    const d = document.createElement("dialog");
    d.className = "wide";
    d.setAttribute("aria-label", "Avançado — folha do relatório");
    const draw = () => '<h2>Avançado — folha do relatório</h2><details open><summary>Rótulos das linhas</summary><div class="grid">'.concat(Object.keys(LB0).map((k) => '<div class="field"><label for="rl-'.concat(k, '">').concat(esc(LB0[k]), '</label><input id="rl-').concat(k, '" data-lb="').concat(k, '" maxlength="80" value="').concat(esc(lb[k]), '"></div>')).join(""), '</div></details>\n      <details open><summary>Categorias: posição, título e forma</summary><ol class="pos">').concat(st.map((x, i) => '<li data-i="'.concat(i, '"><div class="grid"><p><b>').concat(esc(x.tipo), "</b> · ").concat(esc(x.categoria), '</p><div class="field"><label for="rs-m').concat(i, '">Forma</label><select id="rs-m').concat(i, '" data-f="modo"><option value="sub"').concat(x.modo !== "seccao" ? " selected" : "", '>Linha no bloco principal</option><option value="seccao"').concat(x.modo === "seccao" ? " selected" : "", '>Secção com subtotal</option></select></div>\n        <div class="field"><label for="rs-t').concat(i, '">Título da secção</label><input id="rs-t').concat(i, '" data-f="titulo" maxlength="60" value="').concat(esc(x.titulo || ""), '"></div><label class="check"><input type="checkbox" data-f="mostrar"').concat(x.mostrar !== false ? " checked" : "", '> Mostrar</label></div>\n        <span><button type="button" class="btn small" data-mv="-1"').concat(i ? "" : " disabled", ' aria-label="Subir ').concat(esc(x.categoria), '">↑</button><button type="button" class="btn small" data-mv="1"').concat(i < st.length - 1 ? "" : " disabled", ' aria-label="Descer ').concat(esc(x.categoria), '">↓</button></span></li>')).join(""), '</ol></details>\n      <p class="err" role="alert"></p><div class="actions"><button type="button" class="btn danger" data-r>Repor original</button><button type="button" class="btn" data-c>Cancelar</button><button type="button" class="btn primary" data-o>Guardar</button></div>');
    const read = () => {
      d.querySelectorAll("[data-lb]").forEach((i) => {
        lb[i.dataset.lb] = clean(i.value, 80) || LB0[i.dataset.lb];
      });
      d.querySelectorAll("li[data-i]").forEach((li) => {
        const x = st[+li.dataset.i];
        x.modo = li.querySelector('[data-f="modo"]').value;
        x.titulo = clean(li.querySelector('[data-f="titulo"]').value, 60);
        x.mostrar = li.querySelector('[data-f="mostrar"]').checked;
      });
    };
    d.innerHTML = '<div class="dlg-box">'.concat(draw(), "</div>");
    document.body.appendChild(d);
    d.addEventListener("close", () => d.remove());
    d.addEventListener("click", (e) => {
      const mv = e.target.closest("[data-mv]");
      if (mv) {
        read();
        const i = +mv.closest("li").dataset.i, j = i + +mv.dataset.mv;
        [st[i], st[j]] = [st[j], st[i]];
        d.firstElementChild.innerHTML = draw();
        return;
      }
      if (e.target.closest("[data-c]")) d.close();
      else if (e.target.closest("[data-r]")) {
        S.rel = {};
        save();
        render();
        d.close();
        toast("Folha reposta.");
      } else if (e.target.closest("[data-o]")) {
        read();
        S.rel = { struct: st, lb };
        if (save()) {
          render();
          d.close();
          toast("Folha actualizada.");
        }
      }
    });
    d.showModal();
  };
  const imprimir = (padrao = "rel") => {
    const d = document.createElement("dialog");
    d.setAttribute("aria-label", "Imprimir");
    const ops = [["rel", "Relatório de ".concat(mesLbl(S.cur))], ["lanc", "Lista de lançamentos de ".concat(mesLbl(S.cur))], ["sec", "Informação da Secretaria (documento aberto)"]].filter(([k]) => k === "sec" ? can("sec", "read") : can("fin", "read"));
    d.innerHTML = '<form method="dialog" class="dlg-box" novalidate><h2>Imprimir</h2><fieldset class="fs"><legend>Folhas a imprimir</legend>'.concat(ops.map(([k, l]) => '<label class="check"><input type="checkbox" name="f" value="'.concat(k, '"').concat(k === padrao ? " checked" : "", "> ").concat(esc(l), "</label>")).join(""), '</fieldset>\n      <label class="check" id="pr-vz-l"><input type="checkbox" id="pr-vz" checked> Secretaria: ocultar as secções em branco (mantém a ordem dos assuntos)</label>\n      <div class="field"><label for="pr-p">Papel</label><select id="pr-p"><option value="A4 portrait">A4 retrato (padrão)</option><option value="A4 landscape">A4 paisagem</option><option value="A5 portrait">A5</option><option value="letter portrait">Carta</option></select></div>\n      <p class="err" role="alert"></p><div class="actions"><button value="cancel" class="btn">Cancelar</button><button type="button" class="btn primary" data-ok>Imprimir</button></div></form>');
    document.body.appendChild(d);
    d.addEventListener("close", () => d.remove());
    const vzSync = () => { const on = !!d.querySelector('[name="f"][value="sec"]:checked'); const lb = d.querySelector("#pr-vz-l"); const ver = on && !!(window.CongSec && window.CongSec.vazias()); lb.hidden = !ver; lb.style.display = ver ? "" : "none"; };
    d.addEventListener("change", vzSync); vzSync();
    d.querySelector("[data-ok]").addEventListener("click", () => {
      const sel = [...d.querySelectorAll('[name="f"]:checked')].map((i) => i.value);
      if (!sel.length) {
        d.querySelector(".err").textContent = "Escolha pelo menos uma folha.";
        return;
      }
      const area = $("#print-area");
      const c = calc(S.cur);
      const lst = ofMonth(S.cur).sort((x, y) => x.data.localeCompare(y.data));
      const pages = {
        rel: '<article class="sheet p-sheet">'.concat(sheet(S.cur, c), "</article>"),
        sec: '<article class="sheet p-sheet sec-folha">'.concat(window.CongSec ? window.CongSec.folha(d.querySelector("#pr-vz").checked) : $("#sec-folha").innerHTML, "</article>"),
        lanc: '<article class="sheet p-sheet"><h2>Lançamentos de '.concat(esc(mesLbl(S.cur)), " — ").concat(esc(S.perfil.congregacao), '</h2><table class="p-list"><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor (Kz)</th></tr></thead><tbody>').concat(lst.map((l) => "<tr><td>".concat(esc(fmtData(l.data)), "</td><td>").concat(esc(l.tipo), "</td><td>").concat(esc(l.categoria), "</td><td>").concat(esc(l.descricao), "</td><td>").concat(kz(l.valor), "</td></tr>")).join(""), "</tbody></table></article>")
      };
      area.innerHTML = sel.map((k) => pages[k]).join("");
      let st = document.getElementById("page-style");
      if (!st) {
        st = document.createElement("style");
        st.id = "page-style";
        document.head.appendChild(st);
      }
      st.textContent = "@page { size: ".concat(d.querySelector("#pr-p").value, "; margin: 14mm; }");
      d.close();
      document.body.classList.add("printing");
      const done = () => {
        document.body.classList.remove("printing");
        area.innerHTML = "";
        document.removeEventListener("touchstart", done);
        document.removeEventListener("mousedown", done);
      };
      const t0 = Date.now();
      window.print();
      if (Date.now() - t0 > 400) done();
      else setTimeout(() => {
        document.addEventListener("touchstart", done, { passive: true });
        document.addEventListener("mousedown", done);
      }, 1500);
    });
    d.showModal();
  };
  const form = $("#f-lanc");
  const bad = (el, msg) => {
    form.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
    el.setAttribute("aria-invalid", "true");
    el.focus();
    $("#l-err").textContent = msg;
  };
  const resetForm = () => {
    form.reset();
    editId = null;
    $("#f-title").textContent = "Novo lançamento";
    $("#l-cancel").hidden = true;
    $("#l-err").textContent = "";
    form.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
    $("#l-data").value = S.cur === ymNow() ? today() : "".concat(S.cur, "-01");
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      if (!S.perfil.congregacao) {
        toast("Configure primeiro a congregação em Definições.");
        setTab("def");
        return;
      }
      if (!can("fin")) {
        toast("Não tem permissão para registar lançamentos.");
        return;
      }
      const f = form.elements;
      const data = f.data.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return bad(f.data, "Indique a data.");
      if (data.slice(0, 7) !== S.cur) return bad(f.data, "A data deve ser de ".concat(mesLbl(S.cur), " (mude o mês no topo)."));
      const tipo = f.tipo.value === "Despesa" ? "Despesa" : "Entrada";
      const categoria = clean(f.categoria.value, 80);
      const descricao = clean(f.descricao.value, 160);
      if (categoria.length < 2) return bad(f.categoria, "Indique a categoria (ex.: Dízimos, Ofertas, Manutenção).");
      if (descricao.length < 2) return bad(f.descricao, "Indique a descrição.");
      const valor = num(f.valor.value);
      if (valor === null) return bad(f.valor, "Indique o valor.");
      if (Number.isNaN(valor)) return bad(f.valor, "Valor inválido: escreva por exemplo 150.000 ou 1500,50 (no máximo 2 casas decimais).");
      if (!(valor > 0)) return bad(f.valor, "O valor tem de ser maior que zero.");
      const rec = { data, tipo, categoria, subcategoria: clean(f.subcategoria.value, 80), descricao, valor: Math.round(valor * 100) / 100, obs: clean(f.obs.value, 200) };
      if (editId) Object.assign(S.lanc.find((l) => l.id === editId) || {}, rec);
      else S.lanc.push({ id: uid(), mes: S.cur, criado: (/* @__PURE__ */ new Date()).toISOString(), ...rec });
      if (save()) {
        toast(editId ? "Lançamento corrigido." : "Lançamento guardado.");
        resetForm();
        render();
      }
    } catch (err) {
      $("#l-err").textContent = "Erro: ".concat(err.message);
    }
  });
  $("#l-cancel").addEventListener("click", resetForm);
  $("#l-tipo").addEventListener("change", render);
  $("#q").addEventListener("input", render);
  $("#lista").addEventListener("click", async (e) => {
    const ed = e.target.closest("[data-edit]");
    const dl = e.target.closest("[data-del]");
    if (ed) {
      const l = S.lanc.find((x) => x.id === ed.dataset.edit);
      if (!l) return;
      editId = l.id;
      const f = form.elements;
      ["data", "tipo", "categoria", "subcategoria", "descricao", "valor", "obs"].forEach((k) => {
        var _a;
        f[k].value = k === "valor" ? numTxt(l.valor) : (_a = l[k]) != null ? _a : "";
      });
      $("#f-title").textContent = "Corrigir lançamento";
      $("#l-cancel").hidden = false;
      f.descricao.focus();
      form.scrollIntoView({ behavior: "smooth" });
    }
    if ((ed || dl) && !can("fin")) {
      toast("Não tem permissão para alterar lançamentos.");
      return;
    }
    if (dl) {
      const l = S.lanc.find((x) => x.id === dl.dataset.del);
      if (!l) return;
      if (await confirmar("Eliminar lançamento", "Eliminar «".concat(l.descricao, "» (").concat(kz(l.valor), " Kz)? Não é possível desfazer."), "Eliminar")) {
        S.lanc.splice(S.lanc.indexOf(l), 1);
        save();
        render();
        toast("Lançamento eliminado.");
      }
    }
  });
  $("#mes").addEventListener("change", (e) => {
    S.cur = e.target.value;
    save();
    resetForm();
    render();
  });
  $("#m-save").addEventListener("click", () => {
    const s0 = num($("#m-saldo").value);
    const s = s0 === null ? 0 : s0;
    if (Number.isNaN(s)) {
      $("#m-err").textContent = "Saldo inválido: escreva por exemplo 250.000 ou 1500,50 (no máximo 2 casas decimais).";
      $("#m-saldo").focus();
      return;
    }
    S.meses[S.cur].saldo = Math.round(s * 100) / 100;
    S.meses[S.cur].notas = clean($("#m-notas").value, 600);
    $("#m-err").textContent = "";
    if (save()) {
      render();
      toast("Mês actualizado.");
    }
  });
  $("#m-auto").addEventListener("click", () => {
    const p = prevYm(S.cur);
    if (!S.meses[p]) {
      toast("Não existe o mês ".concat(mesLbl(p), "."));
      return;
    }
    S.meses[S.cur].saldo = Math.round(calc(p).transitar * 100) / 100;
    save();
    render();
  });
  $("#criar-mes").addEventListener("click", () => {
    const v = $("#novo-mes").value;
    if (!/^\d{4}-\d{2}$/.test(v)) {
      toast("Escolha o mês.");
      return;
    }
    if (S.meses[v]) {
      toast("Esse mês já existe.");
      return;
    }
    const p = prevYm(v);
    S.meses[v] = { saldo: S.meses[p] ? Math.round(calc(p).transitar * 100) / 100 : 0, notas: "" };
    S.cur = v;
    $("#novo-mes").value = "";
    save();
    resetForm();
    setTab("lanc");
    toast("".concat(mesLbl(v), " criado."));
  });
  $("#f-perfil").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const cong = clean(f.congregacao.value, 80);
    const resp = clean(f.responsavel.value, 80);
    const tel = clean(f.telefone.value, 30);
    const lider = clean(f.lider.value, 80);
    if (cong.length < 3) {
      $("#p-err").textContent = "Indique o nome da congregação.";
      f.congregacao.focus();
      return;
    }
    if (resp.length < 3) {
      $("#p-err").textContent = "Indique o nome do responsável.";
      f.responsavel.focus();
      return;
    }
    if (tel && !/^[+()\d\s-]{6,30}$/.test(tel)) {
      $("#p-err").textContent = "Telefone inválido.";
      f.telefone.focus();
      return;
    }
    if (lider.length < 3) {
      $("#p-err").textContent = "Indique o nome do líder da congregação.";
      f.lider.focus();
      return;
    }
    S.perfil = { congregacao: cong, responsavel: resp, telefone: tel, lider };
    $("#p-err").textContent = "";
    if (save()) {
      render();
      toast("Identificação guardada.");
      setTab("lanc");
    }
  });
  const mesesExp = () => $("#exp-todos").checked ? Object.keys(S.meses).sort() : [S.cur];
  const pacote = (meses) => {
    const M = meses.map((m) => {
      const c = calc(m);
      const L = ofMonth(m).map(({ id, data, tipo, categoria, subcategoria, descricao, valor, obs }) => ({ id, data, tipo, categoria, subcategoria, descricao, valor, obs }));
      return { mes: m, saldo: c.saldo, notas: S.meses[m].notas || "", totais: { entradas: Math.round(c.entradas * 100) / 100, despesas: Math.round(c.despesas * 100) / 100, saldoTransitar: Math.round(c.transitar * 100) / 100 }, lancamentos: L };
    });
    const corpo = JSON.stringify(M);
    const gerado = (/* @__PURE__ */ new Date()).toISOString();
    return {
      formato: "mm-congregacao",
      versao: 1,
      gerado,
      app: "Finanças da Congregação 1.0",
      congregacao: S.perfil.congregacao,
      responsavel: S.perfil.responsavel,
      telefone: S.perfil.telefone,
      lider: S.perfil.lider || "",
      pacoteId: "".concat(slug(S.perfil.congregacao), "-").concat(meses.join("_"), "-").concat(hash(corpo + gerado)),
      controlo: { lancamentos: M.reduce((t, m) => t + m.lancamentos.length, 0), assinatura: hash(corpo) },
      meses: M
    };
  };
  const nome = (ext, meses) => "MonteMoria_".concat(slug(S.perfil.congregacao), "_").concat(meses.length > 1 ? "todos" : meses[0], "_").concat(today(), ".").concat(ext);
  const podeDescarregar = "download" in document.createElement("a");
  const tamanho = (b) => b >= 1048576 ? "".concat((b / 1048576).toLocaleString("pt-PT", { maximumFractionDigits: 1 }), " MB") : "".concat(Math.max(1, Math.round(b / 1024)), " KB");
  const ficheiro = (blob, fname) => {
    try {
      return new File([blob], fname, { type: blob.type || "application/octet-stream" });
    } catch (_) {
      return null;
    }
  };
  const partilhaFicheiros = (file) => {
    try {
      return !!(file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
    } catch (_) {
      return false;
    }
  };
  const dadosPartilha = (file, fname, texto) => window.Compat && window.Compat.ios ? { files: [file] } : { files: [file], title: fname, text: texto };
  const descarregar = (blob, fname) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 6e4);
  };
  const copiarTexto = (t) => {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.className = "copia-oculta";
    document.body.appendChild(ta);
    try {
      if (window.Compat && window.Compat.ios) {
        ta.contentEditable = "true";
        const r = document.createRange();
        r.selectNodeContents(ta);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        ta.setSelectionRange(0, t.length);
      } else ta.select();
      return document.execCommand("copy");
    } catch (_) {
      return false;
    } finally {
      ta.remove();
    }
  };
  const prontoDlg = async (blob, fname, texto, file) => {
    const share = partilhaFicheiros(file);
    const textual = /json|csv|text/.test(blob.type);
    const conteudo = !podeDescarregar && textual ? await blob.text().catch(() => "") : "";
    return new Promise((res) => {
      const bts = [["c", "Cancelar", "btn"]];
      if (podeDescarregar) bts.push(["d", "Guardar", "btn"]);
      else {
        bts.push(["a", "Abrir", "btn"]);
        if (conteudo) bts.push(["t", "Copiar texto", "btn"]);
      }
      if (share) bts.push(["s", "Partilhar", "btn primary"]);
      const d = document.createElement("dialog");
      d.setAttribute("aria-labelledby", "pr-t");
      d.innerHTML = '<div class="dlg-box"><h2 id="pr-t">Ficheiro pronto</h2><p><b>'.concat(esc(fname), "</b> · ").concat(esc(tamanho(blob.size)), '</p><p class="hint">').concat(share ? "«Partilhar» abre o WhatsApp, o e-mail, o Drive ou «Guardar em Ficheiros». " : "").concat(podeDescarregar ? "«Guardar» coloca o ficheiro em Transferências." : "Este aparelho não guarda ficheiros directamente: «Abrir» mostra o ficheiro (depois use Partilhar › Guardar em Ficheiros)".concat(conteudo ? " ou copie o texto e cole-o numa mensagem" : "", "."), '</p>\n        <p class="err" role="alert"></p><div class="actions">').concat(bts.map(([k, l, c]) => '<button type="button" class="'.concat(c, '" data-pr="').concat(k, '">').concat(l, "</button>")).join(""), "</div></div>");
      document.body.appendChild(d);
      let feito = false;
      const fim = (r) => {
        if (!feito) {
          feito = true;
          res(r);
        }
      };
      const erro = (m) => {
        d.querySelector(".err").textContent = m;
      };
      d.addEventListener("close", () => {
        d.remove();
        fim("cancelado");
      });
      d.addEventListener("click", (e) => {
        const b = e.target.closest("[data-pr]");
        if (!b) return;
        const k = b.dataset.pr;
        if (k === "c") {
          fim("cancelado");
          d.close();
        } else if (k === "d") {
          descarregar(blob, fname);
          fim("descarregado");
          d.close();
        } else if (k === "s") navigator.share(dadosPartilha(file, fname, texto)).then(() => {
          fim("partilhado");
          d.close();
        }).catch((e2) => {
          if (!e2 || e2.name !== "AbortError") erro("Não foi possível partilhar: ".concat(e2 ? e2.message : "erro"));
        });
        else if (k === "a") {
          const w = window.open(URL.createObjectURL(blob), "_blank");
          if (!w) {
            erro("O navegador bloqueou a abertura do ficheiro.");
            return;
          }
          fim("descarregado");
          d.close();
        } else if (k === "t") {
          if (copiarTexto(conteudo)) {
            toast("Texto copiado: cole-o numa mensagem ou nota.");
            fim("descarregado");
            d.close();
          } else erro("Não foi possível copiar o texto.");
        }
      });
      d.showModal();
    });
  };
  const partilhar = async (blob, fname, texto = "") => {
    const file = ficheiro(blob, fname);
    if (partilhaFicheiros(file)) {
      try {
        await navigator.share(dadosPartilha(file, fname, texto));
        return "partilhado";
      } catch (e) {
        if (e && e.name === "AbortError") return "cancelado";
        console.warn("Partilha directa indisponível:", e);
        return prontoDlg(blob, fname, texto, file);
      }
    }
    if (podeDescarregar) {
      descarregar(blob, fname);
      return "descarregado";
    }
    return prontoDlg(blob, fname, texto, null);
  };
  const linhas = (meses) => meses.flatMap((m) => ofMonth(m).map((l) => [S.perfil.congregacao, m, l.data, l.tipo, l.categoria, l.subcategoria, l.descricao, l.valor, l.obs, l.id]));
  const CAB = ["Congregação", "Mês", "Data", "Tipo", "Categoria", "Subcategoria", "Descrição", "Valor (Kz)", "Observação", "ID"];
  const exportar = async (fmt) => {
    try {
      if (!S.perfil.congregacao) {
        toast("Configure primeiro a congregação em Definições.");
        setTab("def");
        return;
      }
      const meses = mesesExp();
      if (!meses.some((m) => ofMonth(m).length)) {
        toast("Não há lançamentos para enviar.");
        return;
      }
      let blob;
      let fname;
      const txt = "Finanças ".concat(S.perfil.congregacao, " — ").concat(meses.map(mesLbl).join(", "));
      if (fmt === "json") {
        blob = new Blob([JSON.stringify(pacote(meses), null, 1)], { type: "application/json" });
        fname = nome("json", meses);
      } else if (fmt === "xlsx") {
        if (typeof XLSX === "undefined") throw new Error("biblioteca Excel indisponível");
        const p = pacote(meses);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["formato", "mm-congregacao"], ["versao", 1], ["congregacao", p.congregacao], ["responsavel", p.responsavel], ["telefone", p.telefone], ["gerado", p.gerado], ["pacoteId", p.pacoteId], ["assinatura", p.controlo.assinatura]]), "Dados");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Mês", "Saldo anterior", "Entradas", "Despesas", "Saldo a transitar", "Observações"], ...p.meses.map((m) => [m.mes, m.saldo, m.totais.entradas, m.totais.despesas, m.totais.saldoTransitar, m.notas])]), "Resumo");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([CAB, ...linhas(meses)]), "Lançamentos");
        blob = new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        fname = nome("xlsx", meses);
      } else if (fmt === "csv") {
        const cel = (v) => {
          const s = String(v != null ? v : "");
          return /[";\n]/.test(s) ? '"'.concat(s.replace(/"/g, '""'), '"') : s;
        };
        blob = new Blob(["\uFEFF".concat([CAB, ...linhas(meses)].map((r2) => r2.map(cel).join(";")).join("\r\n"))], { type: "text/csv;charset=utf-8" });
        fname = nome("csv", meses);
      } else {
        const t = meses.map((m) => {
          const c = calc(m);
          return "*".concat(S.perfil.congregacao, " — ").concat(mesLbl(m), "*\nSaldo anterior: ").concat(kz(c.saldo), " Kz\nEntradas: ").concat(kz(c.entradas), " Kz\nDespesas: ").concat(kz(c.despesas), " Kz\nSaldo a transitar: ").concat(kz(c.transitar), " Kz\nLançamentos: ").concat(c.n);
        }).join("\n\n") + "\n\nResponsável: ".concat(S.perfil.responsavel).concat(S.perfil.telefone ? " (".concat(S.perfil.telefone, ")") : "");
        try {
          if (navigator.share) await navigator.share({ title: txt, text: t });
          else {
            await navigator.clipboard.writeText(t);
            toast("Resumo copiado: cole no WhatsApp ou SMS.");
          }
        } catch (e) {
          if (e.name !== "AbortError") {
            try {
              await navigator.clipboard.writeText(t);
              toast("Resumo copiado.");
            } catch (_) {
              toast("Não foi possível partilhar o texto.");
            }
          }
        }
        S.envios.push({ ts: (/* @__PURE__ */ new Date()).toISOString(), formato: "texto", meses });
        save();
        render();
        return;
      }
      const r = await partilhar(blob, fname, txt);
      if (r === "cancelado" || r === "falhou") return;
      S.envios.push({ ts: (/* @__PURE__ */ new Date()).toISOString(), formato: fmt, meses });
      meses.forEach((m) => {
        S.meses[m].enviado = (/* @__PURE__ */ new Date()).toISOString();
      });
      save();
      render();
      toast(r === "partilhado" ? "Ficheiro partilhado." : "Ficheiro guardado em Transferências: ".concat(fname));
    } catch (e) {
      toast("Não foi possível exportar: ".concat(e.message));
    }
  };
  document.querySelectorAll("[data-exp]").forEach((b) => b.addEventListener("click", () => exportar(b.dataset.exp)));
  $("#backup").addEventListener("click", async () => {
    const blob = new Blob([JSON.stringify({ formato: "mm-congregacao-backup", versao: 1, gerado: (/* @__PURE__ */ new Date()).toISOString(), dados: S })], { type: "application/json" });
    const r = await partilhar(blob, "Copia_".concat(slug(S.perfil.congregacao), "_").concat(today(), ".json"), "Cópia de segurança");
    if (r === "cancelado" || r === "falhou") return;
    S.ultBackup = (/* @__PURE__ */ new Date()).toISOString();
    save();
    render();
    toast("Cópia de segurança feita. Guarde-a fora do telemóvel.");
  });
  $("#restore").addEventListener("click", () => $("#restore-file").click());
  $("#restore-file").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      if (f.size > 1e7) throw new Error("ficheiro demasiado grande");
      const d = JSON.parse(await f.text());
      if (d.formato !== "mm-congregacao-backup" || !d.dados || d.dados.v !== 1 || !Array.isArray(d.dados.lanc)) throw new Error("não é uma cópia de segurança desta aplicação");
      if (!await confirmar("Restaurar cópia", "Substituir os dados deste telemóvel pela cópia de ".concat(new Date(d.gerado).toLocaleString("pt-PT"), " (").concat(d.dados.lanc.length, " lançamentos)?"), "Restaurar")) return;
      d.dados.lanc = d.dados.lanc.filter((l) => l && l.id && /^\d{4}-\d{2}$/.test(l.mes) && ["Entrada", "Despesa"].includes(l.tipo) && Number(l.valor) > 0).map((l) => ({ ...l, categoria: clean(l.categoria, 80), subcategoria: clean(l.subcategoria, 80), descricao: clean(l.descricao, 160), obs: clean(l.obs, 200) }));
      S = { ...blank(), ...d.dados };
      if (!S.meses[S.cur]) S.cur = Object.keys(S.meses).sort().pop();
      save();
      render();
      toast("Cópia restaurada.");
    } catch (err) {
      toast("Restauro falhou: ".concat(err.message));
    }
  });
  $("#apagar").addEventListener("click", async () => {
    if (await confirmar("Apagar todos os dados", "Todos os lançamentos deste telemóvel serão apagados. Fez a cópia de segurança?", "Apagar tudo")) {
      localStorage.removeItem(KEY);
      S = blank();
      render();
      setTab("def");
      toast("Dados apagados.");
    }
  });
  const tema = (t) => {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem(THEME, t);
    } catch (_) {
    }
  };
  tema((() => {
    try {
      return localStorage.getItem(THEME) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch (_) {
      return "light";
    }
  })());
  $("#theme").addEventListener("click", () => tema(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $("#print").addEventListener("click", () => imprimir("rel"));
  $("#rel-adv").addEventListener("click", relAdv);
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch((e) => console.warn("Offline indisponível:", e));
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {
  });
  const adv = $("#adv");
  let draft = null;
  const pinForm = () => {
    const has = !!cfg().pin;
    $("#adv-t").textContent = has ? "Modo administrador" : "Definir PIN de administrador";
    $("#adv-body").innerHTML = '<p class="hint">'.concat(has ? "Introduza o PIN para abrir as opções avançadas." : "Crie um PIN de 4 a 8 algarismos. Guarde-o: protege a personalização e as categorias da Secretaria.", '</p><div class="field"><label for="adv-pin">PIN</label><input id="adv-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></div>').concat(has ? "" : '<div class="field"><label for="adv-pin2">Repetir o PIN</label><input id="adv-pin2" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></div>');
    $("#adv-save").textContent = has ? "Entrar" : "Definir PIN";
    $("#adv-reset").hidden = true;
  };
  const inp = (id, label, val, extra = "") => '<div class="field"><label for="'.concat(id, '">').concat(esc(label), '</label><input id="').concat(id, '" value="').concat(esc(val), '" maxlength="80"').concat(extra, "></div>");
  const posList = (key, list, names) => '<ol class="pos" data-pos="'.concat(key, '">').concat(list.map((k, i) => '<li data-k="'.concat(esc(k), '"><span>').concat(esc(names[k]), '</span><span><button type="button" class="btn small" data-mv="-1" aria-label="Subir ').concat(esc(names[k]), '"').concat(i ? "" : " disabled", '>↑</button><button type="button" class="btn small" data-mv="1" aria-label="Descer ').concat(esc(names[k]), '"').concat(i < list.length - 1 ? "" : " disabled", ">↓</button></span></li>")).join(""), "</ol>");
  const editor = () => {
    const c = draft;
    const lb = Object.fromEntries(Object.keys(c.labels).map((k) => [k, c.labels[k].replace(/\s*\*$/, "")]));
    $("#adv-t").textContent = "Opções avançadas";
    $("#adv-save").textContent = "Guardar";
    $("#adv-reset").hidden = false;
    $("#adv-body").innerHTML = '<details open><summary>Títulos dos separadores e dos campos</summary><div class="grid">'.concat(Object.entries(c.abas).map(([k, v]) => inp("ab-".concat(k), "Separador «".concat(k, "»"), v)).join("")).concat(Object.entries(c.labels).map(([k, v]) => inp("lb-".concat(k), "Campo ".concat(lb[k]), v)).join(""), '</div></details>\n      <details><summary>Cabeçalho e títulos do relatório</summary><div class="grid">').concat(inp("cb-l1", "Linha 1 do cabeçalho", c.cab.l1)).concat(inp("cb-l2", "Linha 2 do cabeçalho", c.cab.l2)).concat(inp("ti-ent", "Título das entradas", c.titulos.ent)).concat(inp("ti-des", "Título das despesas", c.titulos.des)).concat(inp("ti-rel", "Título do relatório ({MES} = mês)", c.titulos.rel), '</div></details>\n      <details><summary>Assinaturas (tesoureiro e líder)</summary><div class="grid">').concat(inp("as-c0", "Cargo 1", c.assin[0].cargo)).concat(inp("as-n0", "Nome 1 (vazio = responsável)", c.assin[0].nome)).concat(inp("as-c1", "Cargo 2", c.assin[1].cargo)).concat(inp("as-n1", "Nome 2 (vazio = líder)", c.assin[1].nome), '</div></details>\n      <details><summary>Cores e letra</summary><div class="grid"><div class="field"><label for="co-1">Cor de destaque</label><input id="co-1" type="color" value="').concat(esc(c.cor), '"></div><div class="field"><label for="co-2">Cor do cabeçalho</label><input id="co-2" type="color" value="').concat(esc(c.corCab), '"></div>\n        <div class="field"><label for="fo-1">Tipo de letra</label><select id="fo-1">').concat([["sistema", "Do sistema"], ["serif", "Com serifa"], ["mono", "Monoespaçada"]].map(([v, l]) => '<option value="'.concat(v, '"').concat(c.fonte === v ? " selected" : "", ">").concat(l, "</option>")).join(""), '</select></div>\n        <div class="field"><label for="fo-2">Tamanho da letra</label><select id="fo-2">').concat([["normal", "Normal"], ["grande", "Grande"]].map(([v, l]) => '<option value="'.concat(v, '"').concat(c.tamanho === v ? " selected" : "", ">").concat(l, "</option>")).join(""), '</select></div></div></details>\n      <details><summary>Posições</summary><p class="hint">Ordem dos campos do formulário (a folha do relatório ajusta-se em «Avançado» no separador Relatório)</p>').concat(posList("ordemCampos", c.ordemCampos, lb), '</details>\n      <details><summary>Categorias</summary><div class="field"><label for="ca-e">Entradas (uma por linha)</label><textarea id="ca-e" rows="5">').concat(esc(c.cats.Entrada.join("\n")), '</textarea></div><div class="field"><label for="ca-d">Despesas (uma por linha)</label><textarea id="ca-d" rows="6">').concat(esc(c.cats.Despesa.join("\n")), "</textarea></div></details>\n");
  };
  const readEditor = () => {
    const c = draft;
    const v = (id) => clean($("#".concat(id)).value, 80);
    Object.keys(c.abas).forEach((k) => {
      c.abas[k] = v("ab-".concat(k)) || CFG0().abas[k];
    });
    Object.keys(c.labels).forEach((k) => {
      c.labels[k] = v("lb-".concat(k)) || CFG0().labels[k];
    });
    c.cab = { l1: v("cb-l1"), l2: v("cb-l2") };
    c.titulos = { ent: v("ti-ent") || "ENTRADAS", des: v("ti-des") || "DESPESAS", rel: v("ti-rel") || "relatório de {MES}" };
    c.assin = [{ cargo: v("as-c0") || "O(A) Tesoureiro(a)", nome: v("as-n0") }, { cargo: v("as-c1") || "O Líder", nome: v("as-n1") }];
    c.cor = $("#co-1").value;
    c.corCab = $("#co-2").value;
    c.fonte = $("#fo-1").value;
    c.tamanho = $("#fo-2").value;
    ["ordemCampos"].forEach((k) => {
      c[k] = [...$('[data-pos="'.concat(k, '"]')).children].map((li) => li.dataset.k);
    });
    const lines = (id) => [...new Set($("#".concat(id)).value.split("\n").map((x) => clean(x, 60)).filter(Boolean))];
    c.cats = { Entrada: lines("ca-e"), Despesa: lines("ca-d") };
    return "";
  };
  const openAdv = (cb) => {
    if (!isAdm()) {
      toast("Só o administrador pode abrir as opções avançadas.");
      return;
    }
    adminOn = true;
    $("#adv-err").textContent = "";
    if (cb) {
      cb();
      return;
    }
    draft = cfg();
    editor();
    adv.showModal();
  };
  $("#adv-open").addEventListener("click", () => openAdv());
  $("#adv-lock").addEventListener("click", () => {
    adminOn = false;
    render();
    toast("Saiu do modo administrador.");
  });
  $("#adv-cancel").addEventListener("click", () => adv.close());
  $("#adv-body").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mv]");
    if (!b) return;
    const li = b.closest("li");
    const ol = li.parentElement;
    const sib = +b.dataset.mv < 0 ? li.previousElementSibling : li.nextElementSibling;
    if (!sib) return;
    if (+b.dataset.mv < 0) ol.insertBefore(li, sib);
    else ol.insertBefore(sib, li);
    [...ol.children].forEach((x, i, a) => {
      x.querySelector('[data-mv="-1"]').disabled = !i;
      x.querySelector('[data-mv="1"]').disabled = i === a.length - 1;
    });
    b.focus();
  });
  $("#adv-save").addEventListener("click", () => {
    try {
      const err = $("#adv-err");
      if (!adminOn) {
        const p = $("#adv-pin").value.trim();
        if (!/^\d{4,8}$/.test(p)) {
          err.textContent = "O PIN tem de ter 4 a 8 algarismos.";
          return;
        }
        const c = cfg();
        if (!c.pin) {
          if (p !== $("#adv-pin2").value.trim()) {
            err.textContent = "Os PIN não coincidem.";
            return;
          }
          S.cfg = { ...S.cfg || {}, pin: hash("mm:".concat(p)) };
          save();
        } else if (hash("mm:".concat(p)) !== c.pin) {
          err.textContent = "PIN incorrecto.";
          $("#adv-pin").value = "";
          return;
        }
        adminOn = true;
        err.textContent = "";
        render();
        if (adv._cb) {
          const cb = adv._cb;
          adv._cb = null;
          adv.close();
          cb();
          return;
        }
        draft = cfg();
        editor();
        return;
      }
      const np = readEditor();
      if (np && !/^\d{4,8}$/.test(np)) {
        err.textContent = "O novo PIN tem de ter 4 a 8 algarismos.";
        return;
      }
      if (!draft.cats.Entrada.length || !draft.cats.Despesa.length) {
        err.textContent = "Deixe pelo menos uma categoria de entrada e uma de despesa.";
        return;
      }
      S.cfg = { ...draft, pin: np ? hash("mm:".concat(np)) : cfg().pin };
      save();
      applyCfg();
      render();
      adv.close();
      toast("Personalização guardada.");
    } catch (e) {
      $("#adv-err").textContent = "Erro: ".concat(e.message);
    }
  });
  $("#adv-reset").addEventListener("click", async () => {
    adv.close();
    if (await confirmar("Repor tudo", "Repor títulos, cores, letra, posições, categorias e assinaturas de origem? Os lançamentos não são alterados.", "Repor")) {
      S.cfg = { pin: cfg().pin };
      save();
      document.documentElement.removeAttribute("style");
      applyCfg();
      render();
      toast("Personalização reposta.");
    }
  });
  window.CongApp = {
    get S() {
      return S;
    },
    set S(v) {
      S = v;
    },
    save,
    render,
    toast,
    confirmar,
    esc,
    clean,
    partilhar,
    num,
    numTxt,
    slug,
    today,
    mesLbl,
    hash,
    uid,
    cfg,
    setTab,
    imprimir,
    CONGS,
    isAdmin: () => isAdm(),
    can,
    admin: (cb) => isAdm() ? cb() : toast("Só o administrador pode fazer esta alteração."),
    $
  };
  if (window.Instalar) {
    window.Instalar.iniciar({
      nome: "Finanças da Congregação",
      chave: "mmCongInstalar",
      toast,
      icone: $(".logo").getAttribute("src"),
      aoMudar: (e) => {
        $("#instalar-btn").hidden = e.instalada;
        $("#lg-instalar").hidden = e.instalada || !(e.movel || e.botao);
        $("#inst-abrir").textContent = e.instalada ? "Partilhar a aplicação (link e QR)" : "Instalar a aplicação";
        $("#inst-estado").textContent = e.instalada ? "✔ Instalada neste aparelho: abra-a pelo ícone; funciona sem internet." : e.ficheiro ? "Está a usar a versão em ficheiro, que não se instala. Para instalar, abra o endereço (link) da aplicação." : "Ainda não está instalada: instale-a para a ter no ecrã principal e sem internet.";
      }
    });
    ["#instalar-btn", "#lg-instalar"].forEach((q) => $(q).addEventListener("click", () => window.Instalar.instalar()));
    $("#inst-abrir").addEventListener("click", () => window.Instalar.abrir());
  } else {
    $("#inst-card").hidden = true;
    $("#lg-instalar").hidden = true;
  }
  applyCfg();
  resetForm();
  setTab(S.perfil.congregacao ? "lanc" : "def");
  if (!S.perfil.congregacao) toast("Bem-vindo! Comece por identificar a congregação.");
})();
