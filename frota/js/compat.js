(function() {
  "use strict";
  var raiz = document.documentElement;
  var juntarClasse = function(c) {
    raiz.className += (raiz.className ? " " : "") + c;
  };
  juntarClasse("js");
  var ua = navigator.userAgent || "";
  var ios = /iP(hone|od|ad)/.test(ua) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (ios) juntarClasse("ios");
  var instalada = window.navigator.standalone === true || !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  if (instalada) juntarClasse("instalada");
  var versaoIOS = (function() {
    var m = /OS (\d+)[_.](\d+)/.exec(ua);
    return ios && m ? m[1] + "." + m[2] : "";
  })();
  window.addEventListener("beforeinstallprompt", function(e) {
    e.preventDefault();
    window.__pedidoInstalar = e;
    if (window.Instalar && typeof window.Instalar.aoPedido === "function") window.Instalar.aoPedido(e);
  });
  if (typeof window.globalThis === "undefined") window.globalThis = window;
  if (!Object.fromEntries) {
    Object.fromEntries = function(pares) {
      var o = {};
      Array.from(pares).forEach(function(p) {
        o[p[0]] = p[1];
      });
      return o;
    };
  }
  var lerBlob = function(blob, comoTexto) {
    return new Promise(function(ok, falha) {
      var r = new FileReader();
      r.onload = function() {
        ok(r.result);
      };
      r.onerror = function() {
        falha(r.error || new Error("não foi possível ler o ficheiro"));
      };
      if (comoTexto) r.readAsText(blob);
      else r.readAsArrayBuffer(blob);
    });
  };
  if (window.Blob && !Blob.prototype.text) Blob.prototype.text = function() {
    return lerBlob(this, true);
  };
  if (window.Blob && !Blob.prototype.arrayBuffer) Blob.prototype.arrayBuffer = function() {
    return lerBlob(this, false);
  };
  if (typeof window.ResizeObserver !== "function") {
    var vigiados = [];
    var verificar = function() {
      vigiados.slice().forEach(function(o) {
        var w = o.el.clientWidth;
        var h = o.el.clientHeight;
        if (w === o.w && h === o.h) return;
        o.w = w;
        o.h = h;
        try {
          o.ro.cb([{ target: o.el, contentRect: { width: w, height: h, top: 0, left: 0, right: w, bottom: h } }], o.ro);
        } catch (e) {
          setTimeout(function() {
            throw e;
          }, 0);
        }
      });
    };
    var RO = function(cb) {
      this.cb = cb;
    };
    RO.prototype.observe = function(el) {
      vigiados.push({ ro: this, el, w: -1, h: -1 });
      setTimeout(verificar, 0);
    };
    RO.prototype.unobserve = function(el) {
      var me = this;
      vigiados = vigiados.filter(function(o) {
        return !(o.ro === me && o.el === el);
      });
    };
    RO.prototype.disconnect = function() {
      var me = this;
      vigiados = vigiados.filter(function(o) {
        return o.ro !== me;
      });
    };
    window.ResizeObserver = RO;
    window.addEventListener("resize", verificar);
    window.addEventListener("orientationchange", function() {
      setTimeout(verificar, 300);
    });
    setInterval(verificar, 500);
  }
  var temDialog = typeof window.HTMLDialogElement === "function" && typeof window.HTMLDialogElement.prototype.showModal === "function";
  if (!temDialog) {
    juntarClasse("sem-dialog");
    var proto = (window.HTMLUnknownElement || window.HTMLElement).prototype;
    var abertas = [];
    var disparar = function(el, nome, cancelavel) {
      var ev = document.createEvent("Event");
      ev.initEvent(nome, false, !!cancelavel);
      return el.dispatchEvent(ev);
    };
    var tirarFundo = function(d) {
      if (d.__fundo && d.__fundo.parentNode) d.__fundo.parentNode.removeChild(d.__fundo);
      d.__fundo = null;
      var i = abertas.indexOf(d);
      if (i >= 0) abertas.splice(i, 1);
    };
    Object.defineProperty(proto, "open", { configurable: true, get: function() {
      return this.hasAttribute("open");
    }, set: function(v) {
      if (v) this.setAttribute("open", "");
      else this.removeAttribute("open");
    } });
    Object.defineProperty(proto, "returnValue", { configurable: true, get: function() {
      return this.__rv == null ? "" : this.__rv;
    }, set: function(v) {
      this.__rv = String(v);
    } });
    proto.show = function() {
      if (this.nodeName === "DIALOG") this.setAttribute("open", "");
    };
    proto.showModal = function() {
      if (this.nodeName !== "DIALOG" || this.hasAttribute("open") || !this.parentNode) return;
      this.__foco = document.activeElement;
      var fundo = document.createElement("div");
      fundo.className = "dialog-fundo";
      var z = 1e3 + abertas.length * 2;
      fundo.style.zIndex = String(z);
      this.style.zIndex = String(z + 1);
      this.parentNode.insertBefore(fundo, this);
      this.__fundo = fundo;
      abertas.push(this);
      this.setAttribute("open", "");
      this.setAttribute("aria-modal", "true");
      if (!this.getAttribute("role")) this.setAttribute("role", "dialog");
      var alvo = this.querySelector("[autofocus]") || this.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
      try {
        (alvo || this).focus();
      } catch (e) {
      }
    };
    proto.close = function(valor) {
      if (this.nodeName !== "DIALOG" || !this.hasAttribute("open")) return;
      if (valor !== void 0) this.returnValue = valor;
      this.removeAttribute("open");
      tirarFundo(this);
      var foco = this.__foco;
      this.__foco = null;
      if (foco && foco.focus && document.body.contains(foco)) {
        try {
          foco.focus();
        } catch (e) {
        }
      }
      var d = this;
      setTimeout(function() {
        disparar(d, "close", false);
      }, 0);
    };
    var ultimoBotao = null;
    document.addEventListener("click", function(e) {
      var t = e.target;
      ultimoBotao = t && t.closest ? t.closest('button, input[type="submit"]') : null;
    }, true);
    document.addEventListener("submit", function(e) {
      var f = e.target;
      if (!f || f.nodeName !== "FORM" || String(f.getAttribute("method") || "").toLowerCase() !== "dialog") return;
      e.preventDefault();
      var d = f.closest ? f.closest("dialog") : null;
      if (!d) return;
      var b = ultimoBotao && f.contains(ultimoBotao) ? ultimoBotao : null;
      ultimoBotao = null;
      d.close(b && b.hasAttribute("value") ? b.value : void 0);
    }, true);
    document.addEventListener("keydown", function(e) {
      if ((e.key === "Escape" || e.key === "Esc" || e.keyCode === 27) && abertas.length) {
        var d = abertas[abertas.length - 1];
        if (disparar(d, "cancel", true)) d.close();
      }
    }, true);
    if (window.MutationObserver) {
      new MutationObserver(function() {
        abertas.slice().forEach(function(d) {
          if (!document.body.contains(d)) tirarFundo(d);
        });
      }).observe(raiz, { childList: true, subtree: true });
    }
  }
  document.addEventListener("DOMContentLoaded", function() {
    var f = document.createElement("div");
    f.style.display = "flex";
    f.style.flexDirection = "column";
    f.style.rowGap = "1px";
    f.style.position = "absolute";
    f.appendChild(document.createElement("div"));
    f.appendChild(document.createElement("div"));
    document.body.appendChild(f);
    var temGap = f.scrollHeight === 1;
    f.parentNode.removeChild(f);
    if (!temGap) juntarClasse("sem-flex-gap");
  });
  var erros = [];
  var registar = function(t) {
    if (erros.length < 8) erros.push(String(t).slice(0, 300));
  };
  window.addEventListener("error", function(e) {
    var alvo = e.target;
    if (alvo && alvo !== window && alvo.nodeName === "SCRIPT") {
      registar("Não foi possível carregar " + (alvo.getAttribute("src") || "um programa"));
      return;
    }
    if (e.message) registar(e.message + (e.filename ? " (" + String(e.filename).split("/").pop().slice(0, 60) + ":" + (e.lineno || "?") + ")" : ""));
  }, true);
  window.addEventListener("unhandledrejection", function(e) {
    var r = e.reason;
    registar("Erro: " + (r && r.message ? r.message : String(r)));
  });
  var podeGuardar = function() {
    try {
      var k = "__teste_guardar__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  };
  var quadro = function(classe, titulo, linhas, lista, recarregar) {
    var q = document.createElement("section");
    q.className = "diag " + classe;
    q.setAttribute("role", "alert");
    var h = document.createElement("h2");
    h.textContent = titulo;
    q.appendChild(h);
    linhas.forEach(function(t) {
      var p = document.createElement("p");
      p.textContent = t;
      q.appendChild(p);
    });
    if (lista && lista.length) {
      var ul = document.createElement("ul");
      lista.forEach(function(t) {
        var li = document.createElement("li");
        li.textContent = t;
        ul.appendChild(li);
      });
      q.appendChild(ul);
    }
    var acoes = document.createElement("div");
    acoes.className = "diag-acoes";
    var botao = function(txt, fn) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = txt;
      b.addEventListener("click", fn);
      acoes.appendChild(b);
      return b;
    };
    if (recarregar) botao("Recarregar", function() {
      window.location.reload();
    });
    botao("Fechar", function() {
      if (q.parentNode) q.parentNode.removeChild(q);
    });
    q.appendChild(acoes);
    document.body.appendChild(q);
    return q;
  };
  var navegador = function() {
    return (versaoIOS ? "iPhone/iPad com iOS " + versaoIOS : "Navegador") + (instalada ? " · aberta pelo ícone" : "") + " · " + ua.slice(0, 160);
  };
  var faltas = function() {
    var f = [];
    if (!window.Promise || !window.fetch) f.push("navegador muito antigo (sem Promise/fetch)");
    if (!(window.crypto && window.crypto.subtle)) f.push("sem crypto.subtle (a entrada usa o método alternativo)");
    if (!("serviceWorker" in navigator)) f.push("sem modo offline instalado (serviceWorker)");
    if (!temDialog) f.push("janelas <dialog> substituídas pela versão compatível");
    if (!podeGuardar()) f.push("não deixa guardar dados (localStorage bloqueado)");
    return f;
  };
  window.addEventListener("load", function() {
    setTimeout(function() {
      if (window.APP_OK) return;
      quadro(
        "diag-falha",
        "A aplicação não arrancou correctamente",
        ["Tire uma captura de ecrã a este quadro e envie-a ao administrador. Depois toque em «Recarregar».", navegador()],
        erros.concat(faltas()),
        true
      );
    }, 2500);
  });
  document.addEventListener("DOMContentLoaded", function() {
    if (podeGuardar()) return;
    quadro(
      "diag-aviso",
      "Este navegador não deixa guardar dados",
      [
        "Está em navegação privada ou com «Bloquear todos os cookies» ligado: o que escrever perde-se ao fechar.",
        ios ? "No iPhone: Definições › Safari (no iOS 18 ou mais recente: Definições › Apps › Safari) › desligue «Bloquear todos os cookies» e use um separador normal, não privado." : "Saia da navegação privada e permita que este site guarde dados."
      ],
      null,
      false
    );
  });
  window.Compat = { ios, versaoIOS, instalada, erros, navegador, faltas, podeGuardar };
})();
