/* ================= V12 — DATA DE CONVERSÃO E CONSISTÊNCIA DE IMPORTAÇÃO ================= */
(function(){
  const cloneV11=x=>{try{return JSON.parse(JSON.stringify(x));}catch(e){return null;}};
  const safeId=s=>String(s||'').replace(/[^a-zA-Z0-9_-]/g,'_');
  const memberFieldMap={nome:'nome',genero:'genero',dataNascimento:'dataNascimento',estadoCivil:'estadoCivil',nomeConjuge:'nomeConjuge',nacionalidade:'nacionalidade',nBi:'nBi',infEscolar:'infEscolar',nomePai:'nomePai',nomeMae:'nomeMae',tel:'tel',email:'email',provincia:'provincia',municipio:'municipio',morada:'morada',igreja:'igreja',cargo:'cargo',funcao:'funcao',departamento:'departamento',situacao:'situacao',dataSituacao:'dataSituacao',dataBaptismo:'dataBaptismo',dataConversao:'dataConversao',dataRegisto:'dataRegisto',nCartao:'nCartao',obs:'obs'};

  // ---------- 1) Persistência robusta ----------
  DB.settings=DB.settings||{}; DB.settings.system=DB.settings.system||{};
  DB.settings.system.schemaVersion=12;
  DB.settings.system.lastSavedAt=DB.settings.system.lastSavedAt||null;
  DB.settings.associations=DB.settings.associations||[];
  DB.settings.universalEditor=DB.settings.universalEditor||{sections:{},tables:{},charts:{}};
  DB.eventSnapshots=Array.isArray(DB.eventSnapshots)?DB.eventSnapshots:[];
  // Migração V12: recuperar a Data da Conversão que já exista no ficheiro importado
  // como dataConversaoTexto, sem alterar as restantes informações do membro.
  (DB.members||[]).forEach(m=>{ if(!m.dataConversao && m.dataConversaoTexto) m.dataConversao=excelDateToISO(m.dataConversaoTexto); });
  window.__v11BusySave=false;
  const oldSave=window.saveDB;
  window.saveDB=function(){
    try{
      DB.settings.system.lastSavedAt=new Date().toISOString();
      oldSave();
      window.__v10LastDataState = typeof dataState==='function' ? dataState() : window.__v10LastDataState;
      window.__v10LastDataSignature = typeof dataSignature==='function' ? dataSignature() : window.__v10LastDataSignature;
    }catch(e){ console.error('Falha ao guardar:',e); }
  };
  const oldLog=window.logActivity;
  window.logActivity=function(action,entity,summary){
    try{ oldLog(action,entity,summary); }catch(e){}
    // O log também persiste a alteração. Isto corrige ações antigas que apenas chamavam logActivity.
    try{ DB.auditLog=Array.isArray(DB.auditLog)?DB.auditLog:[]; MMStoreX.save(DB); }catch(e){}
  };

  function persistV11(action,entity,summary,render=true){
    try{ saveDB(); }catch(e){}
    try{ logActivity(action,entity,summary); }catch(e){}
    if(render && typeof refreshAllV10==='function') setTimeout(()=>{try{refreshAllV10();}catch(e){}},0);
    if(typeof renderEvents==='function') setTimeout(()=>{try{renderEvents();}catch(e){}},0);
  }

  // ---------- 2) Aniversariantes: cálculo sem problemas de ano/fuso ----------
  function birthdayInfo(iso, now){
    if(!iso) return null;
    const parts=String(iso).slice(0,10).split('-').map(Number); if(parts.length!==3||!parts[1]||!parts[2])return null;
    const y=now.getFullYear(), m=parts[1]-1, d=parts[2];
    let next=new Date(y,m,d,12,0,0); if(next<new Date(y,now.getMonth(),now.getDate(),12,0,0)) next=new Date(y+1,m,d,12,0,0);
    return {month:m,day:d,next,days:Math.round((next-new Date(y,now.getMonth(),now.getDate(),12,0,0))/86400000)};
  }
  window.renderAniversariantes=function(){
    const ms=document.getElementById('aniv-month'), ws=document.getElementById('aniv-window'), ig=document.getElementById('aniv-igreja'), dp=document.getElementById('aniv-depto');
    if(!ms||!ws||!ig||!dp)return;
    const now=today(); const month=ms.value==='all'?null:now.getMonth(); const win=Math.max(0,Number(ws.value)||0);
    const igre=ig.value, dept=dp.value;
    const people=(DB.members||[]).map(m=>{const b=birthdayInfo(m.dataNascimento,now);return b?{m,b,age:calcAge(m.dataNascimento)}:null;}).filter(Boolean);
    const monthPeople=people.filter(x=>month===null||x.b.month===month);
    const list=monthPeople.filter(x=>{if(igre&&x.m.igreja!==igre)return false;if(dept&&x.m.departamento!==dept)return false;if(win>0 && x.b.days>win)return false;return true;}).sort((a,b)=>a.b.month-b.b.month||a.b.day-b.b.day||String(a.m.nome||'').localeCompare(String(b.m.nome||''),'pt'));
    fillSelect(ig,uniqueVals(DB.members,'igreja'),'Igreja/Centro — todas'); fillSelect(dp,uniqueVals(DB.members,'departamento'),'Departamento — todos'); ig.value=igre;dp.value=dept;
    const body=document.getElementById('aniv-body');
    if(body) body.innerHTML=list.map(x=>`<tr><td>${String(x.b.day).padStart(2,'0')}/${String(x.b.month+1).padStart(2,'0')}</td><td>${esc(x.m.nome)}</td><td>${x.age??'—'}</td><td>${esc(x.m.igreja||'—')}</td><td>${esc(x.m.departamento||'—')}</td><td>${esc(x.m.tel||'—')}</td></tr>`).join('')||'<tr><td colspan="6"><div class="empty">Nenhum aniversariante encontrado.</div></td></tr>';
    const todayList=people.filter(x=>x.b.month===now.getMonth()&&x.b.day===now.getDate());
    const nextList=people.filter(x=>x.b.days>0&&x.b.days<=7);
    const msg=[]; if(todayList.length)msg.push(`<div class="u-e8beae note">🎂 <strong>Hoje:</strong> ${todayList.map(x=>esc(x.m.nome)).join(', ')}</div>`); if(nextList.length)msg.push(`<div class="u-d43169 note">🔔 <strong>Próximos 7 dias:</strong> ${nextList.map(x=>esc(x.m.nome)+' ('+String(x.b.day).padStart(2,'0')+'/'+String(x.b.month+1).padStart(2,'0')+')').join(', ')}</div>`); if(!msg.length)msg.push('<div class="empty">Sem alertas de aniversários para hoje ou próximos 7 dias.</div>');
    const alerts=document.getElementById('aniv-alerts');if(alerts)alerts.innerHTML=msg.join('');
  };
  ['aniv-month','aniv-window','aniv-igreja','aniv-depto'].forEach(id=>{const el=document.getElementById(id);if(el){el.onchange=renderAniversariantes;el.oninput=renderAniversariantes;}});

  // ---------- 3) Lixeira: seleção total + restaurar/apagar em massa ----------
  const trashTargetV11={membro:()=>DB.members,member:()=>DB.members,disciplina:()=>DB.disciplina,visitante:()=>DB.visitantes,culto:()=>DB.cultos,inventario:()=>DB.inventario,atividade:()=>DB.atividades,financas:()=>DB.financas,convertidos:()=>DB.convertidos};
  function selectedTrash(){return Array.from(document.querySelectorAll('#tbl-lixeira-body .v11-trash-check:checked')).map(x=>Number(x.value)).filter(Number.isFinite);}
  window.renderLixeira=function(){
    const list=DB.trash||[], body=document.getElementById('tbl-lixeira-body'); if(!body)return;
    body.innerHTML=list.map((t,i)=>`<tr><td><input type="checkbox" class="v11-trash-check" value="${i}"></td><td>${esc(TRASH_LABELS[t.tipo]||t.tipo)}</td><td>${esc(t.resumo||'—')}</td><td>${t.eliminadoEm?new Date(t.eliminadoEm).toLocaleString('pt-PT'):'—'}</td><td>${esc(t.eliminadoPor||'—')}</td><td><button class="btn ghost sm" data-restore="${i}">Restaurar</button> <button class="btn danger sm" data-purge="${i}">Eliminar</button></td></tr>`).join('')||'<tr><td colspan="6"><div class="empty">A Lixeira está vazia.</div></td></tr>';
    const sec=document.getElementById('sec-lixeira'); if(sec&&!sec.querySelector('#v11-trash-tools')){
      const bar=document.createElement('div');bar.id='v11-trash-tools';bar.className='v11-tools';bar.style.cssText='display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:10px';bar.innerHTML='<label class="v11-pill"><input type="checkbox" id="v11-trash-all"> Seleccionar todos</label><span id="v11-trash-count" class="badge muted">0 seleccionados</span><button class="btn gold sm" id="v11-trash-restore">Restaurar seleccionados</button><button class="btn danger sm" id="v11-trash-delete">Eliminar seleccionados</button><button class="btn ghost sm" id="v11-trash-restore-all">Restaurar todos</button>';
      const table=document.getElementById('tbl-lixeira');table.parentElement.insertBefore(bar,table);
      document.getElementById('v11-trash-all').onchange=e=>{body.querySelectorAll('.v11-trash-check').forEach(c=>c.checked=e.target.checked);updateTrashCount();};
      document.getElementById('v11-trash-restore').onclick=()=>restoreTrashMany(selectedTrash());
      document.getElementById('v11-trash-delete').onclick=()=>purgeTrashMany(selectedTrash());
      document.getElementById('v11-trash-restore-all').onclick=()=>restoreTrashMany((DB.trash||[]).map((_,i)=>i));
    }
    body.querySelectorAll('.v11-trash-check').forEach(c=>c.onchange=updateTrashCount); updateTrashCount();
  };
  function updateTrashCount(){const n=document.querySelectorAll('#tbl-lixeira-body .v11-trash-check:checked').length;const x=document.getElementById('v11-trash-count');if(x)x.textContent=n+' seleccionados';}
  function restoreTrashMany(indices){
    if(!indices.length){toast('Seleccione pelo menos um registo.');return;}
    requireAdminAction('admin','Introduza a palavra-passe para restaurar os registos seleccionados.',()=>{
      if(!confirm('Restaurar '+indices.length+' registo(s)?'))return;
      const sorted=[...new Set(indices)].sort((a,b)=>b-a); let restored=0;
      let kept=0; sorted.forEach(i=>{const t=DB.trash[i];if(!t)return;const get=trashTargetV11[t.tipo]||(typeof TRASH_TARGET!=='undefined'&&TRASH_TARGET[t.tipo])||(()=>null);const arr=get();if(Array.isArray(arr)){arr.push(cloneV11(t.dados));restored++;DB.trash.splice(i,1);}else kept++;}); if(kept) toast(kept+' registo(s) de tipo desconhecido mantido(s) na Lixeira.');
      persistV11('Restaurou em massa','Lixeira',restored+' registo(s)');renderLixeira();toast(restored+' registo(s) restaurado(s).');
    });
  }
  function purgeTrashMany(indices){
    if(!indices.length){toast('Seleccione pelo menos um registo.');return;}
    requireAdminAction('admin','Introduza a palavra-passe para eliminar definitivamente os registos seleccionados.',()=>{if(!confirm('Eliminar definitivamente '+indices.length+' registo(s)? Esta acção não pode ser desfeita.'))return;[...new Set(indices)].sort((a,b)=>b-a).forEach(i=>DB.trash.splice(i,1));persistV11('Eliminou definitivamente em massa','Lixeira',indices.length+' registo(s)');renderLixeira();toast('Registos eliminados definitivamente.');});
  }
  // Neutraliza o bug do tipo "member" introduzido pela versão anterior.
  const oldMove=window.moveToTrash; window.moveToTrash=function(tipo,dados,resumo){if(tipo==='member')tipo='membro';return oldMove(tipo,dados,resumo);};

  // ---------- 4) Base de dados geral separada + associação controlada ----------
  function addBasesTab(){
    if(!document.querySelector('[data-tab="bases"]')){
      ALL_TABS.push({key:'bases',label:'Bases de Dados',builtin:true});
      const nav=document.querySelector('#nav'); if(nav){const b=document.createElement('button');b.className='nav-btn';b.dataset.tab='bases';b.innerHTML='▦ <span>Bases de Dados</span>';nav.appendChild(b);b.onclick=()=>{document.querySelectorAll('.nav button[data-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('main.main .section').forEach(s=>s.classList.remove('active'));document.getElementById('sec-bases').classList.add('active');renderBasesV11();};}
    }
    if(document.getElementById('sec-bases'))return;
    const sec=document.createElement('section');sec.className='section';sec.id='sec-bases';sec.innerHTML=`<div class="topbar"><div><h2>Bases de Dados</h2><div class="sub">Base Geral de Membros separada das restantes bases e associação controlada pelo Admin</div></div></div><div class="v11-panel"><div class="v11-grid"><div class="field"><label>Base de origem</label><select id="v11-source"><option value="disciplina">Disciplina</option><option value="visitantes">Visitantes</option><option value="cultos">Cultos</option><option value="inventario">Inventário</option><option value="atividades">Atividades</option></select></div><div class="field"><label>Pesquisar</label><input id="v11-source-q" placeholder="Nome ou conteúdo…"></div><div class="field"><label>Acção</label><select id="v11-assoc-mode"><option value="copy">Adicionar cópia à Base Geral</option><option value="link">Associar sem duplicar</option></select></div><div class="field"><label>Estado da Base Geral</label><div id="v11-db-status" class="v11-pill">—</div></div></div><div class="u-4f3062"><button class="btn ghost sm" id="v11-db-refresh">Actualizar</button><button class="btn gold sm" id="v11-db-add">Adicionar seleccionados à Base Geral</button><button class="btn ghost sm" id="v11-db-export">Exportar Base Geral</button></div></div><div class="v11-panel"><div class="v11-scroll"><table class="data-table"><thead><tr><th><input type="checkbox" id="v11-source-all"></th><th>Nome / Identificação</th><th>Origem</th><th>Informação</th></tr></thead><tbody id="v11-source-body"></tbody></table></div></div><div class="v11-panel"><h3 class="u-53896a">Associações registadas</h3><div id="v11-assoc-list"></div></div>`;
    document.querySelector('main.main').appendChild(sec);
    document.getElementById('v11-source').onchange=renderBasesV11;document.getElementById('v11-source-q').oninput=renderBasesV11;document.getElementById('v11-db-refresh').onclick=renderBasesV11;document.getElementById('v11-source-all').onchange=e=>{document.querySelectorAll('#v11-source-body input').forEach(x=>x.checked=e.target.checked);};
    document.getElementById('v11-db-add').onclick=()=>{
      const source=document.getElementById('v11-source').value, arr=DB[source]||[], selected=Array.from(document.querySelectorAll('#v11-source-body input:checked')).map(x=>Number(x.value)).filter(Number.isFinite);
      if(!selected.length){toast('Seleccione pelo menos um registo.');return;}
      requireAdminAction('admin','Introduza a palavra-passe para associar dados à Base Geral de Membros.',()=>{let added=0,linked=0;selected.forEach(i=>{const src=arr[i];if(!src)return;const mapped={id:uid()};Object.keys(memberFieldMap).forEach(k=>{if(src[k]!==undefined&&src[k]!==null&&String(src[k]).trim()!=='')mapped[k]=src[k];});if(!mapped.nome)mapped.nome=src.nome||src.nomeCompleto||src.designacao||('Registo '+(i+1));if(document.getElementById('v11-assoc-mode').value==='link'){DB.settings.associations.push({id:uid(),source,target:'members',sourceId:src.id||null,targetName:mapped.nome,ts:new Date().toISOString()});linked++;}else{const dup=DB.members.find(m=>normName(m.nome)===normName(mapped.nome));if(dup){DB.settings.associations.push({id:uid(),source,target:'members',sourceId:src.id||null,targetId:dup.id,targetName:dup.nome,ts:new Date().toISOString(),type:'duplicate-linked'});linked++;}else{refreshComputed(mapped);DB.members.push(mapped);DB.settings.associations.push({id:uid(),source,target:'members',sourceId:src.id||null,targetId:mapped.id,targetName:mapped.nome,ts:new Date().toISOString(),type:'copied'});added++;}}});persistV11('Associou dados à Base Geral','Bases de Dados',added+' adicionado(s), '+linked+' associado(s)');renderBasesV11();toast(`${added} adicionado(s) e ${linked} associado(s).`);});
    };
    document.getElementById('v11-db-export').onclick=()=>{downloadFile('base-geral-membros.json',JSON.stringify(DB.members,null,2),'application/json;charset=utf-8');toast('Base Geral exportada.');};
    renderBasesV11();
  }
  function renderBasesV11(){const source=document.getElementById('v11-source');if(!source)return;const key=source.value,q=(document.getElementById('v11-source-q').value||'').trim().toLowerCase();const arr=DB[key]||[];const rows=arr.map((x,i)=>({x,i})).filter(o=>!q||JSON.stringify(o.x).toLowerCase().includes(q));document.getElementById('v11-source-body').innerHTML=rows.map(o=>`<tr><td><input type="checkbox" value="${o.i}"></td><td><strong>${esc(o.x.nome||o.x.nomeCompleto||o.x.designacao||o.x.atividade||o.x.item||'Registo '+(o.i+1))}</strong></td><td>${esc(key)}</td><td class="u-5ab118">${esc(Object.entries(o.x).slice(0,6).map(([k,v])=>k+': '+String(v??'')).join(' · '))}</td></tr>`).join('')||'<tr><td colspan="4"><div class="empty">Nenhum registo.</div></td></tr>';document.getElementById('v11-db-status').textContent='Base Geral: '+DB.members.length+' membros';document.getElementById('v11-assoc-list').innerHTML=(DB.settings.associations||[]).slice(0,100).map(a=>`<div class="v11-event"><span>${new Date(a.ts).toLocaleString('pt-PT')}</span><strong>${esc(a.source)}</strong><span>${esc(a.type||'associado')}</span><span>${esc(a.targetName||'—')}</span></div>`).join('')||'<div class="empty">Nenhuma associação registada.</div>';}

  // ---------- 5) Editor Universal: cabeçalhos, painéis, gráficos, estilo ----------
  const knownSections=['dashboard','database','aniversariantes','ficha','reports','financas','registos','qualidade','cultos','inventario','atividades','ajuda','lixeira','utilizadores','listas','aparencia','eventos','bases'];
  function addUniversalEditor(){
    const sec=document.getElementById('sec-aparencia');if(!sec||document.getElementById('v11-universal-editor'))return;
    const card=document.createElement('div');card.id='v11-universal-editor';card.className='v11-panel';card.innerHTML=`<h3 class="u-53896a">Editor Universal do Sistema</h3><p class="sub">Admin pode alterar títulos, subtítulos, cabeçalhos de tabelas, títulos de gráficos e estilo. As alterações são guardadas e reaplicadas quando as abas são reconstruídas.</p><div class="v11-grid"><div class="field"><label>Aba</label><select id="v11-ed-sec"></select></div><div class="field"><label>Título da aba</label><input id="v11-ed-title"></div><div class="field"><label>Subtítulo</label><input id="v11-ed-sub"></div><div class="field"><label>Modo</label><select id="v11-ed-mode"><option value="panel">Painel</option><option value="table">Tabela</option><option value="chart">Gráfico</option></select></div></div><div id="v11-ed-extra" class="u-002535"></div><div class="u-4f3062"><button class="btn gold sm" id="v11-ed-save">Guardar alteração</button><button class="btn ghost sm" id="v11-ed-reset">Repor esta aba</button><button class="btn danger sm" id="v11-ed-reset-all">Repor toda a personalização</button></div>`;
    sec.appendChild(card);
    const sel=document.getElementById('v11-ed-sec');sel.innerHTML=knownSections.map(k=>`<option value="${k}">${esc(TAB_LABELS_V9&&TAB_LABELS_V9[k]||k)}</option>`).join('');
    function fill(){const k=sel.value,s=DB.settings.universalEditor.sections[k]||{};document.getElementById('v11-ed-title').value=s.title||'';document.getElementById('v11-ed-sub').value=s.sub||'';drawExtra();}
    function drawExtra(){const k=sel.value,mode=document.getElementById('v11-ed-mode').value,box=document.getElementById('v11-ed-extra');if(mode==='panel'){box.innerHTML='<div class="note">O título e subtítulo são aplicados ao painel seleccionado.</div>';return;}if(mode==='table'){const sec=document.getElementById('sec-'+k),ths=sec?Array.from(sec.querySelectorAll('table thead th')).map(x=>x.textContent.trim()).filter(Boolean):[];const saved=DB.settings.universalEditor.tables[k]||{};box.innerHTML=ths.length?ths.map((h,i)=>`<div class="v11-editor-row"><span>${esc(h)}</span><input data-v11-th="${i}" value="${esc(saved[i]||h)}"><span class="v11-pill">Coluna ${i+1}</span></div>`).join(''):'<div class="empty">Esta aba não tem tabela visível. Abra a aba primeiro para o sistema detectar as colunas.</div>';return;}const sec=document.getElementById('sec-'+k),charts=sec?Array.from(sec.querySelectorAll('canvas')).map((c,i)=>({id:c.id,i})):[];const saved=DB.settings.universalEditor.charts[k]||{};box.innerHTML=charts.length?charts.map((c,i)=>`<div class="v11-editor-row"><span>${esc(c.id)}</span><input data-v11-chart="${i}" value="${esc(saved[i]||'')}"><span class="v11-pill">Título</span></div>`).join(''):'<div class="empty">Abra a aba com os gráficos para detectar os seus painéis.</div>';}
    sel.onchange=fill;document.getElementById('v11-ed-mode').onchange=drawExtra;
    document.getElementById('v11-ed-save').onclick=()=>requireAdminAction('admin','Introduza a palavra-passe para alterar a estrutura visual e os painéis.',()=>{const k=sel.value;DB.settings.universalEditor.sections[k]={title:document.getElementById('v11-ed-title').value.trim(),sub:document.getElementById('v11-ed-sub').value.trim()};const mode=document.getElementById('v11-ed-mode').value;if(mode==='table'){DB.settings.universalEditor.tables[k]={};document.querySelectorAll('[data-v11-th]').forEach(x=>DB.settings.universalEditor.tables[k][x.dataset.v11Th]=x.value.trim());}if(mode==='chart'){DB.settings.universalEditor.charts[k]={};document.querySelectorAll('[data-v11-chart]').forEach(x=>DB.settings.universalEditor.charts[k][x.dataset.v11Chart]=x.value.trim());}persistV11('Alterou painel','Editor Universal',k);applyUniversalOverrides();toast('Alteração visual guardada.');});
    document.getElementById('v11-ed-reset').onclick=()=>requireAdminAction('admin','Introduza a palavra-passe para repor a personalização da aba.',()=>{delete DB.settings.universalEditor.sections[sel.value];delete DB.settings.universalEditor.tables[sel.value];delete DB.settings.universalEditor.charts[sel.value];persistV11('Repôs personalização','Editor Universal',sel.value);applyUniversalOverrides();fill();toast('Personalização da aba reposta.');});
    document.getElementById('v11-ed-reset-all').onclick=()=>requireAdminAction('admin','Introduza a palavra-passe para repor toda a personalização.',()=>{if(!confirm('Repor toda a personalização visual e de painéis?'))return;DB.settings.universalEditor={sections:{},tables:{},charts:{}};persistV11('Repôs personalização total','Editor Universal','Sistema');applyUniversalOverrides();fill();toast('Personalização reposta.');});
    fill();
  }
  function applyUniversalOverrides(){
    const cfg=DB.settings.universalEditor||{sections:{},tables:{},charts:{}};
    Object.entries(cfg.sections||{}).forEach(([k,v])=>{const sec=document.getElementById('sec-'+k);if(!sec)return;const h=sec.querySelector('.topbar h2');const sub=sec.querySelector('.topbar .sub');if(h&&v.title)h.textContent=v.title;if(sub&&v.sub)sub.textContent=v.sub;});
    Object.entries(cfg.tables||{}).forEach(([k,map])=>{const sec=document.getElementById('sec-'+k);if(!sec)return;Array.from(sec.querySelectorAll('table thead th')).forEach((th,i)=>{if(map[i])th.textContent=map[i];});});
    Object.entries(cfg.charts||{}).forEach(([k,map])=>{const sec=document.getElementById('sec-'+k);if(!sec)return;Array.from(sec.querySelectorAll('canvas')).forEach((c,i)=>{if(!map[i])return;const label=sec.querySelector(`[for="${c.id}"]`)||c.parentElement.querySelector('h3');if(label)label.textContent=map[i];});});
  }

  // ---------- 6) Finanças: edição realmente abrangente ----------
  function enhanceFinanceV11(){
    const sec=document.getElementById('sec-financas');if(!sec)return;
    let box=document.getElementById('v11-finance-all');if(!box){box=document.createElement('div');box.id='v11-finance-all';box.className='v11-panel';box.innerHTML='<h3 class="u-53896a">Edição completa de Finanças</h3><p class="sub">Admin pode alterar mês, entradas, saídas e, na sub-aba de congregações, todos os valores. As alterações são guardadas na Base de Dados.</p><div id="v11-finance-status" class="v11-pill"></div>';sec.insertBefore(box,sec.querySelector('.kpi-grid')||sec.firstChild);}
    const st=document.getElementById('v11-finance-status');if(st)st.textContent='Última gravação: '+(DB.settings.system.lastSavedAt?new Date(DB.settings.system.lastSavedAt).toLocaleString('pt-PT'):'—');
  }

  // ---------- 7) Inicialização / reaplicação ----------
  function initV11(){
    addBasesTab();addUniversalEditor();enhanceFinanceV11();
    if(typeof applyUniversalOverrides==='function')applyUniversalOverrides();
    if(typeof renderLixeira==='function')renderLixeira();
    if(typeof renderAniversariantes==='function')renderAniversariantes();
    // Atualiza todos os painéis depois de qualquer operação de dados.
    window.refreshAllV11=function(){try{if(typeof refreshAllV10==='function')refreshAllV10();}catch(e){}try{renderAniversariantes();}catch(e){}try{renderLixeira();}catch(e){}try{renderBasesV11();}catch(e){}try{applyUniversalOverrides();}catch(e){}};
    setInterval(()=>{try{applyUniversalOverrides();}catch(e){}},1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(initV11,80));else setTimeout(initV11,80);
})();
