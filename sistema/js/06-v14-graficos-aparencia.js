/* =====================================================================
   V14 — APARÊNCIA DOS GRÁFICOS (paleta global, cores por categoria, números, repor)
   Cartão acrescentado à aba «Aparência» (já protegida pela palavra-passe de administração).
   ===================================================================== */
(function () {
  'use strict';
  const E = MMUI.esc;
  /** Categorias conhecidas: as vistas nos gráficos desta sessão + as listas de estados/situações. */
  const categorias = () => {
    const set = new Set(MMCharts.seen);
    try {
      ['situacao', 'genero', 'estadoCivil', 'igreja'].forEach((k) => (DB.members || []).forEach((m) => { if (m[k]) set.add(String(m[k])); }));
      (DB.atividades || []).forEach((a) => { if (a.estado) set.add(String(a.estado)); });
      (DB.inventario || []).forEach((i) => { if (i.estado) set.add(String(i.estado)); if (i.categoria) set.add(String(i.categoria)); });
    } catch (_) { /* dados ainda não carregados */ }
    Object.keys(MMCharts.look().semantic || {}).forEach((k) => set.add(k));
    return [...set].filter((x) => x && x.length <= 60).sort((a, b) => a.localeCompare(b, 'pt')).slice(0, 120);
  };
  const html = () => {
    const L = MMCharts.look(); const pal = MMCharts.palette().slice(0, 10); const sem = L.semantic || {}; const n = Object.keys(MMCharts.store().prefs).length;
    return `<h3 class="u-v14-h">Gráficos — definições globais</h3>
      <p class="sub">Aplicam-se a todos os gráficos do sistema. Cada gráfico pode ainda ser personalizado na sua própria barra de ferramentas (✎) ou clicando numa barra — só o administrador e os utilizadores com edição em «Aparência».</p>
      <form class="mm-form" id="v14-chart-look" novalidate>
        <fieldset class="mm-fs"><legend>Paleta de cores</legend><div class="mm-grid c5">${pal.map((c, i) => `<div class="field"><label for="v14pal${i}">Cor ${i + 1}</label><input id="v14pal${i}" type="color" data-pal="${i}" value="${E(MMUI.color(c, '#12213a'))}"></div>`).join('')}</div></fieldset>
        <div class="mm-grid c3"><div class="field"><label for="v14-vals">Números sobre os gráficos</label><select id="v14-vals"><option value="">Como cada gráfico foi desenhado</option><option value="1"${L.showValues === true ? ' selected' : ''}>Mostrar em todos</option><option value="0"${L.showValues === false ? ' selected' : ''}>Ocultar em todos</option></select></div></div>
        <details class="mm-details"${Object.keys(sem).length ? ' open' : ''}><summary>Cores por categoria / estado (${Object.keys(sem).length} definidas)</summary>
          <p class="mm-help">Ex.: «Ativo» a verde e «Suspenso» a vermelho em todos os gráficos. Active a caixa ao lado da cor para a aplicar.</p>
          <div class="mm-grid c4 v14-sem">${categorias().map((k, i) => `<div class="field"><label for="v14s${i}">${E(k)}</label><div class="mm-row"><input type="checkbox" data-semon="${i}"${sem[k] ? ' checked' : ''} aria-label="Aplicar cor a ${E(k)}"><input id="v14s${i}" type="color" data-sem="${E(k)}" value="${E(MMUI.color(sem[k], '#b8892b'))}"></div></div>`).join('')}</div></details>
        <p class="mm-err" role="alert"></p>
        <div class="v14-actions"><button type="button" class="btn gold sm" data-v14look="save">Guardar definições dos gráficos</button><button type="button" class="btn ghost sm" data-v14look="pal">Repor paleta original</button>
          <button type="button" class="btn danger sm" data-v14look="reset">Repor todas as personalizações (${n} ${n === 1 ? 'gráfico' : 'gráficos'})</button></div></form>`;
  };
  const draw = () => {
    const sec = document.getElementById('sec-aparencia'); if (!sec) return;
    let card = document.getElementById('v14-graficos');
    if (!card) { card = document.createElement('div'); card.id = 'v14-graficos'; card.className = 'card v14-card'; sec.appendChild(card); }
    card.innerHTML = html();
  };
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-v14look]'); if (!b) return;
    if (!MMCharts.canEdit()) { MMCharts.deny(); return; }
    const f = document.getElementById('v14-chart-look'); const L = MMCharts.look(); const act = b.dataset.v14look;
    try {
      if (act === 'save') {
        const pal = [...f.querySelectorAll('[data-pal]')].map((x) => MMUI.color(x.value)).filter(Boolean);
        L.palette = pal; const v = document.getElementById('v14-vals').value; if (v === '') delete L.showValues; else L.showValues = v === '1';
        const sem = {}; f.querySelectorAll('[data-sem]').forEach((x, i) => { const on = f.querySelector(`[data-semon="${i}"]`); const c = MMUI.color(x.value); if (on && on.checked && c) sem[x.dataset.sem] = c; });
        L.semantic = sem;
        MMCharts.applyLook(); MMUI.save('Definições globais dos gráficos'); MMCharts.rebuildAll(); draw(); MMUI.toast('Definições dos gráficos guardadas e aplicadas.');
      } else if (act === 'pal') {
        delete L.palette; MMCharts.applyLook(); MMUI.save('Paleta dos gráficos reposta'); MMCharts.rebuildAll(); draw(); MMUI.toast('Paleta original reposta.');
      } else if (act === 'reset') {
        if (!(await MMUI.confirm('Repor títulos, cores, nomes, números editados, tipos e valores ocultos de todos os gráficos?', 'Repor tudo'))) return;
        DB.settings.chartPrefs = {}; MMUI.save('Personalizações dos gráficos repostas');
        document.querySelectorAll('[data-mm-title]').forEach((h) => { h.textContent = h.dataset.mmTitle; delete h.dataset.mmTitle; });
        MMCharts.rebuildAll(); draw(); MMUI.toast('Personalizações de todos os gráficos repostas.');
      }
    } catch (err) { const box = f && f.querySelector('.mm-err'); if (box) box.textContent = `Não foi possível aplicar: ${err.message}`; }
  });
  // Instala-se depois de todas as camadas (a aba Aparência é desenhada por renderAparencia)
  const install = () => {
    MMCharts.applyLook();
    if (typeof window.renderAparencia === 'function' && !window.renderAparencia.__v14) {
      const r0 = window.renderAparencia;
      window.renderAparencia = function (...a) { const out = r0.apply(this, a); try { draw(); } catch (err) { console.warn('Aparência V14:', err); } return out; };
      window.renderAparencia.__v14 = true;
    }
    draw();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
