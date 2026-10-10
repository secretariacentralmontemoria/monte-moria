/* =====================================================================
   V14 — ORGANIGRAMA + DEPARTAMENTOS (estrutura das Direcções)
   · Organigrama: hierarquia de liderança com fotografia, cargo, departamento, contactos
     e campos adicionais; ligação opcional à ficha do membro.
   · Departamentos: Direcções → Departamentos, responsáveis, adjuntos e número de membros
     (contado a partir do campo «departamento» da base de dados de membros).
   Dados em DB.organigrama (nada do que já existe é alterado ou eliminado).
   ===================================================================== */
const MMOrg = {
  sub: 'org', collapsed: new Set(), charts: {},
  data() {
    DB.organigrama = DB.organigrama || {}; const o = DB.organigrama;
    o.pessoas = Array.isArray(o.pessoas) ? o.pessoas : []; o.direcoes = Array.isArray(o.direcoes) ? o.direcoes : []; o.departamentos = Array.isArray(o.departamentos) ? o.departamentos : [];
    return o;
  },
  can() { return MMUI.canEditTab('organigrama'); },
  id() { return typeof uid === 'function' ? uid() : `o${Math.random().toString(36).slice(2, 10)}`; },
  norm: (s) => MMFile.norm(s),
  /** «S/D», «N/D», «-», «9XXXXXXXX»… são marcas de «sem dados» vindas do Excel: tratadas como vazio. */
  blank: (v) => { const t = String(v ?? '').trim(); return !t || /^(s\/?d|n\/?d|n\/?a|sem\b.*|-+|—+|\.+|x+|9x+|0+)$/i.test(t); },
  tel: (v) => { const t = String(v ?? '').trim(); return MMOrg.blank(t) ? '' : t; },
  okTel: (t) => !t || (/^[+()\d\s\-/.,;]{6,60}$/.test(t) && (t.match(/\d/g) || []).length >= 6),
  okEmail: (t) => !t || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t),
  img: (v) => (typeof v === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(v) ? v : ''),
  initials: (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase(),
  member(nome) { const n = MMOrg.norm(nome); return n ? (DB.members || []).find((m) => MMOrg.norm(m.nome) === n) || null : null; },
  membersOf(dep) { const n = MMOrg.norm(dep); return (DB.members || []).filter((m) => MMOrg.norm(m.departamento) === n); },
  byId: (list, id) => list.find((x) => x.id === id) || null,
  kids(pid) { return MMOrg.data().pessoas.filter((p) => (p.parent || '') === (pid || '')).sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0) || String(a.nome).localeCompare(b.nome, 'pt')); },
  isDesc(id, anc) { const P = MMOrg.data().pessoas; let p = MMOrg.byId(P, id)?.parent; const seen = new Set(); while (p && !seen.has(p)) { if (p === anc) return true; seen.add(p); p = MMOrg.byId(P, p)?.parent; } return false; },
  deps() { return MMOrg.data().departamentos.slice().sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0) || a.nome.localeCompare(b.nome, 'pt')); },
  dirs() { return MMOrg.data().direcoes.slice().sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0) || a.nome.localeCompare(b.nome, 'pt')); },
  /** Departamentos que existem nos membros/listas mas ainda não na estrutura. */
  loose() {
    const have = new Set(MMOrg.data().departamentos.map((d) => MMOrg.norm(d.nome))); const out = new Map();
    const add = (n) => { const k = MMOrg.norm(n); if (n && k && !have.has(k) && !out.has(k)) out.set(k, String(n).trim()); };
    try { listFor('departamento').forEach(add); } catch (_) { /* lista */ } (DB.members || []).forEach((m) => add(m.departamento));
    return [...out.values()].sort((a, b) => a.localeCompare(b, 'pt'));
  },
  avatar(p, cls = '') {
    const f = MMOrg.img(p.foto) || MMOrg.img(MMOrg.member(p.nome)?.foto);
    return `<span class="v14o-av ${cls}" aria-hidden="true">${f ? `<img alt="" src="${f}">` : MMUI.esc(MMOrg.initials(p.nome))}</span>`;
  },

  /* ---------------- Apresentação ---------------- */
  render() {
    try {
      const root = document.getElementById('v14-org'); if (!root) return; const E = MMUI.esc; const can = MMOrg.can();
      const tabs = [['org', 'Organigrama'], ['dep', 'Departamentos']];
      const acts = document.getElementById('v14o-actions');
      if (acts) acts.innerHTML = MMOrg.sub === 'org'
        ? `<button type="button" class="btn gold sm" data-v14o="person-new"${can ? '' : ' disabled'}>+ Pessoa</button><button type="button" class="btn ghost sm" data-v14o="print">Imprimir</button><button type="button" class="btn ghost sm" data-v14o="xlsx">Exportar Excel</button>`
        : `<button type="button" class="btn gold sm" data-v14o="dir-new"${can ? '' : ' disabled'}>+ Direcção</button><button type="button" class="btn ghost sm" data-v14o="dep-new"${can ? '' : ' disabled'}>+ Departamento</button><button type="button" class="btn ghost sm" data-v14o="xlsx">Exportar Excel</button>`;
      root.innerHTML = `<div class="tabs-inline v14-tabs" role="tablist" aria-label="Organigrama">${tabs.map(([k, l]) => `<button type="button" role="tab" id="v14o-t-${k}" aria-selected="${MMOrg.sub === k}" aria-controls="v14o-p-${k}" tabindex="${MMOrg.sub === k ? 0 : -1}" class="${MMOrg.sub === k ? 'active' : ''}" data-v14o-tab="${k}">${l}</button>`).join('')}</div>
        <div role="tabpanel" id="v14o-p-${MMOrg.sub}" aria-labelledby="v14o-t-${MMOrg.sub}">${MMOrg.sub === 'org' ? MMOrg.orgHTML() : MMOrg.depHTML()}</div>`;
      if (MMOrg.sub === 'dep') MMOrg.depCharts();
    } catch (e) { console.error('Organigrama:', e); MMUI.toast(`Erro ao apresentar o organigrama: ${e.message}`); }
  },
  orgHTML() {
    const E = MMUI.esc; const O = MMOrg.data(); const can = MMOrg.can();
    const extra = MMFields.list('org');
    const node = (p, depth) => {
      const ch = MMOrg.kids(p.id); const closed = MMOrg.collapsed.has(p.id); const dep = MMOrg.byId(O.departamentos, p.departamentoId);
      const info = [p.contacto, p.email].filter(Boolean).join(' · ');
      return `<li><div class="v14o-card${depth === 0 ? ' root' : ''}">
          ${MMOrg.avatar(p)}<div class="v14o-txt"><b>${E(p.nome)}</b><span class="v14o-cargo">${E(p.cargo || '—')}</span>${dep ? `<span class="v14o-dep">${E(dep.nome)}</span>` : ''}${info ? `<span class="v14o-info">${E(info)}</span>` : ''}
          ${extra.filter((f) => p[f.key] !== undefined && p[f.key] !== '' && p[f.key] !== false).map((f) => `<span class="v14o-info">${E(f.label)}: ${E(MMFields.text(f, p[f.key]))}</span>`).join('')}</div>
          <div class="v14o-acts">${ch.length ? `<button type="button" class="mmc-btn" data-v14o="toggle" data-id="${E(p.id)}" aria-expanded="${!closed}" aria-label="${closed ? 'Mostrar' : 'Ocultar'} a equipa de ${E(p.nome)}">${closed ? '▸' : '▾'} ${ch.length}</button>` : ''}
          ${can ? `<button type="button" class="mmc-btn" data-v14o="person-child" data-id="${E(p.id)}" aria-label="Acrescentar pessoa sob ${E(p.nome)}" title="Acrescentar subordinado">＋</button><button type="button" class="mmc-btn" data-v14o="person-edit" data-id="${E(p.id)}" aria-label="Editar ${E(p.nome)}">✎</button><button type="button" class="mmc-btn mm-danger" data-v14o="person-del" data-id="${E(p.id)}" aria-label="Remover ${E(p.nome)}">✕</button>` : ''}</div></div>
        ${ch.length && !closed ? `<ul>${ch.map((c) => node(c, depth + 1)).join('')}</ul>` : ''}</li>`;
    };
    const roots = O.pessoas.filter((p) => !p.parent || !MMOrg.byId(O.pessoas, p.parent)).sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
    if (!roots.length) return `<div class="card v14-empty"><h3 class="u-v14-h">O organigrama ainda está vazio</h3><p class="sub">Acrescente a primeira pessoa (por exemplo, o Pastor responsável) ou gere o organigrama a partir das Direcções e Departamentos.</p>
      ${can ? '<div class="v14-actions"><button type="button" class="btn gold sm" data-v14o="person-new">+ Primeira pessoa</button><button type="button" class="btn ghost sm" data-v14o="gen">Gerar a partir das Direcções</button></div>' : ''}</div>`;
    return `<div class="v14-toolbar"><button type="button" class="btn ghost sm" data-v14o="expand">Expandir tudo</button><button type="button" class="btn ghost sm" data-v14o="collapse">Recolher tudo</button>
        ${can ? '<button type="button" class="btn ghost sm" data-v14o="gen">Acrescentar a partir das Direcções</button>' : ''}${MMUI.isAdmin() ? '<button type="button" class="btn ghost sm" data-v14o="fields">Campos adicionais…</button>' : ''}<span class="sub">${O.pessoas.length} ${O.pessoas.length === 1 ? 'pessoa' : 'pessoas'}</span></div>
      <div class="card v14o-wrap"><ul class="v14o-tree" aria-label="Organigrama">${roots.map((r) => node(r, 0)).join('')}</ul></div>`;
  },
  depHTML() {
    const E = MMUI.esc; const O = MMOrg.data(); const can = MMOrg.can(); const deps = MMOrg.deps(); const dirs = MMOrg.dirs(); const loose = MMOrg.loose();
    const withDep = (DB.members || []).filter((m) => m.departamento).length;
    const depItem = (d) => { const n = MMOrg.membersOf(d.nome).length;
      return `<li class="v14d-dep"><div class="v14d-dep-h"><b>${E(d.nome)}</b><button type="button" class="v14d-count" data-v14o="dep-members" data-id="${E(d.id)}" aria-label="Ver os ${n} membros de ${E(d.nome)}">${n} ${n === 1 ? 'membro' : 'membros'}</button></div>
        <span class="v14d-meta">${d.responsavel ? `Responsável: ${E(d.responsavel)}` : 'Sem responsável'}${d.adjunto ? ` · Adjunto: ${E(d.adjunto)}` : ''}</span>${d.descricao ? `<span class="v14d-meta">${E(d.descricao)}</span>` : ''}
        ${can ? `<span class="v14d-acts"><button type="button" class="mmc-btn" data-v14o="dep-edit" data-id="${E(d.id)}" aria-label="Editar ${E(d.nome)}">✎</button><button type="button" class="mmc-btn mm-danger" data-v14o="dep-del" data-id="${E(d.id)}" aria-label="Remover ${E(d.nome)}">✕</button></span>` : ''}</li>`; };
    const dirCard = (dr) => { const L = deps.filter((d) => d.direcaoId === dr.id); const tot = L.reduce((t, d) => t + MMOrg.membersOf(d.nome).length, 0);
      return `<section class="v14d-dir" aria-label="${E(dr.nome)}"><header class="v14d-dir-h" data-cor="${E(MMUI.color(dr.cor, ''))}"><div><h3>${E(dr.nome)}${dr.sigla ? ` <span class="v14d-sigla">${E(dr.sigla)}</span>` : ''}</h3>
        <span>${dr.responsavel ? `Director(a): ${E(dr.responsavel)}` : 'Sem director(a)'}${dr.adjunto ? ` · Adjunto: ${E(dr.adjunto)}` : ''}</span></div>
        ${can ? `<div class="v14d-acts"><button type="button" class="mmc-btn" data-v14o="dep-new" data-dir="${E(dr.id)}" aria-label="Acrescentar departamento a ${E(dr.nome)}" title="Novo departamento nesta direcção">＋</button><button type="button" class="mmc-btn" data-v14o="dir-edit" data-id="${E(dr.id)}" aria-label="Editar ${E(dr.nome)}">✎</button><button type="button" class="mmc-btn mm-danger" data-v14o="dir-del" data-id="${E(dr.id)}" aria-label="Remover ${E(dr.nome)}">✕</button></div>` : ''}</header>
        ${dr.descricao ? `<p class="v14d-desc">${E(dr.descricao)}</p>` : ''}<p class="v14d-sum">${L.length} ${L.length === 1 ? 'departamento' : 'departamentos'} · ${tot} membros</p>
        <ul class="v14d-list">${L.map(depItem).join('') || '<li class="v14d-empty">Sem departamentos.</li>'}</ul></section>`; };
    const orphans = deps.filter((d) => !d.direcaoId || !MMOrg.byId(O.direcoes, d.direcaoId));
    const k = (n, l) => `<div class="kpi"><div class="num">${E(n)}</div><div class="lbl">${E(l)}</div></div>`;
    return `<div class="kpi-grid">${k(dirs.length, 'Direcções')}${k(deps.length, 'Departamentos na estrutura')}${k(withDep, 'Membros com departamento')}${k((DB.members || []).length - withDep, 'Membros sem departamento')}</div>
      ${loose.length ? `<div class="note v14d-loose"><b>${loose.length} ${loose.length === 1 ? 'departamento ainda não está' : 'departamentos ainda não estão'} na estrutura:</b> ${loose.slice(0, 30).map((n) => `<span class="v14-chip">${E(n)}</span>`).join(' ')}${loose.length > 30 ? ' …' : ''}
        ${can ? '<div class="v14-actions"><button type="button" class="btn gold sm" data-v14o="dep-import">Acrescentar à estrutura</button></div>' : ''}</div>` : ''}
      <div class="v14d-grid">${dirs.map(dirCard).join('')}
        ${orphans.length || !dirs.length ? `<section class="v14d-dir none" aria-label="Departamentos sem direcção"><header class="v14d-dir-h"><div><h3>${dirs.length ? 'Sem direcção atribuída' : 'Departamentos'}</h3><span>${dirs.length ? 'Edite cada departamento para o colocar numa direcção.' : 'Crie as Direcções (+ Direcção) e distribua os departamentos.'}</span></div></header>
          <ul class="v14d-list">${orphans.map(depItem).join('') || '<li class="v14d-empty">Sem departamentos.</li>'}</ul></section>` : ''}</div>
      <div class="v14-charts two"><div class="card"><h3 class="u-v14-h">Membros por departamento</h3><div class="chart-wrap tall"><canvas id="chart-org-membros"></canvas></div></div>
        <div class="card"><h3 class="u-v14-h">Departamentos por direcção</h3><div class="chart-wrap tall"><canvas id="chart-org-dir"></canvas></div></div></div>`;
  },
  draw(id, cfg) { if (MMOrg.charts[id]) { try { MMOrg.charts[id].destroy(); } catch (_) { /* já destruído */ } } const c = document.getElementById(id); if (c) MMOrg.charts[id] = new Chart(c, cfg); },
  depCharts() {
    // cor de cada direcção (definida pelo utilizador; validada) aplicada por CSSOM
    document.querySelectorAll('.v14d-dir-h[data-cor]').forEach((h) => { if (h.dataset.cor) h.style.setProperty('--dir-cor', h.dataset.cor); });
    const pal = MMCharts.palette(); const dl = (k, o) => (typeof dlConfig === 'function' ? dlConfig(k, o) : { display: false });
    const deps = MMOrg.deps(); const rows = deps.map((d) => [d.nome, MMOrg.membersOf(d.nome).length]).sort((a, b) => b[1] - a[1]).slice(0, 25);
    MMOrg.draw('chart-org-membros', { type: 'bar', data: { labels: rows.map((r) => r[0]), datasets: [{ label: 'Membros', data: rows.map((r) => r[1]), backgroundColor: pal[0], borderRadius: 3 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, datalabels: dl('bar', { horizontal: true }) }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } });
    const dirs = MMOrg.dirs(); const lab = [...dirs.map((d) => d.nome), 'Sem direcção']; const val = [...dirs.map((d) => deps.filter((x) => x.direcaoId === d.id).length), deps.filter((x) => !x.direcaoId || !dirs.some((d) => d.id === x.direcaoId)).length];
    MMOrg.draw('chart-org-dir', { type: 'doughnut', data: { labels: lab, datasets: [{ data: val, backgroundColor: lab.map((_, i) => MMUI.color(dirs[i]?.cor) || pal[i % pal.length]) }] }, options: { plugins: { legend: { position: 'bottom' }, datalabels: dl('round') } } });
  },

  /* ---------------- Formulários ---------------- */
  async photo(file) {
    if (!file) return ''; if (file.type && !/^image\//.test(file.type)) throw new Error('o ficheiro escolhido não é uma imagem');
    if (file.size > 5 * 1024 * 1024) throw new Error('imagem demasiado grande (máx. 5 MB)');
    const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('não foi possível ler a imagem')); r.readAsDataURL(file); });
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('o navegador não consegue ler esta imagem (use JPG ou PNG)')); i.src = url; });
    const s = Math.min(1, 256 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.86);
  },
  personForm(p, parentId = '') {
    if (!MMOrg.can()) { MMUI.toast('Não tem permissão de edição no Organigrama.'); return; }
    const E = MMUI.esc; const O = MMOrg.data(); const x = p || { parent: parentId };
    const sups = O.pessoas.filter((o) => !p || (o.id !== p.id && !MMOrg.isDesc(o.id, p.id)));
    const names = (DB.members || []).map((m) => m.nome).filter(Boolean).slice(0, 3000);
    const m = MMUI.modal({ title: p ? `Editar — ${p.nome}` : 'Nova pessoa no organigrama', size: 'wide',
      body: `<form class="mm-form" novalidate><div class="mm-grid">
        <div class="field"><label for="op_n">Nome *</label><input id="op_n" name="nome" list="op_nl" maxlength="120" required aria-required="true" value="${E(x.nome || '')}" autocomplete="off"><datalist id="op_nl">${names.map((n) => `<option value="${E(n)}">`).join('')}</datalist></div>
        <div class="field"><label for="op_c">Cargo / função *</label><input id="op_c" name="cargo" maxlength="80" required aria-required="true" value="${E(x.cargo || '')}" placeholder="Ex.: Pastor responsável, Director de Louvor"></div>
        <div class="field"><label for="op_s">Superior hierárquico</label><select id="op_s" name="parent"><option value="">— (topo do organigrama)</option>${sups.map((o) => `<option value="${E(o.id)}"${o.id === x.parent ? ' selected' : ''}>${E(o.nome)} · ${E(o.cargo || '')}</option>`).join('')}</select></div>
        <div class="field"><label for="op_d">Departamento</label><select id="op_d" name="departamentoId"><option value="">—</option>${MMOrg.deps().map((d) => `<option value="${E(d.id)}"${d.id === x.departamentoId ? ' selected' : ''}>${E(d.nome)}</option>`).join('')}</select></div>
        <div class="field"><label for="op_t">Contacto</label><input id="op_t" name="contacto" type="tel" maxlength="60" value="${E(x.contacto || '')}"></div>
        <div class="field"><label for="op_e">Email</label><input id="op_e" name="email" type="email" maxlength="120" value="${E(x.email || '')}"></div>
        <div class="field"><label for="op_o">Ordem entre colegas</label><input id="op_o" name="ordem" type="number" min="0" step="1" value="${E(x.ordem ?? '')}"></div>
        <div class="field"><label for="op_f">Fotografia (PNG/JPG, opcional)</label><input id="op_f" name="foto" type="file" accept="image/*"></div>
        <div class="field mm-full"><label for="op_nt">Notas / responsabilidades</label><textarea id="op_nt" name="notas" maxlength="1000">${E(x.notas || '')}</textarea></div>
        ${MMFields.html('org', x, 'op')}</div>${MMOrg.img(x.foto) ? `<label class="mm-check"><input type="checkbox" name="semFoto"> Remover a fotografia actual</label>` : ''}<p class="mm-help" data-member-hint></p><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    const F = m.el.querySelector('form'); const err = F.querySelector('.mm-err');
    const hint = () => { const mb = MMOrg.member(F.nome.value); F.querySelector('[data-member-hint]').textContent = mb ? `Membro encontrado na base de dados${mb.departamento ? ` (${mb.departamento})` : ''} — contacto e email preenchidos se estiverem vazios.` : ''; if (mb) { const t = MMOrg.tel(mb.tel); const em = MMOrg.tel(mb.email); if (!F.contacto.value && t && MMOrg.okTel(t)) F.contacto.value = t; if (!F.email.value && em && MMOrg.okEmail(em)) F.email.value = em;
      const cg = MMOrg.tel(mb.cargo) || MMOrg.tel(mb.funcao); if (!F.cargo.value && cg) F.cargo.value = cg; } };
    F.nome.addEventListener('change', hint);
    const bad = (el, msg) => { F.querySelectorAll('[aria-invalid]').forEach((z) => z.removeAttribute('aria-invalid')); if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); } err.textContent = msg; };
    m.el.querySelector('[data-ok]').addEventListener('click', async () => {
      try {
        const nome = MMUI.clean(F.nome.value, 120); const cargo = MMUI.clean(F.cargo.value, 80);
        if (nome.length < 2) return bad(F.nome, 'Indique o nome (mínimo 2 caracteres).'); if (!cargo) return bad(F.cargo, 'Indique o cargo ou função.');
        const email = MMOrg.tel(MMUI.clean(F.email.value, 120)); if (!MMOrg.okEmail(email)) return bad(F.email, 'Email inválido (ex.: nome@dominio.ao). Deixe vazio se não tiver.');
        const contacto = MMOrg.tel(MMUI.clean(F.contacto.value, 60)); if (!MMOrg.okTel(contacto)) return bad(F.contacto, 'Contacto inválido: indique pelo menos 6 algarismos (pode separar vários números com «/»). Deixe vazio se não tiver.');
        const ordem = F.ordem.value; if (ordem !== '' && !(Number(ordem) >= 0)) return bad(F.ordem, 'A ordem deve ser 0 ou superior.');
        const parent = F.parent.value; if (p && parent && (parent === p.id || MMOrg.isDesc(parent, p.id))) return bad(F.parent, 'Hierarquia circular: escolha outro superior.');
        const cf = MMFields.read('org', F); if (cf.err) return bad(cf.el, cf.err);
        let foto = p ? MMOrg.img(p.foto) : ''; if (F.semFoto && F.semFoto.checked) foto = ''; if (F.foto.files[0]) foto = await MMOrg.photo(F.foto.files[0]);
        const rec = { ...cf.values, nome, cargo, parent, departamentoId: F.departamentoId.value, contacto, email, ordem: ordem === '' ? '' : Number(ordem), notas: MMUI.clean(F.notas.value, 1000), foto };
        if (p) Object.assign(p, rec); else MMOrg.data().pessoas.push({ id: MMOrg.id(), ...rec });
        if (typeof logActivity === 'function') logActivity(p ? 'Editou' : 'Registou', 'Organigrama', nome);
        MMUI.save(); m.close(); MMOrg.render(); MMUI.toast('Organigrama actualizado.');
      } catch (e) { bad(null, `Não foi possível guardar: ${e.message}`); }
    });
  },
  dirForm(d) {
    if (!MMOrg.can()) { MMUI.toast('Não tem permissão de edição no Organigrama.'); return; }
    const E = MMUI.esc; const x = d || {}; const names = (DB.members || []).map((mm) => mm.nome).filter(Boolean).slice(0, 3000);
    const m = MMUI.modal({ title: d ? `Editar direcção — ${d.nome}` : 'Nova direcção', size: 'wide',
      body: `<form class="mm-form" novalidate><div class="mm-grid"><div class="field"><label for="od_n">Nome da direcção *</label><input id="od_n" name="nome" maxlength="80" required aria-required="true" value="${E(x.nome || '')}" placeholder="Ex.: Direcção Espiritual"></div>
        <div class="field"><label for="od_s">Sigla</label><input id="od_s" name="sigla" maxlength="12" value="${E(x.sigla || '')}"></div>
        <div class="field"><label for="od_r">Director(a)</label><input id="od_r" name="responsavel" list="od_nl" maxlength="120" value="${E(x.responsavel || '')}" autocomplete="off"><datalist id="od_nl">${names.map((n) => `<option value="${E(n)}">`).join('')}</datalist></div>
        <div class="field"><label for="od_a">Adjunto(a)</label><input id="od_a" name="adjunto" list="od_nl" maxlength="120" value="${E(x.adjunto || '')}" autocomplete="off"></div>
        <div class="field"><label for="od_c">Cor</label><input id="od_c" name="cor" type="color" value="${E(MMUI.color(x.cor, '#12213a'))}"></div>
        <div class="field"><label for="od_o">Ordem</label><input id="od_o" name="ordem" type="number" min="0" step="1" value="${E(x.ordem ?? '')}"></div>
        <div class="field mm-full"><label for="od_de">Descrição / missão</label><textarea id="od_de" name="descricao" maxlength="600">${E(x.descricao || '')}</textarea></div></div><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    const F = m.el.querySelector('form'); const err = F.querySelector('.mm-err');
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      const nome = MMUI.clean(F.nome.value, 80); if (nome.length < 2) { err.textContent = 'Indique o nome da direcção.'; F.nome.setAttribute('aria-invalid', 'true'); F.nome.focus(); return; }
      if (MMOrg.data().direcoes.some((o) => o !== d && MMOrg.norm(o.nome) === MMOrg.norm(nome))) { err.textContent = 'Já existe uma direcção com esse nome.'; return; }
      if (F.ordem.value !== '' && !(Number(F.ordem.value) >= 0)) { err.textContent = 'A ordem deve ser 0 ou superior.'; return; }
      const rec = { nome, sigla: MMUI.clean(F.sigla.value, 12), responsavel: MMUI.clean(F.responsavel.value, 120), adjunto: MMUI.clean(F.adjunto.value, 120), cor: MMUI.color(F.cor.value, ''), ordem: F.ordem.value === '' ? '' : Number(F.ordem.value), descricao: MMUI.clean(F.descricao.value, 600) };
      if (d) Object.assign(d, rec); else MMOrg.data().direcoes.push({ id: MMOrg.id(), ...rec });
      if (typeof logActivity === 'function') logActivity(d ? 'Editou' : 'Registou', 'Direcção', nome);
      MMUI.save(); m.close(); MMOrg.render(); MMUI.toast('Direcção guardada.');
    });
  },
  depForm(d, dirId = '') {
    if (!MMOrg.can()) { MMUI.toast('Não tem permissão de edição no Organigrama.'); return; }
    const E = MMUI.esc; const x = d || { direcaoId: dirId }; const names = (DB.members || []).map((mm) => mm.nome).filter(Boolean).slice(0, 3000);
    let lista = []; try { lista = listFor('departamento'); } catch (_) { /* lista */ }
    const m = MMUI.modal({ title: d ? `Editar departamento — ${d.nome}` : 'Novo departamento', size: 'wide',
      body: `<form class="mm-form" novalidate><div class="mm-grid"><div class="field"><label for="ok_n">Nome do departamento *</label><input id="ok_n" name="nome" list="ok_ll" maxlength="80" required aria-required="true" value="${E(x.nome || '')}" autocomplete="off"><datalist id="ok_ll">${lista.map((n) => `<option value="${E(n)}">`).join('')}</datalist></div>
        <div class="field"><label for="ok_d">Direcção</label><select id="ok_d" name="direcaoId"><option value="">— sem direcção —</option>${MMOrg.dirs().map((o) => `<option value="${E(o.id)}"${o.id === x.direcaoId ? ' selected' : ''}>${E(o.nome)}</option>`).join('')}</select></div>
        <div class="field"><label for="ok_r">Responsável</label><input id="ok_r" name="responsavel" list="ok_nl" maxlength="120" value="${E(x.responsavel || '')}" autocomplete="off"><datalist id="ok_nl">${names.map((n) => `<option value="${E(n)}">`).join('')}</datalist></div>
        <div class="field"><label for="ok_a">Adjunto(a)</label><input id="ok_a" name="adjunto" list="ok_nl" maxlength="120" value="${E(x.adjunto || '')}" autocomplete="off"></div>
        <div class="field"><label for="ok_c">Contacto</label><input id="ok_c" name="contacto" maxlength="40" value="${E(x.contacto || '')}"></div>
        <div class="field"><label for="ok_o">Ordem</label><input id="ok_o" name="ordem" type="number" min="0" step="1" value="${E(x.ordem ?? '')}"></div>
        <div class="field mm-full"><label for="ok_de">Descrição / funções</label><textarea id="ok_de" name="descricao" maxlength="600">${E(x.descricao || '')}</textarea></div></div><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    const F = m.el.querySelector('form'); const err = F.querySelector('.mm-err');
    m.el.querySelector('[data-ok]').addEventListener('click', async () => {
      const nome = MMUI.clean(F.nome.value, 80); if (nome.length < 2) { err.textContent = 'Indique o nome do departamento.'; F.nome.setAttribute('aria-invalid', 'true'); F.nome.focus(); return; }
      if (/[<>]/.test(nome)) { err.textContent = 'O nome não pode conter < ou >.'; return; }
      if (MMOrg.data().departamentos.some((o) => o !== d && MMOrg.norm(o.nome) === MMOrg.norm(nome))) { err.textContent = 'Este departamento já está na estrutura.'; return; }
      if (F.ordem.value !== '' && !(Number(F.ordem.value) >= 0)) { err.textContent = 'A ordem deve ser 0 ou superior.'; return; }
      const rec = { nome, direcaoId: F.direcaoId.value, responsavel: MMUI.clean(F.responsavel.value, 120), adjunto: MMUI.clean(F.adjunto.value, 120), contacto: MMOrg.tel(MMUI.clean(F.contacto.value, 60)), ordem: F.ordem.value === '' ? '' : Number(F.ordem.value), descricao: MMUI.clean(F.descricao.value, 600) };
      // Renomear: pergunta se os membros com o nome antigo devem acompanhar (como em «Listas & Categorias»)
      if (d && MMOrg.norm(d.nome) !== MMOrg.norm(nome)) {
        const L = MMOrg.membersOf(d.nome);
        if (L.length && await MMUI.confirm(`Actualizar também os ${L.length} membros com o departamento «${d.nome}» para «${nome}»?`, 'Actualizar membros')) { L.forEach((mm) => { mm.departamento = nome; }); }
        try { const ls = listFor('departamento'); const i = ls.findIndex((v) => MMOrg.norm(v) === MMOrg.norm(d.nome)); if (i >= 0) ls[i] = nome; } catch (_) { /* lista */ }
      }
      try { const ls = listFor('departamento'); if (!ls.some((v) => MMOrg.norm(v) === MMOrg.norm(nome))) ls.push(nome); } catch (_) { /* lista */ }
      if (d) Object.assign(d, rec); else MMOrg.data().departamentos.push({ id: MMOrg.id(), ...rec });
      if (typeof logActivity === 'function') logActivity(d ? 'Editou' : 'Registou', 'Departamento', nome);
      MMUI.save(); m.close(); MMOrg.render(); MMUI.toast('Departamento guardado.');
    });
  },
  depMembers(d) {
    const E = MMUI.esc; const L = MMOrg.membersOf(d.nome).sort((a, b) => String(a.nome).localeCompare(b.nome, 'pt'));
    MMUI.modal({ title: `${d.nome} — ${L.length} ${L.length === 1 ? 'membro' : 'membros'}`, size: 'wide',
      body: L.length ? `<div class="tbl-scroll"><table class="data-table"><caption class="sr-only">Membros do departamento ${E(d.nome)}</caption><thead><tr><th scope="col">Nome</th><th scope="col">Cargo / função</th><th scope="col">Situação</th><th scope="col">Igreja</th><th scope="col">Contacto</th></tr></thead>
        <tbody>${L.map((mm) => `<tr><td>${E(mm.nome)}</td><td>${E(mm.cargo || mm.funcao || '—')}</td><td>${E(mm.situacao || '—')}</td><td>${E(mm.igreja || '—')}</td><td>${E(mm.tel || '—')}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="mm-help">Nenhum membro tem este departamento na base de dados.</p>', foot: '<button type="button" class="btn gold sm" data-close>Fechar</button>' });
  },
  /** Cria pessoas a partir dos directores e responsáveis da estrutura (sem duplicar). */
  generate() {
    const O = MMOrg.data(); let n = 0;
    const find = (nome) => O.pessoas.find((p) => MMOrg.norm(p.nome) === MMOrg.norm(nome));
    const add = (nome, cargo, parent, depId) => { if (!nome) return null; const cur = find(nome); if (cur) return cur; const p = { id: MMOrg.id(), nome, cargo, parent: parent || '', departamentoId: depId || '', contacto: MMOrg.member(nome)?.tel || '', email: MMOrg.member(nome)?.email || '' }; O.pessoas.push(p); n++; return p; };
    const top = O.pessoas.find((p) => !p.parent) || null;
    MMOrg.dirs().forEach((dr) => { const dp = add(dr.responsavel, `Director(a) — ${dr.nome}`, top?.id, ''); MMOrg.deps().filter((d) => d.direcaoId === dr.id).forEach((d) => add(d.responsavel, `Responsável — ${d.nome}`, dp?.id || top?.id, d.id)); });
    MMOrg.deps().filter((d) => !d.direcaoId).forEach((d) => add(d.responsavel, `Responsável — ${d.nome}`, top?.id, d.id));
    return n;
  },
  exportXlsx() {
    try {
      const O = MMOrg.data(); const wb = XLSX.utils.book_new(); const dir = (id) => MMOrg.byId(O.direcoes, id)?.nome || '';
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(O.pessoas.map((p) => ({ Nome: p.nome, Cargo: p.cargo, Superior: MMOrg.byId(O.pessoas, p.parent)?.nome || '', Departamento: MMOrg.byId(O.departamentos, p.departamentoId)?.nome || '', Contacto: p.contacto || '', Email: p.email || '', Notas: p.notas || '', ...Object.fromEntries(MMFields.list('org').map((f) => [f.label, MMFields.text(f, p[f.key])])) }))), 'Organigrama');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(MMOrg.dirs().map((d) => ({ Direcção: d.nome, Sigla: d.sigla || '', 'Director(a)': d.responsavel || '', Adjunto: d.adjunto || '', Descrição: d.descricao || '' }))), 'Direcções');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(MMOrg.deps().map((d) => ({ Departamento: d.nome, Direcção: dir(d.direcaoId), Responsável: d.responsavel || '', Adjunto: d.adjunto || '', Contacto: d.contacto || '', Membros: MMOrg.membersOf(d.nome).length, Descrição: d.descricao || '' }))), 'Departamentos');
      XLSX.writeFile(wb, `Organigrama_${MMDate.today()}.xlsx`);
    } catch (e) { MMUI.toast(`Exportação falhou: ${e.message}`); }
  }
};

/* Eventos (delegados) */
document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-v14o-tab]'); if (t) { MMOrg.sub = t.dataset.v14oTab; MMOrg.render(); document.getElementById(`v14o-t-${MMOrg.sub}`)?.focus(); return; }
  const b = e.target.closest('[data-v14o]'); if (!b || b.disabled) return;
  const O = MMOrg.data(); const a = b.dataset.v14o; const id = b.dataset.id;
  const needEdit = !['toggle', 'expand', 'collapse', 'print', 'xlsx', 'dep-members'].includes(a);
  if (needEdit && !MMOrg.can()) { MMUI.toast('Não tem permissão de edição no Organigrama.'); return; }
  if (a === 'person-new') MMOrg.personForm(null);
  else if (a === 'person-child') MMOrg.personForm(null, id);
  else if (a === 'person-edit') MMOrg.personForm(MMOrg.byId(O.pessoas, id));
  else if (a === 'person-del') { const p = MMOrg.byId(O.pessoas, id); if (!p) return; const kids = MMOrg.kids(p.id);
    if (!(await MMUI.confirm(`Remover ${p.nome} do organigrama?${kids.length ? ` A equipa (${kids.length}) passa para o superior de ${p.nome}.` : ''}`, 'Remover'))) return;
    kids.forEach((k) => { k.parent = p.parent || ''; }); O.pessoas.splice(O.pessoas.indexOf(p), 1); if (typeof moveToTrash === 'function') moveToTrash('organigrama', p, p.nome); MMUI.save(); MMOrg.render(); }
  else if (a === 'toggle') { if (MMOrg.collapsed.has(id)) MMOrg.collapsed.delete(id); else MMOrg.collapsed.add(id); MMOrg.render(); document.querySelector(`[data-v14o="toggle"][data-id="${CSS.escape(id)}"]`)?.focus(); }
  else if (a === 'expand') { MMOrg.collapsed.clear(); MMOrg.render(); }
  else if (a === 'collapse') { O.pessoas.forEach((p) => { if (MMOrg.kids(p.id).length) MMOrg.collapsed.add(p.id); }); MMOrg.render(); }
  else if (a === 'print') window.print();
  else if (a === 'xlsx') MMOrg.exportXlsx();
  else if (a === 'fields') MMFields.manage('org', 'Campos adicionais do organigrama', () => MMOrg.render());
  else if (a === 'gen') { const n = MMOrg.generate(); MMUI.save(); MMOrg.render(); MMUI.toast(n ? `${n} pessoa(s) acrescentada(s) a partir das Direcções e Departamentos.` : 'Não há directores/responsáveis novos para acrescentar (preencha-os em «Departamentos»).'); }
  else if (a === 'dir-new') MMOrg.dirForm(null);
  else if (a === 'dir-edit') MMOrg.dirForm(MMOrg.byId(O.direcoes, id));
  else if (a === 'dir-del') { const d = MMOrg.byId(O.direcoes, id); if (!d) return; const n = O.departamentos.filter((x) => x.direcaoId === d.id).length;
    if (!(await MMUI.confirm(`Remover a direcção «${d.nome}»?${n ? ` Os ${n} departamentos ficam «sem direcção» (não são eliminados).` : ''}`, 'Remover'))) return;
    O.departamentos.forEach((x) => { if (x.direcaoId === d.id) x.direcaoId = ''; }); O.direcoes.splice(O.direcoes.indexOf(d), 1); if (typeof moveToTrash === 'function') moveToTrash('direcao', d, d.nome); MMUI.save(); MMOrg.render(); }
  else if (a === 'dep-new') MMOrg.depForm(null, b.dataset.dir || '');
  else if (a === 'dep-edit') MMOrg.depForm(MMOrg.byId(O.departamentos, id));
  else if (a === 'dep-del') { const d = MMOrg.byId(O.departamentos, id); if (!d) return;
    if (!(await MMUI.confirm(`Retirar «${d.nome}» da estrutura? Os membros mantêm o departamento na sua ficha.`, 'Retirar'))) return;
    O.departamentos.splice(O.departamentos.indexOf(d), 1); O.pessoas.forEach((p) => { if (p.departamentoId === d.id) p.departamentoId = ''; }); if (typeof moveToTrash === 'function') moveToTrash('departamento', d, d.nome); MMUI.save(); MMOrg.render(); }
  else if (a === 'dep-members') { const d = MMOrg.byId(O.departamentos, id); if (d) MMOrg.depMembers(d); }
  else if (a === 'dep-import') { const L = MMOrg.loose(); L.forEach((nome) => O.departamentos.push({ id: MMOrg.id(), nome, direcaoId: '', responsavel: '', adjunto: '', descricao: '' })); MMUI.save(`${L.length} departamentos acrescentados à estrutura`); MMOrg.render(); MMUI.toast(`${L.length} departamento(s) acrescentado(s). Distribua-os pelas Direcções (✎).`); }
});
document.addEventListener('keydown', (e) => { // setas entre as sub-abas (padrão WAI-ARIA)
  const t = e.target.closest?.('[data-v14o-tab]'); if (!t || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  MMOrg.sub = MMOrg.sub === 'org' ? 'dep' : 'org'; MMOrg.render(); document.getElementById(`v14o-t-${MMOrg.sub}`)?.focus(); e.preventDefault();
});
MMCharts.hooks = [...(MMCharts.hooks || []), (old, neu, id) => { if (MMOrg.charts[id] === old) MMOrg.charts[id] = neu; }];
/* Registo da aba (permissões V8, nomes e ordem do menu) e apresentação ao abrir */
(() => {
  try { if (typeof ALL_TABS !== 'undefined' && !ALL_TABS.some((t) => t.key === 'organigrama')) { const i = ALL_TABS.findIndex((t) => t.key === 'atividades'); ALL_TABS.splice(i + 1, 0, { key: 'organigrama', label: 'Organigrama', builtin: true }); }
    // A ordem do menu já foi aplicada antes de a aba existir: acrescenta-a a seguir a «Atividades» (sem mexer no resto) e volta a ordenar
    const o = DB.settings && DB.settings.branding && DB.settings.branding.tabOrder;
    if (Array.isArray(o) && o.length && !o.includes('organigrama')) { const j = o.indexOf('atividades'); o.splice(j >= 0 ? j + 1 : o.length, 0, 'organigrama'); }
    if (typeof applyTabOrder === 'function') applyTabOrder();
  } catch (e) { console.warn('Organigrama (abas):', e); }
  document.getElementById('nav')?.addEventListener('click', (e) => { const b = e.target.closest('button[data-tab="organigrama"]'); if (b) setTimeout(() => { if (document.getElementById('sec-organigrama')?.classList.contains('active')) MMOrg.render(); }, 0); });
  window.renderOrganigrama = () => MMOrg.render();
})();
