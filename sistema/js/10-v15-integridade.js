/* =====================================================================
   V15 — INTEGRIDADE DOS DADOS NOS FORMULÁRIOS DE EDIÇÃO
   Erro encontrado na varredura: abrir «Editar» e guardar SEM alterar nada apagava
   informação — província/município/situação que não constam das listas, datas guardadas
   como texto («S/D», «Infância», «2006»), campos importados que o formulário não mostra
   (nos Convertidos o registo inteiro era substituído) e números passavam a texto.
   Correcção (para membros, convertidos, disciplina, visitantes, cultos e inventário):
     · ao abrir: o valor guardado aparece sempre na lista (acrescentado se faltar) e as
       datas em texto são indicadas por baixo do campo;
     · ao guardar: tudo o que o utilizador não alterou mantém o valor original.
   ===================================================================== */
(function () {
  'use strict';
  /* Estado de edição da aplicação (variáveis globais «let» partilhadas entre scripts clássicos) */
  const idx = (v) => (v !== null && v !== undefined ? { idx: v } : null);
  const CFG = {
    'modal-member': { body: 'modal-member-body', save: 'btn-save-member', coll: () => DB.members, pos: () => (typeof editingMemberId !== 'undefined' && editingMemberId ? { id: editingMemberId } : null), render: ['renderDatabase'] },
    'modal-convertido': { body: 'modal-convertido-body', save: 'btn-save-convertido', coll: () => DB.convertidos, pos: () => idx(typeof editingConvertidoIdx !== 'undefined' ? editingConvertidoIdx : null), render: ['renderRegistos'] },
    'modal-disciplina': { body: 'modal-disciplina-body', save: 'btn-save-disciplina', coll: () => DB.disciplina, pos: () => idx(typeof editingDisciplinaIdx !== 'undefined' ? editingDisciplinaIdx : null), render: ['renderRegistos'] },
    'modal-visitante': { body: 'modal-visitante-body', save: 'btn-save-visitante', coll: () => DB.visitantes, pos: () => idx(typeof editingVisitanteIdx !== 'undefined' ? editingVisitanteIdx : null), render: ['renderRegistos'] },
    'modal-culto': { body: 'modal-culto-body', save: 'btn-save-culto', coll: () => DB.cultos, pos: () => idx(typeof editingCultoIdx !== 'undefined' ? editingCultoIdx : null), render: ['renderCultos'] },
    'modal-inv': { body: 'modal-inv-body', save: 'btn-save-inv', coll: () => DB.inventario, pos: () => idx(typeof editingInvIdx !== 'undefined' ? editingInvIdx : null), render: ['renderInventario'] }
  };
  const ISO = /^\d{4}-\d{2}-\d{2}/;
  const empty = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
  const state = {}; // por modal: { orig, pos, init: Map, atSave: Map }

  const fieldValues = (body) => { const m = new Map(); body.querySelectorAll('[data-f]').forEach((el) => { m.set(el.dataset.f, el.type === 'checkbox' ? String(el.checked) : String(el.value ?? '')); }); return m; };

  /** Ao abrir: mostra o valor guardado mesmo quando não consta da lista e assinala datas em texto. */
  const onOpen = (modalId) => {
    const c = CFG[modalId]; const body = document.getElementById(c.body); if (!body) return;
    const pos = c.pos(); const list = c.coll() || [];
    const rec = !pos ? null : pos.id ? list.find((r) => r && r.id === pos.id) : list[pos.idx];
    state[modalId] = { pos, orig: rec ? JSON.parse(JSON.stringify(rec)) : null };
    if (rec) {
      body.querySelectorAll('select[data-f]').forEach((sel) => {
        const v = rec[sel.dataset.f]; if (empty(v) || typeof v === 'object') return; const sv = String(v);
        if (sel.value === sv) return;
        if (![...sel.options].some((o) => o.value === sv)) { const o = document.createElement('option'); o.value = sv; o.textContent = `${sv} (valor registado)`; const outro = [...sel.options].find((x) => x.value === '__outro__'); sel.insertBefore(o, outro || null); }
        if (sel.value === '' || sel.value === '__outro__') { sel.value = sv; const ci = body.querySelector(`[data-f-custom="${CSS.escape(sel.dataset.f)}"]`); if (ci) { ci.classList.add('is-hidden'); ci.value = ''; } }
      });
      body.querySelectorAll('input[type="date"][data-f]').forEach((inp) => {
        const k = inp.dataset.f; const v = rec[k]; const txt = rec[`${k}Texto`];
        const shown = !empty(v) && !ISO.test(String(v)) ? String(v) : (!empty(txt) && !inp.value ? String(txt) : '');
        if (shown && !inp.parentElement.querySelector('.v15-keep')) { const h = document.createElement('small'); h.className = 'v15-keep'; h.textContent = `Valor registado: «${shown}» — mantém-se se não escolher outra data.`; inp.insertAdjacentElement('afterend', h); }
      });
    }
    state[modalId].init = fieldValues(body);
  };

  /** Depois de a aplicação guardar: repõe o que não foi alterado. */
  const afterSave = (modalId) => {
    const st = state[modalId]; const c = CFG[modalId]; if (!st || !st.orig) return;
    const list = c.coll() || []; const o = st.orig;
    const cur = o.id ? list.find((r) => r && r.id === o.id) : list[st.pos.idx];
    if (!cur || cur === o) return;
    let changed = 0;
    Object.entries(o).forEach(([k, v]) => {
      if (empty(v)) return;
      const touched = st.init && st.atSave && st.init.has(k) && st.init.get(k) !== st.atSave.get(k);
      if (!(k in cur) || cur[k] === undefined) { cur[k] = v; changed++; return; } // campo que o formulário não mostra
      if (empty(cur[k]) && !touched) { cur[k] = v; changed++; return; } // lista/data em texto que o formulário não conseguia mostrar
      if (typeof v === 'number' && typeof cur[k] === 'string' && cur[k].trim() === String(v)) { cur[k] = v; changed++; }
    });
    if (changed) {
      try { if (typeof refreshComputed === 'function' && (modalId === 'modal-member' || modalId === 'modal-convertido')) refreshComputed(cur); } catch (_) { /* campos calculados */ }
      if (typeof saveDB === 'function') saveDB();
      c.render.forEach((f) => { try { if (typeof window[f] === 'function') window[f](); } catch (_) { /* aba fechada */ } });
    }
    st.orig = JSON.parse(JSON.stringify(cur)); st.init = st.atSave; // novas gravações na mesma janela partem do estado actual
  };

  const install = () => {
    Object.entries(CFG).forEach(([id, c]) => {
      const modal = document.getElementById(id); const btn = document.getElementById(c.save); if (!modal || !btn) return;
      new MutationObserver(() => { const open = modal.classList.contains('open'); if (open && !modal.dataset.v15open) { modal.dataset.v15open = '1'; onOpen(id); } else if (!open) delete modal.dataset.v15open; })
        .observe(modal, { attributes: true, attributeFilter: ['class'] });
      btn.addEventListener('click', () => { const b = document.getElementById(c.body); if (state[id] && b) state[id].atSave = fieldValues(b); }, true);
      btn.addEventListener('click', () => { try { afterSave(id); } catch (e) { console.warn('Integridade V15:', e); } });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
  window.MMIntegridade = { state, CFG };
})();
