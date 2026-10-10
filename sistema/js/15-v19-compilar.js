/* =====================================================================
   V19 — FINANÇAS › CONGREGAÇÕES: compilar os ficheiros enviados pela aplicação offline das congregações
   Aceita o pacote (.json, com verificação de integridade), Excel (.xlsx) e CSV (;) gerados pela aplicação
   «Finanças da Congregação». Mostra uma pré-visualização, guarda cada mês de cada congregação
   (uma nova versão substitui a anterior), apresenta o consolidado, as congregações em falta,
   e lança os repasses (50 % e Missões) como entradas no relatório do Centro, sem duplicar.
   ===================================================================== */
const V19 = (() => {
  'use strict';
  const E = MMUI.esc; const C = (s, n = 200) => MMUI.clean(s, n);
  const CONGS = ['Monte Moriá', 'Monte Sinai', 'Cenáculo da Fé', 'Tabernáculo de Davi'];
  const hash = (txt) => { let h = 0x811c9dc5; for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
  const R = () => { const r = V17.D(); r.pacotes = Array.isArray(r.pacotes) ? r.pacotes : []; if (!r.compMes) r.compMes = r.cur; return r; };
  const can = () => MMUI.canEditTab('financas');
  const num = (v) => { const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN; };
  /** Lançamento limpo e validado (devolve null se inválido). */
  const lanc = (l, mes) => {
    const data = MMDate.iso(l.data) || `${mes}-01`; const tipo = /desp/i.test(l.tipo) ? 'Despesa' : /entr/i.test(l.tipo) ? 'Entrada' : ''; const valor = num(l.valor);
    const r = { id: C(l.id, 40) || `x${Math.random().toString(36).slice(2, 9)}`, data, tipo, categoria: C(l.categoria, 80), subcategoria: C(l.subcategoria, 80), descricao: C(l.descricao, 160), valor, obs: C(l.obs, 200) };
    return tipo && r.categoria && r.descricao && valor > 0 && data.slice(0, 7) === mes ? r : null;
  };
  const totais = (m) => { const e = m.lancamentos.filter((l) => l.tipo === 'Entrada').reduce((t, l) => t + l.valor, 0); const d = m.lancamentos.filter((l) => l.tipo === 'Despesa').reduce((t, l) => t + l.valor, 0); return { entradas: e, despesas: d, saldoTransitar: (Number(m.saldo) || 0) + e - d }; };
  /* ---------- leitura dos três formatos ---------- */
  const fromJson = (txt) => {
    const p = JSON.parse(txt); if (p.formato === 'mm-congregacao-backup') throw new Error('isto é uma cópia de segurança da congregação, não um pacote de envio: use «Enviar › Pacote para o sistema»');
    if (p.formato !== 'mm-congregacao' || p.versao !== 1 || !Array.isArray(p.meses)) throw new Error('não é um pacote da aplicação das congregações');
    const integ = p.controlo && p.controlo.assinatura ? (hash(JSON.stringify(p.meses)) === p.controlo.assinatura ? 'ok' : 'alterado') : 'sem controlo';
    return [{ pacoteId: C(p.pacoteId, 120) || `json-${hash(txt)}`, congregacao: C(p.congregacao, 80), responsavel: C(p.responsavel, 80), telefone: C(p.telefone, 30), gerado: C(p.gerado, 40), integridade: integ, formato: 'json',
      meses: p.meses.filter((m) => /^\d{4}-\d{2}$/.test(m.mes)).map((m) => ({ mes: m.mes, saldo: num(m.saldo) || 0, notas: C(m.notas, 600), lancamentos: (m.lancamentos || []).map((l) => lanc(l, m.mes)).filter(Boolean), rejeitados: (m.lancamentos || []).length - (m.lancamentos || []).map((l) => lanc(l, m.mes)).filter(Boolean).length })) }];
  };
  const fromRows = (rows, meta, fmt) => {
    const k = (r, ...ns) => { const key = Object.keys(r).find((x) => ns.includes(MMFile.norm(x))); return key ? r[key] : ''; }; const by = {};
    rows.forEach((r) => { const cong = C(k(r, 'congregacao') || meta.congregacao, 80); const mes = C(k(r, 'mes'), 7) || String(MMDate.iso(k(r, 'data'))).slice(0, 7); if (!cong || !/^\d{4}-\d{2}$/.test(mes)) return;
      const key = `${cong}|${mes}`; (by[key] = by[key] || { cong, mes, L: [], bad: 0 }); const l = lanc({ id: k(r, 'id'), data: k(r, 'data'), tipo: k(r, 'tipo'), categoria: k(r, 'categoria'), subcategoria: k(r, 'subcategoria'), descricao: k(r, 'descricao'), valor: k(r, 'valor kz', 'valor'), obs: k(r, 'observacao') }, mes); if (l) by[key].L.push(l); else by[key].bad++; });
    const congs = [...new Set(Object.values(by).map((x) => x.cong))];
    return congs.map((cong) => ({ pacoteId: `${fmt}-${MMFile.norm(cong).replace(/\s+/g, '_')}-${hash(JSON.stringify(Object.values(by).filter((x) => x.cong === cong)))}`, congregacao: cong, responsavel: C(meta.responsavel, 80), telefone: C(meta.telefone, 30), gerado: C(meta.gerado, 40), integridade: 'sem controlo', formato: fmt,
      meses: Object.values(by).filter((x) => x.cong === cong).map((x) => ({ mes: x.mes, saldo: num((meta.saldos || {})[x.mes]) || 0, notas: C((meta.notas || {})[x.mes], 600), lancamentos: x.L, rejeitados: x.bad })) }));
  };
  const parseCsv = (txt) => { const out = []; let row = [], cell = '', q = false; txt = txt.replace(/^\ufeff/, '');
    for (let i = 0; i < txt.length; i++) { const ch = txt[i]; if (q) { if (ch === '"' && txt[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; } else if (ch === '"') q = true; else if (ch === ';') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = ''; } else cell += ch; }
    if (cell || row.length) { row.push(cell); out.push(row); } const [h, ...rs] = out.filter((r) => r.some((c) => c.trim())); return rs.map((r) => Object.fromEntries(h.map((x, i) => [x, r[i] ?? ''])));
  };
  const readFile = async (f) => {
    if (f.size > 15e6) throw new Error('ficheiro demasiado grande (máx. 15 MB)'); const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (ext === 'json') return fromJson(await f.text());
    if (ext === 'csv') return fromRows(parseCsv(await f.text()), {}, 'csv');
    if (ext === 'xlsx' || ext === 'xls') {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const meta = {}; const sh = (n) => wb.Sheets[wb.SheetNames.find((x) => MMFile.norm(x) === n) || ''];
      if (sh('dados')) XLSX.utils.sheet_to_json(sh('dados'), { header: 1 }).forEach(([a, b]) => { if (a) meta[MMFile.norm(a).replace(/\s+/g, '')] = b; });
      if (sh('resumo')) { meta.saldos = {}; meta.notas = {}; XLSX.utils.sheet_to_json(sh('resumo'), { defval: '' }).forEach((r) => { const m = r['Mês'] || r.Mes; if (m) { meta.saldos[m] = r['Saldo anterior']; meta.notas[m] = r['Observações']; } }); }
      const L = sh('lancamentos') || wb.Sheets[wb.SheetNames[0]]; return fromRows(XLSX.utils.sheet_to_json(L, { defval: '', raw: false }), meta, 'xlsx');
    }
    throw new Error('formato não suportado (use .json, .xlsx ou .csv)');
  };
  /* ---------- importação com pré-visualização ---------- */
  const importar = async () => {
    if (!can()) { MMUI.toast('Não tem permissão de edição nas Finanças.'); return; }
    let P; try { const f = await new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,.xlsx,.xls,.csv,application/json'; i.addEventListener('change', () => res(i.files[0] || null)); i.click(); }); if (!f) return; P = await readFile(f); } catch (e) { MMUI.toast(`Não foi possível ler o ficheiro: ${e.message}`); return; }
    P = P.filter((p) => p.congregacao && p.meses.some((m) => m.lancamentos.length)); if (!P.length) { MMUI.toast('O ficheiro não tem lançamentos válidos de nenhuma congregação.'); return; }
    const r = R(); const kz = V17.kz; const lbl = V17.mesLbl;
    const linhas = P.flatMap((p) => p.meses.map((m) => { const t = totais(m); const ant = r.pacotes.find((x) => x.congregacao === p.congregacao && x.meses.some((y) => y.mes === m.mes)); const igual = r.pacotes.some((x) => x.pacoteId === p.pacoteId);
      return `<tr><td>${E(p.congregacao)}</td><td>${E(lbl(m.mes))}</td><td class="mm-num">${m.lancamentos.length}${m.rejeitados ? ` <span class="v19-warn">(${m.rejeitados} rejeitados)</span>` : ''}</td><td class="mm-num">${kz(t.entradas)}</td><td class="mm-num">${kz(t.despesas)}</td><td class="mm-num">${kz(t.saldoTransitar)}</td><td>${igual ? '<span class="v19-warn">já importado</span>' : ant ? 'substitui a versão anterior' : 'novo'}</td></tr>`; })).join('');
    const integ = P.map((p) => p.integridade); const aviso = integ.includes('alterado') ? '<p class="v19-bad" role="alert"><b>Atenção:</b> o pacote foi alterado depois de gerado (a assinatura não confere). Confirme com a congregação antes de importar.</p>' : integ.every((x) => x === 'ok') ? '<p class="v19-ok">✔ Integridade verificada: o pacote não foi alterado.</p>' : '<p class="mm-help">Excel/CSV não têm verificação de integridade — confira os totais com a congregação.</p>';
    const m = MMUI.modal({ title: 'Pré-visualização da importação', size: 'wide', body: `${aviso}<div class="tbl-scroll"><table class="data-table"><caption class="sr-only">Meses a importar</caption><thead><tr><th scope="col">Congregação</th><th scope="col">Mês</th><th scope="col">Lançamentos</th><th scope="col">Entradas</th><th scope="col">Despesas</th><th scope="col">Saldo a transitar</th><th scope="col">Situação</th></tr></thead><tbody>${linhas}</tbody></table></div>
      <p class="mm-help">Enviado por: ${E(P.map((p) => `${p.responsavel || '—'}${p.telefone ? ` (${p.telefone})` : ''}`).join(', '))}. Os dados da congregação ficam guardados à parte; os repasses lançam-se depois no relatório do Centro.</p>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Importar</button>' });
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      let n = 0; P.forEach((p) => { if (r.pacotes.some((x) => x.pacoteId === p.pacoteId)) return;
        p.meses.forEach((mm) => { r.pacotes.forEach((x) => { if (x.congregacao === p.congregacao) x.meses = x.meses.filter((y) => y.mes !== mm.mes); }); });
        r.pacotes = r.pacotes.filter((x) => x.meses.length); r.pacotes.push({ ...p, recebido: new Date().toISOString() }); n += p.meses.length; });
      r.compMes = P[0].meses[0].mes; if (typeof logActivity === 'function') logActivity('Importou', 'Compilação de congregações', `${n} mês(es) de ${P.map((p) => p.congregacao).join(', ')}`);
      MMUI.save(); m.close(); V17.setSub('cong'); MMUI.toast(n ? `${n} mês(es) importado(s).` : 'Nada de novo: este ficheiro já tinha sido importado.');
    });
  };
  /* ---------- vista ---------- */
  const doMes = (ym) => R().pacotes.flatMap((p) => p.meses.filter((m) => m.mes === ym).map((m) => ({ p, m, t: totais(m) })));
  const html = () => {
    const r = R(); const ym = r.compMes; const kz = V17.kz; const lbl = V17.mesLbl; const ed = can(); const L = doMes(ym);
    const meses = [...new Set([...Object.keys(r.meses), ...r.pacotes.flatMap((p) => p.meses.map((m) => m.mes))])].sort().reverse();
    const falta = CONGS.filter((c) => !L.some((x) => MMFile.norm(x.p.congregacao) === MMFile.norm(c))); const tot = L.reduce((a, x) => ({ e: a.e + x.t.entradas, d: a.d + x.t.despesas, s: a.s + x.t.saldoTransitar, n: a.n + x.m.lancamentos.length }), { e: 0, d: 0, s: 0, n: 0 });
    const integ = (x) => (x === 'ok' ? '<span class="v19-ok">✔ verificado</span>' : x === 'alterado' ? '<span class="v19-bad">alterado</span>' : x === 'manual' ? '<span class="mm-help">registo manual</span>' : x === 'editado' ? '<span class="v19-warn">editado na sede</span>' : '<span class="mm-help">sem controlo</span>');
    return `<div class="card v19-help"><h3 class="u-v14-h">Compilar os dados das congregações</h3><ol class="v19-steps"><li>A congregação regista na aplicação <b>Finanças da Congregação</b> (telemóvel, sem internet).</li><li>No fim do mês envia o <b>Pacote para o sistema (.json)</b> — ou Excel/CSV — por WhatsApp, e-mail ou pen.</li><li>Aqui: <b>Importar ficheiro da congregação</b> → confira a pré-visualização → <b>Importar</b>.</li><li>Use <b>Lançar repasses no Centro</b> para passar os 50 % e as Missões para o relatório do Centro.</li></ol>
        <div class="v14-toolbar"><button type="button" class="btn gold sm" data-v19="importar"${ed ? '' : ' disabled'}>Importar ficheiro da congregação</button><button type="button" class="btn ghost sm" data-v21="cong-novo"${ed ? '' : ' disabled'}>+ Registar dados de uma congregação</button><button type="button" class="btn ghost sm" data-v19="xlsx">Exportar compilação (Excel)</button>
          <label class="sr-only" for="v19_mes">Mês da compilação</label><select id="v19_mes" data-v19mes>${meses.map((x) => `<option value="${E(x)}"${x === ym ? ' selected' : ''}>${E(lbl(x))}</option>`).join('')}</select></div></div>
      <div class="kpi-grid">${[[L.length, 'Congregações recebidas'], [falta.length, 'Em falta'], [`${kz(tot.e)} Kz`, 'Entradas (todas)'], [`${kz(tot.d)} Kz`, 'Despesas (todas)'], [`${kz(tot.s)} Kz`, 'Saldo das congregações']].map(([v, l]) => `<div class="kpi"><div class="num">${E(v)}</div><div class="lbl">${E(l)}</div></div>`).join('')}</div>
      ${falta.length ? `<p class="note">Ainda sem dados de ${E(lbl(ym))}: <b>${E(falta.join(', '))}</b>.</p>` : ''}
      <div class="card"><h3 class="u-v14-h">Compilação de ${E(lbl(ym))}</h3><div class="tbl-scroll"><table class="data-table"><caption class="sr-only">Compilação por congregação</caption><thead><tr><th scope="col">Congregação</th><th scope="col">Responsável</th><th scope="col">Recebido</th><th scope="col">Lançamentos</th><th scope="col">Entradas</th><th scope="col">Despesas</th><th scope="col">Saldo a transitar</th><th scope="col">Integridade</th><th scope="col">Ações</th></tr></thead>
        <tbody>${L.map((x) => `<tr><td><b>${E(x.p.congregacao)}</b></td><td>${E(x.p.responsavel || '—')}</td><td>${E(new Date(x.p.recebido).toLocaleDateString('pt-PT'))} · ${E(x.p.formato.toUpperCase())}</td><td class="mm-num">${x.m.lancamentos.length}</td><td class="mm-num">${kz(x.t.entradas)}</td><td class="mm-num">${kz(x.t.despesas)}</td><td class="mm-num">${kz(x.t.saldoTransitar)}</td><td>${integ(x.p.integridade)}</td>
          <td class="mm-actions"><button type="button" class="btn ghost sm" data-v19="ver" data-id="${E(x.p.pacoteId)}">Ver</button><button type="button" class="btn ghost sm" data-v21="cong-lanc" data-id="${E(x.p.pacoteId)}"${ed ? '' : ' disabled'}>Lançamentos…</button><button type="button" class="btn ghost sm" data-v22="exportar" data-id="${E(x.p.pacoteId)}"${ed ? '' : ' disabled'}>Exportar para a folha central</button><button type="button" class="btn ghost sm" data-v19="repasses" data-id="${E(x.p.pacoteId)}"${ed ? '' : ' disabled'}>Lançar repasses no Centro</button><button type="button" class="btn danger sm" data-v19="remover" data-id="${E(x.p.pacoteId)}"${ed ? '' : ' disabled'}>Remover</button></td></tr>`).join('') || '<tr><td colspan="9"><div class="empty">Ainda não foi importado nenhum ficheiro para este mês.</div></td></tr>'}
        ${L.length ? `<tr class="v19-total"><th scope="row" colspan="3">Total consolidado</th><td class="mm-num">${tot.n}</td><td class="mm-num">${kz(tot.e)}</td><td class="mm-num">${kz(tot.d)}</td><td class="mm-num">${kz(tot.s)}</td><td colspan="2"></td></tr>` : ''}</tbody></table></div></div>`;
  };
  const find = (id) => { const r = R(); const p = r.pacotes.find((x) => x.pacoteId === id); return p ? { p, m: p.meses.find((y) => y.mes === r.compMes) || p.meses[0] } : null; };
  const ver = (id) => { const x = find(id); if (!x) return; const kz = V17.kz; const t = totais(x.m); const grp = (tipo) => { const by = {}; x.m.lancamentos.filter((l) => l.tipo === tipo).forEach((l) => { by[l.categoria] = (by[l.categoria] || 0) + l.valor; }); return Object.entries(by).map(([k, v]) => `<tr><th scope="row">${E(k)}</th><td class="mm-num">${kz(v)}</td></tr>`).join(''); };
    MMUI.modal({ title: `${x.p.congregacao} — ${V17.mesLbl(x.m.mes)}`, size: 'wide', body: `<table class="data-table"><caption class="sr-only">Relatório da congregação</caption><tbody><tr><th scope="row">Saldo anterior</th><td class="mm-num">${kz(x.m.saldo)}</td></tr><tr><th colspan="2" scope="colgroup">ENTRADAS</th></tr>${grp('Entrada')}<tr><th scope="row"><b>Total de entradas</b></th><td class="mm-num"><b>${kz(t.entradas)}</b></td></tr><tr><th colspan="2" scope="colgroup">DESPESAS</th></tr>${grp('Despesa')}<tr><th scope="row"><b>Total de despesas</b></th><td class="mm-num"><b>${kz(t.despesas)}</b></td></tr><tr><th scope="row"><b>Saldo a transitar</b></th><td class="mm-num"><b>${kz(t.saldoTransitar)}</b></td></tr></tbody></table>${x.m.notas ? `<p><b>Observações:</b> ${E(x.m.notas)}</p>` : ''}`, foot: '<button type="button" class="btn gold sm" data-close>Fechar</button>' }); };
  /** Repasses: despesas «50 % para o Centro» e «Missões (envio ao Centro)» da congregação = entradas do Centro (sem duplicar). */
  const repasses = (id) => {
    const x = find(id); if (!x) return; const r = V17.D(); const mes = x.m.mes; const L = x.m.lancamentos.filter((l) => l.tipo === 'Despesa' && (/50\s*%|centro/i.test(l.categoria)));
    if (!L.length) { MMUI.toast('Não há despesas «50% para o Centro» ou «Missões (envio ao Centro)» neste mês.'); return; }
    if (!r.meses[mes]) r.meses[mes] = { saldo: r.meses[V17.prevYm(mes)] ? Math.round(V17.calc(V17.prevYm(mes)).transitar * 100) / 100 : 0, notas: '' };
    if (r.meses[mes].fechado) { MMUI.toast(`O relatório do Centro de ${V17.mesLbl(mes)} está fechado.`); return; }
    let n = 0; L.forEach((l) => { const rid = `rp:${x.p.pacoteId}:${l.id}`; if (r.lanc.some((y) => y.id === rid)) return; const miss = /miss/i.test(l.categoria);
      r.lanc.push({ id: rid, mes, data: l.data, tipo: 'Entrada', categoria: miss ? 'Missões' : '50% provenientes das congregações', subcategoria: miss ? 'Contribuições das congregações' : 'Repasse das congregações', descricao: `Congregação ${x.p.congregacao}`, congregacao: x.p.congregacao, valor: l.valor, obs: `Repasse importado (${x.p.formato.toUpperCase()})` }); n++; });
    if (typeof logActivity === 'function') logActivity('Lançou repasses', 'Relatório financeiro', `${x.p.congregacao} ${mes}: ${n}`); MMUI.save(); V17.setSub('cong');
    MMUI.toast(n ? `${n} entrada(s) criada(s) no relatório do Centro de ${V17.mesLbl(mes)}.` : 'Estes repasses já estavam lançados no relatório do Centro.');
  };
  const exportar = () => { try { const r = R(); const ym = r.compMes; const L = doMes(ym); if (!L.length) { MMUI.toast('Não há dados para exportar neste mês.'); return; } const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Congregação', 'Responsável', 'Saldo anterior', 'Entradas', 'Despesas', 'Saldo a transitar', 'Lançamentos', 'Integridade'], ...L.map((x) => [x.p.congregacao, x.p.responsavel, x.m.saldo, x.t.entradas, x.t.despesas, x.t.saldoTransitar, x.m.lancamentos.length, x.p.integridade])]), 'Resumo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Congregação', 'Mês', 'Data', 'Tipo', 'Categoria', 'Subcategoria', 'Descrição', 'Valor (Kz)', 'Observação'], ...L.flatMap((x) => x.m.lancamentos.map((l) => [x.p.congregacao, ym, l.data, l.tipo, l.categoria, l.subcategoria, l.descricao, l.valor, l.obs]))]), 'Lançamentos');
    XLSX.writeFile(wb, `Compilacao_Congregacoes_${ym}.xlsx`); } catch (e) { MMUI.toast(`Exportação falhou: ${e.message}`); } };
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-v19]'); if (!b || b.disabled) return; const a = b.dataset.v19;
    if (a === 'importar') importar(); else if (a === 'xlsx') exportar(); else if (a === 'ver') ver(b.dataset.id); else if (a === 'repasses') repasses(b.dataset.id);
    else if (a === 'remover') { const x = find(b.dataset.id); if (!x) return; const go = async () => { if (!(await MMUI.confirm(`Remover os dados de ${x.p.congregacao} de ${V17.mesLbl(x.m.mes)}? Os repasses já lançados no Centro mantêm-se.`, 'Remover'))) return; x.p.meses = x.p.meses.filter((y) => y !== x.m); const r = R(); r.pacotes = r.pacotes.filter((p) => p.meses.length); MMUI.save(); V17.setSub('cong'); };
      if (typeof requirePassword === 'function') requirePassword('admin', 'Introduza a palavra-passe para remover estes dados.', go); else go(); } });
  document.addEventListener('change', (e) => { if (e.target.matches?.('[data-v19mes]')) { R().compMes = e.target.value; MMUI.save(); V17.setSub('cong'); document.getElementById('v19_mes')?.focus(); } });
  return { html, readFile, fromJson, hash, totais, lanc, R };
})();
