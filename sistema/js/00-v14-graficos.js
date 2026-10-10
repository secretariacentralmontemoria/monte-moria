/* =====================================================================
   V14 — DEFINIÇÕES DOS GRÁFICOS (modelo DPDORE) + utilitários de interface
   Carregado antes da aplicação: todos os gráficos criados com "new Chart"
   passam por aqui e ganham, sem alterar o código de cada aba:
     · barra de ferramentas: tipo, números, tabela, PNG, CSV, valores apresentados, personalizar
     · clique numa barra/sector: nome, número e cor (série inteira nos gráficos com várias séries)
     · duplo clique: ocultar esse valor (com lista acessível por teclado para repor)
     · título, legenda, altura e cores guardados por gráfico (DB.settings.chartPrefs)
     · paleta global e cores por categoria (Aparência)
   Só o administrador e os utilizadores com edição em «Aparência» personalizam.
   ===================================================================== */
'use strict';

/* ---------- Utilitários de interface V14 (modal acessível, avisos, ficheiros) ---------- */
const MMUI = {
  esc: (s) => (s === null || s === undefined ? '' : String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))),
  clean: (s, max = 300) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max),
  toast(msg, kind = '') { try { if (typeof toast === 'function') { toast(msg); return; } } catch (_) { /* segue */ } console.info(msg); if (kind === 'err') console.warn(msg); },
  /** Modal acessível: role=dialog, foco preso, Esc fecha, devolve o foco a quem abriu. */
  modal({ title, body = '', foot = '', size = '' }) {
    const opener = document.activeElement; const id = `mmm_${Math.random().toString(36).slice(2, 8)}`;
    const bg = document.createElement('div'); bg.className = 'mm-modal-bg';
    bg.innerHTML = `<div class="mm-modal ${size}" role="dialog" aria-modal="true" aria-labelledby="${id}"><header><h3 id="${id}">${MMUI.esc(title)}</h3>
      <button type="button" class="mm-x" data-close aria-label="Fechar">×</button></header><div class="mm-body">${body}</div>${foot ? `<footer>${foot}</footer>` : ''}</div>`;
    document.body.appendChild(bg);
    const box = bg.querySelector('.mm-modal');
    const focusables = () => [...box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((e) => !e.disabled && e.offsetParent !== null);
    const close = () => { bg.remove(); document.removeEventListener('keydown', key, true); if (opener && opener.focus) opener.focus(); };
    const key = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') { const f = focusables(); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    };
    document.addEventListener('keydown', key, true);
    bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
    setTimeout(() => (box.querySelector('[autofocus]') || focusables()[1] || focusables()[0])?.focus(), 30);
    return { el: box, body: box.querySelector('.mm-body'), close };
  },
  confirm(message, ok = 'Confirmar') {
    return new Promise((res) => {
      const m = MMUI.modal({ title: 'Confirmar', body: `<p>${MMUI.esc(message)}</p>`, foot: `<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn danger sm" data-ok>${MMUI.esc(ok)}</button>` });
      m.el.querySelector('[data-ok]').addEventListener('click', () => { m.close(); res(true); });
      m.el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => res(false)));
    });
  },
  download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); },
  csv(rows, cols) {
    const cell = (v) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return '\ufeff' + [cols.map(cell).join(';'), ...rows.map((r) => cols.map((c) => cell(r[c])).join(';'))].join('\n');
  },
  color: (v, fb = '') => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : fb),
  isAdmin() { try { const u = typeof currentSessionUser === 'function' ? currentSessionUser() : null; return !!(u && (u.isAdmin || u.username === 'admin')); } catch (_) { return false; } },
  /** Permissão de edição numa aba (modelo V8: none/read/edit). */
  canEditTab(tab) { try { if (MMUI.isAdmin()) return true; return typeof window.getTabPermissionV8 === 'function' ? window.getTabPermissionV8(tab) === 'edit' : false; } catch (_) { return false; } },
  save(what) { try { if (typeof saveDB === 'function') saveDB(); if (what && typeof logActivity === 'function') logActivity('Alterou', 'Personalização', what); } catch (e) { MMUI.toast(`Não foi possível guardar: ${e.message}`, 'err'); } }
};

