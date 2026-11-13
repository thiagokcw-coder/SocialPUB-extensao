// Painel: persona → contas → redes, mídia e texto → prepara uma rede de cada vez.
const $ = id => document.getElementById(id);

// Estado em memória, espelho do chrome.storage.local (ver personas.js).
let PERSONAS = {};
let ATIVA = null;

function log(msg, cls) {
  const el = $('log');
  if (el.textContent === '—') el.textContent = '';
  const linha = document.createElement('div');
  if (cls) linha.className = cls;
  linha.textContent = msg;
  el.appendChild(linha);
  linha.scrollIntoView({ block: 'nearest' });
}

/** Botão no relatório que copia o que a extensão viu na tela em que parou —
 * é com isso que se corrige a receita (medir, não adivinhar). */
function botaoDiagnostico(nome, diag) {
  const b = document.createElement('button');
  b.className = 'sec diag';
  b.textContent = `📋 Copiar diagnóstico — ${nome}`;
  b.addEventListener('click', async () => {
    const texto = JSON.stringify(diag, null, 1);
    try { await navigator.clipboard.writeText(texto); b.textContent = `✓ diagnóstico do ${nome} copiado — cole na conversa`; }
    catch (e) { const ta = document.createElement('textarea'); ta.value = texto; b.after(ta); ta.select(); }
  });
  $('log').appendChild(b);
}

function _esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** «@a, @b» → ['a', 'b']; recusa o que não é @ válido do Instagram. */
function nomesDeColaboradores(texto) {
  const nomes = [];
  for (const p of String(texto || '').split(/[\s,;]+/)) {
    const n = p.trim().replace(/^@/, '').toLowerCase();
    if (!n) continue;
    if (!/^[a-z0-9._]{1,30}$/.test(n)) throw new Error(`«${p}» não é um @ válido do Instagram`);
    if (!nomes.includes(n)) nomes.push(n);
  }
  return nomes;
}

const persona = () => (ATIVA && PERSONAS[ATIVA]) || null;
const salvar = () => spSalvarPersonas(PERSONAS, ATIVA);

// ── persona ──────────────────────────────────────────────────────────────
function desenharPersonas() {
  const ids = Object.keys(PERSONAS).sort((a, b) => PERSONAS[a].nome.localeCompare(PERSONAS[b].nome));
  $('pers').innerHTML = ids.length
    ? ids.map(id => `<option value="${id}" ${id === ATIVA ? 'selected' : ''}>${_esc(PERSONAS[id].nome)}</option>`).join('')
    : '<option value="">— crie a primeira persona —</option>';
  $('pers-renomear').disabled = $('pers-excluir').disabled = !ids.length;
  const p = persona();
  if (p) {
    const com = ORDEM_REDES.filter(id => p.contas[id]).map(id => RECEITAS[id].nome);
    $('pers-resumo').textContent = com.length ? `contas: ${com.join(', ')}` : 'nenhuma conta ainda — cadastre em «Contas da persona»';
  } else {
    $('pers-resumo').textContent = 'Uma persona é uma página — por exemplo, um perfil com Instagram, X, TikTok… Crie uma para começar.';
  }
  $('colab').value = p ? (p.colab || '') : '';
  $('colab').disabled = !p;
  desenharContas();
  desenharRedes();
}

$('pers').addEventListener('change', async () => {
  ATIVA = $('pers').value || null;
  await salvar();
  desenharPersonas();
});

$('pers-nova').addEventListener('click', async () => {
  const nome = prompt('Nome da nova persona:');
  if (nome == null) return;
  try {
    ATIVA = spCriarPersona(PERSONAS, nome);
    await salvar();
    desenharPersonas();
    $('contas-caixa').open = true;
  } catch (e) { alert(e.message); }
});

$('pers-renomear').addEventListener('click', async () => {
  const p = persona();
  if (!p) return;
  const nome = prompt('Novo nome da persona:', p.nome);
  if (nome == null) return;
  try {
    p.nome = spValidarNome(PERSONAS, nome, ATIVA);
    await salvar();
    desenharPersonas();
  } catch (e) { alert(e.message); }
});

