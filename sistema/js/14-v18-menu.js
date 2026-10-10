/* =====================================================================
   V18 — BARRA DE MENU: EXPANDIDA, COMPACTA (só ícones) OU ESCONDIDA (área de trabalho maximizada)
   Preferência guardada neste navegador; atalho Alt+M alterna entre os três estados.
   No telemóvel continua o menu em gaveta (☰) da V14.
   ===================================================================== */
(function () {
  'use strict';
  const KEY = 'monteMoriaMenu_v18'; const STATES = ['normal', 'compacto', 'escondido'];
  let state = 'normal'; try { state = STATES.includes(localStorage.getItem(KEY)) ? localStorage.getItem(KEY) : 'normal'; } catch (_) { /* modo privado */ }
  const apply = () => {
    document.body.classList.toggle('v18-compact', state === 'compacto'); document.body.classList.toggle('v18-hidden', state === 'escondido');
    const b1 = document.getElementById('v18-compact'); const b2 = document.getElementById('v18-hide'); const fl = document.getElementById('v18-show');
    if (b1) { b1.setAttribute('aria-pressed', String(state === 'compacto')); b1.textContent = state === 'compacto' ? '»' : '«'; b1.setAttribute('aria-label', state === 'compacto' ? 'Expandir o menu' : 'Compactar o menu (só ícones)'); b1.title = b1.getAttribute('aria-label'); }
    if (b2) { b2.setAttribute('aria-label', 'Esconder o menu e maximizar a área de trabalho (Alt+M)'); b2.title = b2.getAttribute('aria-label'); }
    if (fl) fl.hidden = state !== 'escondido';
    const side = document.querySelector('.sidebar'); if (side) side.setAttribute('aria-hidden', String(state === 'escondido' && window.matchMedia('(min-width: 901px)').matches));
  };
  const set = (s) => { state = s; try { localStorage.setItem(KEY, s); } catch (_) { /* modo privado */ } apply(); };
  const install = () => {
    const side = document.querySelector('.sidebar'); if (!side || document.getElementById('v18-tools')) return;
    // rótulos para o modo compacto (o texto do botão fica no leitor de ecrã)
    side.querySelectorAll('#nav button[data-tab]').forEach((b) => { if (!b.title) b.title = b.textContent.trim(); });
    const box = document.createElement('div'); box.id = 'v18-tools'; box.className = 'v18-tools'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Barra de menu');
    box.innerHTML = '<button type="button" id="v18-compact" class="v18-btn" aria-pressed="false">«</button><button type="button" id="v18-hide" class="v18-btn">✕</button>';
    side.prepend(box);
    const fl = document.createElement('button'); fl.type = 'button'; fl.id = 'v18-show'; fl.className = 'v18-show'; fl.hidden = true; fl.innerHTML = '<span aria-hidden="true">☰</span> Mostrar menu'; fl.setAttribute('aria-label', 'Mostrar o menu (Alt+M)');
    document.body.appendChild(fl);
    box.addEventListener('click', (e) => { if (e.target.closest('#v18-compact')) set(state === 'compacto' ? 'normal' : 'compacto'); else if (e.target.closest('#v18-hide')) { set('escondido'); fl.focus(); } });
    fl.addEventListener('click', () => { set('normal'); document.querySelector('#nav button.active, #nav button[data-tab]')?.focus(); });
    document.addEventListener('keydown', (e) => { if (e.altKey && !e.ctrlKey && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); set(STATES[(STATES.indexOf(state) + 1) % STATES.length]); } });
    apply();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