const MM_CHART_TYPES = [['bar', 'Barras'], ['hbar', 'Barras horizontais'], ['line', 'Linha'], ['doughnut', 'Rosca'], ['pie', 'Circular'], ['polarArea', 'Área polar'], ['radar', 'Radar']];
const MM_CIRC = ['pie', 'doughnut', 'polarArea'];

const MMCharts = {
  src: {}, keep: {}, orig: {}, seen: new Set(), _clk: null,
  canEdit() { return MMUI.canEditTab('aparencia'); },
  deny() { MMUI.toast('Só o administrador e os utilizadores com edição em «Aparência» podem personalizar os gráficos.'); },
  store() {
    if (typeof DB === 'undefined' || !DB) return { prefs: {}, look: {} };
    DB.settings = DB.settings || {}; DB.settings.chartPrefs = DB.settings.chartPrefs || {}; DB.settings.chartLook = DB.settings.chartLook || {};
    return { prefs: DB.settings.chartPrefs, look: DB.settings.chartLook };
  },
  pref(id, create = false) { const s = MMCharts.store(); if (create && !s.prefs[id]) s.prefs[id] = {}; return s.prefs[id] || {}; },
  look() { return MMCharts.store().look; },
  /** Cópia da configuração: objectos simples e listas são copiados; funções e objectos especiais mantêm-se. */
  clone(o) {
    if (Array.isArray(o)) return o.map(MMCharts.clone);
    if (o && typeof o === 'object' && Object.getPrototypeOf(o) === Object.prototype) return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, MMCharts.clone(v)]));
    return o;
  },
  palette() {
    const L = MMCharts.look(); const P = Array.isArray(L.palette) && L.palette.length ? L.palette : null;
    try { if (P) return P; if (typeof CHART_PALETTE !== 'undefined') return CHART_PALETTE; } catch (_) { /* antes da aplicação */ }
    return ['#12213A', '#B8892B', '#3F7150', '#A6472A', '#5B7FA6', '#8A6413', '#7C7461', '#1E3350', '#C9A45C', '#6E8E76'];
  },
  /** Paleta global: substitui as cores das paletas da aplicação (mantendo as originais para repor). */
  applyLook() {
    try {
      if (typeof CHART_PALETTE === 'undefined') return;
      MMCharts.pal0 = MMCharts.pal0 || { chart: [...CHART_PALETTE], def: typeof PALETTES !== 'undefined' ? [...PALETTES.default.colors] : null };
      const P = MMCharts.look().palette;
      const set = (arr, src) => { arr.splice(0, arr.length, ...src); };
      if (Array.isArray(P) && P.length) { set(CHART_PALETTE, P.concat(MMCharts.pal0.chart.slice(P.length))); if (MMCharts.pal0.def) set(PALETTES.default.colors, P.concat(MMCharts.pal0.def.slice(P.length))); }
      else { set(CHART_PALETTE, MMCharts.pal0.chart); if (MMCharts.pal0.def) set(PALETTES.default.colors, MMCharts.pal0.def); }
    } catch (e) { console.warn('Paleta dos gráficos:', e); }
  },
  effType(cfg) { return cfg.type === 'bar' && cfg.options?.indexAxis === 'y' ? 'hbar' : cfg.type; },
  /** Aplica as preferências do gráfico a uma cópia da configuração original. */
  prepare(id, config) {
    const p = MMCharts.pref(id); const L = MMCharts.look(); const cfg = MMCharts.clone(config);
    cfg.options = cfg.options || {}; cfg.options.plugins = cfg.options.plugins || {}; cfg.data = cfg.data || {};
    const data = cfg.data; data.datasets = Array.isArray(data.datasets) ? data.datasets : [];
    let labels = Array.isArray(data.labels) ? data.labels.map((l) => (Array.isArray(l) ? l.join(' ') : l)) : [];
    labels.forEach((l) => MMCharts.seen.add(String(l)));
    const t0 = MMCharts.effType(cfg); const type = MM_CHART_TYPES.some(([k]) => k === p.type) ? p.type : t0;
    // valores ocultos (duplo clique / lista)
    const H = new Set((p.hidden || []).map(String)); let keep = labels.map((_, i) => i);
    if (H.size && labels.length) {
      keep = keep.filter((i) => !H.has(String(labels[i])));
      data.datasets.forEach((d) => { if (Array.isArray(d.data)) d.data = keep.map((i) => d.data[i]); if (Array.isArray(d.backgroundColor)) d.backgroundColor = keep.map((i) => d.backgroundColor[i % d.backgroundColor.length]); });
      labels = keep.map((i) => labels[i]);
    }
    MMCharts.keep[id] = keep; MMCharts.orig[id] = labels.map(String);
    // números editados e nomes
    data.datasets.forEach((d, di) => { if (Array.isArray(d.data) && p.values) d.data = d.data.map((v, i) => { const k = `${di}|${labels[i]}`; return Object.prototype.hasOwnProperty.call(p.values, k) ? p.values[k] : v; }); });
    data.labels = labels.map((l) => (p.labels && p.labels[l] !== undefined ? p.labels[l] : l));
    // tipo e eixos
    const circ = MM_CIRC.includes(type); const multi = data.datasets.length > 1;
    cfg.type = type === 'hbar' ? 'bar' : type;
    if (type === 'hbar') cfg.options.indexAxis = 'y'; else if (cfg.type === 'bar' || cfg.type === 'line') cfg.options.indexAxis = 'x';
    if (circ) cfg.options.scales = {};
    else if (type === 'radar') cfg.options.scales = { r: { beginAtZero: true, ticks: { precision: 0 } } };
    else if (type !== t0 || !cfg.options.scales || !Object.keys(cfg.options.scales).length) {
      const stacked = !!(cfg.options.scales && Object.values(cfg.options.scales).some((s) => s && s.stacked));
      const v = type === 'hbar' ? 'x' : 'y'; const c = type === 'hbar' ? 'y' : 'x';
      cfg.options.scales = { [v]: { beginAtZero: true, ticks: { precision: 0 }, stacked }, [c]: { stacked } };
    }
    // cores: por categoria (Aparência) e por gráfico; série inteira nos gráficos com várias séries
    const pal = MMCharts.palette(); const sem = L.semantic || {}; const pc = p.colors || {};
    const usePoint = circ || (!multi && (Object.keys(pc).length || labels.some((l) => sem[l])));
    data.datasets.forEach((d, di) => {
      const sp = (p.series && p.series[di]) || {};
      if (sp.label) d.label = sp.label;
      if (usePoint) {
        const base = Array.isArray(d.backgroundColor) ? d.backgroundColor : null;
        d.backgroundColor = labels.map((l, i) => pc[l] || sem[l] || (base ? base[i % base.length] : (circ ? pal[i % pal.length] : (typeof d.backgroundColor === 'string' ? d.backgroundColor : pal[0]))));
        if (cfg.type === 'line' || cfg.type === 'radar') { d.pointBackgroundColor = d.backgroundColor; d.borderColor = sp.color || d.borderColor || pal[di % pal.length]; }
        else if (circ) d.borderColor = '#ffffff';
      }
      if (sp.color && !circ) { d.borderColor = sp.color; d.backgroundColor = cfg.type === 'line' || cfg.type === 'radar' ? `${sp.color}33` : sp.color; if (cfg.type === 'line' || cfg.type === 'radar') d.pointBackgroundColor = sp.color; }
      if (!circ && !usePoint && !d.backgroundColor) d.backgroundColor = pal[di % pal.length];
      if (cfg.type === 'line' && !d.borderColor) d.borderColor = Array.isArray(d.backgroundColor) ? pal[di % pal.length] : d.backgroundColor;
    });
    // legenda
    const lg = cfg.options.plugins.legend || {}; const lp = p.legend;
    cfg.options.plugins.legend = { ...lg, display: lp === 'none' ? false : (lp ? true : (circ || multi || (type === t0 ? lg.display !== false : false))), position: lp && lp !== 'none' ? lp : (lg.position || 'bottom') };
    if (!cfg.options.plugins.legend.labels) cfg.options.plugins.legend.labels = { boxWidth: 11, font: { size: 10 } };
    // números sobre as barras/sectores
    const show = p.showValues !== undefined ? p.showValues : L.showValues;
    const dl = (kind) => { try { if (typeof dlConfig === 'function') return dlConfig(kind, { horizontal: type === 'hbar' }); } catch (_) { /* sem rótulos */ } return { display: true }; };
    if (show === false) cfg.options.plugins.datalabels = { display: false };
    else if (show === true || (type !== t0 && cfg.options.plugins.datalabels && cfg.options.plugins.datalabels.display !== false)) cfg.options.plugins.datalabels = dl(circ ? 'round' : 'bar');
    if (!circ && type === 'bar' && cfg.options.plugins.datalabels && cfg.options.plugins.datalabels.display !== false) cfg.options.layout = { ...(cfg.options.layout || {}), padding: { top: 16 } };
    cfg.options.responsive = true; cfg.options.maintainAspectRatio = false;
    // clique (editar) — atrasado para permitir o duplo clique (ocultar)
    const on0 = cfg.options.onClick;
    cfg.options.onClick = (evt, els, chart) => { if (typeof on0 === 'function') on0(evt, els, chart); MMCharts.click(id, evt, els, chart); };
    return cfg;
  },
  /** Depois de desenhar: título, altura, barra de ferramentas e duplo clique. */
  after(chart, id) {
    const canvas = chart.canvas; if (!canvas) return; const p = MMCharts.pref(id); const wrap = canvas.parentElement; if (!wrap) return;
    const card = canvas.closest('.card, .v11-panel, section') || wrap.parentElement;
    const single = card && card.querySelectorAll('canvas').length === 1;
    const h = MMCharts.heading(canvas);
    // Só títulos de texto simples (sem elementos que a aba actualize) e só quando há título personalizado
    if (h && p.title) { if (!h.dataset.mmTitle) h.dataset.mmTitle = h.textContent.trim(); h.textContent = p.title; }
    if (p.height) { wrap.style.setProperty('--mmc-h', `${p.height}px`); wrap.classList.add('mmc-sized'); } else wrap.classList.remove('mmc-sized');
    let bar = wrap.previousElementSibling;
    if (!bar || !bar.classList.contains('mmc-tools') || bar.dataset.chart !== id) {
      bar = document.createElement('div'); bar.className = 'mmc-tools'; bar.dataset.chart = id; bar.setAttribute('role', 'toolbar');
      wrap.insertAdjacentElement('beforebegin', bar);
    }
    bar.setAttribute('aria-label', `Ferramentas do gráfico ${h ? h.textContent : id}`);
    bar.innerHTML = MMCharts.toolsHTML(id);
    if (!canvas.dataset.mmDbl) { canvas.dataset.mmDbl = '1'; canvas.addEventListener('dblclick', (e) => MMCharts.hideAt(id, e)); }
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `Gráfico: ${h ? h.textContent : id}. Use o botão «Ver tabela» para ler os dados.`);
  },
  /** Título do cartão do gráfico (só quando o cartão tem um único gráfico e o título é texto simples). */
  heading(canvas) {
    const card = canvas && canvas.closest('.card, .v11-panel, section'); if (!card || card.querySelectorAll('canvas').length !== 1) return null;
    const h = card.querySelector('h3, h4'); return h && h.children.length === 0 ? h : null;
  },
  toolsHTML(id) {
    const p = MMCharts.pref(id); const can = MMCharts.canEdit(); const E = MMUI.esc; const H = p.hidden || [];
    const cur = p.type || (MMCharts.src[id] ? MMCharts.effType(MMCharts.src[id]) : 'bar');
    const show = p.showValues !== undefined ? p.showValues : MMCharts.look().showValues;
    return `${H.length ? `<span class="mmc-note">${H.length} ${H.length === 1 ? 'valor oculto' : 'valores ocultos'}${can ? ` · <button type="button" class="mmc-link" data-mmc="unhide">Mostrar</button>` : ''}</span>` : ''}
      ${can ? `<label class="sr-only" for="mmt_${E(id)}">Tipo de gráfico</label><select id="mmt_${E(id)}" class="mmc-type" data-mmc="type">${MM_CHART_TYPES.map(([k, l]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${l}</option>`).join('')}</select>
        <button type="button" class="mmc-btn" data-mmc="values" aria-pressed="${show === true}" title="Mostrar/ocultar os números">123</button>` : ''}
      <button type="button" class="mmc-btn" data-mmc="table" aria-label="Ver os dados em tabela" title="Ver tabela">▦</button>
      <button type="button" class="mmc-btn" data-mmc="png" aria-label="Descarregar o gráfico em PNG" title="Imagem PNG">⬇</button>
      <button type="button" class="mmc-btn" data-mmc="csv" aria-label="Descarregar os dados em CSV" title="Dados CSV">CSV</button>
      ${can ? `<button type="button" class="mmc-btn" data-mmc="hide" aria-label="Escolher os valores apresentados" title="Valores apresentados (também: duplo clique numa barra)">⊘</button>
        <button type="button" class="mmc-btn" data-mmc="edit" aria-label="Personalizar o gráfico" title="Personalizar: título, cores, legenda, altura">✎</button>` : ''}`;
  },
  chart(id) { const c = document.getElementById(id); return c && window.Chart && window.Chart.getChart ? window.Chart.getChart(c) : null; },
  /** Volta a desenhar o gráfico com as preferências actuais (mantém as referências da aplicação). */
  rebuild(id) {
    const canvas = document.getElementById(id); const old = MMCharts.chart(id); const src = MMCharts.src[id]; if (!canvas || !src) return;
    if (old) old.destroy();
    const neu = new window.Chart(canvas, src);
    try { if (typeof charts === 'object' && charts) Object.keys(charts).forEach((k) => { if (charts[k] === old) charts[k] = neu; }); } catch (_) { /* sem registo */ }
    (MMCharts.hooks || []).forEach((f) => { try { f(old, neu, id); } catch (_) { /* ignorar */ } });
  },
  rebuildAll() { Object.keys(MMCharts.src).forEach((id) => { if (MMCharts.chart(id)) MMCharts.rebuild(id); }); },
  commit(id, what) { MMUI.save(what); MMCharts.rebuild(id); },
  click(id, evt, els) {
    clearTimeout(MMCharts._clk); if (!els || !els.length) return;
    const e = { di: els[0].datasetIndex, i: els[0].index };
    MMCharts._clk = setTimeout(() => { if (MMCharts.canEdit()) MMCharts.editPoint(id, e.di, e.i); }, 280);
  },
  hideAt(id, e) {
    clearTimeout(MMCharts._clk); if (!MMCharts.canEdit()) { MMCharts.deny(); return; }
    const ch = MMCharts.chart(id); if (!ch) return;
    const els = ch.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true); if (!els.length) return;
    const lab = MMCharts.orig[id]?.[els[0].index]; if (lab === undefined) return;
    const p = MMCharts.pref(id, true); p.hidden = [...new Set([...(p.hidden || []), lab])];
    MMCharts.commit(id, `Gráfico ${id}: ocultou «${lab}»`); MMUI.toast(`«${lab}» oculto neste gráfico. Use «Mostrar» para repor.`);
  },
  editPoint(id, di, i) {
    const ch = MMCharts.chart(id); const src = MMCharts.src[id]; if (!ch || !src) return;
    const p = MMCharts.pref(id, true); const lab = MMCharts.orig[id][i]; const oi = MMCharts.keep[id][i];
    const computed = Number(src.data?.datasets?.[di]?.data?.[oi]) || 0; const key = `${di}|${lab}`;
    const multi = ch.data.datasets.length > 1 && !MM_CIRC.includes(ch.config.type);
    const sName = (p.series && p.series[di] && p.series[di].label) || ch.data.datasets[di]?.label || 'Valores';
    const curColor = multi ? MMUI.color((p.series && p.series[di] && p.series[di].color) || ch.data.datasets[di]?.borderColor, '#12213a')
      : MMUI.color(Array.isArray(ch.data.datasets[di]?.backgroundColor) ? ch.data.datasets[di].backgroundColor[i] : ch.data.datasets[di]?.backgroundColor, '#12213a');
    const E = MMUI.esc;
    const m = MMUI.modal({ title: `${(p.labels && p.labels[lab]) || lab}${multi ? ` · ${sName}` : ''}`, size: 'narrow',
      body: `<form class="mm-form" novalidate><p class="mm-help">Valor calculado a partir dos dados: <b>${E(computed.toLocaleString('pt-PT'))}</b>. Um número editado altera só a apresentação.</p>
        <div class="field"><label for="mmp_l">Nome (rótulo)</label><input id="mmp_l" name="label" maxlength="60" value="${E((p.labels && p.labels[lab]) ?? lab)}" required></div>
        <div class="field"><label for="mmp_v">Número apresentado</label><input id="mmp_v" name="value" type="number" step="any" value="${E(p.values && key in p.values ? p.values[key] : computed)}"></div>
        <div class="field"><label for="mmp_c">${multi ? `Cor da série «${E(sName)}»` : 'Cor'}</label><input id="mmp_c" name="color" type="color" value="${E(curColor)}"></div>
        <label class="mm-check"><input type="checkbox" name="hide"> Ocultar «${E(lab)}» neste gráfico</label><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-reset>Repor este valor</button><button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    const f = m.el.querySelector('form');
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      const label = MMUI.clean(f.label.value, 60); if (!label) { f.querySelector('.mm-err').textContent = 'Indique o nome.'; return; }
      if (/[<>]/.test(label)) { f.querySelector('.mm-err').textContent = 'O nome não pode conter < ou >.'; return; }
      p.labels = { ...(p.labels || {}) }; if (label === lab) delete p.labels[lab]; else p.labels[lab] = label;
      p.values = { ...(p.values || {}) }; const v = f.value.value; if (v === '' || Number(v) === computed) delete p.values[key]; else p.values[key] = Number(v);
      const c = MMUI.color(f.color.value);
      if (c) { if (multi) p.series = { ...(p.series || {}), [di]: { ...((p.series && p.series[di]) || {}), color: c } }; else p.colors = { ...(p.colors || {}), [lab]: c }; }
      if (f.hide.checked) p.hidden = [...new Set([...(p.hidden || []), lab])];
      m.close(); MMCharts.commit(id, `Gráfico ${id}: «${lab}» personalizado`);
    });
    m.el.querySelector('[data-reset]').addEventListener('click', () => { if (p.labels) delete p.labels[lab]; if (p.values) delete p.values[key]; if (p.colors) delete p.colors[lab]; m.close(); MMCharts.commit(id, `Gráfico ${id}: «${lab}» reposto`); });
  },
  manageHidden(id) {
    const src = MMCharts.src[id]; if (!src) return; const p = MMCharts.pref(id, true); const H = new Set((p.hidden || []).map(String));
    const L = (src.data?.labels || []).map((l) => String(Array.isArray(l) ? l.join(' ') : l));
    const m = MMUI.modal({ title: 'Valores apresentados no gráfico', size: 'narrow',
      body: `<p class="mm-help">Desmarque o que não deve aparecer (por exemplo, uma categoria sem interesse para o relatório).</p><div class="mm-checks">${L.map((l, k) => `<label class="mm-check"><input type="checkbox" data-l="${k}"${H.has(l) ? '' : ' checked'}> ${MMUI.esc((p.labels && p.labels[l]) || l)}</label>`).join('')}</div>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Aplicar</button>' });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { p.hidden = [...m.el.querySelectorAll('[data-l]')].filter((x) => !x.checked).map((x) => L[+x.dataset.l]); if (!p.hidden.length) delete p.hidden; m.close(); MMCharts.commit(id, `Gráfico ${id}: valores apresentados`); });
  },
  editChart(id) {
    const ch = MMCharts.chart(id); if (!ch) return; const p = MMCharts.pref(id, true); const E = MMUI.esc;
    const h = MMCharts.heading(ch.canvas);
    const multi = ch.data.datasets.length > 1 && !MM_CIRC.includes(ch.config.type); const labs = MMCharts.orig[id] || [];
    const colors = multi ? ch.data.datasets.map((d, di) => `<div class="field"><label for="mms_${di}">Série ${di + 1}</label><div class="mm-row"><input id="mms_${di}" data-sl="${di}" value="${E((p.series && p.series[di] && p.series[di].label) || d.label || '')}" maxlength="60" aria-label="Nome da série ${di + 1}"><input type="color" data-sc="${di}" value="${E(MMUI.color((p.series && p.series[di] && p.series[di].color) || d.borderColor, '#12213a'))}" aria-label="Cor da série ${di + 1}"></div></div>`).join('')
      : labs.slice(0, 40).map((l, i) => `<div class="field"><label for="mmk_${i}">${E((p.labels && p.labels[l]) || l)}</label><input id="mmk_${i}" type="color" data-pk="${i}" value="${E(MMUI.color(Array.isArray(ch.data.datasets[0]?.backgroundColor) ? ch.data.datasets[0].backgroundColor[i] : ch.data.datasets[0]?.backgroundColor, '#12213a'))}"></div>`).join('');
    const legend = [['', 'Automática'], ['top', 'Em cima'], ['bottom', 'Em baixo'], ['left', 'À esquerda'], ['right', 'À direita'], ['none', 'Oculta']];
    const m = MMUI.modal({ title: 'Personalizar gráfico', size: 'wide',
      body: `<form class="mm-form" novalidate><div class="mm-grid">
        ${h ? `<div class="field mm-full"><label for="mme_t">Título</label><input id="mme_t" name="title" maxlength="80" value="${E(p.title || h.dataset.mmTitle || h.textContent.trim())}"></div>` : ''}
        <div class="field"><label for="mme_ty">Tipo</label><select id="mme_ty" name="type">${MM_CHART_TYPES.map(([k, l]) => `<option value="${k}"${k === (p.type || MMCharts.effType(MMCharts.src[id])) ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="mme_lg">Legenda</label><select id="mme_lg" name="legend">${legend.map(([k, l]) => `<option value="${k}"${k === (p.legend || '') ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="mme_h">Altura (px)</label><input id="mme_h" name="height" type="number" min="160" max="800" step="10" value="${E(p.height || '')}" placeholder="automática"></div>
        <div class="field"><label for="mme_v">Números sobre o gráfico</label><select id="mme_v" name="values"><option value="">Como na Aparência</option><option value="1"${p.showValues === true ? ' selected' : ''}>Mostrar</option><option value="0"${p.showValues === false ? ' selected' : ''}>Ocultar</option></select></div></div>
        <h4 class="mm-h4">${multi ? 'Nomes e cores das séries' : 'Cores dos valores'}</h4><div class="mm-grid c3">${colors}</div><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn danger sm" data-reset>Repor gráfico</button><button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    const f = m.el.querySelector('form');
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      const err = f.querySelector('.mm-err'); const hv = f.height.value;
      if (hv !== '' && (!(Number(hv) >= 160) || Number(hv) > 800)) { err.textContent = 'A altura deve estar entre 160 e 800 px.'; return; }
      const title = f.title ? MMUI.clean(f.title.value, 80) : ''; if (/[<>]/.test(title)) { err.textContent = 'O título não pode conter < ou >.'; return; }
      if (f.title) { const orig = h.dataset.mmTitle || h.textContent.trim(); if (title && title !== orig) p.title = title; else { delete p.title; if (h.dataset.mmTitle) { h.textContent = h.dataset.mmTitle; delete h.dataset.mmTitle; } } }
      p.type = f.type.value; p.legend = f.legend.value || undefined; if (!p.legend) delete p.legend;
      if (hv === '') delete p.height; else p.height = Math.round(Number(hv));
      if (f.values.value === '') delete p.showValues; else p.showValues = f.values.value === '1';
      if (multi) { p.series = { ...(p.series || {}) }; f.querySelectorAll('[data-sl]').forEach((x) => { const di = x.dataset.sl; const nm = MMUI.clean(x.value, 60); const c = MMUI.color(f.querySelector(`[data-sc="${di}"]`).value); p.series[di] = { ...(p.series[di] || {}), ...(nm ? { label: nm } : {}), ...(c ? { color: c } : {}) }; }); }
      else { p.colors = { ...(p.colors || {}) }; f.querySelectorAll('[data-pk]').forEach((x) => { const c = MMUI.color(x.value); if (c) p.colors[labs[+x.dataset.pk]] = c; }); }
      m.close(); MMCharts.commit(id, `Gráfico ${id} personalizado`); MMUI.toast('Gráfico personalizado.');
    });
    m.el.querySelector('[data-reset]').addEventListener('click', () => { delete MMCharts.store().prefs[id]; if (h && h.dataset.mmTitle) { h.textContent = h.dataset.mmTitle; delete h.dataset.mmTitle; } m.close(); MMCharts.commit(id, `Gráfico ${id} reposto`); MMUI.toast('Gráfico reposto.'); });
  },
  rows(id) {
    const ch = MMCharts.chart(id); if (!ch) return { cols: [], rows: [] };
    const ds = ch.data.datasets; const cols = ['Categoria', ...ds.map((d, i) => d.label || (ds.length > 1 ? `Série ${i + 1}` : 'Valor'))];
    return { cols, rows: (ch.data.labels || []).map((l, i) => Object.fromEntries([['Categoria', Array.isArray(l) ? l.join(' ') : l], ...ds.map((d, di) => [cols[di + 1], d.data[i]])])) };
  },
  title(id) { const ch = MMCharts.chart(id); const card = ch && ch.canvas.closest('.card, .v11-panel, section'); return (card && card.querySelectorAll('canvas').length === 1 && card.querySelector('h3, h4')?.textContent.trim()) || (ch && ch.canvas.getAttribute('aria-label')) || id; },
  table(id) {
    const { cols, rows } = MMCharts.rows(id); const E = MMUI.esc;
    const tot = cols.slice(1).map((c) => rows.reduce((a, r) => a + (Number(r[c]) || 0), 0));
    MMUI.modal({ title: MMCharts.title(id), size: 'wide', body: `<div class="tbl-scroll"><table class="data-table"><caption class="sr-only">Dados do gráfico ${E(MMCharts.title(id))}</caption><thead><tr>${cols.map((c) => `<th scope="col">${E(c)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${cols.map((c, k) => (k ? `<td class="mm-num">${E(Number(r[c] || 0).toLocaleString('pt-PT'))}</td>` : `<th scope="row">${E(r[c])}</th>`)).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><th scope="row">Total</th>${tot.map((t) => `<td class="mm-num"><b>${E(t.toLocaleString('pt-PT'))}</b></td>`).join('')}</tr></tfoot></table></div>`,
      foot: '<button type="button" class="btn gold sm" data-close>Fechar</button>' });
  },
  fileName(id, ext) { return `${MMCharts.title(id).replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '').slice(0, 60) || 'grafico'}.${ext}`; },
  png(id) {
    const ch = MMCharts.chart(id); if (!ch) return;
    const c = document.createElement('canvas'); c.width = ch.canvas.width; c.height = ch.canvas.height; const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(ch.canvas, 0, 0);
    c.toBlob((b) => { if (b) MMUI.download(MMCharts.fileName(id, 'png'), b); }, 'image/png');
  },
  csvFile(id) { const { cols, rows } = MMCharts.rows(id); MMUI.download(MMCharts.fileName(id, 'csv'), new Blob([MMUI.csv(rows, cols)], { type: 'text/csv;charset=utf-8' })); }
};

/* ---------- Construtor de gráficos com as definições V14 ---------- */
(() => {
  const Base = window.Chart; if (!Base || Base.__mm) return;
  class MMChart extends Base {
    constructor(item, config) {
      const canvas = typeof item === 'string' ? document.getElementById(item) : (item && item.canvas) || item;
      const id = canvas && canvas.id ? canvas.id : '';
      let cfg = config;
      if (id && config && config.data) { MMCharts.applyLook(); MMCharts.src[id] = MMCharts.clone(config); try { cfg = MMCharts.prepare(id, config); } catch (e) { console.warn('Gráfico', id, e); cfg = config; } }
      super(item, cfg);
      if (id && config && config.data) { try { MMCharts.after(this, id); } catch (e) { console.warn('Ferramentas do gráfico', id, e); } }
    }
  }
  MMChart.__mm = true; window.Chart = MMChart; MMCharts.Base = Base; // Base: pré-visualizações sem barra de ferramentas
})();

/* Barra de ferramentas: eventos delegados (sem handlers inline) */
document.addEventListener('click', (e) => {
  const b = e.target.closest('.mmc-tools [data-mmc]'); if (!b || b.tagName === 'SELECT') return;
  const id = b.closest('.mmc-tools').dataset.chart; const a = b.dataset.mmc;
  if (a === 'table') MMCharts.table(id); else if (a === 'png') MMCharts.png(id); else if (a === 'csv') MMCharts.csvFile(id);
  else if (!MMCharts.canEdit()) MMCharts.deny();
  else if (a === 'edit') MMCharts.editChart(id); else if (a === 'hide') MMCharts.manageHidden(id);
  else if (a === 'unhide') { const p = MMCharts.pref(id, true); delete p.hidden; MMCharts.commit(id, `Gráfico ${id}: valores repostos`); }
  else if (a === 'values') { const p = MMCharts.pref(id, true); const cur = p.showValues !== undefined ? p.showValues : MMCharts.look().showValues; p.showValues = cur !== true; MMCharts.commit(id, `Gráfico ${id}: números`); }
});
document.addEventListener('change', (e) => {
  const s = e.target.closest('.mmc-tools select[data-mmc="type"]'); if (!s) return;
  if (!MMCharts.canEdit()) { MMCharts.deny(); return; }
  const id = s.closest('.mmc-tools').dataset.chart; const p = MMCharts.pref(id, true); p.type = s.value; MMCharts.commit(id, `Gráfico ${id}: tipo ${s.value}`);
});
