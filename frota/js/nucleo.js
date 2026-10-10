const F = (() => {
  "use strict";
  const KEY = "ebenezerFrota_v1";
  const TEMA = "ebenezerTema";
  const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s != null ? s : "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const clean = (s, max = 200) => String(s != null ? s : "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const norm = (s) => String(s != null ? s : "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;
  const kz = (n) => Number(n || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (v, casas = 2) => {
    if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
    let t = String(v != null ? v : "").replace(/[\s  ]/g, "").replace(/kz|aoa/gi, "");
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
    const [i, d] = Math.abs(r2(n)).toFixed(2).split(".");
    const dec = d.replace(/0+$/, "");
    return "".concat(Number(n) < 0 ? "-" : "").concat(i.replace(/\B(?=(\d{3})+(?!\d))/g, " ")).concat(dec ? ",".concat(dec) : "");
  };
  const pad = (n) => String(n).padStart(2, "0");
  const hoje = () => {
    const d = /* @__PURE__ */ new Date();
    return "".concat(d.getFullYear(), "-").concat(pad(d.getMonth() + 1), "-").concat(pad(d.getDate()));
  };
  const fmtData = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? "".concat(iso.slice(8), "/").concat(iso.slice(5, 7), "/").concat(iso.slice(0, 4)) : "—";
  const mesLbl = (ym) => {
    const [a, m] = String(ym).split("-");
    return "".concat(MESES[+m - 1] || "?", " ").concat(a);
  };
  const uid = () => "".concat(Date.now().toString(36)).concat(Math.random().toString(36).slice(2, 7));
  const hash = (txt) => {
    let h = 2166136261;
    for (let i = 0; i < txt.length; i++) {
      h ^= txt.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  };
  const tempo = (iso, ate = hoje()) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return null;
    const [a1, m1, d1] = iso.split("-").map(Number);
    const [a2, m2, d2] = ate.split("-").map(Number);
    let anos = a2 - a1;
    let meses = m2 - m1;
    let dias = d2 - d1;
    if (dias < 0) {
      meses -= 1;
      dias += new Date(a2, m2 - 1, 0).getDate();
    }
    if (meses < 0) {
      anos -= 1;
      meses += 12;
    }
    return anos < 0 ? null : { anos, meses, dias, total: Math.round((new Date(ate) - new Date(iso)) / 864e5) };
  };
  const tempoTxt = (t) => !t ? "—" : [t.anos ? "".concat(t.anos, " ").concat(t.anos === 1 ? "ano" : "anos") : "", t.meses ? "".concat(t.meses, " ").concat(t.meses === 1 ? "mês" : "meses") : "", !t.anos && !t.meses ? "".concat(t.dias, " ").concat(t.dias === 1 ? "dia" : "dias") : ""].filter(Boolean).join(" e ");
  const NOMES = ["EBENÊZER I", "EBENÊZER II", "EBENÊZER III", "EBENÊZER IV", "EBENÊZER V"];
  const MODELO = [
    { cat: "Equipamento", itens: ["Remo de madeira", "Eletrobomba", "Varas", "Pás", "Enxadas", "Coletes", "Picareta", "Muxeros", "Arpão", "Lonas"] },
    { cat: "Combustível", itens: ["Bidões de gasolina (60 L)", "Bidões de gasolina (250 L)"], consumivel: true },
    { cat: "Cozinha", itens: ["Bidões de água de consumo", "Banheiras", "Panelas", "Tampas de panela", "Mexarico", "Grelha", "Fogareiro", "Tigelas", "Baldes", "Pratos"] },
    { cat: "Electricidade e Electrónica", itens: ["Geradores", "Bateria", "Holofotes", "Rádio VHF", "Antena VHF", "Bússola", "Pisca", "GPS Garmin", "Sonda Garmin", "Barquinha"] }
  ];
  const VIAGEM0 = {
    "Remo de madeira": [1, 1],
    Eletrobomba: [1, 1],
    Varas: [7, 6],
    Pás: [3, 3],
    Enxadas: [1, 1],
    Coletes: [6, 6],
    Picareta: [0, 0],
    Muxeros: [1, 1],
    Arpão: [null, null],
    Lonas: [2, 2],
    "Bidões de gasolina (60 L)": [3, 0],
    "Bidões de gasolina (250 L)": [4, 0],
    "Bidões de água de consumo": [17, 19],
    Banheiras: [4, 4, "2 boas e 2 partidas"],
    Panelas: [3, 3],
    "Tampas de panela": [null, null],
    Mexarico: [2, 1],
    Grelha: [1, 1],
    Fogareiro: [1, 1],
    Tigelas: [5, 5],
    Baldes: [null, null],
    Pratos: [null, null],
    Geradores: [1, 2],
    Bateria: [1, 1],
    Holofotes: [5, 5, "1 partido"],
    "Rádio VHF": [1, 1],
    "Antena VHF": [1, null],
    Bússola: [1, null],
    Pisca: [0, 0],
    "GPS Garmin": [0, 0],
    "Sonda Garmin": [1, 1],
    Barquinha: [1, 1]
  };
  const REGRA0 = { ativa: true, empresa: 60, rep1: 60, rep2: 40, nome1: "1.º representante", nome2: "2.º representante" };
  const REGRA_CONTAS0 = {
    ativa: true,
    partes: [{ chave: "manut", nome: "Manutenção da chata", pct: 10 }, { chave: "mestre", nome: "Mestre", pct: 10 }, { chave: "embarc", nome: "Embarcadores", pct: 10 }],
    divisao: [{ chave: "empresa", nome: "Empresa", pct: 50 }, { chave: "tripulacao", nome: "Tripulação", pct: 50 }]
  };
  const CFG0 = { nome: "Frota Ebenézer", sub: "Gestão das Embarcações", logo: "", cor1: "#0b2545", cor2: "#0e7c86", cor3: "#e09f3e", fs: 16 };
  const novo = () => {
    const barcos = NOMES.map((nome) => ({ id: uid(), nome, implantacao: "", rep1: "", rep2: "", obs: "", ativo: true }));
    const modelo = MODELO.map((g) => ({ cat: g.cat, itens: g.itens.map((n) => ({ nome: n, consumivel: !!g.consumivel || n === "Bidões de água de consumo" })) }));
    const b4 = barcos[3];
    const viagem = {
      id: uid(),
      barco: b4.id,
      partida: "2026-08-11",
      regresso: "2026-08-22",
      obs: "",
      criado: "2026-08-22T18:00:00.000Z",
      por: "sistema",
      itens: modelo.flatMap((g) => g.itens.map((it) => {
        const v = VIAGEM0[it.nome] || [null, null];
        return { cat: g.cat, nome: it.nome, consumivel: it.consumivel, p: v[0], c: v[1], obs: v[2] || "" };
      }))
    };
    return {
      v: 1,
      barcos,
      entradas: [],
      saidas: [],
      regra: { ...REGRA0 },
      modelo,
      viagens: [viagem],
      colab: [],
      users: [],
      painel: {},
      envios: [],
      importados: [],
      ultBackup: "",
      contas: [],
      regraContas: JSON.parse(JSON.stringify(REGRA_CONTAS0)),
      tiposDesconto: ["Dívida", "Adiantamento", "Outros"],
      embarques: [],
      pagamentos: [],
      cfg: { ...CFG0 }
    };
  };
  let S;
  const carregar = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        S = novo();
        return;
      }
      const d = JSON.parse(raw);
      if (!d || d.v !== 1) throw new Error("formato desconhecido");
      S = { ...novo(), ...d };
      ["barcos", "entradas", "saidas", "modelo", "viagens", "colab", "users", "envios", "importados", "contas", "embarques", "pagamentos", "tiposDesconto"].forEach((k) => {
        if (!Array.isArray(S[k])) S[k] = [];
      });
      S.regra = { ...REGRA0, ...d.regra || {} };
      if (!S.regraContas || !Array.isArray(S.regraContas.partes)) S.regraContas = JSON.parse(JSON.stringify(REGRA_CONTAS0));
      S.cfg = { ...CFG0, ...d.cfg || {} };
      if (!S.tiposDesconto.length) S.tiposDesconto = ["Dívida", "Adiantamento", "Outros"];
      S.users.forEach((u) => {
        if (u.priv) {
          if (u.priv.contas === void 0) u.priv.contas = u.priv.fin || "none";
          if (u.priv.sal === void 0) u.priv.sal = u.priv.fin || "none";
        }
      });
    } catch (e) {
      console.error("Dados ilegíveis:", e);
      S = novo();
      setTimeout(() => toast("Não foi possível ler os dados guardados. Restaure uma cópia de segurança.", "erro"), 600);
    }
  };
  const guardar = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
      return true;
    } catch (e) {
      toast("Sem espaço para guardar. Faça uma cópia de segurança e apague registos antigos.", "erro");
      return false;
    }
  };
  let tT = null;
  const toast = (msg, tipo = "") => {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show ".concat(tipo);
    clearTimeout(tT);
    tT = setTimeout(() => {
      t.className = "toast";
    }, 4200);
  };
  const modal = ({ titulo, corpo, botoes = [], largo = false }) => {
    const d = document.createElement("dialog");
    d.className = largo ? "dlg largo" : "dlg";
    d.setAttribute("aria-labelledby", "dlg-t-" + (d.id = "dlg".concat(uid())));
    d.innerHTML = '<div class="dlg-box"><h2 id="dlg-t-'.concat(d.id, '">').concat(esc(titulo), '</h2><div class="dlg-corpo">').concat(corpo, '</div><p class="erro" role="alert"></p><div class="acoes fim">').concat(botoes.map((b) => '<button type="button" class="btn '.concat(b.classe || "", '" data-b="').concat(esc(b.id), '">').concat(esc(b.label), "</button>")).join(""), "</div></div>");
    document.body.appendChild(d);
    d.addEventListener("close", () => {
      d.remove();
      limparGraficos();
    });
    d.showModal();
    const erro = (m) => {
      d.querySelector(".dlg-box > .erro").textContent = m || "";
    };
    return { el: d, fechar: () => d.close(), erro, on: (id, fn) => {
      var _a;
      return (_a = d.querySelector('[data-b="'.concat(id, '"]'))) == null ? void 0 : _a.addEventListener("click", fn);
    } };
  };
  const confirmar = (titulo, msg, ok = "Confirmar") => new Promise((res) => {
    const m = modal({ titulo, corpo: "<p>".concat(esc(msg), "</p>"), botoes: [{ id: "n", label: "Cancelar" }, { id: "s", label: ok, classe: "perigo" }] });
    let feito = false;
    const fim = (v) => {
      if (!feito) {
        feito = true;
        res(v);
      }
    };
    m.on("n", () => {
      fim(false);
      m.fechar();
    });
    m.on("s", () => {
      fim(true);
      m.fechar();
    });
    m.el.addEventListener("close", () => fim(false));
  });
  const campoHTML = (c, v, pre) => {
    var _a, _b;
    const id = "".concat(pre, "-").concat(c.k);
    const val = (_b = (_a = v[c.k]) != null ? _a : c.def) != null ? _b : "";
    const req = c.obrig ? ' required aria-required="true"' : "";
    const lab = '<label for="'.concat(id, '">').concat(esc(c.label)).concat(c.obrig ? " *" : "", "</label>");
    let inp;
    if (c.tipo === "select") inp = '<select id="'.concat(id, '" name="').concat(c.k, '"').concat(req, ">").concat((typeof c.opcoes === "function" ? c.opcoes() : c.opcoes).map((o) => {
      const [ov, ol] = Array.isArray(o) ? o : [o, o];
      return '<option value="'.concat(esc(ov), '"').concat(String(ov) === String(val) ? " selected" : "", ">").concat(esc(ol), "</option>");
    }).join(""), "</select>");
    else if (c.tipo === "textarea") inp = '<textarea id="'.concat(id, '" name="').concat(c.k, '" maxlength="').concat(c.max || 600, '" rows="3"').concat(req, ">").concat(esc(val), "</textarea>");
    else if (c.tipo === "checkbox") return '<label class="check'.concat(c.full ? " full" : "", '"><input type="checkbox" id="').concat(id, '" name="').concat(c.k, '"').concat(val ? " checked" : "", "> ").concat(esc(c.label), "</label>");
    else if (c.tipo === "number") inp = '<input id="'.concat(id, '" name="').concat(c.k, '" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="').concat(esc(numTxt(val)), '"').concat(c.ph ? ' placeholder="'.concat(esc(c.ph), '"') : "").concat(req, ">");
    else inp = '<input id="'.concat(id, '" name="').concat(c.k, '" type="').concat(c.tipo || "text", '" value="').concat(esc(val), '" maxlength="').concat(c.max || 120, '"').concat(c.tipo === "password" || c.tipo === "email" || c.tipo === "tel" ? ' autocapitalize="none" autocorrect="off" spellcheck="false"' : "").concat(c.lista ? ' list="'.concat(id, '-l"') : "").concat(req, ">").concat(c.lista ? '<datalist id="'.concat(id, '-l">').concat(c.lista().map((o) => '<option value="'.concat(esc(o), '">')).join(""), "</datalist>") : "");
    return '<div class="campo'.concat(c.full ? " full" : "", '">').concat(lab).concat(inp).concat(c.dica ? '<small class="dica">'.concat(esc(c.dica), "</small>") : "", "</div>");
  };
  const formHTML = (campos, v = {}, pre = "f") => '<form class="form grelha" novalidate>'.concat(campos.map((c) => campoHTML(c, v, pre)).join(""), "</form>");
  const lerForm = (form, campos) => {
    var _a, _b;
    const v = {};
    form.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
    for (const c of campos) {
      const el = form.elements[c.k];
      if (!el) continue;
      const falha = (msg) => {
        el.setAttribute("aria-invalid", "true");
        el.focus();
        return { ok: false, msg, el };
      };
      if (c.tipo === "checkbox") {
        v[c.k] = el.checked;
        continue;
      }
      if (c.tipo === "number") {
        const n = num(el.value);
        if (n === null) {
          if (c.obrig) return falha("Indique ".concat(c.label.toLowerCase(), "."));
          v[c.k] = c.vazio === null ? null : 0;
          continue;
        }
        if (Number.isNaN(n)) return falha("".concat(c.label, ": valor inválido. Escreva por exemplo 3.000.000 ou 1500,50 (no máximo 2 casas decimais)."));
        if (n < ((_a = c.min) != null ? _a : 0)) return falha("".concat(c.label, ": o mínimo é ").concat(numTxt((_b = c.min) != null ? _b : 0), "."));
        if (c.maxN !== void 0 && n > c.maxN) return falha("".concat(c.label, ": o máximo é ").concat(numTxt(c.maxN), "."));
        v[c.k] = r2(n);
        continue;
      }
      const t = clean(el.value, c.tipo === "textarea" ? c.max || 600 : c.max || 120);
      if (c.obrig && !t) return falha("Preencha «".concat(c.label, "»."));
      if (t && c.tipo === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(t)) return falha("".concat(c.label, ": data inválida."));
      if (t && c.tipo === "tel" && !/^[+()\d\s-]{6,30}$/.test(t)) return falha("".concat(c.label, ": contacto inválido."));
      if (t && c.tipo === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return falha("".concat(c.label, ": e-mail inválido."));
      if (c.min2 && t.length < c.min2) return falha("".concat(c.label, ": escreva pelo menos ").concat(c.min2, " caracteres."));
      v[c.k] = t;
    }
    return { ok: true, v };
  };
  const formModal = ({ titulo, campos, valores = {}, guardar: onSave, largo = false, extra = "" }) => {
    const m = modal({ titulo, corpo: formHTML(campos, valores, "m".concat(uid())) + extra, largo, botoes: [{ id: "c", label: "Cancelar" }, { id: "g", label: "Guardar", classe: "prim" }] });
    const form = m.el.querySelector("form");
    m.on("c", () => m.fechar());
    const go = async () => {
      try {
        const r = lerForm(form, campos);
        if (!r.ok) {
          m.erro(r.msg);
          return;
        }
        const e = await onSave(r.v, m);
        if (e) {
          m.erro(e);
          return;
        }
        m.fechar();
      } catch (err) {
        m.erro("Erro: ".concat(err.message));
      }
    };
    m.on("g", go);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      go();
    });
    return m;
  };
  const tabela = (cols, linhas, vazio = "Sem registos.", cap = "") => '<div class="tbl"><table>'.concat(cap ? '<caption class="sr-only">'.concat(esc(cap), "</caption>") : "", "<thead><tr>").concat(cols.map((c) => '<th scope="col"'.concat(c.num ? ' class="num"' : "", ">").concat(esc(c.t), "</th>")).join(""), "</tr></thead><tbody>").concat(linhas.length ? linhas.map((l) => "<tr".concat(l._cls ? ' class="'.concat(l._cls, '"') : "", ">").concat(cols.map((c) => "<td".concat(c.num ? ' class="num"' : "", ">").concat(c.f(l), "</td>")).join(""), "</tr>")).join("") : '<tr><td colspan="'.concat(cols.length, '" class="vazio">').concat(esc(vazio), "</td></tr>"), "</tbody></table></div>");
  const kpi = (v, l, cls = "") => '<div class="kpi '.concat(cls, '"><b>').concat(esc(v), "</b><span>").concat(esc(l), "</span></div>");
  let user = null;
  const NIVEL = { none: 0, read: 1, edit: 2 };
  const pode = (area, nivel = "edit") => {
    if (!user) return false;
    if (user.perfil === "admin") return true;
    if (area === "admin") return false;
    const p = user.priv || {};
    if (area === "dados") return !!p.dados;
    if (area === "painel") return true;
    return (NIVEL[p[area]] || 0) >= NIVEL[nivel];
  };
  const isAdmin = () => !!user && user.perfil === "admin";
  const ABAS = {};
  let aba = "painel";
  const reg = (id, def) => {
    ABAS[id] = def;
  };
  const AREA = { painel: "painel", financas: "fin", contas: "contas", salarios: "sal", inventario: "inv", barcos: "barcos", colab: "colab", dados: "dados", users: "admin", aparencia: "admin" };
  const TITULOS = { painel: "Painel", financas: "Finanças", contas: "Contas de viagem", salarios: "Salários pagos", inventario: "Inventário", barcos: "Embarcações", colab: "Colaboradores", dados: "Dados e cópias", users: "Utilizadores", aparencia: "Personalização" };
  const visivel = (id) => AREA[id] === "admin" ? isAdmin() : pode(AREA[id], "read");
  const ir = (id) => {
    if (!visivel(id)) id = Object.keys(AREA).find(visivel) || "painel";
    aba = id;
    $$(".aba-btn[data-aba]").forEach((b) => {
      b.hidden = !visivel(b.dataset.aba);
      if (b.dataset.aba === id) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    $$(".aba").forEach((s) => {
      s.hidden = s.id !== "aba-".concat(id);
    });
    const t = $("#titulo-pagina");
    if (t) t.textContent = TITULOS[id] || "";
    document.body.classList.remove("menu-aberto");
    const v = $("#veu");
    if (v) v.hidden = true;
    render();
  };
  const subabas = (grupo, lista, atual) => '<div class="subabas" role="tablist" aria-label="Sub-secções">'.concat(lista.map(([k, l]) => '<button type="button" role="tab" class="sub-btn" aria-selected="'.concat(k === atual, '" data-sub="').concat(esc(grupo), ":").concat(esc(k), '">').concat(esc(l), "</button>")).join(""), "</div>");
  const render = () => {
    var _a;
    try {
      (_a = ABAS[aba]) == null ? void 0 : _a.render();
      limparGraficos();
    } catch (e) {
      console.error(e);
      $("#c-".concat(aba)).innerHTML = '<p class="erro">Erro ao apresentar: '.concat(esc(e.message), "</p>");
    }
    Object.values(ABAS).forEach((a) => a.badge && a.badge());
  };
  const PALETA = ["#0E7C86", "#E09F3E", "#335C81", "#9E2A2B", "#5B8E7D", "#8B5FBF", "#C05746", "#2E86AB"];
  const charts = /* @__PURE__ */ new Map();
  const limparGraficos = () => {
    charts.forEach((ch, id) => {
      if (!ch.canvas || !ch.canvas.isConnected) {
        try {
          ch.destroy();
        } catch (_) {
        }
        charts.delete(id);
      }
    });
  };
  const grafico = (canvas, cfg) => {
    var _a;
    if (!canvas || typeof Chart === "undefined") return;
    limparGraficos();
    (_a = charts.get(canvas.id)) == null ? void 0 : _a.destroy();
    const dark = document.documentElement.dataset.tema === "escuro";
    Chart.defaults.color = dark ? "#C9D3E0" : "#334155";
    Chart.defaults.borderColor = dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)";
    charts.set(canvas.id, new Chart(canvas, { ...cfg, options: { responsive: true, maintainAspectRatio: false, animation: false, ...cfg.options || {} } }));
  };
  const imprimir = (html, papel = "A4 portrait") => {
    const area = $("#print-area");
    area.innerHTML = '<div class="p-folha"><header class="p-cab"><b>'.concat(esc(S.cfg.nome || "Frota Ebenézer"), "</b> · ").concat(esc(S.cfg.sub || "Gestão das Embarcações"), "<span>").concat(esc(fmtData(hoje())), "</span></header>").concat(html, "</div>");
    let st = document.getElementById("page-style");
    if (!st) {
      st = document.createElement("style");
      st.id = "page-style";
      document.head.appendChild(st);
    }
    st.textContent = "@page { size: ".concat(papel, "; margin: 14mm; }");
    document.body.classList.add("a-imprimir");
    const fim = () => {
      document.body.classList.remove("a-imprimir");
      area.innerHTML = "";
      document.removeEventListener("touchstart", fim);
      document.removeEventListener("mousedown", fim);
    };
    const t0 = Date.now();
    window.print();
    if (Date.now() - t0 > 400) {
      fim();
      return;
    }
    setTimeout(() => {
      document.addEventListener("touchstart", fim, { passive: true });
      document.addEventListener("mousedown", fim);
    }, 1500);
  };
  const papelDlg = (titulo, gerar) => {
    const m = modal({ titulo, corpo: '<div class="campo"><label for="pp">Papel</label><select id="pp"><option value="A4 portrait">A4 retrato (padrão)</option><option value="A4 landscape">A4 paisagem</option><option value="A5 portrait">A5</option><option value="letter portrait">Carta</option></select></div><p class="dica">PDF: escolha «Guardar como PDF» na janela de impressão (no iPhone: Imprimir › Partilhar › Guardar em Ficheiros). «Imagem» cria um PNG para partilhar.</p>', botoes: [{ id: "c", label: "Cancelar" }, { id: "i", label: "Imagem (PNG)" }, { id: "p", label: "Imprimir", classe: "prim" }] });
    m.on("c", () => m.fechar());
    m.on("p", () => {
      const p = m.el.querySelector("#pp").value;
      m.fechar();
      imprimir(gerar(), p);
    });
    m.on("i", async () => {
      m.fechar();
      const r = await imagem(gerar(), clean(titulo, 60).replace(/[^\p{L}\p{N}]+/gu, "_"));
      if (r === "partilhado" || r === "descarregado") toast("Imagem criada.");
    });
  };
  const imagem = async (html, nome, largura = 1e3) => {
    let box = null;
    try {
      if (!window.Pintor) throw new Error("módulo de imagem indisponível");
      box = document.createElement("div");
      box.className = "folha-img";
      box.style.width = "".concat(largura, "px");
      box.innerHTML = html;
      document.body.appendChild(box);
      const c = await window.Pintor.desenhar(box);
      const blob = await new Promise((res) => {
        try {
          c.toBlob(res, "image/png");
        } catch (e) {
          res(null);
        }
      });
      c.width = 0;
      c.height = 0;
      if (!blob) throw new Error("o navegador não criou o PNG");
      return partilhar(blob, "".concat(nome, ".png"));
    } catch (e) {
      console.warn("Imagem indisponível:", e);
      toast("Não foi possível criar a imagem (".concat(e.message, "). Use «Imprimir» e guarde em PDF."), "erro");
      return "falhou";
    } finally {
      if (box) box.remove();
    }
  };
  const blobDeDataURL = (url) => {
    const i = String(url).indexOf(",");
    const tipo = (/^data:([^;,]+)/.exec(url) || [])[1] || "application/octet-stream";
    const bin = atob(String(url).slice(i + 1));
    const u8 = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
    return new Blob([u8], { type: tipo });
  };
  const pngCanvas = (cv, fundo = "#ffffff") => {
    const c = document.createElement("canvas");
    c.width = cv.width;
    c.height = cv.height;
    const x = c.getContext("2d");
    x.fillStyle = fundo;
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(cv, 0, 0);
    const b = blobDeDataURL(c.toDataURL("image/png"));
    c.width = 0;
    c.height = 0;
    return b;
  };
  const podeDescarregar = "download" in document.createElement("a");
  const tamanho = (b) => b >= 1048576 ? "".concat((b / 1048576).toLocaleString("pt-PT", { maximumFractionDigits: 1 }), " MB") : "".concat(Math.max(1, Math.round(b / 1024)), " KB");
  const ficheiro = (blob, nome) => {
    try {
      return new File([blob], nome, { type: blob.type || "application/octet-stream" });
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
  const dadosPartilha = (file, nome, texto) => window.Compat && window.Compat.ios ? { files: [file] } : { files: [file], title: nome, text: texto };
  const descarregar = (blob, nome) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
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
  const prontoDlg = async (blob, nome, texto, file) => {
    const share = partilhaFicheiros(file);
    const textual = /json|csv|text/.test(blob.type);
    const conteudo = !podeDescarregar && textual ? await blob.text().catch(() => "") : "";
    return new Promise((res) => {
      const botoes = [{ id: "c", label: "Cancelar" }];
      if (podeDescarregar) botoes.push({ id: "d", label: "Guardar" });
      else {
        botoes.push({ id: "a", label: "Abrir" });
        if (conteudo) botoes.push({ id: "t", label: "Copiar texto" });
      }
      if (share) botoes.push({ id: "s", label: "Partilhar", classe: "prim" });
      const m = modal({ titulo: "Ficheiro pronto", corpo: "<p><b>".concat(esc(nome), "</b> · ").concat(esc(tamanho(blob.size)), '</p><p class="dica">').concat(share ? "«Partilhar» abre o WhatsApp, o e-mail, o Drive ou «Guardar em Ficheiros». " : "").concat(podeDescarregar ? "«Guardar» coloca o ficheiro em Transferências." : "Este aparelho não guarda ficheiros directamente: «Abrir» mostra o ficheiro (depois use Partilhar › Guardar em Ficheiros)".concat(conteudo ? " ou copie o texto e cole-o numa mensagem" : "", "."), "</p>"), botoes });
      let feito = false;
      const fim = (r) => {
        if (!feito) {
          feito = true;
          res(r);
        }
      };
      m.on("c", () => {
        fim("cancelado");
        m.fechar();
      });
      m.on("d", () => {
        descarregar(blob, nome);
        fim("descarregado");
        m.fechar();
      });
      m.on("s", () => {
        navigator.share(dadosPartilha(file, nome, texto)).then(() => {
          fim("partilhado");
          m.fechar();
        }).catch((e) => {
          if (!e || e.name !== "AbortError") m.erro("Não foi possível partilhar: ".concat(e ? e.message : "erro"));
        });
      });
      m.on("a", () => {
        const w = window.open(URL.createObjectURL(blob), "_blank");
        if (!w) {
          m.erro("O navegador bloqueou a abertura do ficheiro.");
          return;
        }
        fim("descarregado");
        m.fechar();
      });
      m.on("t", () => {
        if (copiarTexto(conteudo)) {
          toast("Texto copiado: cole-o numa mensagem ou nota.");
          fim("descarregado");
          m.fechar();
        } else m.erro("Não foi possível copiar o texto.");
      });
      m.el.addEventListener("close", () => fim("cancelado"));
    });
  };
  const partilhar = async (blob, nome, texto = "") => {
    const file = ficheiro(blob, nome);
    if (partilhaFicheiros(file)) {
      try {
        await navigator.share(dadosPartilha(file, nome, texto));
        return "partilhado";
      } catch (e) {
        if (e && e.name === "AbortError") return "cancelado";
        console.warn("Partilha directa indisponível:", e);
        return prontoDlg(blob, nome, texto, file);
      }
    }
    if (podeDescarregar) {
      descarregar(blob, nome);
      return "descarregado";
    }
    return prontoDlg(blob, nome, texto, null);
  };
  const tema = (t) => {
    document.documentElement.dataset.tema = t;
    try {
      localStorage.setItem(TEMA, t);
    } catch (_) {
    }
    if (aba) render();
  };
  const temaInicial = () => {
    let t = "claro";
    try {
      t = localStorage.getItem(TEMA) || (matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro");
    } catch (_) {
    }
    document.documentElement.dataset.tema = t;
  };
  carregar();
  temaInicial();
  new MutationObserver(() => limparGraficos()).observe(document.documentElement, { childList: true, subtree: true });
  return {
    get S() {
      return S;
    },
    set S(v) {
      S = v;
    },
    novo,
    guardar,
    $,
    $$,
    esc,
    clean,
    norm,
    r2,
    kz,
    pad,
    hoje,
    fmtData,
    mesLbl,
    MESES,
    uid,
    hash,
    tempo,
    tempoTxt,
    toast,
    modal,
    confirmar,
    formHTML,
    lerForm,
    formModal,
    tabela,
    kpi,
    get user() {
      return user;
    },
    set user(u) {
      user = u;
    },
    pode,
    isAdmin,
    reg,
    ir,
    render,
    get aba() {
      return aba;
    },
    grafico,
    charts,
    PALETA,
    imprimir,
    papelDlg,
    partilhar,
    imagem,
    pngCanvas,
    blobDeDataURL,
    num,
    numTxt,
    tema,
    subabas,
    REGRA0,
    REGRA_CONTAS0,
    CFG0,
    MODELO,
    NOMES
  };
})();
