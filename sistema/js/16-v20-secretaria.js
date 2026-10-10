/* =====================================================================
   V20 — SECRETARIA: «Informação» oficial (pena disciplinar, levantamento, exonerações, nomeações,
   casamentos, transferências…) com o aspecto da folha da Secretaria (logótipo, cabeçalho, ➢, assinaturas).
   As categorias têm nível de criticidade e ficam ordenadas por ela; o administrador pode mudar para
   ordem manual e mover, editar, acrescentar, eliminar e reordenar categorias, itens e assinaturas.
   Dados em DB.secretaria — nada do que já existe é alterado.
   ===================================================================== */
const V20 = (() => {
  'use strict';
  const E = MMUI.esc; const C = (s, n = 300) => MMUI.clean(s, n);
  const NIVEIS = [[1, 'Muito alta'], [2, 'Alta'], [3, 'Média'], [4, 'Baixa'], [5, 'Informativa']];
  const nid = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const CATS0 = [['pena', 'PENA DISCIPLINAR', 1, ''], ['levant', 'LEVANTAMENTO DA PENA DISCIPLINAR', 2, ''], ['exon', 'EXONERAÇÕES', 2, 'Por conveniência de serviço, propõe-se a exoneração dos seguintes membros das respectivas funções:'],
    ['nomea', 'NOMEAÇÕES', 3, ''], ['transf', 'TRANSFERÊNCIA', 3, ''], ['casam', 'CASAMENTOS', 4, '']];
  /* Informação Nº 10/REF — Outubro/2026 (folha anexa) */
  const DOC0 = { assunto: 'Informação Nº 1/ REF', destinatario: 'À Secretaria do Ministério Betel Luanda', saudacao: 'Saudações em nome do nosso Senhor Jesus Cristo!',
    fecho: 'Feito na Secretaria do Centro Monte Moriá.', assin: [['O Secretário', ''], ['O Líder Central', '']], itens: {} };
  const D = () => {
    if (!DB.secretaria || typeof DB.secretaria !== 'object') {
      const cats = CATS0.map(([id, nome, crit, intro], i) => ({ id, nome, crit, intro, cor: '', ordem: i, ativa: true }));
      const doc = { id: nid(), criado: new Date().toISOString(), estado: 'Emitido', assunto: DOC0.assunto, destinatario: DOC0.destinatario, saudacao: DOC0.saudacao, fecho: DOC0.fecho,
        assin: DOC0.assin.map(([cargo, nome]) => ({ cargo, nome })), mostrarVazias: true, itens: Object.entries(DOC0.itens).flatMap(([cat, L]) => L.map((texto, i) => ({ id: nid() + i, cat, texto, ordem: i }))) };
      DB.secretaria = { cats, modo: 'crit', docs: [doc], cur: doc.id, cab: { l1: 'ASSEMBLEIA DE DEUS PENTECOSTAL', l2: 'MINISTÉRIO BETEL-LUANDA', l3: 'CENTRO MONTE MORIÁ' } };
    }
    const S = DB.secretaria; S.cats = Array.isArray(S.cats) ? S.cats : []; S.docs = Array.isArray(S.docs) ? S.docs : []; S.cab = S.cab || {};
    if (!S.docs.some((d) => d.id === S.cur)) S.cur = S.docs[0]?.id || null; return S;
  };
  const canEdit = () => MMUI.canEditTab('secretaria'); const admin = () => MMUI.isAdmin();
  /** Ordem das categorias: por criticidade (e depois pela ordem manual) ou só pela ordem manual. */
  const cats = () => { const S = D(); return S.cats.filter((c) => c.ativa !== false).slice().sort((a, b) => (S.modo === 'crit' ? (a.crit - b.crit) : 0) || (a.ordem - b.ordem)); };
  const doc = () => D().docs.find((d) => d.id === D().cur) || null;
  const itensDe = (d, cat) => d.itens.filter((i) => i.cat === cat).sort((a, b) => a.ordem - b.ordem);
  /* ---------- folha (aspecto da Informação da Secretaria) ---------- */
  const folha = (d) => { const S = D(); const cab = { l1: 'ASSEMBLEIA DE DEUS PENTECOSTAL', l2: 'MINISTÉRIO BETEL-LUANDA', l3: 'CENTRO MONTE MORIÁ', ...S.cab };
    return `<article class="v20-folha" aria-label="Pré-visualização: ${E(d.assunto)}">
      <header class="v20-cab"><img src="${E(MMBrand.logo())}" alt="Logótipo da Assembleia de Deus Pentecostal"><p>${E(cab.l1)}</p><p>${E(cab.l2)}</p><p>${E(cab.l3)}</p></header><hr class="v20-linha">
      <p class="v20-assunto"><b>Assunto:</b> <b>${E(d.assunto)}</b></p><p class="v20-dest">${E(d.destinatario)}</p><p>${E(d.saudacao)}</p>
      ${cats().map((c) => { const L = itensDe(d, c.id); if (!L.length && !d.mostrarVazias) return '';
        return `<section class="v20-sec"><h3 class="v20-st" data-cor="${E(MMUI.color(c.cor, ''))}">${E(c.nome)}</h3>${c.intro && L.length ? `<p>${E(c.intro)}</p>` : ''}<ul class="v20-ul">${L.map((i) => `<li>${E(i.texto)}</li>`).join('')}</ul></section>`; }).join('')}
      <p class="v20-fecho">${E(d.fecho)}</p><div class="v20-assin">${(d.assin || []).map((a) => `<div><p>${E(a.cargo)}</p><span></span><p>${E(a.nome)}</p></div>`).join('')}</div></article>`; };
  /* ---------- editor ---------- */
  const html = () => {
    const S = D(); const d = doc(); const ed = canEdit(); const ad = admin(); const lbl = (n) => (NIVEIS.find((x) => x[0] === n) || [0, '—'])[1];
    const acts = document.getElementById('v20-actions');
    if (acts) acts.innerHTML = `<button type="button" class="btn gold sm" data-v20="novo"${ed ? '' : ' disabled'}>+ Nova informação</button><button type="button" class="btn ghost sm" data-v20="dup"${ed && d ? '' : ' disabled'}>Duplicar</button><button type="button" class="btn ghost sm" data-v22="sec-toggle" aria-pressed="${!!D().soFolha}">${D().soFolha ? 'Mostrar campos' : 'Ocultar campos'}</button><button type="button" class="btn ghost sm" data-v20="print"${d ? '' : ' disabled'}>Imprimir…</button><button type="button" class="btn ghost sm" data-v20="word"${d ? '' : ' disabled'}>Word (.doc)</button>${ad ? '<button type="button" class="btn ghost sm" data-v20="cats">Categorias…</button><button type="button" class="btn ghost sm" data-v21="marca">Logótipo e cabeçalho…</button>' : ''}<button type="button" class="btn ghost sm" data-v21="sec-import"${ed ? '' : ' disabled'}>Importar das congregações</button>`;
    if (!d) return `<div class="card empty">Ainda não há documentos. Use «+ Nova informação».</div>`;
    const D_ = !ed ? ' disabled' : '';
    return `<div class="v14-toolbar"><label class="sr-only" for="v20_doc">Documento</label><select id="v20_doc" data-v20doc>${S.docs.slice().reverse().map((x) => `<option value="${E(x.id)}"${x.id === d.id ? ' selected' : ''}>${E(x.assunto)} · ${E(x.estado || 'Rascunho')}</option>`).join('')}</select>
        <span class="sub">Ordem das categorias: <b>${S.modo === 'crit' ? 'por criticidade' : 'manual'}</b>${ad ? ' (mude em «Categorias…»)' : ''}</span></div>
      <div class="v20-grid${D().soFolha ? ' v22-so-folha' : ''}"><div class="v20-ed">
        <form class="card mm-form" data-v20cab novalidate><h3 class="u-v14-h">Cabeçalho do documento</h3><div class="mm-grid">
          <div class="field mm-full"><label for="v20_as">Assunto *</label><input id="v20_as" data-k="assunto" maxlength="120" value="${E(d.assunto)}"${D_}></div>
          <div class="field mm-full"><label for="v20_de">Destinatário</label><input id="v20_de" data-k="destinatario" maxlength="120" value="${E(d.destinatario)}"${D_}></div>
          <div class="field mm-full"><label for="v20_sa">Saudação</label><input id="v20_sa" data-k="saudacao" maxlength="160" value="${E(d.saudacao)}"${D_}></div>
          <div class="field mm-full"><label for="v20_fe">Fecho (local e data)</label><input id="v20_fe" data-k="fecho" maxlength="200" value="${E(d.fecho)}"${D_}></div>
          <div class="field"><label for="v20_es">Estado</label><select id="v20_es" data-k="estado"${D_}>${['Rascunho', 'Emitido'].map((x) => `<option${x === d.estado ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
          <label class="mm-check"><input type="checkbox" data-k="mostrarVazias"${d.mostrarVazias ? ' checked' : ''}${D_}> Mostrar categorias sem itens</label></div></form>
        ${cats().map((c) => { const L = itensDe(d, c.id); return `<section class="card v20-cat" aria-labelledby="v20c_${E(c.id)}"><div class="v20-cat-h"><h3 class="u-v14-h" id="v20c_${E(c.id)}">${E(c.nome)}</h3><span class="v20-crit c${c.crit}">${E(lbl(c.crit))}</span></div>
          <ol class="v20-itens">${L.map((i, n) => `<li><span class="v20-txt">${E(i.texto)}</span>${ed ? `<span class="v20-acts"><button type="button" class="mmc-btn" data-v20="i-up" data-id="${E(i.id)}" aria-label="Subir item"${n ? '' : ' disabled'}>↑</button><button type="button" class="mmc-btn" data-v20="i-down" data-id="${E(i.id)}" aria-label="Descer item"${n < L.length - 1 ? '' : ' disabled'}>↓</button><button type="button" class="mmc-btn" data-v20="i-edit" data-id="${E(i.id)}" aria-label="Editar item">✎</button><button type="button" class="mmc-btn mm-danger" data-v20="i-del" data-id="${E(i.id)}" aria-label="Eliminar item">✕</button></span>` : ''}</li>`).join('') || '<li class="v20-vazio">Sem itens.</li>'}</ol>
          ${ed ? `<button type="button" class="btn ghost sm" data-v20="i-add" data-cat="${E(c.id)}">+ Acrescentar em ${E(c.nome.toLowerCase())}</button>` : ''}</section>`; }).join('')}
        <section class="card"><h3 class="u-v14-h">Assinaturas</h3><ol class="v20-itens">${(d.assin || []).map((a, n, A) => `<li><span class="v20-txt"><b>${E(a.cargo)}</b> — ${E(a.nome)}</span>${ed ? `<span class="v20-acts"><button type="button" class="mmc-btn" data-v20="a-up" data-n="${n}" aria-label="Mover assinatura para a esquerda"${n ? '' : ' disabled'}>↑</button><button type="button" class="mmc-btn" data-v20="a-down" data-n="${n}" aria-label="Mover assinatura para a direita"${n < A.length - 1 ? '' : ' disabled'}>↓</button><button type="button" class="mmc-btn" data-v20="a-edit" data-n="${n}" aria-label="Editar assinatura">✎</button><button type="button" class="mmc-btn mm-danger" data-v20="a-del" data-n="${n}" aria-label="Eliminar assinatura">✕</button></span>` : ''}</li>`).join('')}</ol>${ed ? '<button type="button" class="btn ghost sm" data-v20="a-add">+ Assinatura</button>' : ''}</section>
        ${ad ? '<button type="button" class="btn danger sm" data-v20="del-doc">Eliminar este documento</button>' : ''}</div>
      <div class="card v20-paper">${folha(d)}</div></div>`;
  };
  const render = () => { const box = document.getElementById('v20-sec'); if (!box) return; if (typeof V21 !== 'undefined' && V21.secSub() !== 'info') { V21.renderMais(); return; } try { box.innerHTML = (typeof V21 !== 'undefined' ? V21.secTabs() : '') + html(); box.querySelectorAll('.v20-st[data-cor]').forEach((h) => { if (h.dataset.cor) h.style.setProperty('--v20-cor', h.dataset.cor); }); } catch (e) { console.error('Secretaria:', e); box.innerHTML = `<div class="card empty">Erro: ${E(e.message)}</div>`; } };
  const save = (what) => { MMUI.save(what); render(); };
  /* ---------- formulários ---------- */
  const itemForm = (cat, it) => {
    const names = (DB.members || []).map((m) => m.nome).filter(Boolean).slice(0, 3000);
    const m = MMUI.modal({ title: it ? 'Editar item' : 'Novo item', size: 'wide', body: `<form class="mm-form" novalidate>
        <div class="field"><label for="v20i_c">Categoria</label><select id="v20i_c" name="cat">${cats().map((c) => `<option value="${E(c.id)}"${c.id === (it ? it.cat : cat) ? ' selected' : ''}>${E(c.nome)}</option>`).join('')}</select></div>
        <div class="field"><label for="v20i_m">Membro (opcional — preenche o início do texto)</label><input id="v20i_m" list="v20i_ml" maxlength="120" autocomplete="off"><datalist id="v20i_ml">${names.map((n) => `<option value="${E(n)}">`).join('')}</datalist></div>
        <div class="field"><label for="v20i_t">Texto *</label><textarea id="v20i_t" name="texto" rows="3" maxlength="400" required>${E(it ? it.texto : '')}</textarea></div><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    const F = m.el.querySelector('form');
    F.querySelector('#v20i_m').addEventListener('change', (e) => { const n = C(e.target.value, 120); if (n && !F.texto.value.startsWith(n)) F.texto.value = `${n} – ${F.texto.value}`.replace(/ – $/, ' – '); F.texto.focus(); });
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      const t = C(F.texto.value, 400); if (t.length < 3) { F.querySelector('.mm-err').textContent = 'Escreva o texto do item.'; F.texto.focus(); return; }
      const d = doc(); const c = F.cat.value;
      if (it) { if (it.cat !== c) { it.ordem = itensDe(d, c).length; it.cat = c; } it.texto = t; } else d.itens.push({ id: nid(), cat: c, texto: t, ordem: itensDe(d, c).length });
      m.close(); save(`Secretaria: item ${it ? 'editado' : 'acrescentado'}`);
    });
  };
  const assinForm = (n) => { const d = doc(); const a = n !== undefined ? d.assin[n] : null;
    const m = MMUI.modal({ title: a ? 'Editar assinatura' : 'Nova assinatura', size: 'narrow', body: `<form class="mm-form" novalidate><div class="field"><label for="v20a_c">Cargo *</label><input id="v20a_c" name="cargo" maxlength="60" value="${E(a ? a.cargo : '')}" placeholder="ex.: O Secretário"></div><div class="field"><label for="v20a_n">Nome *</label><input id="v20a_n" name="nome" maxlength="80" value="${E(a ? a.nome : '')}" placeholder="ex.: Ev. António Carlos"></div><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    const F = m.el.querySelector('form'); m.el.querySelector('[data-ok]').addEventListener('click', () => { const cargo = C(F.cargo.value, 60), nome = C(F.nome.value, 80); if (cargo.length < 2 || nome.length < 2) { F.querySelector('.mm-err').textContent = 'Indique o cargo e o nome.'; return; }
      if (a) Object.assign(a, { cargo, nome }); else (d.assin = d.assin || []).push({ cargo, nome }); m.close(); save('Secretaria: assinatura'); }); };
  const catsModal = () => {
    if (!admin()) { MMUI.toast('Gerir categorias exige sessão de administrador.'); return; }
    const S = D(); let L = S.cats.slice().sort((a, b) => (S.modo === 'crit' ? a.crit - b.crit : 0) || a.ordem - b.ordem).map((c) => ({ ...c })); let modo = S.modo;
    const draw = () => `<div class="mm-row"><label class="mm-check"><input type="radio" name="v20modo" value="crit"${modo === 'crit' ? ' checked' : ''}> Ordenar automaticamente por criticidade</label><label class="mm-check"><input type="radio" name="v20modo" value="manual"${modo === 'manual' ? ' checked' : ''}> Ordem manual (↑ ↓)</label></div>
      <ol class="v20-cats">${L.map((c, i) => `<li data-i="${i}"><div class="mm-grid c4"><div class="field"><label for="v20k_n${i}">Nome *</label><input id="v20k_n${i}" data-f="nome" maxlength="60" value="${E(c.nome)}"></div>
        <div class="field"><label for="v20k_c${i}">Criticidade</label><select id="v20k_c${i}" data-f="crit">${NIVEIS.map(([n, l]) => `<option value="${n}"${n === c.crit ? ' selected' : ''}>${n} — ${l}</option>`).join('')}</select></div>
        <div class="field"><label for="v20k_k${i}">Cor do título</label><input id="v20k_k${i}" type="color" data-f="cor" value="${E(MMUI.color(c.cor, '#12213a'))}"></div>
        <div class="field"><label class="mm-check"><input type="checkbox" data-f="ativa"${c.ativa !== false ? ' checked' : ''}> Activa</label></div>
        <div class="field mm-full"><label for="v20k_i${i}">Texto introdutório (opcional)</label><input id="v20k_i${i}" data-f="intro" maxlength="200" value="${E(c.intro || '')}"></div></div>
        <div class="v20-acts"><button type="button" class="mmc-btn" data-mv="-1" aria-label="Subir ${E(c.nome)}"${i ? '' : ' disabled'}>↑</button><button type="button" class="mmc-btn" data-mv="1" aria-label="Descer ${E(c.nome)}"${i < L.length - 1 ? '' : ' disabled'}>↓</button><button type="button" class="mmc-btn mm-danger" data-rm aria-label="Eliminar ${E(c.nome)}">✕</button></div></li>`).join('')}</ol>`;
    const m = MMUI.modal({ title: 'Categorias da Secretaria', size: 'wide', body: `<p class="mm-help">Ex.: Pena disciplinar, Exonerações, Nomeações. Com «por criticidade», 1 (muito alta) aparece primeiro; ao mover com ↑ ↓ a ordem passa a manual.</p><div data-cl>${draw()}</div><button type="button" class="btn ghost sm" data-add>+ Categoria</button><p class="mm-err" role="alert"></p>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    const box = m.el.querySelector('[data-cl]'); const err = m.el.querySelector('.mm-err');
    const read = () => { modo = m.el.querySelector('[name="v20modo"]:checked')?.value || modo; box.querySelectorAll('li[data-i]').forEach((li) => { const c = L[+li.dataset.i]; c.nome = C(li.querySelector('[data-f="nome"]').value, 60).toUpperCase(); c.crit = +li.querySelector('[data-f="crit"]').value; const cv = li.querySelector('[data-f="cor"]').value.toLowerCase(); c.cor = c.cor || cv !== '#12213a' ? MMUI.color(cv, '') : ''; c.ativa = li.querySelector('[data-f="ativa"]').checked; c.intro = C(li.querySelector('[data-f="intro"]').value, 200); }); };
    m.el.addEventListener('click', async (e) => {
      const mv = e.target.closest('[data-mv]'); const rm = e.target.closest('[data-rm]');
      if (mv) { read(); const i = +mv.closest('li').dataset.i, j = i + +mv.dataset.mv; [L[i], L[j]] = [L[j], L[i]]; modo = 'manual'; box.innerHTML = draw(); return; }
      if (rm) { read(); const i = +rm.closest('li').dataset.i; const usados = D().docs.reduce((t, d) => t + d.itens.filter((x) => x.cat === L[i].id).length, 0);
        if (!(await MMUI.confirm(`Eliminar a categoria «${L[i].nome}»?${usados ? ` Tem ${usados} item(ns) em documentos, que deixam de aparecer.` : ''}`, 'Eliminar'))) return; L.splice(i, 1); box.innerHTML = draw(); return; }
      if (e.target.closest('[data-add]')) { read(); L.push({ id: nid(), nome: 'NOVA CATEGORIA', crit: 3, intro: '', cor: '', ativa: true }); box.innerHTML = draw(); box.querySelector('li:last-child [data-f="nome"]')?.select(); return; }
      if (e.target.closest('[data-ok]')) { read(); if (L.some((c) => c.nome.length < 2)) { err.textContent = 'Todas as categorias precisam de nome.'; return; } if (L.some((c) => /[<>]/.test(c.nome + c.intro))) { err.textContent = 'Os textos não podem conter < ou >.'; return; }
        D().cats = L.map((c, i) => ({ ...c, ordem: i })); D().modo = modo; m.close(); save('Secretaria: categorias alteradas'); MMUI.toast('Categorias guardadas.'); }
    });
    box.addEventListener('change', (e) => { if (e.target.name === 'v20modo') { read(); box.innerHTML = draw(); } });
  };
  const novoDoc = (base) => { const S = D(); const now = new Date(); const mes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][now.getMonth()];
    const n = S.docs.length + 10; const d = base ? { ...JSON.parse(JSON.stringify(base)), id: nid(), estado: 'Rascunho', criado: now.toISOString(), assunto: `${base.assunto} (cópia)`, itens: base.itens.map((i) => ({ ...i, id: nid() })) }
      : { id: nid(), criado: now.toISOString(), estado: 'Rascunho', assunto: `Informação Nº ${n}/ REF, ${mes} /${now.getFullYear()}`, destinatario: doc()?.destinatario || DOC0.destinatario, saudacao: DOC0.saudacao, fecho: `Feito na Secretaria do Centro Monte Moriá aos ${String(now.getDate()).padStart(2, '0')} de ${mes} de ${now.getFullYear()}.`, assin: JSON.parse(JSON.stringify(doc()?.assin || [])), mostrarVazias: true, itens: [] };
    S.docs.push(d); S.cur = d.id; save('Secretaria: novo documento'); };
  const print = () => { let st = document.getElementById('v20-page'); if (!st) { st = document.createElement('style'); st.id = 'v20-page'; document.head.appendChild(st); } st.textContent = '@page { size: A4 portrait; margin: 15mm; }';
    document.body.classList.add('v20-printing'); const done = () => { document.body.classList.remove('v20-printing'); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); window.print(); setTimeout(done, 1500); };
  const word = () => { const d = doc(); if (!d) return; const body = folha(d).replace(/<img[^>]*>/, ''); const htmlDoc = `<html><head><meta charset="utf-8"><title>${E(d.assunto)}</title><style>body{font-family:"Times New Roman",serif;font-size:12pt}.v20-cab{text-align:center;font-weight:bold}.v20-cab p{margin:0}.v20-st{text-decoration:underline;font-size:12pt;text-transform:uppercase}.v20-dest{margin-left:65%}.v20-fecho{text-align:center}.v20-assin{display:flex;justify-content:space-between}</style></head><body>${body}</body></html>`;
    MMUI.download(`${d.assunto.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 60)}.doc`, new Blob(['\ufeff', htmlDoc], { type: 'application/msword' })); };
  /* ---------- eventos ---------- */
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-v20]'); if (!b || b.disabled) return; const a = b.dataset.v20; const d = doc();
    const editOnly = ['novo', 'dup', 'i-add', 'i-edit', 'i-del', 'i-up', 'i-down', 'a-add', 'a-edit', 'a-del', 'a-up', 'a-down']; if (editOnly.includes(a) && !canEdit()) { MMUI.toast('Não tem permissão de edição na Secretaria.'); return; }
    const it = d && b.dataset.id ? d.itens.find((x) => x.id === b.dataset.id) : null;
    if (a === 'novo') novoDoc(null); else if (a === 'dup' && d) novoDoc(d); else if (a === 'print') { if (typeof V22 !== 'undefined') V22.printSec(); else print(); } else if (a === 'word') word(); else if (a === 'cats') catsModal();
    else if (a === 'i-add') itemForm(b.dataset.cat, null); else if (a === 'i-edit' && it) itemForm(it.cat, it);
    else if (a === 'i-del' && it) { if (await MMUI.confirm(`Eliminar «${it.texto.slice(0, 80)}»?`, 'Eliminar')) { d.itens.splice(d.itens.indexOf(it), 1); save('Secretaria: item eliminado'); } }
    else if ((a === 'i-up' || a === 'i-down') && it) { const L = itensDe(d, it.cat); const i = L.indexOf(it), j = i + (a === 'i-up' ? -1 : 1); if (j < 0 || j >= L.length) return; L.forEach((x, n) => { x.ordem = n; }); [L[i].ordem, L[j].ordem] = [L[j].ordem, L[i].ordem]; save(); }
    else if (a === 'a-add') assinForm(); else if (a === 'a-edit') assinForm(+b.dataset.n);
    else if (a === 'a-del') { if (await MMUI.confirm('Eliminar esta assinatura?', 'Eliminar')) { d.assin.splice(+b.dataset.n, 1); save(); } }
    else if (a === 'a-up' || a === 'a-down') { const i = +b.dataset.n, j = i + (a === 'a-up' ? -1 : 1); if (j < 0 || j >= d.assin.length) return; [d.assin[i], d.assin[j]] = [d.assin[j], d.assin[i]]; save(); }
    else if (a === 'del-doc' && d) { const go = async () => { if (!(await MMUI.confirm(`Eliminar «${d.assunto}»? Vai para a Lixeira.`, 'Eliminar'))) return; if (typeof moveToTrash === 'function') moveToTrash('secretaria', d, d.assunto); D().docs.splice(D().docs.indexOf(d), 1); D().cur = D().docs[D().docs.length - 1]?.id || null; save('Secretaria: documento eliminado'); };
      if (typeof requirePassword === 'function') requirePassword('admin', 'Introduza a palavra-passe para eliminar este documento.', go); else go(); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches?.('[data-v20doc]')) { D().cur = e.target.value; save(); document.getElementById('v20_doc')?.focus(); return; }
    const k = e.target.closest?.('[data-v20cab] [data-k]'); if (!k || !canEdit()) return; const d = doc(); if (!d) return; const key = k.dataset.k;
    if (key === 'mostrarVazias') d[key] = k.checked; else { const v = C(k.value, key === 'fecho' ? 200 : 160); if (key === 'assunto' && v.length < 3) { MMUI.toast('O assunto não pode ficar vazio.'); k.value = d.assunto; return; } d[key] = v; }
    const id = k.id; save(); document.getElementById(id)?.focus();
  });
  /* ---------- registo da aba ---------- */
  (() => {
    try { if (typeof ALL_TABS !== 'undefined' && !ALL_TABS.some((t) => t.key === 'secretaria')) { const i = ALL_TABS.findIndex((t) => t.key === 'organigrama'); ALL_TABS.splice(i >= 0 ? i + 1 : ALL_TABS.length, 0, { key: 'secretaria', label: 'Secretaria', builtin: true }); }
      const o = DB.settings && DB.settings.branding && DB.settings.branding.tabOrder; if (Array.isArray(o) && o.length && !o.includes('secretaria')) { const j = o.indexOf('organigrama'); o.splice(j >= 0 ? j + 1 : o.length, 0, 'secretaria'); }
      if (typeof applyTabOrder === 'function') applyTabOrder(); if (typeof TRASH_TARGET !== 'undefined') { TRASH_TARGET.secretaria = () => D().docs; if (typeof TRASH_LABELS !== 'undefined') TRASH_LABELS.secretaria = 'Secretaria (documento)'; }
    } catch (err) { console.warn('Secretaria (aba):', err); }
    document.getElementById('nav')?.addEventListener('click', (e) => { if (e.target.closest('button[data-tab="secretaria"]')) setTimeout(() => { if (document.getElementById('sec-secretaria')?.classList.contains('active')) render(); }, 0); });
  })();
  return { render, D, cats, folha };
})();