$('pers-excluir').addEventListener('click', async () => {
  const p = persona();
  if (!p) return;
  const n = Object.keys(p.contas).length;
  if (!confirm(`Excluir a persona «${p.nome}» e as ${n} conta(s) guardadas dela na extensão?\n\nAs sessões que já estão no navegador continuam.`)) return;
  delete PERSONAS[ATIVA];
  ATIVA = Object.keys(PERSONAS)[0] || null;
  await salvar();
  desenharPersonas();
});

$('colab').addEventListener('change', async () => {
  const p = persona();
  if (!p) return;
  p.colab = $('colab').value;
  await salvar();
});

// ── contas da persona (uma por rede, por cookies) ────────────────────────
function desenharContas() {
  const p = persona();
  if (!p) {
    $('contas-resumo').textContent = '';
    $('contas').innerHTML = '<div class="dica">Crie uma persona primeiro.</div>';
    return;
  }
  const contas = p.contas;
  const n = ORDEM_REDES.filter(id => contas[id]).length;
  $('contas-resumo').textContent = `— ${p.nome}: ${n} de ${ORDEM_REDES.length}`;
  $('contas').innerHTML = ORDEM_REDES.map(id => {
    const c = contas[id];
    const estado = c
      ? `<span class="ok">${c.usuario ? '@' + _esc(c.usuario) + ' · ' : ''}${c.cookies.length} cookie(s) · ${_esc(c.salvo_em)}</span>`
      : '<span class="dica">nenhuma guardada</span>';
    return `<div class="conta" data-rede="${id}">
      <div class="conta-topo"><b>${_esc(RECEITAS[id].nome)}</b> ${estado}</div>
      <input type="text" class="usuario" placeholder="@ da conta (só para você lembrar)" value="${c ? _esc(c.usuario) : ''}" style="margin-top:6px">
      <div class="acoes">
        <button class="sec tela">Entrar pela tela</button>
        <button class="capturar">Salvar a sessão do navegador</button>
      </div>
      <div class="dica" style="margin-top:6px">ou, com o Cookie-Editor, cole os cookies:</div>
      <textarea class="ck" placeholder='[{"domain":".${SP_COOKIES[id].dominios[0]}","name":"…","value":"…"}] — exportado pelo Cookie-Editor'></textarea>
      <div class="acoes">
        <button class="salvar">Salvar e entrar</button>
        ${c ? '<button class="sec entrar">Entrar de novo</button><button class="sec apagar">Esquecer</button>' : ''}
        <button class="sec abrir">Abrir ${_esc(RECEITAS[id].nome)}</button>
      </div>
      <div class="dica res"></div>
    </div>`;
  }).join('');
}

function _relatarEntrada(div, r, faltando) {
  const recus = r.recusados.length ? ` · ${r.recusados.length} recusado(s): ${r.recusados.map(x => x.name).join(', ')} (${r.recusados[0].motivo})` : '';
  const falta = faltando && faltando.length
    ? `<div class="am">⚠ não vieram ${_esc(faltando.join(', '))} — normalmente são eles que autenticam; exporte de novo na página logada</div>` : '';
  div.querySelector('.res').innerHTML =
    (r.entrou
      ? `<span class="${r.recusados.length ? 'am' : 'ok'}">✓ ${r.gravados} cookie(s) gravado(s) no navegador (${r.apagados} da sessão anterior apagados)${_esc(recus)} — clique em Abrir para conferir</span>`
      : `<span class="er">✗ não entrou: ${r.gravados} gravado(s)${_esc(recus)} — a sessão anterior ficou como estava</span>`) + falta;
}

