/* V11.1 — persistência autónoma e editor de dados universal */
(function(){
  const clone=x=>{try{return JSON.parse(JSON.stringify(x));}catch(e){return null;}};
  // IndexedDB is a secondary durable mirror; localStorage remains the synchronous source for compatibility.
  const IDB_NAME='CMMSistemaGestaoDB', IDB_STORE='estado';
  function mirror(){
    try{
      if(!window.indexedDB)return;
      const req=indexedDB.open(IDB_NAME,1);
      req.onupgradeneeded=e=>{if(!e.target.result.objectStoreNames.contains(IDB_STORE))e.target.result.createObjectStore(IDB_STORE);};
      req.onsuccess=e=>{try{const db=e.target.result,tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(clone(DB),'latest');}catch(err){}};
    }catch(e){}
  }
  const save0=window.saveDB;
  window.saveDB=function(){save0();mirror();const el=document.getElementById('v11-save-status');if(el)el.textContent='Guardado automaticamente: '+new Date().toLocaleString('pt-PT');};
  function addSaveStatus(){const sec=document.getElementById('sec-dashboard')||document.querySelector('main.main .section');if(sec&&!document.getElementById('v11-save-status')){const x=document.createElement('div');x.id='v11-save-status';x.className='v11-pill';x.style.margin='0 0 10px';x.textContent='Persistência autónoma activa';const top=sec.querySelector('.topbar');if(top)top.appendChild(x);else sec.prepend(x);}}

  // Editor de dados: torna tabelas de dados editáveis quando uma célula representa um campo simples.
  function addDataEditor(){
    const sec=document.getElementById('sec-aparencia');if(!sec||document.getElementById('v11-data-editor'))return;
    const box=document.createElement('div');box.id='v11-data-editor';box.className='v11-panel';box.innerHTML=`<h3 class="u-53896a">Editor Universal de Dados</h3><p class="sub">Para além da aparência, o Admin pode abrir uma tabela de dados, editar valores simples e guardar. Os campos calculados continuam a ser protegidos pelo sistema.</p><div class="v11-grid"><div class="field"><label>Base</label><select id="v11-data-key"><option value="members">Membros</option><option value="disciplina">Disciplina</option><option value="visitantes">Visitantes</option><option value="financas">Finanças</option><option value="cultos">Cultos</option><option value="inventario">Inventário</option><option value="atividades">Atividades</option></select></div><div class="field"><label>Registo</label><select id="v11-data-row"></select></div><div class="field"><label>Campo</label><select id="v11-data-field"></select></div><div class="field"><label>Valor</label><input id="v11-data-value"></div></div><div class="u-3419e4"><button class="btn gold sm" id="v11-data-save">Guardar valor</button><button class="btn ghost sm" id="v11-data-refresh">Actualizar</button></div><div id="v11-data-help" class="u-5371db note">Edite um campo por vez para manter rastreabilidade no histórico.</div>`;
    sec.appendChild(box);
    const key=document.getElementById('v11-data-key'),row=document.getElementById('v11-data-row'),field=document.getElementById('v11-data-field'),val=document.getElementById('v11-data-value');
    function fillRows(){const arr=Array.isArray(DB[key.value])?DB[key.value]:[];row.innerHTML=arr.map((x,i)=>`<option value="${i}">${esc(String(x.nome||x.mes||x.atividade||x.item||('Registo '+(i+1))).slice(0,100))}</option>`).join('');fillFields();}
    function fillFields(){const arr=DB[key.value]||[],x=arr[Number(row.value)]||{};field.innerHTML=Object.keys(x).filter(k=>!['id','foto'].includes(k)&&typeof x[k]!=='object').map(k=>`<option value="${esc(k)}">${esc(k)}</option>`).join('');val.value=x[field.value]??'';}
    key.onchange=fillRows;row.onchange=fillFields;field.onchange=fillFields;document.getElementById('v11-data-refresh').onclick=fillRows;
    document.getElementById('v11-data-save').onclick=()=>requireAdminAction('admin','Introduza a palavra-passe para alterar dados através do Editor Universal.',()=>{const arr=DB[key.value];const i=Number(row.value);const k=field.value;if(!arr||!arr[i]||!k)return;const before=arr[i][k];let nv=val.value;if(typeof before==='number')nv=Number(nv)||0;arr[i][k]=nv;if(key.value==='members'&&typeof refreshComputed==='function')refreshComputed(arr[i]);saveDB();logActivity('Editou dado','Editor Universal',key.value+' · '+k);if(typeof refreshAllV11==='function')refreshAllV11();fillRows();toast('Valor guardado.');});
    fillRows();
  }
  function init(){addSaveStatus();addDataEditor();mirror();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,120));else setTimeout(init,120);
})();
