/* Instalação (Chrome / Edge: ícone «Instalar» na barra de endereço) e funcionamento sem internet. */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('Modo sem internet indisponível:', e); });
  });
})();
