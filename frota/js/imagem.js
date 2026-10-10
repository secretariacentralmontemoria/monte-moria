(() => {
  "use strict";
  const LIMITE = 16e6;
  const transparente = (c) => !c || c === "transparent" || /^rgba\((?:[^,]+,){3}\s*0(?:\.0+)?\)$/.test(c);
  const caminho = (ctx, x, y, w, h, r) => {
    const k = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + k, y);
    ctx.arcTo(x + w, y, x + w, y + h, k);
    ctx.arcTo(x + w, y + h, x, y + h, k);
    ctx.arcTo(x, y + h, x, y, k);
    ctx.arcTo(x, y, x + w, y, k);
    ctx.closePath();
  };
  const esperarImagens = (raiz) => Promise.all([...raiz.querySelectorAll("img")].map((im) => im.complete ? null : new Promise((ok) => {
    im.addEventListener("load", ok, { once: true });
    im.addEventListener("error", ok, { once: true });
    setTimeout(ok, 4e3);
  })));
  const desenhar = async (raiz, escala = 2) => {
    await esperarImagens(raiz);
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (_) {
      }
    }
    const R = raiz.getBoundingClientRect();
    const W = Math.ceil(Math.max(R.width, raiz.scrollWidth + (raiz.scrollWidth > raiz.clientWidth ? parseFloat(getComputedStyle(raiz).paddingRight) || 0 : 0)));
    const H = Math.ceil(Math.max(R.height, raiz.scrollHeight));
    if (!W || !H) throw new Error("folha vazia");
    const k = Math.min(escala, Math.sqrt(LIMITE / (W * H)));
    if (k < 0.5) throw new Error("folha demasiado longa para uma só imagem");
    const c = document.createElement("canvas");
    c.width = Math.floor(W * k);
    c.height = Math.floor(H * k);
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("o navegador não deixou desenhar");
    ctx.scale(k, k);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    const rg = document.createRange();
    const caixa = (el, cs) => {
      const r = el.getBoundingClientRect();
      if (r.width < 0.5 || r.height < 0.5) return;
      const x = r.left - R.left;
      const y = r.top - R.top;
      const w = r.width;
      const h = r.height;
      const bt = parseFloat(cs.borderTopWidth) || 0;
      const bd = parseFloat(cs.borderRightWidth) || 0;
      const bb = parseFloat(cs.borderBottomWidth) || 0;
      const be = parseFloat(cs.borderLeftWidth) || 0;
      const imagem = el.nodeName === "IMG" && el.complete && el.naturalWidth || el.nodeName === "CANVAS";
      if (transparente(cs.backgroundColor) && !(bt || bd || bb || be) && !imagem) return;
      ctx.save();
      const raio = parseFloat(cs.borderTopLeftRadius) || 0;
      if (raio > 0) {
        caminho(ctx, x, y, w, h, raio);
        ctx.clip();
      }
      if (!transparente(cs.backgroundColor)) {
        ctx.fillStyle = cs.backgroundColor;
        ctx.fillRect(x, y, w, h);
      }
      const lado = (larg, cor, estilo, rx, ry, rw, rh) => {
        if (larg > 0 && estilo !== "none" && estilo !== "hidden" && !transparente(cor)) {
          ctx.fillStyle = cor;
          ctx.fillRect(rx, ry, rw, rh);
        }
      };
      lado(bt, cs.borderTopColor, cs.borderTopStyle, x, y, w, bt);
      lado(bb, cs.borderBottomColor, cs.borderBottomStyle, x, y + h - bb, w, bb);
      lado(be, cs.borderLeftColor, cs.borderLeftStyle, x, y, be, h);
      lado(bd, cs.borderRightColor, cs.borderRightStyle, x + w - bd, y, bd, h);
      if (imagem) {
        try {
          ctx.drawImage(el, x + be, y + bt, Math.max(1, w - be - bd), Math.max(1, h - bt - bb));
        } catch (_) {
        }
      }
      ctx.restore();
    };
    const texto = (no, cs) => {
      const fs = parseFloat(cs.fontSize) || 14;
      ctx.font = "".concat(cs.fontStyle, " ").concat(cs.fontWeight, " ").concat(fs, "px ").concat(cs.fontFamily);
      ctx.fillStyle = cs.color;
      ctx.textBaseline = "alphabetic";
      const mt = ctx.measureText("Hg");
      const asc = mt.fontBoundingBoxAscent || fs * 0.8;
      const desc = mt.fontBoundingBoxDescent || fs * 0.22;
      const muda = (t) => cs.textTransform === "uppercase" ? t.toUpperCase() : cs.textTransform === "lowercase" ? t.toLowerCase() : t;
      const escrever = (t, r) => {
        const x = r.left - R.left;
        const y = r.top - R.top + (r.height - (asc + desc)) / 2 + asc;
        const tx = muda(t);
        const tw = ctx.measureText(tx).width;
        const f = tw > 0 ? r.width / tw : 1;
        if (f > 0.8 && f < 1.25 && Math.abs(f - 1) > 0.01) {
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(f, 1);
          ctx.fillText(tx, 0, 0);
          ctx.restore();
        } else ctx.fillText(tx, x, y, r.width > 0 ? Math.max(r.width, tw * 0.8) : void 0);
      };
      const s = no.nodeValue;
      const re = /\S+/g;
      let m;
      while (m = re.exec(s)) {
        rg.setStart(no, m.index);
        rg.setEnd(no, m.index + m[0].length);
        const rs = rg.getClientRects();
        if (!rs.length) continue;
        if (rs.length === 1) {
          escrever(m[0], rs[0]);
          continue;
        }
        let i = m.index;
        for (const ch of m[0]) {
          rg.setStart(no, i);
          rg.setEnd(no, i + ch.length);
          const rc = rg.getClientRects()[0];
          if (rc) escrever(ch, rc);
          i += ch.length;
        }
      }
    };
    const marcador = (el, cs) => {
      const pai = el.parentElement;
      if (!pai || cs.listStyleType === "none") return;
      const r = el.getBoundingClientRect();
      const fs = parseFloat(cs.fontSize) || 14;
      const txt = pai.nodeName === "OL" ? "".concat([...pai.children].indexOf(el) + 1, ".") : "•";
      ctx.font = "".concat(cs.fontWeight, " ").concat(fs, "px ").concat(cs.fontFamily);
      ctx.fillStyle = cs.color;
      ctx.textBaseline = "middle";
      const lh = parseFloat(cs.lineHeight) || fs * 1.4;
      ctx.fillText(txt, r.left - R.left - ctx.measureText(txt).width - fs * 0.45, r.top - R.top + (parseFloat(cs.paddingTop) || 0) + lh / 2);
    };
    const percorrer = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || el.classList.contains("sr-only")) return;
      caixa(el, cs);
      if (cs.display === "list-item") marcador(el, cs);
      el.childNodes.forEach((f) => {
        if (f.nodeType === 1) percorrer(f);
        else if (f.nodeType === 3 && /\S/.test(f.nodeValue)) texto(f, cs);
      });
    };
    percorrer(raiz);
    return c;
  };
  window.Pintor = { desenhar };
})();