$('contas').addEventListener('click', async ev => {
  const div = ev.target.closest('.conta');
  const p = persona();
  if (!div || !p || ev.target.tagName !== 'BUTTON') return;
  const rede = div.dataset.rede;
  const res = div.querySelector('.res');
  try {
    if (ev.target.classList.contains('abrir')) {
      await chrome.tabs.create({ url: RECEITAS[rede].url.replace(/\/(compose\/post|tiktokstudio\/upload|post\/create)$/, '/'), active: true });
      return;
    }
    if (ev.target.classList.contains('apagar')) {
      if (!confirm(`Esquecer a conta do ${RECEITAS[rede].nome} de «${p.nome}»? (A sessão que já está no navegador continua.)`)) return;
      delete p.contas[rede];
      await salvar();
      desenharPersonas();
      return;
    }
    if (ev.target.classList.contains('entrar')) {
      _relatarEntrada(div, await spEntrar(rede, p.contas[rede].cookies), null);
      return;
    }
    if (ev.target.classList.contains('tela')) {
      const nome = RECEITAS[rede].nome;
      if (!confirm(`Entrar no ${nome} pela tela, para «${p.nome}».\n\n`
        + `A sessão do ${nome} que está neste navegador sai DAQUI (não é «Sair»: guardada em outra persona, ela continua valendo). `
        + `Se ela não estiver guardada em nenhuma persona, será preciso entrar de novo nela.\n\n`
        + `Na página que vai abrir, entre com usuário e senha. Depois volte aqui e clique «Salvar a sessão do navegador».`)) return;
      const n = await spSairLocal(rede);
      await chrome.tabs.create({ url: SP_LOGIN[rede], active: true });
      const threads = rede === 'threads'
        ? ' O Threads entra pela conta do Instagram: se oferecer «Continuar como @…» de OUTRA conta, escolha entrar com usuário e senha.' : '';
      res.innerHTML = `<span class="am">→ página de login do ${_esc(nome)} aberta (${n} cookie(s) da sessão anterior tirados deste navegador). `
        + `Entre na conta de «${_esc(p.nome)}», volte aqui e clique «Salvar a sessão do navegador».${_esc(threads)}</span>`;
      return;
    }
    if (ev.target.classList.contains('capturar')) {
      const lido = await spCapturarSessao(rede);
      p.contas[rede] = {
        usuario: div.querySelector('.usuario').value.trim().replace(/^@/, ''),
        cookies: lido.cookies,
        salvo_em: new Date().toLocaleString('pt-BR'),
      };
      await salvar();
      desenharPersonas();
      const novo = document.querySelector(`.conta[data-rede="${rede}"] .res`);
      novo.innerHTML = `<span class="ok">✓ sessão guardada em «${_esc(p.nome)}»: ${lido.cookies.length} cookie(s) — confira com Abrir</span>`
        + (lido.faltando.length ? `<div class="am">⚠ não há ${_esc(lido.faltando.join(', '))} — o login pode não ter terminado; termine na página e salve de novo</div>` : '');
      return;
    }
    // Salvar e entrar
    const lido = spLerCookies(div.querySelector('.ck').value, rede);
    const r = await spEntrar(rede, lido.cookies);
    p.contas[rede] = {
      usuario: div.querySelector('.usuario').value.trim().replace(/^@/, ''),
      cookies: lido.cookies,
      salvo_em: new Date().toLocaleString('pt-BR'),
    };
    await salvar();
    desenharPersonas();
    _relatarEntrada(document.querySelector(`.conta[data-rede="${rede}"]`), r, lido.faltando);
  } catch (e) {
    res.innerHTML = `<span class="er">✗ ${_esc(e && e.message ? e.message : e)}</span>`;
  }
});

// ── redes ────────────────────────────────────────────────────────────────
for (const id of ORDEM_REDES) {
  const R = RECEITAS[id];
  const l = document.createElement('label');
  l.className = 'rede';
  l.dataset.rede = id;
  l.innerHTML = `<input type="checkbox" value="${id}"> ${R.nome} <small class="tag">(${R.aceita.join('/')})</small>`;
  $('redes').appendChild(l);
}

/** Rede sem conta na persona aparece apagada: na hora de preparar ela é pulada. */
function desenharRedes() {
  const p = persona();
  document.querySelectorAll('#redes .rede').forEach(l => {
    const tem = !!(p && p.contas[l.dataset.rede]);
    l.classList.toggle('sem', !tem);
    l.querySelector('.tag').textContent = tem
      ? `(${RECEITAS[l.dataset.rede].aceita.join('/')})` : '(sem conta nesta persona)';
  });
}

