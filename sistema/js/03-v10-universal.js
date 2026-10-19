/* ================= V10: EVENTOS + EDIÇÃO EM MASSA + PERSONALIZAÇÃO UNIVERSAL ================= */
(function(){
  const V10_KEYS={
    database:'members', aniversariantes:'members', ficha:'members', registos:'members', qualidade:'members',
    financas:'financas', cultos:'cultos', inventario:'inventario', atividades:'atividades',
    listas:'settings', aparencia:'settings', reports:null, dashboard:null, ajuda:null, lixeira:'trash', utilizadores:'users'
  };
  const DATA_KEYS=['members','disciplina','visitantes','financas','financasCongregacoes','cultos','inventario','atividades','trash','users','settings','dashboardConfig','convertidos','organigrama','secretaria'];
  function clone(x){try{return JSON.parse(JSON.stringify(x));}catch(e){return null;}}
  function dataState(){
    const x={}; DATA_KEYS.forEach(k=>x[k]=clone(DB[k])); return x;
  }
  function dataSignature(){
    try{const x=dataState(); if(x.settings){x.settings=Object.assign({},x.settings); delete x.settings.lastAdminLogin; delete x.settings._v7SelectedProvince;} return JSON.stringify(x);}catch(e){return ''}
  }
  window.__v10LastDataSignature = dataSignature();
  DB.eventSnapshots=Array.isArray(DB.eventSnapshots)?DB.eventSnapshots:[];
  DB.auditLog=Array.isArray(DB.auditLog)?DB.auditLog:[];

  const _saveDB_V10=saveDB;
  window.saveDB=function(){
    const beforeSig=window.__v10LastDataSignature||'';
    const currentSig=dataSignature();
    if(beforeSig && currentSig!==beforeSig){
      DB.eventSnapshots.unshift({id:uid(),ts:new Date().toISOString(),user:actorName(),label:'Estado anterior à alteração',data:clone(window.__v10LastDataState||dataState())});
      if(DB.eventSnapshots.length>80) DB.eventSnapshots.length=80;
    }
    window.__v10LastDataState=dataState();
    window.__v10LastDataSignature=currentSig;
    _saveDB_V10();
  };
  window.__v10LastDataState=dataState();

  const _log_V10=logActivity;
  window.logActivity=function(action,entity,summary){
    _log_V10(action,entity,summary);
    try{MMStoreX.save(DB);}catch(e){}
  };

  function currentSectionKey(){
    const active=document.querySelector('main.main .section.active') || Array.from(document.querySelectorAll('main.main .section')).find(s=>getComputedStyle(s).display!=='none');
    return active ? (active.id||'').replace(/^sec-/,'') : 'dashboard';
  }
  function csvFromCollection(key){
    const val=DB[key];
    if(Array.isArray(val)){
      if(!val.length)return '';
      const headers=Array.from(new Set(val.flatMap(o=>Object.keys(o||{}))));
      return toCSV(val,headers);
    }
    if(val && typeof val==='object') return JSON.stringify(val,null,2);
    return String(val??'');
  }
  function exportCurrent(kind){
    const sec=currentSectionKey(), key=V10_KEYS[sec];
    if(kind==='backup'){
      if(window.MMBackup){ MMBackup.open(); return; }
      const out={version:'V10',exportedAt:new Date().toISOString(),source:'Centro Monte Moriá — Sistema de Gestão de Membros'};
      DATA_KEYS.forEach(k=>out[k]=clone(DB[k]));
      downloadFile('backup-sistema-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(out,null,2),'application/json;charset=utf-8');
      logActivity('Exportou backup completo','Sistema', 'Todas as abas'); toast('Backup completo exportado.'); return;
    }
    if(key && Array.isArray(DB[key])){
      const ext=kind==='csv'?'csv':'json';
      const content=kind==='csv'?csvFromCollection(key):JSON.stringify(DB[key],null,2);
      downloadFile('dados-'+sec+'.'+ext,content,kind==='csv'?'text/csv;charset=utf-8':'application/json;charset=utf-8');
      logActivity('Exportou dados','Aba',sec); toast('Dados exportados.');
    } else {
      downloadFile('configuracao-'+sec+'.json',JSON.stringify({section:sec,settings:clone(DB.settings),dashboardConfig:clone(DB.dashboardConfig)},null,2),'application/json;charset=utf-8');
      logActivity('Exportou configuração','Aba',sec); toast('Configuração exportada.');
    }
  }
  function importIntoCurrent(file){
    const sec=currentSectionKey(), key=V10_KEYS[sec];
    const reader=new FileReader(); reader.onload=()=>{
      try{
        let parsed; const text=String(reader.result||'');
        if(file.name.toLowerCase().endsWith('.json')) parsed=JSON.parse(text);
        else if(file.name.toLowerCase().endsWith('.csv')||file.name.toLowerCase().endsWith('.txt')) parsed=parseCSVSimple(text);
        else throw new Error('Use JSON, CSV ou TXT.');
        if(!key){toast('Esta aba é principalmente visual/configurável. Importe um backup JSON completo pelo botão correspondente.');return;}
        requireAdminAction('admin','Introduza a palavra-passe para importar e substituir os dados desta aba.',()=>{
          if(sec==='financas') DB[key]=Array.isArray(parsed)?parsed:(parsed.financas||[]);
          else if(key==='settings' && parsed.settings) DB.settings=parsed.settings;
          else if(key==='users' && parsed.users) DB.users=parsed.users;
          else if(Array.isArray(parsed)) DB[key]=parsed;
          else if(parsed[key]) DB[key]=parsed[key]; else throw new Error('Formato não reconhecido para esta aba.');
          saveDB(); logActivity('Importou dados','Aba',sec); refreshAllV10(); toast('Importação concluída.');
        });
      }catch(e){toast('Falha na importação: '+e.message);}
    }; reader.readAsText(file);
  }
  function parseCSVSimple(text){
    const lines=text.replace(/\r/g,'').split('\n').filter(x=>x.trim()); if(!lines.length)return [];
    const parse=l=>{const a=[];let cur='',q=false;for(let i=0;i<l.length;i++){const c=l[i];if(c==='"'){if(q&&l[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(c===','&&!q){a.push(cur);cur='';}else cur+=c;}a.push(cur);return a;};
    const h=parse(lines[0]).map(x=>x.trim()); return lines.slice(1).map(l=>{const a=parse(l),o={};h.forEach((k,i)=>o[k]=a[i]??'');return o;});
  }
  window.refreshAllV10=function(){
    try{renderRegistos();}catch(e){} try{renderFinancas();}catch(e){} try{renderCultos();}catch(e){} try{renderInventario();}catch(e){} try{renderAtividades();}catch(e){} try{renderDashboard();}catch(e){}
    try{renderDatabase();}catch(e){} try{renderLixeira();}catch(e){}
  };
  function injectUniversalTools(){
    document.querySelectorAll('main.main .section:not(.v10-events-section)').forEach(sec=>{
      if(sec.querySelector('.v10-tools'))return;
      const tools=document.createElement('div'); tools.className='v10-tools';
      tools.innerHTML='<span class="v10-title">Dados desta aba</span><button class="btn ghost sm" data-v10-export-csv>Exportar CSV</button><button class="btn ghost sm" data-v10-export-json>Exportar JSON</button><button class="btn ghost sm" data-v10-import>Importar</button><button class="btn ghost sm" data-v10-backup>Backup completo</button><input type="file" accept=".json,.csv,.txt" data-v10-file hidden>';
      const top=sec.querySelector('.topbar'); if(top) top.insertAdjacentElement('afterend',tools); else sec.prepend(tools);
      tools.querySelector('[data-v10-export-csv]').onclick=()=>exportCurrent('csv');
      tools.querySelector('[data-v10-export-json]').onclick=()=>exportCurrent('json');
      tools.querySelector('[data-v10-backup]').onclick=()=>exportCurrent('backup');
      const file=tools.querySelector('[data-v10-file]'); tools.querySelector('[data-v10-import]').onclick=()=>file.click(); file.onchange=()=>{if(file.files[0])importIntoCurrent(file.files[0]);file.value='';};
    });
  }

  function addEventsTab(){
    if(!ALL_TABS.some(t=>t.key==='eventos')) ALL_TABS.push({key:'eventos',label:'Eventos',builtin:true});
    if(document.querySelector('[data-tab="eventos"]'))return;
    const nav=document.querySelector('.sidebar nav')||document.querySelector('.sidebar');
    if(nav){const b=document.createElement('button');b.className='nav-btn';b.dataset.tab='eventos';b.innerHTML='↺ <span>Eventos</span>';nav.appendChild(b);}
    const main=document.querySelector('main.main'); if(!main)return;
    const sec=document.createElement('section'); sec.className='section v10-events-section'; sec.id='sec-eventos';
    sec.innerHTML='<div class="topbar"><div><h2>Eventos</h2><div class="sub">Histórico de alterações e pontos de restauração do sistema</div></div><div class="topbar-actions"><button class="btn ghost sm" id="v10-events-refresh">Actualizar</button></div></div><div class="tabs-inline"><button class="active" data-evtab="log">Registo de alterações</button><button data-evtab="snap">Restaurar estados anteriores</button></div><div id="v10-ev-log" class="card v10-events"></div><div id="v10-ev-snap" class="card v10-events hidden"></div>';
    main.appendChild(sec);
    sec.querySelectorAll('[data-evtab]').forEach(b=>b.onclick=()=>{sec.querySelectorAll('[data-evtab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('v10-ev-log').classList.toggle('hidden',b.dataset.evtab!=='log');document.getElementById('v10-ev-snap').classList.toggle('hidden',b.dataset.evtab!=='snap');renderEvents();});
    sec.querySelector('#v10-events-refresh').onclick=renderEvents;
    renderEvents();
  }
  window.renderEvents=function(){
    const log=document.getElementById('v10-ev-log'), snap=document.getElementById('v10-ev-snap'); if(!log||!snap)return;
    log.innerHTML=(DB.auditLog||[]).slice(0,200).map(e=>`<div class="event-row"><div class="event-meta">${new Date(e.ts).toLocaleString('pt-PT')} · ${esc(e.user||'—')} · ${esc(e.entity||'Sistema')}</div><div class="event-action">${esc(e.action||'Alteração')}</div><div>${esc(e.summary||'')}</div></div>`).join('')||'<div class="empty">Nenhum evento registado.</div>';
    snap.innerHTML='<div class="u-fa3e1c note">Cada estado disponível representa os dados imediatamente anteriores a uma alteração guardada. Restaurar requer Admin e substitui os dados actuais por esse estado.</div>'+(DB.eventSnapshots||[]).map((s,i)=>`<div class="v10-snapshot"><div><strong>${new Date(s.ts).toLocaleString('pt-PT')}</strong><div class="event-meta">${esc(s.user||'—')} · ${esc(s.label||'Estado anterior')}</div></div><button class="btn danger sm" data-v10-restore="${i}">Restaurar</button></div>`).join('')||'<div class="empty">Nenhum estado anterior disponível.</div>';
    snap.querySelectorAll('[data-v10-restore]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.v10Restore),s=DB.eventSnapshots[i];if(!s)return;requireAdminAction('admin','Introduza a palavra-passe para restaurar este estado.',()=>{if(!confirm('Restaurar este estado? Os dados actuais serão substituídos e ficará registado nos Eventos.'))return;DATA_KEYS.forEach(k=>{if(s.data && Object.prototype.hasOwnProperty.call(s.data,k))DB[k]=clone(s.data[k]);});DB.eventSnapshots.splice(i,1);saveDB();logActivity('Restaurou estado anterior','Eventos','Restauração de '+new Date(s.ts).toLocaleString('pt-PT'));refreshAllV10();renderEvents();toast('Estado restaurado.');});});
  };

  function addMassDeleteConvertidos(){
    const bar=document.querySelector('#sub-conv .v10-mass'); if(bar)return;
    const host=document.querySelector('#sub-conv .toolbar'); if(!host)return;
    const box=document.createElement('div');box.className='v10-mass';box.style.cssText='display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:8px;width:100%';
    box.innerHTML='<label class="u-6093b5"><input type="checkbox" id="v10-conv-all" class="v10-check"> Seleccionar todos</label><span id="v10-conv-count" class="badge muted">0 seleccionados</span><button class="btn danger sm" id="v10-conv-delete">Apagar seleccionados</button><button class="btn ghost sm" id="v10-conv-export-selected">Exportar seleccionados</button>';
    host.appendChild(box);
    document.getElementById('v10-conv-all').onchange=e=>{document.querySelectorAll('#tbl-convertidos-body .v10-conv-check').forEach(c=>c.checked=e.target.checked);updateConvCount();};
    document.getElementById('v10-conv-export-selected').onclick=()=>{const ids=Array.from(document.querySelectorAll('#tbl-convertidos-body .v10-conv-check:checked')).map(x=>x.value);if(!ids.length){toast('Seleccione pelo menos um membro.');return;}const rows=ids.map(id=>DB.convertidos.find(m=>String(m.id)===String(id))).filter(Boolean);downloadFile('convertidos-seleccionados.json',JSON.stringify(rows,null,2),'application/json;charset=utf-8');logActivity('Exportou membros seleccionados','Convertidos',rows.length+' registo(s)');toast(rows.length+' membro(s) exportado(s).');};
    document.getElementById('v10-conv-delete').onclick=()=>{const ids=Array.from(document.querySelectorAll('#tbl-convertidos-body .v10-conv-check:checked')).map(x=>x.value);if(!ids.length){toast('Seleccione pelo menos um membro.');return;}requireAdminAction('admin','Introduza a palavra-passe para apagar os membros seleccionados.',()=>{if(!confirm('Apagar '+ids.length+' membro(s)? Poderá recuperar os registos através da Lixeira.'))return;ids.forEach(id=>{const i=DB.convertidos.findIndex(m=>String(m.id)===String(id));if(i>=0){const m=DB.convertidos[i];moveToTrash('convertidos',m,m.nome);DB.convertidos.splice(i,1);}});saveDB();logActivity('Apagou convertidos em massa','Convertidos',ids.length+' registo(s)');renderRegistos();renderEvents();toast(ids.length+' membro(s) apagado(s).');});};
  }
  function updateConvCount(){const n=document.querySelectorAll('#tbl-convertidos-body .v10-conv-check:checked').length;const el=document.getElementById('v10-conv-count');if(el)el.textContent=n+' seleccionados';}
document.getElementById('btn-conv-move').onclick=moveSelectedConvertidosToMembers;
  const _renderRegV10=window.renderRegistos;
  window.renderRegistos=function(){_renderRegV10();document.querySelectorAll('#tbl-convertidos-body .v10-conv-check').forEach(c=>c.onchange=updateConvCount);updateConvCount();addMassDeleteConvertidos();};

  function enhanceFinance(){
    const sec=document.getElementById('sec-financas');if(!sec)return;
    let bar=document.getElementById('v10-finance-controls');
    if(!bar){bar=document.createElement('div');bar.id='v10-finance-controls';bar.className='v10-tools';bar.innerHTML='<span class="v10-title">Edição completa de Finanças</span><button class="btn gold sm" id="v10-fin-add-month">+ Adicionar mês</button><button class="btn danger sm" id="v10-fin-del-month">Apagar mês seleccionado</button><button class="btn ghost sm" id="v10-fin-rename-cong">Renomear congregação</button>';const t=sec.querySelector('.tabs-inline');t.insertAdjacentElement('afterend',bar);}
    const add=document.getElementById('v10-fin-add-month');if(add&&!add.dataset.bound){add.dataset.bound=1;add.onclick=()=>requireAdminAction('admin','Introduza a palavra-passe para adicionar um período financeiro.',()=>{const mes=prompt('Nome do mês/período:', 'Novo mês');if(mes===null)return;DB.financas.push({mes:mes.trim()||'Novo mês',entradas:0,saidas:0});saveDB();logActivity('Adicionou período financeiro','Finanças',mes);renderFinancas();});}
    const del=document.getElementById('v10-fin-del-month');if(del&&!del.dataset.bound){del.dataset.bound=1;del.onclick=()=>requireAdminAction('admin','Introduza a palavra-passe para apagar um período financeiro.',()=>{const i=Number(prompt('Índice do mês a apagar (1 = primeiro):','1'))-1;if(i<0||i>=DB.financas.length){toast('Índice inválido.');return;}const old=DB.financas[i];if(!confirm('Apagar '+old.mes+'?'))return;moveToTrash('financas',old,old.mes);DB.financas.splice(i,1);saveDB();logActivity('Apagou período financeiro','Finanças',old.mes);renderFinancas();});}
    const ren=document.getElementById('v10-fin-rename-cong');if(ren&&!ren.dataset.bound){ren.dataset.bound=1;ren.onclick=()=>requireAdminAction('admin','Introduza a palavra-passe para renomear a congregação.',()=>{const old=finState.cong;if(!old)return;const n=prompt('Novo nome da congregação:',old);if(n===null||!n.trim()||n.trim()===old)return;DB.financasCongregacoes[n.trim()]=DB.financasCongregacoes[old]||[];delete DB.financasCongregacoes[old];DB.settings.congregacoes=getCongregacoes().map(x=>x===old?n.trim():x);finState.cong=n.trim();saveDB();logActivity('Renomeou congregação','Finanças',old+' → '+n.trim());renderFinancas();});}
  }
  const _renderFinV10=window.renderFinancas;
  window.renderFinancas=function(){_renderFinV10();enhanceFinance();const ed=financasEditable();document.querySelectorAll('#tbl-financas-body tr').forEach((tr,i)=>{if(i>=DB.financas.length)return;const td=tr.children[0];if(td&&!td.querySelector('input')){td.innerHTML=`<input type="text" value="${esc(DB.financas[i].mes)}" data-v10-fmonth="${i}" class="u-088cf0" ${ed?'':'disabled'}>`;}});document.querySelectorAll('[data-v10-fmonth]').forEach(inp=>{inp.onchange=()=>{DB.financas[Number(inp.dataset.v10Fmonth)].mes=inp.value.trim()||DB.financas[Number(inp.dataset.v10Fmonth)].mes;saveDB();logActivity('Alterou período financeiro','Finanças',inp.value);renderFinancas();};});};

  function universalAppearance(){
    const sec=document.getElementById('sec-aparencia');if(!sec||document.getElementById('v10-design'))return;
    const card=document.createElement('div');card.id='v10-design';card.className='card';card.style.marginTop='16px';card.innerHTML='<h3 class="u-a730ea">Editor visual de todas as abas</h3><p class="sub">Altere tipografia, cores, tamanho, títulos e aparência geral. A configuração é aplicada ao sistema inteiro e exige Admin.</p><div class="v10-design-grid"><div class="field"><label>Fonte</label><select id="v10-font"><option value="Inter,Arial,sans-serif">Inter / Arial</option><option value="Arial,sans-serif">Arial</option><option value="Verdana,sans-serif">Verdana</option><option value="Georgia,serif">Georgia</option><option value="Trebuchet MS,sans-serif">Trebuchet MS</option></select></div><div class="field"><label>Tamanho base</label><input id="v10-size" type="number" min="11" max="20"></div><div class="field"><label>Cor principal</label><input id="v10-primary" class="v10-color" type="color"></div><div class="field"><label>Cor dos títulos</label><input id="v10-title" class="v10-color" type="color"></div><div class="field"><label>Fundo</label><input id="v10-bg" class="v10-color" type="color"></div><div class="field"><label>Cartões</label><input id="v10-card" class="v10-color" type="color"></div><div class="field"><label>Linhas / bordas</label><input id="v10-line" class="v10-color" type="color"></div><div class="field"><label>Arredondamento</label><input id="v10-radius" type="range" min="0" max="18"></div></div><div class="v10-font-preview" id="v10-preview"><strong>Pré-visualização</strong> — títulos, tabelas, gráficos e botões seguirão esta configuração.</div><div class="u-5371db"><button class="btn gold sm" id="v10-design-save">Guardar aparência global</button><button class="btn ghost sm" id="v10-design-reset">Repor padrão</button></div>';
    sec.appendChild(card);
    DB.settings.visual=DB.settings.visual||{font:'Inter,Arial,sans-serif',size:14,primary:'#8b6b1f',title:'#1d2733',bg:'#f5f6f8',card:'#ffffff',line:'#d9dde3',radius:8};
    function apply(){const v=DB.settings.visual;document.documentElement.style.setProperty('--font',v.font);document.documentElement.style.setProperty('--base-size',v.size+'px');document.documentElement.style.setProperty('--primary',v.primary);document.documentElement.style.setProperty('--ink',v.title);document.documentElement.style.setProperty('--bg',v.bg);document.documentElement.style.setProperty('--card',v.card);document.documentElement.style.setProperty('--line',v.line);document.documentElement.style.setProperty('--radius',v.radius+'px');document.body.style.fontFamily=v.font;document.body.style.fontSize=v.size+'px';card.querySelector('#v10-preview').style.fontFamily=v.font;}
    function fill(){const v=DB.settings.visual;['font','size','primary','title','bg','card','line','radius'].forEach(k=>{const el=document.getElementById('v10-'+k);if(el)el.value=v[k];});apply();}
    card.querySelector('#v10-design-save').onclick=()=>requireAdminAction('admin','Introduza a palavra-passe para guardar a aparência global.',()=>{const v=DB.settings.visual;v.font=document.getElementById('v10-font').value;v.size=Number(document.getElementById('v10-size').value)||14;v.primary=document.getElementById('v10-primary').value;v.title=document.getElementById('v10-title').value;v.bg=document.getElementById('v10-bg').value;v.card=document.getElementById('v10-card').value;v.line=document.getElementById('v10-line').value;v.radius=Number(document.getElementById('v10-radius').value);saveDB();logActivity('Alterou aparência global','Aparência','Tipografia, cores e dimensões');apply();toast('Aparência global guardada.');});
    card.querySelector('#v10-design-reset').onclick=()=>requireAdminAction('admin','Introduza a palavra-passe para repor a aparência.',()=>{DB.settings.visual={font:'Inter,Arial,sans-serif',size:14,primary:'#8b6b1f',title:'#1d2733',bg:'#f5f6f8',card:'#ffffff',line:'#d9dde3',radius:8};saveDB();fill();toast('Aparência reposta.');});fill();
  }

  function addReportAll(){
    const sec=document.getElementById('sec-reports');if(!sec||document.getElementById('v10-report-all'))return;
    const card=document.createElement('div');card.id='v10-report-all';card.className='card v13-report-card';card.style.marginBottom='16px';card.innerHTML='<h3 class="u-a730ea">Relatório completo de todas as abas</h3><p class="sub">Seleccione as áreas, aplique os filtros existentes e gere um pacote consolidado de informação.</p><div class="toolbar"><select id="v10-report-source"><option value="all">Todas as abas</option><option value="members">Membros</option><option value="financas">Finanças</option><option value="disciplina">Disciplina</option><option value="visitantes">Visitantes</option><option value="cultos">Cultos</option><option value="inventario">Inventário</option><option value="atividades">Atividades</option></select><button class="btn gold sm" id="v10-report-json">Extrair relatório JSON</button><button class="btn ghost sm" id="v10-report-csv">Extrair CSV consolidado</button></div>';
    sec.insertBefore(card,sec.querySelector('.card'));
    card.querySelector('#v10-report-json').onclick=()=>requireAdminAction('admin','Introduza a palavra-passe para extrair o relatório completo.',()=>{const src=card.querySelector('#v10-report-source').value;const out={geradoEm:new Date().toISOString()};(src==='all'?DATA_KEYS:[src]).forEach(k=>out[k]=clone(DB[k]));downloadFile('relatorio-completo.json',JSON.stringify(out,null,2),'application/json;charset=utf-8');logActivity('Extraiu relatório completo','Relatórios',src);toast('Relatório JSON gerado.');});
    card.querySelector('#v10-report-csv').onclick=()=>requireAdminAction('admin','Introduza a palavra-passe para extrair o relatório CSV.',()=>{const src=card.querySelector('#v10-report-source').value;let text='';(src==='all'?DATA_KEYS.filter(k=>Array.isArray(DB[k])):[src]).forEach(k=>{if(!Array.isArray(DB[k]))return;text+='\n### '+k.toUpperCase()+'\n';text+=csvFromCollection(k)+'\n';});downloadFile('relatorio-consolidado.csv',text,'text/csv;charset=utf-8');logActivity('Extraiu relatório CSV','Relatórios',src);toast('Relatório CSV gerado.');});
  }
  function initV10(){addEventsTab();injectUniversalTools();universalAppearance();addReportAll();enhanceFinance();try{renderRegistos();}catch(e){};renderEvents();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(initV10,50));else setTimeout(initV10,50);
})();
