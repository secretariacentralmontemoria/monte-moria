/* =====================================================================
   V24 — «ONDE FICAM OS DADOS» (Aparência & Configuração)
   Estado do armazenamento, ficheiro de dados no computador / OneDrive e redução do tamanho
   (fotografias, estados anteriores, registo de actividades, lixeira). Só o administrador altera.
   ===================================================================== */
(function () {
  'use strict';
  const E = MMUI.esc;
  const admin = (msg, fn) => (typeof requireAdminAction === 'function' ? requireAdminAction('admin', msg, fn) : fn());
  const mb = (n) => (n / 1048576).toFixed(2);

  const Disk = {
    async connect() {
      if (!MMDisk.supported()) { MMUI.toast('Este navegador não permite gravar num ficheiro do computador. Use o Google Chrome ou o Microsoft Edge no computador.'); return; }
      try {
        const h = await window.showSaveFilePicker({ suggestedName: 'MonteMoria_dados.json', types: [{ description: 'Dados Monte Moriá (JSON)', accept: { 'application/json': ['.json'] } }] });
        MMDisk.handle = h; MMDisk.name = h.name; MMDisk.perm = 'granted';
        await MMStoreX.put({ id: 'fileHandle', handle: h, name: h.name, at: '' });
        saveDB(); MMDisk.last = MMDisk.last || null; await MMDisk.flush();
        if (typeof logActivity === 'function') logActivity('Ligou ficheiro de dados', 'Sistema', h.name);
        Panel.refresh(); MMUI.toast(`Os dados passam a ser gravados também em «${h.name}».`);
      } catch (e) { if (e.name !== 'AbortError') MMUI.toast(`Ficheiro não ligado: ${e.message}`); }
    },
    async open() {
      if (typeof window.showOpenFilePicker !== 'function') { MMUI.toast('Este navegador não permite abrir o ficheiro de dados de forma contínua. Use «Importar backup».'); return; }
      try {
        const [h] = await window.showOpenFilePicker({ types: [{ description: 'Dados Monte Moriá (JSON)', accept: { 'application/json': ['.json'] } }] });
        const f = await h.getFile(); let o; try { o = JSON.parse(await f.text()); } catch (_) { MMUI.toast('O ficheiro não é JSON válido.'); return; }
        if (!MMDisk.valid(o)) { MMUI.toast('Este ficheiro não é um ficheiro de dados do Monte Moriá.'); return; }
        if (!(await MMUI.confirm(`Substituir os dados deste navegador pelos de «${h.name}» (${(o.members || []).length} membros) e passar a gravar nesse ficheiro? A base actual fica num estado anterior (aba Eventos).`, 'Abrir'))) return;
        const perm = await h.requestPermission({ mode: 'readwrite' }).catch(() => 'denied');
        try { DB.eventSnapshots = DB.eventSnapshots || []; DB.eventSnapshots.unshift({ id: `abrir-${Date.now()}`, ts: new Date().toISOString(), user: 'admin', label: 'Antes de abrir o ficheiro de dados', data: JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(DB).filter(([k]) => k !== 'eventSnapshots')))) }); o.eventSnapshots = [...DB.eventSnapshots.slice(0, 20)]; } catch (_) { /* opcional */ }
        MMDisk.handle = h; MMDisk.name = h.name; MMDisk.perm = perm;
        await MMStoreX.put({ id: 'fileHandle', handle: h, name: h.name, at: new Date(f.lastModified).toISOString() });
        MMStoreX.save(o); await MMStoreX.flush();
        MMUI.toast(`Dados carregados de «${h.name}».`); setTimeout(() => location.reload(), 700);
      } catch (e) { if (e.name !== 'AbortError') MMUI.toast(`Não foi possível abrir: ${e.message}`); }
    },
    async reconnect() {
      if (!MMDisk.handle) return;
      try { MMDisk.perm = await MMDisk.handle.requestPermission({ mode: 'readwrite' }); } catch (_) { MMDisk.perm = 'denied'; }
      if (MMDisk.perm !== 'granted') { MMUI.toast('Autorização recusada: os dados continuam guardados só no navegador.'); Panel.refresh(); return; }
      const f = await MMDisk.readIfNewer(MMDisk.lastAt || MMStoreX.at || '');
      if (f && await MMUI.confirm(`«${MMDisk.name}» foi alterado depois da última gravação deste navegador (provavelmente noutro posto). Carregar essa versão? (Cancelar = manter os dados deste navegador e gravá-los por cima.)`, 'Carregar')) {
        await MMStoreX.put({ id: 'db', json: f.json, at: f.at }); MMUI.toast(`Dados actualizados a partir de «${MMDisk.name}».`); setTimeout(() => location.reload(), 700); return;
      }
      saveDB(); await MMDisk.flush(); Panel.refresh(); MMUI.toast(`Ficheiro de dados «${MMDisk.name}» ligado.`);
    },
    async off() {
      if (!(await MMUI.confirm(`Deixar de gravar em «${MMDisk.name}»? O ficheiro não é apagado; os dados continuam no navegador.`, 'Desligar'))) return;
      await MMStoreX.del('fileHandle').catch(() => {}); MMDisk.handle = null; MMDisk.perm = 'none'; MMDisk.name = '';
      if (typeof logActivity === 'function') logActivity('Desligou ficheiro de dados', 'Sistema', '—'); Panel.refresh();
    },
    status() {
      if (!MMDisk.supported()) return ['muted', 'Indisponível neste navegador (só Chrome / Edge no computador).'];
      if (!MMDisk.handle) return ['muted', 'Não ligado.'];
      if (MMDisk.perm !== 'granted') return ['warn', `«${MMDisk.name}» — falta autorizar nesta sessão (clique em «Reautorizar»).`];
      if (MMDisk.err) return ['bad', `«${MMDisk.name}» — última gravação falhou: ${MMDisk.err}`];
      return ['ok', `«${MMDisk.name}»${MMDisk.lastAt ? ` — gravado às ${new Date(MMDisk.lastAt).toLocaleTimeString('pt-PT')} de ${new Date(MMDisk.lastAt).toLocaleDateString('pt-PT')}` : ''}.`];
    }
  };

  /* ---- Reduzir tamanho ---- */
  const Slim = {
    shrink(src, max) {
      return new Promise((res) => { const im = new Image(); im.onload = () => { const r = Math.min(1, max / Math.max(im.width, im.height)); const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(im.width * r)); cv.height = Math.max(1, Math.round(im.height * r));
        const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', 0.82)); }; im.onerror = () => res(null); im.src = src; });
    },
    async photos() {
      const found = []; const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 7) return; Object.keys(o).forEach((k) => { if (k === 'eventSnapshots') return; const v = o[k];
        if (typeof v === 'string' && v.startsWith('data:image/') && !v.startsWith('data:image/svg') && v.length > 60000) found.push([o, k]); else if (v && typeof v === 'object') walk(v, d + 1); }); };
      walk(DB, 0); let n = 0;
      for (const [o, k] of found) { const out = await Slim.shrink(o[k], /logo/i.test(k) ? 800 : 480); if (out && out.length < o[k].length) { o[k] = out; n++; } }
      return n;
    },
    open() {
      const before = MMStoreX.size(); const ns = (DB.eventSnapshots || []).length;
      const m = MMUI.modal({ title: 'Reduzir o tamanho dos dados', size: 'narrow',
        body: `<p class="mm-help">Dados actuais: <b>${mb(before)} MB</b>; estados anteriores (aba Eventos): <b>${ns}</b> (${mb(MMStoreX.snapSize())} MB).</p>
          <div class="mm-checks"><label class="mm-check"><input type="checkbox" data-s="photos" checked> Fotografias e imagens grandes (máx. 480 px; logótipo 800 px)</label>
          <label class="mm-check"><input type="checkbox" data-s="snaps"> Estados anteriores: manter só os <input type="number" class="v24-num" min="0" max="80" value="20" data-sn aria-label="Número de estados a manter"> mais recentes</label>
          <label class="mm-check"><input type="checkbox" data-s="audit"> Registo de actividades: manter só as últimas 500 linhas (${(DB.auditLog || []).length})</label>
          <label class="mm-check"><input type="checkbox" data-s="trash"> Esvaziar a lixeira (${(DB.trash || []).length} registos)</label></div><p class="mm-err" role="alert"></p>`,
        foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Reduzir</button>' });
      m.el.querySelector('[data-ok]').addEventListener('click', async (ev) => {
        const on = (k) => m.el.querySelector(`[data-s="${k}"]`).checked; const b = ev.currentTarget; b.disabled = true; b.textContent = 'A reduzir…'; const out = [];
        try {
          if (on('photos')) out.push(`${await Slim.photos()} imagem(ns) reduzida(s)`);
          if (on('snaps') && Array.isArray(DB.eventSnapshots)) { const k = Math.min(80, Math.max(0, Math.round(Number(m.el.querySelector('[data-sn]').value) || 0))); const d = DB.eventSnapshots.length - k; if (d > 0) { DB.eventSnapshots.length = k; out.push(`${d} estado(s) anterior(es) removido(s)`); } }
          if (on('audit') && (DB.auditLog || []).length > 500) { const d = DB.auditLog.length - 500; DB.auditLog = DB.auditLog.slice(-500); out.push(`${d} linha(s) do registo`); }
          if (on('trash') && (DB.trash || []).length) { out.push(`${DB.trash.length} registo(s) da lixeira`); DB.trash = []; }
          saveDB(); if (typeof logActivity === 'function') logActivity('Reduziu o tamanho dos dados', 'Sistema', out.join(', ') || '—');
          m.close(); Panel.refresh(); MMUI.toast(`${out.join(' · ') || 'Nada a reduzir'}. Tamanho: ${mb(before)} → ${mb(MMStoreX.size())} MB.`);
        } catch (e) { m.el.querySelector('.mm-err').textContent = `Erro: ${e.message}`; b.disabled = false; b.textContent = 'Reduzir'; }
      });
    }
  };

  /* ---- Painel ---- */
  const Panel = {
    html() {
      const [tone, txt] = Disk.status(); const idb = MMStoreX.mode === 'idb';
      return `<h3 class="v24-h">Onde ficam os dados</h3>
        <p class="sub">Os dados ficam na base de dados interna do navegador (IndexedDB), sem o limite de ~5 MB do armazenamento local. Pode ainda gravar tudo num ficheiro do computador ou de uma pasta partilhada (OneDrive / SharePoint).</p>
        <dl class="v24-dl">
          <div><dt>Armazenamento principal</dt><dd>${E(MMStoreX.where())} <span class="badge ${idb ? 'ok' : 'warn'}">${idb ? 'Sem limite de 5 MB' : 'Limitado'}</span></dd></div>
          <div><dt>Tamanho</dt><dd>${mb(MMStoreX.size())} MB de dados · ${(DB.eventSnapshots || []).length} estados anteriores (${mb(MMStoreX.snapSize())} MB)</dd></div>
          <div><dt>Protecção contra limpeza</dt><dd>${MMStoreX.persisted ? '<span class="badge ok">Persistente</span> o navegador não apaga estes dados por falta de espaço' : '<span class="badge warn">Normal</span> o navegador pode limpar em caso de falta de espaço — mantenha o ficheiro de dados ou cópias regulares'}</dd></div>
          <div><dt>Espaço disponível</dt><dd data-v24-quota>a calcular…</dd></div>
          <div><dt>Ficheiro de dados no computador</dt><dd class="v24-file ${tone}">${E(txt)}</dd></div>
        </dl>
        <div class="v24-actions">
          ${MMDisk.handle ? `${MMDisk.perm !== 'granted' ? '<button type="button" class="btn gold sm" data-v24="reconnect">Reautorizar ficheiro</button>' : '<button type="button" class="btn ghost sm" data-v24="save">Gravar agora</button>'}<button type="button" class="btn ghost sm" data-v24="off">Desligar ficheiro</button>`
            : `<button type="button" class="btn gold sm" data-v24="connect"${MMDisk.supported() ? '' : ' disabled'}>Gravar num ficheiro do computador…</button>`}
          <button type="button" class="btn ghost sm" data-v24="open"${typeof window.showOpenFilePicker === 'function' ? '' : ' disabled'}>Abrir ficheiro de dados…</button>
          <button type="button" class="btn ghost sm" data-v24="slim">Reduzir tamanho…</button></div>
        <p class="sub v24-help">Para trabalhar em vários computadores com os mesmos dados: guarde o ficheiro numa pasta sincronizada do OneDrive / SharePoint e, nos outros postos, use «Abrir ficheiro de dados». Ao abrir o sistema é carregada a versão mais recente.</p>`;
    },
    ensure() {
      const sec = document.getElementById('sec-aparencia'); if (!sec) return;
      let box = document.getElementById('v24-store');
      if (!box) { box = document.createElement('div'); box.id = 'v24-store'; box.className = 'card v24-store'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Onde ficam os dados'); const top = sec.querySelector('.topbar'); if (top) top.after(box); else sec.prepend(box); }
      box.innerHTML = Panel.html();
      navigator.storage?.estimate?.().then((est) => { const el = box.querySelector('[data-v24-quota]'); if (!el || !est) return; const u = (est.usage || 0) / 1048576, q = (est.quota || 0) / 1048576;
        el.textContent = q ? `${u.toFixed(1)} MB usados de ${q >= 1024 ? `${(q / 1024).toFixed(1)} GB` : `${q.toFixed(0)} MB`} disponíveis para este endereço.` : `${u.toFixed(1)} MB usados.`; }).catch(() => {});
    },
    refresh() { if (document.getElementById('v24-store')) Panel.ensure(); }
  };
  window.MMStorePanel = Panel;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-v24]'); if (b) {
      const a = b.dataset.v24; const msg = 'Introduza a palavra-passe de administrador para alterar o armazenamento dos dados.';
      if (a === 'connect') admin(msg, () => Disk.connect()); else if (a === 'open') admin(msg, () => Disk.open()); else if (a === 'reconnect') Disk.reconnect();
      else if (a === 'off') admin(msg, () => Disk.off()); else if (a === 'save') { saveDB(); MMDisk.flush().then(() => { Panel.refresh(); if (!MMDisk.err) MMUI.toast('Ficheiro de dados gravado.'); }); }
      else if (a === 'slim') admin(msg, () => Slim.open());
      return;
    }
    if (e.target.closest('#nav button[data-tab="aparencia"]')) setTimeout(Panel.ensure, 60);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(Panel.ensure, 400)); else setTimeout(Panel.ensure, 400);
})();
/* Ao iniciar sessão (clique = gesto do utilizador) o navegador pode voltar a autorizar o ficheiro de dados */
document.addEventListener('click', (e) => {
  if (!e.target.closest('#btn-login-confirm') || !window.MMDisk || !MMDisk.handle || MMDisk.perm !== 'prompt') return;
  MMDisk.handle.requestPermission({ mode: 'readwrite' }).then((p) => { MMDisk.perm = p; if (p === 'granted') { try { saveDB(); } catch (_) { /* sem dados */ } } window.MMStorePanel?.refresh(); }).catch(() => {});
}, true);

