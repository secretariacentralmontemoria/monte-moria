/* =====================================================================
   V23 — FINANÇAS › «FINANÇAS DA CONGREGAÇÃO»: o mesmo trabalho da aplicação offline das congregações,
   dentro do sistema principal (congregação + mês, indicadores, lançamentos, folha ao estilo do Centro com
   subtotais, assinaturas do tesoureiro e do líder, imprimir e exportar o pacote .json). Os dados entram na
   compilação das congregações (Finanças › Congregações) como «registo manual».
   ===================================================================== */
const V23 = (() => {
  'use strict';
  const E = MMUI.esc; const C = (s, n = 200) => MMUI.clean(s, n);
  const CONGS = ['Monte Moriá', 'Monte Sinai', 'Cenáculo da Fé', 'Tabernáculo de Davi'];
  const CATS = { Entrada: ['Dízimos', 'Ofertas', 'Missões', 'Beneficência', 'Outras entradas'], Despesa: ['50% para o Centro', 'Missões (envio ao Centro)', 'Apoio social', 'Manutenção', 'Alimentação', 'Serviços de telecomunicação', 'Transporte', 'Outras despesas'] };
  const SECS = { Manutenção: 'MANUTENÇÃO DO TEMPLO', Alimentação: 'ALIMENTAÇÃO', 'Serviços de telecomunicação': 'SERVIÇOS DE TELECOMUNICAÇÃO', Transporte: 'TRANSPORTE' };
  const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const st = { cong: CONGS[1], mes: null, edit: null };
  const R = () => V19.R(); const can = () => MMUI.canEditTab('financas');
  const nomes = () => [...new Set([...CONGS, ...R().pacotes.map((p) => p.congregacao)])];
  /** Pacote «manual» da congregação e mês escolhidos (criado quando se grava o primeiro dado). */
  const pkg = (criar = false) => { const r = R(); const mes = st.mes || r.compMes; const id = `manual-${slug(st.cong)}-${mes}`; let p = r.pacotes.find((x) => x.pacoteId === id);
    if (!p && criar) { const ant = r.pacotes.find((x) => MMFile.norm(x.congregacao) === MMFile.norm(st.cong) && x.meses.some((m) => m.mes === V17.prevYm(mes)));
      const mAnt = ant && ant.meses.find((m) => m.mes === V17.prevYm(mes)); const ult = r.pacotes.filter((x) => MMFile.norm(x.congregacao) === MMFile.norm(st.cong)).pop();
      p = { pacoteId: id, congregacao: st.cong, responsavel: ult ? ult.responsavel : '', lider: ult ? ult.lider : '', telefone: '', gerado: new Date().toISOString(), recebido: new Date().toISOString(), integridade: 'manual', formato: 'manual',
        meses: [{ mes, saldo: mAnt ? Math.round(V19.totais(mAnt).saldoTransitar * 100) / 100 : 0, notas: '', lancamentos: [] }] }; r.pacotes.push(p); }
    return p; };
  const mesDe = (p) => (p ? p.meses.find((m) => m.mes === (st.mes || R().compMes)) || p.meses[0] : null);
  /* ---------- folha ao estilo do Centro ---------- */
  const folha = (p, m) => {
    const kz = V17.kz; const L = m ? m.lancamentos : []; const t = m ? V19.totais(m) : { entradas: 0, despesas: 0, saldoTransitar: 0 }; const saldo = m ? Number(m.saldo) || 0 : 0;
    const row = (a, v, c = '') => `<tr class="${c}"><th scope="row">${E(a)}</th><td>${kz(v)}</td></tr>`; const head = (a) => `<tr class="sec"><th colspan="2" scope="colgroup">${E(a)}</th></tr>`;
    const bloco = (tipo) => { const main = {}; const secs = {}; L.filter((l) => l.tipo === tipo).forEach((l) => { const sec = tipo === 'Despesa' && SECS[l.categoria]; if (sec) (secs[sec] = secs[sec] || []).push(l); else { const k = l.subcategoria || l.categoria; main[k] = (main[k] || 0) + l.valor; } });
      const mt = Object.values(main).reduce((a, b) => a + b, 0); return { rows: Object.entries(main).map(([k, v]) => row(k, v)).join(''), mt, secs: Object.entries(secs).map(([k, ls]) => head(k) + ls.map((l) => row(l.descricao, l.valor)).join('') + row('Subtotal', ls.reduce((a, l) => a + l.valor, 0), 'tot')).join('') }; };
    const en = bloco('Entrada'); const de = bloco('Despesa'); const cab = { l1: 'ASSEMBLEIA DE DEUS PENTECOSTAL', l2: 'MINISTÉRIO BETEL-LUANDA', ...V20.D().cab };
    return `<article class="v17-sheet" aria-label="Relatório da congregação"><header class="v17-head"><img class="v17-logo" src="${E(MMBrand.logo())}" alt="Logótipo da Assembleia de Deus Pentecostal"><div><p class="v17-l1">${E(cab.l1)}</p><p class="v17-l2">${E(cab.l2)}</p><h3 class="v17-t">${E(st.cong)} — relatório de ${E(V17.mesLbl(st.mes || R().compMes))}</h3></div></header>
      <table class="v17-tab"><caption class="sr-only">Relatório da congregação</caption><colgroup><col><col class="v17-v"></colgroup><tbody>${row('Valor em caixa disponível (saldo anterior)', saldo, 'big')}${head('ENTRADA DO MÊS')}${en.rows}${row('Total parcial', en.mt, 'tot')}${en.secs}
        ${row('Total de entradas do mês', t.entradas, 'big')}${row('Total de entradas mais saldo anterior', t.entradas + saldo, 'big')}${head('DESPESAS')}${de.rows}${row('Subtotal', de.mt, 'tot')}${de.secs}${row('Total de despesas', t.despesas, 'big neg')}${row('Saldo a transitar', t.saldoTransitar, `big ${t.saldoTransitar < 0 ? 'neg' : 'pos'}`)}</tbody></table>
      ${m && m.notas ? `<p class="v17-notas"><b>Observações:</b> ${E(m.notas)}</p>` : ''}<div class="v17-assin"><div><span></span>O(A) Tesoureiro(a)<br>${E(p ? p.responsavel || '' : '')}</div><div><span></span>O Líder<br>${E(p ? p.lider || '' : '')}</div></div></article>`;
  };
  /* ---------- sub-aba ---------- */
  const html = () => {
    if (!st.mes) st.mes = R().compMes; const p = pkg(false); const m = mesDe(p); const kz = V17.kz; const ed = can(); const t = m ? V19.totais(m) : { entradas: 0, despesas: 0, saldoTransitar: 0 }; const L = m ? m.lancamentos.slice().sort((a, b) => a.data.localeCompare(b.data)) : [];
    const k = (v, l, c = '') => `<div class="kpi ${c}"><div class="num">${E(v)}</div><div class="lbl">${E(l)}</div></div>`; const x = st.edit && m ? m.lancamentos.find((l) => l.id === st.edit) : null;
    return `<div class="v14-toolbar v17-bar" role="toolbar" aria-label="Finanças da congregação"><label class="sr-only" for="v23_c">Congregação</label><select id="v23_c" data-v23sel="cong">${nomes().map((n) => `<option${n === st.cong ? ' selected' : ''}>${E(n)}</option>`).join('')}</select>
        <label class="sr-only" for="v23_m">Mês</label><input id="v23_m" type="month" data-v23sel="mes" value="${E(st.mes)}"><button type="button" class="btn ghost sm" data-v23="print">Imprimir…</button><button type="button" class="btn ghost sm" data-v23="json"${p ? '' : ' disabled'}>Exportar pacote (.json)</button><button type="button" class="btn ghost sm" data-v23="comp">Ver na compilação</button></div>
      <div class="kpi-grid">${k(`${kz(m ? m.saldo : 0)} Kz`, 'Saldo anterior')}${k(`${kz(t.entradas)} Kz`, 'Entradas')}${k(`${kz(t.despesas)} Kz`, 'Despesas')}${k(`${kz(t.saldoTransitar)} Kz`, 'Saldo a transitar', t.saldoTransitar < 0 ? 'neg' : '')}${k(L.length, 'Lançamentos')}</div>
      <div class="v17-grid"><div class="v17-side">
        <form class="card mm-form" data-v23f="nomes" novalidate><h3 class="u-v14-h">Nomes e saldo de ${E(st.cong)}</h3><div class="mm-grid"><div class="field"><label for="v23_t">Tesoureiro(a)</label><input id="v23_t" name="responsavel" maxlength="80" value="${E(p ? p.responsavel || '' : '')}"${ed ? '' : ' disabled'}></div>
          <div class="field"><label for="v23_l">Líder</label><input id="v23_l" name="lider" maxlength="80" value="${E(p ? p.lider || '' : '')}"${ed ? '' : ' disabled'}></div><div class="field"><label for="v23_s">Saldo anterior (Kz)</label><input id="v23_s" name="saldo" type="number" step="0.01" value="${E(m ? m.saldo : 0)}"${ed ? '' : ' disabled'}></div>
          <div class="field mm-full"><label for="v23_o">Observações do mês</label><input id="v23_o" name="notas" maxlength="400" value="${E(m ? m.notas || '' : '')}"${ed ? '' : ' disabled'}></div></div><p class="mm-err" role="alert"></p><button type="button" class="btn ghost sm" data-v23="nomes"${ed ? '' : ' disabled'}>Guardar nomes e saldo</button></form>
        <form class="card mm-form" data-v23f="lanc" novalidate><h3 class="u-v14-h">${x ? 'Corrigir lançamento' : 'Novo lançamento'}</h3><div class="mm-grid">
          <div class="field"><label for="v23_d">Data *</label><input id="v23_d" name="data" type="date" value="${E(x ? x.data : `${st.mes}-01`)}"></div><div class="field"><label for="v23_tp">Tipo *</label><select id="v23_tp" name="tipo">${['Entrada', 'Despesa'].map((o) => `<option${x && x.tipo === o ? ' selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="field"><label for="v23_ca">Categoria *</label><input id="v23_ca" name="categoria" list="v23_cl" maxlength="80" value="${E(x ? x.categoria : '')}"><datalist id="v23_cl">${[...CATS.Entrada, ...CATS.Despesa].map((c) => `<option value="${E(c)}">`).join('')}</datalist></div>
          <div class="field"><label for="v23_sc">Subcategoria</label><input id="v23_sc" name="subcategoria" maxlength="80" value="${E(x ? x.subcategoria || '' : '')}"></div><div class="field mm-full"><label for="v23_ds">Descrição *</label><input id="v23_ds" name="descricao" maxlength="160" value="${E(x ? x.descricao : '')}"></div>
          <div class="field"><label for="v23_v">Valor (Kz) *</label><input id="v23_v" name="valor" type="number" min="0.01" step="0.01" value="${E(x ? x.valor : '')}"></div><div class="field"><label for="v23_ob">Observação</label><input id="v23_ob" name="obs" maxlength="200" value="${E(x ? x.obs || '' : '')}"></div></div>
          <p class="mm-err" role="alert"></p><button type="button" class="btn gold sm" data-v23="guardar"${ed ? '' : ' disabled'}>Guardar lançamento</button>${x ? ' <button type="button" class="btn ghost sm" data-v23="cancelar">Cancelar edição</button>' : ''}</form>
        <div class="card"><h3 class="u-v14-h">Lançamentos de ${E(V17.mesLbl(st.mes))} (${L.length})</h3><div class="tbl-scroll"><table class="data-table"><caption class="sr-only">Lançamentos da congregação</caption><thead><tr><th scope="col">Data</th><th scope="col">Tipo</th><th scope="col">Categoria</th><th scope="col">Descrição</th><th scope="col">Valor</th><th scope="col">Ações</th></tr></thead>
          <tbody>${L.map((l) => `<tr><td>${E(MMDate.fmt(l.data))}</td><td>${E(l.tipo)}</td><td>${E(l.categoria)}</td><td>${E(l.descricao)}</td><td class="mm-num">${kz(l.valor)}</td><td class="mm-actions"><button type="button" class="btn ghost sm" data-v23="editar" data-id="${E(l.id)}"${ed ? '' : ' disabled'}>Editar</button><button type="button" class="btn danger sm" data-v23="eliminar" data-id="${E(l.id)}"${ed ? '' : ' disabled'}>Eliminar</button></td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">Sem lançamentos neste mês.</div></td></tr>'}</tbody></table></div></div></div>
      <div class="card v17-paper">${folha(p, m)}</div></div>`;
  };
  const re = () => V17.setSub('cfin');
  document.addEventListener('change', (e) => { const s = e.target.closest?.('[data-v23sel]'); if (!s) return; if (s.dataset.v23sel === 'cong') st.cong = s.value; else if (/^\d{4}-\d{2}$/.test(s.value)) { st.mes = s.value; R().compMes = s.value; } st.edit = null; re(); document.getElementById(s.id)?.focus(); });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-v23]'); if (!b || b.disabled) return; const a = b.dataset.v23;
    if (['nomes', 'guardar', 'editar', 'eliminar'].includes(a) && !can()) { MMUI.toast('Não tem permissão de edição nas Finanças.'); return; }
    try {
      if (a === 'nomes') { const F = b.closest('form'); const s = Number(F.saldo.value); if (!Number.isFinite(s)) { F.querySelector('.mm-err').textContent = 'Saldo inválido.'; return; } const p = pkg(true); const m = mesDe(p);
        p.responsavel = C(F.responsavel.value, 80); p.lider = C(F.lider.value, 80); m.saldo = Math.round(s * 100) / 100; m.notas = C(F.notas.value, 400); MMUI.save(`Congregação ${st.cong}: nomes e saldo`); re(); MMUI.toast('Guardado.'); }
      else if (a === 'guardar') { const F = b.closest('form'); const p = pkg(true); const m = mesDe(p); const l = V19.lanc({ id: st.edit || `m${Date.now().toString(36)}`, data: F.data.value, tipo: F.tipo.value, categoria: F.categoria.value, subcategoria: F.subcategoria.value, descricao: F.descricao.value, valor: F.valor.value, obs: F.obs.value }, m.mes);
        if (!l) { F.querySelector('.mm-err').textContent = `Verifique: data de ${V17.mesLbl(m.mes)}, categoria, descrição e valor maior que zero.`; return; }
        const old = st.edit && m.lancamentos.find((y) => y.id === st.edit); if (old) Object.assign(old, l); else m.lancamentos.push(l); st.edit = null; MMUI.save(`Congregação ${st.cong}: lançamento`); re(); MMUI.toast('Lançamento guardado.'); }
      else if (a === 'editar') { st.edit = b.dataset.id; re(); document.getElementById('v23_ds')?.focus(); }
      else if (a === 'cancelar') { st.edit = null; re(); }
      else if (a === 'eliminar') { const m = mesDe(pkg(false)); const l = m && m.lancamentos.find((y) => y.id === b.dataset.id); if (l && await MMUI.confirm(`Eliminar «${l.descricao}»?`, 'Eliminar')) { m.lancamentos.splice(m.lancamentos.indexOf(l), 1); MMUI.save(); re(); } }
      else if (a === 'comp') V17.setSub('cong');
      else if (a === 'print') { const r = await V22.dialogo('Imprimir — finanças da congregação', [['rel', `Relatório de ${st.cong} — ${V17.mesLbl(st.mes)}`, true]]); if (r) V22.imprimir([folha(pkg(false), mesDe(pkg(false)))], r.papel); }
      else if (a === 'json') { const p = pkg(false); if (!p) return; const meses = p.meses.map((m) => ({ mes: m.mes, saldo: m.saldo, notas: m.notas || '', totais: V19.totais(m), lancamentos: m.lancamentos }));
        const pk = { formato: 'mm-congregacao', versao: 1, gerado: new Date().toISOString(), app: 'Sistema V23 — Finanças da congregação', congregacao: p.congregacao, responsavel: p.responsavel, lider: p.lider, telefone: '', pacoteId: `${p.pacoteId}-${Date.now().toString(36)}`, controlo: { lancamentos: meses.reduce((t, m) => t + m.lancamentos.length, 0), assinatura: V19.hash(JSON.stringify(meses)) }, meses };
        MMUI.download(`MonteMoria_${slug(p.congregacao)}_${st.mes}.json`, new Blob([JSON.stringify(pk, null, 1)], { type: 'application/json' })); }
    } catch (err) { MMUI.toast(`Erro: ${err.message}`); }
  });
  return { html, folha };
})();
