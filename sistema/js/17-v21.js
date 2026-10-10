/* =====================================================================
   V21 — LOGÓTIPO E CABEÇALHO EDITÁVEIS · FINANÇAS DAS CONGREGAÇÕES NO SISTEMA PRINCIPAL ·
         SECRETARIA: «MAIS REGISTOS» (módulos escaláveis) E IMPORTAÇÃO DOS DOCUMENTOS DAS CONGREGAÇÕES
   ===================================================================== */
const MMBrand = {
  logo() { const m = (typeof DB !== 'undefined' && DB && DB.settings && DB.settings.marcaV21) || {}; if (m.logo && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(m.logo)) return m.logo; return typeof LOGO_B64 !== 'undefined' && LOGO_B64 ? `data:image/png;base64,${LOGO_B64}` : ''; },
  apply() { const src = MMBrand.logo(); if (src) document.querySelectorAll('.brand img, img.brand-logo').forEach((i) => { i.src = src; }); }
};
const V21 = (() => {
  'use strict';
  const E = MMUI.esc; const C = (s, n = 200) => MMUI.clean(s, n); const admin = () => MMUI.isAdmin();
  const CONGS = ['Monte Moriá', 'Monte Sinai', 'Cenáculo da Fé', 'Tabernáculo de Davi'];
  const CATS = { Entrada: ['Dízimos', 'Ofertas', 'Missões', 'Beneficência', 'Outras entradas'], Despesa: ['50% para o Centro', 'Missões (envio ao Centro)', 'Manutenção', 'Apoio social', 'Alimentação', 'Serviços de telecomunicação', 'Transporte', 'Outras despesas'] };
  const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const pickFile = (accept) => new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.addEventListener('change', () => res(i.files[0] || null)); i.click(); });
  /* ---------- 1) Logótipo e cabeçalho ---------- */
  const marca = () => {
    if (!admin()) { MMUI.toast('Exige sessão de administrador.'); return; }
    const S = V20.D(); const cab = { l1: 'ASSEMBLEIA DE DEUS PENTECOSTAL', l2: 'MINISTÉRIO BETEL-LUANDA', l3: 'CENTRO MONTE MORIÁ', ...S.cab }; let novo = null;
    const m = MMUI.modal({ title: 'Logótipo e cabeçalho', size: 'wide', body: `<div class="v21-marca"><img id="v21_prev" src="${E(MMBrand.logo())}" alt="Pré-visualização do logótipo"><div class="mm-form">
        <div class="field"><label for="v21_logo">Novo logótipo (PNG, JPG ou WEBP)</label><input id="v21_logo" type="file" accept="image/png,image/jpeg,image/webp"></div>
        ${[['l1', 'Linha 1'], ['l2', 'Linha 2'], ['l3', 'Linha 3']].map(([k, l]) => `<div class="field"><label for="v21_${k}">${l}</label><input id="v21_${k}" maxlength="80" value="${E(cab[k] || '')}"></div>`).join('')}
        <p class="mm-help">Usado na Secretaria, no Relatório financeiro e no menu lateral.</p></div></div><p class="mm-err" role="alert"></p>`,
      foot: '<button type="button" class="btn danger sm" data-reset>Logótipo original</button><button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    const err = m.el.querySelector('.mm-err');
    m.el.querySelector('#v21_logo').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return; try { if (!/^image\/(png|jpeg|webp)$/.test(f.type)) throw new Error('use PNG, JPG ou WEBP'); if (f.size > 4e6) throw new Error('imagem demasiado grande (máx. 4 MB)');
        const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('não foi possível ler')); r.readAsDataURL(f); });
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('imagem inválida')); i.src = url; });
        const k = Math.min(1, 320 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        novo = c.toDataURL('image/png'); m.el.querySelector('#v21_prev').src = novo; err.textContent = ''; } catch (x) { err.textContent = `Logótipo: ${x.message}.`; } });
    m.el.querySelector('[data-reset]').addEventListener('click', () => { DB.settings.marcaV21 = { ...(DB.settings.marcaV21 || {}), logo: '' }; MMUI.save('Logótipo original reposto'); m.close(); MMBrand.apply(); V20.render(); V17.render(); });
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      const v = (k) => C(m.el.querySelector(`#v21_${k}`).value, 80); const L = { l1: v('l1'), l2: v('l2'), l3: v('l3') }; if (!L.l1) { err.textContent = 'A linha 1 não pode ficar vazia.'; return; }
      DB.settings.marcaV21 = { ...(DB.settings.marcaV21 || {}), ...(novo ? { logo: novo } : {}) }; S.cab = L; const vw = V17.D().view; vw.l1 = L.l1; vw.l2 = [L.l2, L.l3].filter(Boolean).join(' – ');
      MMUI.save('Logótipo e cabeçalho alterados'); m.close(); MMBrand.apply(); V20.render(); V17.render(); MMUI.toast('Logótipo e cabeçalho guardados.');
    });
  };
  /* ---------- 2) Finanças das congregações registadas no próprio sistema ---------- */
  const congNovo = () => {
    const r = V19.R(); const names = [...new Set([...CONGS, ...r.pacotes.map((p) => p.congregacao)])];
    const m = MMUI.modal({ title: 'Registar dados de uma congregação', size: 'narrow', body: `<form class="mm-form" novalidate>
        <div class="field"><label for="v21c_c">Congregação *</label><input id="v21c_c" list="v21c_cl" maxlength="80"><datalist id="v21c_cl">${names.map((n) => `<option value="${E(n)}">`).join('')}</datalist></div>
        <div class="field"><label for="v21c_m">Mês *</label><input id="v21c_m" type="month" value="${E(r.compMes)}"></div>
        <div class="field"><label for="v21c_s">Saldo anterior (Kz)</label><input id="v21c_s" type="number" step="0.01" value="0"></div>
        <div class="field"><label for="v21c_t">Tesoureiro(a)</label><input id="v21c_t" maxlength="80"></div><div class="field"><label for="v21c_l">Líder</label><input id="v21c_l" maxlength="80"></div><p class="mm-err" role="alert"></p></form>`,
      foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Continuar</button>' });
    const q = (id) => m.el.querySelector(id); const err = q('.mm-err');
    q('[data-ok]').addEventListener('click', () => {
      const cong = C(q('#v21c_c').value, 80); const mes = q('#v21c_m').value; const saldo = Number(q('#v21c_s').value);
      if (cong.length < 3) { err.textContent = 'Indique a congregação.'; return; } if (!/^\d{4}-\d{2}$/.test(mes)) { err.textContent = 'Escolha o mês.'; return; } if (!Number.isFinite(saldo)) { err.textContent = 'Saldo inválido.'; return; }
      const id = `manual-${slug(cong)}-${mes}`; const outro = r.pacotes.find((p) => p.pacoteId !== id && MMFile.norm(p.congregacao) === MMFile.norm(cong) && p.meses.some((x) => x.mes === mes));
      if (outro) { err.textContent = 'Já existem dados importados desta congregação para este mês (remova-os primeiro ou use «Lançamentos…»).'; return; }
      let p = r.pacotes.find((x) => x.pacoteId === id);
      if (!p) { p = { pacoteId: id, congregacao: cong, responsavel: C(q('#v21c_t').value, 80), lider: C(q('#v21c_l').value, 80), telefone: '', gerado: new Date().toISOString(), recebido: new Date().toISOString(), integridade: 'manual', formato: 'manual', meses: [{ mes, saldo: Math.round(saldo * 100) / 100, notas: '', lancamentos: [] }] }; r.pacotes.push(p); }
      r.compMes = mes; MMUI.save(`Congregação ${cong}: ${mes}`); m.close(); V17.setSub('cong'); congLanc(id);
    });
  };
  const congLanc = (id) => {
    const r = V19.R(); const p = r.pacotes.find((x) => x.pacoteId === id); if (!p) return; const mm = p.meses.find((x) => x.mes === r.compMes) || p.meses[0]; const marca = () => { if (p.formato !== 'manual') p.integridade = 'editado'; }; const kz = V17.kz; let edit = null;
    const lista = () => `<table class="data-table"><caption class="sr-only">Lançamentos</caption><thead><tr><th scope="col">Data</th><th scope="col">Tipo</th><th scope="col">Categoria</th><th scope="col">Descrição</th><th scope="col">Valor</th><th scope="col"><span class="sr-only">Acções</span></th></tr></thead><tbody>${mm.lancamentos.map((l) => `<tr><td>${E(MMDate.fmt(l.data))}</td><td>${E(l.tipo)}</td><td>${E(l.categoria)}</td><td>${E(l.descricao)}</td><td class="mm-num">${kz(l.valor)}</td><td class="mm-actions"><button type="button" class="btn ghost sm" data-le="${E(l.id)}">Editar</button><button type="button" class="btn danger sm" data-ld="${E(l.id)}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">Sem lançamentos.</div></td></tr>'}</tbody></table>`;
    const tot = () => { const t = V19.totais(mm); return `Entradas ${kz(t.entradas)} · Despesas ${kz(t.despesas)} · Saldo a transitar ${kz(t.saldoTransitar)} Kz`; };
    const m = MMUI.modal({ title: `${p.congregacao} — ${V17.mesLbl(mm.mes)}`, size: 'wide', body: `<p class="mm-help" data-tot>${E(tot())}</p><div class="tbl-scroll" data-list>${lista()}</div>
      <form class="mm-form v21-lf" novalidate><h4 class="mm-h4" data-ft>Novo lançamento</h4><div class="mm-grid">
        <div class="field"><label for="v21l_d">Data *</label><input id="v21l_d" name="data" type="date" value="${E(mm.mes)}-01"></div><div class="field"><label for="v21l_t">Tipo *</label><select id="v21l_t" name="tipo"><option>Entrada</option><option>Despesa</option></select></div>
        <div class="field"><label for="v21l_c">Categoria *</label><input id="v21l_c" name="categoria" list="v21l_cl" maxlength="80"><datalist id="v21l_cl">${[...CATS.Entrada, ...CATS.Despesa].map((c) => `<option value="${E(c)}">`).join('')}</datalist></div>
        <div class="field"><label for="v21l_s">Subcategoria</label><input id="v21l_s" name="subcategoria" maxlength="80"></div><div class="field mm-full"><label for="v21l_ds">Descrição *</label><input id="v21l_ds" name="descricao" maxlength="160"></div>
        <div class="field"><label for="v21l_v">Valor (Kz) *</label><input id="v21l_v" name="valor" type="number" min="0.01" step="0.01"></div><div class="field"><label for="v21l_o">Observação</label><input id="v21l_o" name="obs" maxlength="200"></div></div>
        <p class="mm-err" role="alert"></p><button type="button" class="btn gold sm" data-ls>Guardar lançamento</button> <button type="button" class="btn ghost sm" data-lc hidden>Cancelar edição</button></form>`, foot: '<button type="button" class="btn gold sm" data-close>Concluir</button>' });
    const F = m.el.querySelector('form'); const err = F.querySelector('.mm-err');
    const refresh = () => { m.el.querySelector('[data-list]').innerHTML = lista(); m.el.querySelector('[data-tot]').textContent = tot(); };
    const reset = () => { F.reset(); F.data.value = `${mm.mes}-01`; edit = null; m.el.querySelector('[data-ft]').textContent = 'Novo lançamento'; F.querySelector('[data-lc]').hidden = true; err.textContent = ''; };
    m.el.addEventListener('click', async (e) => {
      const le = e.target.closest('[data-le]'); const ld = e.target.closest('[data-ld]');
      if (le) { edit = mm.lancamentos.find((l) => l.id === le.dataset.le); if (!edit) return; ['data', 'tipo', 'categoria', 'subcategoria', 'descricao', 'valor', 'obs'].forEach((k) => { F[k].value = edit[k] ?? ''; }); m.el.querySelector('[data-ft]').textContent = 'Corrigir lançamento'; F.querySelector('[data-lc]').hidden = false; F.descricao.focus(); }
      else if (ld) { const l = mm.lancamentos.find((x) => x.id === ld.dataset.ld); if (l && await MMUI.confirm(`Eliminar «${l.descricao}»?`, 'Eliminar')) { mm.lancamentos.splice(mm.lancamentos.indexOf(l), 1); marca(); MMUI.save(); refresh(); } }
      else if (e.target.closest('[data-lc]')) reset();
      else if (e.target.closest('[data-ls]')) {
        const l = V19.lanc({ id: edit ? edit.id : `m${Date.now().toString(36)}`, data: F.data.value, tipo: F.tipo.value, categoria: F.categoria.value, subcategoria: F.subcategoria.value, descricao: F.descricao.value, valor: F.valor.value, obs: F.obs.value }, mm.mes);
        if (!l) { err.textContent = `Verifique: data de ${V17.mesLbl(mm.mes)}, categoria, descrição e valor maior que zero.`; return; }
        if (edit) Object.assign(edit, l); else mm.lancamentos.push(l); marca(); MMUI.save(`Congregação ${p.congregacao}: lançamento`); refresh(); reset(); MMUI.toast('Lançamento guardado.');
      }
    });
    m.el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => V17.setSub('cong')));
  };
  /* ---------- 3) Secretaria: sub-abas e «Mais registos» ---------- */
  let sub = 'info'; let modCur = null;
  const MD = () => { const S = V20.D(); if (!Array.isArray(S.modulos)) { S.modulos = [{ id: 'corresp', nome: 'Correspondência', descricao: 'Cartas e ofícios recebidos e enviados.' }, { id: 'actas', nome: 'Actas de reunião', descricao: 'Resumo das reuniões do conselho, da direcção e das assembleias.' }];
      if (!MMFields.list('sec_corresp').length) MMFields.set('sec_corresp', [{ key: 'cf_data', label: 'Data', type: 'date', required: true, options: [] }, { key: 'cf_tipo', label: 'Tipo', type: 'select', required: true, options: ['Recebida', 'Enviada'] }, { key: 'cf_entidade', label: 'Entidade', type: 'text', required: false, options: [] }, { key: 'cf_assunto', label: 'Assunto', type: 'text', required: true, options: [] }]);
      if (!MMFields.list('sec_actas').length) MMFields.set('sec_actas', [{ key: 'cf_data', label: 'Data', type: 'date', required: true, options: [] }, { key: 'cf_orgao', label: 'Órgão', type: 'select', required: true, options: ['Conselho', 'Direcção', 'Assembleia'] }, { key: 'cf_resumo', label: 'Resumo', type: 'textarea', required: true, options: [] }]); }
    S.registos = S.registos || {}; return S; };
  const secTabs = () => `<div class="tabs-inline v21-sectabs" role="tablist" aria-label="Secretaria">${[['info', 'Informações'], ['mais', 'Mais registos']].map(([k, l]) => `<button type="button" role="tab" aria-selected="${sub === k}" class="${sub === k ? 'active' : ''}" data-v21tab="${k}">${l}</button>`).join('')}</div>`;
  const renderMais = () => {
    const box = document.getElementById('v20-sec'); if (!box) return; const S = MD(); const ed = MMUI.canEditTab('secretaria'); const ad = admin();
    if (!S.modulos.some((x) => x.id === modCur)) modCur = S.modulos[0]?.id || null; const mod = S.modulos.find((x) => x.id === modCur); const F = mod ? MMFields.list(`sec_${mod.id}`) : []; const R = mod ? (S.registos[mod.id] = S.registos[mod.id] || []) : [];
    box.innerHTML = `${secTabs()}<div class="v14-toolbar" role="group" aria-label="Módulos">${S.modulos.map((x) => `<button type="button" class="btn ${x.id === modCur ? 'gold' : 'ghost'} sm" data-v21mod="${E(x.id)}" aria-pressed="${x.id === modCur}">${E(x.nome)}</button>`).join('')}${ad ? '<button type="button" class="btn ghost sm" data-v21="mod-novo">+ Novo módulo</button>' : ''}</div>
      ${mod ? `<div class="card"><div class="v20-cat-h"><h3 class="u-v14-h">${E(mod.nome)}</h3><span class="sub">${R.length} registo(s)</span></div><p class="sub">${E(mod.descricao || '')}</p>
        <div class="v14-toolbar"><button type="button" class="btn gold sm" data-v21="reg-novo"${ed && F.length ? '' : ' disabled'}>+ Registo</button>${ad ? '<button type="button" class="btn ghost sm" data-v21="mod-campos">Campos…</button><button type="button" class="btn ghost sm" data-v21="mod-edit">Editar módulo</button><button type="button" class="btn danger sm" data-v21="mod-del">Eliminar módulo</button>' : ''}<button type="button" class="btn ghost sm" data-v21="mod-xlsx"${R.length ? '' : ' disabled'}>Exportar Excel</button></div>
        ${F.length ? `<div class="tbl-scroll"><table class="data-table"><caption class="sr-only">${E(mod.nome)}</caption><thead><tr>${F.map((f) => `<th scope="col">${E(f.label)}</th>`).join('')}<th scope="col">Registado</th><th scope="col">Ações</th></tr></thead>
          <tbody>${R.map((x) => `<tr>${F.map((f) => `<td>${E(MMFields.text(f, x[f.key]) || '—')}</td>`).join('')}<td>${E(new Date(x.criado).toLocaleDateString('pt-PT'))}</td><td class="mm-actions"><button type="button" class="btn ghost sm" data-v21="reg-edit" data-id="${E(x.id)}"${ed ? '' : ' disabled'}>Editar</button><button type="button" class="btn danger sm" data-v21="reg-del" data-id="${E(x.id)}"${ed ? '' : ' disabled'}>Eliminar</button></td></tr>`).join('') || `<tr><td colspan="${F.length + 2}"><div class="empty">Sem registos.</div></td></tr>`}</tbody></table></div>` : '<p class="note">Este módulo ainda não tem campos. O administrador define-os em «Campos…».</p>'}</div>` : '<div class="card empty">Ainda não há módulos. O administrador cria-os com «+ Novo módulo».</div>'}`;
  };
  const regForm = (rec) => { const S = MD(); const mod = S.modulos.find((x) => x.id === modCur); const scope = `sec_${mod.id}`;
    const m = MMUI.modal({ title: `${rec ? 'Editar' : 'Novo'} registo — ${mod.nome}`, size: 'wide', body: `<form class="mm-form" novalidate><div class="mm-grid">${MMFields.html(scope, rec || {}, 'rg')}</div><p class="mm-err" role="alert"></p></form>`, foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { const r = MMFields.read(scope, m.el.querySelector('form')); if (r.err) { m.el.querySelector('.mm-err').textContent = r.err; r.el?.focus(); return; }
      if (rec) Object.assign(rec, r.values); else S.registos[mod.id].push({ id: `r${Date.now().toString(36)}`, criado: new Date().toISOString(), por: typeof actorName === 'function' ? actorName() : '', ...r.values }); m.close(); MMUI.save(`Secretaria › ${mod.nome}`); renderMais(); }); };
  const modForm = (mod) => { const m = MMUI.modal({ title: mod ? 'Editar módulo' : 'Novo módulo', size: 'narrow', body: `<form class="mm-form" novalidate><div class="field"><label for="v21m_n">Nome *</label><input id="v21m_n" maxlength="60" value="${E(mod ? mod.nome : '')}" placeholder="ex.: Certificados de baptismo"></div><div class="field"><label for="v21m_d">Descrição</label><input id="v21m_d" maxlength="160" value="${E(mod ? mod.descricao : '')}"></div><p class="mm-err" role="alert"></p></form>`, foot: '<button type="button" class="btn ghost sm" data-close>Cancelar</button><button type="button" class="btn gold sm" data-ok>Guardar</button>' });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { const n = C(m.el.querySelector('#v21m_n').value, 60); const d = C(m.el.querySelector('#v21m_d').value, 160); if (n.length < 3) { m.el.querySelector('.mm-err').textContent = 'Indique o nome do módulo.'; return; }
      const S = MD(); if (mod) Object.assign(mod, { nome: n, descricao: d }); else { const id = `m${Date.now().toString(36)}`; S.modulos.push({ id, nome: n, descricao: d }); modCur = id; } m.close(); MMUI.save(`Secretaria: módulo ${n}`); renderMais();
      if (!mod) MMFields.manage(`sec_${modCur}`, `Campos de «${n}»`, renderMais); }); };
  /* ---------- 4) Importar os documentos da Secretaria das congregações ---------- */
  const secImport = async () => {
    try { const f = await pickFile('.json,application/json'); if (!f) return; if (f.size > 5e6) throw new Error('ficheiro demasiado grande'); const p = JSON.parse(await f.text());
      if (p.formato !== 'mm-secretaria' || !Array.isArray(p.docs)) throw new Error('não é um envio da Secretaria da aplicação das congregações');
      const S = V20.D(); const cong = C(p.congregacao, 80) || 'Congregação'; let n = 0, rep = 0;
      p.docs.forEach((d) => { const origem = `${cong}:${C(d.id, 60)}`; if (S.docs.some((x) => x.origem === origem)) { rep++; return; }
        const itens = []; (d.seccoes || []).forEach((s) => { const nome = C(s.categoria, 60).toUpperCase(); if (!nome) return; let c = S.cats.find((x) => MMFile.norm(x.nome) === MMFile.norm(nome));
          if (!c) { c = { id: `c${Date.now().toString(36)}${S.cats.length}`, nome, crit: Math.min(5, Math.max(1, Number(s.crit) || 3)), intro: C(s.intro, 200), cor: '', ordem: S.cats.length, ativa: true }; S.cats.push(c); }
          (s.itens || []).forEach((t, i) => { const tx = C(t, 400); if (tx) itens.push({ id: `i${Date.now().toString(36)}${itens.length}`, cat: c.id, texto: tx, ordem: i }); }); });
        S.docs.push({ id: `d${Date.now().toString(36)}${n}`, origem, criado: new Date().toISOString(), estado: 'Recebido', assunto: `[${cong}] ${C(d.assunto, 120)}`, destinatario: C(d.destinatario, 120), saudacao: C(d.saudacao, 160), fecho: C(d.fecho, 200), assin: (d.assin || []).slice(0, 4).map((a) => ({ cargo: C(a.cargo, 60), nome: C(a.nome, 80) })), mostrarVazias: false, itens }); n++; });
      if (n) S.cur = S.docs[S.docs.length - 1].id; MMUI.save(`Secretaria: ${n} documento(s) de ${cong}`); sub = 'info'; V20.render(); MMUI.toast(`${n} documento(s) importado(s) de ${cong}${rep ? `; ${rep} já existiam` : ''}.`);
    } catch (e) { MMUI.toast(`Importação falhou: ${e.message}`); }
  };
  /* ---------- eventos ---------- */
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-v21tab]'); if (t) { sub = t.dataset.v21tab; V20.render(); document.querySelector(`[data-v21tab="${sub}"]`)?.focus(); return; }
    const md = e.target.closest('[data-v21mod]'); if (md) { modCur = md.dataset.v21mod; renderMais(); return; }
    const b = e.target.closest('[data-v21]'); if (!b || b.disabled) return; const a = b.dataset.v21; const S = MD(); const mod = S.modulos.find((x) => x.id === modCur);
    if (a === 'marca') marca(); else if (a === 'cong-novo') congNovo(); else if (a === 'cong-lanc') congLanc(b.dataset.id); else if (a === 'sec-import') secImport();
    else if (a === 'mod-novo') { if (admin()) modForm(null); } else if (a === 'mod-edit' && mod && admin()) modForm(mod); else if (a === 'mod-campos' && mod && admin()) MMFields.manage(`sec_${mod.id}`, `Campos de «${mod.nome}»`, renderMais);
    else if (a === 'mod-del' && mod && admin()) { const go = async () => { if (!(await MMUI.confirm(`Eliminar o módulo «${mod.nome}» e os seus ${(S.registos[mod.id] || []).length} registos?`, 'Eliminar'))) return; S.modulos.splice(S.modulos.indexOf(mod), 1); delete S.registos[mod.id]; MMUI.save(`Secretaria: módulo eliminado`); renderMais(); };
      if (typeof requirePassword === 'function') requirePassword('admin', 'Introduza a palavra-passe para eliminar este módulo.', go); else go(); }
    else if (a === 'reg-novo' && mod) regForm(null); else if (a === 'reg-edit' && mod) regForm((S.registos[mod.id] || []).find((x) => x.id === b.dataset.id));
    else if (a === 'reg-del' && mod) { const L = S.registos[mod.id] || []; const x = L.find((y) => y.id === b.dataset.id); if (x && await MMUI.confirm('Eliminar este registo?', 'Eliminar')) { L.splice(L.indexOf(x), 1); MMUI.save(); renderMais(); } }
    else if (a === 'mod-xlsx' && mod) { try { const F = MMFields.list(`sec_${mod.id}`); const rows = (S.registos[mod.id] || []).map((x) => Object.fromEntries([...F.map((f) => [f.label, MMFields.text(f, x[f.key])]), ['Registado', x.criado.slice(0, 10)]])); MMFile.xlsx(`${slug(mod.nome)}.xlsx`, rows, mod.nome); } catch (x) { MMUI.toast(`Exportação falhou: ${x.message}`); } }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(MMBrand.apply, 300)); else setTimeout(MMBrand.apply, 300);
  return { secSub: () => sub, secTabs, renderMais, marca };
})();
