/* =====================================================================
   V24 — ARMAZENAMENTO SEM O LIMITE DE ~5 MB DO NAVEGADOR (modelo DPDORE V8.9)
   · Base principal na base de dados interna do navegador (IndexedDB): centenas de MB.
     Na primeira abertura a base que estava no armazenamento local (localStorage) passa
     automaticamente para o IndexedDB e o localStorage deixa de ser usado.
   · Os «estados anteriores» (aba Eventos) ficam guardados à parte, um a um,
     em vez de irem dentro da base em cada gravação.
   · Ficheiro de dados no computador (Chrome / Edge): cada alteração é gravada também num
     ficheiro .json escolhido pelo administrador (ex.: pasta do OneDrive / SharePoint).
     Ao abrir, se esse ficheiro for mais recente (alterado noutro posto), é ele que é carregado.
   · O arranque da aplicação espera pela leitura da base (os scripts da aplicação estão
     marcados como type="text/x-mm-app" e são executados pela ordem original logo a seguir).
   ===================================================================== */
'use strict';
const MM_MAIN_IDB = 'MonteMoriaPrincipal';
const MMStoreX = {
  mode: 'local', cached: null, snaps: new Map(), stored: new Set(), at: '', busy: false, pending: null, waiters: [],
  lsCleared: false, persisted: false, lastError: '', loadedFrom: '', fromFile: false,
  KEY: 'monteMoriaDB_v1',
  open() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('IndexedDB indisponível')); return; }
      const r = indexedDB.open(MM_MAIN_IDB, 1);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv', { keyPath: 'id' }); if (!d.objectStoreNames.contains('snaps')) d.createObjectStore('snaps', { keyPath: 'id' }); };
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error || new Error('erro ao abrir IndexedDB'));
      r.onblocked = () => reject(new Error('IndexedDB bloqueado por outro separador'));
    });
  },
  async tx(stores, mode, fn) {
    const d = await MMStoreX.open();
    return new Promise((resolve, reject) => {
      const t = d.transaction(stores, mode); let out;
      t.oncomplete = () => { d.close(); resolve(out); }; t.onerror = () => { d.close(); reject(t.error); }; t.onabort = () => { d.close(); reject(t.error || new Error('operação cancelada')); };
      const req = fn(t); if (req) req.onsuccess = () => { out = req.result; };
    });
  },
  get(id) { return MMStoreX.tx(['kv'], 'readonly', (t) => t.objectStore('kv').get(id)); },
  put(rec) { return MMStoreX.tx(['kv'], 'readwrite', (t) => t.objectStore('kv').put(rec)); },
  del(id) { return MMStoreX.tx(['kv'], 'readwrite', (t) => t.objectStore('kv').delete(id)); },
  toast(m) { try { if (typeof toast === 'function') toast(m); else console.warn(m); } catch (_) { console.warn(m); } },

  /** Antes do arranque: lê a base, os estados anteriores e (se mais recente) o ficheiro de dados. */
  async preload() {
    try {
      MMStoreX.cached = (await MMStoreX.get('db')) || null; MMStoreX.mode = 'idb';
      const all = await MMStoreX.tx(['snaps'], 'readonly', (t) => t.objectStore('snaps').getAll()).catch(() => []);
      (all || []).forEach((s) => { if (s && s.id) { MMStoreX.snaps.set(s.id, s.data); MMStoreX.stored.add(s.id); } });
      await MMDisk.init();
      const lsAt = (() => { try { return localStorage.getItem('mm_v24_at') || ''; } catch (_) { return ''; } })();
      const f = await MMDisk.readIfNewer(MMStoreX.cached?.at || lsAt);
      if (f) { MMStoreX.cached = { id: 'db', json: f.json, at: f.at }; MMStoreX.fromFile = true; }
    } catch (e) { console.warn('IndexedDB indisponível — a usar o armazenamento local:', e); MMStoreX.mode = 'local'; }
    try { if (navigator.storage?.persist) MMStoreX.persisted = (await navigator.storage.persisted?.()) || (await navigator.storage.persist()); } catch (_) { /* opcional */ }
  },
  /** Texto JSON da base: o mais recente entre o IndexedDB e o localStorage (instalações anteriores). */
  read() {
    let ls = null, lsAt = '';
    try { ls = localStorage.getItem(MMStoreX.KEY); lsAt = localStorage.getItem('mm_v24_at') || ''; } catch (_) { /* privado */ }
    if (MMStoreX.cached?.json && (!ls || String(MMStoreX.cached.at || '') >= lsAt)) { MMStoreX.loadedFrom = MMStoreX.fromFile ? 'file' : 'idb'; return MMStoreX.cached.json; }
    MMStoreX.loadedFrom = ls ? 'local' : 'new'; return ls;
  },
  /** Depois de ler: devolve os dados dos estados anteriores guardados à parte. */
  attach(db) {
    if (!db || !Array.isArray(db.eventSnapshots)) return;
    db.eventSnapshots = db.eventSnapshots.map((s) => (s && !s.data && MMStoreX.snaps.has(s.id) ? { ...s, data: MMStoreX.snaps.get(s.id) } : s)).filter((s) => s && s.data);
  },
  /** Gravação (chamada por saveDB). No IndexedDB é assíncrona e em série; sem IndexedDB usa o localStorage. */
  save(db) {
    MMStoreX.at = new Date().toISOString();
    if (MMStoreX.mode !== 'idb') { localStorage.setItem(MMStoreX.KEY, JSON.stringify(db)); try { localStorage.setItem('mm_v24_at', MMStoreX.at); } catch (_) { /* cheio */ } return; }
    const snaps = Array.isArray(db.eventSnapshots) ? db.eventSnapshots : [];
    let json; const orig = db.eventSnapshots; // os dados de cada estado anterior vão à parte (store «snaps»)
    try { if (Array.isArray(orig)) db.eventSnapshots = orig.map((s) => (s ? { ...s, data: null } : s)); json = JSON.stringify(db); } finally { db.eventSnapshots = orig; }
    const add = snaps.filter((s) => s && s.id && s.data && !MMStoreX.stored.has(s.id)).map((s) => ({ id: s.id, data: s.data }));
    const keep = new Set(snaps.map((s) => s && s.id)); const drop = [...MMStoreX.stored].filter((id) => !keep.has(id));
    MMStoreX.pending = { json, at: MMStoreX.at, add: [...(MMStoreX.pending?.add || []), ...add], drop: [...(MMStoreX.pending?.drop || []), ...drop] };
    add.forEach((s) => MMStoreX.stored.add(s.id)); drop.forEach((id) => MMStoreX.stored.delete(id));
    MMStoreX.pump(); MMDisk.queue(json);
  },
  async pump() {
    if (MMStoreX.busy) return; MMStoreX.busy = true;
    try {
      while (MMStoreX.pending) {
        const rec = MMStoreX.pending; MMStoreX.pending = null;
        try {
          await MMStoreX.tx(['kv', 'snaps'], 'readwrite', (t) => { t.objectStore('kv').put({ id: 'db', json: rec.json, at: rec.at }); const S = t.objectStore('snaps'); rec.add.forEach((s) => S.put(s)); rec.drop.forEach((id) => S.delete(id)); });
          MMStoreX.lastError = '';
          if (!MMStoreX.lsCleared) { MMStoreX.lsCleared = true; try { localStorage.removeItem(MMStoreX.KEY); localStorage.setItem('mm_v24_where', 'idb'); localStorage.setItem('mm_v24_at', rec.at); } catch (_) { /* privado */ } }
        } catch (e) {
          console.error(e); MMStoreX.lastError = e.message || String(e);
          let ok = false; try { localStorage.setItem(MMStoreX.KEY, rec.json); localStorage.setItem('mm_v24_at', rec.at); ok = true; } catch (_) { /* cheio */ }
          MMStoreX.toast(ok ? `Aviso: a base de dados do navegador falhou (${MMStoreX.lastError}); gravado temporariamente no armazenamento local.` : `Não foi possível guardar (${MMStoreX.lastError}). Exporte já uma cópia de segurança.`);
        }
      }
    } finally { MMStoreX.busy = false; MMStoreX.waiters.splice(0).forEach((f) => f()); }
  },
  /** Resolve quando todas as gravações pendentes terminaram (usado antes de recarregar a página). */
  flush() { return (MMStoreX.busy || MMStoreX.pending) ? new Promise((res) => { MMStoreX.waiters.push(res); if (!MMStoreX.busy) MMStoreX.pump(); }).then(() => MMDisk.flush()) : MMDisk.flush(); },
  size() { const o = DB.eventSnapshots; try { DB.eventSnapshots = []; return JSON.stringify(DB).length; } catch (_) { return 0; } finally { DB.eventSnapshots = o; } },
  snapSize() { try { return JSON.stringify((DB.eventSnapshots || []).map((s) => s.data)).length; } catch (_) { return 0; } },
  where() { return MMStoreX.mode === 'idb' ? 'Base de dados do navegador (IndexedDB)' : 'Armazenamento local (localStorage, cerca de 5 MB)'; }
};
window.MMStoreX = MMStoreX;
window.addEventListener('beforeunload', (e) => { if (MMStoreX.busy || MMStoreX.pending || MMDisk.timer) { e.preventDefault(); e.returnValue = ''; } });

