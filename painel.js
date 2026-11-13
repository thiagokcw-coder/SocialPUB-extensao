// Painel: escolhe as redes, a mídia e o texto, e prepara uma rede de cada vez.
const $ = id => document.getElementById(id);
const PADRAO_COLAB = '@endireitasul, @anothernewsbr';

function log(msg, cls) {
  const el = $('log');
  if (el.textContent === '—') el.textContent = '';
  const linha = document.createElement('div');
  if (cls) linha.className = cls;
  linha.textContent = msg;
  el.appendChild(linha);
  linha.scrollIntoView({ block: 'nearest' });
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

// ── contas (uma por rede, por cookies) ───────────────────────────────────
function _esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function _contas() { return (await chrome.storage.local.get({ contas: {} })).contas; }

async function desenharContas() {
  const contas = await _contas();
  const n = ORDEM_REDES.filter(id => contas[id]).length;
  $('contas-resumo').textContent = `— ${n} de ${ORDEM_REDES.length} guardada(s)`;
  $('contas').innerHTML = ORDEM_REDES.map(id => {
    const c = contas[id];
    const estado = c
      ? `<span class="ok">${c.usuario ? '@' + _esc(c.usuario) + ' · ' : ''}${c.cookies.length} cookie(s) · ${_esc(c.salvo_em)}</span>`
      : '<span class="dica">nenhuma guardada</span>';
    return `<div class="conta" data-rede="${id}">
      <div class="conta-topo"><b>${_esc(RECEITAS[id].nome)}</b> ${estado}</div>
      <input type="text" class="usuario" placeholder="@ da conta (só para você lembrar)" value="${c ? _esc(c.usuario) : ''}" style="margin-top:6px">
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
  const recus = r.recusados.length ? ` · ${r.recusados.length} recusado(s): ${r.recusados.map(x => x.name).join(', ')}` : '';
  const falta = faltando && faltando.length
    ? `<div class="am">⚠ não vieram ${_esc(faltando.join(', '))} — normalmente são eles que autenticam; exporte de novo na página logada</div>` : '';
  div.querySelector('.res').innerHTML =
    `<span class="${r.recusados.length ? 'am' : 'ok'}">✓ ${r.gravados} cookie(s) gravado(s) no navegador (${r.apagados} da sessão anterior apagados)${_esc(recus)} — clique em Abrir para conferir</span>` + falta;
}

$('contas').addEventListener('click', async ev => {
  const div = ev.target.closest('.conta');
  if (!div || ev.target.tagName !== 'BUTTON') return;
  const rede = div.dataset.rede;
  const res = div.querySelector('.res');
  try {
    if (ev.target.classList.contains('abrir')) {
      await chrome.tabs.create({ url: RECEITAS[rede].url.replace(/\/(compose\/post|tiktokstudio\/upload|post\/create)$/, '/'), active: true });
      return;
    }
    if (ev.target.classList.contains('apagar')) {
      if (!confirm(`Esquecer a conta do ${RECEITAS[rede].nome} guardada na extensão? (A sessão que já está no navegador continua.)`)) return;
      const contas = await _contas();
      delete contas[rede];
      await chrome.storage.local.set({ contas });
      await desenharContas();
      return;
    }
    if (ev.target.classList.contains('entrar')) {
      const c = (await _contas())[rede];
      const r = await spEntrar(rede, c.cookies);
      _relatarEntrada(div, r, null);
      return;
    }
    // Salvar e entrar
    const lido = spLerCookies(div.querySelector('.ck').value, rede);
    const r = await spEntrar(rede, lido.cookies);
    const contas = await _contas();
    contas[rede] = {
      usuario: div.querySelector('.usuario').value.trim().replace(/^@/, ''),
      cookies: lido.cookies,
      salvo_em: new Date().toLocaleString('pt-BR'),
    };
    await chrome.storage.local.set({ contas });
    await desenharContas();
    _relatarEntrada(document.querySelector(`.conta[data-rede="${rede}"]`), r, lido.faltando);
  } catch (e) {
    res.innerHTML = `<span class="er">✗ ${_esc(e && e.message ? e.message : e)}</span>`;
  }
});

desenharContas();

// ── redes ────────────────────────────────────────────────────────────────
for (const id of ORDEM_REDES) {
  const R = RECEITAS[id];
  const l = document.createElement('label');
  l.className = 'rede';
  l.innerHTML = `<input type="checkbox" value="${id}"> ${R.nome} <small>(${R.aceita.join('/')})</small>`;
  $('redes').appendChild(l);
}

// ── o que fica salvo entre usos ──────────────────────────────────────────
chrome.storage.local.get({ redes: ['x'], colab: PADRAO_COLAB }).then(s => {
  document.querySelectorAll('#redes input').forEach(c => { c.checked = s.redes.includes(c.value); });
  $('colab').value = s.colab;
});
$('redes').addEventListener('change', () => {
  chrome.storage.local.set({ redes: [...document.querySelectorAll('#redes input:checked')].map(c => c.value) });
});
$('colab').addEventListener('change', () => chrome.storage.local.set({ colab: $('colab').value }));

$('leg').addEventListener('input', () => {
  const n = $('leg').value.length;
  const estourou = ORDEM_REDES.filter(id => document.querySelector(`#redes input[value=${id}]`).checked && n > RECEITAS[id].legenda_max);
  $('cont').textContent = `${n} caracteres` + (estourou.length ? ` — passa do limite: ${estourou.map(id => RECEITAS[id].nome).join(', ')}` : '');
  $('cont').className = 'dica' + (estourou.length ? ' am' : '');
});

// ── a leva ───────────────────────────────────────────────────────────────
$('ir').addEventListener('click', async () => {
  const btn = $('ir');
  const redes = [...document.querySelectorAll('#redes input:checked')].map(c => c.value);
  const texto = $('leg').value;
  const url = $('url').value.trim();
  const local = $('arq').files[0] || null;
  $('log').textContent = '';
  if (!redes.length) { log('Marque pelo menos uma rede.', 'am'); return; }
  if (!texto && !url && !local) { log('Escreva uma legenda, cole um link ou escolha um arquivo.', 'am'); return; }
  let colaboradores;
  try { colaboradores = nomesDeColaboradores($('colab').value); }
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
    for (const id of redes) {
      log('');
      resultados.push(await prepararRede(id, midia, texto,
        { colaboradores: id === 'instagram' ? colaboradores : [], log }));
    }

    log('');
    log('── resumo ──');
    for (const r of resultados) {
      const nome = RECEITAS[r.rede].nome;
      if (r.pulada) log(`${nome}: pulada`, 'am');
      else if (r.erro) log(`${nome}: parou no meio — aba aberta`, 'er');
      else if (r.legendaOk === false) log(`${nome}: legenda NÃO conferiu — olhe a aba`, 'er');
      else log(`${nome}: pronta para você publicar`, 'ok');
    }
    log(`(${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  } catch (err) {
    log('✗ erro: ' + (err && err.message ? err.message : err), 'er');
  } finally {
    btn.disabled = false;
  }
});
