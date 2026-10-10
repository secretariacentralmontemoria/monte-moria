/* Registo do plugin de rótulos dos gráficos (desligado por omissão; cada gráfico decide). */
Chart.register(ChartDataLabels); Chart.defaults.set("plugins.datalabels", {display:false});
/* ============================================================
   Centro Monte Moriá — Sistema de Gestão de Membros
   ============================================================ */

/* ---------- 0. Carregar dados semente (base64 -> JSON) ---------- */
function b64ToUtf8(b64){
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}
const SEED = JSON.parse(b64ToUtf8(String(window.MM_SEED_B64 || document.getElementById('seed-b64')?.textContent || '').trim()));
const LOGO_B64 = String(window.MM_LOGO_B64 || document.getElementById('logo-b64')?.textContent || '').trim();
const DEFAULT_LOGO_SRC = 'data:image/png;base64,' + LOGO_B64;
function currentLogoSrc(){ return (DB.settings.branding && DB.settings.branding.logo) || DEFAULT_LOGO_SRC; }

const STORAGE_KEY = 'monteMoriaDB_v1';
const SESSION_KEY = 'monteMoriaSession_v1';
const DEFAULT_ADMIN_PASSWORD = '';
function today(){ return new Date(); }

const LIST_DEFAULTS = {
  departamento: [],
  cargo: [],
  funcao: ['SECRETÁRIO (A)','VICE-SECRETÁRIO(A)','TESOUREIRO (A)','VICE-TESOUREIRO (A)','LÍDER','VICE-LIDER','CONSELHEIRO (A)','CORISTA','LEVITA','CRENTE','LIDER_DEP','VICE_LID_DEP','OBREIRO','COPERADOR (A)','MEMBRO','PROFESSOR','PROTOCOLO','DIRIGENTE'],
  igreja: ['CENTRO M.MORIÁ','CONG_CENÁCULO FÉ','CONG_MONTE SINAI','CONG_TABERNÁCULO DAVI','CONG_ARCA NOÉ','CONG_KM54'],
  situacao: ['Ativo','Ausente','Suspenso','Transferido','Em Disciplina','Falecido(a)','Enfermo(a)','Pendente','Não definido'],
  estadoCivil: ['Solteiro(a)','Casado(a)','Viúvo(a)','Divorciado(a)'],
};
function listFor(key){
  DB.settings.lists = DB.settings.lists || {};
  if (!DB.settings.lists[key]) DB.settings.lists[key] = (LIST_DEFAULTS[key]||[]).slice();
  return DB.settings.lists[key];
}

let ALL_TABS = [
  {key:'dashboard', label:'Painel', builtin:true}, {key:'database', label:'Base de Dados', builtin:true},
  {key:'aniversariantes', label:'Aniversariantes', builtin:true},
  {key:'ficha', label:'Ficha Individual', builtin:true}, {key:'reports', label:'Relatórios', builtin:true},
  {key:'financas', label:'Finanças', builtin:true}, {key:'registos', label:'Disciplina & Visitantes', builtin:true},
  {key:'qualidade', label:'Qualidade dos Dados', builtin:true}, {key:'cultos', label:'Estatística do Culto', builtin:true},
  {key:'inventario', label:'Inventário', builtin:true}, {key:'atividades', label:'Atividades', builtin:true},
  {key:'ajuda', label:'Tutorial / Ajuda', builtin:true}, {key:'lixeira', label:'Lixeira', builtin:true},
  {key:'utilizadores', label:'Utilizadores', builtin:true}, {key:'listas', label:'Listas & Categorias', builtin:true},
  {key:'aparencia', label:'Aparência', builtin:true},
];
function getCustomTabs(){ return (DB && DB.settings && DB.settings.customTabs) || []; }
function syncAllTabs(){
  const base = ALL_TABS.filter(t=>t.builtin);
  const customs = getCustomTabs().map(t=>({key:t.key, label:t.label, builtin:false, custom:true}));
  ALL_TABS = base.concat(customs);
}

let DB = null; // { members, disciplina, visitantes, financas, financasCongregacoes, cultos, inventario, atividades, trash, users, settings, dashboardConfig }

function loadDB(){
  const raw = localStorage.getItem(STORAGE_KEY);
  let d = null;
  if (raw){
    try{ d = JSON.parse(raw); }catch(e){ d = null; }
  }
  if (!d){
    d = {
      members: JSON.parse(JSON.stringify(SEED.members)),
      disciplina: JSON.parse(JSON.stringify(SEED.disciplina)),
      visitantes: JSON.parse(JSON.stringify(SEED.visitantes)),
      financas: JSON.parse(JSON.stringify(SEED.financas)),
      financasCongregacoes: JSON.parse(JSON.stringify(SEED.financasCongregacoes)),
      cultos: JSON.parse(JSON.stringify(SEED.cultos)),
      inventario: JSON.parse(JSON.stringify(SEED.inventario)),
      atividades: JSON.parse(JSON.stringify(SEED.atividades)),
    };
  }
  d.financasCongregacoes = d.financasCongregacoes || JSON.parse(JSON.stringify(SEED.financasCongregacoes));
  d.cultos = d.cultos || [];
  d.inventario = d.inventario || [];
  d.atividades = d.atividades || [];
  d.convertidos = Array.isArray(d.convertidos) ? d.convertidos : [];
  d.trash = d.trash || [];
  d.users = d.users || [];
  d.settings = d.settings || {};
  d.settings.adminPassword = d.settings.adminPassword || DEFAULT_ADMIN_PASSWORD;
  d.dashboardConfig = d.dashboardConfig || { charts:{}, customCharts:[] };
  d.dashboardConfig.charts = d.dashboardConfig.charts || {};
  d.dashboardConfig.customCharts = d.dashboardConfig.customCharts || [];
  d.auditLog = d.auditLog || [];
  d.settings.branding = d.settings.branding || {};
  d.settings.branding.tabLabels = d.settings.branding.tabLabels || {};
  d.settings.branding.tabHidden = d.settings.branding.tabHidden || {};
  d.settings.customTabs = Array.isArray(d.settings.customTabs) ? d.settings.customTabs : [];
  d.settings.lists = d.settings.lists || {};
  if (!d.settings.lists.departamento || !d.settings.lists.departamento.length) d.settings.lists.departamento = uniqueVals(d.members,'departamento');
  if (!d.settings.lists.cargo || !d.settings.lists.cargo.length) d.settings.lists.cargo = uniqueVals(d.members,'cargo');
  Object.keys(LIST_DEFAULTS).forEach(k=>{
    if (!d.settings.lists[k]) d.settings.lists[k] = LIST_DEFAULTS[k].slice();
  });
  return d;
}
function saveDB(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
}
DB = loadDB();
syncAllTabs();
function baseTabLabel(tab){ return (tab && tab.label) || ''; }
function displayTabLabel(tab){
  const custom = getCustomTabs().find(x=>x.key===tab.key);
  if (custom) return custom.label || tab.label;
  return (DB.settings.branding.tabLabels && DB.settings.branding.tabLabels[tab.key]) || tab.label;
}
function isTabHidden(key){
  return !!(DB.settings.branding.tabHidden && DB.settings.branding.tabHidden[key]);
}
function setNavButtonLabel(btn, label){
  if (!btn) return;
  const textNode = Array.from(btn.childNodes).find(n=>n.nodeType===3 && n.textContent.trim());
  if (textNode) textNode.textContent='\n        '+label+'\n      ';
  else if (!btn.querySelector('.nav-label')) btn.insertAdjacentHTML('beforeend', '<span class="nav-label"></span>');
  const span=btn.querySelector('.nav-label'); if(span) span.textContent=label;
}
function renderCustomSections(){
  const main=document.querySelector('main.main');
  if(!main) return;
  main.querySelectorAll('.section.custom-section').forEach(s=>s.remove());
  getCustomTabs().forEach(t=>{
    const sec=document.createElement('section');
    sec.className='section custom-section'; sec.id='sec-'+t.key;
    sec.innerHTML=`<div class="topbar"><div><h2>${esc(t.label||'Nova Aba')}</h2><div class="sub">Aba personalizada da administração</div></div><div class="topbar-actions"><span class="badge muted">Personalizada</span></div></div><div class="card"><div class="u-892d88">${esc(t.content||'Sem conteúdo definido. Abra Aparência para editar esta aba.')}</div></div>`;
    main.appendChild(sec);
  });
}
function applyBranding(){
  const b = DB.settings.branding;
  document.getElementById('brand-logo').src = currentLogoSrc();
  document.querySelector('.brand h1').textContent = b.nome || 'Centro Monte Moriá';
  document.querySelector('.brand p').textContent = b.subtitulo || 'Assembleia de Deus Pentecostal · Betel-Luanda';
  syncAllTabs();
  document.querySelectorAll('#nav button[data-tab]').forEach(btn=>{
    const tab=ALL_TABS.find(t=>t.key===btn.dataset.tab);
    if(tab) setNavButtonLabel(btn, displayTabLabel(tab));
    btn.style.display = isTabHidden(btn.dataset.tab) ? 'none' : '';
  });
  renderCustomSections();
  applyTheme();
  applyTabOrder();
}
const THEME_PRESETS = {
  dourado: { label:'Dourado & Marinho (padrão)', navy:'#12213A', navy2:'#1E3350', gold:'#B8892B', goldSoft:'#E7D6AA' },
  verde:   { label:'Verde Institucional',        navy:'#153327', navy2:'#1F4A38', gold:'#4C9A6B', goldSoft:'#CFE9D9' },
  azul:    { label:'Azul Institucional',         navy:'#0F2A4A', navy2:'#173E68', gold:'#3E7FB8', goldSoft:'#CFE1F0' },
  bordo:   { label:'Vermelho Bordô',             navy:'#3A1420', navy2:'#4E1C2C', gold:'#A6472A', goldSoft:'#EBD3CB' },
  roxo:    { label:'Roxo Real',                  navy:'#241A3A', navy2:'#33254E', gold:'#7C5CA6', goldSoft:'#DFD3EC' },
};
function applyTheme(){
  const key = DB.settings.branding.theme || 'dourado';
  const t = THEME_PRESETS[key] || THEME_PRESETS.dourado;
  const root = document.documentElement.style;
  root.setProperty('--navy', t.navy); root.setProperty('--navy-2', t.navy2); root.setProperty('--gold', t.gold); root.setProperty('--gold-soft', t.goldSoft);
}
function applyTabOrder(){
  const saved = DB.settings.branding.tabOrder;
  const defaultKeys = ALL_TABS.map(t=>t.key).filter(k=>!['lixeira','utilizadores','listas','aparencia'].includes(k));
  let order = (Array.isArray(saved) && saved.length ? saved.slice() : defaultKeys.slice());
  order = order.filter(k=>ALL_TABS.some(t=>t.key===k));
  ALL_TABS.forEach(t=>{ if(!order.includes(t.key) && !['lixeira','utilizadores','listas','aparencia'].includes(t.key)) order.push(t.key); });
  const nav=document.getElementById('nav');
  if(!nav) return;
  nav.querySelectorAll('.sec-label').forEach(el=>el.remove());
  order.forEach(key=>{ const btn=nav.querySelector(`button[data-tab="${key}"]`); if(btn && !isTabHidden(key)) nav.appendChild(btn); });
  ['lixeira','utilizadores','listas','aparencia'].forEach(key=>{ const btn=nav.querySelector(`button[data-tab="${key}"]`); if(btn && !isTabHidden(key)) nav.appendChild(btn); });
}
applyBranding();

/* ---------- Sessão / Utilizadores ---------- */
function getSession(){
  try{ return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }catch(e){ return null; }
}
function setSession(username){
  if (username) sessionStorage.setItem(SESSION_KEY, JSON.stringify({username}));
  else sessionStorage.removeItem(SESSION_KEY);
}
function currentSessionUser(){
  const s = getSession();
  if (!s) return null;
  if (s.username === 'admin') return { username:'admin', nome:'Administrador', tabs: ALL_TABS.map(t=>t.key), canEdit:true, isAdmin:true };
  return DB.users.find(u=>u.username===s.username) || null;
}
function isLoggedIn(){ return !!currentSessionUser(); }
function hasTabPermission(tabKey){
  const u = currentSessionUser();
  if (!u) return true; // modo convidado — vê tudo, ações sensíveis pedem password
  return u.tabs.includes(tabKey);
}
function canEditNow(){
  const u = currentSessionUser();
  if (!u) return true; // convidado pode tentar, password decide
  return !!u.canEdit;
}
function renderSessionIndicator(){
  const box = document.getElementById('session-indicator');
  const u = currentSessionUser();
  if (u){
    box.innerHTML = `<div class="u-4529f5 badge ${u.isAdmin?'ok':'warn'}">${u.isAdmin?'👑':'👤'} ${esc(u.username)}</div><button class="u-6d5673 btn ghost sm" id="btn-logout">Terminar Sessão</button>`;
    document.getElementById('btn-logout').addEventListener('click', ()=>{
      logActivity('Terminou sessão', 'Sistema', u.username);
      setSession(null);
      toast('Sessão terminada. Modo Convidado ativo.');
      applyNavPermissions();
      renderSessionIndicator();
    });
  } else {
    box.innerHTML = `<div class="u-4529f5 badge muted">Convidado</div><button class="u-6d5673 btn ghost sm" id="btn-login-open">Iniciar Sessão</button>`;
    document.getElementById('btn-login-open').addEventListener('click', ()=>{
      const sel = document.getElementById('login-username');
      sel.innerHTML = '<option value="admin">Administrador</option>' + DB.users.map(u=>`<option value="${esc(u.username)}">${esc(u.username)}${u.perfil?' — '+esc(u.perfil):''}</option>`).join('');
      document.getElementById('login-password').value = '';
      document.getElementById('login-error').style.display = 'none';
      document.getElementById('modal-login').classList.add('open');
      setTimeout(()=>document.getElementById('login-password').focus(), 50);
    });
  }
}
document.getElementById('btn-login-confirm').addEventListener('click', ()=>{
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  let ok = false;
  if (u === 'admin' && p === DB.settings.adminPassword) ok = true;
  else {
    const user = DB.users.find(x=>x.username===u && x.password===p);
    if (user) ok = true;
  }
  if (ok){
    setSession(u);
    logActivity('Iniciou sessão', 'Sistema', u);
    document.getElementById('modal-login').classList.remove('open');
    toast('Sessão iniciada como ' + u + '.');
    applyNavPermissions();
    renderSessionIndicator();
    document.querySelector('.nav button[data-tab="dashboard"]').click();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
});
document.getElementById('login-password').addEventListener('keydown', (e)=>{ if (e.key==='Enter') document.getElementById('btn-login-confirm').click(); });
function applyNavPermissions(){
  document.querySelectorAll('#nav button[data-tab]').forEach(btn=>{
    const allowed = hasTabPermission(btn.dataset.tab);
    btn.style.display = allowed ? '' : 'none';
  });
  // se a aba ativa deixou de ser permitida, volta ao painel
  const activeBtn = document.querySelector('#nav button.active');
  if (activeBtn && activeBtn.style.display==='none'){
    document.querySelector('.nav button[data-tab="dashboard"]').click();
  }
}

/* ---------- Palavra-passe (proteção de ações sensíveis) ---------- */
const unlockedZones = new Set();
let pendingPasswordCallback = null;
function requirePassword(zone, reason, onSuccess){
  if (unlockedZones.has(zone)){ onSuccess(); return; }
  document.getElementById('pw-reason').textContent = reason || 'Esta ação requer a palavra-passe de administração.';
  document.getElementById('pw-input').value = '';
  document.getElementById('pw-error').style.display = 'none';
  pendingPasswordCallback = { zone, onSuccess };
  document.getElementById('modal-password').classList.add('open');
  setTimeout(()=>document.getElementById('pw-input').focus(), 50);
}
document.getElementById('btn-pw-confirm').addEventListener('click', ()=>{
  const val = document.getElementById('pw-input').value;
  if (val === DB.settings.adminPassword){
    document.getElementById('modal-password').classList.remove('open');
    if (pendingPasswordCallback){
      unlockedZones.add(pendingPasswordCallback.zone);
      const cb = pendingPasswordCallback.onSuccess;
      pendingPasswordCallback = null;
      updateLockIndicators();
      cb();
    }
  } else {
    document.getElementById('pw-error').style.display = 'block';
  }
});
document.getElementById('pw-input').addEventListener('keydown', (e)=>{
  if (e.key === 'Enter') document.getElementById('btn-pw-confirm').click();
});
function updateLockIndicators(){
  const el = document.getElementById('lock-indicator-registos');
  if (el) el.outerHTML = unlockedZones.has('admin')
    ? '<span class="badge ok" id="lock-indicator-registos">🔓 Edição desbloqueada</span>'
    : '<span class="badge muted" id="lock-indicator-registos">🔒 Edição bloqueada</span>';
}
/* Ação de editar/adicionar: utilizador com sessão + permissão de edição passa direto; caso contrário pede password mestra.
   Eliminações usam sempre requirePassword diretamente (nunca passam por aqui) — ver requirement "nunca eliminar sem pass". */
function requireAdminAction(zone, reason, onSuccess){
  if (isLoggedIn() && canEditNow()){ onSuccess(); return; }
  requirePassword(zone, reason, onSuccess);
}

/* ---------- Lixeira (recuperação de dados eliminados) ---------- */
function moveToTrash(tipo, dados, resumo){
  DB.trash.unshift({
    id: uid(), tipo, dados, resumo,
    eliminadoEm: new Date().toISOString(),
    eliminadoPor: (currentSessionUser() && currentSessionUser().username) || 'Convidado',
  });
}

/* ---------- Registo de Atividade (auditoria) ---------- */
function actorName(){
  const u = currentSessionUser();
  return u ? u.username : 'Convidado';
}
function logActivity(action, entity, summary){
  DB.auditLog = DB.auditLog || [];
  DB.auditLog.unshift({
    ts: new Date().toISOString(),
    user: actorName(),
    action, entity, summary,
  });
  if (DB.auditLog.length > 500) DB.auditLog.length = 500;
}


/* ---------- Utilidades ---------- */
function uid(){ return 'm' + Math.random().toString(36).slice(2,10); }
function normName(s){ return String(s||'').trim().toUpperCase().replace(/\s+/g,' '); }
function findDuplicate(nome, excludeId){
  const n = normName(nome);
  if (!n) return null;
  return DB.members.find(m => normName(m.nome)===n && m.id!==excludeId) || null;
}
function esc(s){ if (s===null||s===undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(iso){
  if (!iso) return '—';
  const d = new Date(iso+'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('pt-PT', {day:'2-digit', month:'2-digit', year:'numeric'});
}
function fmtKz(n){
  n = Number(n)||0;
  return n.toLocaleString('pt-PT', {maximumFractionDigits:0}) + ' Kz';
}
function calcAge(iso){
  if (!iso) return null;
  const d = new Date(iso+'T00:00:00');
  const ref = today();
  if (isNaN(d)) return null;
  if (d > ref) return null;
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m===0 && ref.getDate() < d.getDate())) age--;
  return age;
}
function monthsBetween(iso1, iso2){
  if (!iso1) return null;
  const d1 = new Date(iso1+'T00:00:00');
  const d2 = iso2 ? new Date(iso2+'T00:00:00') : today();
  if (isNaN(d1) || isNaN(d2)) return null;
  let months = (d2.getFullYear()-d1.getFullYear())*12 + (d2.getMonth()-d1.getMonth());
  if (d2.getDate() < d1.getDate()) months--;
  return Math.max(0, months);
}
function daysBetween(iso1, iso2){
  if (!iso1) return null;
  const d1 = new Date(iso1+'T00:00:00');
  const d2 = iso2 ? new Date(iso2+'T00:00:00') : today();
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.round((d2 - d1) / 86400000);
}
function faixaFromAge(age){
  if (age===null||age===undefined) return null;
  if (age<=12) return 'Criança';
  if (age<=17) return 'Adolescente';
  if (age<=29) return 'Jovem';
  if (age<=59) return 'Adulto';
  return 'Idoso(a)';
}
function refreshComputed(m){
  const age = calcAge(m.dataNascimento);
  m.idade = age !== null ? age : (m.idade || null);
  const f = faixaFromAge(age);
  if (f) m.faixaEtaria = f;
  return m;
}
DB.members.forEach(refreshComputed);

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove('show'), 2600);
}

function printNode(el){
  el.classList.add('printing-target');
  window.scrollTo(0,0);
  setTimeout(()=>{
    window.print();
  }, 50);
  const cleanup = () => { el.classList.remove('printing-target'); window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
}

function uniqueVals(arr, key){
  const s = new Set();
  arr.forEach(x => { if (x[key]) s.add(String(x[key]).trim()); });
  return Array.from(s).sort((a,b)=>a.localeCompare(b,'pt'));
}
function fillSelect(sel, values, placeholder){
  const current = sel.value;
  sel.innerHTML = `<option value="">${placeholder}</option>` + values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  if (values.includes(current)) sel.value = current;
}

/* ============================================================
   NAVEGAÇÃO
   ============================================================ */
document.getElementById('nav').addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  const activate = () => {
    document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById('sec-'+btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'dashboard') renderDashboard();
    if (btn.dataset.tab === 'database') renderDatabase();
    if (btn.dataset.tab === 'reports') initReportAdvFilters();
    if (btn.dataset.tab === 'financas') renderFinancas();
    if (btn.dataset.tab === 'registos') renderRegistos();
    if (btn.dataset.tab === 'qualidade') renderQualidade();
    if (btn.dataset.tab === 'cultos') renderCultos();
    if (btn.dataset.tab === 'inventario') renderInventario();
    if (btn.dataset.tab === 'atividades') renderAtividades();
    if (btn.dataset.tab === 'ajuda') renderAjuda();
    if (btn.dataset.tab === 'lixeira') renderLixeira();
    if (btn.dataset.tab === 'utilizadores') renderUsuarios();
    if (btn.dataset.tab === 'listas') renderListas();
    if (btn.dataset.tab === 'aparencia') renderAparencia();
    if (btn.dataset.tab === 'aniversariantes') renderAniversariantes();
  };
  if (btn.dataset.tab === 'lixeira'){
    requirePassword('admin', 'Introduza a palavra-passe para aceder à Lixeira e recuperar dados eliminados.', activate);
  } else if (btn.dataset.tab === 'utilizadores'){
    requirePassword('admin', 'Introduza a palavra-passe para aceder à Gestão de Utilizadores.', activate);
  } else if (btn.dataset.tab === 'listas'){
    requirePassword('admin', 'Introduza a palavra-passe para aceder à gestão de Listas & Categorias.', activate);
  } else if (btn.dataset.tab === 'aparencia'){
    requirePassword('admin', 'Introduza a palavra-passe para personalizar a aparência da ferramenta.', activate);
  } else {
    activate();
  }
});

document.querySelectorAll('.modal-close, .modal-bg [data-close]').forEach(b=>{
  b.addEventListener('click', (e)=>{ e.target.closest('.modal-bg').classList.remove('open'); });
});
document.querySelectorAll('.modal-bg').forEach(m=>{
  m.addEventListener('click', (e)=>{ if (e.target===m) m.classList.remove('open'); });
});

/* ============================================================
   1. DASHBOARD
   ============================================================ */
let charts = {};
function destroyChart(key){ if (charts[key]) { charts[key].destroy(); delete charts[key]; } }

const CHART_PALETTE = ['#12213A','#B8892B','#3F7150','#A6472A','#5B7FA6','#8A6413','#7C7461','#1E3350','#C9A45C','#6E8E76'];

function getDashboardFiltered(){
  const igreja = document.getElementById('f-igreja').value;
  const situacao = document.getElementById('f-situacao').value;
  const departamento = document.getElementById('f-departamento').value;
  const genero = document.getElementById('f-genero').value;
  return DB.members.filter(m=>{
    if (igreja && m.igreja !== igreja) return false;
    if (situacao && m.situacao !== situacao) return false;
    if (departamento && m.departamento !== departamento) return false;
    if (genero && m.genero !== genero) return false;
    return true;
  });
}

function initDashboardFilters(){
  fillSelect(document.getElementById('f-igreja'), uniqueVals(DB.members,'igreja'), 'Igreja / Centro — todas');
  fillSelect(document.getElementById('f-situacao'), uniqueVals(DB.members,'situacao'), 'Situação — todas');
  fillSelect(document.getElementById('f-departamento'), uniqueVals(DB.members,'departamento'), 'Departamento — todos');
  fillSelect(document.getElementById('f-genero'), uniqueVals(DB.members,'genero'), 'Género — todos');
}
['f-igreja','f-situacao','f-departamento','f-genero'].forEach(id=>{
  document.getElementById(id).addEventListener('change', renderDashboard);
});
document.getElementById('f-clear').addEventListener('click', ()=>{
  ['f-igreja','f-situacao','f-departamento','f-genero'].forEach(id=>document.getElementById(id).value='');
  renderDashboard();
});

function countBy(arr, key){
  const m = {};
  arr.forEach(x=>{
    const v = x[key] || 'Não definido';
    m[v] = (m[v]||0)+1;
  });
  return m;
}

const PALETTES = {
  default:  {label:'Dourado & Marinho (padrão)', colors:['#12213A','#B8892B','#3F7150','#A6472A','#5B7FA6','#8A6413','#7C7461','#1E3350','#C9A45C','#6E8E76']},
  dourado:  {label:'Dourado', colors:['#B8892B','#C9A45C','#8A6413','#E7D6AA','#6E5A2E','#D4AF37']},
  verde:    {label:'Verde', colors:['#2F5233','#3F7150','#6E8E76','#8FBF9F','#1F3A24','#A9CBB0']},
  azul:     {label:'Azul', colors:['#12213A','#1E3350','#5B7FA6','#7FA8D9','#0B1930','#9FC1E8']},
  vermelho: {label:'Vermelho', colors:['#7A2E1D','#A6472A','#C96A4B','#E0937A','#521F14','#F0B7A4']},
  roxo:     {label:'Roxo', colors:['#3B2456','#5B3A82','#8867B3','#B39DDB','#26173A','#D2C4E8']},
};
const CHART_TYPES = {bar:'Barras', line:'Linha', doughnut:'Rosca', pie:'Circular', polarArea:'Área Polar', radar:'Radar'};

function paletteColors(key){ return (PALETTES[key] || PALETTES.default).colors; }

/* ---------- Rótulos de valores nos gráficos (ex: "Crianças: 35") ---------- */
function dlConfig(kind, opts){
  opts = opts || {};
  if (kind==='round'){
    return {
      display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
      backgroundColor: 'rgba(255,255,255,.85)',
      borderRadius: 3,
      padding: {top:2,bottom:2,left:5,right:5},
      color: '#1B1B18',
      font: {size:10, weight:'600'},
      formatter: (value, ctx) => `${ctx.chart.data.labels[ctx.dataIndex]}: ${value}`,
    };
  }
  return {
    display: (ctx) => { const v = ctx.dataset.data[ctx.dataIndex]; return v !== 0 && v !== null && v !== undefined; },
    anchor: 'end',
    align: opts.horizontal ? 'end' : 'top',
    offset: 4,
    color: (ctx) => ctx.dataset.borderColor || ctx.dataset.backgroundColor || '#1B1B18',
    font: {size:10, weight:'600'},
    formatter: (value) => (typeof value === 'number' && !Number.isInteger(value)) ? value.toFixed(0) : value,
  };
}

function makeChart(chartKey, canvasId, labels, values, opts){
  opts = opts || {};
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const cfg = DB.dashboardConfig.charts[chartKey] || {};
  const type = opts.type || cfg.type || opts.defaultType || 'bar';
  const paletteKey = opts.palette || cfg.palette || 'default';
  const colors = paletteColors(paletteKey);
  const isRoundType = (type==='doughnut'||type==='pie'||type==='polarArea'||type==='radar');
  let datasets;
  if (opts.multiSeries){
    datasets = opts.datasets.map((s,i)=>({
      label:s.label, data:s.data,
      backgroundColor: type==='line' ? colors[(i*2)%colors.length]+'33' : colors[(i*2)%colors.length],
      borderColor: colors[(i*2)%colors.length], fill:type==='line', tension:.3, borderRadius:3
    }));
  } else if (isRoundType){
    datasets = [{ label:opts.seriesLabel||'', data:values, backgroundColor:labels.map((_,i)=>colors[i%colors.length]) }];
  } else {
    datasets = [{ label:opts.seriesLabel||'Total', data:values, backgroundColor:colors[0], borderColor:colors[0], borderRadius:3, fill:type==='line', tension:.3, maxBarThickness:46 }];
  }
  destroyChart(chartKey);
  const axisKey = opts.horizontal ? 'x' : 'y';
  const dlKind = (type==='doughnut'||type==='pie'||type==='polarArea') ? 'round' : 'bar';
  charts[chartKey] = new Chart(canvas, {
    type,
    data:{ labels, datasets },
    options:{
      responsive:true, maintainAspectRatio:false,
      indexAxis: opts.horizontal ? 'y' : 'x',
      layout: { padding: { top: opts.horizontal ? 0 : 16, right: opts.horizontal ? 26 : 0 } },
      plugins:{
        legend:{ display: opts.multiSeries || isRoundType, position:'bottom', labels:{boxWidth:11,font:{size:10}} },
        datalabels: dlConfig(dlKind, {horizontal:opts.horizontal})
      },
      scales: isRoundType ? {} : { [axisKey]: {beginAtZero:true, ticks:{precision:0}} }
    }
  });
}

/* ---------- Gráficos personalizados ---------- */
const CUSTOM_CHART_SOURCES = {
  membros:     {label:'Membros', data:()=>DB.members, fields:{genero:'Género',situacao:'Situação',departamento:'Departamento',cargo:'Cargo',faixaEtaria:'Faixa Etária',estadoCivil:'Estado Civil',provincia:'Província',igreja:'Igreja/Centro',funcao:'Função'}},
  cultos:      {label:'Cultos', data:()=>DB.cultos, fields:{dia:'Dia da Semana'}},
  atividades:  {label:'Atividades', data:()=>DB.atividades, fields:{estado:'Estado',departamento:'Departamento'}},
  inventario:  {label:'Inventário', data:()=>DB.inventario, fields:{categoria:'Categoria',estado:'Estado'}},
  disciplina:  {label:'Disciplina', data:()=>DB.disciplina, fields:{igreja:'Igreja/Congregação'}},
  visitantes:  {label:'Visitantes', data:()=>DB.visitantes, fields:{origem:'Origem',centroOrigem:'Centro de Origem'}},
};
function renderCustomCharts(){
  const box = document.getElementById('dash-custom-charts');
  const list = DB.dashboardConfig.customCharts;
  if (!list.length){ box.innerHTML=''; return; }
  box.innerHTML = list.map(c=>`<div class="card"><h3 class="u-1db6be">${esc(c.title)}</h3><div class="chart-wrap tall"><canvas id="chart-custom-${c.id}"></canvas></div></div>`).join('');
  list.forEach(c=>{
    const src = CUSTOM_CHART_SOURCES[c.source];
    if (!src) return;
    const counts = countBy(src.data(), c.field);
    const labels = Object.keys(counts), values = Object.values(counts);
    makeChart('custom_'+c.id, 'chart-custom-'+c.id, labels, values, {type:c.type, palette:c.palette, horizontal:(c.type==='bar' && labels.length>6)});
  });
}