/* =====================================================================
   V24 — GRÁFICOS AO ESTILO THINK-CELL (modelo DPDORE V8.9), em todos os gráficos do sistema
   · Tipos novos: barras empilhadas, barras horizontais empilhadas, barras 100 %, área, barras + linha,
     cascata (waterfall), tabela de valores e cartões de valores.
   · Anotações (∠): seta CAGR, seta de diferença (Δ e %), linha de referência / meta, destaque de categoria,
     nota num ponto e totais por categoria — desenhadas no gráfico (ecrã, PNG, impressão).
   · Folha de dados (⊞): dados calculados, calculados + categorias/séries acrescentadas, ou manuais;
     colar do Excel, importar e exportar Excel. Guardada por gráfico (DB.settings.chartPrefs[id].sheet).
   Só o administrador e quem edita «Aparência» altera (as mesmas regras dos gráficos V14).
   ===================================================================== */
(function () {
  'use strict';
  const E = MMUI.esc;
  const num = (v) => { const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  const NFc = new Map(); const fmt = (v, d = 1) => { let f = NFc.get(d); if (!f) { f = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: d }); NFc.set(d, f); } return f.format(num(v)); };
  const pct = (v) => `${v >= 0 ? '+' : ''}${fmt(v * 100, 1)} %`;
  const cagr = (a, b, n) => { a = num(a); b = num(b); if (!(a > 0) || b < 0 || !(n > 0)) return null; return (b / a) ** (1 / n) - 1; };
  const X = { stacked: ['Barras empilhadas', 'bar'], hstacked: ['Barras horizontais empilhadas', 'hbar'], stacked100: ['Barras empilhadas 100 %', 'bar'], area: ['Área', 'line'],
    combo: ['Barras + linha', 'bar'], waterfall: ['Cascata (waterfall)', 'bar'], table: ['Tabela de valores', 'bar'], kpi: ['Cartões de valores', 'bar'] };
  Object.entries(X).forEach(([k, [l]]) => { if (!MM_CHART_TYPES.some((x) => x[0] === k)) MM_CHART_TYPES.push([k, l]); });
  const CIRC = MM_CIRC;

  /* ---- Folha de dados aplicada aos dados calculados ---- */
  const Sheet = {
    apply(S, data) {
      if (!S || !S.mode || S.mode === 'auto') return data;
      const L0 = (data?.labels || []).map((l) => String(Array.isArray(l) ? l.join(' ') : l)); const D0 = data?.datasets || [];
      const mk = (s) => ({ label: s.label, data: (s.data || []).map(num), ...(s.line ? { type: 'line' } : {}), ...(MMUI.color(s.color) ? { backgroundColor: s.color, borderColor: s.color } : {}) });
      if (S.mode === 'manual') return { ...data, labels: [...S.labels], datasets: S.series.map(mk) };
      const labels = [...new Set([...L0, ...S.labels.map(String)])]; const names = [...new Set([...D0.map((d, i) => d.label || `Série ${i + 1}`), ...S.series.map((s) => s.label)])];
      return { ...data, labels, datasets: names.map((n, k) => { const cd = D0.find((d, i) => (d.label || `Série ${i + 1}`) === n); const md = S.series.find((s) => s.label === n);
        const dt = labels.map((l) => { const ci = L0.indexOf(l); if (cd && ci >= 0) return num(cd.data[ci]); return num(md?.vals?.[l]); });
        return { ...(cd || {}), label: n, data: dt, ...(md?.line ? { type: 'line' } : {}), ...(MMUI.color(md?.color) ? { backgroundColor: md.color, borderColor: md.color } : {}) }; }) };
    }
  };

  /* ---- Conversão dos tipos novos (depois das preferências V14) ---- */
  const transform = (t, cfg) => {
    const ds = cfg.data.datasets || []; const sc = cfg.options.scales || {};
    const stack = () => { ['x', 'y'].forEach((k) => { sc[k] = { ...(sc[k] || {}), stacked: true }; }); cfg.options.scales = sc; };
    if (t === 'stacked' || t === 'hstacked') stack();
    if (t === 'area') ds.forEach((d) => { d.fill = true; const c = typeof d.borderColor === 'string' ? d.borderColor : MMCharts.palette()[0]; d.backgroundColor = `${MMUI.color(c, '#12213a')}55`; d.tension = 0.25; });
    if (t === 'stacked100') { const L = cfg.data.labels || []; const tot = L.map((_, i) => ds.reduce((a, d) => a + Math.abs(num(d.data[i])), 0)); ds.forEach((d) => { d.data = d.data.map((v, i) => (tot[i] ? Math.round((num(v) / tot[i]) * 1000) / 10 : 0)); }); stack(); const v = cfg.options.indexAxis === 'y' ? 'x' : 'y'; sc[v] = { ...(sc[v] || {}), max: 100 }; }
    if (t === 'combo' && ds.length > 1 && !ds.some((d) => d.type === 'line')) { const d = ds[ds.length - 1]; d.type = 'line'; const c = Array.isArray(d.backgroundColor) ? MMCharts.palette()[ds.length - 1] : d.backgroundColor; d.borderColor = c; d.backgroundColor = c; d.pointBackgroundColor = c; }
    let wf = null;
    if (t === 'waterfall') {
      const v = (ds[0]?.data || []).map(num); const p = cfg.__p || {}; const L = [...(cfg.data.labels || [])]; const bases = [], hs = []; let run = 0;
      v.forEach((x, i) => { if (i === 0) { bases.push(Math.min(0, x)); hs.push(Math.abs(x)); run = x; } else { bases.push(x >= 0 ? run : run + x); hs.push(Math.abs(x)); run += x; } });
      if (p.wfTotal !== false && v.length > 1) { L.push('Total'); bases.push(Math.min(0, run)); hs.push(Math.abs(run)); }
      const up = '#3f7150', dn = '#a6472a', tc = '#12213a';
      cfg.data.labels = L; cfg.data.datasets = [{ label: '_base', data: bases, backgroundColor: 'rgba(0,0,0,0)', borderColor: 'rgba(0,0,0,0)', datalabels: { display: false } },
        { label: ds[0]?.label || 'Variação', data: hs, backgroundColor: L.map((_, i) => (i === 0 || i >= v.length ? tc : v[i] >= 0 ? up : dn)), datalabels: { display: false } }];
      stack(); cfg.options.plugins.legend = { ...(cfg.options.plugins.legend || {}), display: false }; wf = { v, total: run };
    }
    return wf;
  };
  {
    const prep0 = MMCharts.prepare;
    MMCharts.prepare = (id, config) => {
      const p = MMCharts.pref(id); const t = p.type; let conf = config;
      if (p.sheet && p.sheet.mode && p.sheet.mode !== 'auto') conf = { ...config, data: Sheet.apply(p.sheet, config.data) };
      let cfg;
      if (X[t]) { p.type = X[t][1]; try { cfg = prep0(id, conf); } finally { p.type = t; } cfg.__p = p; }
      else cfg = prep0(id, conf);
      const wf = X[t] ? transform(t, cfg) : null; delete cfg.__p;
      // Modo escuro: o azul-marinho da paleta fica ilegível sobre o fundo escuro — usa-se um azul claro
      if (document.documentElement.dataset.mmTheme === 'dark') { const sw = (c) => (typeof c === 'string' && /^#(12213a|1e3350)$/i.test(c) ? '#8fa8d2' : c); (cfg.data.datasets || []).forEach((d) => { ['backgroundColor', 'borderColor', 'pointBackgroundColor'].forEach((k) => { if (Array.isArray(d[k])) d[k] = d[k].map(sw); else d[k] = sw(d[k]); }); }); }
      const anno = (p.anno || []).filter((a) => a && a.k);
      cfg.options.plugins.dpAnno = { items: [{ t: t || '', anno, totals: !!p.totals, wf }] };
      if (anno.some((a) => ['cagr', 'diff', 'note'].includes(a.k)) || p.totals || t === 'waterfall') cfg.options.layout = { ...(cfg.options.layout || {}), padding: { ...((cfg.options.layout || {}).padding || {}), top: 38, right: 48 } };
      return cfg;
    };
    const after0 = MMCharts.after;
    MMCharts.after = (chart, id) => {
      after0(chart, id);
      const t = MMCharts.pref(id).type; const cv = chart.canvas; const wrap = cv?.parentElement; if (!wrap) return;
      wrap.querySelector(':scope > .v24-alt')?.remove(); cv.classList.remove('v24-hidden');
      if (t === 'table' || t === 'kpi') { cv.classList.add('v24-hidden'); wrap.insertAdjacentHTML('beforeend', Alt.html(t, chart)); wrap.classList.add('v24-altwrap'); } else wrap.classList.remove('v24-altwrap');
    };
    const tools0 = MMCharts.toolsHTML;
    MMCharts.toolsHTML = (id) => tools0(id) + (MMCharts.canEdit() ? `<button type="button" class="mmc-btn" data-mmc="sheet" aria-label="Folha de dados e tipo de gráfico" title="Folha de dados / tipo de gráfico">⊞</button>
      <button type="button" class="mmc-btn" data-mmc="anno" aria-label="Anotações: CAGR, diferença, referência" title="Anotações (CAGR, diferença, referência)">∠</button>` : '');
    // PNG da tabela / cartões e CSV da cascata com os valores originais
    const png0 = MMCharts.png; MMCharts.png = (id) => { const t = MMCharts.pref(id).type; if (t !== 'table' && t !== 'kpi') { png0(id); return; } const ch = MMCharts.chart(id); if (!ch) return; fetch(Alt.canvas(t, ch)).then((r) => r.blob()).then((b) => MMUI.download(MMCharts.fileName(id, 'png'), b)); };
    const rows0 = MMCharts.rows; MMCharts.rows = (id) => { const r = rows0(id); if (MMCharts.pref(id).type !== 'waterfall') return r; const ch = MMCharts.chart(id); const v = ch?.options?.plugins?.dpAnno?.items?.[0]?.wf?.v || []; const nm = r.cols.find((c) => c !== 'Categoria' && c !== '_base') || 'Valor';
      return { cols: ['Categoria', nm], rows: r.rows.map((x, i) => ({ Categoria: x.Categoria, [nm]: i < v.length ? v[i] : x[nm] })) }; };
  }

  /* ---- Vista alternativa: tabela / cartões ---- */
  const Alt = {
    data(ch) { return { labels: (ch.data.labels || []).map((l) => (Array.isArray(l) ? l.join(' ') : String(l))), datasets: ch.data.datasets.map((d, i) => ({ label: d.label || `Série ${i + 1}`, data: d.data.map(num) })) }; },
    html(t, ch) {
      const r = Alt.data(ch);
      if (t === 'table') return `<div class="v24-alt tbl-scroll"><table class="data-table"><caption class="sr-only">Valores do gráfico</caption><thead><tr><th scope="col">Categoria</th>${r.datasets.map((d) => `<th scope="col" class="mm-num">${E(d.label)}</th>`).join('')}</tr></thead>
        <tbody>${r.labels.map((l, i) => `<tr><th scope="row">${E(l)}</th>${r.datasets.map((d) => `<td class="mm-num">${E(fmt(d.data[i], 2))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      const d0 = r.datasets[0] || { data: [] };
      return `<div class="v24-alt v24-kpis" role="list">${r.labels.slice(0, 12).map((l, i) => `<div class="v24-kpi" role="listitem"><span class="v24-kv">${E(fmt(d0.data[i], 1))}</span><span class="v24-kl">${E(l)}</span></div>`).join('')}</div>`;
    },
    canvas(t, ch, w = 1280, h = 720) {
      const r = Alt.data(ch); const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.textBaseline = 'middle';
      if (t === 'table') { const cols = ['Categoria', ...r.datasets.map((d) => d.label)]; const rh = Math.min(48, (h - 20) / (r.labels.length + 1)); const cw = (w - 40) / cols.length; const fs = Math.max(12, Math.min(22, rh * 0.48));
        x.fillStyle = '#12213a'; x.fillRect(20, 10, w - 40, rh); x.fillStyle = '#fff'; x.font = `bold ${fs}px Arial`; cols.forEach((c, j) => { x.textAlign = j ? 'right' : 'left'; x.fillText(String(c).slice(0, 28), j ? 20 + (j + 1) * cw - 10 : 30, 10 + rh / 2); });
        r.labels.forEach((l, i) => { const y = 10 + rh * (i + 1); if (y + rh > h) return; x.fillStyle = i % 2 ? '#f7f4ec' : '#fff'; x.fillRect(20, y, w - 40, rh); x.fillStyle = '#1b1b18'; x.font = `${fs}px Arial`; x.textAlign = 'left'; x.fillText(String(l).slice(0, 34), 30, y + rh / 2); r.datasets.forEach((d, j) => { x.textAlign = 'right'; x.fillText(fmt(d.data[i], 2), 20 + (j + 2) * cw - 10, y + rh / 2); }); });
      } else { const n = Math.min(12, r.labels.length) || 1; const cols = Math.min(4, n); const rows = Math.ceil(n / cols); const gw = (w - 40 - 16 * (cols - 1)) / cols, gh = (h - 40 - 16 * (rows - 1)) / rows;
        r.labels.slice(0, 12).forEach((l, i) => { const bx = 20 + (i % cols) * (gw + 16), by = 20 + Math.floor(i / cols) * (gh + 16); x.fillStyle = '#f7f4ec'; x.strokeStyle = '#dcd5c4'; x.lineWidth = 2; x.fillRect(bx, by, gw, gh); x.strokeRect(bx, by, gw, gh); x.fillStyle = '#b8892b'; x.fillRect(bx, by, 6, gh);
          x.textAlign = 'center'; x.fillStyle = '#12213a'; x.font = `bold ${Math.min(64, gh * 0.38)}px Arial`; x.fillText(fmt(r.datasets[0]?.data[i], 1), bx + gw / 2, by + gh * 0.42); x.font = `${Math.min(24, gh * 0.14)}px Arial`; x.fillStyle = '#5b564c'; x.fillText(String(l).slice(0, 30), bx + gw / 2, by + gh * 0.78); }); }
      return cv.toDataURL('image/png');
    }
  };

  /* ---- Plugin: anotações desenhadas no gráfico ---- */
  const Base = MMCharts.Base || window.Chart;
  if (Base && !Base.registry?.plugins?.get?.('dpAnno')) {
    const bubble = (x, txt, cx, cy, fs, color) => { x.font = `600 ${fs}px Arial`; const w = x.measureText(txt).width + fs * 1.1, h = fs * 1.7; x.fillStyle = document.documentElement.dataset.mmTheme === 'dark' ? '#182234' : '#ffffff'; x.strokeStyle = color; x.lineWidth = Math.max(1, fs / 10);
      x.beginPath(); if (x.roundRect) x.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); else x.rect(cx - w / 2, cy - h / 2, w, h); x.fill(); x.stroke(); x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, cx, cy + 0.5); };
    const head = (x, x1, y1, ang, s) => { x.beginPath(); x.moveTo(x1, y1); x.lineTo(x1 - s * Math.cos(ang - 0.45), y1 - s * Math.sin(ang - 0.45)); x.lineTo(x1 - s * Math.cos(ang + 0.45), y1 - s * Math.sin(ang + 0.45)); x.closePath(); x.fill(); };
    Base.register({
      id: 'dpAnno',
      beforeDatasetsDraw(chart, _a, opts) {
        const info = opts?.items?.[0]; if (!info || CIRC.includes(chart.config.type)) return;
        const hor = chart.options.indexAxis === 'y'; const cs = chart.scales[hor ? 'y' : 'x']; const A = chart.chartArea; if (!cs || !A) return;
        const step = (hor ? A.bottom - A.top : A.right - A.left) / Math.max(1, chart.data.labels.length);
        info.anno.filter((a) => a.k === 'hl').forEach((a) => { const c = cs.getPixelForValue(num(a.i)); const x = chart.ctx; x.save(); x.fillStyle = `${MMUI.color(a.color, '#b8892b')}33`; if (hor) x.fillRect(A.left, c - step / 2, A.right - A.left, step); else x.fillRect(c - step / 2, A.top, step, A.bottom - A.top); x.restore(); });
      },
      afterDatasetsDraw(chart, _a, opts) {
        const info = opts?.items?.[0]; if (!info || CIRC.includes(chart.config.type) || chart.config.type === 'radar') return;
        const x = chart.ctx; const A = chart.chartArea; const hor = chart.options.indexAxis === 'y';
        const cs = chart.scales[hor ? 'y' : 'x'], vs = chart.scales[hor ? 'x' : 'y']; if (!cs || !vs || !A) return;
        const fs = Math.max(10, Math.min(18, Math.round(chart.width / 58))); const dark = document.documentElement.dataset.mmTheme === 'dark'; const ink = dark ? '#ece7da' : '#1b1b18';
        const DS = chart.data.datasets; const vis = DS.map((_, i) => !chart.getDatasetMeta(i).hidden); const stacked = !!(chart.options.scales?.[hor ? 'x' : 'y']?.stacked);
        const val = (ds, i) => (stacked ? DS.reduce((a, d, j) => a + (vis[j] ? num(d.data[i]) : 0), 0) : num(DS[ds]?.data[i]));
        const P = (i, v) => (hor ? [vs.getPixelForValue(v), cs.getPixelForValue(i)] : [cs.getPixelForValue(i), vs.getPixelForValue(v)]);
        x.save();
        if (info.totals && stacked && info.t !== 'waterfall') chart.data.labels.forEach((_, i) => { const tot = DS.reduce((a, d, j) => a + (vis[j] ? num(d.data[i]) : 0), 0); const [px, py] = P(i, tot); x.fillStyle = ink; x.font = `bold ${fs}px Arial`; x.textAlign = hor ? 'left' : 'center'; x.textBaseline = hor ? 'middle' : 'bottom'; x.fillText(fmt(tot), hor ? px + 6 : px, hor ? py : py - 4); });
        if (info.t === 'waterfall' && info.wf) chart.data.labels.forEach((_, i) => { const base = num(DS[0]?.data[i]), h = num(DS[1]?.data[i]); const isTot = i >= info.wf.v.length; const d = isTot ? info.wf.total : info.wf.v[i]; const [px, py] = P(i, base + h);
          x.fillStyle = ink; x.font = `bold ${fs}px Arial`; x.textAlign = hor ? 'left' : 'center'; x.textBaseline = hor ? 'middle' : 'bottom'; x.fillText(`${i > 0 && !isTot && d > 0 ? '+' : ''}${fmt(d)}`, hor ? px + 6 : px, hor ? py : py - 4); });
        info.anno.forEach((a) => {
          const c0 = MMUI.color(a.color, '#a6472a'); const lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; }; const col = dark && lum(c0) < 0.3 ? '#ece7da' : c0; x.strokeStyle = col; x.fillStyle = col; x.lineWidth = Math.max(1.5, fs / 8);
          if (a.k === 'ref') { const p = vs.getPixelForValue(num(a.v)); x.setLineDash([fs / 2, fs / 3]); x.beginPath(); if (hor) { x.moveTo(p, A.top); x.lineTo(p, A.bottom); } else { x.moveTo(A.left, p); x.lineTo(A.right, p); } x.stroke(); x.setLineDash([]);
            x.font = `600 ${fs}px Arial`; x.textAlign = 'right'; x.textBaseline = 'bottom'; const t = `${a.label || 'Referência'}: ${fmt(a.v)}`; if (hor) { x.save(); x.translate(p - 4, A.top + 4); x.rotate(-Math.PI / 2); x.fillText(t, 0, 0); x.restore(); } else x.fillText(t, A.right - 2, p - 3); return; }
          if (a.k === 'note') { const i = num(a.i); const [px, py] = P(i, val(num(a.ds), i)); bubble(x, String(a.text || '').slice(0, 40), hor ? Math.min(A.right - 40, px + 60) : px, hor ? py : Math.max(A.top - fs, py - fs * 2.2), fs, col); return; }
          if (a.k !== 'cagr' && a.k !== 'diff') return;
          const i = num(a.from), j = num(a.to); if (!(i >= 0 && j > i && j < chart.data.labels.length)) return;
          const va = val(num(a.ds), i), vb = val(num(a.ds), j); const [xa, ya] = P(i, va), [xb, yb] = P(j, vb);
          if (a.k === 'cagr') { const c = cagr(va, vb, j - i); const txt = c === null ? 'CAGR n/d' : `CAGR ${pct(c)}`;
            if (!hor) { let top = Math.min(ya, yb); for (let k = i; k <= j; k++) top = Math.min(top, P(k, val(num(a.ds), k))[1]); const ly = Math.max(A.top - fs * 1.4, top - fs * 2);
              x.beginPath(); x.moveTo(xa, ya - 4); x.lineTo(xa, ly); x.lineTo(xb, ly); x.lineTo(xb, yb - 4 - fs * 0.6); x.stroke(); head(x, xb, yb - 4, Math.PI / 2, fs * 0.7); bubble(x, txt, (xa + xb) / 2, ly, fs, col); }
            else { let right = Math.max(xa, xb); for (let k = i; k <= j; k++) right = Math.max(right, P(k, val(num(a.ds), k))[0]); const lx = Math.min(A.right + fs * 2, right + fs * 3);
              x.beginPath(); x.moveTo(xa + 4, ya); x.lineTo(lx, ya); x.lineTo(lx, yb); x.lineTo(xb + 4 + fs * 0.6, yb); x.stroke(); head(x, xb + 4, yb, Math.PI, fs * 0.7); bubble(x, txt, lx, (ya + yb) / 2, fs, col); }
          } else { const d = vb - va; const txt = `${d >= 0 ? '+' : ''}${fmt(d)}${va ? ` (${pct(d / Math.abs(va))})` : ''}`;
            if (!hor) { const bw = ((A.right - A.left) / Math.max(1, chart.data.labels.length)) * 0.42; const ax = Math.min(A.right + fs * 2, xb + bw + fs * 0.6);
              x.setLineDash([4, 3]); x.beginPath(); x.moveTo(xa + bw * 0.6, ya); x.lineTo(ax + 4, ya); x.moveTo(xb + bw * 0.6, yb); x.lineTo(ax + 4, yb); x.stroke(); x.setLineDash([]);
              x.beginPath(); x.moveTo(ax, ya); x.lineTo(ax, yb + (yb > ya ? -fs * 0.6 : fs * 0.6)); x.stroke(); head(x, ax, yb, yb > ya ? Math.PI / 2 : -Math.PI / 2, fs * 0.7);
              x.font = `600 ${fs}px Arial`; const tw = x.measureText(txt).width + fs; const cx = ax + tw / 2 + 6 > chart.width - 2 ? ax - tw / 2 - 6 : ax + tw / 2 + 6; bubble(x, txt, cx, (ya + yb) / 2, fs, col); }
            else { const ay = Math.max(A.top - fs, yb - fs * 1.4); x.setLineDash([4, 3]); x.beginPath(); x.moveTo(xa, ya); x.lineTo(xa, ay); x.moveTo(xb, yb); x.lineTo(xb, ay); x.stroke(); x.setLineDash([]);
              x.beginPath(); x.moveTo(xa, ay); x.lineTo(xb + (xb > xa ? -fs * 0.6 : fs * 0.6), ay); x.stroke(); head(x, xb, ay, xb > xa ? 0 : Math.PI, fs * 0.7); bubble(x, txt, (xa + xb) / 2, ay - fs, fs, col); }
          }
        });
        x.restore();
      }
    });
  }

  /* ---- Janela das anotações ---- */
  const Anno = {
    KINDS: [['cagr', 'Seta CAGR (crescimento anual composto)'], ['diff', 'Seta de diferença (Δ e %)'], ['ref', 'Linha de referência / meta'], ['hl', 'Destacar categoria'], ['note', 'Nota num ponto']],
    open(id) {
      const ch = MMCharts.chart(id); if (!ch) return; const p = MMCharts.pref(id, true); p.anno = p.anno || [];
      const r = Alt.data(ch); const L = r.labels; const cats = L.map((l, i) => [i, l]); const sers = r.datasets.filter((d) => d.label !== '_base').map((d, i) => [i, d.label]);
      const m = MMUI.modal({ title: 'Anotações do gráfico', size: 'wide', body: '<div data-an></div>', foot: '<button type="button" class="btn gold sm" data-close>Fechar</button>' });
      const host = m.el.querySelector('[data-an]'); let k = 'cagr';
      const opt = (A, v) => A.map(([a, b]) => `<option value="${E(a)}"${String(a) === String(v) ? ' selected' : ''}>${E(b)}</option>`).join('');
      const desc = (a) => (a.k === 'cagr' ? `CAGR ${L[a.from]} → ${L[a.to]}` : a.k === 'diff' ? `Diferença ${L[a.from]} → ${L[a.to]}` : a.k === 'ref' ? `${a.label || 'Referência'} = ${fmt(a.v)}` : a.k === 'hl' ? `Destaque: ${L[a.i]}` : `Nota em ${L[a.i]}: ${a.text}`);
      const draw = () => {
        host.innerHTML = `<label class="mm-check"><input type="checkbox" data-tot${p.totals ? ' checked' : ''}> Mostrar totais por categoria (barras empilhadas)</label>
          ${p.type === 'waterfall' ? `<label class="mm-check"><input type="checkbox" data-wft${p.wfTotal !== false ? ' checked' : ''}> Cascata com barra de total</label>` : ''}
          <div class="tbl-scroll"><table class="data-table"><caption class="sr-only">Anotações existentes</caption><thead><tr><th scope="col">Anotação</th><th scope="col"><span class="sr-only">Remover</span></th></tr></thead><tbody>
          ${p.anno.length ? p.anno.map((a, i) => `<tr><td><span class="v24-sw" data-sw="${E(MMUI.color(a.color, '#a6472a'))}"></span> ${E(desc(a))}</td><td><button type="button" class="btn ghost sm" data-del="${i}" aria-label="Remover anotação">✕</button></td></tr>`).join('') : '<tr><td colspan="2">Sem anotações.</td></tr>'}</tbody></table></div>
          <fieldset class="v24-fs"><legend>Acrescentar</legend><div class="mm-grid">
            <div class="field"><label for="an_k">Tipo</label><select id="an_k" data-k>${opt(Anno.KINDS, k)}</select></div>
            ${['cagr', 'diff', 'note'].includes(k) && sers.length > 1 ? `<div class="field"><label for="an_s">Série</label><select id="an_s" data-f="ds">${opt(sers, 0)}</select></div>` : ''}
            ${['cagr', 'diff'].includes(k) ? `<div class="field"><label for="an_a">De</label><select id="an_a" data-f="from">${opt(cats, 0)}</select></div><div class="field"><label for="an_b">Até</label><select id="an_b" data-f="to">${opt(cats, Math.max(0, cats.length - 1))}</select></div>` : ''}
            ${['hl', 'note'].includes(k) ? `<div class="field"><label for="an_i">Categoria</label><select id="an_i" data-f="i">${opt(cats, 0)}</select></div>` : ''}
            ${k === 'ref' ? '<div class="field"><label for="an_v">Valor *</label><input id="an_v" data-f="v" inputmode="decimal" required aria-required="true"></div><div class="field"><label for="an_l">Rótulo</label><input id="an_l" data-f="label" maxlength="30" value="Meta"></div>' : ''}
            ${k === 'note' ? '<div class="field mm-full"><label for="an_t">Texto *</label><input id="an_t" data-f="text" maxlength="40" required aria-required="true"></div>' : ''}
            <div class="field"><label for="an_c">Cor</label><input id="an_c" type="color" data-f="color" value="${k === 'hl' ? '#b8892b' : k === 'ref' ? '#a6472a' : '#12213a'}"></div></div>
            <button type="button" class="btn gold sm" data-add>Acrescentar anotação</button></fieldset><p class="mm-err" role="alert"></p>`;
        host.querySelectorAll('[data-sw]').forEach((s) => s.style.setProperty('--sw', s.dataset.sw));
      };
      const save = (what) => MMCharts.commit(id, `Gráfico ${id}: ${what}`);
      draw();
      host.addEventListener('change', (e) => { if (e.target.matches('[data-k]')) { k = e.target.value; draw(); } if (e.target.matches('[data-tot]')) { p.totals = e.target.checked; save('totais'); } if (e.target.matches('[data-wft]')) { p.wfTotal = e.target.checked; save('total da cascata'); } });
      host.addEventListener('click', (e) => {
        const del = e.target.closest('[data-del]'); if (del) { p.anno.splice(+del.dataset.del, 1); save('anotação removida'); draw(); return; }
        if (!e.target.closest('[data-add]')) return; const err = host.querySelector('.mm-err'); err.textContent = '';
        const a = { k, ds: 0 }; host.querySelectorAll('[data-f]').forEach((f) => { a[f.dataset.f] = f.value; }); ['ds', 'from', 'to', 'i'].forEach((q) => { if (a[q] !== undefined) a[q] = Math.round(num(a[q])); });
        if ((k === 'cagr' || k === 'diff') && !(a.to > a.from)) { err.textContent = '«Até» tem de ser uma categoria posterior a «De».'; return; }
        if (k === 'ref') { if (String(a.v).trim() === '' || !Number.isFinite(Number(String(a.v).replace(',', '.')))) { err.textContent = 'Indique um valor numérico.'; return; } a.v = num(a.v); a.label = MMUI.clean(a.label, 30); }
        if (k === 'note') { a.text = MMUI.clean(a.text, 40); if (!a.text) { err.textContent = 'Escreva o texto da nota.'; return; } }
        if (/[<>]/.test(`${a.label || ''}${a.text || ''}`)) { err.textContent = 'Os textos não podem conter < ou >.'; return; }
        a.color = MMUI.color(a.color, '#a6472a'); p.anno.push(a); save('anotação acrescentada'); draw(); MMUI.toast('Anotação acrescentada.');
      });
    }
  };

  /* ---- Folha de dados ---- */
  const parseNum = (v) => { let s = String(v ?? '').replace(/[\s ]/g, ''); if (!s) return 0; if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''); else s = s.replace(',', '.'); s = s.replace(/%$/, ''); const n = Number(s); return Number.isFinite(n) ? n : NaN; };
  const DataSheet = {
    computed(id) { const d = MMCharts.src[id]?.data || {}; return { labels: (d.labels || []).map((l) => String(Array.isArray(l) ? l.join(' ') : l)), datasets: (d.datasets || []).map((x, i) => ({ label: x.label || `Série ${i + 1}`, data: (x.data || []).map(num), type: x.type })) }; },
    build(id, mode, cur) {
      const p = MMCharts.pref(id); const S = p.sheet; const d = DataSheet.computed(id); const L0 = d.labels; const S0 = d.datasets;
      if (mode === 'manual') {
        if (cur) return { labels: cur.labels.map((l) => ({ ...l, comp: false })), series: cur.series.map((s) => ({ ...s, comp: false })) };
        const src = S?.mode === 'manual' ? S : { labels: L0, series: S0.map((s) => ({ label: s.label, data: s.data, line: s.type === 'line', color: '' })) };
        return { labels: src.labels.map((v) => ({ v: String(v), comp: false })), series: src.series.map((s) => ({ label: s.label, line: !!s.line, color: s.color || '', comp: false, data: (s.data || []).map(num) })) };
      }
      if (mode === 'auto') return { labels: L0.map((v) => ({ v, comp: true })), series: S0.map((s) => ({ label: s.label, line: s.type === 'line', color: '', comp: true, data: s.data })) };
      const extraL = (cur ? cur.labels.filter((l) => !l.comp).map((l) => l.v) : (S?.mode === 'extend' ? S.labels : [])).filter((l) => !L0.includes(l));
      const extraS = cur ? cur.series.filter((s) => !s.comp) : (S?.mode === 'extend' ? S.series.filter((s) => !S0.some((x) => x.label === s.label)) : []);
      const valOf = (sn, lab) => { if (cur) { const s = cur.series.find((x) => x.label === sn); const i = cur.labels.findIndex((l) => l.v === lab); if (s && i >= 0) return num(s.data[i]); } const s2 = S?.series?.find((x) => x.label === sn); return s2?.vals ? num(s2.vals[lab]) : 0; };
      const labels = [...L0.map((v) => ({ v, comp: true })), ...extraL.map((v) => ({ v, comp: false }))];
      return { labels, series: [...S0.map((s) => { const md = S?.series?.find((x) => x.label === s.label); return { label: s.label, line: md ? !!md.line : s.type === 'line', color: md?.color || '', comp: true, data: labels.map((l, i) => (l.comp ? num(s.data[i]) : valOf(s.label, l.v))) }; }),
        ...extraS.map((s) => ({ label: s.label, line: !!s.line, color: s.color || '', comp: false, data: labels.map((l) => valOf(s.label, l.v)) }))] };
    },
    fromAOA(aoa) {
      const rows = aoa.map((r) => r.map((c) => String(c ?? '').trim())).filter((r) => r.some(Boolean)); if (rows.length < 2) throw new Error('são precisas pelo menos 2 linhas (cabeçalho + dados)');
      const names = rows[0].slice(1).map((h, i) => MMUI.clean(h, 60) || `Série ${i + 1}`); if (!names.length) throw new Error('falta pelo menos uma coluna de valores');
      const bad = []; const labels = rows.slice(1).map((r) => MMUI.clean(r[0], 80) || '—');
      return { labels: labels.map((v) => ({ v, comp: false })), series: names.map((n, j) => ({ label: n, line: false, color: '', comp: false, data: rows.slice(1).map((r, i) => { const v = parseNum(r[j + 1]); if (Number.isNaN(v)) { bad.push(`${labels[i]} / ${n}`); return 0; } return v; }) })), bad };
    },
    open(id) {
      if (!MMCharts.src[id]) return; const p = MMCharts.pref(id, true); let mode = p.sheet?.mode || 'auto'; let st = DataSheet.build(id, mode); let type = p.type || '';
      const ICON = { bar: '▮▮', hbar: '☰', stacked: '▤', hstacked: '▥', stacked100: '%', area: '◭', combo: '▮∿', line: '∿', doughnut: '◎', pie: '◔', polarArea: '✺', radar: '✶', waterfall: '⊓⊔', table: '▦', kpi: '▣' };
      const m = MMUI.modal({ title: `Folha de dados — ${MMCharts.title(id)}`, size: 'wide', body: '<div data-ds></div>', foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Aplicar ao gráfico</button>' });
      const host = m.el.querySelector('[data-ds]'); const err = () => host.querySelector('.mm-err');
      const draw = () => {
        const ro = (l, s) => mode === 'auto' || (mode === 'extend' && l.comp && s.comp); const lockH = (s) => s.comp && mode !== 'manual';
        host.innerHTML = `<fieldset class="v24-fs"><legend>Apresentação gráfica</legend><div class="v24-types" role="radiogroup" aria-label="Tipo de gráfico">
            <button type="button" class="v24-type${!type ? ' on' : ''}" role="radio" aria-checked="${!type}" data-type=""><span aria-hidden="true">✦</span>Original</button>
            ${MM_CHART_TYPES.map(([k, l]) => `<button type="button" class="v24-type${type === k ? ' on' : ''}" role="radio" aria-checked="${type === k}" data-type="${k}"><span aria-hidden="true">${ICON[k] || '▮'}</span>${E(l)}</button>`).join('')}</div></fieldset>
          <fieldset class="v24-fs"><legend>Origem dos dados</legend><div class="v24-radios">
            <label class="mm-check"><input type="radio" name="dsmode" value="auto"${mode === 'auto' ? ' checked' : ''}> Calculados pelo sistema</label>
            <label class="mm-check"><input type="radio" name="dsmode" value="extend"${mode === 'extend' ? ' checked' : ''}> Calculados + categorias / séries acrescentadas por si</label>
            <label class="mm-check"><input type="radio" name="dsmode" value="manual"${mode === 'manual' ? ' checked' : ''}> Manuais (fixos, todas as células editáveis)</label></div></fieldset>
          <div class="v24-actions">${mode === 'auto' ? '<span class="sub">Escolha «Calculados + …» ou «Manuais» para editar.</span>' : `<button type="button" class="btn ghost sm" data-addrow>+ Categoria (linha)</button><button type="button" class="btn ghost sm" data-addcol>+ Série (campo)</button>
            <button type="button" class="btn ghost sm" data-paste>Colar do Excel…</button><button type="button" class="btn ghost sm" data-file>Importar Excel…</button>${mode === 'manual' ? '<button type="button" class="btn ghost sm" data-transp>Trocar linhas ↔ colunas</button>' : ''}`}<button type="button" class="btn ghost sm" data-xl>Exportar Excel</button></div>
          <div class="tbl-scroll v24-dswrap"><table class="data-table v24-grid"><caption class="sr-only">Folha de dados: categorias nas linhas, séries nas colunas</caption>
            <thead><tr><th scope="col">Categoria</th>${st.series.map((s, j) => `<th scope="col" class="${lockH(s) ? 'comp' : ''}"><input class="v24-h" data-sn="${j}" value="${E(s.label)}" aria-label="Nome da série ${j + 1}" maxlength="60"${lockH(s) ? ' readonly' : ''}>
              <span class="v24-opts"><label class="mm-check" title="Desenhar como linha"><input type="checkbox" data-sl="${j}"${s.line ? ' checked' : ''}${mode === 'auto' ? ' disabled' : ''}> linha</label><input type="color" data-sc="${j}" data-orig="${E(MMUI.color(s.color, '#12213a'))}" value="${E(MMUI.color(s.color, '#12213a'))}" aria-label="Cor da série ${E(s.label)}"${mode === 'auto' ? ' disabled' : ''}>
              ${!lockH(s) ? `<button type="button" class="btn ghost sm" data-delc="${j}" aria-label="Remover série ${E(s.label)}">✕</button>` : ''}</span></th>`).join('')}<th scope="col"><span class="sr-only">Remover</span></th></tr></thead>
            <tbody>${st.labels.map((l, i) => `<tr><th scope="row" class="${l.comp && mode !== 'manual' ? 'comp' : ''}"><input class="v24-l" data-ln="${i}" value="${E(l.v)}" aria-label="Categoria ${i + 1}" maxlength="80"${l.comp && mode !== 'manual' ? ' readonly' : ''}></th>
              ${st.series.map((s, j) => `<td class="${ro(l, s) ? 'comp' : ''}"><input class="v24-v" inputmode="decimal" data-r="${i}" data-c="${j}" value="${E(String(s.data[i] ?? 0).replace('.', ','))}" aria-label="${E(l.v)} — ${E(s.label)}"${ro(l, s) ? ' readonly' : ''}></td>`).join('')}
              <td>${!l.comp || mode === 'manual' ? `<button type="button" class="btn ghost sm" data-delr="${i}" aria-label="Remover categoria ${E(l.v)}">✕</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="${st.series.length + 2}">Sem categorias.</td></tr>`}</tbody></table></div>
          <p class="sub">${mode === 'extend' ? 'Células sombreadas: calculadas pelo sistema (só leitura). As linhas e colunas acrescentadas por si juntam-se às calculadas sempre que os dados mudam.' : 'Números com vírgula ou ponto decimal.'} Depois de aplicar, use «∠» para setas CAGR, diferenças e linhas de referência.</p><p class="mm-err" role="alert"></p>`;
      };
      const read = () => { const bad = [];
        host.querySelectorAll('[data-sn]').forEach((x) => { st.series[+x.dataset.sn].label = MMUI.clean(x.value, 60); });
        host.querySelectorAll('[data-sl]').forEach((x) => { st.series[+x.dataset.sl].line = x.checked; });
        host.querySelectorAll('[data-sc]').forEach((x) => { const s = st.series[+x.dataset.sc]; if (x.value !== x.dataset.orig || s.color) s.color = MMUI.color(x.value); });
        host.querySelectorAll('[data-ln]').forEach((x) => { st.labels[+x.dataset.ln].v = MMUI.clean(x.value, 80); });
        host.querySelectorAll('[data-r]').forEach((x) => { const v = parseNum(x.value); if (Number.isNaN(v)) { bad.push(x); x.setAttribute('aria-invalid', 'true'); } else { x.removeAttribute('aria-invalid'); st.series[+x.dataset.c].data[+x.dataset.r] = v; } });
        return bad; };
      const take = (aoa) => { const g = DataSheet.fromAOA(aoa);
        if (mode === 'extend') { const known = new Set(st.labels.map((l) => l.v)); g.labels.forEach((l, i) => { if (!known.has(l.v)) { st.labels.push(l); st.series.forEach((s) => { const gs = g.series.find((x) => x.label === s.label); s.data.push(gs ? gs.data[i] : 0); }); } });
          g.series.forEach((gs) => { if (!st.series.some((x) => x.label === gs.label)) st.series.push({ ...gs, data: st.labels.map((l) => { const q = g.labels.findIndex((x) => x.v === l.v); return q >= 0 ? gs.data[q] : 0; }) }); }); }
        else st = { labels: g.labels, series: g.series };
        draw(); if (g.bad.length) err().textContent = `${g.bad.length} célula(s) não numérica(s) passou(aram) a 0: ${g.bad.slice(0, 4).join(', ')}${g.bad.length > 4 ? '…' : ''}.`; };
      draw();
      host.addEventListener('change', (e) => { if (e.target.name === 'dsmode') { read(); mode = e.target.value; st = DataSheet.build(id, mode, mode === 'auto' ? null : st); draw(); } });
      host.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.type !== undefined) { read(); type = b.dataset.type; draw(); return; }
        if (b.matches('[data-addrow]')) { read(); st.labels.push({ v: `Nova ${st.labels.length + 1}`, comp: false }); st.series.forEach((s) => s.data.push(0)); draw(); [...host.querySelectorAll('[data-ln]')].pop()?.select(); return; }
        if (b.matches('[data-addcol]')) { read(); st.series.push({ label: `Série ${st.series.length + 1}`, line: false, color: '', comp: false, data: st.labels.map(() => 0) }); draw(); [...host.querySelectorAll('[data-sn]')].pop()?.select(); return; }
        if (b.dataset.delr !== undefined) { read(); const i = +b.dataset.delr; st.labels.splice(i, 1); st.series.forEach((s) => s.data.splice(i, 1)); draw(); return; }
        if (b.dataset.delc !== undefined) { read(); st.series.splice(+b.dataset.delc, 1); draw(); return; }
        if (b.matches('[data-transp]')) { read(); st = { labels: st.series.map((s) => ({ v: s.label, comp: false })), series: st.labels.map((l, i) => ({ label: l.v, line: false, color: '', comp: false, data: st.series.map((s) => s.data[i]) })) }; draw(); return; }
        if (b.matches('[data-xl]')) { read(); if (!window.XLSX) { MMUI.toast('A biblioteca Excel não carregou.'); return; } const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Categoria', ...st.series.map((s) => s.label)], ...st.labels.map((l, i) => [l.v, ...st.series.map((s) => s.data[i])])]), 'Dados'); XLSX.writeFile(wb, MMCharts.fileName(id, 'xlsx')); return; }
        if (b.matches('[data-paste]')) { read(); const pm = MMUI.modal({ title: 'Colar do Excel', size: 'narrow', body: '<p class="mm-help">Copie no Excel o intervalo com o cabeçalho (1.ª coluna = categorias, restantes = séries) e cole aqui.</p><label for="ds_p" class="sr-only">Dados copiados</label><textarea id="ds_p" class="v24-paste" rows="10" data-p></textarea><p class="mm-err" role="alert"></p>',
            foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-go>Usar estes dados</button>' });
          pm.el.querySelector('[data-go]').addEventListener('click', () => { try { const t = pm.el.querySelector('[data-p]').value; const sep = t.includes('\t') ? '\t' : ';'; take(t.split(/\r?\n/).map((r) => r.split(sep))); pm.close(); } catch (x) { pm.el.querySelector('.mm-err').textContent = `Dados inválidos: ${x.message}.`; } }); return; }
        if (b.matches('[data-file]')) { read(); const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls,.csv,.ods';
          inp.onchange = async () => { const f = inp.files?.[0]; if (!f || !window.XLSX) return; try { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]]; take(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })); } catch (x) { err().textContent = `Ficheiro inválido: ${x.message}.`; } }; inp.click(); }
      });
      m.el.querySelector('[data-ok]').addEventListener('click', () => {
        const bad = read(); if (bad.length) { err().textContent = `Corrija ${bad.length} célula(s) com valor não numérico.`; bad[0].focus(); return; }
        const all = [...st.labels.map((l) => l.v), ...st.series.map((s) => s.label)];
        if (all.some((t) => !t)) { err().textContent = 'Todas as categorias e séries precisam de nome.'; return; }
        if (all.some((t) => /[<>]/.test(t))) { err().textContent = 'Os nomes não podem conter < ou >.'; return; }
        if (new Set(st.labels.map((l) => l.v)).size !== st.labels.length) { err().textContent = 'Há categorias repetidas.'; return; }
        if (new Set(st.series.map((s) => s.label)).size !== st.series.length) { err().textContent = 'Há séries repetidas.'; return; }
        if (mode !== 'auto' && !st.series.length) { err().textContent = 'Acrescente pelo menos uma série.'; return; }
        if (mode === 'auto') delete p.sheet;
        else if (mode === 'manual') p.sheet = { mode, labels: st.labels.map((l) => l.v), series: st.series.map((s) => ({ label: s.label, data: s.data.slice(0, st.labels.length), line: !!s.line, color: s.color || '' })) };
        else p.sheet = { mode, labels: st.labels.filter((l) => !l.comp).map((l) => l.v), series: st.series.map((s) => ({ label: s.label, comp: s.comp, line: !!s.line, color: s.color || '', vals: Object.fromEntries(st.labels.map((l, i) => [l.v, s.data[i]]).filter((_, i) => !(s.comp && st.labels[i].comp))) })) };
        if (type) p.type = type; else delete p.type;
        m.close(); MMCharts.commit(id, `Gráfico ${id}: folha de dados (${mode})`); MMUI.toast('Gráfico actualizado.');
      });
    }
  };
  window.MMChartsX = { Sheet, Anno, DataSheet, Alt };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.mmc-tools [data-mmc="sheet"], .mmc-tools [data-mmc="anno"]'); if (!b) return;
    const id = b.closest('.mmc-tools').dataset.chart; if (!MMCharts.canEdit()) { MMCharts.deny(); return; }
    if (b.dataset.mmc === 'sheet') DataSheet.open(id); else Anno.open(id);
  });
  // Os gráficos já desenhados ganham os botões novos
  setTimeout(() => { try { MMCharts.rebuildAll(); } catch (_) { /* sem gráficos */ } }, 300);
})();

