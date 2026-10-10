/* =====================================================================
   V15 — GRÁFICOS PERSONALIZADOS E INDICADORES EM TODAS AS ABAS
   Cada aba tem uma área «Indicadores e gráficos» onde o administrador (ou quem tem
   edição em «Aparência») acrescenta, edita e remove:
     · Indicadores: contagem, soma, média, mínimo, máximo, valores distintos,
       preenchidos ou percentagem que cumpre uma condição — com filtro, prefixo/sufixo e cor;
     · Gráficos: qualquer fonte de dados, agrupada por um campo (ou por ano/mês de uma data),
       com métrica, filtro, séries, tipo, ordenação e número máximo de categorias.
   Os gráficos usam as definições V14 (barra de ferramentas, cores, ocultar valores…).
   As abas sem gráficos recebem gráficos predefinidos (editáveis e removíveis).
   Definições em DB.settings.paineisV15 — nenhum dado existente é alterado.
   ===================================================================== */
const MMP = (() => {
  'use strict';
  const E = MMUI.esc;
  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const ISO = /^\d{4}-\d{2}-\d{2}/;
  const LAB = { nome: 'Nome', genero: 'Género', faixaEtaria: 'Faixa etária', igreja: 'Igreja / Centro', dataNascimento: 'Data de nascimento', estadoCivil: 'Estado civil', nomeConjuge: 'Cônjuge', nacionalidade: 'Nacionalidade', nBi: 'Nº do BI', infEscolar: 'Habilitações', nomePai: 'Nome do pai', nomeMae: 'Nome da mãe', tel: 'Telefone', email: 'E-mail', provincia: 'Província', municipio: 'Município', morada: 'Morada', cargo: 'Cargo', funcao: 'Função', departamento: 'Departamento', situacao: 'Situação', dataSituacao: 'Data da situação', dataBaptismo: 'Data do baptismo', dataConversao: 'Data da conversão', dataRegisto: 'Data de registo', nCartao: 'Nº do cartão', obs: 'Observações', idade: 'Idade', motivo: 'Motivo', dataAplicacao: 'Data de aplicação', dataLevantamento: 'Data de levantamento', observacoes: 'Observações', contacto: 'Contacto', origem: 'Origem', centroOrigem: 'Centro de origem', dataPartida: 'Data de partida', dataRecepcao: 'Data de recepção', dataVisto: 'Data do visto', data: 'Data', dia: 'Dia', homens: 'Homens', mulheres: 'Mulheres', criancas: 'Crianças', obreiros: 'Obreiros', visitas: 'Visitas', ofertas: 'Ofertas', dizimos: 'Dízimos', disciplinar: 'Disciplinar', total: 'Total de presenças', mes: 'Mês', entradas: 'Entradas', saidas: 'Saídas', saldo: 'Saldo', item: 'Item', categoria: 'Categoria', quantidade: 'Quantidade', estado: 'Estado', localizacao: 'Localização', tipo: 'Tipo', responsavel: 'Responsável', local: 'Local', hora: 'Hora', participantes: 'Participantes', orcamento: 'Orçamento', dataProgramada: 'Data programada', dataRealizacao: 'Data de realização', direcao: 'Direcção', membros: 'Nº de membros', campo: 'Campo', preenchidos: 'Preenchidos', percentagem: 'Percentagem', eliminadoPor: 'Eliminado por', eliminadoEm: 'Eliminado em', user: 'Utilizador', action: 'Acção', entity: 'Entidade', perfil: 'Perfil', criadoPor: 'Criado por', criadoEm: 'Criado em' };
  const MET = [['count', 'Contagem de registos'], ['sum', 'Soma de um campo'], ['avg', 'Média de um campo'], ['min', 'Mínimo de um campo'], ['max', 'Máximo de um campo'], ['distinct', 'Valores distintos de um campo'], ['filled', 'Registos com o campo preenchido']];
  const OPS = [['', 'Sem filtro'], ['eq', 'é igual a'], ['ne', 'é diferente de'], ['contains', 'contém'], ['filled', 'está preenchido'], ['empty', 'está vazio'], ['gt', 'é maior que'], ['lt', 'é menor que']];
  const TYPES = [['bar', 'Barras'], ['hbar', 'Barras horizontais'], ['line', 'Linha'], ['doughnut', 'Rosca'], ['pie', 'Circular'], ['polarArea', 'Área polar'], ['radar', 'Radar']];
  const num = (v) => (typeof v === 'number' ? v : v === null || v === undefined || String(v).trim() === '' ? NaN : Number(String(v).replace(/\s/g, '').replace(',', '.')));
  const blank = (v) => { if (v === null || v === undefined) return true; const t = String(v).trim(); return !t || /^(s\/?d|n\/?d|-+|—)$/i.test(t); };
  const norm = (s) => MMFile.norm(s);
  const cfLabel = (k) => { try { for (const sc of ['atividades', 'org']) { const f = MMFields.list(sc).find((x) => x.key === k); if (f) return f.label; } } catch (_) { /* sem campos */ } return null; };
  const label = (k) => { const [fn, f] = k.includes(':') ? k.split(':') : [null, k]; const b = LAB[f] || cfLabel(f) || f.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()); return fn ? `${{ ano: 'Ano', mes: 'Mês', anomes: 'Ano-mês' }[fn]} — ${b}` : b; };

  /* ---------- Fontes de dados ---------- */
  const FILL = ['genero', 'dataNascimento', 'estadoCivil', 'nacionalidade', 'nBi', 'infEscolar', 'tel', 'email', 'provincia', 'municipio', 'morada', 'igreja', 'cargo', 'funcao', 'departamento', 'situacao', 'dataBaptismo', 'dataConversao', 'dataRegisto', 'nCartao'];
  const SRC = {
    membros: { label: 'Membros', rows: () => DB.members || [] },
    convertidos: { label: 'Convertidos', rows: () => DB.convertidos || [] },
    visitantes: { label: 'Visitantes', rows: () => DB.visitantes || [] },
    disciplina: { label: 'Disciplina', rows: () => DB.disciplina || [] },
    cultos: { label: 'Estatística do culto', rows: () => (DB.cultos || []).map((c) => ({ ...c, total: ['homens', 'mulheres', 'criancas'].reduce((t, k) => t + (num(c[k]) || 0), 0) })) },
    financas: { label: 'Finanças (mensal)', rows: () => (DB.financas || []).map((f) => ({ ...f, saldo: (num(f.entradas) || 0) - (num(f.saidas) || 0) })) },
    inventario: { label: 'Inventário', rows: () => DB.inventario || [] },
    atividades: { label: 'Actividades', rows: () => DB.atividades || [] },
    organigrama: { label: 'Organigrama (pessoas)', rows: () => { const O = DB.organigrama || {}; const D = O.departamentos || []; return (O.pessoas || []).map((p) => ({ nome: p.nome, cargo: p.cargo, departamento: (D.find((d) => d.id === p.departamentoId) || {}).nome || '' })); } },
    departamentos: { label: 'Departamentos (estrutura)', rows: () => { const O = DB.organigrama || {}; const R = O.direcoes || []; return (O.departamentos || []).map((d) => ({ departamento: d.nome, direcao: (R.find((x) => x.id === d.direcaoId) || {}).nome || 'Sem direcção', responsavel: d.responsavel || '', membros: (DB.members || []).filter((m) => norm(m.departamento) === norm(d.nome)).length })); } },
    preenchimento: { label: 'Preenchimento dos dados dos membros', rows: () => { const M = DB.members || []; return FILL.map((k) => { const n = M.filter((m) => !blank(m[k])).length; return { campo: label(k), preenchidos: n, percentagem: M.length ? Math.round((n / M.length) * 1000) / 10 : 0 }; }); } },
    lixeira: { label: 'Lixeira', rows: () => (DB.trash || []).map((t) => ({ tipo: (typeof TRASH_LABELS !== 'undefined' && TRASH_LABELS[t.tipo]) || t.tipo, eliminadoPor: t.eliminadoPor, eliminadoEm: String(t.eliminadoEm || '').slice(0, 10) })) },
    auditoria: { label: 'Registo de auditoria', rows: () => (DB.auditLog || []).map((a) => ({ user: a.user, action: a.action, entity: a.entity, data: String(a.ts || '').slice(0, 10) })) },
    utilizadores: { label: 'Utilizadores', rows: () => (DB.users || []).map((u) => ({ nome: u.nome || u.username, perfil: u.perfil || '—', edicao: u.canEdit ? 'Com edição' : 'Só leitura' })) }
  };
  const KNOWN = {
    cultos: [['data', 'date'], ['dia', 'cat'], ['homens', 'num'], ['mulheres', 'num'], ['criancas', 'num'], ['obreiros', 'num'], ['visitas', 'num'], ['ofertas', 'num'], ['dizimos', 'num'], ['total', 'num']],
    inventario: [['item', 'text'], ['categoria', 'cat'], ['quantidade', 'num'], ['estado', 'cat'], ['localizacao', 'cat']],
    atividades: [['tipo', 'cat'], ['departamento', 'cat'], ['responsavel', 'cat'], ['estado', 'cat'], ['local', 'cat'], ['dataProgramada', 'date'], ['dataRealizacao', 'date'], ['participantes', 'num'], ['orcamento', 'num']],
    convertidos: [['genero', 'cat'], ['igreja', 'cat'], ['situacao', 'cat'], ['departamento', 'cat'], ['dataConversao', 'date'], ['dataRegisto', 'date']],
    visitantes: [['origem', 'cat'], ['centroOrigem', 'cat'], ['motivo', 'cat'], ['dataRecepcao', 'date']],
    disciplina: [['igreja', 'cat'], ['motivo', 'cat'], ['dataAplicacao', 'date'], ['dataLevantamento', 'date']],
    lixeira: [['tipo', 'cat'], ['eliminadoPor', 'cat'], ['eliminadoEm', 'date']],
    auditoria: [['user', 'cat'], ['action', 'cat'], ['entity', 'cat'], ['data', 'date']]
  };
  const SKIP = /^(id|foto|eventSnapshots|.*Texto|v14|parent|departamentoId|direcaoId)$/;
  const fieldCache = {};
  const fields = (sk) => {
    const s = SRC[sk]; if (!s) return [];
    const rows = s.rows(); const key = `${sk}|${rows.length}`; if (fieldCache[key]) return fieldCache[key];
    const out = new Map((KNOWN[sk] || []).map(([k, kind]) => [k, kind])); const sample = rows.slice(0, 600); const all = new Set();
    sample.forEach((r) => Object.keys(r || {}).forEach((k) => all.add(k)));
    all.forEach((k) => {
      if (SKIP.test(k) || out.has(k)) return;
      const vals = sample.map((r) => r[k]).filter((v) => !blank(v) && typeof v !== 'object'); if (!vals.length) { out.set(k, 'cat'); return; }
      const n = vals.filter((v) => Number.isFinite(num(v))).length / vals.length; const d = vals.filter((v) => ISO.test(String(v))).length / vals.length; const dist = new Set(vals.map(String)).size;
      out.set(k, d >= 0.6 ? 'date' : n >= 0.8 ? 'num' : (dist <= 80 || dist <= vals.length * 0.5) ? 'cat' : 'text');
    });
    return (fieldCache[key] = [...out].map(([k, kind]) => ({ key: k, kind, label: label(k) })).sort((a, b) => a.label.localeCompare(b.label, 'pt')));
  };
  const groupable = (sk) => fields(sk).flatMap((f) => (f.kind === 'date' ? [{ key: `ano:${f.key}`, label: label(`ano:${f.key}`) }, { key: `mes:${f.key}`, label: label(`mes:${f.key}`) }, { key: `anomes:${f.key}`, label: label(`anomes:${f.key}`) }] : f.kind === 'cat' || f.kind === 'text' ? [f] : [f]));

  /* ---------- Cálculo ---------- */
  const val = (r, key) => {
    if (!key) return '';
    const [fn, f] = key.includes(':') ? key.split(':') : [null, key]; const v = r ? r[f] : undefined;
    if (!fn) return blank(v) ? '' : v;
    const s = ISO.test(String(v ?? '')) ? String(v) : typeof v === 'number' && v > 20000 && v < 80000 ? MMDate.iso(v) : '';
    if (!s) return '';
    return fn === 'ano' ? s.slice(0, 4) : fn === 'mes' ? MONTHS[Number(s.slice(5, 7)) - 1] || '' : fn === 'anomes' ? s.slice(0, 7) : '';
  };
  const cmp = (a, b) => { const x = num(a), y = num(b); return Number.isFinite(x) && Number.isFinite(y) ? x - y : String(a).localeCompare(String(b), 'pt', { numeric: true }); };
  const pass = (r, f) => {
    if (!f || !f.field || !f.op) return true; const v = val(r, f.field); const s = norm(v); const t = norm(f.value);
    switch (f.op) { case 'eq': return s === t; case 'ne': return s !== t; case 'contains': return s.includes(t); case 'filled': return !blank(v); case 'empty': return blank(v); case 'gt': return !blank(v) && cmp(v, f.value) > 0; case 'lt': return !blank(v) && cmp(v, f.value) < 0; default: return true; }
  };
  const agg = (rows, metric, field) => {
    if (metric === 'count') return rows.length;
    if (metric === 'distinct') return new Set(rows.map((r) => val(r, field)).filter((v) => !blank(v)).map(String)).size;
    if (metric === 'filled') return rows.filter((r) => !blank(val(r, field))).length;
    const ns = rows.map((r) => num(val(r, field))).filter(Number.isFinite);
    if (metric === 'sum') return ns.reduce((a, b) => a + b, 0);
    if (metric === 'avg') return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
    if (metric === 'min') return ns.length ? Math.min(...ns) : 0;
    if (metric === 'max') return ns.length ? Math.max(...ns) : 0;
    return 0;
  };
  const rowsOf = (d) => { const s = SRC[d.source]; return s ? s.rows().filter((r) => pass(r, d.filter)) : []; };
  const kpiValue = (d) => { const rows = rowsOf(d); if (d.metric === 'pct') return rows.length ? (rows.filter((r) => pass(r, d.cond)).length / rows.length) * 100 : 0; return agg(rows, d.metric, d.field); };
  const fmt = (v, d) => { const dec = Number.isInteger(d.decimals) ? d.decimals : (d.metric === 'avg' || d.metric === 'pct' ? 1 : 0); return `${d.prefix || ''}${Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: dec, maximumFractionDigits: dec })}${d.suffix || (d.metric === 'pct' ? '%' : '')}`; };
  const labelSort = (a, b) => { const ia = MONTHS.indexOf(a), ib = MONTHS.indexOf(b); if (ia >= 0 && ib >= 0) return ia - ib; if (a === 'Não definido') return 1; if (b === 'Não definido') return -1; return cmp(a, b); };
  const chartData = (d) => {
    const rows = rowsOf(d); const G = new Map();
    rows.forEach((r) => { const g = String(val(r, d.groupBy) || 'Não definido'); if (!G.has(g)) G.set(g, []); G.get(g).push(r); });
    const score = new Map([...G].map(([g, rs]) => [g, agg(rs, d.metric, d.field)]));
    let labels = [...G.keys()]; const timeKey = /^(ano|mes|anomes):/.test(d.groupBy || '') || labels.every((l) => MONTHS.includes(l) || l === 'Não definido');
    labels.sort(d.sort === 'label' || (timeKey && d.sort !== 'desc' && d.sort !== 'asc') ? labelSort : (a, b) => (d.sort === 'asc' ? score.get(a) - score.get(b) : score.get(b) - score.get(a)));
    const top = Math.min(Math.max(Number(d.top) || 15, 3), 50); let rest = [];
    if (labels.length > top) { rest = labels.slice(top); labels = labels.slice(0, top); }
    const additive = ['count', 'sum', 'filled'].includes(d.metric); const restRows = rest.flatMap((g) => G.get(g));
    if (rest.length && additive) labels.push('Outros');
    const grp = (g) => (g === 'Outros' && rest.length ? restRows : G.get(g) || []);
    let datasets;
    if (d.serie) {
      const cnt = new Map(); rows.forEach((r) => { const s = String(val(r, d.serie) || 'Não definido'); cnt.set(s, (cnt.get(s) || 0) + 1); });
      const S = [...cnt].sort((a, b) => b[1] - a[1]).slice(0, 8).map((x) => x[0]);
      datasets = S.map((s) => ({ label: s, data: labels.map((g) => agg(grp(g).filter((r) => String(val(r, d.serie) || 'Não definido') === s), d.metric, d.field)) }));
    } else datasets = [{ label: d.metric === 'count' ? 'Registos' : `${(MET.find((m) => m[0] === d.metric) || ['', ''])[1].split(' ')[0]} — ${label(d.field || '')}`, data: labels.map((g) => agg(grp(g), d.metric, d.field)) }];
    datasets.forEach((s) => { s.data = s.data.map((v) => Math.round(v * 100) / 100); });
    return { labels, datasets, n: rows.length };
  };
  const chartCfg = (d, data) => {
    const pal = MMCharts.palette(); const circ = ['doughnut', 'pie', 'polarArea'].includes(d.type); const type = d.type === 'hbar' ? 'bar' : d.type || 'bar';
    const dl = (k, o) => { try { return typeof dlConfig === 'function' ? dlConfig(k, o) : { display: false }; } catch (_) { return { display: false }; } };
    const ds = data.datasets.map((s, i) => ({ ...s, backgroundColor: circ ? data.labels.map((_, j) => pal[j % pal.length]) : (type === 'line' || type === 'radar' ? `${pal[i % pal.length]}33` : pal[i % pal.length]), borderColor: circ ? '#ffffff' : pal[i % pal.length], borderWidth: circ ? 1 : type === 'line' ? 2 : 0, borderRadius: type === 'bar' ? 3 : 0, tension: 0.25, fill: type === 'radar', stack: d.stacked && d.serie ? 's' : undefined }));
    const vAxis = d.type === 'hbar' ? 'x' : 'y'; const cAxis = d.type === 'hbar' ? 'y' : 'x';
    return { type, data: { labels: data.labels, datasets: ds }, options: { indexAxis: d.type === 'hbar' ? 'y' : 'x', plugins: { legend: { display: circ || ds.length > 1, position: 'bottom' }, datalabels: dl(circ ? 'round' : 'bar', { horizontal: d.type === 'hbar' }) },
      ...(circ ? {} : type === 'radar' ? { scales: { r: { beginAtZero: true } } } : { scales: { [vAxis]: { beginAtZero: true, stacked: !!(d.stacked && d.serie) }, [cAxis]: { stacked: !!(d.stacked && d.serie), ticks: { autoSkip: false, maxRotation: 50 } } } }) } };
  };

  /* ---------- Definições (com predefinidos para as abas sem gráficos) ---------- */
  const PRESETS = {
    charts: [
      ['db-sit', 'database', 'Membros por situação', { source: 'membros', groupBy: 'situacao', type: 'doughnut' }], ['db-faixa', 'database', 'Membros por faixa etária', { source: 'membros', groupBy: 'faixaEtaria', type: 'bar' }],
      ['db-igreja', 'database', 'Membros por igreja / centro', { source: 'membros', groupBy: 'igreja', type: 'hbar' }], ['ani-mes', 'aniversariantes', 'Aniversários por mês', { source: 'membros', groupBy: 'mes:dataNascimento', type: 'bar', sort: 'label', top: 12 }],
      ['reg-disc', 'registos', 'Disciplina por igreja / centro', { source: 'disciplina', groupBy: 'igreja', type: 'hbar' }], ['reg-vis', 'registos', 'Visitantes por origem', { source: 'visitantes', groupBy: 'origem', type: 'doughnut' }],
      ['reg-conv', 'registos', 'Convertidos por igreja / centro', { source: 'convertidos', groupBy: 'igreja', type: 'bar' }], ['qual-fill', 'qualidade', 'Preenchimento dos campos dos membros (%)', { source: 'preenchimento', groupBy: 'campo', metric: 'sum', field: 'percentagem', type: 'hbar', top: 25, wide: true }],
      ['rep-dep', 'reports', 'Membros por departamento', { source: 'membros', groupBy: 'departamento', type: 'hbar', top: 20 }], ['org-dep', 'organigrama', 'Pessoas do organigrama por departamento', { source: 'organigrama', groupBy: 'departamento', type: 'bar' }],
      ['lix-tipo', 'lixeira', 'Registos na Lixeira por tipo', { source: 'lixeira', groupBy: 'tipo', type: 'doughnut' }], ['usr-audit', 'utilizadores', 'Acções registadas por utilizador', { source: 'auditoria', groupBy: 'user', type: 'bar' }],
      ['lst-cargo', 'listas', 'Membros por cargo', { source: 'membros', groupBy: 'cargo', type: 'hbar' }], ['ficha-gen', 'ficha', 'Membros por género', { source: 'membros', groupBy: 'genero', type: 'pie' }]
    ],
    kpis: [
      ['k-idade', 'dashboard', 'Idade média dos membros', { source: 'membros', metric: 'avg', field: 'idade', suffix: ' anos' }], ['k-conv', 'dashboard', 'Convertidos (registo próprio)', { source: 'convertidos', metric: 'count' }],
      ['k-tel', 'database', 'Membros com telefone', { source: 'membros', metric: 'filled', field: 'tel' }], ['k-ativo', 'database', 'Membros activos', { source: 'membros', metric: 'pct', cond: { field: 'situacao', op: 'eq', value: 'Ativo' } }],
      ['k-vis', 'registos', 'Visitantes registados', { source: 'visitantes', metric: 'count' }], ['k-discab', 'registos', 'Disciplinas sem levantamento', { source: 'disciplina', metric: 'count', filter: { field: 'dataLevantamento', op: 'empty' } }],
      ['k-saldo', 'financas', 'Saldo acumulado (entradas − saídas)', { source: 'financas', metric: 'sum', field: 'saldo', suffix: ' Kz' }]
    ]
  };
  const store = () => {
    DB.settings.paineisV15 = DB.settings.paineisV15 || {}; const S = DB.settings.paineisV15;
    S.charts = Array.isArray(S.charts) ? S.charts : []; S.kpis = Array.isArray(S.kpis) ? S.kpis : []; S.fechado = S.fechado || {};
    if (!S.seeded) { PRESETS.charts.forEach(([p, tab, title, o]) => S.charts.push({ id: `p_${p}`, preset: p, tab, title, metric: 'count', ...o })); PRESETS.kpis.forEach(([p, tab, lab, o]) => S.kpis.push({ id: `p_${p}`, preset: p, tab, label: lab, ...o })); S.seeded = true; }
    return S;
  };
  const charts = {};
  MMCharts.hooks = [...(MMCharts.hooks || []), (old, neu, id) => { Object.keys(charts).forEach((k) => { if (charts[k] === old) charts[k] = neu; }); }];
  const can = () => MMCharts.canEdit();
  const activeTab = () => document.querySelector('.section.active')?.id?.replace(/^sec-/, '') || '';
  const srcCaption = (d) => { const s = SRC[d.source]; const f = d.filter && d.filter.field && d.filter.op ? ` · ${label(d.filter.field)} ${(OPS.find((o) => o[0] === d.filter.op) || ['', ''])[1]}${['filled', 'empty'].includes(d.filter.op) ? '' : ` «${d.filter.value}»`}` : ''; return `${s ? s.label : d.source}${f}`; };

  /* ---------- Área em cada aba ---------- */
  const area = (tab) => {
    const sec = document.getElementById(`sec-${tab}`); if (!sec) return null;
    let a = sec.querySelector(':scope > .v15-area'); if (a) return a;
    a = document.createElement('div'); a.className = 'v15-area'; a.dataset.tab = tab;
    const top = sec.querySelector(':scope > .topbar'); const kids = [...sec.children]; let anchor = top;
    for (let i = top ? kids.indexOf(top) + 1 : 0; i < kids.length; i++) { const el = kids[i]; if (el.matches('.v10-tools, [id^="v10-"], [id^="v11-"], .v11-pill, .v14-recover')) anchor = el; else break; }
    if (anchor) anchor.insertAdjacentElement('afterend', a); else sec.prepend(a);
    return a;
  };
  const render = (tab = activeTab()) => {
    try {
      if (!tab || typeof DB === 'undefined' || !DB) return; const a = area(tab); if (!a) return; const S = store();
      const K = S.kpis.filter((d) => d.tab === tab); const C = S.charts.filter((d) => d.tab === tab); const ed = can(); const closed = !!S.fechado[tab];
      Object.keys(charts).filter((k) => charts[k] && charts[k].canvas && a.contains(charts[k].canvas)).forEach((k) => { try { charts[k].destroy(); } catch (_) { /* já destruído */ } delete charts[k]; });
      if (!K.length && !C.length && !ed) { a.innerHTML = ''; a.hidden = true; return; }
      a.hidden = false;
      a.innerHTML = `<div class="v15-bar" role="toolbar" aria-label="Indicadores e gráficos desta aba"><span class="v15-bar-t">Indicadores e gráficos${K.length + C.length ? ` <span class="v15-count">${K.length + C.length}</span>` : ''}</span>
          ${ed ? '<button type="button" class="btn ghost sm" data-v15="kpi-new">+ Indicador</button><button type="button" class="btn ghost sm" data-v15="chart-new">+ Gráfico</button>' : ''}
          ${ed && PRESETS.charts.concat(PRESETS.kpis).some((p) => p[1] === tab) ? '<button type="button" class="btn ghost sm" data-v15="presets">Repor predefinidos</button>' : ''}
          ${K.length + C.length ? `<button type="button" class="btn ghost sm" data-v15="toggle" aria-expanded="${!closed}">${closed ? 'Mostrar' : 'Ocultar'}</button>` : ''}</div>
        <div class="v15-body"${closed ? ' hidden' : ''}>
          ${K.length ? `<div class="kpi-grid v15-kpis">${K.map((d) => `<div class="kpi v15-kpi" data-cor="${E(MMUI.color(d.cor, ''))}"><div class="num">${E(fmt(kpiValue(d), d))}</div><div class="lbl">${E(d.label)}</div><div class="v15-src">${E(srcCaption(d))}</div>
            ${ed ? `<div class="v15-acts"><button type="button" class="mmc-btn" data-v15="kpi-edit" data-id="${E(d.id)}" aria-label="Editar o indicador ${E(d.label)}">✎</button><button type="button" class="mmc-btn mm-danger" data-v15="kpi-del" data-id="${E(d.id)}" aria-label="Remover o indicador ${E(d.label)}">✕</button></div>` : ''}</div>`).join('')}</div>` : ''}
          ${C.length ? `<div class="v15-charts">${C.map((d) => `<div class="card v15-chart${d.wide ? ' wide' : ''}"><div class="v15-chart-h"><h3 class="u-v14-h">${E(d.title)}</h3>
            ${ed ? `<span class="v15-acts"><button type="button" class="mmc-btn" data-v15="chart-edit" data-id="${E(d.id)}" aria-label="Editar a definição do gráfico ${E(d.title)}" title="Definição (fonte, campos, métrica, filtro)">⚙</button><button type="button" class="mmc-btn mm-danger" data-v15="chart-del" data-id="${E(d.id)}" aria-label="Remover o gráfico ${E(d.title)}">✕</button></span>` : ''}</div>
            <p class="v15-src" id="v15s-${E(d.id)}"></p><div class="chart-wrap"><canvas id="v15c-${E(d.id)}"></canvas></div></div>`).join('')}</div>` : ''}</div>`;
      a.querySelectorAll('.v15-kpi[data-cor]').forEach((k) => { if (k.dataset.cor) k.style.setProperty('--kpi-cor', k.dataset.cor); });
      if (!closed) C.forEach((d) => {
        try { const data = chartData(d); const cv = document.getElementById(`v15c-${d.id}`); const cap = document.getElementById(`v15s-${d.id}`);
          if (cap) cap.textContent = `${srcCaption(d)} · ${data.n} ${data.n === 1 ? 'registo' : 'registos'}${data.labels.length ? '' : ' · sem dados para mostrar'}`;
          if (cv) charts[d.id] = new Chart(cv, chartCfg(d, data));
        } catch (e) { console.warn('Gráfico personalizado', d.id, e); }
      });
    } catch (e) { console.error('Painéis V15:', e); }
  };

  /* ---------- Formulários ---------- */
  const opts = (list, cur, empty) => `${empty ? `<option value="">${E(empty)}</option>` : ''}${list.map((o) => `<option value="${E(o[0])}"${o[0] === cur ? ' selected' : ''}>${E(o[1])}</option>`).join('')}`;
  const srcOpts = (cur) => opts(Object.entries(SRC).map(([k, s]) => [k, s.label]), cur);
  const fOpts = (sk, cur, kinds, empty) => opts(fields(sk).filter((f) => !kinds || kinds.includes(f.kind)).map((f) => [f.key, f.label]), cur, empty);
  const gOpts = (sk, cur, empty) => opts(groupable(sk).map((f) => [f.key, f.label]), cur, empty);
  const filterHTML = (p, f, sk) => `<fieldset class="mm-fs"><legend>${p === 'c' ? 'Condição da percentagem (ex.: Situação é igual a Ativo)' : 'Filtro (opcional)'}</legend><div class="mm-grid c3">
      <div class="field"><label for="v15${p}f">Campo</label><select id="v15${p}f" name="${p}field">${gOpts(sk, f && f.field, '—')}</select></div>
      <div class="field"><label for="v15${p}o">Operador</label><select id="v15${p}o" name="${p}op">${opts(OPS, (f && f.op) || '')}</select></div>
      <div class="field"><label for="v15${p}v">Valor</label><input id="v15${p}v" name="${p}value" maxlength="80" value="${E((f && f.value) || '')}" list="v15${p}l" autocomplete="off"><datalist id="v15${p}l"></datalist></div></div></fieldset>`;
  const fillValues = (F, p, sk) => { const fld = F[`${p}field`] && F[`${p}field`].value; const dl = F.querySelector(`#v15${p}l`); if (!dl) return; const vals = fld ? [...new Set(SRC[sk].rows().map((r) => val(r, fld)).filter((v) => !blank(v)).map(String))].slice(0, 200) : []; dl.innerHTML = vals.map((v) => `<option value="${E(v)}">`).join(''); };
  const readFilter = (F, p) => { const field = F[`${p}field`].value; const op = F[`${p}op`].value; const value = MMUI.clean(F[`${p}value`].value, 80); return field && op ? { field, op, value } : null; };
  const checkFilter = (f, what) => { if (!f) return ''; if (['eq', 'ne', 'contains', 'gt', 'lt'].includes(f.op) && !f.value) return `${what}: indique o valor.`; if (/[<>]/.test(f.value)) return `${what}: o valor não pode conter < ou >.`; return ''; };
  const needsField = (m) => !['count', 'pct'].includes(m);

  const chartForm = (d, tab) => {
    if (!can()) { MMCharts.deny(); return; }
    const x = d ? JSON.parse(JSON.stringify(d)) : { tab, source: 'membros', groupBy: 'situacao', metric: 'count', type: 'bar', top: 15, sort: 'desc' };
    const m = MMUI.modal({ title: d ? `Definição — ${d.title}` : 'Novo gráfico personalizado', size: 'wide',
      body: `<form class="mm-form" novalidate><div class="mm-grid">
        <div class="field mm-full"><label for="v15t">Título *</label><input id="v15t" name="title" maxlength="80" required aria-required="true" value="${E(x.title || '')}"></div>
        <div class="field"><label for="v15s">Fonte de dados</label><select id="v15s" name="source">${srcOpts(x.source)}</select></div>
        <div class="field"><label for="v15g">Agrupar por *</label><select id="v15g" name="groupBy">${gOpts(x.source, x.groupBy)}</select></div>
        <div class="field"><label for="v15se">Separar em séries por</label><select id="v15se" name="serie">${gOpts(x.source, x.serie, '— uma só série —')}</select></div>
        <div class="field"><label for="v15m">Métrica</label><select id="v15m" name="metric">${opts(MET, x.metric)}</select></div>
        <div class="field"><label for="v15fd">Campo da métrica</label><select id="v15fd" name="field">${fOpts(x.source, x.field, null, '—')}</select></div>
        <div class="field"><label for="v15ty">Tipo</label><select id="v15ty" name="type">${opts(TYPES, x.type)}</select></div>
        <div class="field"><label for="v15o">Ordenar</label><select id="v15o" name="sort">${opts([['desc', 'Maior valor primeiro'], ['asc', 'Menor valor primeiro'], ['label', 'Por nome / cronológica']], x.sort || 'desc')}</select></div>
        <div class="field"><label for="v15n">Máximo de categorias (3–50)</label><input id="v15n" name="top" type="number" min="3" max="50" step="1" value="${E(x.top || 15)}"></div>
        <div class="field"><label for="v15tab">Mostrar na aba</label><select id="v15tab" name="tab">${opts(TABS(), x.tab)}</select></div></div>
        ${filterHTML('f', x.filter, x.source)}
        <label class="mm-check"><input type="checkbox" name="wide"${x.wide ? ' checked' : ''}> Ocupar a largura toda</label><label class="mm-check"><input type="checkbox" name="stacked"${x.stacked ? ' checked' : ''}> Empilhar as séries (barras)</label>
        <h4 class="mm-h4">Pré-visualização</h4><p class="mm-help" data-prev-info></p><div class="chart-wrap v15-prev"><canvas aria-label="Pré-visualização do gráfico" role="img"></canvas></div><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar gráfico</button>' });
    const F = m.el.querySelector('form'); let prev = null;
    const collect = () => ({ ...x, title: MMUI.clean(F.title.value, 80), source: F.source.value, groupBy: F.groupBy.value, serie: F.serie.value || '', metric: F.metric.value, field: F.field.value || '', type: F.type.value, sort: F.sort.value, top: Math.round(Number(F.top.value) || 15), tab: F.tab.value, filter: readFilter(F, 'f'), wide: F.wide.checked, stacked: F.stacked.checked });
    const preview = () => {
      try { const d2 = collect(); F.field.closest('.field').classList.toggle('is-dim', !needsField(d2.metric)); fillValues(F, 'f', d2.source);
        if (prev) prev.destroy(); const data = chartData(d2); F.querySelector('[data-prev-info]').textContent = `${data.n} registos · ${data.labels.length} categorias`;
        prev = new MMCharts.Base(F.querySelector('.v15-prev canvas'), { ...chartCfg(d2, data), options: { ...chartCfg(d2, data).options, animation: false, responsive: true, maintainAspectRatio: false } });
      } catch (e) { F.querySelector('[data-prev-info]').textContent = `Pré-visualização indisponível: ${e.message}`; }
    };
    F.source.addEventListener('change', () => { const sk = F.source.value; F.groupBy.innerHTML = gOpts(sk, ''); F.serie.innerHTML = gOpts(sk, '', '— uma só série —'); F.field.innerHTML = fOpts(sk, '', null, '—'); F.ffield.innerHTML = gOpts(sk, '', '—'); preview(); });
    F.addEventListener('change', (e) => { if (e.target !== F.source) preview(); });
    F.addEventListener('input', (e) => { if (e.target.name === 'fvalue' || e.target.name === 'top') { clearTimeout(F._t); F._t = setTimeout(preview, 250); } });
    preview();
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      const d2 = collect(); const err = F.querySelector('.mm-err');
      const fail = (msg, el) => { err.textContent = msg; if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); } };
      if (d2.title.length < 2) return fail('Indique o título do gráfico.', F.title); if (/[<>]/.test(d2.title)) return fail('O título não pode conter < ou >.', F.title);
      if (!d2.groupBy) return fail('Escolha o campo pelo qual agrupar.', F.groupBy);
      if (needsField(d2.metric) && !d2.field) return fail('Esta métrica precisa do campo da métrica.', F.field);
      if (['sum', 'avg', 'min', 'max'].includes(d2.metric) && !fields(d2.source).some((f) => f.key === d2.field && f.kind === 'num')) return fail('Para soma, média, mínimo ou máximo escolha um campo numérico.', F.field);
      if (d2.top < 3 || d2.top > 50) return fail('O máximo de categorias deve estar entre 3 e 50.', F.top);
      const fe = checkFilter(d2.filter, 'Filtro'); if (fe) return fail(fe, F.fvalue);
      const S = store(); if (d) Object.assign(d, d2); else S.charts.push({ ...d2, id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` });
      if (prev) prev.destroy(); m.close(); MMUI.save(`Gráfico personalizado «${d2.title}»`); render(); MMUI.toast('Gráfico guardado.');
    });
    m.el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { if (prev) prev.destroy(); }));
  };

  const kpiForm = (d, tab) => {
    if (!can()) { MMCharts.deny(); return; }
    const x = d ? JSON.parse(JSON.stringify(d)) : { tab, source: 'membros', metric: 'count' };
    const MK = [...MET, ['pct', 'Percentagem que cumpre uma condição']];
    const m = MMUI.modal({ title: d ? `Indicador — ${d.label}` : 'Novo indicador', size: 'wide',
      body: `<form class="mm-form" novalidate><div class="mm-grid">
        <div class="field mm-full"><label for="v15kl">Nome do indicador *</label><input id="v15kl" name="label" maxlength="80" required aria-required="true" value="${E(x.label || '')}"></div>
        <div class="field"><label for="v15ks">Fonte de dados</label><select id="v15ks" name="source">${srcOpts(x.source)}</select></div>
        <div class="field"><label for="v15km">Cálculo</label><select id="v15km" name="metric">${opts(MK, x.metric)}</select></div>
        <div class="field"><label for="v15kf">Campo</label><select id="v15kf" name="field">${fOpts(x.source, x.field, null, '—')}</select></div>
        <div class="field"><label for="v15kp">Prefixo</label><input id="v15kp" name="prefix" maxlength="10" value="${E(x.prefix || '')}"></div>
        <div class="field"><label for="v15ku">Sufixo (ex.: Kz, %, anos)</label><input id="v15ku" name="suffix" maxlength="12" value="${E(x.suffix || '')}"></div>
        <div class="field"><label for="v15kd">Casas decimais</label><input id="v15kd" name="decimals" type="number" min="0" max="3" step="1" value="${E(Number.isInteger(x.decimals) ? x.decimals : '')}" placeholder="automático"></div>
        <div class="field"><label for="v15kc">Cor de destaque</label><input id="v15kc" name="cor" type="color" value="${E(MMUI.color(x.cor, '#b8892b'))}"></div>
        <div class="field"><label for="v15kt">Mostrar na aba</label><select id="v15kt" name="tab">${opts(TABS(), x.tab)}</select></div></div>
        ${filterHTML('f', x.filter, x.source)}<div data-cond>${filterHTML('c', x.cond, x.source)}</div>
        <p class="v15-kprev" aria-live="polite"></p><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar indicador</button>' });
    const F = m.el.querySelector('form');
    const collect = () => ({ ...x, label: MMUI.clean(F.label.value, 80), source: F.source.value, metric: F.metric.value, field: F.field.value || '', prefix: MMUI.clean(F.prefix.value, 10), suffix: F.suffix.value.replace(/[<>]/g, '').slice(0, 12), decimals: F.decimals.value === '' ? undefined : Math.min(3, Math.max(0, Math.round(Number(F.decimals.value)))), cor: MMUI.color(F.cor.value, ''), tab: F.tab.value, filter: readFilter(F, 'f'), cond: readFilter(F, 'c') });
    const upd = () => { const d2 = collect(); F.querySelector('[data-cond]').hidden = d2.metric !== 'pct'; F.field.closest('.field').classList.toggle('is-dim', !needsField(d2.metric)); fillValues(F, 'f', d2.source); fillValues(F, 'c', d2.source);
      try { F.querySelector('.v15-kprev').textContent = `Valor actual: ${fmt(kpiValue(d2), d2)}`; } catch (e) { F.querySelector('.v15-kprev').textContent = ''; } };
    F.source.addEventListener('change', () => { const sk = F.source.value; F.field.innerHTML = fOpts(sk, '', null, '—'); F.ffield.innerHTML = gOpts(sk, '', '—'); F.cfield.innerHTML = gOpts(sk, '', '—'); upd(); });
    F.addEventListener('change', (e) => { if (e.target !== F.source) upd(); }); F.addEventListener('input', () => { clearTimeout(F._t); F._t = setTimeout(upd, 250); }); upd();
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      const d2 = collect(); const err = F.querySelector('.mm-err'); const fail = (msg, el) => { err.textContent = msg; if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); } };
      if (d2.label.length < 2) return fail('Indique o nome do indicador.', F.label); if (/[<>]/.test(d2.label + d2.prefix)) return fail('O nome e o prefixo não podem conter < ou >.', F.label);
      if (needsField(d2.metric) && !d2.field) return fail('Este cálculo precisa de um campo.', F.field);
      if (['sum', 'avg', 'min', 'max'].includes(d2.metric) && !fields(d2.source).some((f) => f.key === d2.field && f.kind === 'num')) return fail('Para soma, média, mínimo ou máximo escolha um campo numérico.', F.field);
      if (d2.metric === 'pct' && !d2.cond) return fail('Defina a condição da percentagem (campo e operador).', F.cfield);
      const fe = checkFilter(d2.filter, 'Filtro') || checkFilter(d2.cond, 'Condição'); if (fe) return fail(fe);
      if (d2.metric !== 'pct') delete d2.cond;
      const S = store(); if (d) Object.assign(d, d2); else S.kpis.push({ ...d2, id: `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` });
      m.close(); MMUI.save(`Indicador «${d2.label}»`); render(); MMUI.toast('Indicador guardado.');
    });
  };
  const TABS = () => { try { return ALL_TABS.map((t) => [t.key, (DB.settings.branding && DB.settings.branding.tabLabels && DB.settings.branding.tabLabels[t.key]) || t.label]); } catch (_) { return [['dashboard', 'Painel']]; } };

  /* ---------- Eventos ---------- */
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-v15]'); if (!b || b.disabled) return;
    const a = b.dataset.v15; const tab = b.closest('.v15-area')?.dataset.tab || activeTab(); const S = store(); const id = b.dataset.id;
    if (a === 'toggle') { S.fechado[tab] = !S.fechado[tab]; MMUI.save(); render(tab); return; }
    if (!can()) { MMCharts.deny(); return; }
    if (a === 'chart-new') chartForm(null, tab); else if (a === 'kpi-new') kpiForm(null, tab);
    else if (a === 'chart-edit') chartForm(S.charts.find((d) => d.id === id), tab); else if (a === 'kpi-edit') kpiForm(S.kpis.find((d) => d.id === id), tab);
    else if (a === 'chart-del' || a === 'kpi-del') {
      const list = a === 'chart-del' ? S.charts : S.kpis; const d = list.find((x) => x.id === id); if (!d) return;
      if (!(await MMUI.confirm(`Remover «${d.title || d.label}» desta aba? Os dados não são afectados.`, 'Remover'))) return;
      list.splice(list.indexOf(d), 1); MMUI.save(`Removeu «${d.title || d.label}»`); render(tab);
    } else if (a === 'presets') {
      let n = 0; PRESETS.charts.filter((p) => p[1] === tab && !S.charts.some((d) => d.preset === p[0])).forEach(([p, t, title, o]) => { S.charts.push({ id: `p_${p}`, preset: p, tab: t, title, metric: 'count', ...o }); n++; });
      PRESETS.kpis.filter((p) => p[1] === tab && !S.kpis.some((d) => d.preset === p[0])).forEach(([p, t, lab, o]) => { S.kpis.push({ id: `p_${p}`, preset: p, tab: t, label: lab, ...o }); n++; });
      MMUI.save('Predefinidos repostos'); render(tab); MMUI.toast(n ? `${n} elemento(s) predefinido(s) reposto(s).` : 'Os predefinidos desta aba já estão todos presentes.');
    }
  });
  const install = () => {
    store();
    // Desenha a área sempre que uma aba fica activa (menu, palavra-passe das abas protegidas, atalhos…)
    const main = document.querySelector('main.main') || document.body;
    new MutationObserver((ms) => ms.forEach((m) => { const el = m.target; if (el.classList && el.classList.contains('section') && el.classList.contains('active') && !String(m.oldValue || '').split(/\s+/).includes('active')) setTimeout(() => render(el.id.replace(/^sec-/, '')), 40); }))
      .observe(main, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
    const s0 = window.saveDB; let t = null; let busy = false;
    window.saveDB = function (...args) { const r = s0.apply(this, args); if (!busy) { clearTimeout(t); t = setTimeout(() => { busy = true; try { render(); } finally { busy = false; } }, 350); } return r; };
    render();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(install, 150)); else setTimeout(install, 150);
  return { render, store, chartData, kpiValue, fields, SRC };
})();