/* ---- Ficheiro de dados no computador (File System Access API — Chrome e Edge no computador) ---- */
const MMDisk = {
  handle: null, perm: 'none', timer: null, last: null, lastAt: '', name: '', writing: null, err: '', loadedNewer: false,
  supported() { return typeof window.showSaveFilePicker === 'function'; },
  async init() {
    if (!MMDisk.supported()) return;
    const rec = await MMStoreX.get('fileHandle').catch(() => null); if (!rec?.handle) return;
    MMDisk.handle = rec.handle; MMDisk.name = rec.handle.name || rec.name || ''; MMDisk.lastAt = rec.at || '';
    try { MMDisk.perm = await rec.handle.queryPermission({ mode: 'readwrite' }); } catch (_) { MMDisk.perm = 'prompt'; }
  },
  on() { return !!MMDisk.handle && MMDisk.perm === 'granted'; },
  valid(o) { return !!(o && typeof o === 'object' && Array.isArray(o.members) && o.settings); },
  async readIfNewer(localAt) {
    if (!MMDisk.on()) return null;
    try {
      const f = await MMDisk.handle.getFile(); if (!f.size) return null;
      const at = new Date(f.lastModified).toISOString(); if (localAt && at <= localAt) return null;
      const json = await f.text(); if (!MMDisk.valid(JSON.parse(json))) return null;
      MMDisk.loadedNewer = true; return { json, at };
    } catch (e) { console.warn('Ficheiro de dados ilegível:', e); MMDisk.err = e.message; return null; }
  },
  queue(json) { if (!MMDisk.on()) return; MMDisk.last = json; clearTimeout(MMDisk.timer); MMDisk.timer = setTimeout(() => { MMDisk.timer = null; MMDisk.writeNow(); }, 1200); },
  async writeNow() {
    if (!MMDisk.on() || MMDisk.last === null) return; const json = MMDisk.last; MMDisk.last = null;
    const run = async () => {
      try { const w = await MMDisk.handle.createWritable(); await w.write(json); await w.close(); MMDisk.lastAt = new Date().toISOString(); MMDisk.err = '';
        await MMStoreX.put({ id: 'fileHandle', handle: MMDisk.handle, name: MMDisk.name, at: MMDisk.lastAt }).catch(() => {}); window.MMStorePanel?.refresh();
      } catch (e) { console.error(e); MMDisk.err = e.message || String(e); if (e.name === 'NotAllowedError') MMDisk.perm = 'prompt'; MMStoreX.toast(`Não foi possível gravar no ficheiro de dados (${MMDisk.err}). Os dados continuam guardados no navegador.`); window.MMStorePanel?.refresh(); }
    };
    MMDisk.writing = (MMDisk.writing || Promise.resolve()).then(run); return MMDisk.writing;
  },
  flush() { if (MMDisk.timer) { clearTimeout(MMDisk.timer); MMDisk.timer = null; return MMDisk.writeNow(); } return MMDisk.writing || Promise.resolve(); }
};
window.MMDisk = MMDisk;