function renderDashboard(){
  initDashboardFilters();
  const data = getDashboardFiltered();
  const ativos = data.filter(m=>m.situacao==='Ativo').length;
  const homens = data.filter(m=>m.genero==='Masculino').length;
  const mulheres = data.filter(m=>m.genero==='Feminino').length;
  const disciplina = data.filter(m=>m.situacao==='Em Disciplina').length;
  const depts = new Set(data.map(m=>m.departamento).filter(Boolean)).size;
  const anoAtual = today().getFullYear();
  const novos = data.filter(m=> m.dataRegisto && m.dataRegisto.startsWith(String(anoAtual))).length;

  document.getElementById('kpi-grid').innerHTML = `
    <div class="u-b202c6 kpi" data-goto="database"><div class="num">${data.length}</div><div class="lbl">Total de membros</div></div>
    <div class="u-b202c6 kpi" data-goto="database" data-gotositu="Ativo"><div class="num">${ativos}</div><div class="lbl">Membros ativos</div></div>
    <div class="kpi"><div class="num">${homens} / ${mulheres}</div><div class="lbl">Homens / Mulheres</div></div>
    <div class="kpi"><div class="num">${depts}</div><div class="lbl">Departamentos em atividade</div></div>
    <div class="u-b202c6 kpi" data-goto="registos"><div class="num">${disciplina}</div><div class="lbl">Sob disciplina</div></div>
    <div class="kpi"><div class="num">${novos}</div><div class="lbl">Novos registos em ${anoAtual}</div></div>
  `;
  document.querySelectorAll('#kpi-grid .kpi[data-goto]').forEach(el=>{
    el.addEventListener('click', ()=>{
      document.querySelector(`.nav button[data-tab="${el.dataset.goto}"]`).click();
      if (el.dataset.gotositu){
        setTimeout(()=>{ const sel=document.getElementById('db-f-situacao'); if(sel){ sel.value=el.dataset.gotositu; sel.dispatchEvent(new Event('change')); } }, 30);
      }
    });
  });
  renderDashAlerts();

  // Faixa etária
  const faixaOrder = ['Criança','Adolescente','Jovem','Adulto','Idoso(a)'];
  const faixaCounts = countBy(data,'faixaEtaria');
  makeChart('faixa','chart-faixa', faixaOrder, faixaOrder.map(f=>faixaCounts[f]||0), {defaultType:'bar'});

  // Género
  const genCounts = countBy(data,'genero');
  makeChart('genero','chart-genero', Object.keys(genCounts), Object.values(genCounts), {defaultType:'doughnut'});

  // Departamento (top 10)
  const deptCounts = countBy(data.filter(m=>m.departamento),'departamento');
  const deptSorted = Object.entries(deptCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  makeChart('depto','chart-depto', deptSorted.map(x=>x[0]), deptSorted.map(x=>x[1]), {defaultType:'bar', horizontal:true});

  // Situação
  const sitCounts = countBy(data,'situacao');
  makeChart('situacao','chart-situacao', Object.keys(sitCounts), Object.values(sitCounts), {defaultType:'bar', horizontal:true});

  // Finanças mini
  makeChart('financasMini','chart-financas-mini', DB.financas.map(f=>f.mes), null, {
    defaultType:'line', multiSeries:true,
    datasets:[{label:'Entradas', data:DB.financas.map(f=>f.entradas)},{label:'Saídas', data:DB.financas.map(f=>f.saidas)}]
  });

  renderCustomCharts();
}

function renderDashAlerts(){
  const box = document.getElementById('dash-alerts');
  const items = [];

  const emDisciplinaLonga = DB.disciplina.filter(d=>!d.dataLevantamento && (monthsBetween(d.dataAplicacao)||0)>=6);
  if (emDisciplinaLonga.length){
    items.push({ tone:'warn', tab:'registos', text:`${emDisciplinaLonga.length} membro(s) já em condições de levantamento de disciplina (mais de 6 meses).` });
  }
  const visitantesExpirados = DB.visitantes.filter(v=>{
    if (!v.dataVisto) return false;
    const d = new Date(v.dataVisto+'T00:00:00');
    return !isNaN(d) && d < today();
  });
  if (visitantesExpirados.length){
    items.push({ tone:'bad', tab:'registos', text:`${visitantesExpirados.length} visitante(s) com prazo de visto/regresso expirado.` });
  }
  const bdToday = DB.members.filter(m=>{ if(!m.dataNascimento) return false; const d=new Date(m.dataNascimento+'T00:00:00'); return d.getMonth()===today().getMonth() && d.getDate()===today().getDate(); });
  const bdNext7 = DB.members.filter(m=>{ if(!m.dataNascimento) return false; const d=new Date(m.dataNascimento+'T00:00:00'); let x=new Date(today().getFullYear(),d.getMonth(),d.getDate()); const base=new Date(today().getFullYear(),today().getMonth(),today().getDate()); if(x<base) x.setFullYear(x.getFullYear()+1); const diff=Math.ceil((x-base)/86400000); return diff>0&&diff<=7; });
  if (bdToday.length){ items.push({ tone:'warn', tab:'aniversariantes', text:`🎂 ${bdToday.length} aniversariante(s) hoje: ${bdToday.map(m=>m.nome).join(', ')}.` }); }
  else if (bdNext7.length){ items.push({ tone:'muted', tab:'aniversariantes', text:`🔔 ${bdNext7.length} aniversário(s) nos próximos 7 dias.` }); }
  const dupGroups = findAllDuplicateGroups ? findAllDuplicateGroups() : [];
  if (dupGroups.length){
    items.push({ tone:'bad', tab:'database', text:`${dupGroups.length} possível(eis) membro(s) duplicado(s) na base de dados.` });
  }
  const ativPendentes = DB.atividades.filter(a=>a.estado==='Programada');
  if (ativPendentes.length){
    items.push({ tone:'muted', tab:'atividades', text:`${ativPendentes.length} atividade(s) programada(s) ainda por realizar.` });
  }
  const invMau = DB.inventario.filter(i=>i.estado==='Mau'||i.estado==='Danificado');
  if (invMau.length){
    items.push({ tone:'warn', tab:'inventario', text:`${invMau.length} item(ns) de inventário em mau estado ou danificado(s).` });
  }
  const semSituacao = DB.members.filter(m=>m.situacao==='Não definido').length;
  if (semSituacao>0){
    items.push({ tone:'muted', tab:'qualidade', text:`${semSituacao} membro(s) sem situação definida.` });
  }

  if (!items.length){
    box.innerHTML = `<h3 class="u-ac0f8b">Central de Alertas</h3><p class="u-1386d5 sub">Sem alertas pendentes de momento. ✅</p>`;
    return;
  }
  const toneBadge = t => t==='bad' ? 'bad' : (t==='warn' ? 'warn' : 'muted');
  box.innerHTML = `
    <h3 class="u-180f1d">Central de Alertas</h3>
    <div class="u-685cf0">
      ${items.map(it=>`
        <div class="u-f59d06 dash-alert-item" data-goto="${it.tab}">
          <span class="u-3044b6"><span class="u-d10994 badge ${toneBadge(it.tone)}">●</span>${esc(it.text)}</span>
          <span class="u-f99727">Ver →</span>
        </div>
      `).join('')}
    </div>
  `;
  box.querySelectorAll('.dash-alert-item').forEach(el=>{
    el.addEventListener('click', ()=> document.querySelector(`.nav button[data-tab="${el.dataset.goto}"]`).click());
  });
}

/* ============================================================
   2. BASE DE DADOS
   ============================================================ */
let dbState = { page:1, pageSize:25, sortKey:'nome', sortDir:1 };

function initDbFilters(){
  fillSelect(document.getElementById('db-f-situacao'), uniqueVals(DB.members,'situacao'), 'Situação — todas');
  fillSelect(document.getElementById('db-f-departamento'), uniqueVals(DB.members,'departamento'), 'Departamento — todos');
  fillSelect(document.getElementById('db-f-genero'), uniqueVals(DB.members,'genero'), 'Género — todos');
  fillSelect(document.getElementById('db-f-faixa'), ['Criança','Adolescente','Jovem','Adulto','Idoso(a)'], 'Faixa etária — todas');
}

function getFilteredMembers(){
  const q = document.getElementById('db-search').value.trim().toLowerCase();
  const situacao = document.getElementById('db-f-situacao').value;
  const departamento = document.getElementById('db-f-departamento').value;
  const genero = document.getElementById('db-f-genero').value;
  const faixa = document.getElementById('db-f-faixa').value;
  let list = DB.members.filter(m=>{
    if (q){
      const hay = [m.nome, m.tel, m.nBi, m.nCartao].map(x=>String(x||'').toLowerCase()).join(' ');
      if (!hay.includes(q)) return false;
    }
    if (situacao && m.situacao!==situacao) return false;
    if (departamento && m.departamento!==departamento) return false;
    if (genero && m.genero!==genero) return false;
    if (faixa && m.faixaEtaria!==faixa) return false;
    return true;
  });
  list.sort((a,b)=>{
    let va = a[dbState.sortKey], vb = b[dbState.sortKey];
    if (va===null||va===undefined) va='';
    if (vb===null||vb===undefined) vb='';
    if (typeof va === 'number' && typeof vb === 'number') return (va-vb)*dbState.sortDir;
    return String(va).localeCompare(String(vb),'pt')*dbState.sortDir;
  });
  return list;
}

function findAllDuplicateGroups(){
  const groups = {};
  DB.members.forEach(m=>{
    const n = normName(m.nome);
    if (!n) return;
    (groups[n] = groups[n] || []).push(m);
  });
  return Object.values(groups).filter(g=>g.length>1);
}
function renderDuplicateAlert(){
  const box = document.getElementById('db-alert-dup');
  const groups = findAllDuplicateGroups();
  if (!groups.length){ box.style.display='none'; return; }
  const names = groups.map(g=>g[0].nome).slice(0,8).join('; ');
  box.style.display = 'block';
  box.style.borderLeftColor = 'var(--bad)';
  box.innerHTML = `<strong>⚠ ${groups.length} possível(eis) duplicado(s) encontrado(s):</strong> ${esc(names)}${groups.length>8?'…':''} — reveja e elimine os registos repetidos.`;
}
function renderDatabase(){
  initDbFilters();
  renderDuplicateAlert();
  let list = getFilteredMembers();
  if (typeof V16 !== 'undefined') list = V16.dbFilter(list); // V16: filtros pelos títulos das colunas
  document.getElementById('db-count').textContent = list.length;
  const totalPages = Math.max(1, Math.ceil(list.length/dbState.pageSize));
  if (dbState.page>totalPages) dbState.page = totalPages;
  const start = (dbState.page-1)*dbState.pageSize;
  const pageItems = list.slice(start, start+dbState.pageSize);

  const sitBadge = (s)=>{
    if (s==='Ativo') return `<span class="badge ok">${esc(s)}</span>`;
    if (s==='Em Disciplina' || s==='Suspenso') return `<span class="badge bad">${esc(s)}</span>`;
    if (s==='Não definido') return `<span class="badge muted">${esc(s)}</span>`;
    return `<span class="badge warn">${esc(s)}</span>`;
  };

  document.getElementById('tbl-members-body').innerHTML = pageItems.map(m=>`
    <tr>
      <td><strong>${esc(m.nome)}</strong></td>
      <td>${esc(m.genero||'—')}</td>
      <td>${m.idade ?? '—'}</td>
      <td>${esc(m.cargo||'—')}</td>
      <td>${esc(m.departamento||'—')}</td>
      <td>${sitBadge(m.situacao)}</td>
      <td>${esc(m.tel||'—')}</td>
      <td class="u-4ddbe9">
        <button class="btn ghost sm" data-ficha="${m.id}">Ficha</button>
        <button class="btn ghost sm" data-edit="${m.id}">Editar</button>
        <button class="btn danger sm" data-del="${m.id}">Eliminar</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="8"><div class="empty">Nenhum membro encontrado com os filtros atuais.</div></td></tr>`;

  document.getElementById('db-pager').innerHTML = `
    <button class="btn ghost sm" ${dbState.page<=1?'disabled':''} id="pg-prev">← Anterior</button>
    <span>Página ${dbState.page} de ${totalPages}</span>
    <button class="btn ghost sm" ${dbState.page>=totalPages?'disabled':''} id="pg-next">Seguinte →</button>
  `;
  const prev = document.getElementById('pg-prev'), next = document.getElementById('pg-next');
  if (prev) prev.onclick = ()=>{ dbState.page--; renderDatabase(); };
  if (next) next.onclick = ()=>{ dbState.page++; renderDatabase(); };
}

document.getElementById('db-search').addEventListener('input', ()=>{ dbState.page=1; renderDatabase(); });
['db-f-situacao','db-f-departamento','db-f-genero','db-f-faixa'].forEach(id=>{
  document.getElementById(id).addEventListener('change', ()=>{ dbState.page=1; renderDatabase(); });
});
document.getElementById('db-f-clear').addEventListener('click', ()=>{
  document.getElementById('db-search').value='';
  ['db-f-situacao','db-f-departamento','db-f-genero','db-f-faixa'].forEach(id=>document.getElementById(id).value='');
  dbState.page=1; renderDatabase();
});
document.getElementById('tbl-members').querySelector('thead').addEventListener('click', (e)=>{
  const th = e.target.closest('th[data-sort]');
  if (!th) return;
  const key = th.dataset.sort;
  if (dbState.sortKey===key) dbState.sortDir *= -1; else { dbState.sortKey=key; dbState.sortDir=1; }
  renderDatabase();
});
document.getElementById('tbl-members-body').addEventListener('click', (e)=>{
  const ficha = e.target.closest('[data-ficha]');
  const edit = e.target.closest('[data-edit]');
  const del = e.target.closest('[data-del]');
  if (ficha){ openFichaFor(ficha.dataset.ficha); }
  if (edit){
    requireAdminAction('admin', 'Introduza a palavra-passe para editar este membro.', ()=> openMemberModal(edit.dataset.edit));
  }
  if (del){
    requirePassword('admin', 'Introduza a palavra-passe para eliminar este membro. Poderá recuperá-lo mais tarde na Lixeira.', ()=>{
      if (confirm('Tem a certeza que deseja eliminar este membro? O registo será movido para a Lixeira.')){
        const m = DB.members.find(x=>x.id===del.dataset.del);
        if (m){ moveToTrash('membro', m, m.nome); logActivity('Eliminou', 'Membro', m.nome); }
        DB.members = DB.members.filter(m=>m.id!==del.dataset.del);
        saveDB(); renderDatabase(); toast('Membro eliminado (movido para a Lixeira).');
      }
    });
  }
});
document.getElementById('btn-add-member').addEventListener('click', ()=>{
  requireAdminAction('admin', 'Introduza a palavra-passe para adicionar um novo membro.', ()=> openMemberModal(null));
});
document.getElementById('btn-goto-add').addEventListener('click', ()=>{
  document.querySelector('.nav button[data-tab="database"]').click();
  requireAdminAction('admin', 'Introduza a palavra-passe para adicionar um novo membro.', ()=> openMemberModal(null));
});

/* ---------- Modal Membro ---------- */
function dynOptions(key, field){
  const base = listFor(key);
  const dynamic = uniqueVals(DB.members, field);
  const set = new Set([...base, ...dynamic]);
  return Array.from(set).sort((a,b)=>a.localeCompare(b,'pt'));
}

const MEMBER_FIELDS_LAYOUT = [
  { title:'Dados Pessoais', fields:[
    ['nome','Nome Completo','text',true],
    ['genero','Género','select',false,['Masculino','Feminino']],
    ['dataNascimento','Data de Nascimento','date'],
    ['estadoCivil','Estado Civil','select',false,()=>listFor('estadoCivil')],
    ['nomeConjuge','Nome do Cônjuge','text'],
    ['nacionalidade','Nacionalidade','text'],
    ['nBi','Nº do BI','text'],
    ['infEscolar','Habilitações Literárias','text'],
  ]},
  { title:'Filiação', fields:[
    ['nomePai','Nome do Pai','text'],
    ['nomeMae','Nome da Mãe','text'],
  ]},
  { title:'Contactos & Endereço', fields:[
    ['tel','Telefone','text'],
    ['email','E-mail','email'],
    ['provincia','Província','text'],
    ['municipio','Município','text'],
    ['morada','Morada','text'],
  ]},
  { title:'Dados Eclesiásticos', fields:[
    ['igreja','Igreja / Centro','dynselect',false,()=>dynOptions('igreja','igreja')],
    ['cargo','Cargo','dynselect',false,()=>dynOptions('cargo','cargo')],
    ['funcao','Função','dynselect',false,()=>dynOptions('funcao','funcao')],
    ['departamento','Departamento','dynselect',false,()=>dynOptions('departamento','departamento')],
    ['situacao','Situação','select',false,()=>listFor('situacao')],
    ['dataSituacao','Data da Situação','date'],
    ['dataBaptismo','Data do Batismo','date'],
    ['dataConversao','Data da Conversão','date'],
    ['dataRegisto','Data de Registo','date'],
    ['nCartao','Nº do Cartão','text'],
  ]},
  { title:'Observações', fields:[
    ['obs','Observações','textarea'],
  ]},
];

function fieldInput(m, key, label, type, required, options){
  const val = m ? (m[key] ?? '') : '';
  if (type==='select'){
    const opts = typeof options === 'function' ? options() : options;
    return `<div class="field"><label>${label}${required?' *':''}</label>
      <select data-f="${key}">
        <option value="">—</option>
        ${opts.map(o=>`<option value="${esc(o)}" ${val===o?'selected':''}>${esc(o)}</option>`).join('')}
      </select></div>`;
  }
  if (type==='dynselect'){
    const opts = typeof options === 'function' ? options() : options;
    const isCustom = val && !opts.includes(val);
    return `<div class="field"><label>${label}${required?' *':''}</label>
      <select data-f="${key}" data-dyn="1">
        <option value="">—</option>
        ${opts.map(o=>`<option value="${esc(o)}" ${val===o?'selected':''}>${esc(o)}</option>`).join('')}
        <option value="__outro__" ${isCustom?'selected':''}>+ Outro (escrever)…</option>
      </select>
      <input type="text" data-f-custom="${key}" placeholder="Escreva o novo valor" value="${isCustom?esc(val):''}" class="mm-custom-in${isCustom?'':' is-hidden'}">
      </div>`;
  }
  if (type==='textarea'){
    return `<div class="u-1b9b41 field"><label>${label}</label><textarea data-f="${key}" rows="3">${esc(val)}</textarea></div>`;
  }
  return `<div class="field"><label>${label}${required?' *':''}</label><input type="${type}" data-f="${key}" value="${esc(val)}"></div>`;
}

let editingMemberId = null;
function openMemberModal(id){
  editingMemberId = id;
  const m = id ? DB.members.find(x=>x.id===id) : null;
  document.getElementById('modal-member-title').textContent = m ? `Editar — ${m.nome}` : 'Novo Membro';
  const body = document.getElementById('modal-member-body');
  body.innerHTML = MEMBER_FIELDS_LAYOUT.map(group=>`
    <div class="group-title">${group.title}</div>
    <div class="fields-grid">${group.fields.map(f=>fieldInput(m, f[0], f[1], f[2], f[3], f[4])).join('')}</div>
  `).join('') + `
    <div class="group-title">Fotografia</div>
    <div class="u-ac5a41 field">
      <input type="file" accept="image/*" id="member-photo-input">
      <div id="member-photo-preview" class="u-d43169">${m && m.foto ? `<img src="${m.foto}" class="u-abbcc6">` : ''}</div>
    </div>
  `;
  document.getElementById('member-photo-input').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      document.getElementById('member-photo-preview').innerHTML = `<img src="${reader.result}" class="u-abbcc6">`;
      document.getElementById('member-photo-preview').dataset.photo = reader.result;
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('modal-member').classList.add('open');
}

document.getElementById('btn-save-member').addEventListener('click', ()=>{
  const body = document.getElementById('modal-member-body');
  const data = {};
  body.querySelectorAll('[data-f]').forEach(el=>{
    let v = el.value.trim();
    if (el.dataset.dyn && v==='__outro__'){
      const customInput = body.querySelector(`[data-f-custom="${el.dataset.f}"]`);
      v = customInput ? customInput.value.trim() : '';
    }
    data[el.dataset.f] = v || null;
  });
  if (!data.nome){ toast('O nome do membro é obrigatório.'); return; }
  const dup = findDuplicate(data.nome, editingMemberId);
  if (dup && !confirm(`Já existe um membro cadastrado com o nome "${dup.nome}" (${dup.departamento||'sem departamento'}). Deseja adicionar/guardar mesmo assim?`)){
    return;
  }
  const photoPreview = document.getElementById('member-photo-preview');
  let existing = editingMemberId ? DB.members.find(x=>x.id===editingMemberId) : null;
  const record = existing ? Object.assign({}, existing) : { id: uid() };
  Object.assign(record, data);
  if (photoPreview && photoPreview.dataset.photo) record.foto = photoPreview.dataset.photo;
  refreshComputed(record);
  if (existing){
    Object.assign(existing, record);
  } else {
    DB.members.push(record);
  }
  saveDB();
  logActivity(existing ? 'Editou' : 'Adicionou', 'Membro', record.nome);
  document.getElementById('modal-member').classList.remove('open');
  renderDatabase();
  toast(existing ? 'Membro atualizado.' : 'Membro adicionado.');
});

/* ---------- Export CSV / JSON / Import ---------- */
function downloadFile(filename, content, mime){
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function toCSV(rows, headers){
  const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
  const lines = [headers.map(h=>esc(h.label)).join(';')];
  rows.forEach(r=> lines.push(headers.map(h=>esc(typeof h.get==='function' ? h.get(r) : r[h.key])).join(';')));
  return '\uFEFF' + lines.join('\r\n');
}

document.getElementById('btn-export-csv').addEventListener('click', ()=>{
  const headers = [
    {key:'nome',label:'Nome'},{key:'genero',label:'Género'},{key:'idade',label:'Idade'},
    {key:'faixaEtaria',label:'Faixa Etária'},{key:'estadoCivil',label:'Estado Civil'},
    {key:'cargo',label:'Cargo'},{key:'funcao',label:'Função'},{key:'departamento',label:'Departamento'},
    {key:'situacao',label:'Situação'},{key:'tel',label:'Telefone'},{key:'email',label:'E-mail'},
    {key:'provincia',label:'Província'},{key:'municipio',label:'Município'},{key:'morada',label:'Morada'},
    {get:r=>fmtDate(r.dataNascimento),label:'Data Nascimento'},
    {get:r=>fmtDate(r.dataBaptismo),label:'Data Batismo'},
    {key:'nCartao',label:'Nº Cartão'},{key:'nBi',label:'Nº BI'},
  ];
  downloadFile('base_de_dados_membros.csv', toCSV(getFilteredMembers(), headers), 'text/csv;charset=utf-8');
  toast('CSV exportado.');
});

function exportBackup(){
  downloadFile('backup_monte_moria_' + new Date().toISOString().slice(0,10) + '.json', JSON.stringify(DB, null, 2), 'application/json');
  toast('Cópia de segurança exportada.');
}
document.getElementById('btn-export-json').addEventListener('click', exportBackup);

document.getElementById('file-import').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if (!file) return;
  requirePassword('admin', 'Esta ação substitui TODOS os dados atuais. Introduza a palavra-passe para confirmar.', ()=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const parsed = JSON.parse(reader.result);
        if (!parsed.members) throw new Error('formato inválido');
        if (!confirm('Tem a certeza? Isto vai SUBSTITUIR todos os dados atuais pelos dados do ficheiro importado.')){ return; }
        DB = parsed;
        DB.trash = DB.trash || [];
        DB.users = DB.users || [];
        DB.settings = DB.settings || {};
        DB.settings.adminPassword = DB.settings.adminPassword || DEFAULT_ADMIN_PASSWORD;
        DB.dashboardConfig = DB.dashboardConfig || { charts:{}, customCharts:[] };
        DB.members.forEach(refreshComputed);
        saveDB();
        renderAll();
        toast('Backup importado com sucesso.');
      }catch(err){
        alert('Não foi possível importar este ficheiro. Verifique se é um backup JSON válido gerado por esta ferramenta.');
      }
    };
    reader.readAsText(file);
  });
  e.target.value = '';
});

/* ============================================================
   3. FICHA INDIVIDUAL
   ============================================================ */
function getChurchInfo(){
  const b = DB.settings.branding.churchInfo || {};
  return {
    denom: b.denom || 'Assembleia de Deus Pentecostal',
    ministerio: b.ministerio || 'Ministério - Betel-Luanda',
    centro: b.centro || 'Centro Monte Moriá',
    endereco: b.endereco || 'Bairro Fubú, Luanda',
    tel: b.tel || '923 277 411',
    pastor: b.pastor || ((SEED.organograma && SEED.organograma[0]) ? SEED.organograma[0] : 'Pr. Filipe Cambundo'),
  };
}

function fichaHTML(m){
  const item = (k,v) => `<div class="ficha-item"><div class="k">${k}</div><div class="v">${v || '—'}</div></div>`;
  const now = new Date();
  const CHURCH_INFO = getChurchInfo();
  return `
    <div class="ficha-header">
      <div class="crest"><img src="${currentLogoSrc()}" alt="ADP"></div>
      <div class="id-block">
        <h3>${esc(CHURCH_INFO.denom)}</h3>
        <p>${esc(CHURCH_INFO.ministerio)} · ${esc(CHURCH_INFO.centro)}</p>
        <p>${esc(CHURCH_INFO.endereco)} · ${esc(CHURCH_INFO.tel)}</p>
      </div>
    </div>

    <div class="ficha-top">
      <div class="ficha-name">
        <h1>${esc(m.nome)}</h1>
        <div class="tags">
          ${m.cargo?`<span class="badge muted">${esc(m.cargo)}</span>`:''}
          ${m.departamento?`<span class="badge muted">${esc(m.departamento)}</span>`:''}
          ${m.situacao?`<span class="badge ${m.situacao==='Ativo'?'ok':(m.situacao==='Em Disciplina'?'bad':'warn')}">${esc(m.situacao)}</span>`:''}
        </div>
      </div>
      <div class="ficha-photo">${m.foto ? `<img src="${m.foto}">` : 'FOTO'}</div>
    </div>

    <div class="ficha-grid c2">
      ${item('Data da Situação', fmtDate(m.dataSituacao))}
      ${item('Função / Igreja', (m.funcao||'—') + ' · ' + (m.igreja||'—'))}
    </div>

    <div class="ficha-section-title">Dados Pessoais</div>
    <div class="ficha-grid">
      ${item('Nº do Bilhete de Identidade', m.nBi)}
      ${item('Estado Civil', m.estadoCivil)}
      ${item('Nome do Cônjuge', m.nomeConjuge)}
      ${item('Data de Nascimento', fmtDate(m.dataNascimento))}
      ${item('Idade', m.idade!==null && m.idade!==undefined ? m.idade+' anos' : '—')}
      ${item('Nacionalidade', m.nacionalidade)}
    </div>

    <div class="ficha-section-title">Informações de Contacto</div>
    <div class="ficha-grid c2">
      ${item('Telefone', m.tel)}
      ${item('E-mail', m.email)}
    </div>

    <div class="ficha-section-title">Endereço</div>
    <div class="ficha-grid">
      ${item('Província', m.provincia)}
      ${item('Município', m.municipio)}
      ${item('Morada', m.morada)}
    </div>

    <div class="ficha-section-title">Filiação</div>
    <div class="ficha-grid c2">
      ${item('Nome do Pai', m.nomePai)}
      ${item('Nome da Mãe', m.nomeMae)}
    </div>

    <div class="ficha-section-title">Dados Eclesiásticos</div>
    <div class="ficha-grid">
      ${item('Data do Batismo', fmtDate(m.dataBaptismo))}
      ${item('Nº do Cartão', m.nCartao)}
      ${item('Data da Conversão', fmtDate(m.dataConversao))}
      ${item('Situação', m.situacao)}
      ${item('Data - Situação', fmtDate(m.dataSituacao))}
      ${item('Data de Registo', fmtDate(m.dataRegisto))}
    </div>

    <div class="ficha-section-title">Observação</div>
    <div class="ficha-obs">${esc(m.obs) || '&nbsp;'}</div>

    <div class="ficha-foot">
      <div>Ficha gerada em ${now.toLocaleDateString('pt-PT')} às ${now.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</div>
      <div class="ficha-sig"><div class="line"></div>Pastor Responsável<br><strong>${esc(CHURCH_INFO.pastor)}</strong></div>
    </div>
  `;
}

let currentFichaMember = null;
function openFichaFor(id){
  const m = DB.members.find(x=>x.id===id);
  if (!m) return;
  currentFichaMember = m;
  document.querySelector('.nav button[data-tab="ficha"]').click();
  document.getElementById('ficha-empty').classList.add('hidden');
  const sheet = document.getElementById('ficha-sheet');
  sheet.classList.remove('hidden');
  sheet.innerHTML = fichaHTML(m);
  document.getElementById('ficha-search').value = m.nome;
  document.getElementById('btn-print-ficha').disabled = false;
}

