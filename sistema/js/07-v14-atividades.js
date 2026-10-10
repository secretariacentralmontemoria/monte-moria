/* =====================================================================
   V14 — REGISTO DE ACTIVIDADES PERSONALIZÁVEL (modelo DPDORE)
   Substitui a apresentação da aba «Atividades» mantendo os registos existentes
   (DB.atividades: nome, departamento, dataProgramada, dataRealizacao, estado, observacoes)
   e acrescenta: tipo, responsável, local, hora, participantes, orçamento, campos adicionais
   definidos pelo administrador, filtros, colunas à escolha, ordenação, indicadores,
   gráficos (com as definições V14), importação e exportação Excel/CSV.
   ===================================================================== */

/* ---------- Campos adicionais genéricos (usados também no Organigrama) ---------- */
const MM_FIELD_TYPES = [['text', 'Texto'], ['number', 'Número'], ['date', 'Data'], ['select', 'Lista de opções'], ['textarea', 'Texto longo'], ['checkbox', 'Sim / Não']];
const MMFields = {
  list(scope) { DB.settings.camposV14 = DB.settings.camposV14 || {}; return DB.settings.camposV14[scope] || []; },
  set(scope, list) { DB.settings.camposV14 = DB.settings.camposV14 || {}; DB.settings.camposV14[scope] = list; },
  /** HTML dos campos adicionais num formulário. */
  html(scope, rec, prefix) {
    const E = MMUI.esc;
    return MMFields.list(scope).map((f, i) => {
      const id = `${prefix}_cf${i}`; const v = rec ? rec[f.key] : ''; const req = f.required && f.type !== 'checkbox' ? ' required aria-required="true"' : '';
      const lab = `<label for="${id}">${E(f.label)}${f.required ? ' *' : ''}</label>`;
      if (f.type === 'checkbox') return `<div class="field"><label class="mm-check"><input id="${id}" type="checkbox" data-cf="${E(f.key)}"${v ? ' checked' : ''}> ${E(f.label)}</label></div>`;
      if (f.type === 'select') return `<div class="field">${lab}<select id="${id}" data-cf="${E(f.key)}"${req}><option value="">—</option>${(f.options || []).map((o) => `<option${o === v ? ' selected' : ''}>${E(o)}</option>`).join('')}</select></div>`;
      if (f.type === 'textarea') return `<div class="field mm-full">${lab}<textarea id="${id}" data-cf="${E(f.key)}" maxlength="2000"${req}>${E(v || '')}</textarea></div>`;
      return `<div class="field">${lab}<input id="${id}" type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" data-cf="${E(f.key)}" value="${E(v ?? '')}"${f.type === 'number' ? ' step="any"' : ' maxlength="200"'}${req}></div>`;
    }).join('');
  },
  /** Lê e valida; devolve {values} ou {err, el}. */
  read(scope, form) {
    const out = {};
    for (const f of MMFields.list(scope)) {
      const el = form.querySelector(`[data-cf="${CSS.escape(f.key)}"]`); if (!el) continue;
      if (f.type === 'checkbox') { out[f.key] = el.checked; continue; }
      const v = MMUI.clean(el.value, f.type === 'textarea' ? 2000 : 200);
      if (f.required && !v) return { err: `Preencha o campo «${f.label}».`, el };
      if (v && f.type === 'number' && !Number.isFinite(Number(v))) return { err: `«${f.label}»: número inválido.`, el };
      if (v && f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { err: `«${f.label}»: data inválida.`, el };
      if (v && f.type === 'select' && !(f.options || []).includes(v)) return { err: `«${f.label}»: valor fora da lista.`, el };
      out[f.key] = f.type === 'number' && v !== '' ? Number(v) : v;
    }
    return { values: out };
  },
  text(f, v) { return f.type === 'checkbox' ? (v ? 'Sim' : 'Não') : f.type === 'date' && v ? (typeof fmtDate === 'function' ? fmtDate(v) : v) : (v ?? ''); },
  /** Gestão dos campos (administrador): acrescentar, editar, ordenar, remover. */
  manage(scope, title, after) {
    if (!MMUI.isAdmin()) { MMUI.toast('Gerir campos adicionais exige sessão de administrador.'); return; }
    const E = MMUI.esc; const m = MMUI.modal({ title, size: 'wide', body: '', foot: '<button type="button" class="btn ghost sm" data-add>+ Campo</button><button type="button" class="btn gold sm" data-close>Concluir</button>' });
    const saved = () => { MMUI.save(`Campos adicionais: ${title}`); draw(); if (after) after(); };
    const draw = () => {
      const L = MMFields.list(scope);
      m.body.innerHTML = `<p class="mm-help">Os campos aparecem no formulário, na tabela (colunas) e nas exportações. Remover um campo não apaga os valores já registados.</p>
        ${L.length ? `<div class="tbl-scroll"><table class="data-table"><caption class="sr-only">${E(title)}</caption><thead><tr><th scope="col">Campo</th><th scope="col">Tipo</th><th scope="col">Opções</th><th scope="col">Obrigatório</th><th scope="col"><span class="sr-only">Acções</span></th></tr></thead>
        <tbody>${L.map((f, i) => `<tr><td>${E(f.label)}</td><td>${E((MM_FIELD_TYPES.find((t) => t[0] === f.type) || ['', f.type])[1])}</td><td>${E((f.options || []).join(', '))}</td><td>${f.required ? 'Sim' : 'Não'}</td>
          <td class="mm-actions"><button type="button" class="mmc-btn" data-up="${i}" aria-label="Subir ${E(f.label)}"${i ? '' : ' disabled'}>↑</button><button type="button" class="mmc-btn" data-down="${i}" aria-label="Descer ${E(f.label)}"${i < L.length - 1 ? '' : ' disabled'}>↓</button>
          <button type="button" class="mmc-btn" data-edit="${i}" aria-label="Editar ${E(f.label)}">✎</button><button type="button" class="mmc-btn mm-danger" data-del="${i}" aria-label="Remover ${E(f.label)}">✕</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="mm-help">Ainda não há campos adicionais.</p>'}`;
    };
    const edit = (idx) => {
      const L = MMFields.list(scope); const cur = idx >= 0 ? L[idx] : null;
      const f = MMUI.modal({ title: cur ? `Editar «${cur.label}»` : 'Novo campo', size: 'narrow',
        body: `<form class="mm-form" novalidate><div class="field"><label for="cfl">Nome do campo *</label><input id="cfl" name="label" maxlength="60" value="${E(cur?.label || '')}" required></div>
          <div class="field"><label for="cft">Tipo</label><select id="cft" name="type">${MM_FIELD_TYPES.map(([k, l]) => `<option value="${k}"${k === (cur?.type || 'text') ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="cfo">Opções (só para «Lista de opções», separadas por vírgula)</label><input id="cfo" name="options" value="${E((cur?.options || []).join(', '))}"></div>
          <label class="mm-check"><input type="checkbox" name="required"${cur?.required ? ' checked' : ''}> Obrigatório</label><p class="mm-err" role="alert"></p></form>`,
        foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
      const F = f.el.querySelector('form');
      f.el.querySelector('[data-ok]').addEventListener('click', () => {
        const err = F.querySelector('.mm-err'); const label = MMUI.clean(F.label.value, 60); const options = F.options.value.split(',').map((x) => MMUI.clean(x, 80)).filter(Boolean);
        if (!label) { err.textContent = 'Indique o nome do campo.'; F.label.setAttribute('aria-invalid', 'true'); return; }
        if (/[<>]/.test(label) || options.some((o) => /[<>]/.test(o))) { err.textContent = 'Os nomes não podem conter < ou >.'; return; }
        if (F.type.value === 'select' && !options.length) { err.textContent = 'Indique as opções da lista.'; return; }
        const key = cur?.key || `cf_${label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || Date.now()}`;
        if (!cur && L.some((x) => x.key === key || x.label.toLowerCase() === label.toLowerCase())) { err.textContent = 'Já existe um campo com esse nome.'; return; }
        const rec = { key, label, type: F.type.value, options, required: F.required.checked };
        MMFields.set(scope, cur ? L.map((x, i) => (i === idx ? rec : x)) : [...L, rec]); f.close(); saved();
      });
    };
    draw();
    m.el.querySelector('[data-add]').addEventListener('click', () => edit(-1));
    m.body.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return; const L = [...MMFields.list(scope)];
      if (b.dataset.up) { const i = +b.dataset.up; [L[i - 1], L[i]] = [L[i], L[i - 1]]; MMFields.set(scope, L); saved(); }
      else if (b.dataset.down) { const i = +b.dataset.down; [L[i + 1], L[i]] = [L[i], L[i + 1]]; MMFields.set(scope, L); saved(); }
      else if (b.dataset.edit) edit(+b.dataset.edit);
      else if (b.dataset.del && await MMUI.confirm(`Remover o campo «${L[+b.dataset.del].label}»? Os valores já registados mantêm-se.`, 'Remover')) { L.splice(+b.dataset.del, 1); MMFields.set(scope, L); saved(); }
    });
  }
};

/* ---------- Utilitários de datas e ficheiros ---------- */
const MMDate = {
  iso(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.toISOString().slice(0, 10); } // série do Excel
    const s = String(v).trim(); let r = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (r) return `${r[1]}-${r[2]}-${r[3]}`;
    r = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); if (r) return `${r[3]}-${r[2].padStart(2, '0')}-${r[1].padStart(2, '0')}`;
    return '';
  },
  fmt(v) { const s = MMDate.iso(v); return s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—'; },
  today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
};
const MMFile = {
  /** Lê Excel/CSV para uma lista de objectos (cabeçalho na 1.ª linha). */
  async rows(file) {
    if (!file) throw new Error('nenhum ficheiro escolhido');
    if (file.size > 15 * 1024 * 1024) throw new Error('ficheiro demasiado grande (máx. 15 MB)');
    if (typeof XLSX === 'undefined') throw new Error('biblioteca de Excel indisponível');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]]; return XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
  },
  pick() { return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.xlsx,.xls,.csv,.ods'; i.addEventListener('change', () => res(i.files[0] || null)); i.click(); }); },
  norm: (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(),
  xlsx(name, rows, sheet = 'Dados') { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheet.slice(0, 31)); XLSX.writeFile(wb, name); }
};

/* ---------- Registo de actividades ---------- */
const V14A = {
  charts: {},
  sort: { key: 'dataProgramada', dir: -1 },
  f: { q: '', estado: '', departamento: '', tipo: '', de: '', ate: '' },
  cfg() {
    DB.settings.atividadesV14 = DB.settings.atividadesV14 || {};
    const c = DB.settings.atividadesV14;
    c.estados = Array.isArray(c.estados) && c.estados.length ? c.estados : ['Programada', 'Em curso', 'Realizada', 'Adiada', 'Cancelada'];
    c.tipos = Array.isArray(c.tipos) && c.tipos.length ? c.tipos : ['Culto', 'Evangelização', 'Reunião', 'Formação', 'Conferência', 'Acção social', 'Visita', 'Retiro', 'Celebração', 'Outro'];
    c.ocultas = Array.isArray(c.ocultas) ? c.ocultas : ['hora', 'orcamento'];
    return c;
  },
  can() { return MMUI.canEditTab('atividades'); },
  /** Colunas: base + campos adicionais. */
  cols() {
    return [['nome', 'Actividade'], ['tipo', 'Tipo'], ['departamento', 'Departamento'], ['responsavel', 'Responsável'], ['local', 'Local'], ['dataProgramada', 'Data programada'], ['hora', 'Hora'],
      ['dataRealizacao', 'Data de realização'], ['estado', 'Estado'], ['participantes', 'Participantes'], ['orcamento', 'Orçamento (Kz)'], ['observacoes', 'Observações'],
      ...MMFields.list('atividades').map((f) => [f.key, f.label, f])];
  },
  departamentos() {
    const set = new Set(); try { listFor('departamento').forEach((d) => set.add(d)); } catch (_) { /* lista */ }
    (DB.organigrama?.departamentos || []).forEach((d) => set.add(d.nome)); (DB.atividades || []).forEach((a) => { if (a.departamento) set.add(a.departamento); });
    return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt'));
  },
  /** Garante identificador estável em registos antigos (sem alterar mais nada). */
  ensureIds() { let ch = false; (DB.atividades || []).forEach((a) => { if (!a.id) { a.id = typeof uid === 'function' ? uid() : `a${Math.random().toString(36).slice(2, 9)}`; ch = true; } }); if (ch && typeof saveDB === 'function') saveDB(); },
  filtered() {
    const f = V14A.f; const q = MMFile.norm(f.q);
    let L = (DB.atividades || []).filter((a) => (!f.estado || a.estado === f.estado) && (!f.departamento || a.departamento === f.departamento) && (!f.tipo || a.tipo === f.tipo)
      && (!f.de || (MMDate.iso(a.dataProgramada) || '') >= f.de) && (!f.ate || (MMDate.iso(a.dataProgramada) || '9999') <= f.ate)
      && (!q || MMFile.norm([a.nome, a.observacoes, a.local, a.responsavel, a.departamento, a.tipo].join(' ')).includes(q)));
    const { key, dir } = V14A.sort;
    L = L.slice().sort((x, y) => { const a = x[key] ?? '', b = y[key] ?? ''; return (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'pt', { numeric: true })) * dir; });
    return L;
  },
  cell(a, k, fd) {
    const E = MMUI.esc; const v = a[k];
    if (fd) return E(MMFields.text(fd, v));
    if (k === 'estado') return typeof ativEstadoBadge === 'function' ? ativEstadoBadge(v) : E(v || '—');
    if (k === 'dataProgramada' || k === 'dataRealizacao') return E(MMDate.fmt(v));
    if (k === 'orcamento') return v ? E(Number(v).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '—';
    if (k === 'nome') return `<b>${E(v || '—')}</b>`;
    return E(v === 0 ? '0' : (v || '—'));
  },
  /** Estrutura da aba (uma vez): mantém a barra superior e as ferramentas V10/V11. */
  mount() {
    const sec = document.getElementById('sec-atividades'); if (!sec) return null;
    let root = document.getElementById('v14-ativ'); if (root) return root;
    const top = sec.querySelector('.topbar');
    if (top) { const h = top.querySelector('h2'); if (h) h.textContent = 'Registo de Actividades'; const sub = top.querySelector('.sub'); if (sub) sub.textContent = 'Actividades programadas e realizadas, com campos personalizáveis, filtros e estatística';
      const old = document.getElementById('btn-add-ativ'); if (old) { const nb = old.cloneNode(true); nb.id = 'btn-add-ativ'; nb.textContent = '+ Nova actividade'; nb.dataset.v14a = 'new'; old.replaceWith(nb); } }
    ['ativ-kpi'].forEach((id) => document.getElementById(id)?.remove());
    [...sec.children].forEach((el) => { if (el !== top && !el.matches('.v10-tools, [class*="v10-"], [class*="v11-"], [id^="v10"], [id^="v11"], .v15-area')) el.remove(); });
    root = document.createElement('div'); root.id = 'v14-ativ'; sec.appendChild(root);
    root.innerHTML = `<div class="v14-toolbar" role="toolbar" aria-label="Acções do registo de actividades">
        <button type="button" class="btn ghost sm" data-v14a="import">Importar (Excel/CSV)</button><button type="button" class="btn ghost sm" data-v14a="xlsx">Exportar Excel</button><button type="button" class="btn ghost sm" data-v14a="csv">Exportar CSV</button>
        <button type="button" class="btn ghost sm" data-v14a="cols">Colunas…</button><button type="button" class="btn ghost sm" data-v14a="fields">Campos adicionais…</button><button type="button" class="btn ghost sm" data-v14a="lists">Tipos e estados…</button></div>
      <form class="v14-filters card" data-v14af role="search" aria-label="Filtrar actividades" novalidate>
        <div class="field"><label for="v14a_q">Pesquisar</label><input id="v14a_q" name="q" type="search" placeholder="Nome, local, responsável…"></div>
        <div class="field"><label for="v14a_e">Estado</label><select id="v14a_e" name="estado"></select></div>
        <div class="field"><label for="v14a_d">Departamento</label><select id="v14a_d" name="departamento"></select></div>
        <div class="field"><label for="v14a_t">Tipo</label><select id="v14a_t" name="tipo"></select></div>
        <div class="field"><label for="v14a_de">De</label><input id="v14a_de" name="de" type="date"></div>
        <div class="field"><label for="v14a_ate">Até</label><input id="v14a_ate" name="ate" type="date"></div>
        <div class="field v14-f-btn"><button type="button" class="btn ghost sm" data-v14a="clear">Limpar filtros</button></div></form>
      <div class="kpi-grid" id="v14a-kpi" aria-live="polite"></div>
      <div class="v14-charts">${[['chart-ativ-estado', 'Actividades por estado'], ['chart-ativ-depto', 'Actividades por departamento'], ['chart-ativ-mes', 'Programadas e realizadas por mês'], ['chart-ativ-tipo', 'Actividades por tipo']]
        .map(([id, t]) => `<div class="card"><h3 class="u-v14-h">${t}</h3><div class="chart-wrap"><canvas id="${id}"></canvas></div></div>`).join('')}</div>
      <div class="card"><div class="v14-table-head"><h3 class="u-v14-h">Actividades registadas</h3><span class="sub" id="v14a-count" aria-live="polite"></span></div><div class="tbl-scroll" id="v14a-table"></div></div>`;
    return root;
  },
  fillFilters(root) {
    const C = V14A.cfg(); const f = V14A.f; const E = MMUI.esc;
    const opts = (list, cur, all) => `<option value="">${all}</option>${list.map((x) => `<option${x === cur ? ' selected' : ''}>${E(x)}</option>`).join('')}`;
    const est = [...new Set([...C.estados, ...(DB.atividades || []).map((a) => a.estado).filter(Boolean)])];
    const tip = [...new Set([...C.tipos, ...(DB.atividades || []).map((a) => a.tipo).filter(Boolean)])];
    root.querySelector('[name=estado]').innerHTML = opts(est, f.estado, 'Todos');
    root.querySelector('[name=departamento]').innerHTML = opts(V14A.departamentos(), f.departamento, 'Todos');
    root.querySelector('[name=tipo]').innerHTML = opts(tip, f.tipo, 'Todos');
    ['q', 'de', 'ate'].forEach((k) => { const el = root.querySelector(`[name=${k}]`); if (el && el.value !== f[k]) el.value = f[k]; });
  },
  render() {
    try {
      V14A.ensureIds(); const root = V14A.mount(); if (!root) return; V14A.fillFilters(root);
      const L = V14A.filtered(); const E = MMUI.esc; const can = V14A.can();
      root.querySelectorAll('[data-v14a="import"], [data-v14a="fields"], [data-v14a="lists"]').forEach((b) => { b.disabled = !can || (b.dataset.v14a !== 'import' && !MMUI.isAdmin()); });
      const nb = document.getElementById('btn-add-ativ'); if (nb) nb.disabled = !can;
      const c = (s) => L.filter((a) => a.estado === s).length; const real = c('Realizada');
      const sumP = L.reduce((t, a) => t + (Number(a.participantes) || 0), 0); const sumO = L.reduce((t, a) => t + (Number(a.orcamento) || 0), 0);
      const k = (n, l, cls = '') => `<div class="kpi${cls ? ` ${cls}` : ''}"><div class="num">${E(n)}</div><div class="lbl">${E(l)}</div></div>`;
      document.getElementById('v14a-kpi').innerHTML = k(L.length, 'Actividades registadas') + k(c('Programada') + c('Em curso'), 'Programadas / em curso') + k(real, 'Realizadas')
        + k(c('Adiada') + c('Cancelada'), 'Adiadas / canceladas') + k(`${L.length ? Math.round((real / L.length) * 100) : 0}%`, 'Taxa de realização') + k(sumP.toLocaleString('pt-PT'), 'Participantes')
        + (sumO ? k(`${sumO.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} Kz`, 'Orçamento') : '');
      // tabela
      const C = V14A.cfg(); const cols = V14A.cols().filter(([key]) => !C.ocultas.includes(key));
      const th = cols.map(([key, lab]) => `<th scope="col" aria-sort="${V14A.sort.key === key ? (V14A.sort.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="v14-sort" data-sort="${E(key)}">${E(lab)}${V14A.sort.key === key ? (V14A.sort.dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`).join('');
      document.getElementById('v14a-table').innerHTML = `<table class="data-table v14-table"><caption class="sr-only">Registo de actividades</caption><thead><tr>${th}<th scope="col"><span class="sr-only">Acções</span></th></tr></thead>
        <tbody>${L.slice(0, 500).map((a) => `<tr>${cols.map(([key, , fd]) => `<td>${V14A.cell(a, key, fd)}</td>`).join('')}<td class="mm-actions">
          <button type="button" class="btn ghost sm" data-v14a="edit" data-id="${E(a.id)}" aria-label="Editar ${E(a.nome)}"${can ? '' : ' disabled'}>Editar</button>
          <button type="button" class="btn ghost sm" data-v14a="dup" data-id="${E(a.id)}" aria-label="Duplicar ${E(a.nome)}"${can ? '' : ' disabled'}>Duplicar</button>
          <button type="button" class="btn danger sm" data-v14a="del" data-id="${E(a.id)}" aria-label="Eliminar ${E(a.nome)}"${can ? '' : ' disabled'}>Eliminar</button></td></tr>`).join('')
          || `<tr><td colspan="${cols.length + 1}"><div class="empty">Nenhuma actividade com estes filtros.</div></td></tr>`}</tbody></table>`;
      document.getElementById('v14a-count').textContent = `${L.length} de ${(DB.atividades || []).length} actividades${L.length > 500 ? ' (mostradas as primeiras 500)' : ''}`;
      V14A.charts_(L);
    } catch (e) { console.error('Registo de actividades:', e); MMUI.toast(`Erro ao apresentar as actividades: ${e.message}`); }
  },
  count(L, key) { const m = {}; L.forEach((a) => { const v = a[key] || 'Não definido'; m[v] = (m[v] || 0) + 1; }); return m; },
  draw(id, cfg) { if (V14A.charts[id]) { try { V14A.charts[id].destroy(); } catch (_) { /* já destruído */ } } const c = document.getElementById(id); if (c) V14A.charts[id] = new Chart(c, cfg); },
  charts_(L) {
    const pal = MMCharts.palette(); const dl = (k, o) => (typeof dlConfig === 'function' ? dlConfig(k, o) : { display: false });
    const est = V14A.count(L, 'estado'); const dep = V14A.count(L.filter((a) => a.departamento), 'departamento'); const tip = V14A.count(L, 'tipo');
    V14A.draw('chart-ativ-estado', { type: 'doughnut', data: { labels: Object.keys(est), datasets: [{ data: Object.values(est), backgroundColor: Object.keys(est).map((_, i) => pal[(i + 2) % pal.length]) }] }, options: { plugins: { legend: { position: 'bottom' }, datalabels: dl('round') } } });
    V14A.draw('chart-ativ-depto', { type: 'bar', data: { labels: Object.keys(dep), datasets: [{ label: 'Actividades', data: Object.values(dep), backgroundColor: pal[0], borderRadius: 3 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, datalabels: dl('bar', { horizontal: true }) }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } });
    const months = []; const now = new Date(); for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
    const byM = (field, st) => months.map((mo) => L.filter((a) => (MMDate.iso(a[field]) || '').startsWith(mo) && (!st || a.estado === st)).length);
    V14A.draw('chart-ativ-mes', { type: 'bar', data: { labels: months.map((mo) => `${mo.slice(5)}/${mo.slice(2, 4)}`), datasets: [{ label: 'Programadas', data: byM('dataProgramada'), backgroundColor: pal[1], borderRadius: 3 }, { label: 'Realizadas', data: byM('dataRealizacao', 'Realizada'), backgroundColor: pal[2], borderRadius: 3 }] }, options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    V14A.draw('chart-ativ-tipo', { type: 'bar', data: { labels: Object.keys(tip), datasets: [{ label: 'Actividades', data: Object.values(tip), backgroundColor: pal[4], borderRadius: 3 }] }, options: { plugins: { legend: { display: false }, datalabels: dl('bar') }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
  },
  /** Formulário de actividade (nova, edição ou cópia). */
  form(rec, copy = false) {
    if (!V14A.can()) { MMUI.toast('Não tem permissão de edição nesta aba.'); return; }
    const E = MMUI.esc; const C = V14A.cfg(); const a = rec || { estado: 'Programada', dataProgramada: MMDate.today() };
    const est = [...new Set([...C.estados, a.estado].filter(Boolean))]; const tip = [...new Set([...C.tipos, a.tipo].filter(Boolean))];
    const names = (DB.members || []).map((m) => m.nome).filter(Boolean).slice(0, 3000);
    const m = MMUI.modal({ title: rec && !copy ? 'Editar actividade' : copy ? 'Duplicar actividade' : 'Nova actividade', size: 'wide',
      body: `<form class="mm-form" novalidate><div class="mm-grid">
        <div class="field mm-full"><label for="fa_n">Nome da actividade *</label><input id="fa_n" name="nome" maxlength="120" required aria-required="true" value="${E(a.nome || '')}"></div>
        <div class="field"><label for="fa_t">Tipo</label><select id="fa_t" name="tipo"><option value="">—</option>${tip.map((x) => `<option${x === a.tipo ? ' selected' : ''}>${E(x)}</option>`).join('')}</select></div>
        <div class="field"><label for="fa_d">Departamento</label><select id="fa_d" name="departamento"><option value="">—</option>${[...new Set([...V14A.departamentos(), a.departamento].filter(Boolean))].map((x) => `<option${x === a.departamento ? ' selected' : ''}>${E(x)}</option>`).join('')}</select></div>
        <div class="field"><label for="fa_r">Responsável</label><input id="fa_r" name="responsavel" list="fa_rl" maxlength="120" value="${E(a.responsavel || '')}" autocomplete="off"><datalist id="fa_rl">${names.map((n) => `<option value="${E(n)}">`).join('')}</datalist></div>
        <div class="field"><label for="fa_l">Local</label><input id="fa_l" name="local" maxlength="120" value="${E(a.local || '')}"></div>
        <div class="field"><label for="fa_dp">Data programada *</label><input id="fa_dp" name="dataProgramada" type="date" required aria-required="true" value="${E(MMDate.iso(a.dataProgramada))}"></div>
        <div class="field"><label for="fa_h">Hora</label><input id="fa_h" name="hora" type="time" value="${E(a.hora || '')}"></div>
        <div class="field"><label for="fa_e">Estado *</label><select id="fa_e" name="estado" required>${est.map((x) => `<option${x === a.estado ? ' selected' : ''}>${E(x)}</option>`).join('')}</select></div>
        <div class="field"><label for="fa_dr">Data de realização</label><input id="fa_dr" name="dataRealizacao" type="date" value="${E(copy ? '' : MMDate.iso(a.dataRealizacao))}"></div>
        <div class="field"><label for="fa_p">Participantes</label><input id="fa_p" name="participantes" type="number" min="0" step="1" value="${E(a.participantes ?? '')}"></div>
        <div class="field"><label for="fa_o">Orçamento (Kz)</label><input id="fa_o" name="orcamento" type="number" min="0" step="0.01" value="${E(a.orcamento ?? '')}"></div>
        <div class="field mm-full"><label for="fa_obs">Observações</label><textarea id="fa_obs" name="observacoes" maxlength="1000">${E(a.observacoes || '')}</textarea></div>
        ${MMFields.html('atividades', a, 'fa')}</div><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar actividade</button>' });
    const F = m.el.querySelector('form'); const err = F.querySelector('.mm-err');
    const bad = (el, msg) => { F.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid')); if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); } err.textContent = msg; };
    F.estado.addEventListener('change', () => { if (F.estado.value === 'Realizada' && !F.dataRealizacao.value) F.dataRealizacao.value = MMDate.today(); });
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      try {
        const v = (n) => MMUI.clean(F[n].value, n === 'observacoes' ? 1000 : 120);
        const nome = v('nome'); if (nome.length < 2) return bad(F.nome, 'Indique o nome da actividade (mínimo 2 caracteres).');
        const dp = F.dataProgramada.value; if (!/^\d{4}-\d{2}-\d{2}$/.test(dp)) return bad(F.dataProgramada, 'Indique uma data programada válida.');
        const dr = F.dataRealizacao.value; if (dr && !/^\d{4}-\d{2}-\d{2}$/.test(dr)) return bad(F.dataRealizacao, 'Data de realização inválida.');
        if (F.estado.value === 'Realizada' && !dr) return bad(F.dataRealizacao, 'Uma actividade realizada precisa da data de realização.');
        if (F.hora.value && !/^\d{2}:\d{2}$/.test(F.hora.value)) return bad(F.hora, 'Hora inválida.');
        const pt = F.participantes.value; if (pt !== '' && !(Number.isInteger(Number(pt)) && Number(pt) >= 0)) return bad(F.participantes, 'Participantes: número inteiro igual ou superior a 0.');
        const or = F.orcamento.value; if (or !== '' && !(Number(or) >= 0)) return bad(F.orcamento, 'Orçamento: valor igual ou superior a 0.');
        const cf = MMFields.read('atividades', F); if (cf.err) return bad(cf.el, cf.err);
        const data = { ...cf.values, nome, tipo: v('tipo'), departamento: v('departamento'), responsavel: v('responsavel'), local: v('local'), dataProgramada: dp, hora: F.hora.value, estado: v('estado'),
          dataRealizacao: dr || null, participantes: pt === '' ? null : Number(pt), orcamento: or === '' ? null : Math.round(Number(or) * 100) / 100, observacoes: v('observacoes') || null };
        const who = typeof actorName === 'function' ? actorName() : ''; const when = new Date().toISOString();
        if (rec && !copy) { Object.assign(rec, data, { alteradoEm: when, alteradoPor: who }); if (typeof logActivity === 'function') logActivity('Editou', 'Atividade', nome); }
        else { DB.atividades.push({ id: typeof uid === 'function' ? uid() : String(Date.now()), ...data, criadoEm: when, criadoPor: who }); if (typeof logActivity === 'function') logActivity('Registou', 'Atividade', nome); }
        MMUI.save(); m.close(); V14A.render(); MMUI.toast('Actividade guardada.');
      } catch (e) { bad(null, `Não foi possível guardar: ${e.message}`); }
    });
  },
  exportRows() {
    const cols = V14A.cols();
    return V14A.filtered().map((a) => Object.fromEntries(cols.map(([k, l, fd]) => [l, fd ? MMFields.text(fd, a[k]) : (k.startsWith('data') ? MMDate.fmt(a[k]).replace('—', '') : (a[k] ?? ''))])));
  },
  async importFile() {
    if (!V14A.can()) { MMUI.toast('Não tem permissão de edição nesta aba.'); return; }
    try {
      const file = await MMFile.pick(); if (!file) return; const rows = await MMFile.rows(file);
      const cols = V14A.cols(); const alias = { nome: ['nome', 'actividade', 'atividade', 'nome da atividade', 'nome da actividade'], dataProgramada: ['data programada', 'data', 'data prevista'], dataRealizacao: ['data de realizacao', 'data realizacao'], observacoes: ['obs', 'observacoes'], orcamento: ['orcamento', 'orcamento kz', 'custo'], responsavel: ['responsavel'], participantes: ['participantes'] };
      const map = (row) => { const out = {}; Object.entries(row).forEach(([h, v]) => { const n = MMFile.norm(h); const c = cols.find(([k, l]) => MMFile.norm(l) === n || MMFile.norm(k) === n || (alias[k] || []).includes(n)); if (c) out[c[0]] = v; }); return out; };
      let add = 0, upd = 0, skip = 0;
      rows.forEach((r) => {
        const x = map(r); const nome = MMUI.clean(x.nome, 120); const dp = MMDate.iso(x.dataProgramada); if (!nome || !dp) { skip++; return; }
        const rec = { nome, dataProgramada: dp, dataRealizacao: MMDate.iso(x.dataRealizacao) || null, estado: MMUI.clean(x.estado, 40) || (x.dataRealizacao ? 'Realizada' : 'Programada'), tipo: MMUI.clean(x.tipo, 60), departamento: MMUI.clean(x.departamento, 80),
          responsavel: MMUI.clean(x.responsavel, 120), local: MMUI.clean(x.local, 120), hora: /^\d{1,2}:\d{2}$/.test(String(x.hora || '').trim()) ? String(x.hora).trim().padStart(5, '0') : '', participantes: x.participantes === '' || x.participantes === undefined ? null : Math.max(0, Math.round(Number(x.participantes)) || 0),
          orcamento: x.orcamento === '' || x.orcamento === undefined ? null : Math.max(0, Number(String(x.orcamento).replace(/\s/g, '').replace(',', '.')) || 0), observacoes: MMUI.clean(x.observacoes, 1000) || null };
        MMFields.list('atividades').forEach((f) => { if (x[f.key] !== undefined) rec[f.key] = f.type === 'checkbox' ? /^(sim|s|1|true|x)$/i.test(String(x[f.key])) : f.type === 'date' ? MMDate.iso(x[f.key]) : MMUI.clean(x[f.key], 200); });
        const cur = DB.atividades.find((a) => MMFile.norm(a.nome) === MMFile.norm(nome) && MMDate.iso(a.dataProgramada) === dp);
        if (cur) { Object.assign(cur, Object.fromEntries(Object.entries(rec).filter(([, v]) => v !== '' && v !== null))); upd++; } else { DB.atividades.push({ id: typeof uid === 'function' ? uid() : String(Date.now() + add), ...rec }); add++; }
      });
      if (typeof logActivity === 'function') logActivity('Importou', 'Atividades', `${add} novas, ${upd} actualizadas`);
      MMUI.save(); V14A.render(); MMUI.toast(`Importação concluída: ${add} novas, ${upd} actualizadas${skip ? `, ${skip} linhas ignoradas (sem nome ou data)` : ''}.`);
    } catch (e) { MMUI.toast(`Importação falhou: ${e.message}`); }
  },
  columns() {
    const C = V14A.cfg(); const E = MMUI.esc;
    const m = MMUI.modal({ title: 'Colunas da tabela', size: 'narrow', body: `<div class="mm-checks">${V14A.cols().map(([k, l]) => `<label class="mm-check"><input type="checkbox" data-col="${E(k)}"${C.ocultas.includes(k) ? '' : ' checked'}${k === 'nome' ? ' disabled' : ''}> ${E(l)}</label>`).join('')}</div>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Aplicar</button>' });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { C.ocultas = [...m.el.querySelectorAll('[data-col]')].filter((x) => !x.checked).map((x) => x.dataset.col); MMUI.save(); m.close(); V14A.render(); });
  },
  lists() {
    if (!MMUI.isAdmin()) { MMUI.toast('Exige sessão de administrador.'); return; }
    const C = V14A.cfg(); const E = MMUI.esc;
    const m = MMUI.modal({ title: 'Tipos e estados das actividades', size: 'narrow', body: `<form class="mm-form" novalidate><div class="field"><label for="tl_t">Tipos (um por linha)</label><textarea id="tl_t" name="tipos" rows="8">${E(C.tipos.join('\n'))}</textarea></div>
      <div class="field"><label for="tl_e">Estados (um por linha)</label><textarea id="tl_e" name="estados" rows="6">${E(C.estados.join('\n'))}</textarea></div><p class="mm-help">«Realizada», «Adiada» e «Cancelada» alimentam os indicadores.</p><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    const F = m.el.querySelector('form');
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      const sp = (t) => [...new Set(t.split('\n').map((x) => MMUI.clean(x, 60)).filter(Boolean))];
      const tipos = sp(F.tipos.value); const estados = sp(F.estados.value);
      if (!tipos.length || !estados.length) { F.querySelector('.mm-err').textContent = 'Indique pelo menos um tipo e um estado.'; return; }
      if ([...tipos, ...estados].some((x) => /[<>]/.test(x))) { F.querySelector('.mm-err').textContent = 'Os nomes não podem conter < ou >.'; return; }
      C.tipos = tipos; C.estados = estados; MMUI.save('Tipos e estados das actividades'); m.close(); V14A.render();
    });
  }
};

/* Eventos da aba (delegados) */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-v14a]'); if (!b || b.disabled) return;
  const act = b.dataset.v14a; const rec = b.dataset.id ? DB.atividades.find((a) => a.id === b.dataset.id) : null;
  if (act === 'new') V14A.form(null);
  else if (act === 'edit' && rec) V14A.form(rec);
  else if (act === 'dup' && rec) V14A.form({ ...rec, nome: `${rec.nome} (cópia)`, estado: 'Programada' }, true);
  else if (act === 'del' && rec) {
    const run = () => { const i = DB.atividades.indexOf(rec); if (i < 0) return; if (typeof moveToTrash === 'function') moveToTrash('atividade', rec, rec.nome); if (typeof logActivity === 'function') logActivity('Eliminou', 'Atividade', rec.nome); DB.atividades.splice(i, 1); MMUI.save(); V14A.render(); MMUI.toast('Actividade eliminada (movida para a Lixeira).'); };
    const ask = () => MMUI.confirm(`Eliminar a actividade «${rec.nome}»? Poderá recuperá-la na Lixeira.`, 'Eliminar').then((ok) => { if (ok) run(); });
    if (typeof requirePassword === 'function') requirePassword('admin', 'Introduza a palavra-passe para eliminar esta actividade.', ask); else ask();
  } else if (act === 'import') V14A.importFile();
  else if (act === 'xlsx') { try { MMFile.xlsx(`Actividades_${MMDate.today()}.xlsx`, V14A.exportRows(), 'Actividades'); } catch (err) { MMUI.toast(`Exportação falhou: ${err.message}`); } }
  else if (act === 'csv') { const rows = V14A.exportRows(); const cols = V14A.cols().map((c) => c[1]); MMUI.download(`Actividades_${MMDate.today()}.csv`, new Blob([MMUI.csv(rows, cols)], { type: 'text/csv;charset=utf-8' })); }
  else if (act === 'cols') V14A.columns();
  else if (act === 'fields') MMFields.manage('atividades', 'Campos adicionais das actividades', () => V14A.render());
  else if (act === 'lists') V14A.lists();
  else if (act === 'clear') { V14A.f = { q: '', estado: '', departamento: '', tipo: '', de: '', ate: '' }; document.querySelector('[data-v14af]')?.reset(); V14A.render(); }
});
document.addEventListener('click', (e) => { const s = e.target.closest('#v14a-table [data-sort]'); if (!s) return; const k = s.dataset.sort; V14A.sort = { key: k, dir: V14A.sort.key === k ? -V14A.sort.dir : 1 }; V14A.render(); document.querySelector(`#v14a-table [data-sort="${CSS.escape(k)}"]`)?.focus(); });
document.addEventListener('input', (e) => { const f = e.target.closest('[data-v14af]'); if (!f || !e.target.name) return; V14A.f[e.target.name] = e.target.value; clearTimeout(V14A._t); V14A._t = setTimeout(() => { V14A.render(); const el = document.querySelector(`[data-v14af] [name="${e.target.name}"]`); if (el && document.activeElement !== el) el.focus(); }, e.target.type === 'search' ? 250 : 0); });
MMCharts.hooks = [...(MMCharts.hooks || []), (old, neu, id) => { if (V14A.charts[id] === old) V14A.charts[id] = neu; }];
/* A aba passa a usar o novo registo (a função global é chamada pelo menu e por outras camadas) */
(() => { const install = () => { window.renderAtividades = () => V14A.render(); if (document.getElementById('sec-atividades')?.classList.contains('active')) V14A.render(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install(); })();