/* ---- Arranque: lê a base e só depois executa os scripts da aplicação, pela ordem original ---- */
(() => {
  // Os scripts podem estar dentro da página (ficheiro único) ou em ficheiros separados (src, versão GitHub Pages):
  // são executados um a um, pela ordem original; os externos esperam pelo carregamento do anterior.
  const run = () => {
    const list = [...document.querySelectorAll('script[type="text/x-mm-app"]')];
    const next = (i) => {
      if (i >= list.length) { done(); return; }
      const old = list[i]; const s = document.createElement('script');
      if (old.getAttribute('src')) {
        s.src = old.getAttribute('src'); s.async = false;
        s.onload = () => next(i + 1);
        s.onerror = () => { console.error(`Não foi possível carregar ${old.getAttribute('src')}`); next(i + 1); };
        old.replaceWith(s);
      } else { s.textContent = old.textContent; old.replaceWith(s); next(i + 1); }
    };
    next(0);
  };
  const done = () => {
    // Instalação vinda do armazenamento local: a primeira gravação passa a base para o IndexedDB
    try { if (MMStoreX.mode === 'idb' && MMStoreX.loadedFrom === 'local' && typeof saveDB === 'function') saveDB(); } catch (e) { console.warn(e); }
    if (MMStoreX.fromFile && MMDisk.loadedNewer) setTimeout(() => MMStoreX.toast(`Dados carregados do ficheiro «${MMDisk.name}» (alterado noutro posto).`), 1200);
  };
  const go = () => MMStoreX.preload().catch((e) => console.warn(e)).finally(run);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
