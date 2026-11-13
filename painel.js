// Painel de teste: uma rede (X), preenche e PARA antes de postar.
const R = RECEITAS.x;
const $ = id => document.getElementById(id);

function log(msg, cls) {
  const el = $('log');
  if (el.textContent === '—') el.textContent = '';
  const linha = document.createElement('div');
  if (cls) linha.className = cls;
  linha.textContent = msg;
  el.appendChild(linha);
}

$('leg').addEventListener('input', () => {
  const n = $('leg').value.length;
  $('cont').textContent = `${n} / ${R.legenda_max}`;
  $('cont').classList.toggle('passou', n > R.legenda_max);
});

/** Abre a URL numa aba nova e espera ela terminar de carregar. */
async function abrirAba(url) {
  const tab = await chrome.tabs.create({ url, active: true });
  await new Promise(res => {
    const ouvir = (id, info) => {
      if (id === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(ouvir);
        res();
      }
    };
    chrome.tabs.onUpdated.addListener(ouvir);
    // se ela já tinha carregado antes do ouvinte nascer
    chrome.tabs.get(tab.id).then(t => {
      if (t.status === 'complete') { chrome.tabs.onUpdated.removeListener(ouvir); res(); }
    });
  });
  return tab.id;
}

async function naAba(tabId, func, args) {
  const [r] = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return r ? r.result : null;
}

async function escreverPorTeclado(tabId, texto) {
  const foco = await naAba(tabId, spFocarEditor, [R.legenda, 20000]);
  if (!foco || !foco.ok) return foco || { ok: false, erro: 'sem resposta da aba' };
  const alvo = { tabId };
  await chrome.debugger.attach(alvo, '1.3');
  try {
    await spEscreverTeclas((m, p) => chrome.debugger.sendCommand(alvo, m, p), texto);
  } finally {
    try { await chrome.debugger.detach(alvo); } catch (e) { /* já soltou */ }
  }
  return foco;
}

$('ir').addEventListener('click', async () => {
  const btn = $('ir');
  const texto = $('leg').value;
  const url = $('url').value.trim();
  const local = $('arq').files[0] || null;
  const metodo = document.querySelector('input[name=metodo]:checked').value;
  if (!texto && !url && !local) { log('Escreva uma legenda, cole um link ou escolha um arquivo.', 'am'); return; }

  // A permissão para baixar do site do link é pedida AQUI, antes de qualquer
  // await: o Chrome só mostra o pedido dentro do clique. Só aquele site —
  // não "todos os sites".
  let permitido = Promise.resolve(true);
  if (url) {
    let origem;
    try { origem = new URL(url).origin; } catch (e) { log('✗ link inválido', 'er'); return; }
    permitido = chrome.permissions.request({ origins: [origem + '/*'] });
  }
  btn.disabled = true;
  $('log').textContent = '';
  const t0 = Date.now();
  try {
    // A mídia vem ANTES de abrir a rede: link quebrado não deve deixar uma
    // aba do X aberta pela metade.
    let arquivo = null;
    if (url) {
      if (!(await permitido)) { log('✗ sem permissão para baixar desse site', 'er'); return; }
      log('baixando o link …');
      arquivo = await spBaixarLink(url);
    } else if (local) {
      arquivo = await spLerArquivo(local);
    }
    if (arquivo) {
      const mb = arquivo.tamanho / 1048576;
      log(`✓ mídia: ${arquivo.nome} · ${arquivo.tipo} · ${mb.toFixed(1)} MB`, 'ok');
      if (mb > SP_LIMITE_AVISO_MB) log(`⚠ arquivo grande (${mb.toFixed(0)} MB): pode demorar ou falhar ao atravessar para a aba`, 'am');
    }

    log(`abrindo ${R.url} …`);
    const tabId = await abrirAba(R.url);

    if (arquivo) {
      log(`anexando ${arquivo.nome} …`);
      const a = await naAba(tabId, spAnexar, [arquivo.b64, arquivo.nome, arquivo.tipo || 'application/octet-stream', R.arquivo, 30000]);
      if (!a || !a.ok) { log('✗ arquivo: ' + ((a && a.erro) || 'sem resposta'), 'er'); return; }
      log(`✓ arquivo entregue ao campo (${a.seletor})`, 'ok');
    }

    if (texto) {
      log(`escrevendo pelo método ${metodo === 'teclado' ? 'B · teclado real' : 'A · texto do navegador'} …`);
      const e = metodo === 'teclado'
        ? await escreverPorTeclado(tabId, texto)
        : await naAba(tabId, spEscreverTexto, [R.legenda, texto, 20000]);
      if (!e || !e.ok) { log('✗ legenda: ' + ((e && e.erro) || 'sem resposta'), 'er'); return; }
    }

    // A conferência é o que faz deste um TESTE: o editor pode parecer
    // preenchido e estar vazio por dentro (lição do Draft.js no SocialPUB).
    await new Promise(r => setTimeout(r, arquivo ? 2500 : 800));
    const lido = await naAba(tabId, spLerTexto, [R.legenda, R.anexos, R.publicar]);
    if (texto) {
      const bate = spNormalizar(lido.texto).includes(spNormalizar(texto));
      log(bate ? '✓ legenda conferida: o texto INTEIRO está no editor' : '✗ a legenda NÃO bate com o que foi escrito', bate ? 'ok' : 'er');
      if (!bate) log('   o editor ficou com: ' + JSON.stringify(lido.texto), 'er');
    }
    if (arquivo) {
      log(lido.midia ? `✓ mídia aparece no compositor (${lido.midia})` : '? a mídia não apareceu (vídeo pode ainda estar subindo — olhe a aba)',
          lido.midia ? 'ok' : 'am');
    }
    if (lido.botao.existe) {
      log(lido.botao.habilitado ? '✓ botão Postar habilitado — NÃO cliquei; poste você se quiser' : '? botão Postar ainda desabilitado',
          lido.botao.habilitado ? 'ok' : 'am');
    } else {
      log('? não achei o botão Postar', 'am');
    }
    log(`(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (err) {
    log('✗ erro: ' + (err && err.message ? err.message : err), 'er');
  } finally {
    btn.disabled = false;
  }
});
