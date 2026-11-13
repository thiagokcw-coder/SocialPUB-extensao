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
  const metodo = document.querySelector('input[name=metodo]:checked').value;
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
        { metodo, colaboradores: id === 'instagram' ? colaboradores : [], log }));
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
