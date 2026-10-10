/* =====================================================================
   V14 — VARREDURA E CORRECÇÕES
   · «+ Outro (escrever)…» nas listas do formulário de membro (antes um onchange inline)
   · menu lateral acessível (aria-current, rótulos) e navegação por teclado
   · modo escuro opcional (preferência deste navegador) com as mesmas variáveis CSS
   · registo da versão V14 e nota das novidades na Ajuda
   Nenhum dado existente é alterado.
   ===================================================================== */
(function () {
  'use strict';
  const THEME_KEY = 'monteMoriaTema_v14';

  /* 1) Campo «Outro» das listas dinâmicas (substitui o handler inline removido) */
  document.addEventListener('change', (e) => {
    const s = e.target; if (!(s instanceof HTMLSelectElement) || !s.dataset.dyn) return;
    const inp = s.nextElementSibling; if (!inp || !inp.matches('[data-f-custom]')) return;
    const outro = s.value === '__outro__'; inp.classList.toggle('is-hidden', !outro); inp.style.display = '';
    if (outro) inp.focus(); else inp.value = '';
  });

  /* 2) Menu lateral: página actual anunciada aos leitores de ecrã */
  const markNav = () => {
    const nav = document.getElementById('nav'); if (!nav) return; nav.setAttribute('aria-label', 'Menu principal');
    nav.querySelectorAll('button[data-tab]').forEach((b) => { if (b.classList.contains('active')) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    nav.querySelectorAll('svg').forEach((svg) => svg.setAttribute('aria-hidden', 'true'));
  };
  document.getElementById('nav')?.addEventListener('click', () => setTimeout(markNav, 0));

  /* 3) Modo escuro (opcional) */
  const chart0 = {};
  const applyTheme = (t) => {
    try { if (window.Chart && Chart.defaults) { if (!('color' in chart0)) { chart0.color = Chart.defaults.color; chart0.border = Chart.defaults.borderColor; }
      Chart.defaults.color = t === 'dark' ? '#CFD5DF' : chart0.color; Chart.defaults.borderColor = t === 'dark' ? 'rgba(255,255,255,0.10)' : chart0.border; } } catch (_) { /* sem gráficos */ }
    document.documentElement.dataset.mmTheme = t === 'dark' ? 'dark' : 'light'; const b = document.getElementById('v14-theme'); if (b) { b.setAttribute('aria-pressed', String(t === 'dark')); b.textContent = t === 'dark' ? '☀ Modo claro' : '◐ Modo escuro'; } };
  const themeBtn = () => {
    const foot = document.querySelector('.sidebar-foot'); if (!foot || document.getElementById('v14-theme')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'v14-theme'; b.className = 'btn ghost sm v14-theme-btn';
    b.addEventListener('click', () => { const t = document.documentElement.dataset.mmTheme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(THEME_KEY, t); } catch (_) { /* privado */ } applyTheme(t); try { MMCharts.rebuildAll(); } catch (_) { /* sem gráficos */ } });
    foot.prepend(b);
  };

  /* 3b) Telemóvel: menu lateral em gaveta (mobile-first), com botão ☰, Esc e sobreposição */
  const mobileNav = () => {
    const side = document.querySelector('.sidebar'); const main = document.querySelector('main.main'); if (!side || !main || document.getElementById('v14-menu')) return;
    side.id = side.id || 'v14-sidebar'; side.setAttribute('aria-label', 'Menu lateral');
    const bar = document.createElement('div'); bar.className = 'v14-mobilebar';
    bar.innerHTML = `<button type="button" id="v14-menu" class="btn ghost sm" aria-controls="${side.id}" aria-expanded="false" aria-label="Abrir o menu">☰</button><span class="v14-mobilebar-t">${MMUI.esc(document.querySelector('.brand h1')?.textContent || 'Centro Monte Moriá')}</span>`;
    main.prepend(bar);
    const ov = document.createElement('div'); ov.className = 'v14-nav-overlay'; ov.hidden = true; document.body.appendChild(ov);
    const btn = bar.querySelector('#v14-menu');
    const set = (open) => { side.classList.toggle('v14-open', open); ov.hidden = !open; btn.setAttribute('aria-expanded', String(open)); btn.setAttribute('aria-label', open ? 'Fechar o menu' : 'Abrir o menu'); if (open) side.querySelector('button')?.focus(); };
    btn.addEventListener('click', () => set(!side.classList.contains('v14-open')));
    ov.addEventListener('click', () => { set(false); btn.focus(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && side.classList.contains('v14-open')) { set(false); btn.focus(); } });
    document.getElementById('nav')?.addEventListener('click', (e) => { if (e.target.closest('button[data-tab]') && window.matchMedia('(max-width: 900px)').matches) set(false); });
  };

  /* 3c) Rótulos acessíveis: associa <label> aos campos (padrão «.field») e dá nome aos filtros sem rótulo */
  let seq = 0;
  const fixLabels = () => {
    document.querySelectorAll('.field').forEach((f) => {
      const l = f.querySelector(':scope > label:not([for])'); const c = f.querySelectorAll(':scope > input:not([type=hidden]), :scope > select, :scope > textarea');
      if (l && c.length === 1) { const el = c[0]; if (!el.id) { seq += 1; el.id = `mmf_${seq}`; } l.htmlFor = el.id; }
    });
    document.querySelectorAll('#app input:not([type=hidden]), #app select, #app textarea').forEach((el) => {
      if ((el.labels && el.labels.length) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.title) return;
      const t = (el.dataset.tabName || el.dataset.tlbl) ? `Nome da aba ${el.value || el.dataset.tabName || el.dataset.tlbl}` : el.tagName === 'SELECT' ? String(el.options[0]?.textContent || '').split('—')[0].trim() : (el.placeholder || (el.type === 'file' ? 'Escolher ficheiro' : el.type === 'date' ? (/(-de|-inicio|-from)$/i.test(el.id) ? 'Data inicial' : /(-ate|-fim|-to)$/i.test(el.id) ? 'Data final' : 'Data') : ''));
      if (t) el.setAttribute('aria-label', t);
    });
  };
  let fixT = null; const watch = () => { const app = document.getElementById('app'); if (!app || !window.MutationObserver) return; new MutationObserver(() => { clearTimeout(fixT); fixT = setTimeout(fixLabels, 150); }).observe(app, { childList: true, subtree: true }); };

  /* 4) Novidades na Ajuda */
  const helpCard = () => {
    const sec = document.getElementById('sec-ajuda'); if (!sec || document.getElementById('v14-help')) return;
    const c = document.createElement('div'); c.id = 'v14-help'; c.className = 'card v14-card';
    c.innerHTML = `<h3 class="u-v14-h">Novidades da V15</h3><ul class="v14-list">
      <li><b>Indicadores e gráficos em todas as abas</b>: «+ Indicador» (contagem, soma, média, mínimo, máximo, distintos, preenchidos, percentagem com condição) e «+ Gráfico» (qualquer fonte de dados, agrupamento por campo ou por ano/mês, séries, filtro, tipo). As abas sem gráficos passaram a ter gráficos predefinidos, editáveis e removíveis.</li>
      <li><b>Dados protegidos nas edições</b>: abrir «Editar» e guardar já não apaga município, província, situação, datas em texto («S/D»), campos importados nem números (membros, convertidos, disciplina, visitantes, cultos e inventário).</li>
      <li><b>Convertidos</b>: colunas alinhadas com os cabeçalhos. <b>Lixeira</b>: convertidos, finanças e organigrama voltam a ser restaurados. <b>Organigrama</b>: contactos «S/D» ignorados e vários números aceites.</li></ul>
      <h3 class="u-v14-h">Novidades da V14</h3><ul class="v14-list">
      <li><b>Gráficos</b>: barra de ferramentas em todos os gráficos (tipo, números, tabela, PNG, CSV, valores apresentados, personalizar). Clique numa barra para mudar nome, número e cor; duplo clique para ocultar um valor. Definições globais em Aparência → «Gráficos». Só o administrador e utilizadores com edição em Aparência personalizam.</li>
      <li><b>Registo de Actividades</b>: tipo, responsável, local, hora, participantes, orçamento e campos adicionais, filtros, colunas à escolha, ordenação, importação e exportação Excel/CSV.</li>
      <li><b>Organigrama</b>: hierarquia com fotografias e, na sub-aba <b>Departamentos</b>, a estrutura das Direcções com responsáveis e número de membros.</li>
      <li><b>Correcções</b>: importação/exportação Excel reposta (a biblioteca estava danificada na V13.1), estilos da V13 aplicados, estilos e eventos inline retirados, modo escuro opcional.</li></ul>`;
    sec.appendChild(c);
  };

  const init = () => {
    try {
      let t = 'light'; try { t = localStorage.getItem(THEME_KEY) || 'light'; } catch (_) { /* privado */ }
      themeBtn(); applyTheme(t); if (t === 'dark') { try { MMCharts.rebuildAll(); } catch (_) { /* sem gráficos */ } } markNav(); helpCard(); mobileNav(); fixLabels(); watch();
      if (typeof DB !== 'undefined' && DB && DB.settings) { DB.settings.system = DB.settings.system || {}; if (!DB.settings.system.v14) DB.settings.system.v14 = { instaladaEm: new Date().toISOString() }; if (!DB.settings.system.v15) { DB.settings.system.v15 = { instaladaEm: new Date().toISOString() }; if (typeof saveDB === 'function') saveDB(); } }
    } catch (e) { console.warn('V14 (varredura):', e); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