/* =====================================================================
   V25 — RECUPERAÇÃO DA PALAVRA-PASSE DO ADMINISTRADOR (modelo DPDORE V8.8)
   Três métodos, configurados pelo administrador em Utilizadores → «Recuperação do administrador»:
     · 8 códigos de uso único (mostrados uma só vez, com descarga .txt);
     · 2 perguntas de segurança (respostas guardadas com PBKDF2, sem distinguir maiúsculas nem acentos);
     · ficheiro-chave (.mmkey) guardado fora do computador (pen, cofre).
   No ecrã de entrada: «Esqueci a palavra-passe do administrador». Nada é guardado em texto simples:
   códigos e ficheiro-chave com SHA-256 e sal; respostas e nova palavra-passe com PBKDF2 (o mesmo formato da V8).
   5 tentativas falhadas bloqueiam a recuperação durante 60 segundos.
   ===================================================================== */
(function () {
  'use strict';
  const E = MMUI.esc;
  const ITER = 150000;
  const enc = (s) => new TextEncoder().encode(s);
  const b64 = (buf) => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
  const sha = async (s) => b64(await crypto.subtle.digest('SHA-256', enc(s)));
  const pbkdf2 = async (pw, salt) => { const k = await crypto.subtle.importKey('raw', enc(pw), { name: 'PBKDF2' }, false, ['deriveBits']); return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(salt), iterations: ITER, hash: 'SHA-256' }, k, 256)); };
  /** Registo no mesmo formato da V8 (DB.settings.adminPasswordHash). */
  const record = async (pw) => { const salt = b64(rnd(16)); return { algo: 'PBKDF2-SHA256', iterations: ITER, salt, hash: await pbkdf2(pw, salt) }; };
  const same = (a, b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; };
  const normAns = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newCode = () => { const b = rnd(8); let s = ''; b.forEach((x) => { s += ALPH[x % ALPH.length]; }); return `${s.slice(0, 4)}-${s.slice(4)}`; };
  const QUESTIONS = ['Nome da primeira igreja que frequentou', 'Nome do pastor que o baptizou', 'Cidade onde nasceu a sua mãe', 'Nome do seu primeiro professor', 'Nome da rua onde cresceu', 'Versículo bíblico preferido (livro e capítulo)'];
  const cfg = () => { DB.settings.recovery = DB.settings.recovery || {}; return DB.settings.recovery; };
  const status = () => { const c = cfg(); return { codes: (c.codes || []).length, questions: (c.questions || []).length, key: !!c.keyHash }; };
  const log = (a, s) => { try { if (typeof logActivity === 'function') logActivity(a, 'Segurança', s); } catch (_) { /* opcional */ } };
  const save = () => { try { saveDB(); } catch (e) { MMUI.toast(`Não foi possível guardar: ${e.message}`); } };
  const text = (name, txt) => MMUI.download(name, new Blob([txt], { type: 'text/plain;charset=utf-8' }));
  const brand = () => { try { return DB.settings.branding?.nome || 'Centro Monte Moriá'; } catch (_) { return 'Centro Monte Moriá'; } };

  /* ---- Configuração (administrador, com nova confirmação da palavra-passe) ---- */
  const Setup = {
    gate(fn) { if (typeof requirePassword === 'function') requirePassword('v25rec', 'Confirme a palavra-passe de administrador para alterar a recuperação.', fn); else fn(); },
    async codes() {
      const list = Array.from({ length: 8 }, newCode); const out = [];
      for (const c of list) { const s = b64(rnd(12)); out.push({ s, h: await sha(s + normCode(c)) }); }
      cfg().codes = out; cfg().codesAt = new Date().toISOString(); save(); log('Gerou códigos de recuperação', '8 códigos'); Panel.render();
      const m = MMUI.modal({ title: 'Códigos de recuperação (mostrados só agora)', size: 'narrow',
        body: `<p class="mm-help">Guarde estes códigos num local seguro, fora deste computador. Cada código só funciona uma vez. Os códigos anteriores deixaram de funcionar.</p><ol class="v25-codes">${list.map((c) => `<li><code>${E(c)}</code></li>`).join('')}</ol>`,
        foot: '<button type="button" class="btn ghost sm" data-dl>Descarregar (.txt)</button><button type="button" class="btn gold sm" data-close>Já guardei</button>' });
      m.el.querySelector('[data-dl]').addEventListener('click', () => text('codigos_recuperacao_admin.txt', `${brand()} — códigos de recuperação do administrador\nGerados em ${new Date().toLocaleString('pt-PT')}\nCada código só pode ser usado uma vez.\n\n${list.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`));
    },
    questions() {
      const cur = cfg().questions || [];
      const sel = (i) => { const q = cur[i]?.q || QUESTIONS[i]; const known = QUESTIONS.includes(q); return `<div class="field"><label for="v25q${i}">Pergunta ${i + 1}</label><select id="v25q${i}" data-q="${i}">${QUESTIONS.map((x) => `<option${x === q ? ' selected' : ''}>${E(x)}</option>`).join('')}<option value="__own"${known ? '' : ' selected'}>Outra (escrever)…</option></select>
        <input class="v25-own" data-own="${i}" maxlength="120" placeholder="Escreva a sua pergunta" value="${known ? '' : E(q)}"${known ? ' hidden' : ''} aria-label="Pergunta ${i + 1} personalizada"></div>
        <div class="field"><label for="v25a${i}">Resposta ${i + 1}</label><input id="v25a${i}" data-a="${i}" type="password" autocomplete="off" maxlength="120" required aria-required="true"></div>`; };
      const m = MMUI.modal({ title: 'Perguntas de segurança', size: 'narrow', body: `<form class="mm-form" novalidate><p class="mm-help">As respostas não distinguem maiúsculas, acentos nem pontuação. Escolha respostas que só o administrador saiba.</p>${sel(0)}${sel(1)}<p class="mm-err" role="alert"></p></form>`,
        foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
      m.el.addEventListener('change', (e) => { const s = e.target.closest('[data-q]'); if (s) m.el.querySelector(`[data-own="${s.dataset.q}"]`).hidden = s.value !== '__own'; });
      m.el.querySelector('[data-ok]').addEventListener('click', async (ev) => {
        const err = m.el.querySelector('.mm-err'); const qs = [0, 1].map((i) => { const s = m.el.querySelector(`[data-q="${i}"]`).value; return s === '__own' ? MMUI.clean(m.el.querySelector(`[data-own="${i}"]`).value, 120) : s; });
        const as = [0, 1].map((i) => normAns(m.el.querySelector(`[data-a="${i}"]`).value));
        if (qs.some((q) => !q)) { err.textContent = 'Escreva as duas perguntas.'; return; }
        if (qs[0] === qs[1]) { err.textContent = 'Escolha duas perguntas diferentes.'; return; }
        if (qs.some((q) => /[<>]/.test(q))) { err.textContent = 'As perguntas não podem conter < ou >.'; return; }
        if (as.some((a) => a.length < 3)) { err.textContent = 'Cada resposta deve ter pelo menos 3 letras ou números.'; return; }
        const b = ev.currentTarget; b.disabled = true; b.textContent = 'A guardar…';
        try { cfg().questions = await Promise.all(qs.map(async (q, i) => { const salt = b64(rnd(16)); return { q, salt, h: await pbkdf2(as[i], salt) }; })); save(); log('Definiu perguntas de segurança', '2 perguntas'); m.close(); Panel.render(); MMUI.toast('Perguntas de segurança guardadas.'); }
        catch (e) { err.textContent = `Erro: ${e.message}`; b.disabled = false; b.textContent = 'Guardar'; }
      });
    },
    async key() {
      const secret = b64(rnd(32)); const salt = b64(rnd(12));
      cfg().keySalt = salt; cfg().keyHash = await sha(salt + secret); cfg().keyAt = new Date().toISOString(); save(); log('Gerou ficheiro-chave de recuperação', '—'); Panel.render();
      MMUI.download('chave_admin_monte_moria.mmkey', new Blob([JSON.stringify({ formato: 'mm-chave-admin', versao: 1, instituicao: brand(), gerado: new Date().toISOString(), chave: secret }, null, 1)], { type: 'application/json' }));
      MMUI.toast('Ficheiro-chave descarregado. Guarde-o fora deste computador (pen, cofre). As chaves anteriores deixaram de funcionar.');
    },
    async clear(what) {
      if (!(await MMUI.confirm(`Desactivar ${what === 'codes' ? 'os códigos de recuperação' : what === 'questions' ? 'as perguntas de segurança' : 'o ficheiro-chave'}?`, 'Desactivar'))) return;
      const c = cfg(); if (what === 'codes') delete c.codes; if (what === 'questions') delete c.questions; if (what === 'key') { delete c.keyHash; delete c.keySalt; }
      save(); log('Desactivou método de recuperação', what); Panel.render();
    }
  };

  /* ---- Cartão em «Utilizadores» ---- */
  const Panel = {
    render() {
      const sec = document.getElementById('sec-utilizadores'); if (!sec) return; const st = status();
      let box = document.getElementById('v25-rec');
      if (!box) { box = document.createElement('div'); box.id = 'v25-rec'; box.className = 'card v25-rec'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Recuperação do administrador'); const top = sec.querySelector('.topbar'); if (top) top.after(box); else sec.prepend(box); }
      const none = !st.codes && !st.questions && !st.key;
      box.innerHTML = `<h3 class="v24-h">Recuperação do administrador</h3>
        <p class="sub">Se a palavra-passe mestra for esquecida, o administrador recupera o acesso no ecrã de entrada («Esqueci a palavra-passe do administrador») com um destes métodos.</p>
        ${none ? '<div class="note v25-warn" role="status"><b>Nenhum método configurado.</b> Se a palavra-passe mestra se perder, só uma cópia de segurança antiga permite voltar a entrar. Configure pelo menos dois métodos.</div>' : ''}
        <div class="v25-grid">
          <div class="v25-m"><h4>Códigos de uso único</h4><p>${st.codes ? `<span class="badge ok">${st.codes} disponíveis</span>` : '<span class="badge muted">Não configurado</span>'}</p><div class="v24-actions"><button type="button" class="btn gold sm" data-v25="codes">${st.codes ? 'Gerar novos códigos' : 'Gerar 8 códigos'}</button>${st.codes ? '<button type="button" class="btn ghost sm" data-v25="clear-codes">Desactivar</button>' : ''}</div></div>
          <div class="v25-m"><h4>Perguntas de segurança</h4><p>${st.questions ? '<span class="badge ok">2 perguntas definidas</span>' : '<span class="badge muted">Não configurado</span>'}</p><div class="v24-actions"><button type="button" class="btn gold sm" data-v25="questions">${st.questions ? 'Alterar perguntas' : 'Definir perguntas'}</button>${st.questions ? '<button type="button" class="btn ghost sm" data-v25="clear-questions">Desactivar</button>' : ''}</div></div>
          <div class="v25-m"><h4>Ficheiro-chave (.mmkey)</h4><p>${st.key ? `<span class="badge ok">Activo desde ${E(new Date(cfg().keyAt).toLocaleDateString('pt-PT'))}</span>` : '<span class="badge muted">Não configurado</span>'}</p><div class="v24-actions"><button type="button" class="btn gold sm" data-v25="key">${st.key ? 'Gerar nova chave' : 'Gerar ficheiro-chave'}</button>${st.key ? '<button type="button" class="btn ghost sm" data-v25="clear-key">Desactivar</button>' : ''}</div></div>
        </div>`;
    }
  };

  /* ---- Recuperação no ecrã de entrada ---- */
  const LOCK = 'mm_v25_lock'; let fails = 0;
  const locked = () => { const t = Number(sessionStorage.getItem(LOCK) || 0); return Date.now() < t ? Math.ceil((t - Date.now()) / 1000) : 0; };
  const fail = () => { fails += 1; if (fails >= 5) { fails = 0; sessionStorage.setItem(LOCK, String(Date.now() + 60000)); return 'Demasiadas tentativas. Aguarde 60 segundos.'; } return `Dados de recuperação incorrectos (tentativa ${fails} de 5).`; };
  const Recover = {
    open() {
      const st = status(); const methods = [st.codes && ['code', 'Código de uso único'], st.questions && ['q', 'Perguntas de segurança'], st.key && ['key', 'Ficheiro-chave (.mmkey)']].filter(Boolean);
      if (!methods.length) { MMUI.modal({ title: 'Recuperar a palavra-passe do administrador', size: 'narrow', body: '<p>Não há nenhum método de recuperação configurado neste navegador.</p><p class="mm-help">Peça a alguém que tenha uma cópia de segurança recente (exportada quando a palavra-passe era conhecida) ou contacte quem administra o sistema.</p>', foot: '<button type="button" class="btn gold sm" data-close>Fechar</button>' }).el.closest('.mm-modal-bg').classList.add('v25-top'); return; }
      let mth = methods[0][0];
      const m = MMUI.modal({ title: 'Recuperar a palavra-passe do administrador', size: 'narrow', body: '<form class="mm-form" novalidate data-r></form>', foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Repor palavra-passe</button>' });
      m.el.closest('.mm-modal-bg').classList.add('v25-top'); const f = m.el.querySelector('[data-r]');
      const draw = () => {
        const qs = cfg().questions || [];
        f.innerHTML = `<fieldset class="v24-fs"><legend>Método</legend><div class="v24-radios">${methods.map(([k, l]) => `<label class="mm-check"><input type="radio" name="mth" value="${k}"${k === mth ? ' checked' : ''}> ${E(l)}</label>`).join('')}</div></fieldset>
          ${mth === 'code' ? '<div class="field"><label for="v25c">Código de recuperação</label><input id="v25c" name="code" autocomplete="off" placeholder="XXXX-XXXX" maxlength="12" required aria-required="true"></div>' : ''}
          ${mth === 'q' ? qs.map((q, i) => `<div class="field"><label for="v25r${i}">${E(q.q)}</label><input id="v25r${i}" name="a${i}" type="password" autocomplete="off" maxlength="120" required aria-required="true"></div>`).join('') : ''}
          ${mth === 'key' ? '<div class="field"><label for="v25k">Ficheiro-chave (.mmkey)</label><input id="v25k" name="key" type="file" accept=".mmkey,application/json" required aria-required="true"></div>' : ''}
          <div class="field"><label for="v25p1">Nova palavra-passe do administrador</label><input id="v25p1" name="p1" type="password" autocomplete="new-password" minlength="8" required aria-required="true" aria-describedby="v25ph"><small id="v25ph" class="mm-help">Pelo menos 8 caracteres, com letras e números.</small></div>
          <div class="field"><label for="v25p2">Repetir a nova palavra-passe</label><input id="v25p2" name="p2" type="password" autocomplete="new-password" required aria-required="true"></div>
          <p class="mm-err" role="alert"></p>`;
        f.querySelector('input:not([type=radio])')?.focus();
      };
      draw();
      f.addEventListener('change', (e) => { if (e.target.name === 'mth') { mth = e.target.value; draw(); } });
      m.el.querySelector('[data-ok]').addEventListener('click', async (ev) => {
        const err = f.querySelector('.mm-err'); err.textContent = ''; const w = locked(); if (w) { err.textContent = `Recuperação bloqueada. Aguarde ${w} s.`; return; }
        const p1 = f.p1.value, p2 = f.p2.value;
        if (p1.length < 8 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1)) { err.textContent = 'A nova palavra-passe deve ter pelo menos 8 caracteres, com letras e números.'; f.p1.focus(); return; }
        if (p1 !== p2) { err.textContent = 'As duas palavras-passe não coincidem.'; f.p2.focus(); return; }
        const b = ev.currentTarget; b.disabled = true; b.textContent = 'A verificar…'; const c = cfg(); let ok = false; let used = '';
        try {
          if (mth === 'code') { const v = normCode(f.code.value); if (v.length !== 8) { err.textContent = 'O código tem 8 letras/números (XXXX-XXXX).'; return; }
            for (let i = 0; i < (c.codes || []).length; i++) { if (same(await sha(c.codes[i].s + v), c.codes[i].h)) { c.codes.splice(i, 1); ok = true; used = 'código de uso único'; break; } } }
          if (mth === 'q') { const qs = c.questions || []; const res = await Promise.all(qs.map(async (q, i) => same(await pbkdf2(normAns(f[`a${i}`].value), q.salt), q.h))); ok = qs.length > 0 && res.every(Boolean); used = 'perguntas de segurança'; }
          if (mth === 'key') { const file = f.key.files?.[0]; if (!file) { err.textContent = 'Escolha o ficheiro-chave.'; return; } if (file.size > 20000) { err.textContent = 'Ficheiro inválido.'; return; }
            let o = null; try { o = JSON.parse(await file.text()); } catch (_) { /* inválido */ }
            ok = !!(o && o.formato === 'mm-chave-admin' && typeof o.chave === 'string' && c.keyHash && same(await sha(c.keySalt + o.chave), c.keyHash)); used = 'ficheiro-chave'; }
          if (!ok) { err.textContent = fail(); return; }
          fails = 0; DB.settings.adminPasswordHash = await record(p1); delete DB.settings.adminPassword; save(); log('Repôs a palavra-passe do administrador', `por ${used}`);
          m.close(); const pw = document.getElementById('login-password'); const us = document.getElementById('login-username'); if (us) us.value = 'admin'; if (pw) { pw.value = ''; pw.focus(); }
          MMUI.toast(`Palavra-passe do administrador reposta (${used}). Entre com a nova palavra-passe.${mth === 'code' ? ` Restam ${(c.codes || []).length} códigos.` : ''}`);
        } catch (e2) { err.textContent = `Erro: ${e2.message}`; } finally { b.disabled = false; b.textContent = 'Repor palavra-passe'; }
      });
    }
  };
  window.MMRecovery = { Setup, Panel, Recover, status };

  /* Ligação no ecrã de entrada */
  const addLink = () => {
    const body = document.querySelector('#modal-login .modal-body'); if (!body || body.querySelector('[data-v25-forgot]')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'v25-forgot'; b.dataset.v25Forgot = ''; b.textContent = 'Esqueci a palavra-passe do administrador'; body.appendChild(b);
  };
  addLink();
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-v25-forgot]')) { e.preventDefault(); e.stopPropagation(); Recover.open(); return; }
    const a = e.target.closest('[data-v25]'); if (a) {
      const k = a.dataset.v25;
      if (k.startsWith('clear-')) Setup.gate(() => Setup.clear(k.slice(6)));
      else Setup.gate(() => Setup[k === 'key' ? 'key' : k]());
      return;
    }
    if (e.target.closest('#nav button[data-tab="utilizadores"]')) setTimeout(Panel.render, 80);
  }, true);
  setTimeout(() => { addLink(); Panel.render(); }, 300);
  /* Aviso ao administrador, uma vez por sessão, se não houver nenhum método configurado */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#btn-login-confirm')) return;
    setTimeout(() => { try { const u = currentSessionUser(); const st = status(); if (u && u.isAdmin && !st.codes && !st.questions && !st.key && !sessionStorage.getItem('mm_v25_aviso')) { sessionStorage.setItem('mm_v25_aviso', '1'); MMUI.toast('Configure a recuperação da palavra-passe mestra em Utilizadores → «Recuperação do administrador».'); } } catch (_) { /* sem sessão */ } }, 1500);
  });
})();

