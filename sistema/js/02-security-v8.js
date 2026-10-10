/* =====================================================================
   V8 SECURITY HARDENING
   - Forced authentication on application startup
   - PBKDF2 password verification / migration from legacy plaintext
   - Per-tab permissions: none / read / edit
   - Navigation and mutation guards for read-only users
   - Admin-only user/permission management
   - Failed-login throttling
   - Session integrity checks
   ===================================================================== */
(function(){
  'use strict';
  const SECURITY_SCHEMA = 8;
  const ADMIN_DEFAULT_SALT = 'nQuM2LQXk1OJCW/J8lm4Hw==';
  const ADMIN_DEFAULT_HASH = 'ZNhZE0xmHNBK1jYvUPo1F4abfY2jLl/KS5tRS0s2Kr8=';
  const PBKDF2_ITERATIONS = 150000;
  const lockedNavKeys = new Set(['lixeira','utilizadores','listas','aparencia']);
  const MUTATION_WORDS = ['guardar','salvar','adicionar','novo registo','novo utilizador','editar','remover','eliminar','criar','importar','restaurar','personalizar','alterar','repor','esvaziar','gerar backup','aplicar'];
  let loginFails = 0;
  let lockUntil = 0;
  let secureBoot = true;

  const b64 = (buf)=>{
    const bytes = new Uint8Array(buf); let bin='';
    for(let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  };
  const ab = (str)=>{
    const bin=atob(str); const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return bytes;
  };
  async function derivePassword(password, saltB64, iterations=PBKDF2_ITERATIONS){
    if(!window.crypto?.subtle) throw new Error('Web Crypto indisponível neste navegador.');
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),{name:'PBKDF2'},false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:ab(saltB64),iterations,hash:'SHA-256'},key,256);
    return b64(bits);
  }
  function constantTimeEqual(a,b){
    if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length) return false;
    let x=0; for(let i=0;i<a.length;i++) x |= a.charCodeAt(i)^b.charCodeAt(i); return x===0;
  }
  async function verifyHash(password, rec){
    if(!rec?.hash||!rec?.salt) return false;
    try{return constantTimeEqual(await derivePassword(password,rec.salt,rec.iterations||PBKDF2_ITERATIONS),rec.hash);}catch(e){return false;}
  }
  async function makePasswordRecord(password, saltB64){
    const salt=saltB64 || b64(crypto.getRandomValues(new Uint8Array(16)));
    return {algo:'PBKDF2-SHA256',iterations:PBKDF2_ITERATIONS,salt,hash:await derivePassword(password,salt,PBKDF2_ITERATIONS)};
  }
  function markSecuritySchema(){
    DB.settings=DB.settings||{};
    DB.settings.securitySchema=SECURITY_SCHEMA;
  }
  function normalisePermission(v){ return ['none','read','edit'].includes(v)?v:'none'; }
  function buildPermissionsForUser(u){
    const all=ALL_TABS.map(t=>t.key);
    if(u?.isAdmin || u?.username==='admin') return Object.fromEntries(all.map(k=>[k,'edit']));
    const out={}; const oldTabs=Array.isArray(u?.tabs)?u.tabs:[];
    all.forEach(k=>{
      if(u?.permissions && Object.prototype.hasOwnProperty.call(u.permissions,k)) out[k]=normalisePermission(u.permissions[k]);
      else out[k]=oldTabs.includes(k) ? (u?.canEdit ? 'edit':'read') : 'none';
    });
    return out;
  }
  function sessionUser(){ return currentSessionUser(); }
  function tabPermission(tabKey){
    const u=sessionUser();
    if(!u) return 'none';
    if(u.isAdmin || u.username==='admin') return 'edit';
    return normalisePermission(buildPermissionsForUser(u)[tabKey]);
  }
  function canEditTab(tabKey){ return tabPermission(tabKey)==='edit'; }
  function canReadTab(tabKey){ return ['read','edit'].includes(tabPermission(tabKey)); }
  window.getTabPermissionV8=tabPermission;
  window.canEditTabV8=canEditTab;

  /* Migrate the default admin credential away from plaintext immediately. */
  try{
    DB.settings=DB.settings||{};
    if(!DB.settings.adminPasswordHash && (!DB.settings.adminPassword || DB.settings.adminPassword===DEFAULT_ADMIN_PASSWORD)){
      DB.settings.adminPasswordHash={algo:'PBKDF2-SHA256',iterations:PBKDF2_ITERATIONS,salt:ADMIN_DEFAULT_SALT,hash:ADMIN_DEFAULT_HASH};
      delete DB.settings.adminPassword;
      markSecuritySchema();
      saveDB();
    }
  }catch(e){ console.warn('Security bootstrap migration:',e); }

  function showLoginError(msg){
    const el=document.getElementById('login-error'); if(el){el.textContent=msg;el.style.display='block';}
  }
  function clearLoginError(){ const el=document.getElementById('login-error'); if(el) el.style.display='none'; }
  function updateLoginChoices(){
    const sel=document.getElementById('login-username'); if(!sel) return;
    sel.innerHTML='<option value="admin">Administrador</option>'+(DB.users||[]).map(u=>`<option value="${esc(u.username)}">${esc(u.username)}${u.perfil?' — '+esc(u.perfil):''}</option>`).join('');
  }
  function openForcedLogin(){
    secureBoot=true;
    document.body.classList.add('v8-auth-locked');
    updateLoginChoices(); clearLoginError();
    const modal=document.getElementById('modal-login');
    if(modal) modal.classList.add('open');
    setTimeout(()=>document.getElementById('login-password')?.focus(),80);
  }
  function releaseLogin(){
    secureBoot=false;
    document.body.classList.remove('v8-auth-locked');
  }
  async function authenticate(username,password){
    const u=(username||'').trim();
    if(u==='admin'){
      if(DB.settings.adminPasswordHash && await verifyHash(password,DB.settings.adminPasswordHash)) return true;
      /* Legacy migration path: old installations may still contain plaintext. */
      if(DB.settings.adminPassword && password===DB.settings.adminPassword){
        DB.settings.adminPasswordHash=await makePasswordRecord(password, ADMIN_DEFAULT_SALT);
        delete DB.settings.adminPassword; markSecuritySchema(); saveDB(); return true;
      }
      return false;
    }
    const user=(DB.users||[]).find(x=>x.username===u);
    if(!user) return false;
    if(user.passwordHash && await verifyHash(password,user.passwordHash)) return true;
    if(user.password && password===user.password){
      user.passwordHash=await makePasswordRecord(password);
      delete user.password;
      saveDB(); return true;
    }
    return false;
  }

  /* Replace the legacy login handler with the hardened async version. */
  const loginBtn=document.getElementById('btn-login-confirm');
  if(loginBtn){
    const clone=loginBtn.cloneNode(true); loginBtn.replaceWith(clone);
    clone.addEventListener('click', async ()=>{
      if(Date.now()<lockUntil){ showLoginError('Muitas tentativas. Aguarde alguns segundos e tente novamente.'); return; }
      const u=document.getElementById('login-username')?.value||'admin';
      const p=document.getElementById('login-password')?.value||'';
      if(!p){ showLoginError('Introduza a palavra-passe.'); return; }
      clone.disabled=true;
      const ok=await authenticate(u,p);
      clone.disabled=false;
      if(!ok){
        loginFails++;
        if(loginFails>=5){ lockUntil=Date.now()+30000; loginFails=0; showLoginError('Acesso temporariamente bloqueado por 30 segundos.'); }
        else showLoginError('Utilizador ou palavra-passe incorretos.');
        return;
      }
      loginFails=0; lockUntil=0;
      setSession(u); releaseLogin();
      document.getElementById('modal-login')?.classList.remove('open');
      if(u==='admin') DB.settings.lastAdminLogin=new Date().toISOString();
      saveDB(); renderSessionIndicator(); applyNavPermissionsV8(); applyUserTabSecurity();
      toast('Sessão iniciada com sucesso.');
    });
  }

  /* Replace the legacy plaintext-only gate used throughout the application. */
  requirePassword=function(zone,reason,onSuccess){
    if(!isLoggedIn() && zone==='admin'){ openForcedLogin(); return; }
    document.getElementById('pw-reason').textContent=reason||'Esta ação requer a palavra-passe de administração.';
    document.getElementById('pw-input').value=''; document.getElementById('pw-error').style.display='none';
    pendingPasswordCallback={zone,onSuccess}; document.getElementById('modal-password').classList.add('open');
    setTimeout(()=>document.getElementById('pw-input')?.focus(),50);
  };
  const pwBtn=document.getElementById('btn-pw-confirm');
  if(pwBtn){
    const clone=pwBtn.cloneNode(true); pwBtn.replaceWith(clone);
    clone.addEventListener('click',async()=>{
      const val=document.getElementById('pw-input').value;
      let ok=false;
      if(DB.settings.adminPasswordHash) ok=await verifyHash(val,DB.settings.adminPasswordHash);
      else if(DB.settings.adminPassword){ ok=(val===DB.settings.adminPassword); if(ok){DB.settings.adminPasswordHash=await makePasswordRecord(val);delete DB.settings.adminPassword;markSecuritySchema();saveDB();} }
      if(!ok){document.getElementById('pw-error').style.display='block';return;}
      document.getElementById('modal-password').classList.remove('open');
      if(pendingPasswordCallback){const cb=pendingPasswordCallback.onSuccess; const zone=pendingPasswordCallback.zone; pendingPasswordCallback=null; unlockedZones.add(zone); updateLockIndicators(); cb();}
    });
  }

  /* User names/passwords and individual tab permissions. */
  userFieldsHTML=function(u){
    u=u||{tabs:[],canEdit:false,perfil:'Personalizado',permissions:{}};
    const perms=buildPermissionsForUser(u); const names=Object.keys(USER_PROFILES);
    return `<div class="fields-grid">
      <div class="field"><label>Nome de Utilizador *</label><input type="text" data-f="username" value="${esc(u.username||'')}" ${u.username?'readonly':''}></div>
      <div class="field"><label>Palavra-passe ${u.username?'(deixe em branco para manter)':'*'}</label><input type="password" data-f="password" value="" autocomplete="new-password"></div>
      <div class="field"><label>Perfil</label><select id="user-profile-select">${names.map(p=>`<option value="${esc(p)}" ${u.perfil===p?'selected':''}>${esc(p)}</option>`).join('')}</select></div>
    </div>
    <div class="group-title">Permissões por separador</div>
    <p class="sub">Defina individualmente: <strong>Sem acesso</strong>, <strong>Leitura</strong> ou <strong>Edição</strong>.</p>
    <div class="fields-grid c2" id="user-tab-permissions">${ALL_TABS.map(t=>{
      const pv=perms[t.key]||'none';
      return `<div class="u-df8db2">
        <span class="u-1aefa2">${esc(t.label)}</span>
        <select data-perm="${t.key}" class="u-53aa7c">
          <option value="none" ${pv==='none'?'selected':''}>Sem acesso</option>
          <option value="read" ${pv==='read'?'selected':''}>Leitura</option>
          <option value="edit" ${pv==='edit'?'selected':''}>Edição</option>
        </select>
      </div>`;
    }).join('')}</div>
    <div class="u-002535 note">Acesso a Lixeira, Utilizadores, Listas &amp; Categorias e Aparência permanece reservado ao Admin. Operações críticas podem exigir novamente a palavra-passe mestra.</div>`;
  };

  const saveUserBtn=document.getElementById('btn-save-user');
  if(saveUserBtn){
    const clone=saveUserBtn.cloneNode(true); saveUserBtn.replaceWith(clone);
    clone.addEventListener('click', async ()=>{
      if(!isLoggedIn() || sessionUser()?.username!=='admin'){ toast('Apenas o Admin pode gerir utilizadores e permissões.'); return; }
      const body=document.getElementById('modal-user-body');
      const username=body.querySelector('[data-f="username"]')?.value.trim();
      const password=body.querySelector('[data-f="password"]')?.value||'';
      const perfil=document.getElementById('user-profile-select')?.value||'Personalizado';
      if(!username){toast('O nome de utilizador é obrigatório.');return;}
      if(username.toLowerCase()==='admin'){toast('A conta admin é reservada.');return;}
      let existing=editingUserIdx!==null?DB.users[editingUserIdx]:null;
      if(!existing && DB.users.some(x=>x.username.toLowerCase()===username.toLowerCase())){toast('Já existe um utilizador com este nome.');return;}
      if(!existing && !password){toast('Defina uma palavra-passe para o novo utilizador.');return;}
      const permissions={}; body.querySelectorAll('[data-perm]').forEach(s=>permissions[s.dataset.perm]=normalisePermission(s.value));
      const rec=existing?Object.assign({},existing):{username}; rec.perfil=perfil; rec.permissions=permissions;
      rec.tabs=Object.keys(permissions).filter(k=>permissions[k]!=='none'); rec.canEdit=Object.values(permissions).some(v=>v==='edit');
      if(password) rec.passwordHash=await makePasswordRecord(password), delete rec.password;
      if(existing) Object.assign(existing,rec); else DB.users.push(rec);
      saveDB(); logActivity(existing?'Editou':'Criou','Utilizador',rec.username);
      document.getElementById('modal-user-edit').classList.remove('open'); editingUserIdx=null; renderUsuarios(); toast(existing?'Utilizador atualizado.':'Utilizador criado.');
    });
  }

  /* Admin-only master password change: never persist plaintext after this point. */
  const masterSave=document.getElementById('btn-master-pw-save');
  if(masterSave){
    const clone=masterSave.cloneNode(true); masterSave.replaceWith(clone);
    clone.addEventListener('click', async ()=>{
      if(sessionUser()?.username!=='admin'){toast('Apenas o Admin pode alterar a palavra-passe mestra.');return;}
      const p1=document.getElementById('new-master-pw').value, p2=document.getElementById('new-master-pw2').value;
      if(!p1||p1!==p2){document.getElementById('master-pw-error').style.display='block';return;}
      DB.settings.adminPasswordHash=await makePasswordRecord(p1); delete DB.settings.adminPassword; markSecuritySchema(); saveDB();
      document.getElementById('modal-master-pw').classList.remove('open'); toast('Palavra-passe mestra atualizada com armazenamento seguro.');
    });
  }

  /* Permission-aware navigation. Admin retains full access. */
  function applyNavPermissionsV8(){
    const u=sessionUser();
    document.querySelectorAll('#nav button[data-tab]').forEach(btn=>{
      const k=btn.dataset.tab;
      const allowed=u?.isAdmin||u?.username==='admin'||canReadTab(k);
      btn.style.display=allowed && !isTabHidden(k)?'':'none';
      btn.setAttribute('aria-disabled',allowed?'false':'true');
    });
    const active=document.querySelector('#nav button.active');
    if(active && active.style.display==='none'){
      const first=[...document.querySelectorAll('#nav button[data-tab]')].find(b=>b.style.display!=='none');
      if(first) first.click();
    }
  }
  window.applyNavPermissionsV8=applyNavPermissionsV8;

  function applyUserTabSecurity(){
    document.querySelectorAll('.section').forEach(sec=>{
      const key=(sec.id||'').replace(/^sec-/,'');
      if(!key) return;
      const perm=tabPermission(key);
      sec.dataset.permission=perm;
      sec.classList.toggle('v8-readonly',perm==='read');
      sec.classList.toggle('v8-noaccess',perm==='none');
      sec.querySelectorAll('button').forEach(btn=>{
        if(btn.dataset.v8Keep==='1') return;
        const tx=(btn.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
        const mutation=MUTATION_WORDS.some(w=>tx.includes(w)) && !tx.includes('filtrar') && !tx.includes('gerar relatório');
        if(perm==='read' && mutation){ btn.disabled=true; btn.setAttribute('aria-disabled','true'); btn.title='Separador em modo Leitura'; }
        else if(perm==='edit' || perm==='none'){ btn.disabled=false; btn.removeAttribute('aria-disabled'); }
      });
    });
  }
  window.applyUserTabSecurity=applyUserTabSecurity;

  /* Stop navigation before the original listener runs when not authenticated / allowed. */
  document.addEventListener('click',(e)=>{
    const navBtn=e.target.closest('#nav button[data-tab]');
    if(navBtn){
      if(secureBoot || !isLoggedIn()){
        e.preventDefault(); e.stopImmediatePropagation(); openForcedLogin(); return;
      }
      const key=navBtn.dataset.tab;
      if(!canReadTab(key) && sessionUser()?.username!=='admin'){
        e.preventDefault(); e.stopImmediatePropagation(); toast('O seu perfil não tem acesso a este separador.'); return;
      }
    }
    const modalLogin=e.target.closest('#modal-login');
    if(modalLogin && secureBoot){
      if(e.target.closest('[data-close]') || e.target===modalLogin){ e.preventDefault(); e.stopImmediatePropagation(); openForcedLogin(); }
    }
  },true);

  /* Block common mutation controls in read-only tabs. This is a UI guard;
     critical operations remain protected by their own Admin gate. */
  document.addEventListener('click',(e)=>{
    if(secureBoot || !isLoggedIn()) return;
    const btn=e.target.closest('button'); if(!btn) return;
    const sec=btn.closest('.section'); if(!sec) return;
    const key=(sec.id||'').replace(/^sec-/,''); if(!key) return;
    if(tabPermission(key)!=='read') return;
    const text=(btn.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(MUTATION_WORDS.some(w=>text.includes(w)) && !text.includes('filtrar') && !text.includes('gerar relatório')){
      e.preventDefault(); e.stopImmediatePropagation(); toast('Este separador está em modo Leitura. Não é permitido alterar dados.');
    }
  },true);

  /* Session integrity: permissions are re-applied after login/logout. */
  const _renderSessionIndicatorV8=renderSessionIndicator;
  renderSessionIndicator=function(){ _renderSessionIndicatorV8(); applyNavPermissionsV8(); applyUserTabSecurity(); updateLoginChoices(); };

  /* Modern visual lock and readonly cues. */
  const css=document.createElement('style');
  css.textContent=`
    body.v8-auth-locked .app-shell{filter:blur(.3px);}
    body.v8-auth-locked .sidebar,body.v8-auth-locked .main{pointer-events:none;user-select:none;}
    body.v8-auth-locked #modal-login{z-index:99999;}
    .section.v8-readonly input:not([type=search]),.section.v8-readonly textarea,.section.v8-readonly select{background:#f7f7f7;}
    .section.v8-readonly [contenteditable="true"]{pointer-events:none;}
  `;
  document.head.appendChild(css);

  /* Force authentication on every opening/refresh. A session never carries across a new page load. */
  try{ setSession(null); }catch(e){}
  setTimeout(openForcedLogin,40);
  markSecuritySchema();
  try{saveDB();}catch(e){console.warn('Security schema save failed',e);}
})();