const fichaSearch = document.getElementById('ficha-search');
const fichaSuggest = document.getElementById('ficha-suggest');
fichaSearch.addEventListener('input', ()=>{
  const q = fichaSearch.value.trim().toLowerCase();
  if (!q){ fichaSuggest.classList.remove('open'); return; }
  const matches = DB.members.filter(m=>m.nome.toLowerCase().includes(q)).slice(0,12);
  fichaSuggest.innerHTML = matches.map(m=>`<div data-id="${m.id}">${esc(m.nome)} <span class="u-fad3c4">${esc(m.departamento||'')}</span></div>`).join('') || `<div class="u-b35fbc">Sem resultados</div>`;
  fichaSuggest.classList.add('open');
});
fichaSuggest.addEventListener('click', (e)=>{
  const row = e.target.closest('[data-id]');
  if (!row) return;
  openFichaFor(row.dataset.id);
  fichaSuggest.classList.remove('open');
});
document.addEventListener('click', (e)=>{
  if (!e.target.closest('.autocomplete-box')) fichaSuggest.classList.remove('open');
});
document.getElementById('btn-print-ficha').addEventListener('click', ()=>{
  if (currentFichaMember) printNode(document.getElementById('ficha-sheet'));
});

/* ============================================================
   4. RELATÓRIOS
   ============================================================ */
const reportTypeSel = document.getElementById('report-type');
const reportFilterSel = document.getElementById('report-filter');

function initReportAdvFilters(){
  fillSelect(document.getElementById('adv-genero'), uniqueVals(DB.members,'genero'), 'Todos');
  fillSelect(document.getElementById('adv-situacao'), uniqueVals(DB.members,'situacao'), 'Todas');
  fillSelect(document.getElementById('adv-departamento'), uniqueVals(DB.members,'departamento'), 'Todos');
  fillSelect(document.getElementById('adv-cargo'), uniqueVals(DB.members,'cargo'), 'Todos');
  fillSelect(document.getElementById('adv-funcao'), uniqueVals(DB.members,'funcao'), 'Todas');
  fillSelect(document.getElementById('adv-faixa'), ['Criança','Adolescente','Jovem','Adulto','Idoso(a)'], 'Todas');
  fillSelect(document.getElementById('adv-igreja'), uniqueVals(DB.members,'igreja'), 'Todas');
  fillSelect(document.getElementById('adv-estadocivil'), uniqueVals(DB.members,'estadoCivil'), 'Todos');
  fillSelect(document.getElementById('adv-provincia'), uniqueVals(DB.members,'provincia'), 'Todas');
}
document.getElementById('report-adv-filters').querySelectorAll('select').forEach(sel=>{
  sel.addEventListener('change', ()=>{}); // valores lidos no momento de gerar
});
const btnAdvClear = document.getElementById('btn-adv-clear');
if (btnAdvClear) btnAdvClear.addEventListener('click', ()=>{
  document.getElementById('report-adv-filters').querySelectorAll('select').forEach(s=>s.value='');
});

function updateReportFilterOptions(){
  const type = reportTypeSel.value;
  reportFilterSel.classList.add('hidden');
  reportFilterSel.innerHTML = '';
  document.getElementById('report-adv-filters').style.display = (type==='geral') ? '' : 'none';
  if (type==='departamento'){
    fillSelect(reportFilterSel, uniqueVals(DB.members,'departamento'), 'Escolha o departamento');
    reportFilterSel.classList.remove('hidden');
  } else if (type==='situacao'){
    fillSelect(reportFilterSel, uniqueVals(DB.members,'situacao'), 'Escolha a situação');
    reportFilterSel.classList.remove('hidden');
  } else if (type==='faixa'){
    fillSelect(reportFilterSel, ['Criança','Adolescente','Jovem','Adulto','Idoso(a)'], 'Escolha a faixa etária');
    reportFilterSel.classList.remove('hidden');
  } else if (type==='aniversario'){
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    reportFilterSel.innerHTML = meses.map((mo,i)=>`<option value="${i+1}">${mo}</option>`).join('');
    reportFilterSel.value = today().getMonth()+1;
    reportFilterSel.classList.remove('hidden');
  }
}
reportTypeSel.addEventListener('change', updateReportFilterOptions);
updateReportFilterOptions();

function memberReportTable(list, title){
  if (!list.length) return `<div class="card empty"><div class="display">Sem resultados</div>Não existem registos para os critérios selecionados.</div>`;
  return `
    <div class="card">
      <h3 class="u-b8af55">${esc(title)}</h3>
      <p class="u-c9d437 sub">${list.length} registo(s) · gerado em ${new Date().toLocaleDateString('pt-PT')}</p>
      <div class="tbl-scroll"><table class="data-table">
        <thead><tr><th>Nome</th><th>Género</th><th>Idade</th><th>Cargo</th><th>Departamento</th><th>Situação</th><th>Contacto</th></tr></thead>
        <tbody>${list.map(m=>`<tr><td>${esc(m.nome)}</td><td>${esc(m.genero||'—')}</td><td>${m.idade??'—'}</td><td>${esc(m.cargo||'—')}</td><td>${esc(m.departamento||'—')}</td><td>${esc(m.situacao)}</td><td>${esc(m.tel||'—')}</td></tr>`).join('')}</tbody>
      </table></div>
    </div>`;
}

let lastReport = { rows:[], headers:[], node:null };