function _rotuloBotao() {
  $('ir').textContent = $('publicar-auto').checked ? 'Preparar e PUBLICAR nas redes marcadas' : 'Preparar nas redes marcadas';
}
$('publicar-auto').checked = true;
_rotuloBotao();
$('publicar-auto').addEventListener('change', _rotuloBotao);

chrome.storage.local.get({ redes: ['x'] }).then(s => {
  document.querySelectorAll('#redes input').forEach(c => { c.checked = s.redes.includes(c.value); });
  desenharLegendas();   // marcar por código não dispara 'change'
});
$('redes').addEventListener('change', () => {
  chrome.storage.local.set({ redes: [...document.querySelectorAll('#redes input:checked')].map(c => c.value) });
});

// ── legenda: comum + própria por rede ────────────────────────────────────
// Cada rede tem o seu limite. Sem «Legenda própria» a rede usa a comum; com,
// usa o texto dela — INCLUSIVE vazio (vazio é escolha: "esta rede sem
// legenda"), a mesma regra do app.
for (const id of ORDEM_REDES) {
  const d = document.createElement('div');
  d.className = 'leg-rede';
  d.dataset.rede = id;
  d.innerHTML = `<div class="topo">
      <label><input type="checkbox" class="propria"> Legenda própria para <b>${_esc(RECEITAS[id].nome)}</b></label>
      <span class="cont-rede"></span></div>
    <textarea class="leg-propria" hidden placeholder="Texto só para ${_esc(RECEITAS[id].nome)} (até ${RECEITAS[id].legenda_max.toLocaleString('pt-BR')} caracteres)"></textarea>`;
  $('legs').appendChild(d);
}

const _linhaLeg = id => document.querySelector(`.leg-rede[data-rede="${id}"]`);
const marcadas = () => [...document.querySelectorAll('#redes input:checked')].map(c => c.value);

/** A legenda que vai para a rede. */
function legendaDe(id) {
  const l = _linhaLeg(id);
  return l.querySelector('.propria').checked ? l.querySelector('.leg-propria').value : $('leg').value;
}

function desenharLegendas() {
  const ms = marcadas();
  $('cont').textContent = `${$('leg').value.length} caracteres`;
  for (const id of ORDEM_REDES) {
    const l = _linhaLeg(id);
    l.hidden = !ms.includes(id);
    const propria = l.querySelector('.propria').checked;
    l.querySelector('.leg-propria').hidden = !propria;
    const n = legendaDe(id).length, max = RECEITAS[id].legenda_max;
    const c = l.querySelector('.cont-rede');
    c.textContent = `${n.toLocaleString('pt-BR')} / ${max.toLocaleString('pt-BR')}` + (propria ? ' · própria' : ' · comum');
    c.className = 'cont-rede ' + (n > max ? 'er' : 'ok');
  }
}

$('legs').addEventListener('change', ev => {
  if (!ev.target.classList.contains('propria')) return;
  const l = ev.target.closest('.leg-rede');
  const ta = l.querySelector('.leg-propria');
  // Abre já com a comum, para editar a partir dela em vez de redigitar.
  if (ev.target.checked && !ta.value) ta.value = $('leg').value;
  desenharLegendas();
  if (ev.target.checked) ta.focus();
});
// ── legendas escritas fora: um arquivo, uma seção por rede ───────────────
/** Aplica o arquivo: cada rede dele ganha «Legenda própria» com o texto e é
 * MARCADA. Os avisos ficam na TELA (não num aviso que some): são o motivo de o
 * importador existir. */
function aplicarLegendas(texto) {
  const p = persona();
  const r = spImportarLegendas(texto, p ? Object.keys(p.contas) : null);
  const redes = Object.keys(r.legendas);
  // A SELEÇÃO DE REDES NÃO MUDA (pedido de 13/11: "seleciona todas as redes
  // novamente quando só selecionei uma"). Toda rede do arquivo recebe a legenda
  // própria — se você marcar depois, ela já está lá —, e o aviso diz quais
  // ficaram desmarcadas.
  for (const id of redes) {
    const l = _linhaLeg(id);
    l.querySelector('.propria').checked = true;
    l.querySelector('.leg-propria').value = r.legendas[id];
  }
  desenharLegendas();
  const ms = marcadas();
  const fora = redes.filter(id => !ms.includes(id));
  $('leg-avisos').innerHTML =
    (redes.length ? `<div class="dica ok">✓ legenda aplicada em: ${redes.map(id => _esc(RECEITAS[id].nome)).join(', ')}</div>` : '')
    + (fora.length ? `<div class="dica">• desmarcada(s), não vão ser publicadas: ${fora.map(id => _esc(RECEITAS[id].nome)).join(', ')} — marque em «Redes» se quiser</div>` : '')
    + r.avisos.map(a => `<div class="dica am">⚠ ${_esc(a)}</div>`).join('');
  return r;
}

