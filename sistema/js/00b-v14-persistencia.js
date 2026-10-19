/* =====================================================================
   V14 — PERSISTÊNCIA SEGURA (sem perder dados)
   Problema da V13.1: a camada V10 guarda até 80 cópias completas da base
   («estados anteriores») dentro do localStorage. Ao fim de poucas alterações o
   limite do navegador (~5 MB) esgota-se e deixa de ser possível guardar
   («QuotaExceededError»): as alterações seguintes perdiam-se ao recarregar.
   Correcção:
     · se o localStorage encher, os dados principais são sempre guardados e os
       estados anteriores mais antigos passam para o IndexedDB (nada é apagado);
     · ao abrir, esses estados são repostos em memória (aba «Eventos»);
     · se a cópia interna da V11 (IndexedDB) for mais recente do que a base
       guardada, o administrador pode recuperá-la (a base actual fica arquivada).
   ===================================================================== */
(function () {
  'use strict';
  const KEY = 'monteMoriaDB_v1'; const IDB = 'MonteMoriaV14'; const SNAP = 'estadosAnteriores'; const ARQ = 'arquivo';
  const MIRROR = { db: 'CMMSistemaGestaoDB', store: 'estado' };
  const set0 = Storage.prototype.setItem;
  const isQuota = (e) => !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
  const open = () => new Promise((res, rej) => {
    if (!window.indexedDB) { rej(new Error('IndexedDB indisponível')); return; }
    const r = indexedDB.open(IDB, 1);
    r.onupgradeneeded = () => { const db = r.result; [SNAP, ARQ].forEach((s) => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('IndexedDB'));
  });
  const put = (store, items) => open().then((db) => new Promise((res) => { const tx = db.transaction(store, 'readwrite'); const st = tx.objectStore(store); items.forEach((x) => { if (x && x.id) st.put(x); }); tx.oncomplete = () => res(true); tx.onerror = () => res(false); })).catch(() => false);
  const all = (store) => open().then((db) => new Promise((res) => { const q = db.transaction(store).objectStore(store).getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); })).catch(() => []);
  const MMStore = { status: 'normal', kept: null, archived: 0 };
  window.MMStore = MMStore;

  /* 1) Gravação: nunca falha por causa dos estados anteriores */
  Storage.prototype.setItem = function (k, v) {
    if (k !== KEY || this !== window.localStorage) return set0.call(this, k, v);
    try { const r = set0.call(this, k, v); MMStore.status = 'normal'; return r; } catch (e) {
      if (!isQuota(e) || typeof DB === 'undefined' || !DB) throw e;
      const snaps = Array.isArray(DB.eventSnapshots) ? DB.eventSnapshots.filter((s) => s && s.data) : [];
      put(SNAP, snaps).then((ok) => { if (ok) MMStore.archived = snaps.length; }); // cópia integral no IndexedDB
      for (const n of [20, 10, 5, 2, 0]) {
        try { set0.call(this, k, JSON.stringify({ ...DB, eventSnapshots: snaps.slice(0, n) })); MMStore.status = 'compacto'; MMStore.kept = n; return undefined; } catch (e2) { if (!isQuota(e2)) throw e2; }
      }
      MMStore.status = 'cheio'; throw e; // mesmo sem estados anteriores não cabe: a cópia da V11 no IndexedDB mantém os dados
    }
  };

  /* 2) Cópia interna da V11 mais recente do que a base guardada? (lida antes de a V11 a reescrever) */
  const mirrorRead = new Promise((res) => {
    try {
      if (!window.indexedDB) { res(null); return; }
      const r = indexedDB.open(MIRROR.db, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(MIRROR.store)) r.result.createObjectStore(MIRROR.store); };
      r.onsuccess = () => { try { const q = r.result.transaction(MIRROR.store).objectStore(MIRROR.store).get('latest'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (_) { res(null); } };
      r.onerror = () => res(null);
    } catch (_) { res(null); }
  });

  const recoverCard = (copy, a, b) => {
    const sec = document.getElementById('sec-dashboard'); if (!sec || document.getElementById('v14-recuperar')) return;
    const f = (s) => new Date(s).toLocaleString('pt-PT');
    const box = document.createElement('div'); box.id = 'v14-recuperar'; box.className = 'note v14-recover'; box.setAttribute('role', 'alert');
    box.innerHTML = `<b>Foi encontrada uma cópia interna mais recente dos dados</b> (guardada em ${MMUI.esc(f(a))}; a base aberta é de ${MMUI.esc(f(b))}).
      Isto acontecia na V13 quando o armazenamento do navegador enchia. Membros na cópia: ${MMUI.esc((copy.members || []).length)} · na base aberta: ${MMUI.esc((DB.members || []).length)}.
      <div class="v14-actions"><button type="button" class="btn gold sm" data-v14rec="ok">Recuperar a cópia mais recente</button><button type="button" class="btn ghost sm" data-v14rec="no">Manter a base actual</button></div>`;
    sec.insertBefore(box, sec.children[1] || null);
    box.addEventListener('click', (e) => {
      const b2 = e.target.closest('[data-v14rec]'); if (!b2) return;
      if (b2.dataset.v14rec === 'no') { box.remove(); DB.settings.system.recuperacaoIgnorada = a; if (typeof saveDB === 'function') saveDB(); return; }
      const run = () => put(ARQ, [{ id: `antes-da-recuperacao-${Date.now()}`, ts: new Date().toISOString(), data: JSON.parse(JSON.stringify(DB)) }]).then(() => {
        Object.keys(DB).forEach((k) => { delete DB[k]; }); Object.assign(DB, copy);
        if (typeof saveDB === 'function') saveDB(); if (typeof logActivity === 'function') logActivity('Recuperou', 'Base de dados', `cópia interna de ${f(a)}`);
        MMUI.toast('Cópia mais recente recuperada. A base anterior ficou arquivada no navegador.'); setTimeout(() => MMStoreX.flush().finally(() => location.reload()), 900);
      });
      if (typeof requireAdminAction === 'function') requireAdminAction('admin', 'Introduza a palavra-passe para recuperar a cópia interna mais recente.', run); else run();
    });
  };

  /* 3) Ao abrir: repor os estados arquivados e verificar a cópia interna */
  const init = async () => {
    try {
      if (typeof DB === 'undefined' || !DB) return;
      const copy = await mirrorRead; const a = copy?.settings?.system?.lastSavedAt; const b = DB.settings?.system?.lastSavedAt;
      if (a && b && Date.parse(a) - Date.parse(b) > 5000 && DB.settings.system.recuperacaoIgnorada !== a) recoverCard(copy, a, b);
      const arch = await all(SNAP);
      if (arch.length && Array.isArray(DB.eventSnapshots)) {
        const ids = new Set(DB.eventSnapshots.map((s) => s.id)); const add = arch.filter((s) => s.data && !ids.has(s.id));
        if (add.length) { DB.eventSnapshots = [...DB.eventSnapshots, ...add].sort((x, y) => String(y.ts).localeCompare(String(x.ts))).slice(0, 80); }
        const keep = new Set(DB.eventSnapshots.map((s) => s.id)); const drop = arch.filter((s) => !keep.has(s.id)).map((s) => s.id); // mesmo limite da V10 (80)
        if (drop.length) open().then((db) => { const tx = db.transaction(SNAP, 'readwrite'); drop.forEach((id) => tx.objectStore(SNAP).delete(id)); }).catch(() => {});
      }
    } catch (e) { console.warn('V14 (persistência):', e); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