document.getElementById('btn-report-gerar').addEventListener('click', ()=>{
  const type = reportTypeSel.value;
  const out = document.getElementById('report-output');
  let html = '', rows = [], headers = [];

  if (type==='geral'){
    const f = {
      genero: document.getElementById('adv-genero').value,
      situacao: document.getElementById('adv-situacao').value,
      departamento: document.getElementById('adv-departamento').value,
      cargo: document.getElementById('adv-cargo').value,
      funcao: document.getElementById('adv-funcao').value,
      faixaEtaria: document.getElementById('adv-faixa').value,
      igreja: document.getElementById('adv-igreja').value,
      estadoCivil: document.getElementById('adv-estadocivil').value,
      provincia: document.getElementById('adv-provincia').value,
    };
    rows = DB.members.filter(m => Object.entries(f).every(([k,v]) => !v || m[k]===v))
      .sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
    const activeVals = Object.values(f).filter(Boolean);
    const title = activeVals.length ? 'Lista de Membros — ' + activeVals.join(' · ') : 'Lista Geral de Membros';
    html = memberReportTable(rows, title);
    headers = [{key:'nome',label:'Nome'},{key:'genero',label:'Género'},{key:'idade',label:'Idade'},{key:'cargo',label:'Cargo'},{key:'funcao',label:'Função'},{key:'departamento',label:'Departamento'},{key:'situacao',label:'Situação'},{key:'igreja',label:'Igreja/Centro'},{key:'estadoCivil',label:'Estado Civil'},{key:'provincia',label:'Província'},{key:'tel',label:'Telefone'}];
  } else if (type==='departamento'){
    const dep = reportFilterSel.value;
    rows = DB.members.filter(m=>m.departamento===dep).sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
    html = memberReportTable(rows, 'Departamento — ' + (dep||'—'));
    headers = [{key:'nome',label:'Nome'},{key:'genero',label:'Género'},{key:'idade',label:'Idade'},{key:'cargo',label:'Cargo'},{key:'situacao',label:'Situação'},{key:'tel',label:'Telefone'}];
  } else if (type==='situacao'){
    const sit = reportFilterSel.value;
    rows = DB.members.filter(m=>m.situacao===sit).sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
    html = memberReportTable(rows, 'Situação — ' + (sit||'—'));
    headers = [{key:'nome',label:'Nome'},{key:'genero',label:'Género'},{key:'departamento',label:'Departamento'},{key:'tel',label:'Telefone'}];
  } else if (type==='faixa'){
    const fx = reportFilterSel.value;
    rows = DB.members.filter(m=>m.faixaEtaria===fx).sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
    html = memberReportTable(rows, 'Faixa Etária — ' + (fx||'—'));
    headers = [{key:'nome',label:'Nome'},{key:'genero',label:'Género'},{key:'idade',label:'Idade'},{key:'departamento',label:'Departamento'}];
  } else if (type==='aniversario'){
    const mes = parseInt(reportFilterSel.value,10);
    rows = DB.members.filter(m=> m.dataNascimento && (new Date(m.dataNascimento+'T00:00:00').getMonth()+1)===mes)
      .sort((a,b)=> new Date(a.dataNascimento).getDate() - new Date(b.dataNascimento).getDate());
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    html = `<div class="card"><h3 class="u-b8af55">Aniversariantes de ${meses[mes-1]}</h3>
      <p class="u-c9d437 sub">${rows.length} membro(s)</p>
      <div class="tbl-scroll"><table class="data-table"><thead><tr><th>Dia</th><th>Nome</th><th>Idade</th><th>Departamento</th><th>Contacto</th></tr></thead>
      <tbody>${rows.map(m=>`<tr><td>${new Date(m.dataNascimento+'T00:00:00').getDate()}</td><td>${esc(m.nome)}</td><td>${m.idade??'—'}</td><td>${esc(m.departamento||'—')}</td><td>${esc(m.tel||'—')}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Sem aniversariantes neste mês.</div></td></tr>'}</tbody></table></div></div>`;
    headers = [{key:'nome',label:'Nome'},{get:r=>fmtDate(r.dataNascimento),label:'Data Nascimento'},{key:'departamento',label:'Departamento'},{key:'tel',label:'Telefone'}];
  } else if (type==='disciplina'){
    rows = DB.disciplina;
    html = `<div class="card"><h3 class="u-b8af55">Registo de Disciplina</h3>
      <p class="u-c9d437 sub">${rows.length} registo(s)</p>
      <div class="tbl-scroll"><table class="data-table"><thead><tr><th>Nome</th><th>Igreja/Cong.</th><th>Motivo</th><th>Aplicação</th><th>Levantamento</th></tr></thead>
      <tbody>${rows.map(d=>`<tr><td>${esc(d.nome)}</td><td>${esc(d.igreja||'—')}</td><td>${esc(d.motivo||'—')}</td><td>${fmtDate(d.dataAplicacao)}</td><td>${fmtDate(d.dataLevantamento)}</td></tr>`).join('')}</tbody></table></div></div>`;
    headers = [{key:'nome',label:'Nome'},{key:'igreja',label:'Igreja'},{key:'motivo',label:'Motivo'},{get:r=>fmtDate(r.dataAplicacao),label:'Data Aplicação'},{get:r=>fmtDate(r.dataLevantamento),label:'Data Levantamento'}];
  } else if (type==='visitantes'){
    rows = DB.visitantes;
    html = `<div class="card"><h3 class="u-b8af55">Visitantes com Guia</h3>
      <p class="u-c9d437 sub">${rows.length} registo(s)</p>
      <div class="tbl-scroll"><table class="data-table"><thead><tr><th>Nome</th><th>Origem</th><th>Centro Origem</th><th>Receção</th><th>Visto/Regresso</th></tr></thead>
      <tbody>${rows.map(v=>`<tr><td>${esc(v.nome)}</td><td>${esc(v.origem||'—')}</td><td>${esc(v.centroOrigem||'—')}</td><td>${fmtDate(v.dataRecepcao)}</td><td>${fmtDate(v.dataVisto)}</td></tr>`).join('')}</tbody></table></div></div>`;
    headers = [{key:'nome',label:'Nome'},{key:'origem',label:'Origem'},{key:'centroOrigem',label:'Centro Origem'},{get:r=>fmtDate(r.dataRecepcao),label:'Data Receção'},{get:r=>fmtDate(r.dataVisto),label:'Data Visto/Regresso'}];
  } else if (type==='cultos'){
    rows = DB.cultos.slice().sort((a,b)=>(a.data||'').localeCompare(b.data||''));
    html = `<div class="card"><h3 class="u-b8af55">Estatística dos Cultos</h3>
      <p class="u-c9d437 sub">${rows.length} registo(s)</p>
      <div class="tbl-scroll"><table class="data-table"><thead><tr><th>Data</th><th>Dia</th><th>Homens</th><th>Mulheres</th><th>Crianças</th><th>Obreiros</th><th>Visitas</th><th>Total</th><th>Ofertas</th><th>Dízimos</th></tr></thead>
      <tbody>${rows.map(c=>`<tr><td>${fmtDate(c.data)}</td><td>${esc(c.dia||'—')}</td><td>${c.homens??'—'}</td><td>${c.mulheres??'—'}</td><td>${c.criancas??'—'}</td><td>${c.obreiros??'—'}</td><td>${c.visitas??'—'}</td><td>${culToTotal(c)}</td><td>${fmtKz(c.ofertas)}</td><td>${fmtKz(c.dizimos)}</td></tr>`).join('') || '<tr><td colspan="10"><div class="empty">Sem cultos registados.</div></td></tr>'}</tbody></table></div></div>`;
    headers = [{get:r=>fmtDate(r.data),label:'Data'},{key:'dia',label:'Dia'},{key:'homens',label:'Homens'},{key:'mulheres',label:'Mulheres'},{key:'criancas',label:'Crianças'},{key:'obreiros',label:'Obreiros'},{key:'visitas',label:'Visitas'},{get:culToTotal,label:'Total'},{key:'ofertas',label:'Ofertas'},{key:'dizimos',label:'Dízimos'}];
  } else if (type==='inventario'){
    rows = DB.inventario;
    html = `<div class="card"><h3 class="u-b8af55">Inventário</h3>
      <p class="u-c9d437 sub">${rows.length} item(ns)</p>
      <div class="tbl-scroll"><table class="data-table"><thead><tr><th>Item</th><th>Categoria</th><th>Quantidade</th><th>Estado</th><th>Localização</th></tr></thead>
      <tbody>${rows.map(it=>`<tr><td>${esc(it.item)}</td><td>${esc(it.categoria||'—')}</td><td>${it.quantidade??'—'}</td><td>${esc(it.estado||'—')}</td><td>${esc(it.localizacao||'—')}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Sem itens registados.</div></td></tr>'}</tbody></table></div></div>`;
    headers = [{key:'item',label:'Item'},{key:'categoria',label:'Categoria'},{key:'quantidade',label:'Quantidade'},{key:'estado',label:'Estado'},{key:'localizacao',label:'Localização'}];
  } else if (type==='atividades'){
    rows = DB.atividades;
    html = `<div class="card"><h3 class="u-b8af55">Atividades — Programadas e Realizadas</h3>
      <p class="u-c9d437 sub">${rows.length} atividade(s)</p>
      <div class="tbl-scroll"><table class="data-table"><thead><tr><th>Atividade</th><th>Departamento</th><th>Programada</th><th>Realização</th><th>Estado</th></tr></thead>
      <tbody>${rows.map(a=>`<tr><td>${esc(a.nome)}</td><td>${esc(a.departamento||'—')}</td><td>${fmtDate(a.dataProgramada)}</td><td>${fmtDate(a.dataRealizacao)}</td><td>${esc(a.estado||'—')}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Sem atividades registadas.</div></td></tr>'}</tbody></table></div></div>`;
    headers = [{key:'nome',label:'Atividade'},{key:'departamento',label:'Departamento'},{get:r=>fmtDate(r.dataProgramada),label:'Data Programada'},{get:r=>fmtDate(r.dataRealizacao),label:'Data Realização'},{key:'estado',label:'Estado'}];
  } else if (type==='congregacoes'){
    const congs = getCongregacoes();
    const sedeT = sumFin(DB.financas);
    rows = [{nome:'Sede — Centro Monte Moriá', ...sedeT}, ...congs.map(c=>({nome:c, ...sumFin(DB.financasCongregacoes[c]||[])}))];
    html = `<div class="card"><h3 class="u-b8af55">Finanças por Congregação</h3>
      <p class="u-c9d437 sub">Totais acumulados</p>
      <div class="tbl-scroll"><table class="data-table"><thead><tr><th>Congregação</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${esc(r.nome)}</td><td>${fmtKz(r.entradas)}</td><td>${fmtKz(r.saidas)}</td><td>${fmtKz(r.saldo)}</td></tr>`).join('')}</tbody></table></div></div>`;
    headers = [{key:'nome',label:'Congregação'},{key:'entradas',label:'Entradas'},{key:'saidas',label:'Saídas'},{key:'saldo',label:'Saldo'}];
  }

  out.innerHTML = html;
  lastReport = { rows, headers };
  document.getElementById('btn-report-print').disabled = rows.length===0;
  document.getElementById('btn-report-csv').disabled = rows.length===0;
});

document.getElementById('btn-report-print').addEventListener('click', ()=>{
  const out = document.getElementById('report-output');
  if (out.firstElementChild) printNode(out);
});
document.getElementById('btn-report-csv').addEventListener('click', ()=>{
  downloadFile('relatorio.csv', toCSV(lastReport.rows, lastReport.headers), 'text/csv;charset=utf-8');
});

/* ============================================================
   5. FINANÇAS
   ============================================================ */
const CONGREGACOES_DEFAULT = ['Monte Sinai','Cenáculo da Fé','Tabernáculo de Davi'];
function getCongregacoes(){
  DB.settings.congregacoes = DB.settings.congregacoes || CONGREGACOES_DEFAULT.slice();
  return DB.settings.congregacoes;
}
let finState = { tab:'sede', cong: null };

function sumFin(arr){
  let e=0,s=0; arr.forEach(f=>{e+=Number(f.entradas)||0; s+=Number(f.saidas)||0;});
  return {entradas:e, saidas:s, saldo:e-s};
}

function renderFinancasKPI(){
  const congs = getCongregacoes();
  const sede = sumFin(DB.financas);
  let totalE = sede.entradas, totalS = sede.saidas;
  congs.forEach(c=>{ const t = sumFin(DB.financasCongregacoes[c]||[]); totalE+=t.entradas; totalS+=t.saidas; });
  document.getElementById('financas-kpi').innerHTML = `
    <div class="kpi"><div class="num">${fmtKz(totalE)}</div><div class="lbl">Entradas totais (Sede + Congregações)</div></div>
    <div class="kpi"><div class="num">${fmtKz(totalS)}</div><div class="lbl">Saídas totais</div></div>
    <div class="kpi"><div class="num">${fmtKz(totalE-totalS)}</div><div class="lbl">Saldo geral</div></div>
    <div class="kpi"><div class="num">${fmtKz(sede.entradas)}</div><div class="lbl">Entradas — Sede</div></div>
  `;
}

function financasEditable(){ return unlockedZones.has('admin') || (isLoggedIn() && canEditNow()); }

function renderFinancas(){
  renderFinancasKPI();
  const editable = financasEditable();
  let saldo = 0;
  document.getElementById('tbl-financas-body').innerHTML = DB.financas.map((f,i)=>{
    saldo += (Number(f.entradas)||0) - (Number(f.saidas)||0);
    return `<tr>
      <td>${esc(f.mes)}</td>
      <td><input type="number" data-fi="${i}" data-k="entradas" value="${f.entradas}" class="u-1a3055" ${editable?'':'disabled'}></td>
      <td><input type="number" data-fi="${i}" data-k="saidas" value="${f.saidas}" class="u-1a3055" ${editable?'':'disabled'}></td>
      <td><strong>${fmtKz(saldo)}</strong></td>
    </tr>`;
  }).join('');
  const totalE = DB.financas.reduce((s,f)=>s+(Number(f.entradas)||0),0);
  const totalS = DB.financas.reduce((s,f)=>s+(Number(f.saidas)||0),0);
  document.getElementById('tbl-financas-body').innerHTML += `<tr class="u-9c9c75"><td><strong>Total</strong></td><td><strong>${fmtKz(totalE)}</strong></td><td><strong>${fmtKz(totalS)}</strong></td><td><strong>${fmtKz(totalE-totalS)}</strong></td></tr>`;

  document.querySelectorAll('#tbl-financas-body input[data-fi]').forEach(inp=>{
    inp.addEventListener('change', ()=>{
      DB.financas[inp.dataset.fi][inp.dataset.k] = Number(inp.value)||0;
      saveDB(); renderFinancas(); renderDashboard();
    });
  });

  destroyChart('financas');
  charts.financas = new Chart(document.getElementById('chart-financas'), {
    type:'bar',
    data:{ labels:DB.financas.map(f=>f.mes), datasets:[
      {label:'Entradas', data:DB.financas.map(f=>f.entradas), backgroundColor:CHART_PALETTE[2], borderRadius:3},
      {label:'Saídas', data:DB.financas.map(f=>f.saidas), backgroundColor:CHART_PALETTE[3], borderRadius:3}
    ]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}, datalabels:dlConfig('bar')}, scales:{y:{beginAtZero:true}}, layout:{padding:{top:16}} }
  });

  renderFinancasCong();
  renderFinancasComparativo();
}
document.getElementById('btn-financas-unlock').addEventListener('click', ()=>{
  requireAdminAction('admin', 'Introduza a palavra-passe para editar os valores de Finanças.', ()=>{
    unlockedZones.add('admin');
    renderFinancas();
    toast('Edição de Finanças desbloqueada para esta sessão.');
  });
});

function renderFinancasCong(){
  const editable = financasEditable();
  const congs = getCongregacoes();
  if (!finState.cong || !congs.includes(finState.cong)) finState.cong = congs[0] || null;
  const sel = document.getElementById('cong-select');
  sel.innerHTML = congs.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  sel.value = finState.cong || '';
  sel.onchange = ()=>{ finState.cong = sel.value; renderFinancasCong(); };
  if (!finState.cong){
    document.getElementById('cong-chart-title').textContent = '—';
    document.getElementById('tbl-cong-body').innerHTML = `<tr><td colspan="4"><div class="empty">Nenhuma congregação registada. Use "+ Nova Congregação" para adicionar.</div></td></tr>`;
    destroyChart('cong');
    return;
  }
  const cong = finState.cong;
  document.getElementById('cong-chart-title').textContent = cong;
  const data = DB.financasCongregacoes[cong] || [];
  let saldo = 0;
  document.getElementById('tbl-cong-body').innerHTML = data.map((f,i)=>{
    saldo += (Number(f.entradas)||0) - (Number(f.saidas)||0);
    return `<tr>
      <td>${esc(f.mes)}</td>
      <td><input type="number" data-ci="${i}" data-k="entradas" value="${f.entradas}" class="u-1a3055" ${editable?'':'disabled'}></td>
      <td><input type="number" data-ci="${i}" data-k="saidas" value="${f.saidas}" class="u-1a3055" ${editable?'':'disabled'}></td>
      <td><strong>${fmtKz(saldo)}</strong></td>
    </tr>`;
  }).join('');
  document.querySelectorAll('#tbl-cong-body input[data-ci]').forEach(inp=>{
    inp.addEventListener('change', ()=>{
      DB.financasCongregacoes[cong][inp.dataset.ci][inp.dataset.k] = Number(inp.value)||0;
      saveDB(); renderFinancasCong(); renderFinancasKPI(); renderFinancasComparativo();
    });
  });
  destroyChart('cong');
  charts.cong = new Chart(document.getElementById('chart-cong'), {
    type:'bar',
    data:{ labels:data.map(f=>f.mes), datasets:[
      {label:'Entradas', data:data.map(f=>f.entradas), backgroundColor:CHART_PALETTE[1], borderRadius:3},
      {label:'Saídas', data:data.map(f=>f.saidas), backgroundColor:CHART_PALETTE[3], borderRadius:3}
    ]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}, datalabels:dlConfig('bar')}, scales:{y:{beginAtZero:true}}, layout:{padding:{top:16}} }
  });
}
document.getElementById('btn-cong-add').addEventListener('click', ()=>{
  requireAdminAction('admin', 'Introduza a palavra-passe para adicionar uma nova congregação.', ()=>{
    const nome = prompt('Nome da nova congregação:');
    if (!nome || !nome.trim()) return;
    const clean = nome.trim();
    const congs = getCongregacoes();
    if (congs.some(c=>c.toLowerCase()===clean.toLowerCase())){ toast('Já existe uma congregação com esse nome.'); return; }
    congs.push(clean);
    DB.financasCongregacoes[clean] = DB.financas.map(f=>({mes:f.mes, entradas:0, saidas:0}));
    finState.cong = clean;
    saveDB();
    logActivity('Adicionou', 'Congregação', clean);
    renderFinancas();
    toast('Congregação adicionada.');
  });
});
document.getElementById('btn-cong-remove').addEventListener('click', ()=>{
  const congs = getCongregacoes();
  if (!finState.cong){ toast('Não há nenhuma congregação selecionada.'); return; }
  requirePassword('admin', 'Introduza a palavra-passe para remover esta congregação e os seus dados financeiros.', ()=>{
    if (confirm(`Remover a congregação "${finState.cong}" e todos os seus registos financeiros? Esta ação não pode ser desfeita.`)){
      delete DB.financasCongregacoes[finState.cong];
      DB.settings.congregacoes = congs.filter(c=>c!==finState.cong);
      logActivity('Removeu', 'Congregação', finState.cong);
      finState.cong = null;
      saveDB();
      renderFinancas();
      toast('Congregação removida.');
    }
  });
});

function renderFinancasComparativo(){
  const congs = getCongregacoes();
  const labels = ['Sede', ...congs];
  const values = [sumFin(DB.financas).entradas, ...congs.map(c=>sumFin(DB.financasCongregacoes[c]||[]).entradas)];
  destroyChart('finComp');
  charts.finComp = new Chart(document.getElementById('chart-fin-comparativo'), {
    type:'bar',
    data:{ labels, datasets:[{label:'Total Entradas (Kz)', data:values, backgroundColor:CHART_PALETTE.slice(0,labels.length), borderRadius:3}]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, datalabels:dlConfig('bar')}, scales:{y:{beginAtZero:true}}, layout:{padding:{top:16}} }
  });
}

document.querySelector('#sec-financas .tabs-inline').addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-fintab]');
  if (!btn) return;
  document.querySelectorAll('#sec-financas .tabs-inline button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  finState.tab = btn.dataset.fintab;
  ['sede','congregacoes','comparativo'].forEach(t=>{
    document.getElementById('fin-'+t).classList.toggle('hidden', t!==finState.tab);
  });
});

document.getElementById('btn-financas-print').addEventListener('click', ()=>{
  const target = finState.tab==='sede' ? '#sec-financas .card' : (finState.tab==='congregacoes' ? '#fin-congregacoes' : '#fin-comparativo');
  printNode(document.querySelector(target));
});

/* ============================================================
   6. DISCIPLINA & VISITANTES
   ============================================================ */
function renderRegistos(){
  updateLockIndicators();
  document.getElementById('tbl-disciplina-body').innerHTML = DB.disciplina.map((d,i)=>{
    const meses = monthsBetween(d.dataAplicacao, d.dataLevantamento);
    let estado, tempoTxt;
    if (d.dataLevantamento){
      estado = '<span class="badge ok">Levantada</span>';
      tempoTxt = meses!==null ? meses+' mês(es) (concluída)' : '—';
    } else if (meses!==null && meses>=6){
      estado = '<span class="badge warn">Em condições de levantamento</span>';
      tempoTxt = meses+' mês(es)';
    } else if (meses!==null){
      estado = '<span class="badge bad">Em curso</span>';
      tempoTxt = meses+' mês(es)';
    } else {
      estado = '<span class="badge muted">Sem data</span>';
      tempoTxt = '—';
    }
    return `<tr>
      <td>${esc(d.nome)}</td><td>${esc(d.igreja||'—')}</td><td>${esc(d.motivo||'—')}</td>
      <td>${fmtDate(d.dataAplicacao)}</td><td>${tempoTxt}</td><td>${fmtDate(d.dataLevantamento)}</td>
      <td>${estado}</td><td>${esc(d.observacoes||'—')}</td>
      <td class="u-4ddbe9"><button class="btn ghost sm" data-editdisc="${i}">Editar</button> <button class="btn danger sm" data-deldisc="${i}">Eliminar</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="9"><div class="empty">Sem registos de disciplina.</div></td></tr>`;

  document.getElementById('tbl-visitantes-body').innerHTML = DB.visitantes.map((v,i)=>{
    const dias = daysBetween(v.dataRecepcao);
    let estado = '<span class="badge muted">—</span>';
    if (v.dataVisto){
      const d = new Date(v.dataVisto+'T00:00:00');
      estado = (!isNaN(d) && d < today()) ? '<span class="badge warn">Prazo expirado</span>' : '<span class="badge ok">No prazo</span>';
    }
    return `<tr>
      <td>${esc(v.nome)}</td><td>${esc(v.origem||'—')}</td><td>${esc(v.centroOrigem||'—')}</td>
      <td>${fmtDate(v.dataRecepcao)}</td><td>${dias!==null ? dias+' dia(s)' : '—'}</td><td>${fmtDate(v.dataVisto)}</td><td>${estado}</td>
      <td class="u-4ddbe9"><button class="btn ghost sm" data-editvis="${i}">Editar</button> <button class="btn danger sm" data-delvis="${i}">Eliminar</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="8"><div class="empty">Sem registos de visitantes.</div></td></tr>`;
}
/* Modal disciplina */
function disciplinaFieldsHTML(d){
  d = d || {};
  return `
    <div class="fields-grid">
      <div class="field"><label>Nome *</label><input type="text" data-f="nome" value="${esc(d.nome||'')}"></div>
      <div class="field"><label>Igreja / Congregação</label><input type="text" data-f="igreja" value="${esc(d.igreja||'')}"></div>
      <div class="u-1b9b41 field"><label>Motivo</label><input type="text" data-f="motivo" value="${esc(d.motivo||'')}"></div>
      <div class="field"><label>Data de Aplicação</label><input type="date" data-f="dataAplicacao" value="${esc(d.dataAplicacao||'')}"></div>
      <div class="field"><label>Data de Levantamento</label><input type="date" data-f="dataLevantamento" value="${esc(d.dataLevantamento||'')}"></div>
      <div class="u-1b9b41 field"><label>Observações</label><textarea data-f="observacoes" rows="2">${esc(d.observacoes||'')}</textarea></div>
    </div>`;
}
let editingDisciplinaIdx = null;
function openDisciplinaModal(idx){
  editingDisciplinaIdx = (idx===undefined||idx===null) ? null : idx;
  const d = editingDisciplinaIdx!==null ? DB.disciplina[editingDisciplinaIdx] : null;
  document.querySelector('#modal-disciplina h3').textContent = d ? 'Editar Registo de Disciplina' : 'Registo de Disciplina';
  document.getElementById('modal-disciplina-body').innerHTML = disciplinaFieldsHTML(d);
  document.getElementById('modal-disciplina').classList.add('open');
}
document.getElementById('btn-add-disciplina').addEventListener('click', ()=>{
  requirePassword('admin', 'Introduza a palavra-passe para adicionar um registo de disciplina.', ()=>{
    openDisciplinaModal(null);
  });
});
document.getElementById('btn-save-disciplina').addEventListener('click', ()=>{
  const body = document.getElementById('modal-disciplina-body');
  const rec = {};
  body.querySelectorAll('[data-f]').forEach(el=>rec[el.dataset.f]=el.value.trim()||null);
  if (!rec.nome){ toast('O nome é obrigatório.'); return; }
  if (editingDisciplinaIdx!==null){ DB.disciplina[editingDisciplinaIdx] = rec; }
  else { DB.disciplina.push(rec); }
  saveDB();
  logActivity(editingDisciplinaIdx!==null ? 'Editou' : 'Adicionou', 'Disciplina', rec.nome);
  document.getElementById('modal-disciplina').classList.remove('open');
  renderRegistos();
  toast(editingDisciplinaIdx!==null ? 'Registo de disciplina atualizado.' : 'Registo de disciplina adicionado.');
  editingDisciplinaIdx = null;
});

/* Modal visitante */
function visitanteFieldsHTML(v){
  v = v || {};
  return `
    <div class="fields-grid">
      <div class="field"><label>Nome *</label><input type="text" data-f="nome" value="${esc(v.nome||'')}"></div>
      <div class="field"><label>Contacto</label><input type="text" data-f="contacto" value="${esc(v.contacto||'')}"></div>
      <div class="field"><label>Ministério / Origem</label><input type="text" data-f="origem" value="${esc(v.origem||'')}"></div>
      <div class="field"><label>Centro / Congregação</label><input type="text" data-f="centroOrigem" value="${esc(v.centroOrigem||'')}"></div>
      <div class="field"><label>Data de Partida</label><input type="date" data-f="dataPartida" value="${esc(v.dataPartida||'')}"></div>
      <div class="field"><label>Data de Receção</label><input type="date" data-f="dataRecepcao" value="${esc(v.dataRecepcao||'')}"></div>
      <div class="field"><label>Data de Visto / Regresso</label><input type="date" data-f="dataVisto" value="${esc(v.dataVisto||'')}"></div>
      <div class="field"><label>Motivo</label><input type="text" data-f="motivo" value="${esc(v.motivo||'')}"></div>
      <div class="u-1b9b41 field"><label>Morada</label><input type="text" data-f="morada" value="${esc(v.morada||'')}"></div>
      <div class="u-1b9b41 field"><label>Observações</label><textarea data-f="observacoes" rows="2">${esc(v.observacoes||'')}</textarea></div>
    </div>`;
}
let editingVisitanteIdx = null;
function openVisitanteModal(idx){
  editingVisitanteIdx = (idx===undefined||idx===null) ? null : idx;
  const v = editingVisitanteIdx!==null ? DB.visitantes[editingVisitanteIdx] : null;
  document.querySelector('#modal-visitante h3').textContent = v ? 'Editar Registo de Visitante' : 'Registo de Visitante';
  document.getElementById('modal-visitante-body').innerHTML = visitanteFieldsHTML(v);
  document.getElementById('modal-visitante').classList.add('open');
}
document.getElementById('btn-add-visitante').addEventListener('click', ()=>{
  requirePassword('admin', 'Introduza a palavra-passe para adicionar um registo de visitante.', ()=>{
    openVisitanteModal(null);
  });
});
document.getElementById('btn-save-visitante').addEventListener('click', ()=>{
  const body = document.getElementById('modal-visitante-body');
  const rec = {};
  body.querySelectorAll('[data-f]').forEach(el=>rec[el.dataset.f]=el.value.trim()||null);
  if (!rec.nome){ toast('O nome é obrigatório.'); return; }
  if (editingVisitanteIdx!==null){ DB.visitantes[editingVisitanteIdx] = rec; }
  else { DB.visitantes.push(rec); }
  saveDB();
  logActivity(editingVisitanteIdx!==null ? 'Editou' : 'Adicionou', 'Visitante', rec.nome);
  document.getElementById('modal-visitante').classList.remove('open');
  renderRegistos();
  toast(editingVisitanteIdx!==null ? 'Registo de visitante atualizado.' : 'Registo de visitante adicionado.');
  editingVisitanteIdx = null;
});

/* ============================================================
   6B. FILTROS / VISITANTES / CONVERTIDOS / ANIVERSARIANTES
   ============================================================ */
function populateRegistosFilters(){
  const d=DB.disciplina||[], v=DB.visitantes||[], c=DB.members||[];
  fillSelect(document.getElementById('disc-filter-igreja'), uniqueVals(d,'igreja'), 'Igreja/Cong. — todas');
  fillSelect(document.getElementById('vis-filter-origem'), uniqueVals(v,'origem'), 'Origem — todas');
  fillSelect(document.getElementById('vis-filter-centro'), uniqueVals(v,'centroOrigem'), 'Centro Origem — todos');
  fillSelect(document.getElementById('conv-filter-igreja'), uniqueVals(c,'igreja'), 'Igreja / Centro — todos');
  fillSelect(document.getElementById('conv-filter-estado'), uniqueVals(c,'situacao'), 'Situação — todas');
  fillSelect(document.getElementById('conv-filter-genero'), uniqueVals(c,'genero'), 'Género — todos');
  const ds=['Levantada','Em condições de levantamento','Em curso','Sem data'];
  fillSelect(document.getElementById('disc-filter-estado'), ds, 'Estado — todos');
  fillSelect(document.getElementById('vis-filter-estado'), ['No prazo','Prazo expirado','—'], 'Estado — todos');
}
function textMatch(obj, q){
  if(!q) return true; q=q.toLowerCase();
  return Object.values(obj||{}).some(v=>v!==null && v!==undefined && String(v).toLowerCase().includes(q));
}
function inDateRange(value, from, to){
  if(!value) return !from&&!to;
  if(from && value<from) return false; if(to && value>to) return false; return true;
}
function disciplinaEstado(d){
  const meses=monthsBetween(d.dataAplicacao,d.dataLevantamento);
  if(d.dataLevantamento) return 'Levantada';
  if(meses!==null&&meses>=6) return 'Em condições de levantamento';
  if(meses!==null) return 'Em curso';
  return 'Sem data';
}
function visitanteEstado(v){
  if(!v.dataVisto) return '—';
  const d=new Date(v.dataVisto+'T00:00:00'); return (!isNaN(d)&&d<today())?'Prazo expirado':'No prazo';
}
function renderRegistos(){
  updateLockIndicators(); populateRegistosFilters();
  const dq=document.getElementById('disc-filter-text').value.trim(), di=document.getElementById('disc-filter-igreja').value, de=document.getElementById('disc-filter-estado').value, dfrom=document.getElementById('disc-filter-de').value, dto=document.getElementById('disc-filter-ate').value;
  const dlist=(DB.disciplina||[]).map((d,i)=>({d,i})).filter(({d})=>textMatch(d,dq)&&(!di||d.igreja===di)&&(!de||disciplinaEstado(d)===de)&&inDateRange(d.dataAplicacao,dfrom,dto));
  document.getElementById('tbl-disciplina-body').innerHTML=dlist.map(({d,i})=>{
    const meses=monthsBetween(d.dataAplicacao,d.dataLevantamento); const estado=disciplinaEstado(d);
    const badge=estado==='Levantada'?'ok':estado==='Em condições de levantamento'?'warn':estado==='Em curso'?'bad':'muted';
    return `<tr><td>${esc(d.nome)}</td><td>${esc(d.igreja||'—')}</td><td>${esc(d.motivo||'—')}</td><td>${fmtDate(d.dataAplicacao)}</td><td>${meses!==null?meses+' mês(es)':'—'}</td><td>${fmtDate(d.dataLevantamento)}</td><td><span class="badge ${badge}">${esc(estado)}</span></td><td>${esc(d.observacoes||'—')}</td><td><button class="btn ghost sm" data-editdisc="${i}">Editar</button> <button class="btn danger sm" data-deldisc="${i}">Eliminar</button></td></tr>`;
  }).join('')||`<tr><td colspan="9"><div class="empty">Sem registos com os filtros atuais.</div></td></tr>`;

  const vq=document.getElementById('vis-filter-text').value.trim(), vo=document.getElementById('vis-filter-origem').value, vc=document.getElementById('vis-filter-centro').value, ve=document.getElementById('vis-filter-estado').value, vf=document.getElementById('vis-filter-de').value, vt=document.getElementById('vis-filter-ate').value;
  const vlist=(DB.visitantes||[]).map((v,i)=>({v,i})).filter(({v})=>textMatch(v,vq)&&(!vo||v.origem===vo)&&(!vc||v.centroOrigem===vc)&&(!ve||visitanteEstado(v)===ve)&&inDateRange(v.dataRecepcao,vf,vt));
  document.getElementById('tbl-visitantes-body').innerHTML=vlist.map(({v,i})=>{ const dias=daysBetween(v.dataRecepcao); return `<tr><td>${esc(v.nome)}</td><td>${esc(v.contacto||'—')}</td><td>${esc(v.origem||'—')}</td><td>${esc(v.centroOrigem||'—')}</td><td>${fmtDate(v.dataRecepcao)}</td><td>${dias!==null?dias+' dia(s)':'—'}</td><td>${fmtDate(v.dataVisto)}</td><td><span class="badge ${visitanteEstado(v)==='Prazo expirado'?'warn':visitanteEstado(v)==='No prazo'?'ok':'muted'}">${esc(visitanteEstado(v))}</span></td><td><button class="btn ghost sm" data-editvis="${i}">Editar</button> <button class="btn danger sm" data-delvis="${i}">Eliminar</button></td></tr>`; }).join('')||`<tr><td colspan="9"><div class="empty">Sem registos com os filtros atuais.</div></td></tr>`;

  const cq=document.getElementById('conv-filter-text').value.trim(), ci=document.getElementById('conv-filter-igreja').value, cs=document.getElementById('conv-filter-estado').value, cg=document.getElementById('conv-filter-genero').value;
  const clist=(DB.convertidos||[]).map((m,i)=>({m,i})).filter(({m})=>{
    const hay=[m.nome,m.nBi,m.tel,m.email,m.provincia,m.municipio,m.morada,m.igreja,m.cargo,m.funcao,m.departamento,m.situacao,m.nCartao,m.obs].join(' ');
    return textMatch({texto:hay},cq)&&(!ci||m.igreja===ci)&&(!cs||m.situacao===cs)&&(!cg||m.genero===cg);
  });
  document.getElementById('tbl-convertidos-body').innerHTML=clist.map(({m,i})=>`<tr>
    <td><input type="checkbox" class="v10-conv-check v10-check" value="${esc(m.id)}" aria-label="Seleccionar ${esc(m.nome||'registo')}"></td><td><strong>${esc(m.nome||'—')}</strong></td><td>${esc(m.genero||'—')}</td><td>${esc(displayImportedDate(m,'dataNascimento'))}</td><td>${esc(m.estadoCivil||'—')}</td><td>${esc(m.nomeConjuge||'—')}</td><td>${esc(m.nacionalidade||'—')}</td><td>${esc(m.nBi||'—')}</td><td>${esc(m.infEscolar||'—')}</td><td>${esc(m.nomePai||'—')}</td><td>${esc(m.nomeMae||'—')}</td><td>${esc(m.tel||'—')}</td><td>${esc(m.email||'—')}</td><td>${esc(m.provincia||'—')}</td><td>${esc(m.municipio||'—')}</td><td>${esc(m.morada||'—')}</td><td>${esc(m.igreja||'—')}</td><td>${esc(m.cargo||'—')}</td><td>${esc(m.funcao||'—')}</td><td>${esc(m.departamento||'—')}</td><td>${esc(m.situacao||'—')}</td><td>${esc(displayImportedDate(m,'dataSituacao'))}</td><td>${esc(displayImportedDate(m,'dataBaptismo'))}</td><td>${esc(displayImportedDate(m,'dataConversao'))}</td><td>${esc(displayImportedDate(m,'dataRegisto'))}</td><td>${esc(m.nCartao||'—')}</td><td>${esc(m.obs||'—')}</td><td class="u-4ddbe9"><button class="btn ghost sm" data-editconvertido="${i}">Editar</button> <button class="btn danger sm" data-delconvertido="${i}">Eliminar</button></td>
  </tr>`).join('')||`<tr><td colspan="28"><div class="empty">Sem registos de convertidos com os filtros actuais.</div></td></tr>`;
}
function bindRegistoFilters(){
  ['disc-filter-text','disc-filter-igreja','disc-filter-estado','disc-filter-de','disc-filter-ate','vis-filter-text','vis-filter-origem','vis-filter-centro','vis-filter-estado','vis-filter-de','vis-filter-ate','conv-filter-text','conv-filter-igreja','conv-filter-estado','conv-filter-genero'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.addEventListener('input',renderRegistos); el.addEventListener('change',renderRegistos); } });
  [['disc-filter-clear','disc-filter-text','disc-filter-igreja','disc-filter-estado','disc-filter-de','disc-filter-ate'],['vis-filter-clear','vis-filter-text','vis-filter-origem','vis-filter-centro','vis-filter-estado','vis-filter-de','vis-filter-ate'],['conv-filter-clear','conv-filter-text','conv-filter-igreja','conv-filter-estado','conv-filter-genero']].forEach(([bid,...ids])=>document.getElementById(bid).addEventListener('click',()=>{ids.forEach(id=>document.getElementById(id).value='');renderRegistos();}));
}
// Replace original subtab behavior to include Convertidos.
document.querySelector('#sec-registos .tabs-inline').addEventListener('click',(e)=>{
  const btn=e.target.closest('button[data-sub]'); if(!btn) return;
  document.querySelectorAll('#sec-registos .tabs-inline button').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  document.getElementById('sub-disc').classList.toggle('hidden',btn.dataset.sub!=='disc'); document.getElementById('sub-vis').classList.toggle('hidden',btn.dataset.sub!=='vis'); document.getElementById('sub-conv').classList.toggle('hidden',btn.dataset.sub!=='conv');
});
// Harden edits/deletes in existing registos: always use master password.
document.getElementById('tbl-disciplina-body').addEventListener('click',(e)=>{
  const del=e.target.closest('[data-deldisc]'), edit=e.target.closest('[data-editdisc]');
  if(del) requirePassword('admin','Introduza a palavra-passe para eliminar este registo de disciplina.',()=>{ if(confirm('Eliminar este registo de disciplina? Poderá recuperá-lo na Lixeira.')){ const idx=Number(del.dataset.deldisc); moveToTrash('disciplina',DB.disciplina[idx],DB.disciplina[idx].nome); DB.disciplina.splice(idx,1); saveDB(); renderRegistos(); toast('Registo eliminado.'); }});
  if(edit) requirePassword('admin','Introduza a palavra-passe para editar este registo de disciplina.',()=>openDisciplinaModal(Number(edit.dataset.editdisc)));
});
document.getElementById('tbl-visitantes-body').addEventListener('click',(e)=>{
  const del=e.target.closest('[data-delvis]'), edit=e.target.closest('[data-editvis]');
  if(del) requirePassword('admin','Introduza a palavra-passe para eliminar este registo de visitante.',()=>{ if(confirm('Eliminar este registo de visitante? Poderá recuperá-lo na Lixeira.')){ const idx=Number(del.dataset.delvis); moveToTrash('visitante',DB.visitantes[idx],DB.visitantes[idx].nome); DB.visitantes.splice(idx,1); saveDB(); renderRegistos(); toast('Registo eliminado.'); }});
  if(edit) requirePassword('admin','Introduza a palavra-passe para editar este registo de visitante.',()=>openVisitanteModal(Number(edit.dataset.editvis)));
});
function convertidoFieldsHTML(c){
  c = c || {};
  return `<div class="fields-grid">
    <div class="field"><label>Nome *</label><input type="text" data-f="nome" value="${esc(c.nome||'')}"></div>
    <div class="field"><label>Género</label><input type="text" data-f="genero" value="${esc(c.genero||'')}"></div>
    <div class="field"><label>Data de Nascimento</label><input type="date" data-f="dataNascimento" value="${esc(c.dataNascimento||'')}"></div>
    <div class="field"><label>Estado Civil</label><input type="text" data-f="estadoCivil" value="${esc(c.estadoCivil||'')}"></div>
    <div class="field"><label>Nome do Cônjuge</label><input type="text" data-f="nomeConjuge" value="${esc(c.nomeConjuge||'')}"></div>
    <div class="field"><label>Nacionalidade</label><input type="text" data-f="nacionalidade" value="${esc(c.nacionalidade||'')}"></div>
    <div class="field"><label>Nº do BI</label><input type="text" data-f="nBi" value="${esc(c.nBi||'')}"></div>
    <div class="field"><label>Habilitações Literárias</label><input type="text" data-f="infEscolar" value="${esc(c.infEscolar||'')}"></div>
    <div class="field"><label>Nome do Pai</label><input type="text" data-f="nomePai" value="${esc(c.nomePai||'')}"></div>
    <div class="field"><label>Nome da Mãe</label><input type="text" data-f="nomeMae" value="${esc(c.nomeMae||'')}"></div>
    <div class="field"><label>Telefone</label><input type="text" data-f="tel" value="${esc(c.tel||'')}"></div>
    <div class="field"><label>E-mail</label><input type="email" data-f="email" value="${esc(c.email||'')}"></div>
    <div class="field"><label>Província</label><input type="text" data-f="provincia" value="${esc(c.provincia||'')}"></div>
    <div class="field"><label>Município</label><input type="text" data-f="municipio" value="${esc(c.municipio||'')}"></div>
    <div class="u-1b9b41 field"><label>Morada</label><input type="text" data-f="morada" value="${esc(c.morada||'')}"></div>
    <div class="field"><label>Igreja / Centro</label><input type="text" data-f="igreja" value="${esc(c.igreja||'')}"></div>
    <div class="field"><label>Cargo</label><input type="text" data-f="cargo" value="${esc(c.cargo||'')}"></div>
    <div class="field"><label>Função</label><input type="text" data-f="funcao" value="${esc(c.funcao||'')}"></div>
    <div class="field"><label>Departamento</label><input type="text" data-f="departamento" value="${esc(c.departamento||'')}"></div>
    <div class="field"><label>Situação</label><input type="text" data-f="situacao" value="${esc(c.situacao||'')}"></div>
    <div class="field"><label>Data da Situação</label><input type="date" data-f="dataSituacao" value="${esc(c.dataSituacao||'')}"></div>
    <div class="field"><label>Data do Batismo</label><input type="date" data-f="dataBaptismo" value="${esc(c.dataBaptismo||'')}"></div>
    <div class="field"><label>Data da Conversão</label><input type="date" data-f="dataConversao" value="${esc(c.dataConversao||'')}"></div>
    <div class="field"><label>Data de Registo</label><input type="date" data-f="dataRegisto" value="${esc(c.dataRegisto||'')}"></div>
    <div class="field"><label>Nº do Cartão</label><input type="text" data-f="nCartao" value="${esc(c.nCartao||'')}"></div>
    <div class="u-1b9b41 field"><label>Observações</label><textarea data-f="obs" rows="3">${esc(c.obs||'')}</textarea></div>
  </div>`;
}
let editingConvertidoIdx=null;
function openConvertidoModal(idx){
  editingConvertidoIdx = (idx===undefined||idx===null) ? null : idx;
  const c = editingConvertidoIdx!==null ? DB.convertidos[editingConvertidoIdx] : null;
  document.querySelector('#modal-convertido h3').textContent = c ? 'Editar Registo de Convertido' : 'Novo Registo de Convertido';
  document.getElementById('modal-convertido-body').innerHTML = convertidoFieldsHTML(c);
  document.getElementById('modal-convertido').classList.add('open');
}
document.getElementById('btn-save-convertido').addEventListener('click',()=>{
  const body=document.getElementById('modal-convertido-body'), rec={id:editingConvertidoIdx!==null?(DB.convertidos[editingConvertidoIdx]?.id||uid()):uid()};
  body.querySelectorAll('[data-f]').forEach(el=>rec[el.dataset.f]=el.value.trim()||null);
  if(!rec.nome){toast('O nome é obrigatório.');return;}
  if(editingConvertidoIdx!==null) DB.convertidos[editingConvertidoIdx]=rec; else DB.convertidos.push(rec);
  saveDB(); logActivity(editingConvertidoIdx!==null?'Editou':'Adicionou','Convertido',rec.nome);
  document.getElementById('modal-convertido').classList.remove('open'); editingConvertidoIdx=null; renderRegistos(); toast('Registo de convertido guardado.');
});
document.getElementById('tbl-convertidos-body').addEventListener('click',(e)=>{
  const edit=e.target.closest('[data-editconvertido]'), del=e.target.closest('[data-delconvertido]');
  if(edit) requireAdminAction('admin','Introduza a palavra-passe para editar este registo de convertido.',()=>openConvertidoModal(Number(edit.dataset.editconvertido)));
  if(del) requireAdminAction('admin','Introduza a palavra-passe para eliminar este registo de convertido.',()=>{const idx=Number(del.dataset.delconvertido),c=DB.convertidos[idx];if(!c)return;if(confirm('Eliminar este registo? Poderá recuperá-lo na Lixeira.')){moveToTrash('convertidos',c,c.nome);DB.convertidos.splice(idx,1);saveDB();renderRegistos();toast('Registo eliminado.');}});
});
document.getElementById('btn-add-convertido')?.addEventListener('click',()=>requireAdminAction('admin','Introduza a palavra-passe para adicionar um convertido.',()=>openConvertidoModal(null)));
function selectedConvertidoIds(){return Array.from(document.querySelectorAll('#tbl-convertidos-body .v10-conv-check:checked')).map(x=>x.value);}
function moveSelectedConvertidosToMembers(){
  const ids=selectedConvertidoIds(); if(!ids.length){toast('Seleccione pelo menos um convertido.');return;}
  requireAdminAction('admin','Introduza a palavra-passe para mover os convertidos para a Base Geral.',()=>{
    const rows=ids.map(id=>DB.convertidos.find(c=>String(c.id)===String(id))).filter(Boolean);
    let added=0, skipped=0;
    rows.forEach(c=>{if(findDuplicate(c.nome,null)){skipped++;return;} const m=clone(c)||{}; m.id=uid(); refreshComputed(m); DB.members.push(m); added++;});
    saveDB(); logActivity('Moveu convertidos para a Base Geral','Convertidos',added+' adicionado(s), '+skipped+' ignorado(s) por duplicação'); renderRegistos(); renderDatabase(); renderDashboard(); toast(added+' convertido(s) movido(s) para a Base Geral.'+(skipped?' '+skipped+' duplicado(s) ignorado(s).':''));
  });
}
document.getElementById('btn-conv-export').addEventListener('click',()=>exportCollectionData('convertidos','Convertidos'));
document.getElementById('btn-conv-import').addEventListener('click',()=>triggerCollectionImport('convertidos','Convertidos'));
function renderAniversariantes(){
  const ms=document.getElementById('aniv-month'), ws=document.getElementById('aniv-window'), ig=document.getElementById('aniv-igreja'), dp=document.getElementById('aniv-depto');
  const now=today(), month=ms.value==='all'?null:now.getMonth(); const win=Number(ws.value||0);
  fillSelect(ig,uniqueVals(DB.members,'igreja'),'Igreja/Centro — todas'); fillSelect(dp,uniqueVals(DB.members,'departamento'),'Departamento — todos');
  const igre=ig.value, dept=dp.value;
  const people=DB.members.filter(m=>m.dataNascimento).map(m=>({m,age:calcAge(m.dataNascimento),date:new Date(m.dataNascimento+'T00:00:00')})).filter(x=>x.date.getMonth()===x.date.getMonth());
  let list=people.filter(x=>{ const d=x.date; if(month!==null && d.getMonth()!==month) return false; if(igre&&x.m.igreja!==igre) return false; if(dept&&x.m.departamento!==dept) return false; if(win>0){ const base=new Date(now.getFullYear(),now.getMonth(),now.getDate()); let next=new Date(base); next.setDate(next.getDate()+win); let b=new Date(now.getFullYear(),d.getMonth(),d.getDate()); if(b<base && d.getMonth()===now.getMonth()) b.setFullYear(b.getFullYear()+1); if(d.getMonth()!==now.getMonth() && b<base) b.setFullYear(b.getFullYear()+1); if(b<base||b>next) return false; } return true; });
  list.sort((a,b)=>a.date.getMonth()-b.date.getMonth()||a.date.getDate()-b.date.getDate()||a.m.nome.localeCompare(b.m.nome,'pt'));
  document.getElementById('aniv-body').innerHTML=list.map(x=>`<tr><td>${String(x.date.getDate()).padStart(2,'0')}/${String(x.date.getMonth()+1).padStart(2,'0')}</td><td>${esc(x.m.nome)}</td><td>${x.age??'—'}</td><td>${esc(x.m.igreja||'—')}</td><td>${esc(x.m.departamento||'—')}</td><td>${esc(x.m.tel||'—')}</td></tr>`).join('')||`<tr><td colspan="6"><div class="empty">Nenhum aniversariante encontrado.</div></td></tr>`;
  const todayList=people.filter(x=>x.date.getMonth()===now.getMonth()&&x.date.getDate()===now.getDate()); const nextList=people.filter(x=>{let d=new Date(now.getFullYear(),x.date.getMonth(),x.date.getDate()); if(d<new Date(now.getFullYear(),now.getMonth(),now.getDate())) d.setFullYear(d.getFullYear()+1); let diff=Math.ceil((d-now)/86400000); return diff>0&&diff<=7;});
  const msg=[]; if(todayList.length) msg.push(`<div class="u-e8beae note">🎂 <strong>Hoje:</strong> ${todayList.map(x=>esc(x.m.nome)).join(', ')}</div>`); if(nextList.length) msg.push(`<div class="u-d43169 note">🔔 <strong>Próximos 7 dias:</strong> ${nextList.map(x=>esc(x.m.nome)+' ('+(x.date.getDate()+'/'+(x.date.getMonth()+1))+')').join(', ')}</div>`); if(!msg.length) msg.push('<div class="empty">Sem alertas de aniversários para hoje ou próximos 7 dias.</div>'); document.getElementById('aniv-alerts').innerHTML=msg.join('');
}
['aniv-month','aniv-window','aniv-igreja','aniv-depto'].forEach(id=>document.getElementById(id).addEventListener('change',renderAniversariantes));
document.getElementById('aniv-clear').addEventListener('click',()=>{document.getElementById('aniv-month').value='current';document.getElementById('aniv-window').value='0';document.getElementById('aniv-igreja').value='';document.getElementById('aniv-depto').value='';renderAniversariantes();});
document.getElementById('btn-aniv-print').addEventListener('click',()=>{document.getElementById('sec-aniversariantes').classList.add('printing-target');window.print();setTimeout(()=>document.getElementById('sec-aniversariantes').classList.remove('printing-target'),500);});
// Persist compatibility for older databases.
DB.convertidos = Array.isArray(DB.convertidos) ? DB.convertidos : [];
bindRegistoFilters();

/* ============================================================
   7. QUALIDADE DOS DADOS
   ============================================================ */
function renderQualidade(){
  document.getElementById('q-total').textContent = DB.members.length;
  document.getElementById('q-corrigidos').textContent = SEED.issues.length;
  document.getElementById('q-incompletos').textContent = DB.members.filter(m=>!m.dataNascimento).length;
  document.getElementById('q-semsituacao').textContent = DB.members.filter(m=>m.situacao==='Não definido').length;

  const fields = ['tel','email','morada','provincia','dataNascimento','dataBaptismo','cargo','departamento','situacao','estadoCivil'];
  const labels = {tel:'Telefone',email:'E-mail',morada:'Morada',provincia:'Província',dataNascimento:'Data Nascimento',dataBaptismo:'Data Batismo',cargo:'Cargo',departamento:'Departamento',situacao:'Situação',estadoCivil:'Estado Civil'};
  const missing = fields.map(f=>({f, n: DB.members.filter(m=>!m[f] || m[f]==='Não definido').length}));
  missing.sort((a,b)=>b.n-a.n);

  destroyChart('missing');
  charts.missing = new Chart(document.getElementById('chart-missing'), {
    type:'bar',
    data:{ labels:missing.map(x=>labels[x.f]), datasets:[{label:'Registos em falta', data:missing.map(x=>x.n), backgroundColor:CHART_PALETTE[3], borderRadius:3}]},
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, datalabels:dlConfig('bar',{horizontal:true})}, scales:{x:{beginAtZero:true}}, layout:{padding:{right:26}} }
  });

  document.getElementById('tbl-issues-body').innerHTML = SEED.issues.slice(0,120).map(i=>`
    <tr><td>${esc(i.membro)}</td><td>${esc(i.campo)}</td><td>${esc(i.motivo)}</td></tr>
  `).join('');
}

/* ============================================================
   8. ADICIONAR EM MASSA
   ============================================================ */
function normalizeImportedGender(g){
  if (!g) return null;
  const s = String(g).trim().toUpperCase();
  if (s.startsWith('F')) return 'Feminino';
  if (s.startsWith('M')) return 'Masculino';
  return null;
}

let massParsedValid = [];
document.getElementById('btn-mass-add').addEventListener('click', ()=>{
  requirePassword('admin', 'Introduza a palavra-passe para adicionar membros em massa.', ()=>{
    document.getElementById('mass-textarea').value = '';
    document.getElementById('mass-preview').innerHTML = '';
    document.getElementById('btn-mass-confirm').disabled = true;
    massParsedValid = [];
    document.getElementById('modal-mass').classList.add('open');
  });
});
document.getElementById('btn-mass-preview').addEventListener('click', ()=>{
  const raw = document.getElementById('mass-textarea').value;
  const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean);
  const seenInBatch = new Set();
  massParsedValid = [];
  if (!lines.length){
    document.getElementById('mass-preview').innerHTML = `<div class="note">Cole pelo menos uma linha para pré-visualizar.</div>`;
    document.getElementById('btn-mass-confirm').disabled = true;
    return;
  }
  const rows = lines.map(line=>{
    const parts = line.split(';').map(p=>p.trim());
    const [nome, genero, dataNascimento, tel, departamento, cargo, situacao] = parts;
    let status='ok', msg='Pronto a adicionar';
    if (!nome){ status='erro'; msg='Nome em falta — linha ignorada'; }
    else {
      const n = normName(nome);
      const dup = findDuplicate(nome, null);
      if (dup){ status='dup'; msg='Já cadastrado — ignorado'; }
      else if (seenInBatch.has(n)){ status='dup'; msg='Duplicado dentro da lista — ignorado'; }
    }
    if (status==='ok'){
      seenInBatch.add(normName(nome));
      massParsedValid.push({
        nome, genero: normalizeImportedGender(genero), dataNascimento: dataNascimento||null,
        tel: tel||null, departamento: departamento||null, cargo: cargo||null, situacao: situacao||'Ativo'
      });
    }
    return {nome: nome||'(sem nome)', status, msg};
  });
  const badge = r => r.status==='ok' ? `<span class="badge ok">${esc(r.msg)}</span>` : (r.status==='dup' ? `<span class="badge warn">${esc(r.msg)}</span>` : `<span class="badge bad">${esc(r.msg)}</span>`);
  document.getElementById('mass-preview').innerHTML = `
    <div class="u-a7409f note">${massParsedValid.length} válido(s) pronto(s) a adicionar · ${rows.filter(r=>r.status==='dup').length} duplicado(s) ignorado(s) · ${rows.filter(r=>r.status==='erro').length} com erro</div>
    <div class="u-cfa0e2 tbl-scroll"><table class="data-table"><thead><tr><th>Nome</th><th>Estado</th></tr></thead>
    <tbody>${rows.map(r=>`<tr><td>${esc(r.nome)}</td><td>${badge(r)}</td></tr>`).join('')}</tbody></table></div>
  `;
  document.getElementById('btn-mass-confirm').disabled = massParsedValid.length===0;
});
document.getElementById('btn-mass-confirm').addEventListener('click', ()=>{
  massParsedValid.forEach(rec=>{
    const record = Object.assign({id: uid()}, rec);
    refreshComputed(record);
    DB.members.push(record);
  });
  saveDB();
  logActivity('Adicionou em massa', 'Membro', massParsedValid.length + ' membro(s): ' + massParsedValid.map(r=>r.nome).slice(0,10).join(', ') + (massParsedValid.length>10?'…':''));
  toast(massParsedValid.length + ' membro(s) adicionado(s) com sucesso.');
  document.getElementById('modal-mass').classList.remove('open');
  renderDatabase(); renderDashboard();
  massParsedValid = [];
});

/* ============================================================
   9. BASE DE DADOS EXTRA (IMPORTAR/MESCLAR SEM ELIMINAR)
   ============================================================ */
document.getElementById('btn-merge-import').addEventListener('click', ()=>{
  requirePassword('admin', 'Introduza a palavra-passe para carregar uma base de dados extra.', ()=>{
    document.getElementById('merge-file-input').value = '';
    document.getElementById('merge-preview').innerHTML = '';
    document.getElementById('btn-merge-confirm').disabled = true;
    mergeParsedValid = [];
    document.getElementById('modal-merge').classList.add('open');
  });
});

function excelSerialToISO(n){
  const epoch = Date.UTC(1899,11,30);
  const d = new Date(epoch + n*86400000);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0,10);
}
function excelDateToISO(val){
  if (val===null||val===undefined||val==='') return null;
  if (typeof val === 'number') return excelSerialToISO(val);
  const s = String(val).trim();
  let m = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})$/);
  if (m){ let [,d,mo,y]=m; y=parseInt(y,10); if(y<100) y+= y>30?1900:2000; return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  return null;
}

const MERGE_HEADER_DICT = {
  nome: ['nome','nome completo','name'],
  genero: ['genero','género','sexo'],
  dataNascimento: ['data_nascimento','data nascimento','datanascimento','nascimento','data de nascimento'],
  tel: ['tel','telefone','contacto','phone'],
  email: ['email','e-mail'],
  departamento: ['departamento'],
  cargo: ['cargo'],
  funcao: ['funcao','função'],
  situacao: ['situacao','situação'],
  estadoCivil: ['estado civil','estado_civil'],
  provincia: ['provincia','província'],
  municipio: ['municipio','município'],
  morada: ['morada','endereco','endereço'],
  nBi: ['nº bi','n bi','bi','numero bi','nº do bi'],
  nCartao: ['nº cartão','ncartao','numero cartao','nº do cartão','nº cartao'],
  nomePai: ['nome pai','nome do pai'],
  nomeMae: ['nome mae','nome mãe','nome da mãe'],
  obs: ['obs','observacoes','observações'],
};
function mapHeaderRow(headers){
  const map = {};
  headers.forEach((h,i)=>{
    const norm = String(h||'').trim().toLowerCase();
    for (const key in MERGE_HEADER_DICT){
      if (MERGE_HEADER_DICT[key].includes(norm)){ map[i]=key; break; }
    }
  });
  return map;
}
function parseRowsGeneric(headers, dataRows){
  const map = mapHeaderRow(headers);
  if (!Object.values(map).includes('nome')) return null;
  return dataRows.map(row=>{
    const rec = {};
    row.forEach((val,i)=>{
      const key = map[i];
      if (key && val!==undefined && val!==null && String(val).trim()!==''){
        rec[key] = key==='dataNascimento' ? val : String(val).trim();
      }
    });
    return rec;
  }).filter(r=>r.nome);
}

let mergeParsedValid = [];
function buildMergePreview(list){
  mergeParsedValid = [];
  const dupNames = [];
  const seenInBatch = new Set();
  list.forEach(rec=>{
    if (!rec.nome) return;
    const n = normName(rec.nome);
    const dup = findDuplicate(rec.nome, null);
    if (dup || seenInBatch.has(n)){ dupNames.push(rec.nome); return; }
    seenInBatch.add(n);
    const clean = Object.assign({}, rec);
    if (clean.genero) clean.genero = normalizeImportedGender(clean.genero);
    if (clean.dataNascimento) clean.dataNascimento = excelDateToISO(clean.dataNascimento);
    mergeParsedValid.push(clean);
  });
  document.getElementById('merge-preview').innerHTML = `
    <div class="u-a7409f note">${mergeParsedValid.length} novo(s) membro(s) prontos a adicionar · ${dupNames.length} já cadastrado(s) (serão ignorados automaticamente)</div>
    ${mergeParsedValid.length ? `<div class="u-640a0d tbl-scroll"><table class="data-table"><thead><tr><th>Nome</th><th>Departamento</th><th>Telefone</th></tr></thead><tbody>${mergeParsedValid.slice(0,300).map(r=>`<tr><td>${esc(r.nome)}</td><td>${esc(r.departamento||'—')}</td><td>${esc(r.tel||'—')}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${dupNames.length ? `<div class="u-5371db note">Ignorados por já existirem: ${esc(dupNames.slice(0,20).join('; '))}${dupNames.length>20?'…':''}</div>` : ''}
  `;
  document.getElementById('btn-merge-confirm').disabled = mergeParsedValid.length===0;
}
function processMergeFile(file){
  const ext = file.name.split('.').pop().toLowerCase();
  const fail = (msg) => { document.getElementById('merge-preview').innerHTML = `<div class="u-1a4579 note">${esc(msg)}</div>`; document.getElementById('btn-merge-confirm').disabled = true; };

  if (ext==='json'){
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        const list = Array.isArray(data) ? data : (data.members || []);
        buildMergePreview(list.filter(m=>m && m.nome));
      }catch(e){ fail('Ficheiro JSON inválido.'); }
    };
    reader.readAsText(file);
  } else if (ext==='csv'){
    const reader = new FileReader();
    reader.onload = ()=>{
      const text = reader.result;
      const firstLine = text.split(/\r?\n/)[0] || '';
      const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
      const lines = text.split(/\r?\n/).filter(l=>l.trim());
      if (!lines.length){ fail('Ficheiro CSV vazio.'); return; }
      const headers = lines[0].split(sep).map(h=>h.replace(/^"|"$/g,''));
      const rows = lines.slice(1).map(l=>l.split(sep).map(c=>c.replace(/^"|"$/g,'')));
      const parsed = parseRowsGeneric(headers, rows);
      if (!parsed) fail('Não foi possível identificar a coluna "Nome" neste CSV.');
      else buildMergePreview(parsed);
    };
    reader.readAsText(file);
  } else if (ext==='xlsx' || ext==='xls'){
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const wb = XLSX.read(reader.result, {type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows2d = XLSX.utils.sheet_to_json(ws, {header:1, raw:false, defval:'', dateNF:'dd/mm/yyyy'});
        let headerRowIdx = 0;
        for (let i=0;i<Math.min(rows2d.length,10);i++){
          if (rows2d[i].some(c=>String(c).trim().toLowerCase().includes('nome'))){ headerRowIdx=i; break; }
        }
        const headers = rows2d[headerRowIdx] || [];
        const rows = rows2d.slice(headerRowIdx+1).filter(r=>r.some(c=>String(c).trim()!==''));
        const parsed = parseRowsGeneric(headers, rows);
        if (!parsed) fail('Não foi possível identificar a coluna "Nome" neste ficheiro Excel.');
        else buildMergePreview(parsed);
      }catch(e){ fail('Não foi possível ler este ficheiro Excel.'); }
    };
    reader.readAsArrayBuffer(file);
  } else {
    fail('Formato não suportado. Utilize .xlsx, .csv ou .json.');
  }
}
document.getElementById('merge-file-input').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if (file) processMergeFile(file);
});
document.getElementById('btn-merge-confirm').addEventListener('click', ()=>{
  mergeParsedValid.forEach(rec=>{
    const record = Object.assign({id: uid()}, rec);
    refreshComputed(record);
    DB.members.push(record);
  });
  saveDB();
  logActivity('Importou base extra', 'Membro', mergeParsedValid.length + ' membro(s): ' + mergeParsedValid.map(r=>r.nome).slice(0,10).join(', ') + (mergeParsedValid.length>10?'…':''));
  toast(mergeParsedValid.length + ' membro(s) adicionado(s) da base de dados extra.');
  document.getElementById('modal-merge').classList.remove('open');
  renderDatabase(); renderDashboard();
  mergeParsedValid = [];
});

/* ============================================================
   V9 — IMPORTAÇÃO / EXPORTAÇÃO TRANSVERSAL
   ============================================================ */
const TAB_COLLECTIONS = {
  database:'members', aniversariantes:'members', ficha:'members', reports:'members', financas:'financas', registos:'__registos__',
  cultos:'cultos', inventario:'inventario', atividades:'atividades', lixeira:'trash', utilizadores:'users', listas:'settings.lists', aparencia:'settings',
  qualidade:'members', dashboard:'dashboardConfig'
};
const TAB_LABELS_V9 = {dashboard:'Painel Geral',database:'Base de Dados de Membros',aniversariantes:'Aniversariantes',ficha:'Ficha Individual do Membro',reports:'Relatórios',financas:'Finanças',registos:'Disciplina, Visitantes & Convertidos',qualidade:'Qualidade dos Dados',cultos:'Estatística do Culto',inventario:'Inventário',atividades:'Estatística de Atividades',ajuda:'Tutorial / Ajuda',lixeira:'Lixeira / Recuperação de Dados',utilizadores:'Gestão de Utilizadores',listas:'Listas & Categorias',aparencia:'Aparência & Configuração'};
function getPathValue(obj,path){ return path.split('.').reduce((a,k)=>a==null?undefined:a[k],obj); }
function setPathValue(obj,path,val){ const parts=path.split('.'); let cur=obj; parts.slice(0,-1).forEach(k=>{cur[k]=cur[k]||{};cur=cur[k]}); cur[parts.at(-1)]=val; }
function csvCell(v){ const s=v==null?'':String(v); return /[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function downloadBlob(name,content,type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function exportCollectionData(collection,label){
  if(collection==='__registos__'){
    const bundle={disciplina:DB.disciplina||[],visitantes:DB.visitantes||[],convertidos:DB.convertidos||[]};
    const base=(label||'Registos').replace(/[^\wÀ-ÿ]+/g,'_');
    downloadBlob(base+'.json',JSON.stringify({exportedAt:new Date().toISOString(),collection,data:bundle},null,2),'application/json;charset=utf-8');
    try{ const rows=[...bundle.disciplina.map(x=>Object.assign({tipo:'Disciplina'},x)),...bundle.visitantes.map(x=>Object.assign({tipo:'Visitante'},x)),...bundle.convertidos.map(x=>Object.assign({tipo:'Convertido/Membro'},x))]; const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Registos'); const out=XLSX.write(wb,{bookType:'xlsx',type:'array'}); downloadBlob(base+'.xlsx',out,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); }catch(e){}
    toast('Exportação dos registos concluída.'); return;
  }
  let data=getPathValue(DB,collection); if(data===undefined) data=[];
  if(!Array.isArray(data)) data=[data];
  const rows=data.map(x=>x&&typeof x==='object'?x:{valor:x});
  const keys=Array.from(new Set(rows.flatMap(r=>Object.keys(r))));
  const csv=[keys.map(csvCell).join(';'),...rows.map(r=>keys.map(k=>csvCell(typeof r[k]==='object'?JSON.stringify(r[k]):r[k])).join(';'))].join('\n');
  const base=(label||collection).replace(/[^\wÀ-ÿ]+/g,'_');
  downloadBlob(base+'.csv','\ufeff'+csv,'text/csv;charset=utf-8');
  downloadBlob(base+'.json',JSON.stringify({exportedAt:new Date().toISOString(),collection,data},null,2),'application/json;charset=utf-8');
  try{ const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Dados'); const out=XLSX.write(wb,{bookType:'xlsx',type:'array'}); downloadBlob(base+'.xlsx',out,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); }catch(e){}
  toast('Exportação Excel, CSV e JSON concluída.');
}
function triggerCollectionImport(collection,label){
  let input=document.getElementById('v9-import-input');
  if(!input){ input=document.createElement('input'); input.type='file'; input.id='v9-import-input'; input.accept='.json,.csv,.txt,.xlsx,.xls'; input.style.display='none'; document.body.appendChild(input);}
  input.value=''; input.dataset.collection=collection; input.dataset.label=label||collection; input.onchange=()=>{const f=input.files[0]; if(f) processV9Import(f,collection,label||collection);}; input.click();
}
function normaliseHeader(h){return String(h||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');}
function excelDateToISO(v){
  if(v===null||v===undefined||v==='') return null;
  const raw=String(v).trim();
  // Datas já no formato ISO ou dd/mm/aaaa / dd-mm-aaaa.
  let m=raw.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  m=raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  // Excel serial date (dias desde 1899-12-30).
  if(/^\d+(?:\.\d+)?$/.test(raw)){
    const n=Number(raw); if(n>20000 && n<80000){
      const d=new Date(Date.UTC(1899,11,30)+Math.round(n)*86400000);
      if(!isNaN(d)) return d.toISOString().slice(0,10);
    }
  }
  const d=new Date(raw); if(!isNaN(d)) return d.toISOString().slice(0,10);
  return raw;
}
function displayImportedDate(m, key){
  if(!m) return '—';
  const rawKey = key + 'Original';
  const raw = m[rawKey];
  if(raw !== undefined && raw !== null && String(raw).trim() !== '') return String(raw).trim();
  const v = m[key];
  if(v === undefined || v === null || String(v).trim() === '') return '—';
  return fmtDate(v) || String(v);
}
const IMPORT_DATE_FIELDS = ['dataNascimento','dataSituacao','dataBaptismo','dataConversao','dataRegisto'];
function preserveImportedDate(out, dest, originalValue){
  if(originalValue === null || originalValue === undefined || String(originalValue).trim()==='') return;
  const raw = String(originalValue).trim();
  out[dest+'Original'] = raw;
  out[dest] = excelDateToISO(raw) || raw;
}

function mapImportedMember(r){
  // Os nomes abaixo cobrem tanto os cabeçalhos do ficheiro importado como
  // as variantes normalmente usadas em Excel/CSV. A Data da Conversão é
  // tratada explicitamente para não ser perdida durante a importação.
  const aliases={nome:['nome','nomecompleto'],genero:['genero','género','sexo'],dataNascimento:['datanasc','datanascimento','datadenascimento'],estadoCivil:['estadocivil'],nomeConjuge:['nomeconjuge','nomedoconjuge'],nacionalidade:['nacionalidade'],nBi:['nbi','nºdobi','numerodobi','numerobi'],infEscolar:['habilitacoesliterarias','habilitacoesliterarias','infescolar'],nomePai:['nomepai'],nomeMae:['nomemae'],tel:['telefone','tel'],email:['email','e-mail'],provincia:['provincia'],municipio:['municipio'],morada:['morada'],igreja:['igreja','igrejacentro'],cargo:['cargo'],funcao:['funcao','função'],departamento:['departamento'],situacao:['situacao','situação'],dataSituacao:['datadasituacao','datadasituação'],dataBaptismo:['datadobatismo','datadobaptismo','databaptismo','databatismo'],dataConversao:['datadaconversao','datadaconversao','dataconversao','datadeconversao','datadeconversão'],dataRegisto:['dataderegisto','dataregisto','datadoregisto'],nCartao:['numerodocartao','numerodocartão','ncartao'],obs:['observacoes','observações','obs']};
  const keys=Object.fromEntries(Object.keys(r).map(k=>[normaliseHeader(k),k])); const out={};
  Object.entries(aliases).forEach(([dest,names])=>{
    for(const n of names){const k=keys[normaliseHeader(n)]; if(k!==undefined){const value=String(r[k]??'').trim(); if(value){ if(IMPORT_DATE_FIELDS.includes(dest)) preserveImportedDate(out,dest,value); else out[dest]=value; } break;}}
  });
  // Algumas fontes trazem a data apenas como texto auxiliar.
  if(!out.dataConversao){
    const k=keys[normaliseHeader('dataConversaoTexto')] ?? keys[normaliseHeader('data da conversão texto')];
    if(k!==undefined && String(r[k]??'').trim()) preserveImportedDate(out,'dataConversao',String(r[k]).trim());
  }
  if(!out.nome) return null; return out;
}
function normaliseImportedMemberDates(m){
  if(!m) return m;
  IMPORT_DATE_FIELDS.forEach(k=>{
    const rawKey=k+'Original';
    if(m[rawKey]!==undefined && String(m[rawKey]).trim()!==''){
      const raw=String(m[rawKey]).trim();
      m[rawKey]=raw;
      m[k]=excelDateToISO(raw) || m[k] || raw;
    } else if(m[k]) {
      const raw=String(m[k]).trim();
      m[rawKey]=raw;
      m[k]=excelDateToISO(raw) || raw;
    }
  });
  if(!m.dataConversao && m.dataConversaoTexto){
    preserveImportedDate(m,'dataConversao',m.dataConversaoTexto);
  }
  return m;
}
function parseCsvText(text){
  const lines=text.replace(/^\ufeff/,'').split(/\r?\n/).filter(x=>x.trim()); if(!lines.length)return[];
  const delim=(lines[0].split(';').length>lines[0].split(',').length)?';':',';
  const parseLine=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'&&line[i+1]==='"'){cur+='"';i++;continue}if(ch==='"'){q=!q;continue}if(ch===delim&&!q){out.push(cur);cur='';}else cur+=ch;}out.push(cur);return out;};
  const headers=parseLine(lines[0]); return lines.slice(1).map(line=>{const vals=parseLine(line),o={};headers.forEach((h,i)=>o[h]=vals[i]??'');return o;});
}
function processV9Import(file,collection,label){
  const ext=file.name.split('.').pop().toLowerCase(); const finish=(rows)=>{
    if(!Array.isArray(rows)||!rows.length){toast('Não foram encontrados registos válidos.');return;}
    let incoming=rows; if(collection==='members') incoming=rows.map(mapImportedMember).filter(Boolean).map(normaliseImportedMemberDates);
    if(collection==='__registos__' && rows[0] && rows[0].data){ const bundle=rows[0].data; requireAdminAction('admin',`Introduza a palavra-passe para importar dados para ${label}.`,()=>{ if(Array.isArray(bundle.disciplina)) DB.disciplina=bundle.disciplina; if(Array.isArray(bundle.visitantes)) DB.visitantes=bundle.visitantes; if(Array.isArray(bundle.convertidos)) DB.convertidos=bundle.convertidos; saveDB(); renderRegistos(); renderDatabase(); renderDashboard(); toast('Registos importados com sucesso.'); }); return; }
    requireAdminAction('admin',`Introduza a palavra-passe para importar dados para ${label}.`,()=>{
      if(collection==='members'){let added=0,updated=0; incoming.forEach(r=>{const match=(r.id&&DB.members.find(m=>m.id===r.id))||DB.members.find(m=>String(m.nome||'').trim().toLowerCase()===String(r.nome||'').trim().toLowerCase()); if(match){Object.assign(match,r);refreshComputed(match);updated++;}else{const rec=Object.assign({id:uid()},r);refreshComputed(rec);DB.members.push(rec);added++;}}); saveDB(); renderDatabase(); renderRegistos(); renderDashboard(); toast(`Importação concluída: ${added} adicionado(s), ${updated} actualizado(s).`); return;}
      if(collection==='settings.lists'){ const cur=DB.settings.lists||{}; incoming.forEach(r=>{const key=r.categoria||r.category||r.lista||r.key; const val=r.valor||r.value||r.nome; if(key&&val){cur[key]=Array.from(new Set([...(cur[key]||[]),String(val)]));}}); DB.settings.lists=cur; saveDB(); toast('Listas importadas e actualizadas.'); if(typeof renderListas==='function')renderListas(); return;}
      if(collection==='dashboardConfig'){ DB.dashboardConfig=Object.assign({},DB.dashboardConfig,incoming[0]); saveDB(); toast('Configuração do painel importada.'); return;}
      if(collection==='settings'){ if(incoming[0]&&typeof incoming[0]==='object'){DB.settings=Object.assign({},DB.settings,incoming[0]);saveDB();toast('Configuração importada.');} return;}
      if(collection==='__registos__'){ const groups={disciplina:[],visitantes:[],convertidos:[]}; incoming.forEach(r=>{const t=String(r.tipo||'').toLowerCase(); const copy=Object.assign({},r); delete copy.tipo; if(t.includes('disciplina')) groups.disciplina.push(copy); else if(t.includes('visitante')) groups.visitantes.push(copy); else if(t.includes('convertido')||t.includes('membro')) groups.convertidos.push(mapImportedMember(copy)||copy);}); if(groups.disciplina.length) DB.disciplina=groups.disciplina; if(groups.visitantes.length) DB.visitantes=groups.visitantes; if(groups.convertidos.length) DB.convertidos=groups.convertidos.map(r=>Object.assign({id:r.id||uid()},normaliseImportedMemberDates(mapImportedMember(r)||r))); saveDB(); renderRegistos(); renderDatabase(); renderDashboard(); toast('Registos importados e actualizados.'); return;}
      const current=getPathValue(DB,collection); if(Array.isArray(current)){ current.push(...incoming.map(r=>typeof r==='object'?r:{valor:r})); saveDB(); toast(`${incoming.length} registo(s) importado(s) para ${label}.`);} else {setPathValue(DB,collection,incoming[0]);saveDB();toast(`Dados importados para ${label}.`);}
    });
  };
  if(ext==='json'){const rd=new FileReader();rd.onload=()=>{try{const j=JSON.parse(rd.result);finish(j.data||j.rows||j);}catch(e){toast('JSON inválido.');}};rd.readAsText(file);}
  else if(ext==='csv'||ext==='txt'){const rd=new FileReader();rd.onload=()=>finish(parseCsvText(rd.result));rd.readAsText(file);}
  else if(ext==='xlsx'||ext==='xls'){const rd=new FileReader();rd.onload=()=>{try{const wb=XLSX.read(rd.result,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];finish(XLSX.utils.sheet_to_json(ws,{defval:'', raw:false, dateNF:'dd/mm/yyyy'}));}catch(e){toast('Não foi possível ler o Excel.');}};rd.readAsArrayBuffer(file);}
  else toast('Formato não suportado.');
}
function injectV9TransferBars(){
  document.querySelectorAll('section.section').forEach(sec=>{
    if(sec.querySelector('.v9-transfer')) return; const key=sec.id.replace(/^sec-/,''); const collection=TAB_COLLECTIONS[key] || (key==='ajuda' ? 'settings' : null); if(!collection) return;
    const bar=document.createElement('div'); bar.className='v9-transfer'; bar.innerHTML=`<button class="btn ghost sm" data-v9-export="${key}">⇩ Exportar dados</button><button class="btn ghost sm" data-v9-import="${key}">⇧ Importar dados</button><span class="sub">Importação protegida por Admin</span>`;
    const top=sec.querySelector('.topbar'); if(top) top.appendChild(bar); else sec.prepend(bar);
  });
  document.querySelectorAll('[data-v9-export]').forEach(b=>b.onclick=()=>{const k=b.dataset.v9Export;exportCollectionData(TAB_COLLECTIONS[k],TAB_LABELS_V9[k]);});
  document.querySelectorAll('[data-v9-import]').forEach(b=>b.onclick=()=>{const k=b.dataset.v9Import;triggerCollectionImport(TAB_COLLECTIONS[k],TAB_LABELS_V9[k]);});
}
setTimeout(injectV9TransferBars,50);
/* ============================================================
   10. ESTATÍSTICA DO CULTO
   ============================================================ */
function culToTotal(c){ return (Number(c.homens)||0)+(Number(c.mulheres)||0)+(Number(c.criancas)||0)+(Number(c.obreiros)||0)+(Number(c.visitas)||0); }

function renderCultos(){
  const list = DB.cultos.slice().sort((a,b)=> (b.data||'').localeCompare(a.data||''));
  const totalFreq = list.reduce((s,c)=>s+culToTotal(c),0);
  const mediaFreq = list.length ? Math.round(totalFreq/list.length) : 0;
  const totalOfertas = list.reduce((s,c)=>s+(Number(c.ofertas)||0),0);
  const totalDizimos = list.reduce((s,c)=>s+(Number(c.dizimos)||0),0);
  document.getElementById('culto-kpi').innerHTML = `
    <div class="kpi"><div class="num">${list.length}</div><div class="lbl">Cultos registados</div></div>
    <div class="kpi"><div class="num">${mediaFreq}</div><div class="lbl">Frequência média</div></div>
    <div class="kpi"><div class="num">${fmtKz(totalOfertas)}</div><div class="lbl">Ofertas acumuladas</div></div>
    <div class="kpi"><div class="num">${fmtKz(totalDizimos)}</div><div class="lbl">Dízimos acumulados</div></div>
  `;

  document.getElementById('tbl-cultos-body').innerHTML = list.map((c,i)=>`
    <tr>
      <td>${fmtDate(c.data)}</td><td>${esc(c.dia||'—')}</td><td>${c.homens??'—'}</td><td>${c.mulheres??'—'}</td>
      <td>${c.criancas??'—'}</td><td>${c.obreiros??'—'}</td><td>${c.visitas??'—'}</td><td><strong>${culToTotal(c)}</strong></td>
      <td>${fmtKz(c.ofertas)}</td><td>${fmtKz(c.dizimos)}</td><td>${esc(c.disciplinar||'—')}</td>
      <td class="u-4ddbe9"><button class="btn ghost sm" data-editculto="${DB.cultos.indexOf(c)}">Editar</button> <button class="btn danger sm" data-delculto="${DB.cultos.indexOf(c)}">Eliminar</button></td>
    </tr>
  `).join('') || `<tr><td colspan="12"><div class="empty">Nenhum culto registado ainda.</div></td></tr>`;

  const chronological = list.slice().reverse();
  destroyChart('cultoFreq');
  charts.cultoFreq = new Chart(document.getElementById('chart-culto-freq'), {
    type:'line',
    data:{ labels:chronological.map(c=>fmtDate(c.data)+(c.dia?' ('+c.dia+')':'')), datasets:[{label:'Frequência Total', data:chronological.map(culToTotal), borderColor:CHART_PALETTE[0], backgroundColor:'rgba(18,33,58,.10)', fill:true, tension:.3}]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, datalabels:dlConfig('bar')}, scales:{y:{beginAtZero:true}}, layout:{padding:{top:16}} }
  });
  destroyChart('cultoOfertas');
  charts.cultoOfertas = new Chart(document.getElementById('chart-culto-ofertas'), {
    type:'bar',
    data:{ labels:chronological.map(c=>fmtDate(c.data)), datasets:[
      {label:'Ofertas', data:chronological.map(c=>Number(c.ofertas)||0), backgroundColor:CHART_PALETTE[1], borderRadius:3},
      {label:'Dízimos', data:chronological.map(c=>Number(c.dizimos)||0), backgroundColor:CHART_PALETTE[2], borderRadius:3}
    ]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}, datalabels:dlConfig('bar')}, scales:{y:{beginAtZero:true}}, layout:{padding:{top:16}} }
  });
}
function cultoFieldsHTML(c){
  c = c || {};
  return `<div class="fields-grid c3">
    <div class="field"><label>Data *</label><input type="date" data-f="data" value="${esc(c.data||'')}"></div>
    <div class="field"><label>Dia</label>
      <select data-f="dia"><option value="">—</option>${['Terça-feira','Quinta-feira','Sexta-feira','Domingo','Outro'].map(d=>`<option ${c.dia===d?'selected':''}>${d}</option>`).join('')}</select>
    </div>
    <div></div>
    <div class="field"><label>Homens</label><input type="number" data-f="homens" value="${c.homens??''}"></div>
    <div class="field"><label>Mulheres</label><input type="number" data-f="mulheres" value="${c.mulheres??''}"></div>
    <div class="field"><label>Crianças</label><input type="number" data-f="criancas" value="${c.criancas??''}"></div>
    <div class="field"><label>Obreiros</label><input type="number" data-f="obreiros" value="${c.obreiros??''}"></div>
    <div class="field"><label>Visitas</label><input type="number" data-f="visitas" value="${c.visitas??''}"></div>
    <div></div>
    <div class="field"><label>Ofertas (Kz)</label><input type="number" data-f="ofertas" value="${c.ofertas??''}"></div>
    <div class="field"><label>Dízimos (Kz)</label><input type="number" data-f="dizimos" value="${c.dizimos??''}"></div>
    <div></div>
    <div class="u-1b9b41 field"><label>Situação Disciplinar (resumo)</label><input type="text" data-f="disciplinar" value="${esc(c.disciplinar||'')}" placeholder="Ex: 1 caso de fornicação, 1 abandono"></div>
  </div>`;
}
let editingCultoIdx = null;
document.getElementById('btn-add-culto').addEventListener('click', ()=>{
  requireAdminAction('admin', 'Introduza a palavra-passe para registar um culto.', ()=>{
    editingCultoIdx = null;
    document.getElementById('modal-culto-title').textContent = 'Registar Culto';
    document.getElementById('modal-culto-body').innerHTML = cultoFieldsHTML();
    document.getElementById('modal-culto').classList.add('open');
  });
});
document.getElementById('tbl-cultos-body').addEventListener('click', (e)=>{
  const edit = e.target.closest('[data-editculto]');
  const del = e.target.closest('[data-delculto]');
  if (edit){
    requireAdminAction('admin', 'Introduza a palavra-passe para editar este culto.', ()=>{
      editingCultoIdx = Number(edit.dataset.editculto);
      document.getElementById('modal-culto-title').textContent = 'Editar Culto';
      document.getElementById('modal-culto-body').innerHTML = cultoFieldsHTML(DB.cultos[editingCultoIdx]);
      document.getElementById('modal-culto').classList.add('open');
    });
  }
  if (del){
    requirePassword('admin', 'Introduza a palavra-passe para eliminar este registo de culto.', ()=>{
      if (confirm('Eliminar este registo de culto? Poderá recuperá-lo na Lixeira.')){
        const idx = Number(del.dataset.delculto);
        moveToTrash('culto', DB.cultos[idx], fmtDate(DB.cultos[idx].data));
        logActivity('Eliminou', 'Culto', fmtDate(DB.cultos[idx].data));
        DB.cultos.splice(idx,1); saveDB(); renderCultos(); toast('Registo eliminado (movido para a Lixeira).');
      }
    });
  }
});
document.getElementById('btn-save-culto').addEventListener('click', ()=>{
  const body = document.getElementById('modal-culto-body');
  const rec = {};
  body.querySelectorAll('[data-f]').forEach(el=>{ const v = el.value.trim(); rec[el.dataset.f] = v===''?null: (el.type==='number'? Number(v) : v); });
  if (!rec.data){ toast('A data do culto é obrigatória.'); return; }
  if (editingCultoIdx!==null) DB.cultos[editingCultoIdx] = rec; else DB.cultos.push(rec);
  saveDB();
  logActivity(editingCultoIdx!==null ? 'Editou' : 'Adicionou', 'Culto', fmtDate(rec.data));
  document.getElementById('modal-culto').classList.remove('open');
  renderCultos();
  toast('Culto guardado.');
  editingCultoIdx = null;
});

/* ============================================================
   11. INVENTÁRIO
   ============================================================ */
function renderInventario(){
  const list = DB.inventario;
  const totalItens = list.reduce((s,i)=>s+(Number(i.quantidade)||0),0);
  const categorias = new Set(list.map(i=>i.categoria).filter(Boolean)).size;
  const danificados = list.filter(i=>i.estado==='Danificado'||i.estado==='Mau').length;
  document.getElementById('inv-kpi').innerHTML = `
    <div class="kpi"><div class="num">${list.length}</div><div class="lbl">Itens registados</div></div>
    <div class="kpi"><div class="num">${totalItens}</div><div class="lbl">Quantidade total</div></div>
    <div class="kpi"><div class="num">${categorias}</div><div class="lbl">Categorias</div></div>
    <div class="kpi"><div class="num">${danificados}</div><div class="lbl">Itens danificados / maus</div></div>
  `;
  document.getElementById('tbl-inv-body').innerHTML = list.map((it,i)=>`
    <tr>
      <td>${esc(it.item)}</td><td>${esc(it.categoria||'—')}</td><td>${it.quantidade??'—'}</td>
      <td>${estadoBadge(it.estado)}</td><td>${esc(it.localizacao||'—')}</td><td>${esc(it.observacoes||'—')}</td>
      <td class="u-4ddbe9"><button class="btn ghost sm" data-editinv="${i}">Editar</button> <button class="btn danger sm" data-delinv="${i}">Eliminar</button></td>
    </tr>
  `).join('') || `<tr><td colspan="7"><div class="empty">Nenhum item de inventário registado.</div></td></tr>`;

  const catCounts = countBy(list,'categoria');
  destroyChart('invCat');
  charts.invCat = new Chart(document.getElementById('chart-inv-cat'), {
    type:'doughnut',
    data:{ labels:Object.keys(catCounts), datasets:[{ data:Object.values(catCounts), backgroundColor:CHART_PALETTE }]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{boxWidth:11,font:{size:10}}}, datalabels:dlConfig('round')} }
  });
  const estCounts = countBy(list,'estado');
  destroyChart('invEstado');
  charts.invEstado = new Chart(document.getElementById('chart-inv-estado'), {
    type:'bar',
    data:{ labels:Object.keys(estCounts), datasets:[{label:'Itens', data:Object.values(estCounts), backgroundColor:CHART_PALETTE[1], borderRadius:3}]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, datalabels:dlConfig('bar')}, scales:{y:{beginAtZero:true, ticks:{precision:0}}}, layout:{padding:{top:16}} }
  });
}
function estadoBadge(s){
  if (s==='Bom') return `<span class="badge ok">${esc(s)}</span>`;
  if (s==='Danificado'||s==='Mau') return `<span class="badge bad">${esc(s)}</span>`;
  if (!s) return `<span class="badge muted">—</span>`;
  return `<span class="badge warn">${esc(s)}</span>`;
}
function invFieldsHTML(it){
  it = it || {};
  return `<div class="fields-grid">
    <div class="field"><label>Item *</label><input type="text" data-f="item" value="${esc(it.item||'')}"></div>
    <div class="field"><label>Categoria</label><input type="text" data-f="categoria" value="${esc(it.categoria||'')}" placeholder="Ex: Mobiliário, Som, Instrumentos"></div>
    <div class="field"><label>Quantidade</label><input type="number" data-f="quantidade" value="${it.quantidade??''}"></div>
    <div class="field"><label>Estado</label><select data-f="estado"><option value="">—</option>${['Bom','Razoável','Mau','Danificado'].map(o=>`<option ${it.estado===o?'selected':''}>${o}</option>`).join('')}</select></div>
    <div class="field"><label>Localização</label><input type="text" data-f="localizacao" value="${esc(it.localizacao||'')}"></div>
    <div class="u-1b9b41 field"><label>Observações</label><textarea data-f="observacoes" rows="2">${esc(it.observacoes||'')}</textarea></div>
  </div>`;
}
let editingInvIdx = null;
document.getElementById('btn-add-inv').addEventListener('click', ()=>{
  requireAdminAction('admin', 'Introduza a palavra-passe para adicionar um item ao inventário.', ()=>{
    editingInvIdx = null;
    document.getElementById('modal-inv-title').textContent = 'Novo Item';
    document.getElementById('modal-inv-body').innerHTML = invFieldsHTML();
    document.getElementById('modal-inv').classList.add('open');
  });
});
document.getElementById('tbl-inv-body').addEventListener('click', (e)=>{
  const edit = e.target.closest('[data-editinv]');
  const del = e.target.closest('[data-delinv]');
  if (edit){
    requireAdminAction('admin', 'Introduza a palavra-passe para editar este item.', ()=>{
      editingInvIdx = Number(edit.dataset.editinv);
      document.getElementById('modal-inv-title').textContent = 'Editar Item';
      document.getElementById('modal-inv-body').innerHTML = invFieldsHTML(DB.inventario[editingInvIdx]);
      document.getElementById('modal-inv').classList.add('open');
    });
  }
  if (del){
    requirePassword('admin', 'Introduza a palavra-passe para eliminar este item do inventário.', ()=>{
      if (confirm('Eliminar este item do inventário? Poderá recuperá-lo na Lixeira.')){
        const idx = Number(del.dataset.delinv);
        moveToTrash('inventario', DB.inventario[idx], DB.inventario[idx].item);
        logActivity('Eliminou', 'Inventário', DB.inventario[idx].item);
        DB.inventario.splice(idx,1); saveDB(); renderInventario(); toast('Item eliminado (movido para a Lixeira).');
      }
    });
  }
});
document.getElementById('btn-save-inv').addEventListener('click', ()=>{
  const body = document.getElementById('modal-inv-body');
  const rec = {};
  body.querySelectorAll('[data-f]').forEach(el=>{ const v=el.value.trim(); rec[el.dataset.f] = v===''?null:(el.type==='number'?Number(v):v); });
  if (!rec.item){ toast('O nome do item é obrigatório.'); return; }
  if (editingInvIdx!==null) DB.inventario[editingInvIdx] = rec; else DB.inventario.push(rec);
  saveDB();
  logActivity(editingInvIdx!==null ? 'Editou' : 'Adicionou', 'Inventário', rec.item);
  document.getElementById('modal-inv').classList.remove('open');
  renderInventario();
  toast('Item de inventário guardado.');
  editingInvIdx = null;
});
document.getElementById('btn-inv-print').addEventListener('click', ()=>{
  printNode(document.getElementById('inv-print-area'));
});

/* ============================================================
   12. ATIVIDADES (Programadas / Realizadas)
   ============================================================ */
function renderAtividades(){
  const list = DB.atividades;
  const programadas = list.filter(a=>a.estado==='Programada').length;
  const realizadas = list.filter(a=>a.estado==='Realizada').length;
  const adiadas = list.filter(a=>a.estado==='Adiada'||a.estado==='Cancelada').length;
  const taxa = list.length ? Math.round(realizadas/list.length*100) : 0;
  document.getElementById('ativ-kpi').innerHTML = `
    <div class="kpi"><div class="num">${list.length}</div><div class="lbl">Atividades registadas</div></div>
    <div class="kpi"><div class="num">${programadas}</div><div class="lbl">Programadas</div></div>
    <div class="kpi"><div class="num">${realizadas}</div><div class="lbl">Realizadas</div></div>
    <div class="kpi"><div class="num">${taxa}%</div><div class="lbl">Taxa de realização</div></div>
  `;
  document.getElementById('tbl-ativ-body').innerHTML = list.map((a,i)=>`
    <tr>
      <td>${esc(a.nome)}</td><td>${esc(a.departamento||'—')}</td><td>${fmtDate(a.dataProgramada)}</td><td>${fmtDate(a.dataRealizacao)}</td>
      <td>${ativEstadoBadge(a.estado)}</td><td>${esc(a.observacoes||'—')}</td>
      <td class="u-4ddbe9"><button class="btn ghost sm" data-editativ="${i}">Editar</button> <button class="btn danger sm" data-delativ="${i}">Eliminar</button></td>
    </tr>
  `).join('') || `<tr><td colspan="7"><div class="empty">Nenhuma atividade registada.</div></td></tr>`;

  const estCounts = countBy(list,'estado');
  destroyChart('ativEstado');
  charts.ativEstado = new Chart(document.getElementById('chart-ativ-estado'), {
    type:'doughnut',
    data:{ labels:Object.keys(estCounts), datasets:[{ data:Object.values(estCounts), backgroundColor:[CHART_PALETTE[2],CHART_PALETTE[1],CHART_PALETTE[3],CHART_PALETTE[6]] }]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{boxWidth:11,font:{size:10}}}, datalabels:dlConfig('round')} }
  });
  const deptCounts = countBy(list.filter(a=>a.departamento),'departamento');
  destroyChart('ativDepto');
  charts.ativDepto = new Chart(document.getElementById('chart-ativ-depto'), {
    type:'bar',
    data:{ labels:Object.keys(deptCounts), datasets:[{label:'Atividades', data:Object.values(deptCounts), backgroundColor:CHART_PALETTE[0], borderRadius:3}]},
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, datalabels:dlConfig('bar',{horizontal:true})}, scales:{x:{beginAtZero:true, ticks:{precision:0}}}, layout:{padding:{right:26}} }
  });
}
function ativEstadoBadge(s){
  if (s==='Realizada') return `<span class="badge ok">${esc(s)}</span>`;
  if (s==='Cancelada') return `<span class="badge bad">${esc(s)}</span>`;
  if (s==='Adiada') return `<span class="badge warn">${esc(s)}</span>`;
  if (!s) return `<span class="badge muted">—</span>`;
  return `<span class="badge muted">${esc(s)}</span>`;
}
function ativFieldsHTML(a){
  a = a || {};
  return `<div class="fields-grid">
    <div class="u-1b9b41 field"><label>Nome da Atividade *</label><input type="text" data-f="nome" value="${esc(a.nome||'')}"></div>
    <div class="field"><label>Departamento</label><input type="text" data-f="departamento" value="${esc(a.departamento||'')}"></div>
    <div class="field"><label>Estado</label><select data-f="estado"><option value="">—</option>${['Programada','Realizada','Adiada','Cancelada'].map(o=>`<option ${a.estado===o?'selected':''}>${o}</option>`).join('')}</select></div>
    <div class="field"><label>Data Programada</label><input type="date" data-f="dataProgramada" value="${esc(a.dataProgramada||'')}"></div>
    <div class="field"><label>Data de Realização</label><input type="date" data-f="dataRealizacao" value="${esc(a.dataRealizacao||'')}"></div>
    <div class="u-1b9b41 field"><label>Observações</label><textarea data-f="observacoes" rows="2">${esc(a.observacoes||'')}</textarea></div>
  </div>`;
}
let editingAtivIdx = null;
document.getElementById('btn-add-ativ').addEventListener('click', ()=>{
  requireAdminAction('admin', 'Introduza a palavra-passe para adicionar uma atividade.', ()=>{
    editingAtivIdx = null;
    document.getElementById('modal-ativ-title').textContent = 'Nova Atividade';
    document.getElementById('modal-ativ-body').innerHTML = ativFieldsHTML();
    document.getElementById('modal-ativ').classList.add('open');
  });
});
document.getElementById('tbl-ativ-body').addEventListener('click', (e)=>{
  const edit = e.target.closest('[data-editativ]');
  const del = e.target.closest('[data-delativ]');
  if (edit){
    requireAdminAction('admin', 'Introduza a palavra-passe para editar esta atividade.', ()=>{
      editingAtivIdx = Number(edit.dataset.editativ);
      document.getElementById('modal-ativ-title').textContent = 'Editar Atividade';
      document.getElementById('modal-ativ-body').innerHTML = ativFieldsHTML(DB.atividades[editingAtivIdx]);
      document.getElementById('modal-ativ').classList.add('open');
    });
  }
  if (del){
    requirePassword('admin', 'Introduza a palavra-passe para eliminar esta atividade.', ()=>{
      if (confirm('Eliminar esta atividade? Poderá recuperá-la na Lixeira.')){
        const idx = Number(del.dataset.delativ);
        moveToTrash('atividade', DB.atividades[idx], DB.atividades[idx].nome);
        logActivity('Eliminou', 'Atividade', DB.atividades[idx].nome);
        DB.atividades.splice(idx,1); saveDB(); renderAtividades(); toast('Atividade eliminada (movida para a Lixeira).');
      }
    });
  }
});
document.getElementById('btn-save-ativ').addEventListener('click', ()=>{
  const body = document.getElementById('modal-ativ-body');
  const rec = {};
  body.querySelectorAll('[data-f]').forEach(el=>rec[el.dataset.f]=el.value.trim()||null);
  if (!rec.nome){ toast('O nome da atividade é obrigatório.'); return; }
  if (editingAtivIdx!==null) DB.atividades[editingAtivIdx] = rec; else DB.atividades.push(rec);
  logActivity(editingAtivIdx!==null ? 'Editou' : 'Adicionou', 'Atividade', rec.nome);
  saveDB();
  document.getElementById('modal-ativ').classList.remove('open');
  renderAtividades();
  toast('Atividade guardada.');
  editingAtivIdx = null;
});

/* ============================================================
   13. TUTORIAL / AJUDA
   ============================================================ */
function renderAjuda(){
  const el = document.getElementById('ajuda-content');
  el.innerHTML = `
    <div class="u-8e8697 card">
      <h3 class="u-b27251">Bem-vindo(a)</h3>
      <p class="u-1386d5 sub">Este é o Sistema de Gestão de Membros do Centro Monte Moriá. Todos os dados ficam guardados
      automaticamente neste navegador (computador/dispositivo). Para levar os dados para outro computador, use
      "Exportar cópia (.json)" no Painel e depois "Importar backup" na Base de Dados.</p>
    </div>

    <div class="u-8b5267 grid2">
      <div class="card">
        <h3 class="u-2576bf">📊 Painel</h3>
        <p class="u-1386d5 sub">Vista geral com indicadores, gráficos e a Central de Alertas (disciplinas a levantar,
        visitantes fora do prazo, atividades por realizar). Use os filtros no topo para ver apenas um grupo específico de membros.</p>
      </div>
      <div class="card">
        <h3 class="u-2576bf">🗂️ Base de Dados</h3>
        <p class="u-4c7b29 sub">Pesquise, filtre, edite e elimine membros. Também pode:</p>
        <ul class="u-4acae5">
          <li><strong>+ Novo Membro</strong> — adiciona um membro de cada vez.</li>
          <li><strong>+ Adicionar em Massa</strong> — cola vários membros de uma vez (pede palavra-passe).</li>
          <li><strong>+ Base de Dados Extra</strong> — carrega um ficheiro Excel/CSV/JSON de outra fonte; os membros novos são adicionados e os já existentes são ignorados automaticamente (pede palavra-passe).</li>
        </ul>
      </div>
      <div class="card">
        <h3 class="u-2576bf">📇 Ficha Individual</h3>
        <p class="u-1386d5 sub">Procure um membro pelo nome e clique em "Imprimir Ficha" para gerar a ficha em papel A4, pronta a imprimir ou guardar em PDF.</p>
      </div>
      <div class="card">
        <h3 class="u-2576bf">📑 Relatórios</h3>
        <p class="u-1386d5 sub">Escolha o tipo de relatório (geral, por departamento, aniversariantes, disciplina, cultos, inventário, etc.), clique em "Gerar Relatório" e depois "Imprimir" ou "Exportar CSV".</p>
      </div>
      <div class="card">
        <h3 class="u-2576bf">💰 Finanças</h3>
        <p class="u-1386d5 sub">Regista entradas e saídas mensais da Sede e de cada congregação (Monte Sinai, Cenáculo da Fé, Tabernáculo de Davi). O separador "Comparativo" mostra o total de cada congregação lado a lado.</p>
      </div>
      <div class="card">
        <h3 class="u-2576bf">🛡️ Disciplina &amp; Visitantes</h3>
        <p class="u-1386d5 sub">Editar, adicionar ou eliminar registos pede sempre a palavra-passe de administração. Uma disciplina com mais de 6 meses sem levantamento fica assinalada como "Em condições de levantamento". Um visitante mostra automaticamente há quantos dias está no centro.</p>
      </div>
      <div class="card">
        <h3 class="u-2576bf">🎤 Estatística do Culto</h3>
        <p class="u-1386d5 sub">Registe a frequência (homens, mulheres, crianças, obreiros, visitas), ofertas, dízimos e situação disciplinar de cada culto. Os gráficos mostram a evolução ao longo do tempo.</p>
      </div>
      <div class="card">
        <h3 class="u-2576bf">📦 Inventário</h3>
        <p class="u-1386d5 sub">Lista de bens e materiais do centro, por categoria e estado de conservação. Pode imprimir a lista completa.</p>
      </div>
      <div class="card">
        <h3 class="u-2576bf">✅ Atividades</h3>
        <p class="u-1386d5 sub">Regista atividades programadas e o respetivo estado (Programada, Realizada, Adiada, Cancelada) para acompanhar a taxa de realização por departamento.</p>
      </div>
    </div>

    <div class="card">
      <h3 class="u-2576bf">🔒 Sobre a palavra-passe de administração</h3>
      <p class="u-4c7b29 sub">Algumas ações sensíveis (editar/eliminar Disciplina e Visitantes, Adicionar em Massa, Carregar Base de Dados Extra) pedem a palavra-passe de administração fornecida pela liderança do centro. Depois de introduzida corretamente uma vez, fica desbloqueada para o resto da sessão atual (até fechar a página).</p>
      <div class="note">Todos os dados ficam guardados apenas neste navegador. Exporte cópias de segurança regularmente através do botão "Exportar cópia (.json)".</div>
    </div>
  `;
}

/* ============================================================
   14. LIXEIRA (RECUPERAÇÃO DE DADOS ELIMINADOS)
   ============================================================ */
const TRASH_TARGET = {
  membro: ()=>DB.members, disciplina: ()=>DB.disciplina, visitante: ()=>DB.visitantes,
  culto: ()=>DB.cultos, inventario: ()=>DB.inventario, atividade: ()=>DB.atividades,
  convertidos: ()=>(DB.convertidos = DB.convertidos || []), financas: ()=>DB.financas,
  organigrama: ()=>{ DB.organigrama = DB.organigrama || {}; return (DB.organigrama.pessoas = DB.organigrama.pessoas || []); },
  direcao: ()=>{ DB.organigrama = DB.organigrama || {}; return (DB.organigrama.direcoes = DB.organigrama.direcoes || []); },
  departamento: ()=>{ DB.organigrama = DB.organigrama || {}; return (DB.organigrama.departamentos = DB.organigrama.departamentos || []); },
};
const TRASH_LABELS = {membro:'Membro', disciplina:'Disciplina', visitante:'Visitante', culto:'Culto', inventario:'Inventário', atividade:'Atividade',
  convertidos:'Convertidos', financas:'Finanças', organigrama:'Organigrama (pessoa)', direcao:'Direcção', departamento:'Departamento'
};
function renderLixeira(){
  const list = DB.trash;
  document.getElementById('tbl-lixeira-body').innerHTML = list.map((t,i)=>`
    <tr>
      <td>${esc(TRASH_LABELS[t.tipo]||t.tipo)}</td>
      <td>${esc(t.resumo||'—')}</td>
      <td>${new Date(t.eliminadoEm).toLocaleString('pt-PT')}</td>
      <td>${esc(t.eliminadoPor||'—')}</td>
      <td class="u-4ddbe9"><button class="btn ghost sm" data-restore="${i}">Restaurar</button> <button class="btn danger sm" data-purge="${i}">Eliminar Definitivamente</button></td>
    </tr>
  `).join('') || `<tr><td colspan="5"><div class="empty">A Lixeira está vazia.</div></td></tr>`;
}
document.getElementById('tbl-lixeira-body').addEventListener('click', (e)=>{
  const restore = e.target.closest('[data-restore]');
  const purge = e.target.closest('[data-purge]');
  if (restore){
    requirePassword('admin', 'Introduza a palavra-passe para restaurar este registo.', ()=>{
      const idx = Number(restore.dataset.restore);
      const t = DB.trash[idx];
      const getArr = t && TRASH_TARGET[t.tipo];
      const arr = getArr ? getArr() : null;
      if (!Array.isArray(arr)){ toast('Este tipo de registo não pode ser restaurado automaticamente; mantém-se na Lixeira.'); return; }
      arr.push(t.dados);
      DB.trash.splice(idx,1);
      saveDB();
      logActivity('Restaurou', TRASH_LABELS[t.tipo]||t.tipo, t.resumo);
      renderLixeira();
      toast('Registo restaurado com sucesso.');
    });
  }
  if (purge){
    requirePassword('admin', 'Introduza a palavra-passe para eliminar definitivamente este registo (ação irreversível).', ()=>{
      if (confirm('Eliminar definitivamente este registo? Esta ação não pode ser desfeita.')){
        const t = DB.trash[Number(purge.dataset.purge)];
        DB.trash.splice(Number(purge.dataset.purge),1);
        saveDB();
        logActivity('Eliminou definitivamente', TRASH_LABELS[t.tipo]||t.tipo, t.resumo);
        renderLixeira();
        toast('Registo eliminado definitivamente.');
      }
    });
  }
});
document.getElementById('btn-lixeira-purge-all').addEventListener('click', ()=>{
  requirePassword('admin', 'Introduza a palavra-passe para esvaziar toda a Lixeira (ação irreversível).', ()=>{
    if (!DB.trash.length){ toast('A Lixeira já está vazia.'); return; }
    if (confirm('Esvaziar toda a Lixeira? Todos os registos eliminados serão perdidos permanentemente.')){
      const n = DB.trash.length;
      DB.trash = [];
      saveDB();
      logActivity('Esvaziou a Lixeira', 'Sistema', n + ' registo(s) eliminado(s) definitivamente');
      renderLixeira();
      toast('Lixeira esvaziada.');
    }
  });
});

/* ============================================================
   15. GESTÃO DE UTILIZADORES
   ============================================================ */
const USER_PROFILES = {
  'Administrador': ALL_TABS.filter(t=>!['lixeira','utilizadores','listas','aparencia'].includes(t.key)).map(t=>t.key),
  'Secretaria': ['dashboard','database','ficha','reports','registos','qualidade','ajuda'],
  'Tesouraria': ['dashboard','financas','reports','ajuda'],
  'Protocolo': ['dashboard','registos','ajuda'],
  'Consulta (só leitura)': ALL_TABS.filter(t=>!['lixeira','utilizadores','listas','aparencia'].includes(t.key)).map(t=>t.key),
  'Personalizado': [],
};
function renderUsuarios(){
  document.querySelector('#sec-utilizadores .tabs-inline').querySelectorAll('button').forEach(b=>{
    b.onclick = ()=>{
      document.querySelectorAll('#sec-utilizadores .tabs-inline button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById('usersub-lista').classList.toggle('hidden', b.dataset.usersub!=='lista');
      document.getElementById('usersub-atividade').classList.toggle('hidden', b.dataset.usersub!=='atividade');
      if (b.dataset.usersub==='atividade') renderAudit();
    };
  });
  document.getElementById('tbl-users-body').innerHTML = DB.users.map((u,i)=>`
    <tr>
      <td>${esc(u.username)}</td>
      <td>${esc(u.perfil||'Personalizado')}</td>
      <td class="u-015ccf">${u.tabs.map(t=>{ const f=ALL_TABS.find(x=>x.key===t); return esc(f?f.label:t); }).join(', ') || '—'}</td>
      <td>${u.canEdit ? '<span class="badge ok">Sim</span>' : '<span class="badge muted">Não</span>'}</td>
      <td class="u-4ddbe9"><button class="btn ghost sm" data-edituser="${i}">Editar</button> <button class="btn danger sm" data-deluser="${i}">Eliminar</button></td>
    </tr>
  `).join('') || `<tr><td colspan="5"><div class="empty">Nenhum utilizador criado ainda. Apenas "admin" (palavra-passe mestra) tem acesso total.</div></td></tr>`;
}
document.getElementById('tbl-users-body').addEventListener('click', (e)=>{
  const edit = e.target.closest('[data-edituser]');
  const del = e.target.closest('[data-deluser]');
  if (edit) openUserModal(Number(edit.dataset.edituser));
  if (del){
    requirePassword('admin', 'Introduza a palavra-passe para eliminar este utilizador.', ()=>{
      if (confirm('Eliminar este utilizador?')){
        logActivity('Eliminou', 'Utilizador', DB.users[Number(del.dataset.deluser)].username);
        DB.users.splice(Number(del.dataset.deluser),1);
        saveDB(); renderUsuarios(); toast('Utilizador eliminado.');
      }
    });
  }
});
let editingUserIdx = null;
function userFieldsHTML(u){
  u = u || { tabs:[], canEdit:false, perfil:'Personalizado' };
  const profileNames = Object.keys(USER_PROFILES);
  return `
    <div class="fields-grid">
      <div class="field"><label>Nome de Utilizador *</label><input type="text" data-f="username" value="${esc(u.username||'')}" ${u.username?'readonly':''}></div>
      <div class="field"><label>Palavra-passe ${u.username?'(deixe em branco para manter)':'*'}</label><input type="password" data-f="password" value="" autocomplete="new-password"></div>
      <div class="field"><label>Perfil (preenchimento rápido)</label><select id="user-profile-select">${profileNames.map(p=>`<option value="${esc(p)}" ${u.perfil===p?'selected':''}>${esc(p)}</option>`).join('')}</select></div>
      <div class="field"><label>Pode Editar/Adicionar Dados?</label><select data-f="canEdit"><option value="true" ${u.canEdit?'selected':''}>Sim</option><option value="false" ${!u.canEdit?'selected':''}>Não (só consulta)</option></select></div>
    </div>
    <div class="group-title">Separadores Permitidos</div>
    <div class="fields-grid c3" id="user-tabs-checks">
      ${ALL_TABS.filter(t=>!['lixeira','utilizadores','listas','aparencia'].includes(t.key)).map(t=>`
        <label class="u-0b684f">
          <input type="checkbox" data-tabcheck="${t.key}" ${u.tabs.includes(t.key)?'checked':''}> ${esc(t.label)}
        </label>
      `).join('')}
    </div>
    <div class="u-002535 note">A eliminação de qualquer dado exige sempre a palavra-passe mestra, mesmo para utilizadores com permissão de edição.</div>
  `;
}
function openUserModal(idx){
  editingUserIdx = (idx===undefined||idx===null) ? null : idx;
  const u = editingUserIdx!==null ? DB.users[editingUserIdx] : null;
  document.getElementById('modal-user-title').textContent = u ? `Editar Utilizador — ${u.username}` : 'Novo Utilizador';
  document.getElementById('modal-user-body').innerHTML = userFieldsHTML(u);
  document.getElementById('user-profile-select').addEventListener('change', (e)=>{
    const tabs = USER_PROFILES[e.target.value] || [];
    document.querySelectorAll('#user-tabs-checks input[data-tabcheck]').forEach(cb=>{
      cb.checked = tabs.includes(cb.dataset.tabcheck);
    });
  });
  document.getElementById('modal-user-edit').classList.add('open');
}
document.getElementById('btn-add-user').addEventListener('click', ()=> openUserModal(null));
document.getElementById('btn-save-user').addEventListener('click', ()=>{
  const body = document.getElementById('modal-user-body');
  const username = body.querySelector('[data-f="username"]').value.trim();
  const password = body.querySelector('[data-f="password"]').value;
  const canEdit = body.querySelector('[data-f="canEdit"]').value === 'true';
  const tabs = Array.from(body.querySelectorAll('[data-tabcheck]')).filter(cb=>cb.checked).map(cb=>cb.dataset.tabcheck);
  const perfil = document.getElementById('user-profile-select').value;
  if (!username){ toast('O nome de utilizador é obrigatório.'); return; }
  if (username.toLowerCase()==='admin'){ toast('Este nome de utilizador está reservado para a administração.'); return; }
  let existing = editingUserIdx!==null ? DB.users[editingUserIdx] : null;
  if (!existing && DB.users.some(u=>u.username.toLowerCase()===username.toLowerCase())){ toast('Já existe um utilizador com este nome.'); return; }
  if (!existing && !password){ toast('Defina uma palavra-passe para o novo utilizador.'); return; }
  const rec = existing ? Object.assign({}, existing) : { username };
  rec.tabs = tabs; rec.canEdit = canEdit; rec.perfil = perfil;
  if (password) rec.password = password;
  if (existing) Object.assign(existing, rec); else DB.users.push(rec);
  saveDB();
  logActivity(existing ? 'Editou' : 'Criou', 'Utilizador', rec.username);
  document.getElementById('modal-user-edit').classList.remove('open');
  renderUsuarios();
  toast(existing ? 'Utilizador atualizado.' : 'Utilizador criado.');
  editingUserIdx = null;
});

function renderAudit(){
  const sel = document.getElementById('audit-filter-user');
  const users = Array.from(new Set(DB.auditLog.map(a=>a.user)));
  fillSelect(sel, users, 'Todos os utilizadores');
  const filterVal = sel.value;
  sel.onchange = renderAudit;
  const list = DB.auditLog.filter(a=> !filterVal || a.user===filterVal);
  document.getElementById('tbl-audit-body').innerHTML = list.slice(0,300).map(a=>`
    <tr>
      <td class="u-4ddbe9">${new Date(a.ts).toLocaleString('pt-PT')}</td>
      <td>${esc(a.user)}</td>
      <td>${esc(a.action)}</td>
      <td>${esc(a.entity)}</td>
      <td>${esc(a.summary||'—')}</td>
    </tr>
  `).join('') || `<tr><td colspan="5"><div class="empty">Ainda não há atividade registada.</div></td></tr>`;
}
document.getElementById('btn-audit-clear').addEventListener('click', ()=>{
  requirePassword('admin', 'Introduza a palavra-passe para limpar todo o registo de atividade.', ()=>{
    if (!DB.auditLog.length){ toast('O registo de atividade já está vazio.'); return; }
    if (confirm('Limpar todo o registo de atividade dos utilizadores? Esta ação não pode ser desfeita.')){
      DB.auditLog = [];
      saveDB();
      renderAudit();
      toast('Registo de atividade limpo.');
    }
  });
});

document.getElementById('btn-change-master-pw').addEventListener('click', ()=>{
  requirePassword('admin', 'Introduza a palavra-passe mestra atual para poder alterá-la.', ()=>{
    document.getElementById('new-master-pw').value = '';
    document.getElementById('new-master-pw2').value = '';
    document.getElementById('master-pw-error').style.display = 'none';
    document.getElementById('modal-master-pw').classList.add('open');
  });
});
document.getElementById('btn-master-pw-save').addEventListener('click', ()=>{
  const p1 = document.getElementById('new-master-pw').value;
  const p2 = document.getElementById('new-master-pw2').value;
  if (!p1 || p1!==p2){
    document.getElementById('master-pw-error').style.display = 'block';
    return;
  }
  DB.settings.adminPassword = p1;
  saveDB();
  document.getElementById('modal-master-pw').classList.remove('open');
  toast('Palavra-passe mestra alterada com sucesso.');
});

/* ============================================================
   16. PERSONALIZAR PAINEL (tipos e cores de gráficos)
   ============================================================ */
const BUILTIN_CHARTS = [
  {key:'faixa', label:'Membros por Faixa Etária', defaultType:'bar'},
  {key:'genero', label:'Distribuição por Género', defaultType:'doughnut'},
  {key:'depto', label:'Membros por Departamento', defaultType:'bar'},
  {key:'situacao', label:'Situação dos Membros', defaultType:'bar'},
  {key:'financasMini', label:'Finanças — Entradas vs. Saídas', defaultType:'line'},
];
let dashConfigDraft = null;
document.getElementById('btn-customize-dash').addEventListener('click', ()=>{
  requirePassword('admin', 'Introduza a palavra-passe para personalizar os gráficos do Painel.', openDashCustomModal);
});
function buildDashCustomBody(){
  const box = document.getElementById('modal-dash-custom-body');
  let html = `<div class="group-title">Gráficos do Painel</div>`;
  html += BUILTIN_CHARTS.map(c=>{
    const cfg = dashConfigDraft.charts[c.key] || {};
    return `<div class="u-ede874 fields-grid c3">
      <div class="u-a7409f field"><label>${esc(c.label)}</label></div>
      <div class="u-a7409f field"><label>Tipo de Gráfico</label><select data-builtin-type="${c.key}">${Object.entries(CHART_TYPES).map(([k,v])=>`<option value="${k}" ${(cfg.type||c.defaultType)===k?'selected':''}>${esc(v)}</option>`).join('')}</select></div>
      <div class="u-a7409f field"><label>Paleta de Cores</label><select data-builtin-palette="${c.key}">${Object.entries(PALETTES).map(([k,v])=>`<option value="${k}" ${(cfg.palette||'default')===k?'selected':''}>${esc(v.label)}</option>`).join('')}</select></div>
    </div>`;
  }).join('');

  html += `<div class="group-title">Gráficos Personalizados</div>`;
  if (!dashConfigDraft.customCharts.length){
    html += `<p class="u-c9d437 sub">Nenhum gráfico personalizado ainda — crie um abaixo.</p>`;
  } else {
    html += `<div class="u-da3293">` + dashConfigDraft.customCharts.map((c,i)=>`
      <div class="u-d47fd0">
        <span class="u-3044b6">${esc(c.title)} <span class="u-a52a91">— ${esc((CUSTOM_CHART_SOURCES[c.source]||{}).label||c.source)} · ${esc(c.field)} · ${esc(CHART_TYPES[c.type]||c.type)}</span></span>
        <button class="btn danger sm" data-rmcustom="${i}" type="button">Remover</button>
      </div>
    `).join('') + `</div>`;
  }

  html += `
    <div class="group-title">Adicionar Novo Gráfico</div>
    <div class="fields-grid c3">
      <div class="field"><label>Título</label><input type="text" id="newchart-title" placeholder="Ex: Cultos por Dia da Semana"></div>
      <div class="field"><label>Fonte de Dados</label><select id="newchart-source">${Object.entries(CUSTOM_CHART_SOURCES).map(([k,v])=>`<option value="${k}">${esc(v.label)}</option>`).join('')}</select></div>
      <div class="field"><label>Campo a Analisar</label><select id="newchart-field"></select></div>
      <div class="field"><label>Tipo de Gráfico</label><select id="newchart-type">${Object.entries(CHART_TYPES).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></div>
      <div class="field"><label>Paleta de Cores</label><select id="newchart-palette">${Object.entries(PALETTES).map(([k,v])=>`<option value="${k}">${esc(v.label)}</option>`).join('')}</select></div>
      <div class="u-bbe59a field"><button class="btn gold sm" id="btn-add-customchart" type="button">+ Adicionar Gráfico</button></div>
    </div>
  `;
  box.innerHTML = html;

  const sourceSel = document.getElementById('newchart-source');
  const fieldSel = document.getElementById('newchart-field');
  function refreshFieldOptions(){
    const src = CUSTOM_CHART_SOURCES[sourceSel.value];
    fieldSel.innerHTML = Object.entries(src.fields).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('');
  }
  sourceSel.addEventListener('change', refreshFieldOptions);
  refreshFieldOptions();

  document.getElementById('btn-add-customchart').addEventListener('click', ()=>{
    const title = document.getElementById('newchart-title').value.trim() || 'Gráfico Personalizado';
    dashConfigDraft.customCharts.push({
      id: uid(), title, source: sourceSel.value, field: fieldSel.value,
      type: document.getElementById('newchart-type').value, palette: document.getElementById('newchart-palette').value,
    });
    buildDashCustomBody();
  });
  box.querySelectorAll('[data-rmcustom]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      dashConfigDraft.customCharts.splice(Number(btn.dataset.rmcustom),1);
      buildDashCustomBody();
    });
  });
}
function openDashCustomModal(){
  dashConfigDraft = JSON.parse(JSON.stringify(DB.dashboardConfig));
  buildDashCustomBody();
  document.getElementById('modal-dash-custom').classList.add('open');
}
document.getElementById('btn-dash-custom-save').addEventListener('click', ()=>{
  BUILTIN_CHARTS.forEach(c=>{
    const typeSel = document.querySelector(`[data-builtin-type="${c.key}"]`);
    const palSel = document.querySelector(`[data-builtin-palette="${c.key}"]`);
    dashConfigDraft.charts[c.key] = { type: typeSel.value, palette: palSel.value };
  });
  DB.dashboardConfig = dashConfigDraft;
  saveDB();
  document.getElementById('modal-dash-custom').classList.remove('open');
  renderDashboard();
  toast('Personalização do Painel guardada.');
});

/* ============================================================
   17. LISTAS & CATEGORIAS (base administrável)
   ============================================================ */
const LIST_CATEGORIES = [
  {key:'departamento', label:'Departamento', field:'departamento'},
  {key:'cargo', label:'Cargo', field:'cargo'},
  {key:'funcao', label:'Função', field:'funcao'},
  {key:'igreja', label:'Igreja / Centro', field:'igreja'},
  {key:'situacao', label:'Situação', field:'situacao'},
  {key:'estadoCivil', label:'Estado Civil', field:'estadoCivil'},
];
let listasState = { cat: 'departamento' };
function countUsage(field, val){ const c = LIST_CATEGORIES.find(x=>x.field===field && x.coll); if (c) return (DB[c.coll]||[]).filter(r=>r[c.recField]===val).length; return DB.members.filter(m=>m[field]===val).length; }
function renderListas(){
  const tabsBox = document.querySelector('#sec-listas .tabs-inline');
  if (!tabsBox.dataset.built){
    tabsBox.innerHTML = LIST_CATEGORIES.map((c,i)=>`<button data-cat="${c.key}" class="${c.key===listasState.cat?'active':''}">${esc(c.label)}</button>`).join('');
    tabsBox.dataset.built = '1';
    tabsBox.addEventListener('click', (e)=>{
      const b = e.target.closest('button[data-cat]');
      if (!b) return;
      tabsBox.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      listasState.cat = b.dataset.cat;
      renderListasBody();
    });
  }
  renderListasBody();
}
function renderListasBody(){
  const cat = LIST_CATEGORIES.find(c=>c.key===listasState.cat);
  const box = document.getElementById('listas-body');
  const values = listFor(cat.key);
  box.innerHTML = `
    <div class="card">
      <h3 class="u-ac0f8b">${esc(cat.label)}</h3>
      <p class="u-228013 sub">Estes valores alimentam os menus, filtros e relatórios em toda a ferramenta. Alterar um valor aqui atualiza automaticamente todos os membros que o utilizam.</p>
      <div class="u-6d33f9">
        ${values.map((v,i)=>{
          const usage = countUsage(cat.field, v);
          return `<div class="u-faaa79">
            <input type="text" value="${esc(v)}" data-listval="${i}" class="u-da5cd6">
            <span class="u-4ddbe9 badge muted">${usage} membro(s)</span>
            <button class="btn ghost sm" data-savelist="${i}" type="button">Guardar</button>
            <button class="btn danger sm" data-dellist="${i}" type="button">Remover</button>
          </div>`;
        }).join('') || '<p class="sub">Nenhum valor definido ainda — adicione um abaixo.</p>'}
      </div>
      <div class="u-e7ec54 toolbar">
        <input type="text" id="listas-new-value" placeholder="Novo valor para ${esc(cat.label)}…">
        <button class="btn gold sm" id="btn-listas-add" type="button">+ Adicionar Valor</button>
      </div>
    </div>
  `;
  box.querySelectorAll('[data-savelist]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = Number(btn.dataset.savelist);
      const input = box.querySelector(`[data-listval="${idx}"]`);
      const newVal = input.value.trim();
      const oldVal = values[idx];
      if (!newVal){ toast('O valor não pode ficar vazio.'); return; }
      if (newVal===oldVal) return;
      requirePassword('admin', `Introduza a palavra-passe para alterar "${oldVal}" para "${newVal}".`, ()=>{
        values[idx] = newVal;
        let affected = 0;
        (cat.coll ? (DB[cat.coll]||[]) : DB.members).forEach(m=>{ const f = cat.recField || cat.field; if (m[f]===oldVal){ m[f]=newVal; affected++; } });
        saveDB();
        logActivity('Alterou lista', cat.label, `"${oldVal}" → "${newVal}" (${affected} membro(s))`);
        renderListasBody();
        renderDashboard(); renderDatabase();
        toast(`"${oldVal}" atualizado para "${newVal}" (${affected} membro(s) afetado(s)).`);
      });
    });
  });
  box.querySelectorAll('[data-dellist]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = Number(btn.dataset.dellist);
      const val = values[idx];
      const usage = countUsage(cat.field, val);
      requirePassword('admin', `Introduza a palavra-passe para remover "${val}" desta lista.`, ()=>{
        const msg = usage>0
          ? `"${val}" está atualmente associado a ${usage} membro(s). Ao remover, deixa de aparecer como opção para novos registos, mas os membros existentes mantêm o valor atual. Continuar?`
          : `Remover "${val}" desta lista?`;
        if (!confirm(msg)) return;
        values.splice(idx,1);
        saveDB();
        logActivity('Removeu da lista', cat.label, val);
        renderListasBody();
        toast('Valor removido da lista.');
      });
    });
  });
  document.getElementById('btn-listas-add').addEventListener('click', ()=>{
    const input = document.getElementById('listas-new-value');
    const val = input.value.trim();
    if (!val){ toast('Escreva um valor para adicionar.'); return; }
    if (values.some(v=>v.toLowerCase()===val.toLowerCase())){ toast('Esse valor já existe nesta lista.'); return; }
    requirePassword('admin', `Introduza a palavra-passe para adicionar "${val}" a ${cat.label}.`, ()=>{
      values.push(val);
      saveDB();
      logActivity('Adicionou à lista', cat.label, val);
      renderListasBody();
      toast('Valor adicionado à lista.');
    });
  });
}

/* ============================================================
   18. APARÊNCIA & CONFIGURAÇÃO (folha frontal)
   ============================================================ */
function renderAparencia(){
  const b = DB.settings.branding;
  document.getElementById('ap-logo-preview').src = currentLogoSrc();
  document.getElementById('ap-nome').value = b.nome || 'Centro Monte Moriá';
  document.getElementById('ap-subtitulo').value = b.subtitulo || 'Assembleia de Deus Pentecostal · Betel-Luanda';
  const ci = getChurchInfo();
  document.getElementById('ap-denom').value = ci.denom;
  document.getElementById('ap-ministerio').value = ci.ministerio;
  document.getElementById('ap-centro').value = ci.centro;
  document.getElementById('ap-endereco').value = ci.endereco;
  document.getElementById('ap-tel').value = ci.tel;
  document.getElementById('ap-pastor').value = ci.pastor;

  const themeBox = document.getElementById('ap-theme-swatches');
  const currentTheme = b.theme || 'dourado';
  themeBox.innerHTML = Object.entries(THEME_PRESETS).map(([key,t])=>`
    <button type="button" data-theme="${key}" class="theme-opt${key===currentTheme?' is-current':''}" aria-pressed="${key===currentTheme}">
      <span class="u-956d69">
        <svg class="theme-sw" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="${t.navy}"/></svg>
        <svg class="theme-sw" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="${t.gold}"/></svg>
      </span>
      <span class="u-61038d">${esc(t.label)}</span>
    </button>
  `).join('');
  themeBox.querySelectorAll('[data-theme]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      DB.settings.branding.theme = btn.dataset.theme;
      saveDB();
      logActivity('Alterou tema de cores', 'Aparência', THEME_PRESETS[btn.dataset.theme].label);
      applyTheme();
      renderAparencia();
      toast('Tema de cores aplicado.');
    });
  });

  renderApTabOrder();
}
function renderApTabOrder(){
  syncAllTabs();
  const builtins=ALL_TABS.filter(t=>!['lixeira','utilizadores','listas','aparencia'].includes(t.key));
  const saved=(DB.settings.branding.tabOrder && DB.settings.branding.tabOrder.length) ? DB.settings.branding.tabOrder.slice() : builtins.map(t=>t.key);
  let order=saved.filter(k=>ALL_TABS.some(t=>t.key===k));
  ALL_TABS.forEach(t=>{ if(!order.includes(t.key) && !['lixeira','utilizadores','listas','aparencia'].includes(t.key)) order.push(t.key); });
  DB.settings.branding.tabOrder=order;
  const box=document.getElementById('ap-tab-order-list');
  box.innerHTML=order.map((key,i)=>{
    const t=ALL_TABS.find(x=>x.key===key); const custom=getCustomTabs().find(x=>x.key===key); const label=displayTabLabel(t); const hidden=isTabHidden(key);
    return `<div class="u-3b8587">
      <div class="u-747a39">
        <span class="u-c7d7ee">${esc(t?label:key)}</span>
        <input type="text" data-tab-name="${esc(key)}" value="${esc(label)}" class="u-810bec">
        <label class="u-7ffd5c"><input type="checkbox" data-tab-hidden="${esc(key)}" ${hidden?'':'checked'}> Visível</label>
        <button class="btn ghost sm" data-mv="up" data-i="${i}" type="button" ${i===0?'disabled':''}>↑</button>
        <button class="btn ghost sm" data-mv="down" data-i="${i}" type="button" ${i===order.length-1?'disabled':''}>↓</button>
        ${custom?`<button class="btn danger sm" data-rm-custom="${esc(key)}" type="button">Remover Aba</button>`:''}
      </div>
      ${custom?`<div class="u-d43169"><textarea data-tab-content="${esc(key)}" rows="2" class="u-6d5673">${esc(custom.content||'')}</textarea></div>`:''}
    </div>`;
  }).join('');
  box.querySelectorAll('[data-tab-name]').forEach(inp=>inp.addEventListener('change',()=>{
    const key=inp.dataset.tabName, val=inp.value.trim(); if(!val) return;
    requirePassword('admin','Introduza a palavra-passe para alterar o nome da aba.',()=>{
      const custom=getCustomTabs().find(x=>x.key===key);
      if(custom) custom.label=val; else DB.settings.branding.tabLabels[key]=val;
      saveDB(); logActivity('Renomeou aba','Aparência',val); applyBranding(); renderAparencia();
    });
  }));
  box.querySelectorAll('[data-tab-hidden]').forEach(cb=>cb.addEventListener('change',()=>{
    requirePassword('admin','Introduza a palavra-passe para mostrar/ocultar a aba.',()=>{
      DB.settings.branding.tabHidden[cb.dataset.tabHidden]=!cb.checked; saveDB(); applyBranding(); renderAparencia();
    });
  }));
  box.querySelectorAll('[data-mv]').forEach(btn=>btn.addEventListener('click',()=>{
    const i=Number(btn.dataset.i), j=btn.dataset.mv==='up'?i-1:i+1; if(j<0||j>=order.length) return;
    requirePassword('admin','Introduza a palavra-passe para reordenar as abas.',()=>{ [order[i],order[j]]=[order[j],order[i]]; DB.settings.branding.tabOrder=order; saveDB(); applyBranding(); renderAparencia(); });
  }));
  box.querySelectorAll('[data-tab-content]').forEach(area=>area.addEventListener('change',()=>{
    const key=area.dataset.tabContent; const custom=getCustomTabs().find(x=>x.key===key); if(!custom) return;
    requirePassword('admin','Introduza a palavra-passe para alterar o conteúdo da aba.',()=>{ custom.content=area.value; saveDB(); logActivity('Alterou conteúdo de aba','Aparência',custom.label); renderCustomSections(); toast('Conteúdo da aba atualizado.'); });
  }));
  box.querySelectorAll('[data-rm-custom]').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.rmCustom; requirePassword('admin','Introduza a palavra-passe para remover esta aba.',()=>{
      if(!confirm('Remover esta aba personalizada? O conteúdo desta aba será eliminado.')) return;
      DB.settings.customTabs=DB.settings.customTabs.filter(t=>t.key!==key);
      DB.settings.branding.tabOrder=(DB.settings.branding.tabOrder||[]).filter(k=>k!==key);
      saveDB(); logActivity('Removeu aba personalizada','Aparência',key); applyBranding(); renderAparencia();
    });
  }));
}

document.getElementById('ap-logo-input').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{ document.getElementById('ap-logo-preview').src = reader.result; document.getElementById('ap-logo-preview').dataset.pending = reader.result; };
  reader.readAsDataURL(file);
});
document.getElementById('btn-ap-logo-save').addEventListener('click', ()=>{ requirePassword('admin','Introduza a palavra-passe para alterar o logótipo.',()=>{
  const pending = document.getElementById('ap-logo-preview').dataset.pending;
  if (!pending){ toast('Escolha primeiro um ficheiro de imagem.'); return; }
  DB.settings.branding.logo = pending;
  saveDB();
  logActivity('Alterou o logótipo', 'Aparência', '—');
  applyBranding();
  toast('Logótipo atualizado.');
  });
});
document.getElementById('btn-ap-logo-reset').addEventListener('click', ()=>{ requirePassword('admin','Introduza a palavra-passe para repor o logótipo.',()=>{
  DB.settings.branding.logo = null;
  saveDB();
  logActivity('Repôs o logótipo padrão', 'Aparência', '—');
  applyBranding();
  renderAparencia();
  toast('Logótipo padrão (ADP) restaurado.');
  });
});
document.getElementById('btn-ap-nome-save').addEventListener('click', ()=>{ requirePassword('admin','Introduza a palavra-passe para alterar o nome.',()=>{
  DB.settings.branding.nome = document.getElementById('ap-nome').value.trim() || 'Centro Monte Moriá';
  DB.settings.branding.subtitulo = document.getElementById('ap-subtitulo').value.trim() || 'Assembleia de Deus Pentecostal · Betel-Luanda';
  saveDB();
  logActivity('Alterou o nome da instituição', 'Aparência', DB.settings.branding.nome);
  applyBranding();
  toast('Nome da instituição atualizado.');
  });
});
document.getElementById('btn-ap-ficha-save').addEventListener('click', ()=>{ requirePassword('admin','Introduza a palavra-passe para alterar os dados da ficha.',()=>{
  DB.settings.branding.churchInfo = {
    denom: document.getElementById('ap-denom').value.trim(),
    ministerio: document.getElementById('ap-ministerio').value.trim(),
    centro: document.getElementById('ap-centro').value.trim(),
    endereco: document.getElementById('ap-endereco').value.trim(),
    tel: document.getElementById('ap-tel').value.trim(),
    pastor: document.getElementById('ap-pastor').value.trim(),
  };
  saveDB();
  logActivity('Alterou os dados da ficha impressa', 'Aparência', '—');
  toast('Dados da ficha individual atualizados.');
  });
});
document.getElementById('btn-ap-add-tab').addEventListener('click',()=>{
  const name=document.getElementById('ap-new-tab-name').value.trim(); const content=document.getElementById('ap-new-tab-content').value.trim();
  if(!name){ toast('Defina o nome da nova aba.'); return; }
  requirePassword('admin','Introduza a palavra-passe para adicionar uma nova aba.',()=>{
    const key='custom_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    DB.settings.customTabs.push({key,label:name,content});
    DB.settings.branding.tabOrder=(DB.settings.branding.tabOrder||[]).concat(key);
    saveDB(); logActivity('Criou aba personalizada','Aparência',name);
    document.getElementById('ap-new-tab-name').value=''; document.getElementById('ap-new-tab-content').value='';
    applyBranding(); renderAparencia(); toast('Nova aba adicionada ao menu.');
  });
});
document.getElementById('btn-ap-order-reset').addEventListener('click', ()=>{
  requirePassword('admin','Introduza a palavra-passe para repor a configuração das abas.',()=>{
  DB.settings.branding.tabOrder = null;
  DB.settings.branding.tabLabels = {};
  DB.settings.branding.tabHidden = {};
  saveDB();
  logActivity('Repôs a ordem padrão do menu', 'Aparência', '—');
  toast('Ordem do menu reposta. A página vai recarregar…');
  setTimeout(()=>window.location.reload(), 700);
  });
});


/* ============================================================
   V6 PRO — FINANÇAS, PAINEL, LISTAS, RELATÓRIOS, APARÊNCIA,
   PROVÍNCIAS/MUNICÍPIOS E FICHA INDIVIDUAL
   ============================================================ */
(function V6PRO(){
  const ANGOLA_PROVINCIAS = [
    'Bengo','Benguela','Bié','Cabinda','Cuando','Cuanza-Norte','Cuanza-Sul','Cubango','Cunene','Huambo','Huíla','Icolo e Bengo','Luanda','Lunda-Norte','Lunda-Sul','Malanje','Moxico','Moxico Leste','Namibe','Uíge','Zaire'
  ];
  /* Base inicial compatível com a DPA atual. O gestor pode acrescentar/editar/remover municípios na administração. */
  const ANGOLA_MUNICIPIOS = {
    'Bengo':['Dande','Ambriz','Bula Atumba','Nambuangongo','Pango Aluquém','Dembos-Quibaxe','Muxaluando','Barra do Dande','Piri','Quicunzo','Úcua','Panguila'],
    'Benguela':['Benguela','Lobito','Catumbela','Ganda','Bocoio','Balombo','Cubal','Baía Farta','Caimbambo','Chongorói','Egito Praia','Chindumbo','Dombe Grande','Capupa','Biópio','Chila','Chicuma','Babaera','Iambala','Catengue','Bolonguera','Canhamela','Navegantes'],
    'Bié':['Andulo','Chitembo','Cuito','Camacupa','Chinguar','Catabola','Cunhinga','Cuemba','Nharêa','Luando','Ringoma','Mumbué','Calucinga','Chicala','Chipeta','Umpulo','Lúbia','Cambândua','Belo Horizonte'],
    'Cabinda':['Cabinda','Cacongo','Buco Zau','Belize','Miconje','Massabi','Necuto','Tando Zinze','Liambo','Ngoio'],
    'Cuando':['Cuito Cuanavale','Dirico','Mavinga','Rivungo','Xipundo','Dima','Luiana','Mucusso','Luengue'],
    'Cuanza-Norte':['Cazengo','Golungo Alto','Cambambe','Samba Caju','Ambaca','Lucala','Banga','Bolongongo','Quiculungo','Ngonguembo','Massangano','Cêrca','Tango','Terreiro','Aldeia Nova','Caculo Cabaça','Luinga'],
    'Cuanza-Sul':['Sumbe','Calulo','Gabela','Cassongue','Porto Amboím','Quibala','Seles','Waku Kungo','Mussende','Quilenda','Ebo','Conda','Quirimbo','Munenga','Quissongo','Gungo','Sanga','Gangula','Pambangala','Condé','Amboiva','Lonhe','Quenha','Boa Entrada'],
    'Cubango':['Menongue','Cuchi','Calai','Nancova','Cuangar','Savate','Caiundo','Longa','Cutato','Chinguanja','Mavengue'],
    'Cunene':['Ombadja','Cuanhama','Curoca','Cahama','Cuvelai','Namacunde','Chiéde','Nehone','Humbe','Mupa','Naulila','Chitado','Cafima','Chissuata'],
    'Huambo':['Bailundo','Huambo','Londuimbali','Caála','Chicala Choloanga','Cachiungo','Mungo','Longonjo','Ucuma','Ecunha','Chinjenje','Bimbe','Sambo','Galanga','Alto Hama','Chilata','Cuima'],
    'Huíla':['Caconda','Gambos','Humpata','Lubango','Cuvango','Quipungo','Chibia','Quilengues','Caluquembe','Matala','Jamba Mineira','Chipindo','Chicomba','Cacula','Dongo','Hoque','Capelongo','Chituto','Capunda Cavilongo','Viti Vivali','Galangue','Palanca','Chicungo'],
    'Icolo e Bengo':['Catete','Quiçama','Calumbo','Cabiri','Cabo Ledo','Bom Jesus','Sequele'],
    'Luanda':['Ingombota','Cacuaco','Cazenga','Viana','Belas','Kilamba Kiaxi','Talatona','Mussulo','Sambizanga','Rangel','Maianga','Samba','Camama','Mulenvos','Kilamba','Hoji ya Henda'],
    'Lunda-Norte':['Cuilo','Dundo','Lubalo','Capenda Camulemba','Cuango','Lucapa','Cambulo','Xá Muteba','Caungula','Lóvua','Chitato','Xá Cassau','Camaxilo','Luangue','Luremo','Canzar','Cassanje Calucala','Mussungue','Cafunfo'],
    'Lunda-Sul':['Saurimo','Muconda','Cacolo','Dala','Chiluage','Cassai-Sul','Xassengue','Alto Chicapa','Sombo','Muriege','Luma Cassai','Cazage','Muangueji','Cassengo'],
    'Malanje':['Calandula','Malanje','Cacuso','Massango','Marimba','Quela','Quirima','Cangandala','Cahombo','Kunda dya Baze','Cambundi Catembo','Caculama','Kiwaba Nzoji','Luquembo','Cateco Cangola','Mbanji ya Ngola','Cuale','Pungu a Ndongo','Ngola Luiji','Quihuhu','Xandel','Cambo Suinginge','Milando','Quitapa','Capunda','Muquixe','Quêssua'],
    'Moxico':['Luena','Cangamba','Lumbala Nguimbo','Camanongue','Léua','Lutembo','Lucusse','Cangumbe','Chiúme','Alto Cuito','Ninda','Lutuai'],
    'Moxico Leste':['Cazombo','Luacano','Cameia','Luau','Nana Candundo','Macondo','Caianda','Lóvua do Zambeze','Lago Dilolo'],
    'Namibe':['Moçâmedes','Tômbwa','Bibala','Virei','Camucuio','Lucira','Iona','Sacomar','Cacimbas'],
    'Uíge':['Dange Quitexe','Bungo','Ambuíla','Negage','Puri','Maquela do Zombo','Damba','Sanza Pombo','Bembe','Milunga','Songo','Quimbele','Cangola','Uíge','Mucaba','Nova Esperança','Sacandica','Nsosso','Lucunga','Quipedro','Massau','Vista Alegre','Alto Zaza'],
    'Zaire':['Soyo','Mbanza Kongo','Nzeto','Tomboco','Cuimba','Nóqui','Luvo','Lufico','Quêlo','Serra de Canda','Quindeje']
  };
  window.MONTE_MORIA_ANGOLA_PROVINCIAS = ANGOLA_PROVINCIAS;
  window.MONTE_MORIA_ANGOLA_MUNICIPIOS = ANGOLA_MUNICIPIOS;

  function ensureProvincias(){
    DB.settings.lists = DB.settings.lists || {};
    DB.settings.lists.provincia = Array.from(new Set([...(DB.settings.lists.provincia||[]), ...ANGOLA_PROVINCIAS])).sort((a,b)=>a.localeCompare(b,'pt'));
    DB.settings.municipiosPorProvincia = DB.settings.municipiosPorProvincia || {};
    Object.entries(ANGOLA_MUNICIPIOS).forEach(([p,arr])=>{
      const old=DB.settings.municipiosPorProvincia[p]||[];
      DB.settings.municipiosPorProvincia[p]=Array.from(new Set([...arr,...old])).sort((a,b)=>a.localeCompare(b,'pt'));
    });
    return DB.settings.municipiosPorProvincia;
  }
  ensureProvincias();
  saveDB();

  /* ---------- Membros: Província → Município ---------- */
  const _openMemberModalV5 = openMemberModal;
  window.openMemberModal = function(id){
    _openMemberModalV5(id);
    const p = document.querySelector('#modal-member-body select[data-f="provincia"]');
    const m = document.querySelector('#modal-member-body select[data-f="municipio"]');
    if (!p || !m) return;
    const current = m.value;
    const renderMunicipios = (keep=true)=>{
      const prov=p.value;
      ensureProvincias();
      const base=(DB.settings.municipiosPorProvincia[prov]||[]).slice();
      const memberVals=uniqueVals(DB.members,'municipio').filter(v=>!prov || DB.members.some(x=>x.municipio===v && x.provincia===prov));
      const opts=Array.from(new Set([...base,...memberVals])).sort((a,b)=>a.localeCompare(b,'pt'));
      m.innerHTML='<option value="">—</option>'+opts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')+'<option value="__outro__">+ Outro (escrever)…</option>';
      if(keep && (opts.includes(current))) m.value=current;
      else if(keep && current && !opts.includes(current)) m.value='__outro__';
    };
    renderMunicipios(true);
    p.addEventListener('change',()=>renderMunicipios(false));
    if(!document.getElementById('member-municipio-custom')){
      const wrap=m.parentElement;
      const input=document.createElement('input'); input.id='member-municipio-custom'; input.type='text'; input.placeholder='Escreva o município'; input.style.cssText='margin-top:6px;display:none;';
      wrap.appendChild(input);
      m.addEventListener('change',()=>{input.style.display=m.value==='__outro__'?'block':'none'; if(m.value!=='__outro__') input.value='';});
    }
  };
  const oldSaveMember=document.getElementById('btn-save-member').onclick;
  document.getElementById('btn-save-member').addEventListener('click',()=>{
    const m=document.querySelector('#modal-member-body select[data-f="municipio"]');
    const custom=document.getElementById('member-municipio-custom');
    if(m && m.value==='__outro__' && custom){
      const val=custom.value.trim();
      if(!val){ toast('Informe o município.'); return; }
      if(!Array.from(m.options).some(o=>o.value===val)){ const opt=document.createElement('option'); opt.value=val; opt.textContent=val; m.insertBefore(opt,m.lastElementChild); }
      m.value=val;
    }
  },true);
  /* Re-wrap field layout for province/municipality as selects. */
  const provinceIdx=MEMBER_FIELDS_LAYOUT.findIndex(g=>g.title==='Contactos & Endereço');
  if(provinceIdx>=0){
    MEMBER_FIELDS_LAYOUT[provinceIdx].fields = MEMBER_FIELDS_LAYOUT[provinceIdx].fields.map(f=>{
      if(f[0]==='provincia') return ['provincia','Província','select',false,()=>listFor('provincia')];
      if(f[0]==='municipio') return ['municipio','Município','select',false,()=>[]];
      return f;
    });
  }

  /* ---------- Finanças: nomes + posições dos campos ---------- */
  DB.settings.financeLayout = DB.settings.financeLayout || {
    fields:[{key:'mes',label:'Mês'},{key:'entradas',label:'Entradas (Kz)'},{key:'saidas',label:'Saídas (Kz)'},{key:'saldo',label:'Saldo (Kz)'}]
  };
  function getFinFields(){ return DB.settings.financeLayout.fields; }
  function financeAdminPanel(){
    const old=document.getElementById('v6-finance-admin'); if(old) old.remove();
    const box=document.createElement('div'); box.id='v6-finance-admin'; box.className='card'; box.style.marginBottom='16px';
    const fields=getFinFields();
    box.innerHTML=`<h3 class="u-85f8ef">Personalizar campos de Finanças</h3><p class="u-c9d437 sub">Altere o nome e a posição das colunas. Os dados internos permanecem inalterados.</p><div id="v6-fin-list" class="u-1bc40a"></div>`;
    document.getElementById('sec-financas').insertBefore(box,document.querySelector('#sec-financas .kpi-grid'));
    const list=box.querySelector('#v6-fin-list');
    function draw(){ list.innerHTML=fields.map((f,i)=>`<div class="u-0d4298"><input data-finlabel="${i}" value="${esc(f.label)}" class="u-da5cd6"><span class="badge muted">${esc(f.key)}</span><button class="btn ghost sm" data-fup="${i}" ${i===0?'disabled':''}>↑</button><button class="btn ghost sm" data-fdown="${i}" ${i===fields.length-1?'disabled':''}>↓</button><button class="btn gold sm" data-fsave="${i}">Guardar</button></div>`).join('');
      list.querySelectorAll('[data-fup],[data-fdown],[data-fsave]').forEach(b=>b.addEventListener('click',()=>requirePassword('admin','Introduza a palavra-passe para alterar a estrutura de Finanças.',()=>{
        const i=Number(b.dataset.fup??b.dataset.fdown??b.dataset.fsave); if(b.dataset.fup!==undefined&&i>0){[fields[i-1],fields[i]]=[fields[i],fields[i-1]];} else if(b.dataset.fdown!==undefined&&i<fields.length-1){[fields[i+1],fields[i]]=[fields[i],fields[i+1]];} else if(b.dataset.fsave!==undefined){fields[i].label=list.querySelector(`[data-finlabel="${i}"]`).value.trim()||fields[i].label;}
        DB.settings.financeLayout.fields=fields; saveDB(); draw(); renderFinancas(); logActivity('Personalizou Finanças','Campos','Estrutura e nomes das colunas'); toast('Configuração de Finanças atualizada.');
      })));
    }
    draw();
  }
  const _renderFinancasV5=renderFinancas;
  window.renderFinancas=function(){
    _renderFinancasV5();
    const map={mes:'Mês',entradas:'Entradas (Kz)',saidas:'Saídas (Kz)',saldo:'Saldo (Kz)'};
    const cols=getFinFields();
    const keys=cols.map(f=>f.key);
    ['#tbl-financas','#tbl-cong'].forEach(sel=>{
      const table=document.querySelector(sel); if(!table) return;
      const ths=table.querySelectorAll('thead th');
      keys.forEach((key,i)=>{ const idx=['mes','entradas','saidas','saldo'].indexOf(key); if(ths[i]) ths[i].textContent=(cols.find(f=>f.key===key)||{}).label || map[key] || key; });
      table.querySelectorAll('tbody tr').forEach(tr=>{
        const cells=Array.from(tr.children);
        if(cells.length<4) return;
        const reordered=keys.map(key=>cells[['mes','entradas','saidas','saldo'].indexOf(key)]).filter(Boolean);
        reordered.forEach(td=>tr.appendChild(td));
      });
    });
  };
  document.getElementById('sec-financas').addEventListener('mouseenter',()=>{ if(!document.getElementById('v6-finance-admin')) financeAdminPanel(); },{once:true});

  /* ---------- Painel: editar/remover/adicionar gráficos ---------- */
  const _buildDashV5=buildDashCustomBody;
  window.buildDashCustomBody=function(){
    _buildDashV5();
    const box=document.getElementById('modal-dash-custom-body'); if(!box) return;
    box.querySelectorAll('[data-rmcustom]').forEach(btn=>{
      const row=btn.parentElement; if(row.querySelector('[data-editcustom]')) return;
      const ed=document.createElement('button'); ed.className='btn ghost sm'; ed.textContent='Editar'; ed.dataset.editcustom=btn.dataset.rmcustom;
      row.insertBefore(ed,btn);
      ed.addEventListener('click',()=>requirePassword('admin','Introduza a palavra-passe para editar este gráfico.',()=>{
        const i=Number(ed.dataset.editcustom), ch=DB.dashboardConfig.customCharts[i]; if(!ch) return;
        const title=prompt('Título do gráfico:',ch.title); if(title===null)return;
        const sourceKeys=Object.entries(CUSTOM_CHART_SOURCES).map(([k,v])=>`${k} = ${v.label}`).join('\\n');
        const source=prompt('Fonte de dados:\\n'+sourceKeys,ch.source); if(source===null)return;
        const src=CUSTOM_CHART_SOURCES[source.trim()]; if(!src){toast('Fonte de dados inválida.');return;}
        const fieldKeys=Object.entries(src.fields).map(([k,v])=>`${k} = ${v}`).join('\\n');
        const field=prompt('Campo a analisar:\\n'+fieldKeys,ch.field); if(field===null)return;
        if(!src.fields[field.trim()]){toast('Campo inválido para a fonte escolhida.');return;}
        const type=prompt('Tipo (bar, line, doughnut, pie, radar, polarArea):',ch.type); if(type===null)return;
        const pal=prompt('Paleta (default, pastel, ocean, forest, sunset):',ch.palette||'default'); if(pal===null)return;
        ch.title=title.trim()||ch.title; ch.source=source.trim(); ch.field=field.trim(); ch.type=type.trim(); ch.palette=pal.trim()||'default';
        DB.dashboardConfig.customCharts[i]=ch; saveDB(); buildDashCustomBody(); renderDashboard(); logActivity('Editou gráfico','Painel',ch.title); toast('Gráfico atualizado.');
      }));
    });
    const addBtn=box.querySelector('#btn-add-customchart');
    if(addBtn && !addBtn.dataset.v7Guard){
      addBtn.dataset.v7Guard='1';
      addBtn.addEventListener('click',(ev)=>{ ev.preventDefault(); ev.stopImmediatePropagation(); requirePassword('admin','Introduza a palavra-passe para adicionar um novo gráfico ao Painel.',()=>{
        const sourceSel=document.getElementById('newchart-source'), fieldSel=document.getElementById('newchart-field');
        const title=document.getElementById('newchart-title').value.trim()||'Gráfico Personalizado';
        DB.dashboardConfig.customCharts.push({id:uid(),title,source:sourceSel.value,field:fieldSel.value,type:document.getElementById('newchart-type').value,palette:document.getElementById('newchart-palette').value});
        saveDB(); buildDashCustomBody(); renderDashboard(); logActivity('Adicionou gráfico','Painel',title); toast('Gráfico adicionado.');
      }); }, true);
    }
    box.querySelectorAll('[data-rmcustom]').forEach(btn=>{
      if(btn.dataset.v7Guard) return; btn.dataset.v7Guard='1';
      btn.addEventListener('click',(ev)=>{ ev.preventDefault(); ev.stopImmediatePropagation(); requirePassword('admin','Introduza a palavra-passe para remover este gráfico.',()=>{ const i=Number(btn.dataset.rmcustom); const t=DB.dashboardConfig.customCharts[i]?.title||'Gráfico'; DB.dashboardConfig.customCharts.splice(i,1); saveDB(); buildDashCustomBody(); renderDashboard(); logActivity('Removeu gráfico','Painel',t); toast('Gráfico removido.'); }); }, true);
    });
  };

  /* ---------- Províncias / Municípios: administração ---------- */
  function buildGeoAdmin(){
    const sec=document.getElementById('sec-listas'); if(!sec || document.getElementById('v7-geo-admin')) return;
    ensureProvincias();
    const card=document.createElement('div'); card.id='v7-geo-admin'; card.className='card'; card.style.marginTop='16px';
    card.innerHTML=`<h3 class="u-85f8ef">Divisão Administrativa — Províncias e Municípios</h3>
      <p class="sub">A província selecionada controla a lista de municípios no cadastro de membros. Adicionar, editar ou remover requer Admin.</p>
      <div class="u-2a4dac grid2">
        <div><div class="group-title">Províncias</div><div id="v7-prov-list"></div><div class="toolbar"><input id="v7-prov-new" placeholder="Nova província" class="u-da5cd6"><button class="btn gold sm" id="v7-prov-add">+ Adicionar</button></div></div>
        <div><div class="group-title">Municípios da Província</div><select id="v7-prov-select" class="u-40da49"></select><div id="v7-mun-list"></div><div class="toolbar"><input id="v7-mun-new" placeholder="Novo município" class="u-da5cd6"><button class="btn gold sm" id="v7-mun-add">+ Adicionar</button></div></div>
      </div>`;
    sec.appendChild(card);
    const psel=card.querySelector('#v7-prov-select');
    function draw(){
      ensureProvincias();
      const provinces=listFor('provincia');
      card.querySelector('#v7-prov-list').innerHTML=provinces.map((p,i)=>`<div class="u-03b305"><input data-v7-p="${i}" value="${esc(p)}" class="u-da5cd6"><button class="btn ghost sm" data-v7-psave="${i}">Guardar</button><button class="btn danger sm" data-v7-pdel="${i}">Remover</button></div>`).join('');
      psel.innerHTML=provinces.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
      if(DB.settings._v7SelectedProvince && provinces.includes(DB.settings._v7SelectedProvince)) psel.value=DB.settings._v7SelectedProvince;
      else if(provinces[0]) psel.value=provinces[0];
      drawMunicipios();
    }
    function drawMunicipios(){
      const prov=psel.value; DB.settings._v7SelectedProvince=prov;
      const arr=DB.settings.municipiosPorProvincia[prov]||[];
      card.querySelector('#v7-mun-list').innerHTML=arr.map((m,i)=>`<div class="u-03b305"><input data-v7-m="${i}" value="${esc(m)}" class="u-da5cd6"><button class="btn ghost sm" data-v7-msave="${i}">Guardar</button><button class="btn danger sm" data-v7-mdel="${i}">Remover</button></div>`).join('') || '<p class="sub">Nenhum município definido para esta província.</p>';
      card.querySelectorAll('[data-v7-msave]').forEach(b=>b.onclick=()=>requirePassword('admin','Introduza a palavra-passe para editar o município.',()=>{const i=Number(b.dataset.v7Msave);const input=card.querySelector(`[data-v7-m="${i}"]`);const val=input.value.trim(),arr=DB.settings.municipiosPorProvincia[prov];if(!val)return;if(arr.some((x,j)=>j!==i&&x.toLowerCase()===val.toLowerCase())){toast('Este município já existe.');return;}const old=arr[i];arr[i]=val;saveDB();logActivity('Editou município','Municípios',`${prov}: ${old} → ${val}`);drawMunicipios();toast('Município atualizado.');}));
      card.querySelectorAll('[data-v7-mdel]').forEach(b=>b.onclick=()=>requirePassword('admin','Introduza a palavra-passe para remover o município.',()=>{const i=Number(b.dataset.v7Mdel),arr=DB.settings.municipiosPorProvincia[prov],val=arr[i];if(!confirm(`Remover "${val}" de ${prov}?`))return;arr.splice(i,1);saveDB();logActivity('Removeu município','Municípios',`${prov}: ${val}`);drawMunicipios();toast('Município removido.');}));
    }
    card.querySelector('#v7-prov-add').onclick=()=>requirePassword('admin','Introduza a palavra-passe para adicionar uma província.',()=>{const input=card.querySelector('#v7-prov-new'),val=input.value.trim();if(!val)return;const arr=listFor('provincia');if(arr.some(x=>x.toLowerCase()===val.toLowerCase())){toast('Essa província já existe.');return;}arr.push(val);arr.sort((a,b)=>a.localeCompare(b,'pt'));DB.settings.municipiosPorProvincia[val]=[];saveDB();logActivity('Adicionou província','Províncias',val);input.value='';draw();toast('Província adicionada.');});
    card.querySelector('#v7-mun-add').onclick=()=>requirePassword('admin','Introduza a palavra-passe para adicionar um município.',()=>{const prov=psel.value,input=card.querySelector('#v7-mun-new'),val=input.value.trim();if(!prov||!val)return;const arr=DB.settings.municipiosPorProvincia[prov]||[];if(arr.some(x=>x.toLowerCase()===val.toLowerCase())){toast('Esse município já existe.');return;}arr.push(val);arr.sort((a,b)=>a.localeCompare(b,'pt'));DB.settings.municipiosPorProvincia[prov]=arr;saveDB();logActivity('Adicionou município','Municípios',`${prov}: ${val}`);input.value='';drawMunicipios();toast('Município adicionado.');});
    psel.addEventListener('change',drawMunicipios);
    card.querySelector('#v7-prov-list').addEventListener('click',()=>{});
    card.addEventListener('click',e=>{
      const ps=e.target.closest('[data-v7-psave]'); const pd=e.target.closest('[data-v7-pdel]'); if(!ps&&!pd)return;
      requirePassword('admin',ps?'Introduza a palavra-passe para editar a província.':'Introduza a palavra-passe para remover a província.',()=>{
        const i=Number((ps||pd).dataset.v7Psave ?? (ps||pd).dataset.v7Pdel); const arr=listFor('provincia'); const old=arr[i];
        if(pd){ if(arr.length<=1){toast('É necessário manter pelo menos uma província.');return;} if(!confirm(`Remover "${old}"? Os municípios desta província também deixarão de aparecer como opções.`))return; delete DB.settings.municipiosPorProvincia[old]; arr.splice(i,1); if(DB.settings._v7SelectedProvince===old) DB.settings._v7SelectedProvince=arr[0]; }
        else { const input=card.querySelector(`[data-v7-p="${i}"]`), val=input.value.trim(); if(!val)return; if(arr.some((x,j)=>j!==i&&x.toLowerCase()===val.toLowerCase())){toast('Essa província já existe.');return;} arr[i]=val; const oldM=DB.settings.municipiosPorProvincia[old]||[]; delete DB.settings.municipiosPorProvincia[old]; DB.settings.municipiosPorProvincia[val]=oldM; if(DB.settings._v7SelectedProvince===old)DB.settings._v7SelectedProvince=val; }
        arr.sort((a,b)=>a.localeCompare(b,'pt')); saveDB(); logActivity(ps?'Editou província':'Removeu província','Províncias',ps?`${old} → ${arr.find(x=>x!==old&&x.toLowerCase()===((card.querySelector(`[data-v7-p="${i}"]`)||{}).value||'').trim().toLowerCase())||old}`:old); draw(); toast(ps?'Província atualizada.':'Província removida.');
      });
    });
    draw();
  }
  /* ---------- Listas & Categorias: novas listas administrativas ---------- */
  DB.settings.customLists=Array.isArray(DB.settings.customLists)?DB.settings.customLists:[];
  const _renderListasBodyV5=renderListasBody;
  window.renderListasBody=function(){
    _renderListasBodyV5();
    buildGeoAdmin();
    const box=document.getElementById('listas-body'); if(!box||document.getElementById('v6-custom-list-box'))return;
    const card=document.createElement('div'); card.id='v6-custom-list-box'; card.className='card'; card.style.marginTop='16px';
    card.innerHTML=`<h3 class="u-85f8ef">Listas personalizadas</h3><p class="sub">Crie novas listas auxiliares para utilização administrativa, formulários e futuras categorias. Toda alteração exige Admin.</p><div class="fields-grid c3"><div class="field"><label>Nome da lista</label><input id="v6-list-name" placeholder="Ex.: Ministério / Área"></div><div class="field"><label>Valores iniciais</label><input id="v6-list-values" placeholder="Separados por vírgula"></div><div class="u-bbe59a field"><button class="btn gold sm" id="v6-list-add">+ Criar Lista</button></div></div><div id="v6-list-existing" class="u-553a64"></div>`;
    box.appendChild(card);
    function draw(){card.querySelector('#v6-list-existing').innerHTML=DB.settings.customLists.length?DB.settings.customLists.map((x,i)=>`<div class="u-3ac0b7"><input data-clname="${i}" value="${esc(x.label)}" class="u-da5cd6"><span class="badge muted">${x.values.length} valor(es)</span><button class="btn ghost sm" data-cledit="${i}">Editar valores</button><button class="btn danger sm" data-cldel="${i}">Remover</button></div>`).join(''):'<p class="sub">Nenhuma lista personalizada criada.</p>';
      card.querySelectorAll('[data-cldel]').forEach(b=>b.onclick=()=>requirePassword('admin','Introduza a palavra-passe para remover esta lista.',()=>{const i=Number(b.dataset.cldel); if(confirm('Remover esta lista personalizada?')){const n=DB.settings.customLists[i].label;DB.settings.customLists.splice(i,1);saveDB();draw();logActivity('Removeu lista personalizada','Listas & Categorias',n);toast('Lista removida.');}}));
      card.querySelectorAll('[data-cledit]').forEach(b=>b.onclick=()=>requirePassword('admin','Introduza a palavra-passe para editar esta lista.',()=>{const i=Number(b.dataset.cledit),x=DB.settings.customLists[i]; const v=prompt('Valores separados por vírgula:',x.values.join(', ')); if(v===null)return; x.values=v.split(',').map(z=>z.trim()).filter(Boolean); x.label=card.querySelector(`[data-clname="${i}"]`).value.trim()||x.label; saveDB();draw();toast('Lista atualizada.');}));
    }
    card.querySelector('#v6-list-add').onclick=()=>requirePassword('admin','Introduza a palavra-passe para criar uma nova lista.',()=>{const label=card.querySelector('#v6-list-name').value.trim();const vals=card.querySelector('#v6-list-values').value.split(',').map(z=>z.trim()).filter(Boolean);if(!label){toast('Informe o nome da lista.');return;}DB.settings.customLists.push({id:uid(),label,values:Array.from(new Set(vals))});saveDB();draw();card.querySelector('#v6-list-name').value='';card.querySelector('#v6-list-values').value='';logActivity('Criou lista personalizada','Listas & Categorias',label);toast('Nova lista criada.');});
    draw();
  };

  /* ---------- Relatórios: filtros avançados adicionais ---------- */
  const adv=document.getElementById('report-adv-filters');
  if(adv && !document.getElementById('v6-report-extra')){
    const ex=document.createElement('div'); ex.id='v6-report-extra'; ex.className='fields-grid c3'; ex.style.cssText='grid-column:1/-1; margin-top:8px; padding-top:10px; border-top:1px dashed var(--line);';
    ex.innerHTML=`<div class="field"><label>Idade mínima</label><input id="adv-idade-min" type="number" min="0"></div><div class="field"><label>Idade máxima</label><input id="adv-idade-max" type="number" min="0"></div><div class="field"><label>Município</label><select id="adv-municipio"><option value="">Todos</option></select></div><div class="field"><label>Data de registo — desde</label><input id="adv-reg-de" type="date"></div><div class="field"><label>Data de registo — até</label><input id="adv-reg-ate" type="date"></div><div class="field"><label>Nome contém</label><input id="adv-nome" placeholder="Texto no nome"></div>`;
    adv.appendChild(ex);
    document.getElementById('adv-provincia').addEventListener('change',()=>{
      const p=document.getElementById('adv-provincia').value; ensureProvincias(); const arr=DB.settings.municipiosPorProvincia[p]||[]; fillSelect(document.getElementById('adv-municipio'),arr,'Todos');
    });
  }
  const oldReportClick=document.getElementById('btn-report-gerar');
  if(oldReportClick) oldReportClick.addEventListener('click',()=>{ /* filtros extra aplicados sobre o resultado depois da geração pelo utilizador */ });

  /* ---------- Relatórios: aplicar filtros extras sem substituir o motor existente ---------- */
  const reportBtnV6=document.getElementById('btn-report-gerar');
  if(reportBtnV6){ reportBtnV6.addEventListener('click',()=>{
    if(document.getElementById('report-type')?.value!=='geral') return;
    const original=DB.members.slice();
    const name=(document.getElementById('adv-nome')?.value||'').trim().toLowerCase();
    const p=document.getElementById('adv-provincia')?.value||'', mu=document.getElementById('adv-municipio')?.value||'';
    const min=Number(document.getElementById('adv-idade-min')?.value), max=Number(document.getElementById('adv-idade-max')?.value);
    const rd=document.getElementById('adv-reg-de')?.value||'', ra=document.getElementById('adv-reg-ate')?.value||'';
    const filtered=original.filter(m=>{
      if(name && !(m.nome||'').toLowerCase().includes(name)) return false;
      if(p && m.provincia!==p) return false; if(mu && m.municipio!==mu) return false;
      const age=Number(m.idade); if(document.getElementById('adv-idade-min')?.value && (!Number.isFinite(age)||age<min)) return false;
      if(document.getElementById('adv-idade-max')?.value && (!Number.isFinite(age)||age>max)) return false;
      if(rd && String(m.dataRegisto||'')<rd) return false; if(ra && String(m.dataRegisto||'')>ra) return false;
      return true;
    });
    DB.members=filtered; setTimeout(()=>{DB.members=original;},0);
  },true);
  }
  document.getElementById('adv-provincia')?.addEventListener('change',()=>{ const pv=document.getElementById('adv-provincia').value; ensureProvincias(); fillSelect(document.getElementById('adv-municipio'),DB.settings.municipiosPorProvincia[pv]||[],'Todos'); });

  /* ---------- Ficha Individual: cabeçalho centralizado ---------- */
  const style=document.createElement('style'); style.textContent=`#ficha-sheet .ficha-header,#ficha-sheet .ficha-head,#ficha-sheet header{ text-align:center !important; justify-content:center !important;} #ficha-sheet .ficha-header>*{margin-left:auto!important;margin-right:auto!important;} .v6-alert{padding:10px 12px;border-left:4px solid var(--gold);background:var(--gold-soft);border-radius:3px;margin-bottom:8px}`; document.head.appendChild(style);

  /* ---------- Aparência avançada ---------- */
  function appearanceAdvanced(){
    const sec=document.getElementById('sec-aparencia'); if(!sec||document.getElementById('v6-ap-advanced'))return;
    const card=document.createElement('div'); card.id='v6-ap-advanced'; card.className='card'; card.style.marginTop='16px';
    card.innerHTML=`<h3 class="u-85f8ef">Configuração Avançada</h3><p class="sub">Personalize o comportamento visual e a navegação. Todas as alterações exigem Admin.</p><div class="fields-grid c3"><div class="field"><label>Densidade do sistema</label><select id="ap-density"><option value="compact">Compacto</option><option value="normal">Normal</option><option value="confortavel">Confortável</option></select></div><div class="field"><label>Aba inicial</label><select id="ap-home-tab"></select></div><div class="u-bbe59a field"><button class="btn gold sm" id="ap-advanced-save">Guardar Avançado</button></div></div><div class="u-b0043e group-title">Renomear / mostrar / ocultar abas</div><div id="v6-tab-manager"></div>`;
    sec.appendChild(card);
    function draw(){
      const home=DB.settings.branding.homeTab||'dashboard'; document.getElementById('ap-density').value=DB.settings.branding.density||'normal';
      document.getElementById('ap-home-tab').innerHTML=ALL_TABS.filter(t=>!['lixeira','utilizadores','listas','aparencia'].includes(t.key)).map(t=>`<option value="${t.key}">${esc(displayTabLabel(t))}</option>`).join(''); document.getElementById('ap-home-tab').value=home;
      const box=document.getElementById('v6-tab-manager'); const all=ALL_TABS.filter(t=>!['lixeira','utilizadores','listas','aparencia'].includes(t.key)); const customs=getCustomTabs(); const rows=all.map(t=>`<div class="u-3ac0b7"><input data-tlbl="${t.key}" value="${esc(displayTabLabel(t))}" class="u-da5cd6"><label class="u-6b9c17"><input type="checkbox" data-thid="${t.key}" ${isTabHidden(t.key)?'':'checked'}> visível</label><button class="btn ghost sm" data-tsave="${t.key}">Guardar</button></div>`); const crows=customs.map(c=>`<div class="u-3ac0b7"><input data-tlbl="${c.key}" value="${esc(displayTabLabel(c))}" class="u-da5cd6"><label class="u-6b9c17"><input type="checkbox" data-thid="${c.key}" ${isTabHidden(c.key)?'':'checked'}> visível</label><button class="btn ghost sm" data-tsave="${c.key}">Guardar</button><button class="btn danger sm" data-rmta="${c.key}">Remover</button></div>`); box.innerHTML=rows.concat(crows).join('');
      box.querySelectorAll('[data-tsave]').forEach(b=>b.onclick=()=>requirePassword('admin','Introduza a palavra-passe para alterar o menu.',()=>{const k=b.dataset.tsave;DB.settings.branding.tabLabels[k]=box.querySelector(`[data-tlbl="${k}"]`).value.trim()||ALL_TABS.find(x=>x.key===k).label;DB.settings.branding.tabHidden[k]=!box.querySelector(`[data-thid="${k}"]`).checked;saveDB();applyBranding();applyTabOrder();draw();logActivity('Alterou aba','Aparência',k);toast('Aba atualizada.');}));
      box.querySelectorAll('[data-rmta]').forEach(b=>b.onclick=()=>requirePassword('admin','Introduza a palavra-passe para remover esta aba personalizada.',()=>{const k=b.dataset.rmta;if(!confirm('Remover esta aba personalizada?'))return;DB.settings.customTabs=DB.settings.customTabs.filter(x=>x.key!==k);DB.settings.branding.tabOrder=(DB.settings.branding.tabOrder||[]).filter(x=>x!==k);delete DB.settings.branding.tabHidden[k];saveDB();applyBranding();draw();toast('Aba removida.');}));
    }
    document.getElementById('ap-advanced-save').onclick=()=>requirePassword('admin','Introduza a palavra-passe para alterar a aparência avançada.',()=>{DB.settings.branding.density=document.getElementById('ap-density').value;DB.settings.branding.homeTab=document.getElementById('ap-home-tab').value;document.body.dataset.density=DB.settings.branding.density;saveDB();logActivity('Alterou aparência avançada','Aparência',DB.settings.branding.density);toast('Aparência avançada guardada.');});
    draw();
  }
  const _renderAparenciaV5=renderAparencia;
  window.renderAparencia=function(){ _renderAparenciaV5(); appearanceAdvanced(); };

  /* ---------- Inicialização dos componentes ---------- */
  setTimeout(()=>{ ensureProvincias(); try{renderAparencia();}catch(e){} try{initReportAdvFilters();}catch(e){} try{financeAdminPanel();}catch(e){} },50);
})();

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
function renderAll(){
  renderDashboard();
  renderDatabase();
  renderFinancas();
  renderRegistos();
  renderAniversariantes();
  renderQualidade();
}
renderSessionIndicator();
applyNavPermissions();
document.getElementById('sidebar-foot-count').textContent = DB.members.length + ' membros · dados guardados neste navegador';
renderAll();