$('leg-aplicar').addEventListener('click', () => aplicarLegendas($('leg-colar').value));
$('leg-limpar').addEventListener('click', () => { $('leg-colar').value = ''; $('leg-avisos').innerHTML = ''; });
$('leg-arquivo').addEventListener('change', ev => {
  const f = ev.target.files[0];
  if (!f) return;
  const fr = new FileReader();
  fr.onload = () => { $('leg-colar').value = String(fr.result || ''); aplicarLegendas($('leg-colar').value); };
  fr.readAsText(f, 'utf-8');
  ev.target.value = '';      // deixa escolher o MESMO arquivo de novo depois de editar
});
$('leg-briefing').addEventListener('click', async () => {
  const redes = marcadas().length ? marcadas() : ORDEM_REDES;
  try {
    await navigator.clipboard.writeText(spBriefing(redes));
    $('leg-avisos').innerHTML = `<div class="dica ok">✓ briefing copiado (${redes.map(id => _esc(RECEITAS[id].nome)).join(', ')}) — cole no modelo e escreva o assunto no fim</div>`;
  } catch (e) {
    $('leg-colar').value = spBriefing(redes);
    $('leg-avisos').innerHTML = '<div class="dica am">não consegui copiar — o briefing está na caixa acima; copie de lá</div>';
  }
});

$('legs').addEventListener('input', desenharLegendas);
$('leg').addEventListener('input', desenharLegendas);
$('redes').addEventListener('change', desenharLegendas);
desenharLegendas();

