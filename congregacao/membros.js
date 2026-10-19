(() => {
  "use strict";
  const A = window.CongApp;
  if (!A) return;
  const { esc, clean, $ } = A;
  const S = () => A.S;
  const can = (area, lvl = "edit") => window.CongAuth ? window.CongAuth.can(area, lvl) : true;
  const SITUACOES = ["Ativo", "Ausente", "Suspenso", "Transferido", "Em Disciplina", "Falecido(a)", "Enfermo(a)", "Pendente", "N\xE3o definido"];
  const EST_CIVIL = ["Solteiro(a)", "Casado(a)", "Vi\xFAvo(a)", "Divorciado(a)"];
  const FUNCOES = ["SECRET\xC1RIO (A)", "VICE-SECRET\xC1RIO(A)", "TESOUREIRO (A)", "VICE-TESOUREIRO (A)", "L\xCDDER", "VICE-LIDER", "CONSELHEIRO (A)", "CORISTA", "LEVITA", "CRENTE", "LIDER_DEP", "VICE_LID_DEP", "OBREIRO", "COPERADOR (A)", "MEMBRO"];
  const ESTADOS_INV = ["Bom", "Razo\xE1vel", "Mau", "Danificado"];
  const MESES = ["Janeiro", "Fevereiro", "Mar\xE7o", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const FOTO_MAX = 240;
  const lista = (k) => {
    const s = S();
    if (!Array.isArray(s[k])) s[k] = [];
    return s[k];
  };
  const membros = () => lista("membros");
  const inventario = () => lista("inventario");
  const isoOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !isNaN(new Date("".concat(v, "T00:00:00")));
  const fmtD = (v) => isoOk(v) ? v.split("-").reverse().join("/") : "";
  const idade = (v) => {
    if (!isoOk(v)) return null;
    const d = new Date("".concat(v, "T00:00:00"));
    const n = /* @__PURE__ */ new Date();
    let a = n.getFullYear() - d.getFullYear();
    if (n.getMonth() < d.getMonth() || n.getMonth() === d.getMonth() && n.getDate() < d.getDate()) a -= 1;
    return a >= 0 && a < 130 ? a : null;
  };
  const faixa = (a) => a === null ? "" : a < 12 ? "CRIAN\xC7A" : a < 18 ? "ADOLESCENTE" : a < 35 ? "JOVEM" : a < 60 ? "ADULTO" : "IDOSO(A)";
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const uniq = (a) => [...new Set(a.filter(Boolean))].sort((x, y) => x.localeCompare(y, "pt"));
  const opts = (L, v, vazio = "\u2014") => '<option value="">'.concat(esc(vazio), "</option>").concat(L.map((x) => "<option".concat(x === v ? " selected" : "", ">").concat(esc(x), "</option>")).join(""));
  const cong = () => S().perfil.congregacao || "Congrega\xE7\xE3o";
  const hoje = () => A.today();
  const toISO = (v) => {
    if (v === null || v === void 0 || v === "") return "";
    if (v instanceof Date && !isNaN(v)) return "".concat(v.getFullYear(), "-").concat(String(v.getMonth() + 1).padStart(2, "0"), "-").concat(String(v.getDate()).padStart(2, "0"));
    if (typeof v === "number" && v > 59 && v < 8e4) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5);
      return d.toISOString().slice(0, 10);
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (m) {
      let y = +m[3];
      if (y < 100) y += y > 30 ? 1900 : 2e3;
      const r = "".concat(y, "-").concat(m[2].padStart(2, "0"), "-").concat(m[1].padStart(2, "0"));
      return isoOk(r) ? r : "";
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      const r = "".concat(m[1], "-").concat(m[2].padStart(2, "0"), "-").concat(m[3].padStart(2, "0"));
      return isoOk(r) ? r : "";
    }
    return "";
  };
  const dlg = (title, body, okTxt = "Guardar", wide = false) => {
    const d = document.createElement("dialog");
    d.setAttribute("aria-label", title);
    if (wide) d.className = "m-largo";
    d.innerHTML = '<form method="dialog" class="dlg-box" novalidate><h2>'.concat(esc(title), "</h2>").concat(body, '<p class="err" role="alert"></p>\n      <div class="actions"><button value="cancel" class="btn">Cancelar</button>').concat(okTxt ? '<button type="button" class="btn primary" data-ok>'.concat(esc(okTxt), "</button>") : "", "</div></form>");
    document.body.appendChild(d);
    d.addEventListener("close", () => d.remove());
    d.showModal();
    return d;
  };
  const xlsx = (nome, folhas) => {
    if (!window.XLSX) {
      A.toast("A biblioteca Excel n\xE3o carregou.");
      return null;
    }
    const wb = XLSX.utils.book_new();
    folhas.forEach(([n, aoa]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n.slice(0, 31)));
    return new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  };
  const csv = (aoa) => new Blob(["\uFEFF".concat(aoa.map((r) => r.map((c) => {
    const t = String(c == null ? "" : c);
    return /[";\n]/.test(t) ? '"'.concat(t.replace(/"/g, '""'), '"') : t;
  }).join(";")).join("\r\n"))], { type: "text/csv;charset=utf-8" });
  const enviar = async (blob, nome, txt) => {
    try {
      const r = await A.partilhar(blob, nome, txt);
      if (r !== "cancelado" && r !== "falhou") A.toast(r === "partilhado" ? "Ficheiro partilhado." : "Ficheiro guardado: ".concat(nome));
      return r;
    } catch (e) {
      A.toast("N\xE3o foi poss\xEDvel exportar: ".concat(e.message));
      return "falhou";
    }
  };
  const fotoRed = (file) => new Promise((res, rej) => {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type || "image/jpeg")) {
      rej(new Error("formato de imagem n\xE3o suportado"));
      return;
    }
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("n\xE3o foi poss\xEDvel ler a imagem"));
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => rej(new Error("imagem inv\xE1lida"));
      im.onload = () => {
        const r = Math.min(1, FOTO_MAX / Math.max(im.width, im.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(im.width * r);
        cv.height = Math.round(im.height * r);
        const x = cv.getContext("2d");
        x.fillStyle = "#fff";
        x.fillRect(0, 0, cv.width, cv.height);
        x.drawImage(im, 0, 0, cv.width, cv.height);
        res(cv.toDataURL("image/jpeg", 0.78));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
  const fotoOk = (v) => /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(String(v || "")) ? v : "";
  const guardar = (msg) => {
    if (A.save()) {
      if (msg) A.toast(msg);
      return true;
    }
    return false;
  };
  const imprimirHTML = (html, papel = "A4 portrait") => {
    const area = $("#print-area");
    area.innerHTML = html;
    let st = document.getElementById("page-style");
    if (!st) {
      st = document.createElement("style");
      st.id = "page-style";
      document.head.appendChild(st);
    }
    st.textContent = "@page { size: ".concat(papel, "; margin: 12mm; }");
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
  };
  const cabecalho = () => {
    const K = A.cfg();
    return '<header class="v20-cab mf-cab"><img src="'.concat(esc($(".logo").getAttribute("src")), '" alt="Log\xF3tipo da ADP"><p>').concat(esc(K.cab.l1), "</p><p>").concat(esc(K.cab.l2), "</p><p>").concat(esc(cong()), '</p></header><hr class="v20-linha">');
  };
  const CAMPOS = [
    ["Dados pessoais", [
      ["nome", "Nome completo *", "text", { req: true, max: 120, full: true }],
      ["genero", "G\xE9nero", "select", { L: ["Masculino", "Feminino"] }],
      ["dataNascimento", "Data de nascimento", "date"],
      ["estadoCivil", "Estado civil", "select", { L: EST_CIVIL }],
      ["nomeConjuge", "Nome do c\xF4njuge", "text"],
      ["nBi", "N\xBA do Bilhete de Identidade", "text", { max: 20 }],
      ["nacionalidade", "Nacionalidade", "text"],
      ["infEscolar", "Habilita\xE7\xF5es liter\xE1rias", "text"]
    ]],
    ["Contactos", [["tel", "Telefone", "tel", { max: 30 }], ["email", "E-mail", "email", { max: 80 }]]],
    ["Endere\xE7o", [["provincia", "Prov\xEDncia", "text"], ["municipio", "Munic\xEDpio", "text"], ["morada", "Morada / bairro", "text", { full: true, max: 160 }]]],
    ["Filia\xE7\xE3o", [["nomePai", "Nome do pai", "text"], ["nomeMae", "Nome da m\xE3e", "text"]]],
    ["Dados eclesi\xE1sticos", [
      ["situacao", "Situa\xE7\xE3o", "select", { L: SITUACOES }],
      ["dataSituacao", "Data da situa\xE7\xE3o", "date"],
      ["departamento", "Departamento", "list"],
      ["cargo", "Cargo", "list"],
      ["funcao", "Fun\xE7\xE3o", "list", { L: FUNCOES }],
      ["dataConversao", "Data da convers\xE3o", "date"],
      ["dataBaptismo", "Data do baptismo", "date"],
      ["nCartao", "N\xBA do cart\xE3o de membro", "text", { max: 20 }],
      ["dataRegisto", "Data de registo", "date"]
    ]],
    ["Observa\xE7\xE3o", [["obs", "Observa\xE7\xE3o", "textarea", { full: true, max: 600 }]]]
  ];
  const FLAT = CAMPOS.flatMap(([, F]) => F);
  const DATAS = FLAT.filter((f) => f[2] === "date").map((f) => f[0]);
  const normMembro = (r, base = {}) => {
    const m = { ...base };
    FLAT.forEach(([k, , t, o = {}]) => {
      if (r[k] === void 0) return;
      m[k] = t === "date" ? toISO(r[k]) : clean(r[k], o.max || 100);
    });
    if (m.genero) {
      const g = norm(m.genero);
      m.genero = /^f|femin|mulher/.test(g) ? "Feminino" : /^m|mascul|homem/.test(g) ? "Masculino" : m.genero;
    }
    if (m.situacao) {
      const s = SITUACOES.find((x) => norm(x) === norm(m.situacao)) || (norm(m.situacao) === "activo" ? "Ativo" : "");
      m.situacao = s || m.situacao;
    }
    if (m.estadoCivil) m.estadoCivil = EST_CIVIL.find((x) => norm(x).startsWith(norm(m.estadoCivil).slice(0, 5))) || m.estadoCivil;
    m.nome = clean(m.nome, 120).replace(/\s+/g, " ");
    if (r.foto !== void 0) m.foto = fotoOk(r.foto);
    let err = "";
    if (m.nome.length < 3) err = "nome em falta (m\xEDnimo 3 letras)";
    else if (/[<>]/.test(m.nome)) err = "nome com caracteres inv\xE1lidos";
    else if (m.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email)) err = "e-mail inv\xE1lido (".concat(m.email, ")");
    else if (m.tel && !/^[+\d][\d\s/()-]{5,}$/.test(m.tel)) err = "telefone inv\xE1lido (".concat(m.tel, ")");
    else if (m.dataNascimento && m.dataNascimento > hoje()) err = "data de nascimento no futuro";
    const a = idade(m.dataNascimento);
    m.idade = a;
    m.faixaEtaria = faixa(a) || m.faixaEtaria || "";
    m.igreja = clean(r.igreja, 80) || clean(base.igreja, 80) || cong();
    return { m, err };
  };
  const duplicado = (m, ignorar) => membros().find((x) => x !== ignorar && (m.nBi && x.nBi && norm(x.nBi) === norm(m.nBi) || norm(x.nome) === norm(m.nome) && (x.dataNascimento || "") === (m.dataNascimento || "")));
  const fM = { q: "", sit: "", gen: "", dep: "", fx: "" };
  const filtrados = () => {
    const q = norm(fM.q);
    return membros().filter((m) => (!q || norm("".concat(m.nome, " ").concat(m.nBi, " ").concat(m.tel, " ").concat(m.nCartao, " ").concat(m.email)).includes(q)) && (!fM.sit || (m.situacao || "N\xE3o definido") === fM.sit) && (!fM.gen || m.genero === fM.gen) && (!fM.dep || m.departamento === fM.dep) && (!fM.fx || faixa(idade(m.dataNascimento)) === fM.fx)).sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
  };
  const kpi = (v, l, cls = "") => '<div class="kpi '.concat(cls, '"><b>').concat(esc(v), "</b><span>").concat(esc(l), "</span></div>");
  const renderMem = () => {
    const box = $("#tab-mem");
    if (!box) return;
    const L = membros();
    const ed = can("mem");
    const mesN = (/* @__PURE__ */ new Date()).getMonth() + 1;
    const aniv = L.filter((m) => isoOk(m.dataNascimento) && +m.dataNascimento.slice(5, 7) === mesN);
    $("#mem-kpis").innerHTML = kpi(L.length, "Membros") + kpi(L.filter((m) => m.situacao === "Ativo").length, "Activos") + kpi("".concat(L.filter((m) => m.genero === "Masculino").length, " / ").concat(L.filter((m) => m.genero === "Feminino").length), "Homens / Mulheres") + kpi(L.filter((m) => m.dataBaptismo).length, "Baptizados") + kpi(aniv.length, "Aniversariantes de ".concat(MESES[mesN - 1]));
    const deps = uniq(L.map((m) => m.departamento));
    $("#mem-fil").innerHTML = '<div class="field"><label for="mf-q">Pesquisar</label><input id="mf-q" type="search" value="'.concat(esc(fM.q), '" placeholder="Nome, BI, telefone ou cart\xE3o" autocomplete="off"></div>\n      <div class="field"><label for="mf-sit">Situa\xE7\xE3o</label><select id="mf-sit">').concat(opts(SITUACOES, fM.sit, "Todas"), '</select></div>\n      <div class="field"><label for="mf-gen">G\xE9nero</label><select id="mf-gen">').concat(opts(["Masculino", "Feminino"], fM.gen, "Todos"), '</select></div>\n      <div class="field"><label for="mf-dep">Departamento</label><select id="mf-dep">').concat(opts(deps, fM.dep, "Todos"), '</select></div>\n      <div class="field"><label for="mf-fx">Faixa et\xE1ria</label><select id="mf-fx">').concat(opts(["CRIAN\xC7A", "ADOLESCENTE", "JOVEM", "ADULTO", "IDOSO(A)"], fM.fx, "Todas"), "</select></div>");
    $("#mem-bar").querySelectorAll("[data-ed]").forEach((b) => {
      b.hidden = !ed;
    });
    listaMem();
  };
  const listaMem = () => {
    const F = filtrados();
    const ed = can("mem");
    $("#mem-conta").textContent = "".concat(F.length, " de ").concat(membros().length, " membro(s)");
    $("#mem-lista").innerHTML = F.slice(0, 400).map((m) => {
      const a = idade(m.dataNascimento);
      return '<li><div class="mf-av" aria-hidden="true">'.concat(fotoOk(m.foto) ? '<img src="'.concat(m.foto, '" alt="">') : esc((m.nome.match(new RegExp("\\b\\p{L}", "gu")) || []).slice(0, 2).join("").toUpperCase() || "?"), '</div>\n        <div class="l-main"><b>').concat(esc(m.nome), "</b><small>").concat([a !== null ? "".concat(a, " anos") : "", m.situacao || "N\xE3o definido", m.departamento, m.funcao, m.tel].filter(Boolean).map(esc).join(" \xB7 "), '</small></div>\n        <div class="l-acts"><button type="button" class="btn small" data-mficha="').concat(esc(m.id), '" aria-label="Ficha de ').concat(esc(m.nome), '">Ficha</button>').concat(ed ? '<button type="button" class="btn small" data-medit="'.concat(esc(m.id), '" aria-label="Editar ').concat(esc(m.nome), '">Editar</button><button type="button" class="btn small danger" data-mdel="').concat(esc(m.id), '" aria-label="Eliminar ').concat(esc(m.nome), '">Eliminar</button>') : "", "</div></li>");
    }).join("") || '<li class="vazio">'.concat(membros().length ? "Nenhum membro corresponde aos filtros." : "Ainda n\xE3o h\xE1 membros registados. Use \xAB+ Novo membro\xBB ou \xABImportar\xBB.", "</li>");
    if (F.length > 400) $("#mem-lista").insertAdjacentHTML("beforeend", '<li class="vazio">A mostrar 400 de '.concat(F.length, ". Use a pesquisa para encontrar os restantes.</li>"));
  };
  const campoHTML = ([k, l, t, o = {}], m) => {
    const v = m[k] == null ? "" : m[k];
    const id = "mm-".concat(k);
    const req = o.req ? ' required aria-required="true"' : "";
    let inp;
    if (t === "select") inp = '<select id="'.concat(id, '" name="').concat(k, '">').concat(opts(o.L, v), "</select>");
    else if (t === "textarea") inp = '<textarea id="'.concat(id, '" name="').concat(k, '" rows="3" maxlength="').concat(o.max || 600, '">').concat(esc(v), "</textarea>");
    else if (t === "list") {
      const L = uniq([...o.L || [], ...membros().map((x) => x[k])]);
      inp = '<input id="'.concat(id, '" name="').concat(k, '" list="dl-').concat(k, '" maxlength="80" value="').concat(esc(v), '" autocomplete="off"><datalist id="dl-').concat(k, '">').concat(L.map((x) => '<option value="'.concat(esc(x), '">')).join(""), "</datalist>");
    } else inp = '<input id="'.concat(id, '" name="').concat(k, '" type="').concat(t, '" maxlength="').concat(o.max || 100, '" value="').concat(esc(v), '"').concat(t === "tel" ? ' inputmode="tel"' : "").concat(t === "date" ? ' max="'.concat(hoje(), '"') : "").concat(req).concat(k === "nome" ? ' autocapitalize="words"' : "", ">");
    return '<div class="field'.concat(o.full ? " full" : "", '"><label for="').concat(id, '">').concat(esc(l), "</label>").concat(inp, "</div>");
  };
  const editarMembro = (id) => {
    if (!can("mem")) {
      A.toast("O seu perfil s\xF3 pode consultar os membros.");
      return;
    }
    const cur = id ? membros().find((x) => x.id === id) : null;
    const m = cur ? { ...cur } : { situacao: "Ativo", dataRegisto: hoje() };
    let foto = fotoOk(m.foto);
    const d = dlg(cur ? "Editar membro \u2014 ".concat(cur.nome) : "Novo membro", '<div class="mf-foto"><div class="mf-av grande" data-prev>'.concat(foto ? '<img src="'.concat(foto, '" alt="Fotografia">') : "FOTO", '</div>\n        <div><label class="btn small" for="mm-foto">Escolher fotografia</label><input id="mm-foto" type="file" accept="image/*" class="ficheiro-oculto"> <button type="button" class="btn small" data-semfoto').concat(foto ? "" : " hidden", '>Remover</button>\n        <p class="hint">A fotografia \xE9 reduzida para ').concat(FOTO_MAX, " px para poupar espa\xE7o.</p></div></div>\n      ").concat(CAMPOS.map(([t, F]) => '<fieldset class="fs"><legend>'.concat(esc(t), '</legend><div class="grid">').concat(F.map((f) => campoHTML(f, m)).join(""), "</div></fieldset>")).join("")), cur ? "Guardar altera\xE7\xF5es" : "Guardar membro", true);
    const q = (s) => d.querySelector(s);
    const err = q(".err");
    q("#mm-foto").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      e.target.value = "";
      if (!f) return;
      try {
        foto = await fotoRed(f);
        q("[data-prev]").innerHTML = '<img src="'.concat(foto, '" alt="Fotografia">');
        q("[data-semfoto]").hidden = false;
      } catch (x) {
        err.textContent = "Fotografia: ".concat(x.message, ".");
      }
    });
    q("[data-semfoto]").addEventListener("click", () => {
      foto = "";
      q("[data-prev]").textContent = "FOTO";
      q("[data-semfoto]").hidden = true;
    });
    q("[data-ok]").addEventListener("click", async () => {
      try {
        const raw = {};
        FLAT.forEach(([k]) => {
          const el = q('[name="'.concat(k, '"]'));
          if (el) raw[k] = el.value;
        });
        raw.foto = foto;
        const bad = DATAS.find((k) => raw[k] && !isoOk(raw[k]));
        if (bad) {
          err.textContent = "H\xE1 uma data inv\xE1lida.";
          q('[name="'.concat(bad, '"]')).focus();
          return;
        }
        const { m: n, err: e } = normMembro(raw, cur || { id: A.uid(), criado: (/* @__PURE__ */ new Date()).toISOString() });
        if (e) {
          err.textContent = "Corrija: ".concat(e, ".");
          return;
        }
        const dup = duplicado(n, cur);
        if (dup && !await A.confirmar("Poss\xEDvel duplicado", "J\xE1 existe \xAB".concat(dup.nome, "\xBB").concat(dup.nBi ? " (BI ".concat(dup.nBi, ")") : "", ". Guardar mesmo assim?"), "Guardar")) return;
        n.alterado = (/* @__PURE__ */ new Date()).toISOString();
        if (cur) Object.assign(cur, n);
        else membros().push(n);
        if (guardar(cur ? "Membro actualizado." : "Membro registado.")) {
          d.close();
          renderMem();
          if (fichaId === n.id) renderFicha();
        }
      } catch (x) {
        err.textContent = "Erro: ".concat(x.message);
      }
    });
    setTimeout(() => q("#mm-nome").focus(), 50);
  };
  const eliminarMembro = async (id) => {
    if (!can("mem")) return;
    const m = membros().find((x) => x.id === id);
    if (!m) return;
    if (!await A.confirmar("Eliminar membro", "Eliminar \xAB".concat(m.nome, "\xBB da base de dados desta congrega\xE7\xE3o? (Fa\xE7a antes a c\xF3pia de seguran\xE7a se tiver d\xFAvidas.)"), "Eliminar")) return;
    S().membros = membros().filter((x) => x !== m);
    S().lixeiraMem = [{ ...m, eliminado: (/* @__PURE__ */ new Date()).toISOString() }, ...lista("lixeiraMem")].slice(0, 50);
    if (guardar("Membro eliminado. Pode rep\xF4-lo em \xABEliminados\xBB.")) renderMem();
  };
  const repor = () => {
    const L = lista("lixeiraMem");
    if (!L.length) {
      A.toast("N\xE3o h\xE1 membros eliminados.");
      return;
    }
    const d = dlg("Membros eliminados", '<ul class="lista mini">'.concat(L.map((m, i) => '<li><div class="l-main"><b>'.concat(esc(m.nome), "</b><small>eliminado em ").concat(esc(new Date(m.eliminado).toLocaleString("pt-PT")), '</small></div><div class="l-acts"><button type="button" class="btn small" data-rep="').concat(i, '">Repor</button></div></li>')).join(""), "</ul>"), "");
    d.addEventListener("click", (e) => {
      const b = e.target.closest("[data-rep]");
      if (!b) return;
      const m = L.splice(+b.dataset.rep, 1)[0];
      delete m.eliminado;
      membros().push(m);
      if (guardar("\xAB".concat(m.nome, "\xBB reposto."))) {
        d.close();
        renderMem();
      }
    });
  };
  const HEAD = {
    nome: ["nome", "nome completo", "name", "membro"],
    genero: ["genero", "sexo", "gender"],
    dataNascimento: ["data de nascimento", "data nascimento", "data_nascimento", "datanascimento", "nascimento", "dn"],
    estadoCivil: ["estado civil", "estado_civil", "estadocivil"],
    nomeConjuge: ["nome do conjuge", "conjuge", "nome conjuge"],
    nBi: ["n bi", "no bi", "bi", "numero bi", "no do bi", "n do bi", "bilhete", "n bilhete"],
    nacionalidade: ["nacionalidade"],
    infEscolar: ["habilitacoes", "habilitacoes literarias", "escolaridade", "inf escolar"],
    tel: ["tel", "telefone", "contacto", "telemovel", "phone", "celular"],
    email: ["email", "e mail", "correio"],
    provincia: ["provincia"],
    municipio: ["municipio"],
    morada: ["morada", "endereco", "bairro", "residencia", "morada bairro"],
    nomePai: ["nome pai", "nome do pai", "pai"],
    nomeMae: ["nome mae", "nome da mae", "mae"],
    situacao: ["situacao", "estado"],
    dataSituacao: ["data da situacao", "data situacao"],
    departamento: ["departamento", "dep"],
    cargo: ["cargo"],
    funcao: ["funcao"],
    dataConversao: ["data da conversao", "data conversao", "conversao"],
    dataBaptismo: ["data do baptismo", "data do batismo", "data baptismo", "data batismo", "baptismo", "batismo"],
    nCartao: ["n cartao", "no cartao", "numero cartao", "cartao", "no do cartao", "n do cartao"],
    dataRegisto: ["data de registo", "data registo", "registo"],
    obs: ["obs", "observacao", "observacoes", "notas"]
  };
  const chave = (h) => {
    const n = norm(h).replace(/[º°.]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    return Object.keys(HEAD).find((k) => HEAD[k].includes(n)) || "";
  };
  const deAOA = (rows) => {
    const hi = rows.slice(0, 10).findIndex((r) => r.some((c) => chave(c) === "nome"));
    if (hi < 0) throw new Error("n\xE3o foi encontrada a coluna \xABNome\xBB");
    const map = rows[hi].map(chave);
    return rows.slice(hi + 1).filter((r) => r.some((c) => String(c == null ? "" : c).trim())).map((r) => {
      const o = {};
      map.forEach((k, i) => {
        if (k && r[i] !== void 0 && r[i] !== "") o[k] = r[i];
      });
      return o;
    });
  };
  const importar = () => {
    if (!can("mem")) return;
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".xlsx,.xls,.csv,.json,application/json,text/csv";
    inp.className = "ficheiro-oculto";
    document.body.appendChild(inp);
    inp.addEventListener("change", async () => {
      const f = inp.files[0];
      inp.remove();
      if (!f) return;
      try {
        if (f.size > 25e6) throw new Error("ficheiro demasiado grande");
        let rows;
        const ext = (f.name.split(".").pop() || "").toLowerCase();
        if (ext === "json") {
          const o = JSON.parse(await f.text());
          const L = Array.isArray(o) ? o : o.members || o.membros || o.dados && o.dados.membros || [];
          if (!Array.isArray(L) || !L.length) throw new Error("o ficheiro n\xE3o tem membros");
          rows = L;
        } else if (ext === "csv") {
          const t = await f.text();
          const sep = t.split(/\r?\n/)[0].split(";").length > t.split(/\r?\n/)[0].split(",").length ? ";" : ",";
          rows = deAOA(t.split(/\r?\n/).map((l) => l.split(sep).map((c) => c.replace(/^"|"$/g, ""))));
        } else {
          if (!window.XLSX) throw new Error("a biblioteca Excel n\xE3o carregou");
          const wb = XLSX.read(await f.arrayBuffer(), { type: "array", cellDates: true });
          rows = deAOA(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: "" }));
        }
        previa(rows, f.name);
      } catch (e) {
        A.toast("Importa\xE7\xE3o falhou: ".concat(e.message, "."));
      }
    });
    inp.click();
  };
  const previa = (rows, nome) => {
    const igrejas = uniq(rows.map((r) => clean(r.igreja, 80)));
    const out = { novos: [], dup: [], err: [] };
    const vistos = /* @__PURE__ */ new Set();
    const calc = (filtro) => {
      out.novos = [];
      out.dup = [];
      out.err = [];
      vistos.clear();
      rows.forEach((r, i) => {
        if (filtro && clean(r.igreja, 80) !== filtro) return;
        const { m, err } = normMembro(r, { id: A.uid(), criado: (/* @__PURE__ */ new Date()).toISOString() });
        if (err) {
          out.err.push("Linha ".concat(i + 2, ": ").concat(err));
          return;
        }
        const k = "".concat(norm(m.nome), "|").concat(m.dataNascimento || "");
        if (duplicado(m) || vistos.has(k)) {
          out.dup.push(m.nome);
          return;
        }
        vistos.add(k);
        out.novos.push(m);
      });
    };
    const pick = igrejas.length > 1 ? igrejas.find((x) => norm(x).includes(norm(cong()).split(" ").pop())) || "" : "";
    calc(pick);
    const d = dlg("Importar membros \u2014 ".concat(nome), "".concat(igrejas.length > 1 ? '<div class="field"><label for="mi-ig">Igreja / congrega\xE7\xE3o no ficheiro</label><select id="mi-ig"><option value="">Todas ('.concat(rows.length, ")</option>").concat(igrejas.map((x) => "<option".concat(x === pick ? " selected" : "", ">").concat(esc(x), "</option>")).join(""), "</select></div>") : "", "\n      <div data-res></div>"), "Importar");
    const res = () => {
      d.querySelector("[data-res]").innerHTML = "<p><b>".concat(out.novos.length, "</b> novo(s) membro(s) prontos a acrescentar \xB7 <b>").concat(out.dup.length, "</b> j\xE1 registado(s) (ignorados) \xB7 <b>").concat(out.err.length, "</b> com erro.</p>\n      ").concat(out.err.length ? '<details><summary>Ver erros</summary><ul class="mi-err">'.concat(out.err.slice(0, 50).map((x) => "<li>".concat(esc(x), "</li>")).join(""), "</ul></details>") : "", '<p class="hint">Os membros j\xE1 existentes (mesmo BI, ou mesmo nome e data de nascimento) n\xE3o s\xE3o alterados.</p>');
      d.querySelector("[data-ok]").disabled = !out.novos.length;
    };
    res();
    const ig = d.querySelector("#mi-ig");
    if (ig) ig.addEventListener("change", () => {
      calc(ig.value);
      res();
    });
    d.querySelector("[data-ok]").addEventListener("click", () => {
      out.novos.forEach((m) => membros().push(m));
      if (guardar("".concat(out.novos.length, " membro(s) importado(s)."))) {
        d.close();
        renderMem();
      }
    });
  };
  const COLS = [
    ["nome", "Nome"],
    ["genero", "G\xE9nero"],
    ["dataNascimento", "Data de nascimento"],
    ["idade", "Idade"],
    ["faixaEtaria", "Faixa et\xE1ria"],
    ["estadoCivil", "Estado civil"],
    ["nomeConjuge", "Nome do c\xF4njuge"],
    ["nBi", "N\xBA BI"],
    ["nacionalidade", "Nacionalidade"],
    ["infEscolar", "Habilita\xE7\xF5es liter\xE1rias"],
    ["tel", "Telefone"],
    ["email", "Email"],
    ["provincia", "Prov\xEDncia"],
    ["municipio", "Munic\xEDpio"],
    ["morada", "Morada"],
    ["nomePai", "Nome do pai"],
    ["nomeMae", "Nome da m\xE3e"],
    ["situacao", "Situa\xE7\xE3o"],
    ["dataSituacao", "Data da situa\xE7\xE3o"],
    ["departamento", "Departamento"],
    ["cargo", "Cargo"],
    ["funcao", "Fun\xE7\xE3o"],
    ["dataConversao", "Data da convers\xE3o"],
    ["dataBaptismo", "Data do baptismo"],
    ["nCartao", "N\xBA cart\xE3o"],
    ["dataRegisto", "Data de registo"],
    ["igreja", "Igreja"],
    ["obs", "Observa\xE7\xF5es"]
  ];
  const aoaMem = (L) => [COLS.map((c) => c[1]), ...L.map((m) => COLS.map(([k]) => {
    var _a;
    return (_a = k === "idade" ? idade(m.dataNascimento) : k === "faixaEtaria" ? faixa(idade(m.dataNascimento)) : k === "igreja" ? m.igreja || cong() : DATAS.includes(k) ? fmtD(m[k]) : m[k]) != null ? _a : "";
  }))];
  const exportar = async (fmt) => {
    if (!can("mem", "read")) {
      A.toast("O seu perfil n\xE3o tem acesso aos membros.");
      return;
    }
    const L = filtrados();
    const base = "Membros_".concat(A.slug(cong()), "_").concat(hoje());
    if (fmt === "xlsx") {
      const b = xlsx(base, [["Membros", aoaMem(L)]]);
      if (b) await enviar(b, "".concat(base, ".xlsx"), "Membros \u2014 ".concat(cong()));
    }
    if (fmt === "csv") await enviar(csv(aoaMem(L)), "".concat(base, ".csv"), "Membros \u2014 ".concat(cong()));
    if (fmt === "sede") {
      const all = membros().map((m) => ({ ...m, igreja: m.igreja || cong(), idade: idade(m.dataNascimento), faixaEtaria: faixa(idade(m.dataNascimento)) || m.faixaEtaria || "" }));
      const pk = { formato: "mm-congregacao-membros", versao: 1, congregacao: cong(), gerado: (/* @__PURE__ */ new Date()).toISOString(), total: all.length, members: all };
      const r = await enviar(new Blob([JSON.stringify(pk)], { type: "application/json" }), "Membros_para_a_sede_".concat(A.slug(cong()), "_").concat(hoje(), ".json"), "Base de dados dos membros \u2014 ".concat(cong(), " (").concat(all.length, ")"));
      if (r !== "cancelado" && r !== "falhou") {
        S().membrosEnviado = (/* @__PURE__ */ new Date()).toISOString();
        guardar();
      }
    }
    if (fmt === "print") imprimirHTML('<article class="sheet p-sheet">'.concat(cabecalho(), "<h2>Base de dados dos membros \u2014 ").concat(esc(cong()), "</h2><p>").concat(L.length, " membro(s) \xB7 ").concat(esc((/* @__PURE__ */ new Date()).toLocaleDateString("pt-PT")), '</p>\n      <table class="p-list"><thead><tr><th>N\xBA</th><th>Nome</th><th>G\xE9nero</th><th>Idade</th><th>Telefone</th><th>Departamento</th><th>Fun\xE7\xE3o</th><th>Situa\xE7\xE3o</th></tr></thead><tbody>').concat(L.map((m, i) => "<tr><td>".concat(i + 1, "</td><td>").concat(esc(m.nome), "</td><td>").concat(esc(m.genero || ""), "</td><td>").concat(esc(idade(m.dataNascimento) == null ? "" : idade(m.dataNascimento)), "</td><td>").concat(esc(m.tel || ""), "</td><td>").concat(esc(m.departamento || ""), "</td><td>").concat(esc(m.funcao || ""), "</td><td>").concat(esc(m.situacao || ""), "</td></tr>")).join(""), "</tbody></table></article>"), "A4 landscape");
  };
  let fichaId = null;
  const fichaHTML = (m) => {
    const it = (k, v) => '<div class="mf-it"><span>'.concat(esc(k), "</span><b>").concat(v ? esc(v) : "\u2014", "</b></div>");
    const a = idade(m.dataNascimento);
    const n = /* @__PURE__ */ new Date();
    const badge = m.situacao ? '<span class="mf-tag '.concat(m.situacao === "Ativo" ? "ok" : m.situacao === "Em Disciplina" ? "bad" : "warn", '">').concat(esc(m.situacao), "</span>") : "";
    return "".concat(cabecalho(), '<div class="mf-topo"><div><h2 class="mf-nome">').concat(esc(m.nome), '</h2><p class="mf-tags">').concat(m.cargo ? '<span class="mf-tag">'.concat(esc(m.cargo), "</span>") : "").concat(m.departamento ? '<span class="mf-tag">'.concat(esc(m.departamento), "</span>") : "").concat(badge, '</p></div>\n        <div class="mf-fotoficha">').concat(fotoOk(m.foto) ? '<img src="'.concat(m.foto, '" alt="Fotografia de ').concat(esc(m.nome), '">') : "FOTO", '</div></div>\n      <div class="mf-grid c2">').concat(it("Data da situa\xE7\xE3o", fmtD(m.dataSituacao))).concat(it("Fun\xE7\xE3o / Igreja", "".concat(m.funcao || "\u2014", " \xB7 ").concat(cong())), '</div>\n      <h3 class="mf-sec">Dados pessoais</h3><div class="mf-grid">').concat(it("N\xBA do Bilhete de Identidade", m.nBi)).concat(it("G\xE9nero", m.genero)).concat(it("Estado civil", m.estadoCivil)).concat(it("Nome do c\xF4njuge", m.nomeConjuge)).concat(it("Data de nascimento", fmtD(m.dataNascimento))).concat(it("Idade", a === null ? "" : "".concat(a, " anos"))).concat(it("Nacionalidade", m.nacionalidade)).concat(it("Habilita\xE7\xF5es liter\xE1rias", m.infEscolar), '</div>\n      <h3 class="mf-sec">Contactos</h3><div class="mf-grid c2">').concat(it("Telefone", m.tel)).concat(it("E-mail", m.email), '</div>\n      <h3 class="mf-sec">Endere\xE7o</h3><div class="mf-grid">').concat(it("Prov\xEDncia", m.provincia)).concat(it("Munic\xEDpio", m.municipio)).concat(it("Morada", m.morada), '</div>\n      <h3 class="mf-sec">Filia\xE7\xE3o</h3><div class="mf-grid c2">').concat(it("Nome do pai", m.nomePai)).concat(it("Nome da m\xE3e", m.nomeMae), '</div>\n      <h3 class="mf-sec">Dados eclesi\xE1sticos</h3><div class="mf-grid">').concat(it("Data da convers\xE3o", fmtD(m.dataConversao))).concat(it("Data do baptismo", fmtD(m.dataBaptismo))).concat(it("N\xBA do cart\xE3o", m.nCartao)).concat(it("Situa\xE7\xE3o", m.situacao)).concat(it("Data da situa\xE7\xE3o", fmtD(m.dataSituacao))).concat(it("Data de registo", fmtD(m.dataRegisto)), '</div>\n      <h3 class="mf-sec">Observa\xE7\xE3o</h3><div class="mf-obs">').concat(esc(m.obs || "") || "&nbsp;", '</div>\n      <div class="mf-rodape"><p>Ficha gerada em ').concat(esc(n.toLocaleDateString("pt-PT")), " \xE0s ").concat(esc(n.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })), '</p>\n        <div class="mf-assin"><span></span><p>O Secret\xE1rio<br><b>').concat(esc(S().perfil.secretario || ""), '</b></p></div><div class="mf-assin"><span></span><p>O L\xEDder<br><b>').concat(esc(S().perfil.lider || ""), "</b></p></div></div>");
  };
  const renderFicha = () => {
    const box = $("#tab-ficha");
    if (!box) return;
    const L = membros().slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
    if (fichaId && !L.some((m2) => m2.id === fichaId)) fichaId = null;
    $("#fi-sel").innerHTML = '<option value="">\u2014 escolha um membro ('.concat(L.length, ") \u2014</option>").concat(L.map((m2) => '<option value="'.concat(esc(m2.id), '"').concat(m2.id === fichaId ? " selected" : "", ">").concat(esc(m2.nome)).concat(m2.nBi ? " \xB7 BI ".concat(esc(m2.nBi)) : "", "</option>")).join(""));
    const m = L.find((x) => x.id === fichaId);
    $("#fi-folha").innerHTML = m ? fichaHTML(m) : '<p class="vazio">'.concat(L.length ? "Escolha um membro (ou escreva o nome na pesquisa) para ver a ficha individual, pronta a imprimir em A4." : "Ainda n\xE3o h\xE1 membros. Registe-os no separador \xABMembros\xBB.", "</p>");
    $("#fi-print").disabled = !m;
    $("#fi-edit").hidden = !m || !can("mem");
    $("#fi-prev").disabled = !m;
    $("#fi-next").disabled = !m;
  };
  const abrirFicha = (id) => {
    fichaId = id;
    A.setTab("ficha");
    renderFicha();
  };
  const fI = { q: "", cat: "", est: "" };
  const invFiltrado = () => {
    const q = norm(fI.q);
    return inventario().filter((i) => (!q || norm("".concat(i.item, " ").concat(i.categoria, " ").concat(i.localizacao, " ").concat(i.observacoes)).includes(q)) && (!fI.cat || i.categoria === fI.cat) && (!fI.est || i.estado === fI.est)).sort((a, b) => (a.categoria || "").localeCompare(b.categoria || "", "pt") || a.item.localeCompare(b.item, "pt"));
  };
  const kz = (n) => Number(n || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const renderInv = () => {
    const box = $("#tab-inv");
    if (!box) return;
    const L = inventario();
    const ed = can("inv");
    const tot = L.reduce((s, i) => s + (Number(i.quantidade) || 0), 0);
    const val = L.reduce((s, i) => s + (Number(i.valor) || 0) * (Number(i.quantidade) || 1), 0);
    $("#inv-kpis").innerHTML = kpi(L.length, "Itens registados") + kpi(tot, "Quantidade total") + kpi(uniq(L.map((i) => i.categoria)).length, "Categorias") + kpi(L.filter((i) => i.estado === "Mau" || i.estado === "Danificado").length, "Maus / danificados", "neg") + kpi("".concat(kz(val), " Kz"), "Valor estimado");
    $("#inv-fil").innerHTML = '<div class="field"><label for="if-q">Pesquisar</label><input id="if-q" type="search" value="'.concat(esc(fI.q), '" placeholder="Item, categoria ou local" autocomplete="off"></div>\n      <div class="field"><label for="if-cat">Categoria</label><select id="if-cat">').concat(opts(uniq(L.map((i) => i.categoria)), fI.cat, "Todas"), '</select></div>\n      <div class="field"><label for="if-est">Estado</label><select id="if-est">').concat(opts(ESTADOS_INV, fI.est, "Todos"), "</select></div>");
    $("#inv-bar").querySelectorAll("[data-ed]").forEach((b) => {
      b.hidden = !ed;
    });
    listaInv();
  };
  const listaInv = () => {
    const F = invFiltrado();
    const ed = can("inv");
    $("#inv-conta").textContent = "".concat(F.length, " de ").concat(inventario().length, " item(ns)");
    $("#inv-lista").innerHTML = F.map((i) => '<li><div class="l-main"><b>'.concat(esc(i.item), "</b><small>").concat([i.categoria, i.localizacao, i.dataAquisicao ? "adquirido ".concat(fmtD(i.dataAquisicao)) : "", i.valor ? "".concat(kz(i.valor), " Kz") : ""].filter(Boolean).map(esc).join(" \xB7 "), '</small></div>\n      <div class="l-val"><span class="mf-tag ').concat(i.estado === "Bom" ? "ok" : i.estado === "Mau" || i.estado === "Danificado" ? "bad" : "warn", '">').concat(esc(i.estado || "\u2014"), "</span> \xD7 ").concat(esc(i.quantidade == null ? "\u2014" : i.quantidade), "</div>\n      ").concat(ed ? '<div class="l-acts"><button type="button" class="btn small" data-iedit="'.concat(esc(i.id), '" aria-label="Editar ').concat(esc(i.item), '">Editar</button><button type="button" class="btn small danger" data-idel="').concat(esc(i.id), '" aria-label="Eliminar ').concat(esc(i.item), '">Eliminar</button></div>') : "", "</li>")).join("") || '<li class="vazio">'.concat(inventario().length ? "Nenhum item corresponde aos filtros." : "Ainda n\xE3o h\xE1 itens no invent\xE1rio. Use \xAB+ Novo item\xBB.", "</li>");
  };
  const editarItem = (id) => {
    if (!can("inv")) {
      A.toast("O seu perfil s\xF3 pode consultar o invent\xE1rio.");
      return;
    }
    const cur = id ? inventario().find((x) => x.id === id) : null;
    const i = cur || { estado: "Bom", quantidade: 1 };
    const cats = uniq(["Mobili\xE1rio", "Som e instrumentos", "Electrodom\xE9sticos", "Material de escrit\xF3rio", "Utens\xEDlios", "Decora\xE7\xE3o", ...inventario().map((x) => x.categoria)]);
    const d = dlg(cur ? "Editar item \u2014 ".concat(cur.item) : "Novo item do invent\xE1rio", '<div class="grid">\n      <div class="field full"><label for="iv-item">Item *</label><input id="iv-item" maxlength="100" value="'.concat(esc(i.item || ""), '" required aria-required="true"></div>\n      <div class="field"><label for="iv-cat">Categoria</label><input id="iv-cat" list="dl-ivcat" maxlength="60" value="').concat(esc(i.categoria || ""), '" autocomplete="off"><datalist id="dl-ivcat">').concat(cats.map((c) => '<option value="'.concat(esc(c), '">')).join(""), '</datalist></div>\n      <div class="field"><label for="iv-qtd">Quantidade *</label><input id="iv-qtd" type="number" inputmode="numeric" min="0" step="1" value="').concat(esc(i.quantidade == null ? "" : i.quantidade), '" required aria-required="true"></div>\n      <div class="field"><label for="iv-est">Estado</label><select id="iv-est">').concat(opts(ESTADOS_INV, i.estado), '</select></div>\n      <div class="field"><label for="iv-loc">Localiza\xE7\xE3o</label><input id="iv-loc" maxlength="80" value="').concat(esc(i.localizacao || ""), '"></div>\n      <div class="field"><label for="iv-data">Data de aquisi\xE7\xE3o</label><input id="iv-data" type="date" max="').concat(hoje(), '" value="').concat(esc(i.dataAquisicao || ""), '"></div>\n      <div class="field"><label for="iv-val">Valor unit\xE1rio (Kz)</label><input id="iv-val" type="text" inputmode="decimal" autocomplete="off" placeholder="ex.: 25.000" value="').concat(esc(i.valor ? A.numTxt(i.valor) : ""), '"></div>\n      <div class="field full"><label for="iv-obs">Observa\xE7\xF5es</label><textarea id="iv-obs" rows="2" maxlength="300">').concat(esc(i.observacoes || ""), "</textarea></div></div>"), cur ? "Guardar altera\xE7\xF5es" : "Guardar item");
    const q = (s) => d.querySelector(s);
    const err = q(".err");
    q("[data-ok]").addEventListener("click", () => {
      try {
        const item = clean(q("#iv-item").value, 100);
        const qtd = q("#iv-qtd").value.trim();
        const v = q("#iv-val").value.trim();
        const val = v ? A.num(v) : 0;
        const dt = q("#iv-data").value;
        if (item.length < 2) {
          err.textContent = "Indique o nome do item.";
          q("#iv-item").focus();
          return;
        }
        if (!/^\d{1,6}$/.test(qtd)) {
          err.textContent = "A quantidade tem de ser um n\xFAmero inteiro (0 ou mais).";
          q("#iv-qtd").focus();
          return;
        }
        if (v && !(Number.isFinite(val) && val >= 0)) {
          err.textContent = "Valor inv\xE1lido (ex.: 25.000 ou 1500,50).";
          q("#iv-val").focus();
          return;
        }
        if (dt && (!isoOk(dt) || dt > hoje())) {
          err.textContent = "Data de aquisi\xE7\xE3o inv\xE1lida.";
          q("#iv-data").focus();
          return;
        }
        const n = { item, categoria: clean(q("#iv-cat").value, 60), quantidade: +qtd, estado: q("#iv-est").value, localizacao: clean(q("#iv-loc").value, 80), dataAquisicao: dt, valor: val || 0, observacoes: clean(q("#iv-obs").value, 300), alterado: (/* @__PURE__ */ new Date()).toISOString() };
        if (cur) Object.assign(cur, n);
        else inventario().push({ id: A.uid(), criado: (/* @__PURE__ */ new Date()).toISOString(), ...n });
        if (guardar(cur ? "Item actualizado." : "Item registado.")) {
          d.close();
          renderInv();
        }
      } catch (x) {
        err.textContent = "Erro: ".concat(x.message);
      }
    });
    setTimeout(() => q("#iv-item").focus(), 50);
  };
  const eliminarItem = async (id) => {
    if (!can("inv")) return;
    const i = inventario().find((x) => x.id === id);
    if (!i) return;
    if (!await A.confirmar("Eliminar item", "Eliminar \xAB".concat(i.item, "\xBB do invent\xE1rio?"), "Eliminar")) return;
    S().inventario = inventario().filter((x) => x !== i);
    if (guardar("Item eliminado.")) renderInv();
  };
  const INV_COLS = [["item", "Item"], ["categoria", "Categoria"], ["quantidade", "Quantidade"], ["estado", "Estado"], ["localizacao", "Localiza\xE7\xE3o"], ["dataAquisicao", "Data de aquisi\xE7\xE3o"], ["valor", "Valor unit\xE1rio (Kz)"], ["observacoes", "Observa\xE7\xF5es"]];
  const exportarInv = async (fmt) => {
    if (!can("inv", "read")) {
      A.toast("O seu perfil n\xE3o tem acesso ao invent\xE1rio.");
      return;
    }
    const L = invFiltrado();
    const base = "Inventario_".concat(A.slug(cong()), "_").concat(hoje());
    const aoa = [INV_COLS.map((c) => c[1]), ...L.map((i) => INV_COLS.map(([k]) => k === "dataAquisicao" ? fmtD(i[k]) : i[k] == null ? "" : i[k]))];
    if (fmt === "xlsx") {
      const b = xlsx(base, [["Invent\xE1rio", aoa]]);
      if (b) await enviar(b, "".concat(base, ".xlsx"), "Invent\xE1rio \u2014 ".concat(cong()));
    }
    if (fmt === "csv") await enviar(csv(aoa), "".concat(base, ".csv"), "Invent\xE1rio \u2014 ".concat(cong()));
    if (fmt === "sede") await enviar(new Blob([JSON.stringify({ formato: "mm-congregacao-inventario", versao: 1, congregacao: cong(), gerado: (/* @__PURE__ */ new Date()).toISOString(), inventario: inventario() })], { type: "application/json" }), "Inventario_para_a_sede_".concat(A.slug(cong()), "_").concat(hoje(), ".json"), "Invent\xE1rio \u2014 ".concat(cong()));
    if (fmt === "print") imprimirHTML('<article class="sheet p-sheet">'.concat(cabecalho(), "<h2>Invent\xE1rio \u2014 ").concat(esc(cong()), "</h2><p>").concat(L.length, " item(ns) \xB7 ").concat(esc((/* @__PURE__ */ new Date()).toLocaleDateString("pt-PT")), '</p>\n      <table class="p-list"><thead><tr><th>Item</th><th>Categoria</th><th>Qtd.</th><th>Estado</th><th>Localiza\xE7\xE3o</th><th>Aquisi\xE7\xE3o</th><th>Valor (Kz)</th></tr></thead><tbody>').concat(L.map((i) => "<tr><td>".concat(esc(i.item), "</td><td>").concat(esc(i.categoria || ""), "</td><td>").concat(esc(i.quantidade), "</td><td>").concat(esc(i.estado || ""), "</td><td>").concat(esc(i.localizacao || ""), "</td><td>").concat(esc(fmtD(i.dataAquisicao)), "</td><td>").concat(i.valor ? kz(i.valor) : "", "</td></tr>")).join(""), '</tbody></table>\n      <div class="v20-assin"><div><p>O(A) Tesoureiro(a)</p><span></span><p>').concat(esc(S().perfil.responsavel || ""), "</p></div><div><p>O L\xEDder</p><span></span><p>").concat(esc(S().perfil.lider || ""), "</p></div></div></article>"));
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest(".tab");
    if (t) {
      const k = t.dataset.tab;
      try {
        t.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch (_) {
      }
      if (k === "mem") renderMem();
      else if (k === "ficha") renderFicha();
      else if (k === "inv") renderInv();
      return;
    }
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.mficha) abrirFicha(b.dataset.mficha);
    else if (b.dataset.medit) editarMembro(b.dataset.medit);
    else if (b.dataset.mdel) eliminarMembro(b.dataset.mdel);
    else if (b.dataset.iedit) editarItem(b.dataset.iedit);
    else if (b.dataset.idel) eliminarItem(b.dataset.idel);
    else if (b.dataset.mexp) exportar(b.dataset.mexp);
    else if (b.dataset.iexp) exportarInv(b.dataset.iexp);
    else if (b.id === "mem-novo") editarMembro(null);
    else if (b.id === "mem-imp") importar();
    else if (b.id === "mem-rep") repor();
    else if (b.id === "inv-novo") editarItem(null);
    else if (b.id === "fi-print") {
      const m = membros().find((x) => x.id === fichaId);
      if (m) imprimirHTML('<article class="sheet p-sheet mf-ficha">'.concat(fichaHTML(m), "</article>"));
    } else if (b.id === "fi-edit") editarMembro(fichaId);
    else if (b.id === "fi-prev" || b.id === "fi-next") {
      const L = membros().slice().sort((a, c) => a.nome.localeCompare(c.nome, "pt"));
      const i = L.findIndex((m) => m.id === fichaId);
      const j = i + (b.id === "fi-next" ? 1 : -1);
      if (L[j]) {
        fichaId = L[j].id;
        renderFicha();
      }
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "mf-q") {
      fM.q = e.target.value;
      listaMem();
    }
    if (e.target.id === "if-q") {
      fI.q = e.target.value;
      listaInv();
    }
    if (e.target.id === "fi-q") {
      const q = norm(e.target.value);
      const m = q.length >= 2 && membros().filter((x) => norm("".concat(x.nome, " ").concat(x.nBi, " ").concat(x.nCartao)).includes(q)).sort((a, b) => a.nome.localeCompare(b.nome, "pt"))[0];
      if (m && m.id !== fichaId) {
        fichaId = m.id;
        renderFicha();
      }
    }
  });
  document.addEventListener("change", (e) => {
    const id = e.target.id;
    if (id === "mf-sit" || id === "mf-gen" || id === "mf-dep" || id === "mf-fx") {
      fM[id.slice(3)] = e.target.value;
      listaMem();
    }
    if (id === "if-cat" || id === "if-est") {
      fI[id.slice(3)] = e.target.value;
      listaInv();
    }
    if (id === "fi-sel") {
      fichaId = e.target.value || null;
      renderFicha();
    }
  });
  window.CongMembros = { renderMem, renderFicha, renderInv, normMembro, idade, faixa };
})();
