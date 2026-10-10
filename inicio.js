/* =====================================================================
   Página inicial — código QR para instalar a aplicação da congregação no telemóvel.
   Escrito em ES5 (sem conversão) para correr também em iPhones antigos. O QR só aparece quando a página
   está publicada (https), porque aponta para o endereço real da aplicação.
   ===================================================================== */
(function () {
  'use strict';
  var alvo = document.getElementById('qr-cong'); var caixa = document.getElementById('qr-caixa');
  if (!alvo || !caixa || typeof window.qrcode !== 'function' || !/^https?:$/.test(location.protocol)) return;
  try {
    var url = new URL(alvo.getAttribute('data-alvo'), location.href).href;
    var qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
    var n = qr.getModuleCount(); var m = 4; var d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
    var ns = 'http://www.w3.org/2000/svg'; var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + (n + 2 * m) + ' ' + (n + 2 * m)); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Código QR: ' + url); svg.setAttribute('shape-rendering', 'crispEdges');
    var fundo = document.createElementNS(ns, 'rect'); fundo.setAttribute('width', '100%'); fundo.setAttribute('height', '100%'); fundo.setAttribute('fill', '#fff');
    var caminho = document.createElementNS(ns, 'path'); caminho.setAttribute('d', d); caminho.setAttribute('fill', '#000');
    svg.appendChild(fundo); svg.appendChild(caminho); alvo.appendChild(svg);
    var p = document.createElement('p'); p.className = 'qr-url'; p.textContent = url; alvo.appendChild(p);
    caixa.hidden = false;
  } catch (e) { console.warn('Código QR indisponível:', e); }
})();