// ── a leva ───────────────────────────────────────────────────────────────
$('ir').addEventListener('click', async () => {
  const btn = $('ir');
  const p = persona();
  const redes = marcadas();
  const publicar = $('publicar-auto').checked;
  const url = $('url').value.trim();
  const local = $('arq').files[0] || null;
  $('log').textContent = '';
  if (!p) { log('Crie e escolha uma persona primeiro.', 'am'); return; }
  if (!redes.length) { log('Marque pelo menos uma rede.', 'am'); return; }
  if (!redes.some(id => legendaDe(id)) && !url && !local) { log('Escreva uma legenda, cole um link ou escolha um arquivo.', 'am'); return; }
  let colaboradores;
  try { colaboradores = nomesDeColaboradores(p.colab); }
  catch (e) { log('✗ ' + e.message, 'er'); return; }

  // A permissão para baixar do site do link é pedida AQUI, antes de qualquer
  // await: o Chrome só mostra o pedido dentro do clique. Só aquele site.
  let permitido = Promise.resolve(true);
  if (url) {
    let origem;
    try { origem = new URL(url).origin; } catch (e) { log('✗ link inválido', 'er'); return; }
    permitido = chrome.permissions.request({ origins: [origem + '/*'] });
  }

  btn.disabled = true;
  const t0 = Date.now();
  try {
    log(`persona: ${p.nome}` + (publicar ? ' · PUBLICAR SOZINHO ligado' : ' · para antes de publicar'));
    let midia = null;
    if (url) {
      if (!(await permitido)) { log('✗ sem permissão para baixar desse site', 'er'); return; }
      log('baixando o link …');
      midia = await spBaixarLink(url);
    } else if (local) {
      midia = await spLerArquivo(local);
    }
    if (midia) {
      const mb = midia.tamanho / 1048576;
      log(`✓ mídia: ${midia.nome} · ${midia.tipo} · ${mb.toFixed(1)} MB`, 'ok');
      if (mb > SP_LIMITE_AVISO_MB) log(`⚠ arquivo grande (${mb.toFixed(0)} MB): pode demorar ou falhar ao atravessar para a aba`, 'am');
    }

    const resultados = [];
    const tipo = midia ? (midia.tipo.startsWith('video/') ? 'video' : 'imagem') : 'texto';
    for (const id of redes) {
      log('');
      const conta = p.contas[id];
      // ⚠ Sem conta da persona nesta rede, PULA. Preparar com a sessão que por
      // acaso estiver no navegador publicaria na página da OUTRA persona.
      if (!conta) {
        log(`[${RECEITAS[id].nome}] pulada: «${p.nome}» não tem conta nesta rede — cadastre em «Contas da persona»`, 'am');
        resultados.push({ rede: id, semConta: true });
        continue;
      }
      // Legenda acima do limite da rede: NÃO prepara. Cortar sozinho publicaria
      // um texto que ninguém leu inteiro.
      const texto = legendaDe(id);
      const max = RECEITAS[id].legenda_max;
      if (texto.length > max) {
        log(`[${RECEITAS[id].nome}] pulada: a legenda tem ${texto.length} caracteres e o limite é ${max} — marque «Legenda própria» e encurte`, 'am');
        resultados.push({ rede: id, longa: true });
        continue;
      }
      // Tipo de mídia que a receita não cobre: o motor pula — sem trocar a
      // sessão à toa antes.
      if (!RECEITAS[id].aceita.includes(tipo)) {
        resultados.push(await prepararRede(id, midia, texto, { log }));
        continue;
      }
      const e = await spEntrar(id, conta.cookies);
      if (!e.entrou) {
        // Sem a sessão, a rede abre DESLOGADA e falha lá na frente com um erro
        // que não aponta a causa («não achei o botão de criar»). Para aqui.
        log(`[${RECEITAS[id].nome}] ✗ não consegui entrar na conta: ${e.gravados} gravado(s), ${e.recusados.length} recusado(s)`
            + (e.recusados[0] ? ` — ${e.recusados[0].name}: ${e.recusados[0].motivo}` : '') + ' — a sessão anterior ficou como estava', 'er');
        resultados.push({ rede: id, semSessao: true });
        continue;
      }
      log(`[${RECEITAS[id].nome}] sessão de ${conta.usuario ? '@' + conta.usuario : p.nome} no navegador (${e.gravados} cookie(s))`
          + (e.recusados.length ? ` · ${e.recusados.length} recusado(s) que não autenticam` : ''), e.recusados.length ? 'am' : 'ok');
      resultados.push(await prepararRede(id, midia, texto,
        { publicar, colaboradores: id === 'instagram' ? colaboradores : [], log }));
    }

    log('');
    log(`── resumo · ${p.nome} ──`);
    for (const r of resultados) {
      const nome = RECEITAS[r.rede].nome;
      if (r.semConta) log(`${nome}: sem conta nesta persona`, 'am');
      else if (r.semSessao) log(`${nome}: não entrou na conta — nada foi feito nela`, 'er');
      else if (r.longa) log(`${nome}: legenda acima do limite — não preparada`, 'am');
      else if (r.pulada) log(`${nome}: pulada (tipo de mídia)`, 'am');
      else if (r.erro) {
        log(`${nome}: parou no meio — aba aberta`, 'er');
        if (r.diagnostico) botaoDiagnostico(nome, r.diagnostico);
      }
      else if (r.legendaOk === false) log(`${nome}: legenda NÃO conferiu — ${publicar ? 'não publiquei; ' : ''}olhe a aba`, 'er');
      else if (r.publicou) log(`${nome}: PUBLICADO`, 'ok');
      else if (r.clicou) log(`${nome}: cliquei em publicar e não deu para confirmar — CONFIRA na aba antes de publicar de novo`, 'am');
      else log(`${nome}: pronta para você publicar`, 'ok');
    }
    log(`(${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  } catch (err) {
    log('✗ erro: ' + (err && err.message ? err.message : err), 'er');
  } finally {
    btn.disabled = false;
  }
});

// ── início ───────────────────────────────────────────────────────────────
spCarregarPersonas().then(s => {
  PERSONAS = s.personas;
  ATIVA = s.ativa;
  desenharPersonas();
});
