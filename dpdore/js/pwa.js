/* Instalação como aplicação (Chrome / Edge / Android: «Instalar»; iPhone: Partilhar › Adicionar ao ecrã principal) e funcionamento sem internet. */
(() => {
  'use strict';
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Modo sem internet indisponível:', e)); });
})();
