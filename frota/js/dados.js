(() => {
  "use strict";
  const { $, esc, kz } = F;
  const CONJ = [
    ["barcos", "Embarcações", "barcos"],
    ["entradas", "Entradas", "fin"],
    ["saidas", "Saídas", "fin"],
    ["salario", "Salário (calculado)", "fin"],
    ["contas", "Contas de viagem", "contas"],
    ["pagamentos", "Salários pagos", "sal"],
    ["viagens", "Inventário (viagens)", "inv"],
    ["colab", "Colaboradores", "colab"],
    ["embarques", "Embarcadores (embarques)", "colab"]
  ];
  const st = { barco: "todas", ano: "todos", sel: ["barcos", "entradas", "saidas", "contas", "pagamentos", "viagens", "colab", "embarques"], csv: "entradas" };
  const passa = (x) => {
    const d = String(x.data || x.partida || x.embarque || "");
    return (st.barco === "todas" || x.barco === st.barco || x.id === st.barco) && (st.ano === "todos" || d.startsWith(st.ano) || !d);
  };
  const pode = (k) => F.pode(CONJ.find((c) => c[0] === k)[2], "read");
  const recs = (k) => k === "salario" ? [] : (F.S[k] || []).filter((x) => k === "barcos" ? st.barco === "todas" || x.id === st.barco : k === "colab" ? st.barco === "todas" || x.barco === st.barco || !x.barco : passa(x));
  const N = (id) => window.Barcos.nome(id);
  const linhas = {
    barcos: () => recs("barcos").map((b) => ({ Embarcação: b.nome, Implementação: F.fmtData(b.implantacao), "Tempo de actividade": F.tempoTxt(F.tempo(b.implantacao)), "1.º representante": b.rep1, "2.º representante": b.rep2, Activa: b.ativo === false ? "não" : "sim", Observações: b.obs })),
    entradas: () => recs("entradas").sort((a, b) => a.data.localeCompare(b.data)).map((x) => ({ Data: x.data, Embarcação: N(x.barco), Descrição: x.descricao, "Valor (Kz)": x.valor, "Manutenção (Kz)": x.manutencao || 0, Observação: x.obs || "" })),
    saidas: () => recs("saidas").sort((a, b) => a.data.localeCompare(b.data)).map((x) => ({ Data: x.data, Embarcação: N(x.barco), "Descontado em": x.tipo, Descrição: x.descricao, "Valor (Kz)": x.valor, Observação: x.obs || "" })),
    salario: () => window.Barcos.todos().filter((b) => st.barco === "todas" || b.id === st.barco).map((b) => {
      const c = window.Fin.contas(b.id, passa);
      const g = F.S.regra;
      return { Embarcação: b.nome, Entradas: c.receita, Empresa: c.empresa, Restante: c.restante, [g.nome1]: c.rep1, [g.nome2]: c.rep2, "Saídas de caixa": c.saiCaixa, "Em caixa": c.caixa, "Manutenção (entradas)": c.manutEnt, "Manutenção (saídas)": c.saiManut, "Manutenção disponível": c.manut };
    }),
    viagens: () => recs("viagens").flatMap((v) => v.itens.map((it) => {
      var _a, _b;
      return { Embarcação: N(v.barco), Partida: v.partida, Regresso: v.regresso || "", Categoria: it.cat, Item: it.nome, "Qtd. partida": (_a = it.p) != null ? _a : "", "Qtd. chegada": (_b = it.c) != null ? _b : "", Diferença: it.p !== null && it.c !== null ? it.c - it.p : "", Estado: { ok: "OK", alerta: "ALERTA", consumo: "consumo", falta: "contagem em falta", vazio: "" }[window.Inv.estado(it)], Observação: it.obs || "" };
    })),
    contas: () => recs("contas").map((c) => {
      const k = window.Contas.calc(c, c.regra);
      const o = { Data: c.data, Embarcação: N(c.barco), Referência: c.ref, "Valor bruto": k.bruto, Despesas: k.desp, Descontos: k.desc, "A distribuir": k.base };
      [...k.partes, ...k.divisao].forEach((p) => {
        o[p.nome] = p.valor;
      });
      return o;
    }),
    pagamentos: () => recs("pagamentos").map((p) => ({ Período: p.periodo, Beneficiário: p.beneficiario, Categoria: p.categoria, Embarcação: p.barco ? N(p.barco) : "", Devido: p.devido, Pago: p.pago, "Por pagar": F.r2(p.devido - p.pago), Estado: window.Salarios.estado(p), Recibos: (p.movs || []).map((m) => "".concat(m.recibo, " (").concat(m.data, ")")).join("; ") })),
    embarques: () => recs("embarques").map((e) => ({ Embarcador: e.nome, Embarcação: N(e.barco), Função: e.funcao, Embarque: e.embarque, Desembarque: e.desembarque || "", "Dias a bordo": window.Embarc.dias(e), Estado: window.Embarc.estado(e), Observações: e.obs || "" })),
    colab: () => recs("colab").map((c) => {
      var _a, _b;
      return { Nome: c.nome, Nascimento: c.nasc, Idade: (_b = (_a = F.tempo(c.nasc)) == null ? void 0 : _a.anos) != null ? _b : "", Função: c.funcao, Cargo: c.cargo, Embarcação: c.barco ? N(c.barco) : "", Contacto: c.contacto, Morada: c.morada };
    })
  };
  const nomeF = (ext) => "Frota_Ebenezer_".concat(st.barco === "todas" ? "todas" : F.clean(N(st.barco)).replace(/\W+/g, "_"), "_").concat(st.ano, "_").concat(F.hoje(), ".").concat(ext);
  const registar = (formato, r) => {
    if (r === "cancelado" || r === "falhou") return;
    F.S.envios.push({ ts: (/* @__PURE__ */ new Date()).toISOString(), formato, conjuntos: st.sel.slice(), por: F.user.user });
    F.guardar();
    render();
    F.toast(r === "partilhado" ? "Ficheiro partilhado." : "Ficheiro guardado em Transferências.");
  };
  const exportar = async (fmt) => {
    try {
      const sel = st.sel.filter(pode);
      if (!sel.length) {
        F.toast("Escolha pelo menos um conjunto de dados.", "erro");
        return;
      }
      if (fmt === "json") {
        const dados = {};
        sel.filter((k) => k !== "salario").forEach((k) => {
          dados[k] = recs(k);
        });
        if (sel.some((k) => k !== "barcos" && k !== "salario")) dados.barcos = F.S.barcos;
        const p = { formato: "ebenezer-frota", versao: 1, gerado: (/* @__PURE__ */ new Date()).toISOString(), origem: { user: F.user.user, nome: F.user.nome }, filtros: { barco: st.barco === "todas" ? "todas" : N(st.barco), ano: st.ano }, dados, assinatura: F.hash(JSON.stringify(dados)) };
        registar("json", await F.partilhar(new Blob([JSON.stringify(p)], { type: "application/json" }), nomeF("json"), "Pacote da Frota Ebenézer"));
      } else if (fmt === "xlsx") {
        if (typeof XLSX === "undefined") throw new Error("biblioteca Excel indisponível");
        const wb = XLSX.utils.book_new();
        sel.forEach((k) => {
          const L = linhas[k]();
          XLSX.utils.book_append_sheet(wb, L.length ? XLSX.utils.json_to_sheet(L) : XLSX.utils.aoa_to_sheet([["Sem registos"]]), CONJ.find((c) => c[0] === k)[1].slice(0, 31));
        });
        registar("xlsx", await F.partilhar(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), nomeF("xlsx")));
      } else if (fmt === "csv") {
        if (!pode(st.csv)) return;
        const L = linhas[st.csv]();
        if (!L.length) {
          F.toast("Sem registos para exportar.", "erro");
          return;
        }
        const cab = Object.keys(L[0]);
        const cel = (v) => {
          const s = String(v != null ? v : "");
          return /[";\n]/.test(s) ? '"'.concat(s.replace(/"/g, '""'), '"') : s;
        };
        registar("csv", await F.partilhar(new Blob(["\uFEFF".concat([cab.map(cel).join(";"), ...L.map((r) => cab.map((h) => cel(r[h])).join(";"))].join("\r\n"))], { type: "text/csv;charset=utf-8" }), nomeF("csv").replace(".csv", "_".concat(st.csv, ".csv"))));
      } else if (fmt === "txt") {
        const t = resumo();
        try {
          if (navigator.share) await navigator.share({ title: "Frota Ebenézer", text: t });
          else {
            await navigator.clipboard.writeText(t);
            F.toast("Resumo copiado: cole no WhatsApp ou SMS.");
          }
        } catch (e) {
          if (e.name !== "AbortError") {
            try {
              await navigator.clipboard.writeText(t);
              F.toast("Resumo copiado.");
            } catch (_) {
              F.toast("Não foi possível partilhar o texto.", "erro");
            }
          }
        }
      } else if (fmt === "print") F.papelDlg("Relatório geral", relatorio);
      else if (fmt === "png") {
        const r = await F.imagem(relatorio(), "Frota_Ebenezer_".concat(F.hoje()));
        registar("png", r);
      }
    } catch (e) {
      F.toast("Não foi possível exportar: ".concat(e.message), "erro");
    }
  };
  const resumo = () => {
    const L = ["*Frota Ebenézer* — ".concat(st.ano === "todos" ? "todos os anos" : st.ano)];
    if (F.pode("fin", "read")) window.Barcos.todos().filter((b) => st.barco === "todas" || b.id === st.barco).forEach((b) => {
      const c = window.Fin.contas(b.id, passa);
      if (c.nE || c.nS) L.push("".concat(b.nome, ": entradas ").concat(kz(c.receita), " · caixa ").concat(kz(c.caixa), " · manutenção ").concat(kz(c.manut), " Kz"));
    });
    if (F.pode("inv", "read")) {
      const A = window.Inv.comAlertas().filter(passa);
      L.push("Viagens com alertas de inventário: ".concat(A.length));
    }
    if (F.pode("colab", "read")) {
      const P = window.Colab.proximos(7);
      if (P.length) L.push("Aniversários (7 dias): ".concat(P.map((c) => c.nome).join(", ")));
    }
    L.push("Enviado por: ".concat(F.user.nome));
    return L.join("\n");
  };
  const relatorio = () => st.sel.filter(pode).map((k) => {
    const L = linhas[k]();
    const cab = L.length ? Object.keys(L[0]) : [];
    return "<h2>".concat(esc(CONJ.find((c) => c[0] === k)[1]), "</h2>").concat(F.tabela(cab.map((h) => ({ t: h, f: (r) => esc(typeof r[h] === "number" ? kz(r[h]) : r[h]), num: typeof (L[0] || {})[h] === "number" })), L, "Sem registos."));
  }).join("");
  const lerFicheiros = (multiplos) => new Promise((res) => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = ".json,application/json,text/plain,.txt";
    i.multiple = multiplos;
    i.className = "ficheiro-oculto";
    i.tabIndex = -1;
    i.setAttribute("aria-hidden", "true");
    i.addEventListener("change", () => {
      res([...i.files || []]);
      i.remove();
    });
    document.body.appendChild(i);
    i.click();
  });
  const planear = (pacotes) => {
    const plano = { novos: 0, actual: 0, iguais: 0, por: {}, ops: [], avisos: [] };
    pacotes.forEach(({ p, nome }) => {
      if (p.formato !== "ebenezer-frota" || p.versao !== 1 || !p.dados) {
        plano.avisos.push("".concat(nome, ": não é um pacote da Frota Ebenézer."));
        return;
      }
      if (p.assinatura !== F.hash(JSON.stringify(p.dados))) plano.avisos.push("".concat(nome, ": o conteúdo foi alterado depois de exportado (assinatura não confere)."));
      const mapa = {};
      (p.dados.barcos || []).forEach((b) => {
        const loc = F.S.barcos.find((x) => x.id === b.id) || F.S.barcos.find((x) => F.norm(x.nome) === F.norm(b.nome));
        mapa[b.id] = loc ? loc.id : b.id;
        if (!loc) plano.ops.push({ k: "barcos", rec: { ...b, nome: F.clean(b.nome, 60).toUpperCase() }, tipo: "novo" });
      });
      ["entradas", "saidas", "viagens", "colab", "contas", "pagamentos", "embarques"].forEach((k) => (p.dados[k] || []).forEach((r0) => {
        const r = JSON.parse(JSON.stringify(r0));
        if (r.barco) r.barco = mapa[r.barco] || r.barco;
        ["descricao", "obs", "nome", "morada", "funcao", "cargo", "contacto", "ref", "beneficiario", "categoria"].forEach((f) => {
          if (typeof r[f] === "string") r[f] = F.clean(r[f], f === "obs" ? 600 : 160);
        });
        if (k === "viagens" && Array.isArray(r.itens)) r.itens = r.itens.map((it) => ({ cat: F.clean(it.cat, 60), nome: F.clean(it.nome, 60), consumivel: !!it.consumivel, p: Number.isInteger(it.p) && it.p >= 0 ? it.p : null, c: Number.isInteger(it.c) && it.c >= 0 ? it.c : null, obs: F.clean(it.obs, 120) }));
        if ((k === "entradas" || k === "saidas") && !(Number(r.valor) >= 0)) return;
        if (k === "contas" && !(Number(r.bruto) > 0)) return;
        if (k === "pagamentos" && !(Number(r.devido) > 0)) return;
        const L = F.S[k];
        const igualA = (x) => x.id === r.id || k === "viagens" && x.barco === r.barco && x.partida === r.partida || k === "colab" && F.norm(x.nome) === F.norm(r.nome) && x.nasc === r.nasc || (k === "entradas" || k === "saidas") && x.barco === r.barco && x.data === r.data && x.descricao === r.descricao && x.valor === r.valor || k === "contas" && x.barco === r.barco && x.data === r.data && x.ref === r.ref || k === "embarques" && F.norm(x.nome) === F.norm(r.nome) && x.barco === r.barco && x.embarque === r.embarque || k === "pagamentos" && x.beneficiario === r.beneficiario && x.periodo === r.periodo && x.categoria === r.categoria && x.devido === r.devido;
        const loc = L.find(igualA);
        const novoQue = (a, b) => String(a.alterado || a.criado || "") > String(b.alterado || b.criado || "");
        const conta = (t) => {
          plano.por[k] = plano.por[k] || { novo: 0, actual: 0, igual: 0 };
          plano.por[k][t]++;
        };
        if (!loc) {
          plano.ops.push({ k, rec: r, tipo: "novo" });
          conta("novo");
        } else if (JSON.stringify({ ...loc, id: 0 }) !== JSON.stringify({ ...r, id: 0 }) && novoQue(r, loc)) {
          plano.ops.push({ k, rec: r, alvo: loc, tipo: "actual" });
          conta("actual");
        } else conta("igual");
      }));
    });
    return plano;
  };
  const compilar = async () => {
    if (!F.isAdmin()) return;
    const fs = await lerFicheiros(true);
    if (!fs.length) return;
    const pacotes = [];
    for (const f of fs) {
      try {
        if (f.size > 2e7) throw new Error("demasiado grande");
        pacotes.push({ p: JSON.parse(await f.text()), nome: f.name });
      } catch (e) {
        F.toast("".concat(f.name, ": ").concat(e.message), "erro");
      }
    }
    const pl = planear(pacotes);
    const nomes = Object.fromEntries(CONJ);
    const m = F.modal({ titulo: "Compilar pacotes", largo: true, corpo: "".concat(pl.avisos.length ? '<div class="alerta perigo" role="alert"><ul>'.concat(pl.avisos.map((a) => "<li>".concat(esc(a), "</li>")).join(""), "</ul></div>") : '<div class="alerta ok" role="status">✔ Integridade verificada.</div>', "\n      ").concat(F.tabela([{ t: "Dados", f: (r) => esc(nomes[r.k] || r.k) }, { t: "Novos", f: (r) => r.novo, num: true }, { t: "Actualizados", f: (r) => r.actual, num: true }, { t: "Já existentes", f: (r) => r.igual, num: true }], Object.entries(pl.por).map(([k, v]) => ({ k, ...v })), "Nada a compilar."), '\n      <p class="dica">Embarcações novas a criar: ').concat(pl.ops.filter((o) => o.k === "barcos").length, ". Registos com a mesma identificação ou o mesmo conteúdo não se duplicam; uma versão mais recente substitui a anterior.</p>"), botoes: [{ id: "c", label: "Cancelar" }, { id: "g", label: "Compilar", classe: "prim" }] });
    m.on("c", () => m.fechar());
    m.on("g", () => {
      pl.ops.forEach((o) => {
        if (o.tipo === "novo") F.S[o.k].push(o.rec);
        else Object.assign(o.alvo, o.rec, { id: o.alvo.id });
      });
      pacotes.forEach(({ p }) => F.S.importados.push({ ts: (/* @__PURE__ */ new Date()).toISOString(), origem: p.origem, gerado: p.gerado }));
      F.guardar();
      m.fechar();
      render();
      F.toast("Compilação concluída: ".concat(pl.ops.length, " registo(s) novos ou actualizados."));
    });
  };
  const copia = async () => {
    const r = await F.partilhar(new Blob([JSON.stringify({ formato: "ebenezer-frota-backup", versao: 1, gerado: (/* @__PURE__ */ new Date()).toISOString(), dados: F.S })], { type: "application/json" }), "Copia_Frota_Ebenezer_".concat(F.hoje(), ".json"), "Cópia de segurança");
    if (r !== "cancelado" && r !== "falhou") {
      F.S.ultBackup = (/* @__PURE__ */ new Date()).toISOString();
      F.guardar();
      render();
      F.toast("Cópia feita. Guarde-a fora deste aparelho.");
    }
  };
  const restaurar = async () => {
    if (!F.isAdmin()) return;
    const [f] = await lerFicheiros(false);
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.formato !== "ebenezer-frota-backup" || !d.dados || d.dados.v !== 1) throw new Error("não é uma cópia de segurança da Frota Ebenézer");
      if (!await F.confirmar("Restaurar cópia", "Substituir TODOS os dados deste aparelho pela cópia de ".concat(new Date(d.gerado).toLocaleString("pt-PT"), "? A sessão será terminada."), "Restaurar")) return;
      F.S = { ...F.novo(), ...d.dados };
      F.guardar();
      F.toast("Cópia restaurada. Entre de novo.");
      setTimeout(() => document.getElementById("sair").click(), 400);
    } catch (e) {
      F.toast("Restauro falhou: ".concat(e.message), "erro");
    }
  };
  const render = () => {
    const ad = F.isAdmin();
    const ok = F.pode("dados");
    $("#acoes-dados").innerHTML = "";
    const dias = F.S.ultBackup ? Math.floor((Date.now() - new Date(F.S.ultBackup)) / 864e5) : null;
    $("#c-dados").innerHTML = "".concat(ok ? '<section class="cartao" aria-labelledby="h-exp"><h3 id="h-exp">Exportar e enviar</h3>\n        <fieldset class="grupo"><legend>Dados a incluir</legend>'.concat(CONJ.filter(([k]) => pode(k)).map(([k, l]) => '<label class="check"><input type="checkbox" data-sel="'.concat(k, '"').concat(st.sel.includes(k) ? " checked" : "", "> ").concat(esc(l), "</label>")).join(""), '</fieldset>\n        <div class="filtros"><div class="campo"><label for="fd-b">Embarcação</label><select id="fd-b" data-fd="barco">').concat(window.Barcos.opcoes(true).map(([v, l]) => '<option value="'.concat(esc(v), '"').concat(v === st.barco ? " selected" : "", ">").concat(esc(l), "</option>")).join(""), '</select></div>\n        <div class="campo"><label for="fd-a">Ano</label><select id="fd-a" data-fd="ano"><option value="todos">Todos</option>').concat([...new Set([...F.S.entradas, ...F.S.saidas].map((x) => x.data.slice(0, 4)).concat(F.S.viagens.map((v) => v.partida.slice(0, 4)), F.hoje().slice(0, 4)))].sort().reverse().map((a) => "<option".concat(a === st.ano ? " selected" : "", ">").concat(a, "</option>")).join(""), '</select></div>\n        <div class="campo"><label for="fd-c">Conjunto para CSV</label><select id="fd-c" data-fd="csv">').concat(CONJ.filter(([k]) => pode(k)).map(([k, l]) => '<option value="'.concat(k, '"').concat(k === st.csv ? " selected" : "", ">").concat(esc(l), "</option>")).join(""), '</select></div></div>\n        <div class="formatos"><button type="button" class="formato rec" data-x="json"><b>Pacote para compilar (.json)</b><span>Para o administrador juntar no aparelho central. Tem controlo de integridade.</span></button>\n          <button type="button" class="formato" data-x="xlsx"><b>Excel (.xlsx)</b><span>Uma folha por conjunto escolhido.</span></button><button type="button" class="formato" data-x="csv"><b>CSV (;)</b><span>O conjunto escolhido em «Conjunto para CSV».</span></button>\n          <button type="button" class="formato" data-x="txt"><b>Resumo em texto</b><span>Para WhatsApp ou SMS.</span></button><button type="button" class="formato" data-x="print"><b>Imprimir / PDF</b><span>Relatório com os conjuntos escolhidos.</span></button><button type="button" class="formato" data-x="png"><b>Imagem (.png)</b><span>O relatório como imagem, para WhatsApp.</span></button></div>\n        <p class="dica">No telemóvel abre-se «Partilhar» (WhatsApp, e-mail, Drive); no computador o ficheiro vai para Transferências.</p></section>') : '<p class="dica">Não tem permissão para exportar dados.</p>', "\n      ").concat(ad ? '<section class="cartao" aria-labelledby="h-comp"><h3 id="h-comp">Compilar (administrador)</h3><p>Junte aqui os pacotes .json enviados pelos utilizadores de outros aparelhos (Finanças, Inventário…). Pode escolher vários ficheiros de uma vez.</p><button type="button" class="btn prim" data-x="compilar">Importar pacotes (.json)…</button>\n        '.concat(F.S.importados.length ? '<p class="dica">Últimas compilações: '.concat(F.S.importados.slice(-5).reverse().map((i) => {
      var _a;
      return "".concat(esc(((_a = i.origem) == null ? void 0 : _a.nome) || "?"), " (").concat(new Date(i.ts).toLocaleDateString("pt-PT"), ")");
    }).join(" · "), "</p>") : "", "</section>") : "", "\n      ").concat(ok ? '<section class="cartao" aria-labelledby="h-cop"><h3 id="h-cop">Cópias de segurança</h3><p class="'.concat(dias === null || dias > 7 ? "aviso" : "dica", '">').concat(dias === null ? "Ainda não fez nenhuma cópia de segurança." : "Última cópia há ".concat(dias, " dia(s)."), ' Faça pelo menos uma por semana e guarde-a fora do aparelho.</p>\n        <div class="acoes"><button type="button" class="btn prim" data-x="copia">Fazer cópia de segurança</button>').concat(ad ? '<button type="button" class="btn perigo" data-x="restaurar">Restaurar cópia…</button>' : "", "</div></section>") : "", "\n      ").concat(F.S.envios.length ? '<section class="cartao" aria-labelledby="h-env"><h3 id="h-env">Envios recentes</h3><ul class="lista">'.concat(F.S.envios.slice(-8).reverse().map((e) => "<li>".concat(esc(new Date(e.ts).toLocaleString("pt-PT")), " · ").concat(esc(e.formato.toUpperCase()), " · ").concat(esc(e.por), "</li>")).join(""), "</ul></section>") : "");
  };
  document.addEventListener("change", (e) => {
    var _a, _b, _c, _d, _e;
    const s = (_b = (_a = e.target).closest) == null ? void 0 : _b.call(_a, "[data-sel]");
    const f = (_d = (_c = e.target).closest) == null ? void 0 : _d.call(_c, "[data-fd]");
    if (s) {
      const k = s.dataset.sel;
      st.sel = st.sel.filter((x) => x !== k);
      if (s.checked) st.sel.push(k);
    }
    if (f) {
      st[f.dataset.fd] = f.value;
      render();
      (_e = $("#".concat(f.id))) == null ? void 0 : _e.focus();
    }
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-x]");
    if (!b) return;
    const a = b.dataset.x;
    if (a === "compilar") compilar();
    else if (a === "copia") {
      if (F.pode("dados")) copia();
    } else if (a === "restaurar") restaurar();
    else if (F.pode("dados")) exportar(a);
  });
  F.reg("dados", { render });
  window.Dados = { planear };
})();
