/* =====================================================================
   V17 — FINANÇAS › RELATÓRIO MENSAL (base de dados de todos os meses)
   Replica o livro «Relatório Financeiro» (Base de Dados + Relatório do mês): lançamentos de entradas e despesas,
   saldo anterior (transita automaticamente do mês anterior), totais por secção e saldo a transitar.
   Folha com o logótipo da ADP, impressão em A4 (retrato/paisagem), A5 e Carta, exportação Excel/CSV,
   apresentação ajustável (títulos, detalhe, secções, assinaturas, tamanho da letra) e estrutura editável (administrador).
   Dados em DB.relFin — nada do que já existe é alterado.
   ===================================================================== */
const V17 = (() => {
  'use strict';
  const E = MMUI.esc; const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const kz = (v) => Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const mesLbl = (ym) => { const [a, m] = String(ym).split('-'); return `${MESES[+m - 1] || '?'} de ${a}`; };
  const CONGS = ['Monte Moriá', 'Monte Sinai', 'Cenáculo da Fé', 'Tabernáculo de Davi'];
  /* Agosto/2026 — dados do livro anexo (só usados se ainda não houver relatórios) */
  const SEED = { mes: new Date().toISOString().slice(0, 7), saldo: 0, rows: [] };
  /* Estrutura por omissão (igual à folha «Relatório Agosto»): modo «sub» = uma linha por subcategoria no bloco principal,
     «cong» = grupo com uma linha por congregação e total, «seccao» = secção própria com uma linha por descrição e subtotal */
  const STRUCT = [['Entrada', 'Missões', 'cong', 'Missões'], ['Entrada', 'Beneficência', 'sub', ''], ['Entrada', 'Ofertas', 'sub', ''], ['Entrada', 'Dízimos', 'sub', ''], ['Entrada', '50% provenientes das congregações', 'seccao', '50 % PROVENIENTES DAS CONGREGAÇÕES'],
    ['Despesa', 'Tesouraria geral', 'sub', ''], ['Despesa', 'Apoio social', 'sub', ''], ['Despesa', 'Missões', 'sub', ''], ['Despesa', 'Beneficência', 'sub', ''], ['Despesa', 'Direcção', 'sub', ''],
    ['Despesa', 'Serviços de telecomunicação', 'seccao', 'SERVIÇOS DE TELECOMUNICAÇÃO'], ['Despesa', 'Manutenção do templo', 'seccao', 'MANUTENÇÃO DO TEMPLO'], ['Despesa', 'Alimentação', 'seccao', 'ALIMENTAÇÃO']];
  const VIEW0 = { logo: true, detalhe: true, cong50: true, assin: true, notas: true, fonte: 'normal', formato: 'A4-portrait', l1: 'ASSEMBLEIA DE DEUS PENTECOSTAL', l2: 'MINISTÉRIO BETEL LUANDA – CENTRO MONTE MORIÁ', titulo: 'Relatório de conta geral referente ao mês de {MES}', a1: 'O(A) Tesoureiro(a)', a2: 'O Pastor' };
  const D = () => {
    if (!DB.relFin || typeof DB.relFin !== 'object') {
      DB.relFin = { meses: { [SEED.mes]: { saldo: SEED.saldo, notas: '' } }, lanc: SEED.rows.map((r, i) => ({ id: `rf${i + 1}`, mes: SEED.mes, data: `${SEED.mes}-01`, tipo: r[0], categoria: r[1], subcategoria: r[2], descricao: r[3], congregacao: r[4], valor: r[5], obs: 'Relatório Agosto/2026' })), view: {}, struct: null, cur: SEED.mes };
    }
    const R = DB.relFin; R.meses = R.meses || {}; R.lanc = Array.isArray(R.lanc) ? R.lanc : []; R.view = { ...VIEW0, ...(R.view || {}) };
    if (!R.cur || !R.meses[R.cur]) R.cur = Object.keys(R.meses).sort().pop() || new Date().toISOString().slice(0, 7);
    if (!R.meses[R.cur]) R.meses[R.cur] = { saldo: 0, notas: '' };
    return R;
  };
  const struct = () => { const R = D(); const S = (R.struct || STRUCT.map(([tipo, categoria, modo, titulo]) => ({ tipo, categoria, modo, titulo, mostrar: true }))).map((x) => ({ ...x }));
    // categorias novas (ainda sem regra): entradas numa linha por subcategoria; despesas em secção própria
    R.lanc.forEach((l) => { if (!S.some((x) => x.tipo === l.tipo && x.categoria === l.categoria)) S.push({ tipo: l.tipo, categoria: l.categoria, modo: l.tipo === 'Entrada' ? 'sub' : 'seccao', titulo: l.tipo === 'Entrada' ? '' : String(l.categoria).toUpperCase(), mostrar: true }); });
    return S; };
  const can = () => MMUI.canEditTab('financas');
  const ofMonth = (ym) => D().lanc.filter((l) => l.mes === ym);
  const sum = (L) => L.reduce((t, l) => t + (Number(l.valor) || 0), 0);
  const prevYm = (ym) => { const [a, m] = ym.split('-').map(Number); const d = new Date(a, m - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  /** Cálculo do relatório de um mês: blocos de linhas e totais (equivalente às fórmulas SUMIFS da folha). */
  const calc = (ym) => {
    const R = D(); const L = ofMonth(ym); const S = struct(); const saldo = Number(R.meses[ym]?.saldo) || 0; const out = { ent: [], des: [], saldo };
    const block = (tipo) => {
      const main = []; const secs = []; S.filter((s) => s.tipo === tipo).forEach((s) => {
        const rows = L.filter((l) => l.tipo === tipo && l.categoria === s.categoria); if (!rows.length) return;
        if (s.modo === 'cong') { const by = {}; rows.forEach((l) => { const k = l.congregacao || l.descricao; by[k] = (by[k] || 0) + Number(l.valor || 0); }); main.push({ grupo: s.titulo || s.categoria, linhas: Object.entries(by).map(([k, v]) => ({ t: `${s.titulo || s.categoria} – ${String(k).replace(/^Congrega[çc][ãa]o\s+/i, '')}`, v })), total: sum(rows), mostrar: s.mostrar }); }
        else if (s.modo === 'sub') { const by = {}; rows.forEach((l) => { const k = l.subcategoria || l.categoria; by[k] = (by[k] || 0) + Number(l.valor || 0); }); Object.entries(by).forEach(([k, v]) => main.push({ t: k, v, mostrar: s.mostrar })); }
        else secs.push({ titulo: s.titulo || String(s.categoria).toUpperCase(), linhas: rows.map((l) => ({ t: l.descricao || l.subcategoria, v: Number(l.valor) || 0 })), total: sum(rows), mostrar: s.mostrar, cong: /50/.test(s.categoria) });
      });
      return { main, secs, mainTotal: main.reduce((t, x) => t + (x.total ?? x.v), 0), total: sum(L.filter((l) => l.tipo === tipo)) };
    };
    out.ent = block('Entrada'); out.des = block('Despesa');
    out.entradas = out.ent.total; out.despesas = out.des.total; out.entSaldo = out.entradas + saldo; out.transitar = out.entSaldo - out.despesas; out.n = L.length;
    return out;
  };
  /* ---------- Folha do relatório (com logótipo) ---------- */
  const LB17 = { saldo: 'Valor em caixa disponível (saldo anterior)', ent: 'ENTRADA DO MÊS', parcial: 'Total parcial', totEnt: 'Total de entradas do mês', entSaldo: 'Total de entradas mais saldo anterior', des: 'DESPESAS', sub: 'Subtotal', totDes: 'Total de despesas', final: 'Saldo a transitar' };
  const sheet = (ym) => {
    const R = D(); const V = R.view; const c = calc(ym); const m = R.meses[ym] || {}; const LB = { ...LB17, ...(V.lb || {}) };
    const line = (t, v, cls = '') => `<tr class="${cls}"><th scope="row">${E(t)}</th><td>${kz(v)}</td></tr>`;
    const mainRows = (b) => b.main.filter((x) => x.mostrar !== false).map((x) => (x.linhas ? `${V.detalhe ? x.linhas.map((l) => line(l.t, l.v)).join('') : ''}${line(`Total de ${x.grupo}`, x.total, 'tot')}` : line(x.t, x.v))).join('');
    const secRows = (s) => `<tr class="sec"><th colspan="2" scope="colgroup">${E(s.titulo)}</th></tr>${V.detalhe ? s.linhas.map((l) => line(l.t, l.v)).join('') : ''}${line(LB.sub, s.total, 'tot')}`;
    const eSecs = c.ent.secs.filter((s) => s.mostrar !== false && (V.cong50 || !s.cong)); const dSecs = c.des.secs.filter((s) => s.mostrar !== false);
    return `<article class="v17-sheet fs-${E(V.fonte)}" aria-label="Relatório financeiro de ${E(mesLbl(ym))}">
      <header class="v17-head">${V.logo ? `<img class="v17-logo" alt="Logótipo da Assembleia de Deus Pentecostal" src="${E(MMBrand.logo())}">` : ''}
        <div><p class="v17-l1">${E(V.l1)}</p><p class="v17-l2">${E(V.l2)}</p><h3 class="v17-t">${E(V.titulo.replace('{MES}', mesLbl(ym)))}</h3></div></header>
      <table class="v17-tab"><caption class="sr-only">Relatório financeiro de ${E(mesLbl(ym))}</caption><colgroup><col><col class="v17-v"></colgroup><tbody>
        ${line(LB.saldo, c.saldo, 'big')}
        <tr class="sec"><th colspan="2" scope="colgroup">${E(LB.ent)}</th></tr>${mainRows(c.ent)}${line(LB.parcial, c.ent.mainTotal, 'tot')}
        ${eSecs.map(secRows).join('')}
        ${line(LB.totEnt, c.entradas, 'big')}${line(LB.entSaldo, c.entSaldo, 'big')}
        <tr class="sec"><th colspan="2" scope="colgroup">${E(LB.des)}</th></tr>${mainRows(c.des)}${line(LB.sub, c.des.mainTotal, 'tot')}
        ${dSecs.map(secRows).join('')}
        ${line(LB.totDes, c.despesas, 'big neg')}${line(LB.final, c.transitar, `big ${c.transitar < 0 ? 'neg' : 'pos'}`)}</tbody></table>
      ${V.notas && m.notas ? `<p class="v17-notas"><b>Observações:</b> ${E(m.notas)}</p>` : ''}
      ${V.assin ? `<div class="v17-assin"><div><span></span>${E(V.a1)}</div><div><span></span>${E(V.a2)}</div></div>` : ''}
      <p class="v17-foot">Luanda, ${E(new Date().toLocaleDateString('pt-PT'))} · ${E(R.lanc.filter((l) => l.mes === ym).length)} lançamentos</p></article>`;
  };
  /* ---------- Sub-aba ---------- */
  const html = () => {
    const R = D(); const ym = R.cur; const c = calc(ym); const ed = can(); const fechado = !!R.meses[ym]?.fechado; const L = ofMonth(ym).slice().sort((a, b) => String(a.tipo).localeCompare(b.tipo) || String(a.categoria).localeCompare(b.categoria, 'pt'));
    const months = Object.keys(R.meses).sort().reverse();
    const k = (n, l, cls = '') => `<div class="kpi ${cls}"><div class="num">${E(n)}</div><div class="lbl">${E(l)}</div></div>`;
    return `<div class="v14-toolbar v17-bar" role="toolbar" aria-label="Relatório financeiro">
        <label class="sr-only" for="v17_mes">Mês do relatório</label><select id="v17_mes" data-v17mes>${months.map((x) => `<option value="${E(x)}"${x === ym ? ' selected' : ''}>${E(mesLbl(x))}${R.meses[x].fechado ? ' 🔒' : ''}</option>`).join('')}</select>
        <button type="button" class="btn ghost sm" data-v17="mes-novo"${ed ? '' : ' disabled'}>+ Novo mês</button>
        <button type="button" class="btn gold sm" data-v17="lanc-novo"${ed && !fechado ? '' : ' disabled'}>+ Lançamento</button>
        <label class="sr-only" for="v17_fmt">Formato de impressão</label><select id="v17_fmt" data-v17fmt>${[['A4-portrait', 'A4 retrato'], ['A4-landscape', 'A4 paisagem'], ['A5-portrait', 'A5'], ['letter-portrait', 'Carta (Letter)']].map(([v, l]) => `<option value="${v}"${R.view.formato === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
        <button type="button" class="btn ghost sm" data-v17="print">Imprimir / PDF</button><button type="button" class="btn ghost sm" data-v17="xlsx">Excel</button><button type="button" class="btn ghost sm" data-v17="csv">CSV</button>
        <button type="button" class="btn ghost sm" data-v17="import"${ed ? '' : ' disabled'}>Importar Excel</button><button type="button" class="btn ghost sm" data-v17="view">Apresentação…</button>
        ${MMUI.isAdmin() ? `<button type="button" class="btn ghost sm" data-v21="marca">Logótipo e cabeçalho…</button><button type="button" class="btn ghost sm" data-v17="struct">Estrutura…</button><button type="button" class="btn ghost sm" data-v17="lock">${fechado ? 'Reabrir mês' : 'Fechar mês'}</button>` : ''}</div>
      <div class="kpi-grid">${k(`${kz(c.saldo)} Kz`, 'Saldo anterior')}${k(`${kz(c.entradas)} Kz`, 'Entradas do mês')}${k(`${kz(c.despesas)} Kz`, 'Despesas')}${k(`${kz(c.transitar)} Kz`, 'Saldo a transitar', c.transitar < 0 ? 'neg' : '')}${k(c.n, 'Lançamentos')}</div>
      <div class="v17-grid"><div class="card v17-paper">${sheet(ym)}</div>
        <div class="v17-side"><div class="card"><h3 class="u-v14-h">Saldo e observações de ${E(mesLbl(ym))}</h3>
          <form class="mm-form" data-v17mesf novalidate><div class="field"><label for="v17_saldo">Valor em caixa disponível (saldo anterior, Kz)</label><input id="v17_saldo" name="saldo" type="number" step="0.01" value="${E(R.meses[ym].saldo ?? 0)}"${ed && !fechado ? '' : ' disabled'}></div>
            <div class="field"><label for="v17_notas">Observações (aparecem na folha)</label><textarea id="v17_notas" name="notas" maxlength="600"${ed && !fechado ? '' : ' disabled'}>${E(R.meses[ym].notas || '')}</textarea></div>
            <p class="mm-err" role="alert"></p><button type="button" class="btn ghost sm" data-v17="mes-save"${ed && !fechado ? '' : ' disabled'}>Guardar</button> <button type="button" class="btn ghost sm" data-v17="saldo-auto"${ed && !fechado ? '' : ' disabled'}>Usar saldo de ${E(mesLbl(prevYm(ym)))}</button></form></div>
          <div class="card"><h3 class="u-v14-h">Base de dados — todos os meses</h3><div class="tbl-scroll"><table class="data-table"><caption class="sr-only">Resumo de todos os meses</caption><thead><tr><th scope="col">Mês</th><th scope="col">Entradas</th><th scope="col">Despesas</th><th scope="col">Saldo a transitar</th><th scope="col"><span class="sr-only">Abrir</span></th></tr></thead>
            <tbody>${months.map((x) => { const q = calc(x); return `<tr><td>${E(mesLbl(x))}${R.meses[x].fechado ? ' 🔒' : ''}</td><td class="mm-num">${kz(q.entradas)}</td><td class="mm-num">${kz(q.despesas)}</td><td class="mm-num">${kz(q.transitar)}</td><td><button type="button" class="btn ghost sm" data-v17="abrir" data-ym="${E(x)}"${x === ym ? ' disabled' : ''}>Abrir</button></td></tr>`; }).join('')}</tbody></table></div></div></div></div>
      <div class="card"><h3 class="u-v14-h">Lançamentos de ${E(mesLbl(ym))} (${L.length})</h3><div class="tbl-scroll"><table class="data-table"><caption class="sr-only">Lançamentos do mês</caption>
        <thead><tr><th scope="col">Data</th><th scope="col">Tipo</th><th scope="col">Categoria</th><th scope="col">Subcategoria</th><th scope="col">Descrição</th><th scope="col">Congregação</th><th scope="col">Valor (Kz)</th><th scope="col">Ações</th></tr></thead>
        <tbody>${L.map((l) => `<tr><td>${E(MMDate.fmt(l.data))}</td><td>${E(l.tipo)}</td><td>${E(l.categoria)}</td><td>${E(l.subcategoria || '—')}</td><td>${E(l.descricao)}</td><td>${E(l.congregacao || '—')}</td><td class="mm-num">${kz(l.valor)}</td>
          <td class="mm-actions"><button type="button" class="btn ghost sm" data-v17="lanc-edit" data-id="${E(l.id)}" aria-label="Editar ${E(l.descricao)}"${ed && !fechado ? '' : ' disabled'}>Editar</button><button type="button" class="btn danger sm" data-v17="lanc-del" data-id="${E(l.id)}" aria-label="Eliminar ${E(l.descricao)}"${ed && !fechado ? '' : ' disabled'}>Eliminar</button></td></tr>`).join('') || `<tr><td colspan="8"><div class="empty">Sem lançamentos neste mês. Use «+ Lançamento» ou «Importar Excel».</div></td></tr>`}</tbody></table></div></div>`;
  };
  /* ---------- Formulários ---------- */
  const lancForm = (l) => {
    const R = D(); const ym = R.cur; const x = l || { data: `${ym}-01`, tipo: 'Entrada' }; const known = (f) => [...new Set(R.lanc.map((r) => r[f]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
    const dl = (id, L) => `<datalist id="${id}">${L.map((v) => `<option value="${E(v)}">`).join('')}</datalist>`;
    const m = MMUI.modal({ title: l ? 'Editar lançamento' : `Novo lançamento — ${mesLbl(ym)}`, size: 'wide',
      body: `<form class="mm-form" novalidate><div class="mm-grid">
        <div class="field"><label for="v17f_d">Data *</label><input id="v17f_d" name="data" type="date" value="${E(x.data)}" required></div>
        <div class="field"><label for="v17f_t">Tipo *</label><select id="v17f_t" name="tipo">${['Entrada', 'Despesa'].map((t) => `<option${t === x.tipo ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label for="v17f_c">Categoria *</label><input id="v17f_c" name="categoria" list="v17_cat" maxlength="80" value="${E(x.categoria || '')}" required>${dl('v17_cat', known('categoria'))}</div>
        <div class="field"><label for="v17f_s">Subcategoria</label><input id="v17f_s" name="subcategoria" list="v17_sub" maxlength="80" value="${E(x.subcategoria || '')}">${dl('v17_sub', known('subcategoria'))}</div>
        <div class="field mm-full"><label for="v17f_ds">Descrição *</label><input id="v17f_ds" name="descricao" maxlength="160" value="${E(x.descricao || '')}" required></div>
        <div class="field"><label for="v17f_g">Congregação</label><input id="v17f_g" name="congregacao" list="v17_cong" maxlength="80" value="${E(x.congregacao || '')}">${dl('v17_cong', [...new Set([...CONGS, ...known('congregacao')])])}</div>
        <div class="field"><label for="v17f_v">Valor (Kz) *</label><input id="v17f_v" name="valor" type="number" min="0.01" step="0.01" inputmode="decimal" value="${E(x.valor ?? '')}" required></div>
        <div class="field mm-full"><label for="v17f_o">Observação</label><input id="v17f_o" name="obs" maxlength="200" value="${E(x.obs || '')}"></div></div><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar lançamento</button>' });
    const F = m.el.querySelector('form'); const err = F.querySelector('.mm-err');
    const bad = (el, msg) => { F.querySelectorAll('[aria-invalid]').forEach((z) => z.removeAttribute('aria-invalid')); el.setAttribute('aria-invalid', 'true'); el.focus(); err.textContent = msg; };
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      try {
        const v = (n) => MMUI.clean(F[n].value, n === 'descricao' ? 160 : 200);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(F.data.value)) return bad(F.data, 'Indique uma data válida.');
        if (F.data.value.slice(0, 7) !== (l ? l.mes : ym)) return bad(F.data, `A data deve pertencer a ${mesLbl(l ? l.mes : ym)}.`);
        if (v('categoria').length < 2) return bad(F.categoria, 'Indique a categoria (ex.: Dízimos, Manutenção do templo).');
        if (v('descricao').length < 2) return bad(F.descricao, 'Indique a descrição.');
        const val = Number(F.valor.value); if (!(val > 0) || Math.round(val * 100) !== val * 100 && Math.abs(Math.round(val * 100) - val * 100) > 1e-6) return bad(F.valor, 'Valor maior que zero, com no máximo 2 casas decimais.');
        const rec = { data: F.data.value, tipo: F.tipo.value === 'Despesa' ? 'Despesa' : 'Entrada', categoria: v('categoria'), subcategoria: v('subcategoria'), descricao: v('descricao'), congregacao: v('congregacao'), valor: Math.round(val * 100) / 100, obs: v('obs') };
        if (Object.values(rec).some((z) => typeof z === 'string' && /[<>]/.test(z))) return bad(F.descricao, 'Os textos não podem conter < ou >.');
        if (l) Object.assign(l, rec); else R.lanc.push({ id: `rf${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, mes: ym, ...rec });
        if (typeof logActivity === 'function') logActivity(l ? 'Editou' : 'Registou', 'Relatório financeiro', `${rec.tipo}: ${rec.descricao} (${kz(rec.valor)} Kz)`);
        MMUI.save(); m.close(); render(); MMUI.toast('Lançamento guardado.');
      } catch (e) { err.textContent = `Não foi possível guardar: ${e.message}`; }
    });
  };
  const viewForm = () => {
    const V = D().view;
    const m = MMUI.modal({ title: 'Apresentação da folha', size: 'wide', body: `<form class="mm-form" novalidate><div class="mm-grid">
        <div class="field mm-full"><label for="v17v_l1">Linha 1 do cabeçalho</label><input id="v17v_l1" name="l1" maxlength="80" value="${E(V.l1)}"></div>
        <div class="field mm-full"><label for="v17v_l2">Linha 2 do cabeçalho</label><input id="v17v_l2" name="l2" maxlength="100" value="${E(V.l2)}"></div>
        <div class="field mm-full"><label for="v17v_t">Título ({MES} = mês e ano)</label><input id="v17v_t" name="titulo" maxlength="120" value="${E(V.titulo)}"></div>
        <div class="field"><label for="v17v_a1">Assinatura 1</label><input id="v17v_a1" name="a1" maxlength="60" value="${E(V.a1)}"></div><div class="field"><label for="v17v_a2">Assinatura 2</label><input id="v17v_a2" name="a2" maxlength="60" value="${E(V.a2)}"></div>
        <div class="field"><label for="v17v_f">Tamanho da letra</label><select id="v17v_f" name="fonte">${[['pequena', 'Pequena'], ['normal', 'Normal'], ['grande', 'Grande']].map(([k, l]) => `<option value="${k}"${V.fonte === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>
        <details class="v22-adv"><summary>Avançado — rótulos das linhas da folha</summary><div class="mm-grid">${Object.entries(LB17).map(([k, l]) => `<div class="field"><label for="v17lb_${k}">${E(l)}</label><input id="v17lb_${k}" data-lb="${k}" maxlength="80" value="${E((V.lb || {})[k] || l)}"></div>`).join('')}</div></details>
        ${[['logo', 'Mostrar o logótipo da ADP'], ['detalhe', 'Mostrar o detalhe das linhas (desmarcado = só subtotais)'], ['cong50', 'Mostrar «50 % provenientes das congregações»'], ['notas', 'Mostrar as observações do mês'], ['assin', 'Mostrar as assinaturas']].map(([k, l]) => `<label class="mm-check"><input type="checkbox" name="${k}"${V[k] ? ' checked' : ''}> ${l}</label>`).join('')}<p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn danger sm" data-reset>Repor</button><button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Aplicar</button>' });
    const F = m.el.querySelector('form');
    m.el.querySelector('[data-reset]').addEventListener('click', () => { D().view = { formato: V.formato }; MMUI.save(); m.close(); render(); });
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      const t = (n) => MMUI.clean(F[n].value, 120); const vals = { l1: t('l1'), l2: t('l2'), titulo: t('titulo') || VIEW0.titulo, a1: t('a1'), a2: t('a2') };
      if (Object.values(vals).some((z) => /[<>]/.test(z))) { F.querySelector('.mm-err').textContent = 'Os textos não podem conter < ou >.'; return; }
      const lb = {}; F.querySelectorAll('[data-lb]').forEach((i) => { const t = MMUI.clean(i.value, 80); if (t && t !== LB17[i.dataset.lb]) lb[i.dataset.lb] = t; }); if (Object.values(lb).some((z) => /[<>]/.test(z))) { F.querySelector('.mm-err').textContent = 'Os textos não podem conter < ou >.'; return; }
      Object.assign(D().view, vals, { lb }, { fonte: ['pequena', 'normal', 'grande'].includes(F.fonte.value) ? F.fonte.value : 'normal' }, Object.fromEntries(['logo', 'detalhe', 'cong50', 'notas', 'assin'].map((k) => [k, F[k].checked])));
      MMUI.save(); m.close(); render();
    });
  };
  const structForm = () => {
    if (!MMUI.isAdmin()) { MMUI.toast('Exige sessão de administrador.'); return; } let S = struct();
    const draw = () => `<p class="mm-help">Ordem, título e forma de apresentação de cada categoria. «Uma linha por subcategoria» = bloco principal; «Por congregação» = grupo com total; «Secção própria» = linhas por descrição e subtotal.</p>
      <ol class="v16-ord">${S.map((s, i) => `<li><span><b>${E(s.tipo)}</b> · ${E(s.categoria)}</span><span class="mm-row"><label class="sr-only" for="v17s_m${i}">Apresentação</label><select id="v17s_m${i}" data-m="${i}">${[['sub', 'Uma linha por subcategoria'], ['cong', 'Por congregação'], ['seccao', 'Secção própria']].map(([k, l]) => `<option value="${k}"${s.modo === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
        <label class="sr-only" for="v17s_t${i}">Título</label><input id="v17s_t${i}" data-t="${i}" value="${E(s.titulo || '')}" placeholder="Título (opcional)" maxlength="60"><label class="mm-check"><input type="checkbox" data-s="${i}"${s.mostrar !== false ? ' checked' : ''}> Mostrar</label>
        <button type="button" class="mmc-btn" data-mv="-1" data-i="${i}" aria-label="Subir ${E(s.categoria)}"${i ? '' : ' disabled'}>↑</button><button type="button" class="mmc-btn" data-mv="1" data-i="${i}" aria-label="Descer ${E(s.categoria)}"${i < S.length - 1 ? '' : ' disabled'}>↓</button></span></li>`).join('')}</ol>`;
    const m = MMUI.modal({ title: 'Estrutura do relatório', size: 'wide', body: `<div data-sl>${draw()}</div><p class="mm-err" role="alert"></p>`, foot: '<button type="button" class="btn danger sm" data-reset>Estrutura da folha original</button><button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    const box = m.el.querySelector('[data-sl]'); const read = () => S.forEach((s, i) => { s.modo = box.querySelector(`[data-m="${i}"]`).value; s.titulo = MMUI.clean(box.querySelector(`[data-t="${i}"]`).value, 60); s.mostrar = box.querySelector(`[data-s="${i}"]`).checked; });
    m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-mv]'); if (b) { read(); const i = +b.dataset.i, j = i + +b.dataset.mv; [S[i], S[j]] = [S[j], S[i]]; box.innerHTML = draw(); return; }
      if (e.target.closest('[data-reset]')) { D().struct = null; MMUI.save('Estrutura do relatório reposta'); m.close(); render(); return; }
      if (e.target.closest('[data-ok]')) { read(); if (S.some((s) => /[<>]/.test(s.titulo))) { m.el.querySelector('.mm-err').textContent = 'Os títulos não podem conter < ou >.'; return; } D().struct = S; MMUI.save('Estrutura do relatório alterada'); m.close(); render(); } });
  };
  /* ---------- Importar / exportar / imprimir ---------- */
  const importXlsx = async () => {
    try {
      const f = await MMFile.pick(); if (!f) return; if (typeof XLSX === 'undefined') throw new Error('biblioteca Excel indisponível');
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true }); const sn = wb.SheetNames.find((n) => /base de dados/i.test(n)) || wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '' }); const R = D(); let add = 0, dup = 0, bad = 0; const meses = new Set();
      const pick = (r, ...ks) => { const k = Object.keys(r).find((x) => ks.includes(MMFile.norm(x))); return k ? r[k] : ''; };
      rows.forEach((r) => {
        const d = pick(r, 'data'); const iso = d instanceof Date ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : MMDate.iso(d);
        const tipo = /desp|sa[ií]da/i.test(pick(r, 'tipo')) ? 'Despesa' : /entr/i.test(pick(r, 'tipo')) ? 'Entrada' : ''; const valor = Number(String(pick(r, 'valor kz', 'valor')).replace(/\s/g, '').replace(',', '.'));
        const rec = { data: iso, tipo, categoria: MMUI.clean(pick(r, 'categoria'), 80), subcategoria: MMUI.clean(pick(r, 'subcategoria'), 80), descricao: MMUI.clean(pick(r, 'descricao'), 160), congregacao: MMUI.clean(pick(r, 'congregacao'), 80), valor: Math.round(valor * 100) / 100, obs: MMUI.clean(pick(r, 'observacao'), 200) };
        if (!iso || !tipo || !rec.categoria || !(valor > 0) || Object.values(rec).some((z) => typeof z === 'string' && /[<>]/.test(z))) { bad++; return; }
        const mes = iso.slice(0, 7); if (R.lanc.some((x) => x.mes === mes && x.data === iso && x.tipo === tipo && x.categoria === rec.categoria && x.descricao === rec.descricao && Number(x.valor) === rec.valor)) { dup++; return; }
        R.lanc.push({ id: `rf${Date.now().toString(36)}${add}`, mes, ...rec }); if (!R.meses[mes]) R.meses[mes] = { saldo: 0, notas: '' }; meses.add(mes); add++;
      });
      const rs = wb.SheetNames.find((n) => /^relat/i.test(n)); if (rs) { const ws = wb.Sheets[rs]; const lbl = String(ws.A6?.v || ''); if (/caixa|saldo/i.test(lbl) && Number(ws.B6?.v) && meses.size === 1) { const mes = [...meses][0]; if (!R.meses[mes].saldo) R.meses[mes].saldo = Math.round(Number(ws.B6.v) * 100) / 100; } }
      if (meses.size) R.cur = [...meses].sort().pop();
      if (typeof logActivity === 'function') logActivity('Importou', 'Relatório financeiro', `${add} lançamentos`); MMUI.save(); render();
      MMUI.toast(`Importação: ${add} lançamentos novos${dup ? `, ${dup} repetidos ignorados` : ''}${bad ? `, ${bad} linhas inválidas` : ''}.`);
    } catch (e) { MMUI.toast(`Importação falhou: ${e.message}`); }
  };
  const aoa = (ym) => { const c = calc(ym); const V = D().view; const A = [[V.l1], [V.l2], [V.titulo.replace('{MES}', mesLbl(ym))], [], ['Valor em caixa disponível', c.saldo], [], ['ENTRADA DO MÊS']];
    const main = (b) => b.main.forEach((x) => { if (x.linhas) { x.linhas.forEach((l) => A.push([l.t, l.v])); A.push([`Total de ${x.grupo}`, x.total]); } else A.push([x.t, x.v]); });
    main(c.ent); A.push(['Total parcial', c.ent.mainTotal]); c.ent.secs.forEach((s) => { A.push([], [s.titulo]); s.linhas.forEach((l) => A.push([l.t, l.v])); A.push(['Subtotal', s.total]); });
    A.push(['Total de entradas do mês', c.entradas], ['Total de entradas mais saldo anterior', c.entSaldo], [], ['DESPESAS']); main(c.des); A.push(['Subtotal', c.des.mainTotal]);
    c.des.secs.forEach((s) => { A.push([], [s.titulo]); s.linhas.forEach((l) => A.push([l.t, l.v])); A.push(['Subtotal', s.total]); }); A.push([], ['Total de despesas', c.despesas], ['Saldo a transitar', c.transitar]); return A; };
  const base = (ym) => [['ID', 'Data', 'Tipo', 'Categoria', 'Subcategoria', 'Descrição', 'Congregação', 'Valor (Kz)', 'Observação'], ...ofMonth(ym).map((l, i) => [i + 1, l.data, l.tipo, l.categoria, l.subcategoria, l.descricao, l.congregacao, l.valor, l.obs])];
  const print = () => {
    const fmt = D().view.formato || 'A4-portrait'; const [size, orient] = fmt.split('-'); let st = document.getElementById('v17-page');
    if (!st) { st = document.createElement('style'); st.id = 'v17-page'; document.head.appendChild(st); }
    st.textContent = `@page { size: ${size === 'letter' ? 'letter' : size} ${orient}; margin: 12mm; }`;
    document.body.classList.add('v17-printing'); const done = () => { document.body.classList.remove('v17-printing'); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); window.print(); setTimeout(done, 1500);
  };
  /* ---------- Sub-abas da aba Finanças ---------- */
  let sub = 'resumo';
  const render = () => {
    const sec = document.getElementById('sec-financas'); if (!sec) return; const top = sec.querySelector('.topbar');
    let tabs = sec.querySelector('.v17-tabs'); if (!tabs) { tabs = document.createElement('div'); tabs.className = 'tabs-inline v17-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Finanças'); (top || sec.firstElementChild).insertAdjacentElement('afterend', tabs); }
    tabs.innerHTML = [['resumo', 'Resumo mensal'], ['rel', 'Relatório'], ['cong', 'Congregações'], ['cfin', 'Finanças da congregação']].map(([k, l]) => `<button type="button" role="tab" id="v17t_${k}" aria-selected="${sub === k}" aria-controls="v17p_${k}" tabindex="${sub === k ? 0 : -1}" class="${sub === k ? 'active' : ''}" data-v17tab="${k}">${l}</button>`).join('');
    let box = document.getElementById('v17-rel'); if (!box) { box = document.createElement('div'); box.id = 'v17-rel'; box.setAttribute('role', 'tabpanel'); sec.appendChild(box); }
    box.setAttribute('aria-labelledby', `v17t_${sub}`);
    [...sec.children].forEach((el) => { if (el !== top && el !== tabs && el !== box && !el.classList.contains('v15-area')) el.classList.toggle('v17-off', sub !== 'resumo'); });
    box.hidden = sub === 'resumo';
    if (sub !== 'resumo') { try { box.innerHTML = sub === 'rel' ? html() : sub === 'cfin' ? (typeof V23 !== 'undefined' ? V23.html() : '') : (typeof V19 !== 'undefined' ? V19.html() : ''); } catch (e) { console.error('Finanças:', e); box.innerHTML = `<div class="card empty">Erro ao apresentar: ${E(e.message)}</div>`; } }
  };
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-v17tab]'); if (t) { sub = t.dataset.v17tab; render(); document.getElementById(`v17t_${sub}`)?.focus(); return; }
    const b = e.target.closest('[data-v17]'); if (!b || b.disabled) return; const R = D(); const a = b.dataset.v17; const ym = R.cur;
    const needEdit = ['mes-novo', 'lanc-novo', 'lanc-edit', 'lanc-del', 'mes-save', 'saldo-auto', 'import'].includes(a); if (needEdit && !can()) { MMUI.toast('Não tem permissão de edição nas Finanças.'); return; }
    if (a === 'lanc-novo') lancForm(null);
    else if (a === 'lanc-edit') lancForm(R.lanc.find((l) => l.id === b.dataset.id));
    else if (a === 'lanc-del') { const l = R.lanc.find((x) => x.id === b.dataset.id); if (!l) return; const go = async () => { if (!(await MMUI.confirm(`Eliminar «${l.descricao}» (${kz(l.valor)} Kz)? Poderá recuperá-lo na Lixeira.`, 'Eliminar'))) return; if (typeof moveToTrash === 'function') moveToTrash('relfin', l, `${l.descricao} (${mesLbl(l.mes)})`); R.lanc.splice(R.lanc.indexOf(l), 1); MMUI.save(); render(); };
      if (typeof requirePassword === 'function') requirePassword('admin', 'Introduza a palavra-passe para eliminar este lançamento.', go); else go(); }
    else if (a === 'abrir') { R.cur = b.dataset.ym; MMUI.save(); render(); }
    else if (a === 'mes-novo') { const nxt = (() => { const [y, mm] = Object.keys(R.meses).sort().pop().split('-').map(Number); const d = new Date(y, mm, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
      const m = MMUI.modal({ title: 'Novo mês', size: 'narrow', body: `<form class="mm-form" novalidate><div class="field"><label for="v17n_m">Mês</label><input id="v17n_m" type="month" value="${nxt}" required></div><p class="mm-help">O saldo anterior é o saldo a transitar do mês anterior (pode ser alterado).</p><p class="mm-err" role="alert"></p></form>`, foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Criar</button>' });
      m.el.querySelector('[data-ok]').addEventListener('click', () => { const v = m.el.querySelector('#v17n_m').value; if (!/^\d{4}-\d{2}$/.test(v)) { m.el.querySelector('.mm-err').textContent = 'Escolha o mês.'; return; } if (R.meses[v]) { m.el.querySelector('.mm-err').textContent = 'Esse mês já existe.'; return; }
        const p = prevYm(v); R.meses[v] = { saldo: R.meses[p] ? Math.round(calc(p).transitar * 100) / 100 : 0, notas: '' }; R.cur = v; MMUI.save(`Relatório financeiro: novo mês ${mesLbl(v)}`); m.close(); render(); }); }
    else if (a === 'mes-save') { const F = b.closest('form'); const s = Number(F.saldo.value); if (!Number.isFinite(s)) { F.querySelector('.mm-err').textContent = 'Saldo inválido.'; return; } const n = MMUI.clean(F.notas.value, 600); if (/[<>]/.test(n)) { F.querySelector('.mm-err').textContent = 'As observações não podem conter < ou >.'; return; } R.meses[ym].saldo = Math.round(s * 100) / 100; R.meses[ym].notas = n; MMUI.save(); render(); MMUI.toast('Mês actualizado.'); }
    else if (a === 'saldo-auto') { const p = prevYm(ym); if (!R.meses[p]) { MMUI.toast(`Não existe o mês ${mesLbl(p)} na base de dados.`); return; } R.meses[ym].saldo = Math.round(calc(p).transitar * 100) / 100; MMUI.save(); render(); }
    else if (a === 'lock') Auth0(() => { R.meses[ym].fechado = !R.meses[ym].fechado; MMUI.save(`${R.meses[ym].fechado ? 'Fechou' : 'Reabriu'} o relatório de ${mesLbl(ym)}`); render(); });
    else if (a === 'view') viewForm(); else if (a === 'struct') structForm(); else if (a === 'import') importXlsx(); else if (a === 'print') { if (typeof V22 !== 'undefined') V22.printRel(ym); else print(); }
    else if (a === 'xlsx') { try { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa(ym)), `Relatório ${MESES[+ym.slice(5) - 1]}`.slice(0, 31)); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(base(ym)), 'Base de Dados'); XLSX.writeFile(wb, `Relatorio_Financeiro_${ym}.xlsx`); } catch (err) { MMUI.toast(`Exportação falhou: ${err.message}`); } }
    else if (a === 'csv') { const A = base(ym); MMUI.download(`Relatorio_Financeiro_${ym}.csv`, new Blob([MMUI.csv(A.slice(1).map((r) => Object.fromEntries(A[0].map((h, i) => [h, r[i]]))), A[0])], { type: 'text/csv;charset=utf-8' })); }
  });
  const Auth0 = (fn) => (typeof requireAdminAction === 'function' ? requireAdminAction('admin', 'Introduza a palavra-passe de administrador.', fn) : fn());
  document.addEventListener('change', (e) => {
    if (e.target.matches?.('[data-v17mes]')) { D().cur = e.target.value; MMUI.save(); render(); document.getElementById('v17_mes')?.focus(); }
    if (e.target.matches?.('[data-v17fmt]')) { D().view.formato = e.target.value; MMUI.save(); }
  });
  const install = () => {
    try {
      if (typeof TRASH_TARGET !== 'undefined') { TRASH_TARGET.relfin = () => D().lanc; if (typeof TRASH_LABELS !== 'undefined') TRASH_LABELS.relfin = 'Relatório financeiro'; }
      document.getElementById('nav')?.addEventListener('click', (e) => { if (e.target.closest('button[data-tab="financas"]')) setTimeout(render, 30); });
      if (typeof window.renderFinancas === 'function') { const r0 = window.renderFinancas; window.renderFinancas = function (...a) { const r = r0.apply(this, a); try { render(); } catch (err) { console.warn('V17:', err); } return r; }; }
      render();
    } catch (err) { console.warn('V17:', err); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(install, 250)); else setTimeout(install, 250);
  return { calc, D, render, sheet, kz, mesLbl, prevYm, ofMonth, setSub: (x) => { sub = x; render(); } };
})();
