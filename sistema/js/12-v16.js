/* =====================================================================
   V16 — FILTROS PELOS TÍTULOS EM TODAS AS TABELAS · LISTAS NOS FORMULÁRIOS · CAMPOS DA ESTATÍSTICA DO CULTO
         FICHA INDIVIDUAL PERSONALIZÁVEL · ORDEM DOS GRÁFICOS (PAINEL E RELATÓRIOS)
   Nenhum dado existente é alterado: as personalizações ficam em DB.settings (fichaV16, chartOrderV16, camposV14.cultos, lists).
   ===================================================================== */
const V16 = (() => {
  'use strict';
  const E = MMUI.esc; const N = (s) => MMFile.norm(s);
  const num = (s) => { const t = String(s).replace(/[\s\u00a0]/g, '').replace(/[^\d,.\-]/g, ''); if (!/\d/.test(t)) return NaN; const v = Number(/,\d{1,2}$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')); return v; };
  const dkey = (s) => { const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}${m[2]}${m[1]}` : null; };
  const cmp = (a, b) => { const da = dkey(a), db = dkey(b); if (da && db) return da.localeCompare(db); const x = num(a), y = num(b); if (Number.isFinite(x) && Number.isFinite(y) && /^[\d\s.,\-]+$/.test(String(a).trim() + String(b).trim())) return x - y; if (a === '—') return 1; if (b === '—') return -1; return String(a).localeCompare(String(b), 'pt', { numeric: true }); };

  /* ---------- 1) Filtros e ordenação pelos títulos das colunas (todas as tabelas, todas as sub-abas) ---------- */
  const ST = {}; let MEM = {}; // estado por tabela (sessão) e filtros da Base de Dados (lista completa, não só a página)
  const MCOL = { nome: 'nome', genero: 'genero', idade: 'idade', cargo: 'cargo', departamento: 'departamento', situacao: 'situacao', contacto: 'tel' };
  const isMembers = (t) => !!t.closest('#sec-database') && !!t.querySelector('#tbl-members, tbody#tbl-members') || t.id === 'tbl-members';
  const headCells = (t) => [...(t.tHead ? t.tHead.rows[t.tHead.rows.length - 1].cells : [])];
  const isAct = (x) => !x || /^(a[cç]{1,2}[õo]es|sel\.?|#)$/i.test(x.trim());
  const keyOf = (t) => `${t.closest('.section')?.id || 'x'}|${t.id || ''}|${headCells(t).map((th) => th.dataset.v16h || '').join('|')}`;
  const cell = (r, i) => (r.cells[i] ? r.cells[i].textContent.replace(/\s+/g, ' ').trim() : '');
  const bodyRows = (t) => [...(t.tBodies[0] ? t.tBodies[0].rows : [])].filter((r) => r.cells.length > 1);
  const decorate = (t) => {
    if (t.closest('.modal, .mm-modal, .mm-modal-bg') || !t.tHead) return;
    headCells(t).forEach((th, i) => {
      if (th.dataset.v16h !== undefined) return;
      const txt = th.textContent.replace(/[▲▼▾]/g, '').trim(); th.dataset.v16h = txt;
      if (isAct(txt) || th.querySelector('input, select')) return;
      th.classList.add('v16-th'); const b = document.createElement('button'); b.type = 'button'; b.className = 'v16-thf'; b.dataset.col = String(i);
      b.setAttribute('aria-label', `Filtrar ou ordenar a coluna ${txt}`); b.title = 'Filtrar / ordenar'; b.textContent = '▾'; th.appendChild(b);
    });
    t.dataset.v16k = keyOf(t); apply(t);
  };
  const apply = (t) => {
    const k = t.dataset.v16k; const S = isMembers(t) ? { f: MEM } : ST[k]; const ths = headCells(t);
    ths.forEach((th, i) => { const field = MCOL[N(th.dataset.v16h || '')]; const on = !!(S && S.f && (S.f[i] || (isMembers(t) && field && S.f[field]))); th.classList.toggle('v16-on', on); });
    if (isMembers(t)) return; // a Base de Dados filtra a lista completa antes da paginação (dbFilter)
    const rows = bodyRows(t); let shown = rows.length;
    if (S) {
      rows.forEach((r) => { const ok = Object.entries(S.f || {}).every(([c, f]) => { const v = cell(r, +c); return (!f.txt || N(v).includes(N(f.txt))) && (!f.vals || f.vals.includes(v)); }); r.classList.toggle('v16-hide', !ok); if (!ok) shown--; });
      if (S.sort && t.tBodies[0]) { const { col, dir } = S.sort; rows.slice().sort((a, b) => cmp(cell(a, col), cell(b, col)) * dir).forEach((r) => t.tBodies[0].appendChild(r)); ths.forEach((th, i) => { if (!isAct(th.dataset.v16h)) th.setAttribute('aria-sort', i === col ? (dir > 0 ? 'ascending' : 'descending') : 'none'); }); }
    }
    const host = t.closest('.tbl-scroll, .table-wrap') || t; let bar = host.previousElementSibling;
    const active = S && (Object.keys(S.f || {}).length || S.sort);
    if (active) { if (!bar || !bar.classList.contains('v16-bar')) { bar = document.createElement('div'); bar.className = 'v16-bar'; bar.setAttribute('role', 'status'); host.insertAdjacentElement('beforebegin', bar); }
      bar.innerHTML = `<span>${Object.keys(S.f || {}).length ? `Filtro activo: ${shown} de ${rows.length} linhas` : 'Ordenação activa'}</span><button type="button" class="btn ghost sm" data-v16clear="${E(k)}">Limpar filtros desta tabela</button>`;
    } else if (bar && bar.classList.contains('v16-bar')) bar.remove();
  };
  const values = (t, i) => {
    if (isMembers(t)) { const f = MCOL[N(headCells(t)[i].dataset.v16h)]; return [...new Set((DB.members || []).map((m) => String(m[f] ?? '').trim() || '—'))]; }
    return [...new Set(bodyRows(t).map((r) => cell(r, i)))];
  };
  const open = (t, i) => {
    const th = headCells(t)[i]; const name = th.dataset.v16h; const mem = isMembers(t); const field = mem ? MCOL[N(name)] : null;
    if (mem && !field) { MMUI.toast('Esta coluna não tem filtro.'); return; }
    const k = t.dataset.v16k; const S = mem ? { f: MEM } : (ST[k] = ST[k] || { f: {} }); const cur = (mem ? S.f[field] : S.f[i]) || {};
    const V = values(t, i).sort(cmp); const sel = cur.vals ? new Set(cur.vals) : null;
    const m = MMUI.modal({ title: `Coluna «${name}»`, size: 'narrow',
      body: `<div class="v16-sort" role="group" aria-label="Ordenar"><button type="button" class="btn ghost sm" data-sort="1">Ordenar A → Z / 0 → 9</button><button type="button" class="btn ghost sm" data-sort="-1">Ordenar Z → A / 9 → 0</button></div>
        <form class="mm-form" novalidate><div class="field"><label for="v16_txt">Contém o texto</label><input id="v16_txt" name="txt" value="${E(cur.txt || '')}" maxlength="60" autocomplete="off"></div>
        <fieldset class="mm-fs"><legend>Valores (${V.length})</legend><div class="field"><label for="v16_q" class="sr-only">Procurar valor</label><input id="v16_q" placeholder="Procurar na lista…" autocomplete="off"></div>
          <label class="mm-check"><input type="checkbox" data-all${!sel ? ' checked' : ''}> <b>Seleccionar todos</b></label>
          <div class="mm-checks v16-vals">${V.slice(0, 600).map((v, j) => `<label class="mm-check" data-v="${E(N(v))}"><input type="checkbox" data-j="${j}"${!sel || sel.has(v) ? ' checked' : ''}> ${E(v || '(vazio)')}</label>`).join('')}</div>${V.length > 600 ? '<p class="mm-help">A mostrar 600 valores; use «Contém o texto».</p>' : ''}</fieldset></form>`,
      foot: '<button type="button" class="btn ghost sm" data-clear>Limpar este filtro</button><button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Aplicar</button>' });
    const el = m.el; const boxes = () => [...el.querySelectorAll('[data-j]')];
    el.querySelector('#v16_q').addEventListener('input', (e) => { const q = N(e.target.value); el.querySelectorAll('.v16-vals [data-v]').forEach((l) => { l.hidden = q && !l.dataset.v.includes(q); }); });
    el.querySelector('[data-all]').addEventListener('change', (e) => boxes().forEach((b) => { if (!b.closest('label').hidden) b.checked = e.target.checked; }));
    const done = () => { m.close(); if (mem) { if (typeof renderDatabase === 'function') renderDatabase(); } else apply(t); };
    el.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => {
      const dir = +b.dataset.sort;
      if (mem) { dbState.sortKey = field; dbState.sortDir = dir; } else S.sort = { col: i, dir };
      done();
    }));
    el.querySelector('[data-clear]').addEventListener('click', () => { if (mem) delete MEM[field]; else delete S.f[i]; done(); });
    el.querySelector('[data-ok]').addEventListener('click', () => {
      const txt = MMUI.clean(el.querySelector('#v16_txt').value, 60); const B = boxes(); const all = B.every((b) => b.checked);
      if (!all && !B.some((b) => b.checked) && !txt) { MMUI.toast('Escolha pelo menos um valor.'); return; }
      const f = { txt, vals: all ? null : B.filter((b) => b.checked).map((b) => V[+b.dataset.j]) };
      if (!f.txt && !f.vals) { if (mem) delete MEM[field]; else delete S.f[i]; } else if (mem) MEM[field] = f; else S.f[i] = f;
      done();
    });
  };
  const dbFilter = (list) => {
    const F = Object.entries(MEM); if (!F.length) return list;
    return list.filter((m) => F.every(([fld, f]) => { const v = String(m[fld] ?? '').trim() || '—'; return (!f.txt || N(v).includes(N(f.txt))) && (!f.vals || f.vals.includes(v)); }));
  };
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-v16clear]'); if (c) { const t = [...document.querySelectorAll('table')].find((x) => x.dataset.v16k === c.dataset.v16clear); delete ST[c.dataset.v16clear]; if (t) { bodyRows(t).forEach((r) => r.classList.remove('v16-hide')); apply(t); } return; }
    const b = e.target.closest('.v16-thf'); const th = b ? b.closest('th') : e.target.closest('th.v16-th');
    if (!th || (!b && (e.target.closest('button, a, input, select') || th.dataset.sort !== undefined || th.querySelector('button:not(.v16-thf)')))) return;
    const t = th.closest('table'); if (!t || !t.dataset.v16k) return; e.preventDefault(); e.stopPropagation(); open(t, headCells(t).indexOf(th));
  }, true);

  /* ---------- 2) Campos com lista nos formulários (visitantes, disciplina, inventário) — editáveis em «Listas & Categorias» ---------- */
  const FL = [['igreja', 'disciplina', 'igreja', 'modal-disciplina', 'btn-save-disciplina', null], ['disc_motivo', 'disciplina', 'motivo', 'modal-disciplina', 'btn-save-disciplina', 'Disciplina — Motivo'],
    ['vis_origem', 'visitantes', 'origem', 'modal-visitante', 'btn-save-visitante', 'Visitantes — Origem'], ['vis_centro', 'visitantes', 'centroOrigem', 'modal-visitante', 'btn-save-visitante', 'Visitantes — Centro de origem'],
    ['vis_motivo', 'visitantes', 'motivo', 'modal-visitante', 'btn-save-visitante', 'Visitantes — Motivo'], ['inv_categoria', 'inventario', 'categoria', 'modal-inv', 'btn-save-inv', 'Inventário — Categoria'], ['inv_local', 'inventario', 'localizacao', 'modal-inv', 'btn-save-inv', 'Inventário — Localização']];
  const seedLists = () => {
    DB.settings.lists = DB.settings.lists || {};
    FL.forEach(([key, coll, f, , , label]) => {
      if (label && !DB.settings.lists[key]) DB.settings.lists[key] = [...new Set((DB[coll] || []).map((r) => String(r[f] || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
      if (label && typeof LIST_CATEGORIES !== 'undefined' && !LIST_CATEGORIES.some((c) => c.key === key)) LIST_CATEGORIES.push({ key, label, field: `${coll}.${f}`, coll, recField: f });
    });
  };
  const listSelect = (inp, key) => {
    const cur = inp.value; const L = listFor(key); const sel = document.createElement('select'); sel.dataset.f = inp.dataset.f; sel.dataset.v16list = key; if (inp.id) sel.id = inp.id;
    sel.innerHTML = `<option value="">—</option>${L.map((v) => `<option${v === cur ? ' selected' : ''}>${E(v)}</option>`).join('')}${cur && !L.includes(cur) ? `<option selected>${E(cur)}</option>` : ''}<option value="__v16outro__">+ Outro (escrever)…</option>`;
    const other = document.createElement('input'); other.type = 'text'; other.className = 'v16-outro is-hidden'; other.maxLength = 120; other.setAttribute('aria-label', 'Novo valor (fica na lista)'); other.placeholder = 'Escreva o novo valor — fica na lista';
    sel.addEventListener('change', () => { const o = sel.value === '__v16outro__'; other.classList.toggle('is-hidden', !o); if (o) { other.value = ''; other.focus(); } });
    other.addEventListener('input', () => { let opt = sel.querySelector('option[data-new]'); const v = MMUI.clean(other.value, 120); if (!opt) { opt = document.createElement('option'); opt.dataset.new = '1'; sel.insertBefore(opt, sel.lastElementChild); } opt.value = v; opt.textContent = v || '(novo)'; sel.value = v || '__v16outro__'; });
    inp.replaceWith(sel); sel.insertAdjacentElement('afterend', other);
  };
  const watchModal = (id, fn) => { const md = document.getElementById(id); if (!md) return; new MutationObserver(() => { if (md.classList.contains('open') && !md.dataset.v16open) { md.dataset.v16open = '1'; try { fn(md); } catch (err) { console.warn('V16:', err); } } else if (!md.classList.contains('open')) delete md.dataset.v16open; }).observe(md, { attributes: true, attributeFilter: ['class'] }); };
  const installLists = () => {
    seedLists();
    [...new Set(FL.map((x) => x[3]))].forEach((mid) => watchModal(mid, (md) => FL.filter((x) => x[3] === mid).forEach(([key, , f]) => { const inp = md.querySelector(`input[data-f="${f}"]`); if (inp) listSelect(inp, key); })));
    [...new Set(FL.map((x) => x[4]))].forEach((bid) => document.getElementById(bid)?.addEventListener('click', () => {
      FL.filter((x) => x[4] === bid).forEach(([key, , f, mid]) => { const s = document.querySelector(`#${mid} select[data-f="${f}"][data-v16list]`); const v = s && s.value !== '__v16outro__' ? MMUI.clean(s.value, 120) : ''; if (s && s.value === '__v16outro__') s.value = ''; if (v && !listFor(key).includes(v)) listFor(key).push(v); });
    }, true));
  };

  /* ---------- 3) Estatística do culto: campos adicionais (acrescentar, editar, ordenar, remover) ---------- */
  let pend = null;
  const cultoCols = () => {
    const sec = document.getElementById('sec-cultos'); if (!sec) return; const F = MMFields.list('cultos');
    const btnBox = sec.querySelector('.topbar-actions') || sec.querySelector('.topbar');
    if (btnBox && MMUI.isAdmin() && !sec.querySelector('[data-v16cf]')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost sm'; b.dataset.v16cf = '1'; b.textContent = 'Campos adicionais…'; btnBox.appendChild(b); }
    const btn = sec.querySelector('[data-editculto]'); const t = btn ? btn.closest('table') : sec.querySelector('table'); if (!t || !t.tHead || !F.length) return;
    const hr = t.tHead.rows[t.tHead.rows.length - 1]; hr.querySelectorAll('[data-v16c]').forEach((x) => x.remove());
    const last = hr.cells[hr.cells.length - 1]; const before = isAct(last?.textContent || '') ? last : null;
    F.forEach((f) => { const th = document.createElement('th'); th.scope = 'col'; th.dataset.v16c = f.key; th.textContent = f.label; hr.insertBefore(th, before); });
    bodyRows(t).forEach((r) => { r.querySelectorAll('[data-v16c]').forEach((x) => x.remove()); const idx = r.querySelector('[data-editculto]')?.dataset.editculto; const rec = idx !== undefined ? DB.cultos[+idx] : null; const lastTd = before ? r.cells[r.cells.length - 1] : null;
      F.forEach((f) => { const td = document.createElement('td'); td.dataset.v16c = f.key; td.textContent = rec ? MMFields.text(f, rec[f.key]) || '—' : '—'; r.insertBefore(td, lastTd); }); });
  };
  const installCultos = () => {
    document.addEventListener('click', (e) => { if (e.target.closest('[data-v16cf]')) MMFields.manage('cultos', 'Campos adicionais da estatística do culto', () => { if (typeof renderCultos === 'function') renderCultos(); }); });
    watchModal('modal-culto', (md) => { const F = MMFields.list('cultos'); const body = document.getElementById('modal-culto-body'); if (!F.length || !body || body.querySelector('.v16-cf')) return;
      const i = typeof editingCultoIdx !== 'undefined' ? editingCultoIdx : null; const rec = i !== null && i !== undefined ? DB.cultos[i] : {};
      body.insertAdjacentHTML('beforeend', `<div class="v16-cf"><h4 class="mm-h4">Campos adicionais</h4><div class="fields-grid mm-form">${MMFields.html('cultos', rec, 'cu')}</div></div>`); });
    const sb = document.getElementById('btn-save-culto'); if (!sb) return;
    sb.addEventListener('click', (e) => { pend = null; const body = document.getElementById('modal-culto-body'); if (!MMFields.list('cultos').length || !body?.querySelector('.v16-cf')) return;
      const r = MMFields.read('cultos', body); if (r.err) { e.stopImmediatePropagation(); MMUI.toast(r.err); r.el?.focus(); return; }
      pend = { values: r.values, idx: typeof editingCultoIdx !== 'undefined' ? editingCultoIdx : null, before: new Set(DB.cultos) }; }, true);
    sb.addEventListener('click', () => { if (!pend) return; const p = pend; pend = null; const rec = p.idx !== null && p.idx !== undefined ? DB.cultos[p.idx] : DB.cultos.find((c) => !p.before.has(c)); if (!rec) return; Object.assign(rec, p.values); if (typeof saveDB === 'function') saveDB(); if (typeof renderCultos === 'function') renderCultos(); });
    if (typeof window.renderCultos === 'function') { const r0 = window.renderCultos; window.renderCultos = function (...a) { const r = r0.apply(this, a); try { cultoCols(); } catch (err) { console.warn('V16 cultos:', err); } return r; }; }
  };

  /* ---------- 4) Ficha Individual personalizável (administrador) ---------- */
  const FK = () => { DB.settings.fichaV16 = DB.settings.fichaV16 || { secs: [], items: {}, extra: [] }; const c = DB.settings.fichaV16; c.secs = c.secs || []; c.items = c.items || {}; c.extra = c.extra || []; return c; };
  const TOP = 'Resumo (topo)';
  const parse = (html) => { const t = document.createElement('template'); t.innerHTML = html; const root = t.content; const grids = [...root.querySelectorAll('.ficha-grid')];
    const secs = grids.map((g) => { const ti = g.previousElementSibling && g.previousElementSibling.classList.contains('ficha-section-title') ? g.previousElementSibling : null; return { key: ti ? ti.textContent.trim() : TOP, ti, g }; }); return { t, root, secs }; };
  const fmtV = (v) => (v === null || v === undefined || v === '' ? '—' : /^\d{4}-\d{2}-\d{2}/.test(String(v)) && typeof fmtDate === 'function' ? fmtDate(v) : String(v));
  const applyFicha = (html, m) => {
    const C = FK(); if (!C.secs.length && !Object.keys(C.items).length && !C.extra.length) return html;
    const { t, root, secs } = parse(html); const byKey = Object.fromEntries(secs.map((s) => [s.key, s]));
    C.extra.forEach((x) => { const s = byKey[x.sec] || secs[secs.length - 1]; if (!s) return; const d = document.createElement('div'); d.className = 'ficha-item'; d.dataset.v16x = x.id; d.innerHTML = `<div class="k">${E(x.label)}</div><div class="v">${E(x.field ? fmtV(m[x.field]) : x.text || '—')}</div>`; s.g.appendChild(d); });
    secs.forEach((s) => [...s.g.querySelectorAll('.ficha-item')].forEach((it, i) => { const k = it.dataset.v16x ? `x:${it.dataset.v16x}` : it.querySelector('.k')?.textContent.trim(); it.dataset.v16k = k; it.dataset.v16o = String(i * 10); }));
    Object.entries(C.items).forEach(([k, c]) => { const it = root.querySelector(`.ficha-item[data-v16k="${CSS.escape(k)}"]`); if (!it) return; if (c.h) { it.remove(); return; } if (c.t) it.querySelector('.k').textContent = c.t; if (c.sec && byKey[c.sec]) byKey[c.sec].g.appendChild(it); if (Number.isFinite(c.o)) it.dataset.v16o = String(c.o); });
    secs.forEach((s) => [...s.g.querySelectorAll('.ficha-item')].sort((a, b) => Number(a.dataset.v16o) - Number(b.dataset.v16o)).forEach((it) => s.g.appendChild(it)));
    const order = C.secs.map((x) => x.k).filter((k) => byKey[k] && k !== TOP); const movable = secs.filter((s) => s.ti);
    if (order.length && movable.length) { const anchor = document.createComment('v16'); movable[0].ti.before(anchor); const seq = [...order, ...movable.map((s) => s.key).filter((k) => !order.includes(k))]; let at = anchor;
      seq.forEach((k) => { const s = byKey[k]; at.after(s.ti); s.ti.after(s.g); at = s.g; }); anchor.remove(); }
    C.secs.forEach((x) => { const s = byKey[x.k]; if (!s) return; if (x.h) { s.ti?.remove(); s.g.remove(); return; } if (x.t && s.ti) s.ti.textContent = x.t; if (x.cor && s.ti) s.ti.dataset.v16cor = x.cor; });
    const d = document.createElement('div'); d.appendChild(t.content.cloneNode(true)); return d.innerHTML;
  };
  const paintFicha = () => document.querySelectorAll('#ficha-sheet [data-v16cor]').forEach((el) => { const c = MMUI.color(el.dataset.v16cor); if (c) { el.style.setProperty('--v16-cor', c); el.classList.add('v16-cor'); } });
  const fichaRefresh = () => { if (typeof currentFichaMember !== 'undefined' && currentFichaMember) { const sh = document.getElementById('ficha-sheet'); if (sh) { sh.innerHTML = fichaHTML(currentFichaMember); paintFicha(); } } };
  const fichaEditor = () => {
    if (!MMUI.isAdmin()) { MMUI.toast('Personalizar a ficha exige sessão de administrador.'); return; }
    const sample = (DB.members || [])[0] || {}; const base = parse(window.__v16ficha0(sample)); const C = JSON.parse(JSON.stringify(FK()));
    const secKeys = () => { const o = C.secs.map((x) => x.k).filter((k) => base.secs.some((s) => s.key === k)); return [...o, ...base.secs.map((s) => s.key).filter((k) => !o.includes(k))]; };
    const items = (sk) => { const L = []; base.secs.forEach((s) => s.g.querySelectorAll('.ficha-item').forEach((it, i) => { const k = it.querySelector('.k').textContent.trim(); const c = C.items[k] || {}; if ((c.sec || s.key) === sk) L.push({ k, label: c.t || k, h: !!c.h, o: Number.isFinite(c.o) ? c.o : i * 10 }); }));
      C.extra.filter((x) => x.sec === sk).forEach((x, i) => { const k = `x:${x.id}`; const c = C.items[k] || {}; L.push({ k, label: x.label, h: !!c.h, o: Number.isFinite(c.o) ? c.o : 1000 + i * 10, extra: x }); }); return L.sort((a, b) => a.o - b.o); };
    const secCfg = (k) => { let x = C.secs.find((s) => s.k === k); if (!x) { x = { k }; C.secs.push(x); } return x; };
    const fields = [...new Set(Object.keys(sample).concat(Object.keys((DB.members || [])[1] || {})))].filter((k) => !/^(id|foto|_)/.test(k)).sort();
    const draw = () => secKeys().map((sk, si, arr) => { const sc = C.secs.find((s) => s.k === sk) || {};
      return `<fieldset class="v16-fsec" data-sk="${E(sk)}"><legend>${E(sc.t || sk)}</legend>
        <div class="mm-row v16-row">${sk === TOP ? '<span class="mm-help">Secção fixa no topo da ficha</span>' : `<button type="button" class="mmc-btn" data-smv="-1" aria-label="Subir a secção ${E(sk)}"${si && arr[si - 1] !== TOP ? '' : ' disabled'}>↑</button><button type="button" class="mmc-btn" data-smv="1" aria-label="Descer a secção ${E(sk)}"${si < arr.length - 1 ? '' : ' disabled'}>↓</button>
          <label class="sr-only" for="v16st_${si}">Título</label><input id="v16st_${si}" data-st value="${E(sc.t || '')}" placeholder="${E(sk)}" maxlength="60"><label class="sr-only" for="v16sc_${si}">Cor do título</label><input id="v16sc_${si}" type="color" data-sc value="${E(MMUI.color(sc.cor, '#b8892b'))}">
          <label class="mm-check"><input type="checkbox" data-sh${sc.h ? '' : ' checked'}> Mostrar</label>`}</div>
        <ul class="v16-items">${items(sk).map((it, ii, L) => `<li data-ik="${E(it.k)}"><button type="button" class="mmc-btn" data-imv="-1" aria-label="Subir ${E(it.label)}"${ii ? '' : ' disabled'}>↑</button><button type="button" class="mmc-btn" data-imv="1" aria-label="Descer ${E(it.label)}"${ii < L.length - 1 ? '' : ' disabled'}>↓</button>
          <label class="sr-only" for="v16i_${si}_${ii}">Rótulo</label><input id="v16i_${si}_${ii}" data-it value="${E(it.extra ? it.extra.label : (C.items[it.k]?.t || ''))}" placeholder="${E(it.k)}" maxlength="60">
          <label class="sr-only" for="v16m_${si}_${ii}">Secção</label><select id="v16m_${si}_${ii}" data-isec>${secKeys().map((k2) => `<option${k2 === sk ? ' selected' : ''}>${E(k2)}</option>`).join('')}</select>
          <label class="mm-check"><input type="checkbox" data-ish${it.h ? '' : ' checked'}> Mostrar</label>${it.extra ? `<button type="button" class="mmc-btn mm-danger" data-xdel="${E(it.extra.id)}" aria-label="Eliminar ${E(it.label)}">✕</button>` : ''}</li>`).join('')}</ul></fieldset>`; }).join('');
    const md = MMUI.modal({ title: 'Personalizar a Ficha Individual', size: 'wide',
      body: `<p class="mm-help">Mova secções e informações (↑ ↓ ou escolha outra secção), mude títulos, rótulos e cores, oculte o que não interessa e acrescente informações. A ficha de todos os membros segue esta configuração.</p>
        <div data-v16f>${draw()}</div>
        <fieldset class="mm-fs"><legend>Acrescentar informação</legend><div class="mm-grid c4"><div class="field"><label for="v16x_l">Rótulo *</label><input id="v16x_l" maxlength="60"></div>
          <div class="field"><label for="v16x_f">Dado do membro</label><select id="v16x_f"><option value="">— texto fixo —</option>${fields.map((f) => `<option>${E(f)}</option>`).join('')}</select></div>
          <div class="field"><label for="v16x_t">Texto fixo</label><input id="v16x_t" maxlength="120"></div><div class="field"><label for="v16x_s">Secção</label><select id="v16x_s">${secKeys().map((k) => `<option>${E(k)}</option>`).join('')}</select></div></div>
          <button type="button" class="btn ghost sm" data-xadd>+ Acrescentar</button></fieldset><p class="mm-err" role="alert"></p>`,
      foot: '<button type="button" class="btn danger sm" data-reset>Repor ficha original</button><button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    const box = md.el.querySelector('[data-v16f]'); const err = md.el.querySelector('.mm-err');
    const read = () => box.querySelectorAll('.v16-fsec').forEach((fs) => { const sk = fs.dataset.sk; if (sk !== TOP) { const sc = secCfg(sk); sc.t = MMUI.clean(fs.querySelector('[data-st]').value, 60); const cv = fs.querySelector('[data-sc]').value.toLowerCase(); sc.cor = sc.cor || cv !== '#b8892b' ? MMUI.color(cv, '') : ''; sc.h = !fs.querySelector('[data-sh]').checked; }
      fs.querySelectorAll('li[data-ik]').forEach((li, i) => { const k = li.dataset.ik; const c = C.items[k] = C.items[k] || {}; const lbl = MMUI.clean(li.querySelector('[data-it]').value, 60); const x = k.startsWith('x:') ? C.extra.find((e) => `x:${e.id}` === k) : null;
        if (x) { if (lbl) x.label = lbl; x.sec = li.querySelector('[data-isec]').value; } else { c.t = lbl; c.sec = li.querySelector('[data-isec]').value; } c.h = !li.querySelector('[data-ish]').checked; c.o = i * 10; }); });
    box.addEventListener('change', (e) => { if (e.target.matches('[data-isec]')) { read(); box.innerHTML = draw(); } });
    md.el.addEventListener('click', (e) => {
      const sm = e.target.closest('[data-smv]'); const im = e.target.closest('[data-imv]'); const xd = e.target.closest('[data-xdel]');
      if (sm) { read(); const L = secKeys().filter((k) => k !== TOP); const sk = sm.closest('.v16-fsec').dataset.sk; const i = L.indexOf(sk), j = i + +sm.dataset.smv; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; C.secs = L.map((k) => secCfg(k)); box.innerHTML = draw(); }
      else if (im) { read(); const li = im.closest('li'); const fs = li.closest('.v16-fsec'); const L = [...fs.querySelectorAll('li[data-ik]')].map((x) => x.dataset.ik); const i = L.indexOf(li.dataset.ik), j = i + +im.dataset.imv; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; L.forEach((k, n) => { (C.items[k] = C.items[k] || {}).o = n * 10; }); box.innerHTML = draw(); }
      else if (xd) { read(); C.extra = C.extra.filter((x) => x.id !== xd.dataset.xdel); delete C.items[`x:${xd.dataset.xdel}`]; box.innerHTML = draw(); }
      else if (e.target.closest('[data-xadd]')) { read(); const l = MMUI.clean(md.el.querySelector('#v16x_l').value, 60); const f = md.el.querySelector('#v16x_f').value; const tx = MMUI.clean(md.el.querySelector('#v16x_t').value, 120);
        if (!l) { err.textContent = 'Indique o rótulo da nova informação.'; return; } if (!f && !tx) { err.textContent = 'Escolha um dado do membro ou escreva um texto fixo.'; return; } if (/[<>]/.test(l + tx)) { err.textContent = 'Os textos não podem conter < ou >.'; return; }
        C.extra.push({ id: Date.now().toString(36), label: l, field: f, text: tx, sec: md.el.querySelector('#v16x_s').value }); err.textContent = ''; md.el.querySelector('#v16x_l').value = ''; md.el.querySelector('#v16x_t').value = ''; box.innerHTML = draw(); }
      else if (e.target.closest('[data-reset]')) MMUI.confirm('Repor a ficha original (ordem, títulos, cores e informações acrescentadas)?', 'Repor').then((ok) => { if (!ok) return; DB.settings.fichaV16 = { secs: [], items: {}, extra: [] }; MMUI.save('Ficha individual reposta'); md.close(); fichaRefresh(); });
      else if (e.target.closest('[data-ok]')) { read(); if (JSON.stringify(C).match(/[<>]/)) { err.textContent = 'Os textos não podem conter < ou >.'; return; } DB.settings.fichaV16 = C; MMUI.save('Ficha individual personalizada'); md.close(); fichaRefresh(); MMUI.toast('Ficha personalizada.'); }
    });
  };
  const fichaPanel = () => {
    const sec = document.getElementById('sec-ficha'); if (!sec || sec.querySelector('.v16-fadv') || !MMUI.isAdmin()) return;
    const d = document.createElement('details'); d.className = 'card v16-fadv'; d.innerHTML = '<summary>Opções avançadas — personalizar a ficha (administrador)</summary><p class="sub">Mover, ocultar, renomear e acrescentar informações; cor dos títulos das secções.</p><button type="button" class="btn gold sm" data-v16ficha>Personalizar a ficha…</button>';
    (sec.querySelector('.topbar') || sec.firstElementChild).insertAdjacentElement('afterend', d);
  };

  /* ---------- 5) Ordem dos gráficos (Painel e Relatórios) ---------- */
  const CO = () => { DB.settings.chartOrderV16 = DB.settings.chartOrderV16 || {}; return DB.settings.chartOrderV16; };
  const cards = (sec) => [...sec.querySelectorAll('canvas[id]')].map((c) => c.closest('.v15-chart, .card')).filter((c, i, a) => c && a.indexOf(c) === i && !c.closest('.mm-modal'));
  const cardId = (c) => c.querySelector('canvas[id]').id;
  const orderCharts = (secId) => {
    const sec = document.getElementById(`sec-${secId}`); const O = CO()[secId]; if (!sec || !O || !O.length) return;
    const C = cards(sec); const want = [...C].sort((a, b) => { const ia = O.indexOf(cardId(a)), ib = O.indexOf(cardId(b)); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
    if (want.every((c, i) => c === C[i])) return;
    const marks = C.map((c) => { const m = document.createComment('v16slot'); c.before(m); return m; }); C.forEach((c) => c.remove()); marks.forEach((m, i) => m.replaceWith(want[i]));
    want.forEach((c) => { const ch = window.Chart && Chart.getChart(c.querySelector('canvas')); if (ch) ch.resize(); });
  };
  const orderModal = (secId) => {
    const sec = document.getElementById(`sec-${secId}`); if (!sec) return; if (!MMCharts.canEdit()) { MMCharts.deny(); return; }
    let L = cards(sec).map((c) => ({ id: cardId(c), t: (c.querySelector('h3, h4')?.textContent || cardId(c)).trim() }));
    if (!L.length) { MMUI.toast('Ainda não há gráficos nesta aba.'); return; }
    const draw = () => `<ol class="v16-ord">${L.map((x, i) => `<li><span>${E(x.t)}</span><span><button type="button" class="mmc-btn" data-mv="-1" data-i="${i}" aria-label="Subir ${E(x.t)}"${i ? '' : ' disabled'}>↑</button><button type="button" class="mmc-btn" data-mv="1" data-i="${i}" aria-label="Descer ${E(x.t)}"${i < L.length - 1 ? '' : ' disabled'}>↓</button></span></li>`).join('')}</ol>`;
    const md = MMUI.modal({ title: `Organizar gráficos — ${secId === 'dashboard' ? 'Painel' : 'Relatórios'}`, size: 'narrow', body: `<p class="mm-help">Use ↑ ↓ para mudar a posição dos gráficos. A ordem fica guardada.</p><div data-ordl>${draw()}</div>`,
      foot: '<button type="button" class="btn danger sm" data-reset>Ordem original</button><button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    md.el.addEventListener('click', (e) => { const b = e.target.closest('[data-mv]'); if (b) { const i = +b.dataset.i, j = i + +b.dataset.mv; [L[i], L[j]] = [L[j], L[i]]; md.el.querySelector('[data-ordl]').innerHTML = draw(); md.el.querySelector(`[data-i="${j}"][data-mv="${b.dataset.mv}"]`)?.focus(); return; }
      if (e.target.closest('[data-reset]')) { delete CO()[secId]; MMUI.save('Ordem dos gráficos reposta'); md.close(); if (secId === 'dashboard' && typeof renderDashboard === 'function') renderDashboard(); else document.querySelector(`#nav button[data-tab="${secId}"]`)?.click(); return; }
      if (e.target.closest('[data-ok]')) { CO()[secId] = L.map((x) => x.id); MMUI.save('Ordem dos gráficos alterada'); md.close(); orderCharts(secId); MMUI.toast('Ordem dos gráficos guardada.'); } });
  };
  const orderButtons = () => ['dashboard', 'reports'].forEach((s) => { const sec = document.getElementById(`sec-${s}`); const box = sec && (sec.querySelector('.topbar-actions') || sec.querySelector('.topbar')); if (!box || sec.querySelector('[data-v16ord]') || !MMCharts.canEdit()) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost sm'; b.dataset.v16ord = s; b.textContent = 'Organizar gráficos'; box.appendChild(b); });

  /* ---------- Instalação e observação das apresentações ---------- */
  let busy = false; let tmr = null; let obs = null;
  const sweep = () => { if (busy) return; busy = true; try {
    document.querySelectorAll('.section.active table').forEach((t) => { try { decorate(t); if (t.dataset.v16k) apply(t); } catch (err) { console.warn('V16 tabela:', err); } });
    orderButtons(); fichaPanel(); const act = document.querySelector('.section.active')?.id; if (act === 'sec-dashboard') orderCharts('dashboard'); if (act === 'sec-reports') orderCharts('reports'); if (act === 'sec-ficha') paintFicha(); if (act === 'sec-cultos') { const t = document.querySelector('#sec-cultos table'); if (t && MMFields.list('cultos').length && !t.querySelector('[data-v16c]')) cultoCols(); }
  } finally { if (obs) obs.takeRecords(); busy = false; } };
  const install = () => {
    try {
      window.__v16ficha0 = window.fichaHTML; window.fichaHTML = (m) => { try { return applyFicha(window.__v16ficha0(m), m); } catch (err) { console.warn('V16 ficha:', err); return window.__v16ficha0(m); } };
      installLists(); installCultos();
      document.addEventListener('click', (e) => { if (e.target.closest('[data-v16ficha]')) fichaEditor(); const o = e.target.closest('[data-v16ord]'); if (o) orderModal(o.dataset.v16ord); });
      const main = document.querySelector('main.main') || document.body;
      obs = new MutationObserver(() => { clearTimeout(tmr); tmr = setTimeout(sweep, 90); }); obs.observe(main, { childList: true, subtree: true });
      sweep();
      if (DB.settings && DB.settings.system && !DB.settings.system.v16) { DB.settings.system.v16 = { instaladaEm: new Date().toISOString() }; if (typeof saveDB === 'function') saveDB(); }
    } catch (err) { console.warn('V16:', err); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(install, 200)); else setTimeout(install, 200);
  return { dbFilter, apply, open, ST, MEM: () => MEM, applyFicha, orderCharts };
})();