/* =====================================================================
   V26 — CÓPIA DE SEGURANÇA COMPLETA E RESTAURO
   · A cópia leva TUDO o que existe na base: membros, registos, finanças, cultos, inventário,
     actividades, organigrama, secretaria, lixeira, utilizadores e permissões, definições e
     personalização (logótipo, listas, campos, gráficos, painéis, cores, abas próprias),
     registo de actividades, métodos de recuperação e — opcionalmente — os estados anteriores.
     Leva também as preferências deste navegador (tema claro/escuro e estado do menu).
   · Qualquer chave nova que versões futuras acrescentem à base entra automaticamente.
   · Verificação de integridade (SHA-256) e, se quiser, protecção com palavra-passe (AES-256-GCM).
   · O restauro mostra o que vai mudar, guarda o estado actual nos «Eventos» (para desfazer),
     grava, espera pela gravação e recarrega o sistema.
   · Aceita também as cópias antigas (Exportar cópia .json / Backup completo V10).
   ===================================================================== */
(function () {
  'use strict';
  const E = MMUI.esc;
  const FORMAT = 'monte-moria-backup';
  const VERSION = 26;
  const PREFS = ['monteMoriaTema_v14', 'monteMoriaMenu_v18'];
  const LAST = 'mm_v26_last_backup';
  const LABELS = {
    members: 'Membros', disciplina: 'Disciplina', visitantes: 'Visitantes', convertidos: 'Convertidos', financas: 'Finanças',
    financasCongregacoes: 'Finanças das congregações', cultos: 'Cultos', inventario: 'Inventário', atividades: 'Actividades',
    organigrama: 'Organigrama', secretaria: 'Secretaria', trash: 'Lixeira', users: 'Utilizadores e permissões',
    settings: 'Definições e personalização', dashboardConfig: 'Painel e gráficos', auditLog: 'Registo de actividades',
    eventSnapshots: 'Estados anteriores (Eventos)'
  };
  const ARRAYS = ['members', 'disciplina', 'visitantes', 'convertidos', 'financas', 'cultos', 'inventario', 'atividades', 'trash', 'users', 'auditLog', 'eventSnapshots'];
  const OBJECTS = ['settings', 'dashboardConfig', 'financasCongregacoes', 'organigrama', 'secretaria'];
  const SECURITY = ['adminPassword', 'adminPasswordHash', 'recovery', 'securitySchema'];
  const SETTINGS_LABELS = {
    branding: 'logótipo e identidade', customTabs: 'abas próprias', lists: 'listas', customLists: 'listas próprias', chartPrefs: 'gráficos',
    chartLook: 'aspecto dos gráficos', congregacoes: 'congregações', camposV14: 'campos', paineisV15: 'painéis', visual: 'cores e aspecto',
    financeLayout: 'finanças', recovery: 'recuperação da palavra-passe', associations: 'associações', universalEditor: 'editor', system: 'sistema'
  };

  const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  const count = (v) => (Array.isArray(v) ? v.length : isObj(v) ? Object.keys(v).length : v === undefined ? 0 : 1);
  const label = (k) => LABELS[k] || k;
  const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(2)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  const when = (iso) => { try { return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' }); } catch (_) { return String(iso || ''); } };
  const user = () => { try { const u = currentSessionUser(); return (u && (u.name || u.nome || u.username)) || 'admin'; } catch (_) { return 'admin'; } };
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (_) { /* privado / cheio */ } }
  };
  const subtle = () => (window.crypto && crypto.subtle ? crypto.subtle : null);
  const b64 = { to(buf) { let s = ''; new Uint8Array(buf).forEach((x) => { s += String.fromCharCode(x); }); return btoa(s); }, from(t) { const s = atob(t); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; } };
  async function sha256(text) {
    const c = subtle(); if (!c) return '';
    const h = await c.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  async function keyFrom(pw, salt) {
    const c = subtle(); const base = await c.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    return c.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 200000 }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encrypt(text, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, await keyFrom(pw, salt), new TextEncoder().encode(text));
    return { algoritmo: 'AES-256-GCM / PBKDF2-SHA256', iteracoes: 200000, salt: b64.to(salt), iv: b64.to(iv), dados: b64.to(ct) };
  }
  async function decrypt(c, pw) {
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: b64.from(c.iv) }, await keyFrom(pw, b64.from(c.salt)), b64.from(c.dados));
    return new TextDecoder().decode(pt);
  }

  /** Cópia profunda da base (sem funções nem referências partilhadas). */
  function snapshotDB(withSnaps) {
    const orig = DB.eventSnapshots;
    try {
      if (!withSnaps) DB.eventSnapshots = [];
      return JSON.parse(JSON.stringify(DB));
    } finally { DB.eventSnapshots = orig; }
  }
  function prefs() { const o = {}; PREFS.forEach((k) => { const v = ls.get(k); if (v !== null) o[k] = v; }); return o; }
  function counts(d) { const o = {}; Object.keys(d || {}).forEach((k) => { o[k] = count(d[k]); }); return o; }

  /* ------------------------------------------------------------- exportar */
  async function build({ snaps = false, password = '' } = {}) {
    const dados = snapshotDB(snaps);
    const text = JSON.stringify(dados);
    const out = {
      formato: FORMAT, versao: VERSION, sistema: 'Centro Monte Moriá — Sistema de Gestão de Membros',
      exportadoEm: new Date().toISOString(), exportadoPor: user(), origem: location.protocol === 'file:' ? 'ficheiro local' : location.host,
      inclui: { estadosAnteriores: !!snaps, preferencias: true, chaves: Object.keys(dados) },
      contagens: counts(dados), preferencias: prefs(),
      integridade: { algoritmo: 'SHA-256', valor: await sha256(text) }
    };
    if (password) { out.cifrado = await encrypt(text, password); } else out.dados = dados;
    return out;
  }
  async function download(opts = {}) {
    try {
      const out = await build(opts);
      const d = new Date(); const p = (n) => String(n).padStart(2, '0');
      const name = `backup_monte_moria_completo_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${opts.password ? '_protegido' : ''}.json`;
      const blob = new Blob([JSON.stringify(out, null, opts.password ? 0 : 1)], { type: 'application/json;charset=utf-8' });
      MMUI.download(name, blob);
      ls.set(LAST, out.exportadoEm);
      try { if (typeof logActivity === 'function') logActivity('Exportou cópia de segurança completa', 'Sistema', `${out.contagens.members || 0} membros · ${kb(blob.size)}${opts.snaps ? ' · com estados anteriores' : ''}${opts.password ? ' · protegida' : ''}`); } catch (_) { /* opcional */ }
      MMUI.toast(`Cópia de segurança completa exportada (${kb(blob.size)}).`);
      Card.refresh(); return out;
    } catch (e) { console.error(e); MMUI.toast(`Não foi possível exportar a cópia: ${e.message || e}`); return null; }
  }

  /* ------------------------------------------------------------- ler ficheiro */
  /** Interpreta o ficheiro e devolve { dados, prefs, full, meta, check }. Lança erro com mensagem clara. */
  async function parse(text, askPw) {
    let j; try { j = JSON.parse(String(text).replace(/^﻿/, '')); } catch (_) { throw new Error('O ficheiro não é um JSON válido (pode estar incompleto ou danificado).'); }
    if (!isObj(j)) throw new Error('O ficheiro não tem o formato de uma cópia de segurança.');
    if (j.formato === 'mm-congregacao-backup') throw new Error('Isto é uma cópia de segurança da aplicação da congregação. Restaure-a na aplicação da congregação ou envie à sede um «Pacote para o sistema».');
    if (j.formato === 'mm-congregacao-pacote' || j.formato === 'mm-membros-congregacao') throw new Error('Isto é um envio de uma congregação (não uma cópia da sede). Use «Compilar dados» ou «+ Base de Dados Extra».');
    let dados, full = true, check = 'sem verificação', meta = {}, pr = null;
    if (j.formato === FORMAT) {
      meta = { versao: j.versao, em: j.exportadoEm, por: j.exportadoPor, origem: j.origem, snaps: j.inclui && j.inclui.estadosAnteriores, cifrado: !!j.cifrado };
      let raw;
      if (j.cifrado) {
        if (!subtle()) throw new Error('Este navegador não consegue abrir cópias protegidas (abra o sistema no Chrome, Edge ou Safari recente).');
        const pw = await askPw(); if (pw === null) throw new Error('cancelado');
        try { raw = await decrypt(j.cifrado, pw); } catch (_) { throw new Error('Palavra-passe da cópia incorrecta.'); }
        dados = JSON.parse(raw);
      } else { dados = j.dados; raw = JSON.stringify(dados); }
      if (j.integridade && j.integridade.valor) {
        const h = await sha256(raw);
        check = !h ? 'não verificada (navegador sem SHA-256)' : h === j.integridade.valor ? 'ok' : 'FALHOU';
      }
      pr = isObj(j.preferencias) ? j.preferencias : null;
    } else if (j.version === 'V10' && Array.isArray(j.members)) {
      dados = {}; Object.keys(j).forEach((k) => { if (!['version', 'exportedAt', 'source'].includes(k)) dados[k] = j[k]; });
      full = false; meta = { versao: 'V10 (Backup completo antigo)', em: j.exportedAt };
    } else if (Array.isArray(j.members) && (isObj(j.settings) || Array.isArray(j.users))) {
      dados = j; meta = { versao: 'cópia antiga (.json)', em: '' };
    } else throw new Error('Este ficheiro não é uma cópia de segurança do Sistema de Gestão de Membros (falta a lista de membros).');
    validate(dados);
    return { dados, prefs: pr, full, meta, check };
  }
  function validate(d) {
    if (!isObj(d) || !Array.isArray(d.members)) throw new Error('A cópia não tem a lista de membros.');
    ARRAYS.forEach((k) => { if (d[k] !== undefined && d[k] !== null && !Array.isArray(d[k])) throw new Error(`«${label(k)}» está num formato inválido.`); });
    OBJECTS.forEach((k) => { if (d[k] !== undefined && d[k] !== null && !isObj(d[k])) throw new Error(`«${label(k)}» está num formato inválido.`); });
    const bad = d.members.findIndex((m) => !isObj(m)); if (bad >= 0) throw new Error(`O membro n.º ${bad + 1} está danificado.`);
  }

  /* ------------------------------------------------------------- restaurar */
  function settingsSummary(s) {
    if (!isObj(s)) return '';
    return Object.keys(SETTINGS_LABELS).filter((k) => s[k] !== undefined && count(s[k]) > 0).map((k) => SETTINGS_LABELS[k]).join(', ');
  }
  function preview(p) {
    const cur = counts(DB); const nw = counts(p.dados);
    const keys = [...new Set([...Object.keys(LABELS), ...Object.keys(nw)])].filter((k) => cur[k] !== undefined || nw[k] !== undefined);
    const rows = keys.map((k) => {
      const a = cur[k] || 0; const inFile = Object.prototype.hasOwnProperty.call(p.dados, k);
      const b = inFile ? nw[k] : null;
      const note = !inFile ? (p.full ? (k === 'eventSnapshots' ? 'não incluídos — ficam só os deste computador' : 'não existe na cópia') : 'não incluído na cópia antiga — mantém-se o actual') : (b !== a ? (b > a ? `+${b - a}` : `${b - a}`) : 'igual');
      return `<tr><th scope="row">${E(label(k))}</th><td>${a}</td><td>${b === null ? '—' : b}</td><td class="v26-note">${E(note)}</td></tr>`;
    }).join('');
    const m = p.meta; const chk = p.check === 'ok' ? '<span class="badge ok">Íntegra (SHA-256 confere)</span>' : p.check === 'FALHOU' ? '<span class="badge bad">A verificação falhou — o ficheiro foi alterado ou está danificado</span>' : `<span class="badge warn">${E(p.check)}</span>`;
    return `<dl class="v24-dl v26-meta">
        <div><dt>Cópia</dt><dd>${E(m.versao || '')}${m.cifrado ? ' · protegida por palavra-passe' : ''}</dd></div>
        <div><dt>Exportada em</dt><dd>${m.em ? E(when(m.em)) : '—'}${m.por ? ` por ${E(m.por)}` : ''}${m.origem ? ` (${E(m.origem)})` : ''}</dd></div>
        <div><dt>Integridade</dt><dd>${chk}</dd></div>
        <div><dt>Personalização incluída</dt><dd>${E(settingsSummary(p.dados.settings) || '—')}</dd></div>
      </dl>
      <div class="v26-tw"><table class="v26-t"><caption class="sr-only">Comparação entre os dados actuais e a cópia</caption>
        <thead><tr><th scope="col">Conteúdo</th><th scope="col">Neste computador</th><th scope="col">Na cópia</th><th scope="col">Diferença</th></tr></thead><tbody>${rows}</tbody></table></div>
      <fieldset class="v26-opts"><legend>Opções</legend>
        <label><input type="checkbox" data-o="prefs"${p.prefs ? ' checked' : ' disabled'}> <span>Repor também o tema (claro/escuro) e o estado do menu${p.prefs ? '' : ' (a cópia não os tem)'}</span></label>
        <label><input type="checkbox" data-o="keepsec"> <span>Manter a palavra-passe do administrador, os utilizadores e a recuperação <b>deste</b> computador</span></label>
        <label><input type="checkbox" data-o="keepsnaps"${Object.prototype.hasOwnProperty.call(p.dados, 'eventSnapshots') && count(p.dados.eventSnapshots) ? '' : ' checked'}> <span>Manter os estados anteriores (Eventos) deste computador</span></label>
      </fieldset>
      <p class="mm-help">Antes de substituir, o estado actual fica guardado em «Eventos» como «Antes de restaurar a cópia de segurança», para poder voltar atrás. Depois do restauro o sistema recarrega; se a palavra-passe do administrador da cópia for diferente, use a da cópia.</p>
      <p class="mm-err" role="alert"></p>`;
  }
  async function apply(p, o) {
    const now = new Date().toISOString();
    const curNoSnaps = snapshotDB(false); delete curNoSnaps.eventSnapshots;
    let next = p.full ? JSON.parse(JSON.stringify(p.dados)) : Object.assign(JSON.parse(JSON.stringify(curNoSnaps)), JSON.parse(JSON.stringify(p.dados)));
    // valores mínimos para o arranque
    ['trash', 'users', 'auditLog'].forEach((k) => { if (!Array.isArray(next[k])) next[k] = []; });
    if (!isObj(next.settings)) next.settings = {};
    if (!isObj(next.dashboardConfig)) next.dashboardConfig = { charts: {}, customCharts: [] };
    if (o.keepsec) {
      next.users = JSON.parse(JSON.stringify(DB.users || []));
      SECURITY.forEach((k) => { if (DB.settings && DB.settings[k] !== undefined) next.settings[k] = JSON.parse(JSON.stringify(DB.settings[k])); else delete next.settings[k]; });
    }
    const fileSnaps = Array.isArray(next.eventSnapshots) ? next.eventSnapshots.filter((s) => s && s.data) : [];
    const keep = o.keepsnaps || !fileSnaps.length ? (DB.eventSnapshots || []).filter((s) => s && s.data) : [];
    const seen = new Set(); const merged = [...fileSnaps, ...keep].filter((s) => (s.id && !seen.has(s.id) ? (seen.add(s.id), true) : false));
    merged.unshift({ id: `restauro-${Date.now()}`, ts: now, user: user(), label: 'Antes de restaurar a cópia de segurança', data: curNoSnaps });
    next.eventSnapshots = merged.slice(0, 80);
    next.auditLog.unshift({ ts: now, user: (() => { try { return actorName(); } catch (_) { return 'admin'; } })(), action: 'Restaurou cópia de segurança completa', entity: 'Sistema', summary: `${(next.members || []).length} membros · cópia de ${p.meta.em ? when(p.meta.em) : 'data desconhecida'}` });
    // grava (sem passar pelos registos de alteração) e espera
    DB = next; // eslint-disable-line no-global-assign
    MMStoreX.save(DB);
    if (o.prefs && p.prefs) PREFS.forEach((k) => ls.set(k, Object.prototype.hasOwnProperty.call(p.prefs, k) ? p.prefs[k] : null));
    await MMStoreX.flush();
    if (MMStoreX.lastError) throw new Error(MMStoreX.lastError);
    try { sessionStorage.setItem('mm_v26_restored', now); } catch (_) { /* privado */ }
    location.reload();
  }
  function askPassword() {
    return new Promise((res) => {
      const m = MMUI.modal({ title: 'Cópia protegida', size: 'narrow', body: '<label for="v26-pw">Palavra-passe da cópia de segurança</label><input type="password" id="v26-pw" autocomplete="off" autofocus>', foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Abrir</button>' });
      m.el.closest('.mm-modal-bg').classList.add('v25-top'); let done = false;
      const ok = () => { done = true; const v = m.el.querySelector('#v26-pw').value; m.close(); res(v); };
      m.el.querySelector('[data-ok]').addEventListener('click', ok);
      m.el.querySelector('#v26-pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
      m.el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { if (!done) res(null); }));
    });
  }
  async function restoreFile(file) {
    if (!file) return;
    if (file.size > 400 * 1048576) { MMUI.toast('Ficheiro demasiado grande para uma cópia de segurança.'); return; }
    let p;
    try { p = await parse(await file.text(), askPassword); } catch (e) { if (e.message !== 'cancelado') MMUI.toast(e.message); return; }
    const m = MMUI.modal({ title: `Restaurar cópia de segurança — ${file.name}`, size: 'wide', body: preview(p), foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn danger sm" data-ok>Substituir tudo e restaurar</button>' });
    m.el.closest('.mm-modal-bg').classList.add('v25-top');
    const err = m.el.querySelector('.mm-err');
    m.el.querySelector('[data-ok]').addEventListener('click', async (ev) => {
      if (p.check === 'FALHOU' && !(await MMUI.confirm('A verificação de integridade falhou: o ficheiro foi alterado depois de exportado ou está danificado. Restaurar mesmo assim?', 'Restaurar mesmo assim'))) return;
      const o = {}; m.el.querySelectorAll('[data-o]').forEach((c) => { o[c.dataset.o] = c.checked; });
      ev.target.disabled = true; ev.target.textContent = 'A restaurar…'; err.textContent = '';
      try { await apply(p, o); } catch (e) { console.error(e); err.textContent = `Não foi possível restaurar: ${e.message || e}`; ev.target.disabled = false; ev.target.textContent = 'Substituir tudo e restaurar'; }
    });
  }
  /** Restaurar pede sempre a palavra-passe; exportar basta estar com sessão de administrador/edição. */
  function admin(msg, fn) { if (typeof requirePassword === 'function') return requirePassword('admin', msg, fn); return fn(); }
  function allowed(msg, fn) { if (typeof requireAdminAction === 'function') return requireAdminAction('admin', msg, fn); return admin(msg, fn); }
  function pickAndRestore() {
    admin('Restaurar uma cópia substitui TODOS os dados actuais. Introduza a palavra-passe de administrador para continuar.', () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.hidden = true; document.body.appendChild(inp);
      inp.addEventListener('change', () => { const f = inp.files[0]; inp.remove(); restoreFile(f); });
      inp.click();
    });
  }

  /* ------------------------------------------------------------- janela de exportação */
  function sizes() {
    let main = 0, snaps = 0;
    try { main = MMStoreX.size(); snaps = MMStoreX.snapSize(); } catch (_) { /* aproximado */ }
    return { main, snaps };
  }
  function dialog() {
    const s = sizes(); const n = (DB.eventSnapshots || []).length; const last = ls.get(LAST);
    const m = MMUI.modal({ title: 'Cópia de segurança completa', size: 'narrow', body: `
      <p>A cópia leva <b>todos os dados e toda a personalização</b>: membros e fichas, registos, finanças, cultos, inventário, actividades, organigrama, secretaria, lixeira, utilizadores e permissões, logótipo, listas, campos, gráficos, painéis, cores, abas próprias, registo de actividades e métodos de recuperação, mais o tema e o menu deste navegador.</p>
      <p class="mm-help">Tamanho aproximado: ${kb(s.main)}${n ? ` · estados anteriores: ${n} (${kb(s.snaps)})` : ''}. Última cópia neste navegador: ${last ? E(when(last)) : 'nenhuma'}.</p>
      <fieldset class="v26-opts"><legend>Opções</legend>
        <label><input type="checkbox" data-x="snaps"${n ? '' : ' disabled'}> <span>Incluir os ${n} estados anteriores (aba Eventos)${n ? ` — mais ${kb(s.snaps)}` : ''}</span></label>
        <label><input type="checkbox" data-x="pw"${subtle() ? '' : ' disabled'}> <span>Proteger a cópia com uma palavra-passe</span></label>
        <div class="v26-pw" hidden><label for="v26-p1">Palavra-passe da cópia (mín. 8)</label><input type="password" id="v26-p1" autocomplete="new-password">
          <label for="v26-p2">Repetir</label><input type="password" id="v26-p2" autocomplete="new-password">
          <p class="mm-help">Sem esta palavra-passe não é possível abrir a cópia. Guarde-a num local seguro.</p></div>
      </fieldset>
      <p class="mm-help">A cópia contém dados pessoais e os códigos (cifrados) das palavras-passe: guarde-a num local seguro e não a publique.</p>
      <p class="mm-err" role="alert"></p>`,
    foot: '<button type="button" class="btn ghost sm" data-restore>Restaurar uma cópia…</button><button type="button" class="btn gold sm" data-ok>Exportar cópia completa</button>' });
    const pwc = m.el.querySelector('[data-x="pw"]'); const box = m.el.querySelector('.v26-pw'); const err = m.el.querySelector('.mm-err');
    pwc.addEventListener('change', () => { box.hidden = !pwc.checked; if (pwc.checked) m.el.querySelector('#v26-p1').focus(); });
    m.el.querySelector('[data-restore]').addEventListener('click', () => { m.close(); pickAndRestore(); });
    m.el.querySelector('[data-ok]').addEventListener('click', async (ev) => {
      let password = '';
      if (pwc.checked) {
        const a = m.el.querySelector('#v26-p1').value; const b = m.el.querySelector('#v26-p2').value;
        if (a.length < 8) { err.textContent = 'A palavra-passe da cópia deve ter pelo menos 8 caracteres.'; return; }
        if (a !== b) { err.textContent = 'As palavras-passe não coincidem.'; return; }
        password = a;
      }
      ev.target.disabled = true;
      const out = await download({ snaps: m.el.querySelector('[data-x="snaps"]').checked, password });
      ev.target.disabled = false; if (out) m.close();
    });
  }

  /* ------------------------------------------------------------- cartão em «Aparência» */
  const Card = {
    ensure() {
      const sec = document.getElementById('sec-aparencia'); if (!sec) return;
      let box = document.getElementById('v26-backup');
      if (!box) {
        box = document.createElement('div'); box.id = 'v26-backup'; box.className = 'card v26-card'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Cópia de segurança completa');
        const ref = document.getElementById('v24-store'); if (ref) ref.after(box); else { const top = sec.querySelector('.topbar'); if (top) top.after(box); else sec.prepend(box); }
      }
      const last = ls.get(LAST); const days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
      const tone = days === null || days > 7 ? 'warn' : 'ok';
      box.innerHTML = `<h3 class="v24-h">Cópia de segurança completa</h3>
        <p class="sub">Um único ficheiro com todos os dados e toda a personalização. Serve para guardar, para passar o sistema para outro computador e para recuperar depois de um problema.</p>
        <p><span class="badge ${tone}">${last ? `Última cópia: ${E(when(last))}${days !== null ? ` (há ${days} dia${days === 1 ? '' : 's'})` : ''}` : 'Ainda não foi feita nenhuma cópia neste navegador'}</span></p>
        <div class="v24-actions"><button type="button" class="btn gold sm" data-v26="export">Exportar cópia completa…</button><button type="button" class="btn ghost sm" data-v26="restore">Restaurar cópia…</button></div>`;
    },
    refresh() { if (document.getElementById('v26-backup')) Card.ensure(); }
  };

  /* ------------------------------------------------------------- ligações */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-v26]'); if (b) { if (b.dataset.v26 === 'export') allowed('A cópia de segurança contém todos os dados pessoais. Introduza a palavra-passe de administrador.', dialog); else pickAndRestore(); return; }
    if (e.target.closest('#nav button[data-tab="aparencia"]')) setTimeout(Card.ensure, 120);
  });
  if (window.MMStorePanel) { const ens = MMStorePanel.ensure; MMStorePanel.ensure = function () { const r = ens.apply(this, arguments); Card.ensure(); return r; }; }
  setTimeout(Card.ensure, 500);
  // aviso depois de um restauro
  try { const r = sessionStorage.getItem('mm_v26_restored'); if (r) { sessionStorage.removeItem('mm_v26_restored'); setTimeout(() => MMUI.toast(`Cópia de segurança restaurada (${DB.members.length} membros). O estado anterior ficou em «Eventos».`), 1400); } } catch (_) { /* privado */ }

  window.MMBackup = { build, download, dialog, open() { allowed('A cópia de segurança contém todos os dados pessoais. Introduza a palavra-passe de administrador.', dialog); }, parse, restoreFile, pickAndRestore, apply, FORMAT, VERSION,
    /** Ligado ao campo «Importar backup (substituir)» da Base de Dados. */
    fromInput(e) { const f = e && e.target && e.target.files && e.target.files[0]; if (e && e.target) e.target.value = ''; if (!f) return; admin('Restaurar uma cópia substitui TODOS os dados actuais. Introduza a palavra-passe de administrador para continuar.', () => restoreFile(f)); }
  };
})();
