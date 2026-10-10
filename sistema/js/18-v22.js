/* =====================================================================
   V22 — IMPRIMIR COM ESCOLHA DE FOLHAS E PAPEL (A4 alinhado por omissão) · EXPORTAR OS DADOS DE UMA CONGREGAÇÃO
         PARA A FOLHA CENTRAL (ficam editáveis) · SECRETARIA: OCULTAR CAMPOS E FICAR SÓ COM A FOLHA
   ===================================================================== */
const V22 = (() => {
  'use strict';
  const E = MMUI.esc; const PAPEIS = [['A4 portrait', 'A4 retrato (padrão)'], ['A4 landscape', 'A4 paisagem'], ['A5 portrait', 'A5'], ['letter portrait', 'Carta (Letter)']];
  /** Diálogo de impressão: folhas a incluir e papel. Devolve {sel, papel} ou null. */
  const dialogo = (titulo, folhas, papel0 = 'A4 portrait') => new Promise((res) => {
    const m = MMUI.modal({ title: titulo, size: 'narrow', body: `<form class="mm-form" novalidate><fieldset class="mm-fs"><legend>Folhas a imprimir</legend>${folhas.map(([k, l, on]) => `<label class="mm-check"><input type="checkbox" name="f" value="${E(k)}"${on ? ' checked' : ''}> ${E(l)}</label>`).join('')}</fieldset>
      <div class="field"><label for="v22_p">Papel</label><select id="v22_p">${PAPEIS.map(([v, l]) => `<option value="${v}"${v === papel0 ? ' selected' : ''}>${l}</option>`).join('')}</select></div><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Imprimir</button>' });
    let done = false; const fim = (v) => { if (!done) { done = true; res(v); } };
    m.el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => fim(null)));
    m.el.querySelector('[data-ok]').addEventListener('click', () => { const sel = [...m.el.querySelectorAll('[name="f"]:checked')].map((i) => i.value); if (!sel.length) { m.el.querySelector('.mm-err').textContent = 'Escolha pelo menos uma folha.'; return; } const papel = m.el.querySelector('#v22_p').value; m.close(); fim({ sel, papel }); });
  });
  /** Imprime as páginas dadas (HTML já escapado) só com o conteúdo escolhido. */
  const imprimir = (paginas, papel) => {
    let area = document.getElementById('v22-print-area'); if (!area) { area = document.createElement('div'); area.id = 'v22-print-area'; area.setAttribute('aria-hidden', 'true'); document.body.appendChild(area); }
    area.innerHTML = paginas.map((h) => `<div class="v22-page">${h}</div>`).join(''); let st = document.getElementById('v22-page-style'); if (!st) { st = document.createElement('style'); st.id = 'v22-page-style'; document.head.appendChild(st); }
    st.textContent = `@page { size: ${PAPEIS.some(([v]) => v === papel) ? papel : 'A4 portrait'}; margin: 14mm; }`; document.body.classList.add('v22-printing');
    const fim = () => { document.body.classList.remove('v22-printing'); area.innerHTML = ''; window.removeEventListener('afterprint', fim); }; window.addEventListener('afterprint', fim); window.print(); setTimeout(fim, 2000);
  };
  const tabela = (cab, linhas) => `<table class="v22-tab"><thead><tr>${cab.map((h) => `<th scope="col">${E(h)}</th>`).join('')}</tr></thead><tbody>${linhas.map((r) => `<tr>${r.map((c) => `<td>${E(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  /* ---------- Relatório financeiro ---------- */
  const printRel = async (ym) => {
    const kz = V17.kz; const lbl = V17.mesLbl(ym); const fmt = (V17.D().view.formato || 'A4-portrait').replace('-', ' ');
    const r = await dialogo('Imprimir — relatório financeiro', [['rel', `Relatório de ${lbl}`, true], ['lanc', `Lançamentos de ${lbl}`, false], ['comp', `Compilação das congregações de ${lbl}`, false]], fmt); if (!r) return;
    const pag = { rel: () => V17.sheet(ym), lanc: () => `<h2 class="v22-h">Lançamentos de ${E(lbl)}</h2>${tabela(['Data', 'Tipo', 'Categoria', 'Descrição', 'Congregação', 'Valor (Kz)'], V17.ofMonth(ym).slice().sort((a, b) => String(a.data).localeCompare(b.data)).map((l) => [MMDate.fmt(l.data), l.tipo, l.categoria, l.descricao, l.congregacao || '—', kz(l.valor)]))}`,
      comp: () => { const L = V19.R().pacotes.flatMap((p) => p.meses.filter((m) => m.mes === ym).map((m) => { const t = V19.totais(m); return [p.congregacao, m.lancamentos.length, kz(t.entradas), kz(t.despesas), kz(t.saldoTransitar)]; })); return `<h2 class="v22-h">Compilação das congregações — ${E(lbl)}</h2>${L.length ? tabela(['Congregação', 'Lançamentos', 'Entradas', 'Despesas', 'Saldo a transitar'], L) : '<p>Sem dados das congregações neste mês.</p>'}`; } };
    imprimir(r.sel.map((k) => pag[k]()), r.papel);
  };
  /* ---------- Secretaria ---------- */
  const printSec = async () => {
    const S = V20.D(); const d = S.docs.find((x) => x.id === S.cur); if (!d) return;
    const r = await dialogo('Imprimir — Secretaria', [['doc', `Informação aberta: ${d.assunto}`, true], ['todas', `Todas as informações (${S.docs.length})`, false]]); if (!r) return;
    const docs = r.sel.includes('todas') ? S.docs : [d]; imprimir(docs.map((x) => V20.folha(x)), r.papel);
  };
  /* ---------- Exportar uma congregação para a folha central ---------- */
  const exportar = (id) => {
    const r = V19.R(); const p = r.pacotes.find((x) => x.pacoteId === id); if (!p) return; const mm = p.meses.find((x) => x.mes === r.compMes) || p.meses[0]; const C = V17.D(); const kz = V17.kz;
    const novos = mm.lancamentos.filter((l) => !C.lanc.some((y) => y.id === `cx:${p.pacoteId}:${l.id}`));
    const m = MMUI.modal({ title: `Exportar ${p.congregacao} — ${V17.mesLbl(mm.mes)} para a folha central`, size: 'wide', body: `<p>Os lançamentos passam para <b>Finanças › Relatório</b> de ${E(V17.mesLbl(mm.mes))}, com a congregação indicada, e continuam editáveis lá.</p>
      <fieldset class="mm-fs"><legend>O que exportar</legend><label class="mm-check"><input type="radio" name="v22x" value="todos" checked> Todos os lançamentos (${mm.lancamentos.length}; ${novos.length} ainda não exportados)</label><label class="mm-check"><input type="radio" name="v22x" value="entradas"> Só as entradas</label></fieldset>
      <p class="mm-help">Para lançar apenas os repasses (50 % e Missões) como entradas do Centro, use «Lançar repasses no Centro». Lançamentos já exportados não se repetem.</p><p class="mm-err" role="alert"></p>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Exportar</button>' });
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      if (C.meses[mm.mes] && C.meses[mm.mes].fechado) { m.el.querySelector('.mm-err').textContent = `O relatório do Centro de ${V17.mesLbl(mm.mes)} está fechado.`; return; }
      if (!C.meses[mm.mes]) C.meses[mm.mes] = { saldo: C.meses[V17.prevYm(mm.mes)] ? Math.round(V17.calc(V17.prevYm(mm.mes)).transitar * 100) / 100 : 0, notas: '' };
      const so = m.el.querySelector('[name="v22x"]:checked').value; let n = 0; let tot = 0;
      novos.filter((l) => so === 'todos' || l.tipo === 'Entrada').forEach((l) => { C.lanc.push({ id: `cx:${p.pacoteId}:${l.id}`, mes: mm.mes, data: l.data, tipo: l.tipo, categoria: l.categoria, subcategoria: l.subcategoria, descricao: `${l.descricao} (${p.congregacao})`, congregacao: p.congregacao, valor: l.valor, obs: `Exportado de ${p.congregacao}` }); n++; tot += l.valor; });
      if (typeof logActivity === 'function') logActivity('Exportou para a folha central', 'Relatório financeiro', `${p.congregacao} ${mm.mes}: ${n} lançamentos`); MMUI.save(); m.close(); V17.setSub('cong');
      MMUI.toast(n ? `${n} lançamento(s) exportado(s) (${kz(tot)} Kz). Pode editá-los em Finanças › Relatório.` : 'Nada a exportar: estes lançamentos já estavam na folha central.');
    });
  };
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-v22]'); if (!b || b.disabled) return;
    if (b.dataset.v22 === 'exportar') { if (!MMUI.canEditTab('financas')) { MMUI.toast('Não tem permissão de edição nas Finanças.'); return; } exportar(b.dataset.id); }
    else if (b.dataset.v22 === 'sec-toggle') { const S = V20.D(); S.soFolha = !S.soFolha; MMUI.save(); V20.render(); document.querySelector('[data-v22="sec-toggle"]')?.focus(); } });
  return { printRel, printSec, exportar, imprimir, dialogo };
})();
